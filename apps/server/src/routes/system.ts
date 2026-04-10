import { Router, Request, Response } from 'express';
import si from 'systeminformation';
import { exec } from 'node:child_process';
import { promisify } from 'node:util';
import rateLimit from 'express-rate-limit';
import {
  readCpuUsage,
  readMemory,
  readNetworkStats,
  readDiskStats,
  readLoadAvg,
  readUptime,
} from '../utils/proc.js';

const execAsync = promisify(exec);
const router = Router();

// Rate limit system routes: 60 per minute per IP
const systemLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 60,
  message: { error: 'Too many system requests. Slow down.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// Apply rate limiter to all routes in this router
router.use(systemLimiter);

// GET /api/system/overview
router.get('/overview', async (_req: Request, res: Response): Promise<void> => {
  try {
    const [osInfo, uptimeData, loadAvg] = await Promise.all([
      si.osInfo(),
      readUptime(),
      readLoadAvg(),
    ]);

    res.json({
      hostname: osInfo.hostname,
      platform: osInfo.platform,
      distro: osInfo.distro,
      release: osInfo.release,
      kernel: osInfo.kernel,
      arch: osInfo.arch,
      uptimeSeconds: uptimeData.uptimeSeconds,
      uptimeFormatted: formatUptime(uptimeData.uptimeSeconds),
      loadAvg,
    });
  } catch (err) {
    console.error('[system] overview error:', err);
    res.status(500).json({ error: 'Failed to read system overview' });
  }
});

// GET /api/system/cpu
router.get('/cpu', async (_req: Request, res: Response): Promise<void> => {
  try {
    const [cpuInfo, cpuUsage, temp] = await Promise.all([
      si.cpu(),
      readCpuUsage(),
      si.cpuTemperature().catch(() => null),
    ]);

    res.json({
      model: `${cpuInfo.manufacturer} ${cpuInfo.brand}`,
      cores: cpuInfo.physicalCores,
      threads: cpuInfo.cores,
      speed: cpuInfo.speed,
      speedMin: cpuInfo.speedMin,
      speedMax: cpuInfo.speedMax,
      usage: cpuUsage,
      temperature: temp ? {
        main: temp.main,
        max: temp.max,
        cores: temp.cores,
      } : null,
    });
  } catch (err) {
    console.error('[system] cpu error:', err);
    res.status(500).json({ error: 'Failed to read CPU info' });
  }
});

// GET /api/system/memory
router.get('/memory', async (_req: Request, res: Response): Promise<void> => {
  try {
    const mem = await readMemory();

    res.json({
      total: kbToBytes(mem.totalKb),
      used: kbToBytes(mem.usedKb),
      free: kbToBytes(mem.freeKb),
      available: kbToBytes(mem.availableKb),
      buffers: kbToBytes(mem.buffersKb),
      cached: kbToBytes(mem.cachedKb),
      usedPercent: mem.usedPercent,
      swap: {
        total: kbToBytes(mem.swapTotalKb),
        used: kbToBytes(mem.swapUsedKb),
        free: kbToBytes(mem.swapFreeKb),
      },
      formatted: {
        total: formatBytes(kbToBytes(mem.totalKb)),
        used: formatBytes(kbToBytes(mem.usedKb)),
        free: formatBytes(kbToBytes(mem.freeKb)),
        available: formatBytes(kbToBytes(mem.availableKb)),
      },
    });
  } catch (err) {
    console.error('[system] memory error:', err);
    res.status(500).json({ error: 'Failed to read memory info' });
  }
});

// GET /api/system/disk
router.get('/disk', async (_req: Request, res: Response): Promise<void> => {
  try {
    const [fsSize, diskIO] = await Promise.all([
      si.fsSize(),
      readDiskStats(),
    ]);

    res.json({
      filesystems: fsSize.map(fs => ({
        fs: fs.fs,
        type: fs.type,
        mount: fs.mount,
        size: fs.size,
        used: fs.used,
        available: fs.available,
        usedPercent: fs.use,
        formatted: {
          size: formatBytes(fs.size),
          used: formatBytes(fs.used),
          available: formatBytes(fs.available),
        },
      })),
      io: diskIO,
    });
  } catch (err) {
    console.error('[system] disk error:', err);
    res.status(500).json({ error: 'Failed to read disk info' });
  }
});

// GET /api/system/network
router.get('/network', async (_req: Request, res: Response): Promise<void> => {
  try {
    const [interfaces, netStats, connections] = await Promise.all([
      si.networkInterfaces(),
      readNetworkStats(),
      si.networkConnections().catch(() => []),
    ]);

    const ifaceArray = Array.isArray(interfaces) ? interfaces : [interfaces];

    res.json({
      interfaces: ifaceArray.map(iface => {
        const procStats = netStats.find(s => s.iface === iface.iface);
        return {
          iface: iface.iface,
          ip4: iface.ip4,
          ip6: iface.ip6,
          mac: iface.mac,
          type: iface.type,
          speed: iface.speed,
          operstate: iface.operstate,
          rx: procStats ? {
            bytes: procStats.rxBytes,
            packets: procStats.rxPackets,
            errors: procStats.rxErrors,
            formatted: formatBytes(procStats.rxBytes),
          } : null,
          tx: procStats ? {
            bytes: procStats.txBytes,
            packets: procStats.txPackets,
            errors: procStats.txErrors,
            formatted: formatBytes(procStats.txBytes),
          } : null,
        };
      }),
      connectionCount: Array.isArray(connections) ? connections.length : 0,
    });
  } catch (err) {
    console.error('[system] network error:', err);
    res.status(500).json({ error: 'Failed to read network info' });
  }
});

// GET /api/system/processes
router.get('/processes', async (_req: Request, res: Response): Promise<void> => {
  try {
    const procs = await si.processes();

    // Top 25 by CPU usage
    const byCpu = procs.list
      .sort((a, b) => b.cpu - a.cpu)
      .slice(0, 25)
      .map(p => ({
        pid: p.pid,
        name: p.name,
        command: p.command?.slice(0, 200),
        cpu: p.cpu,
        mem: p.mem,
        memRss: p.memRss,
        state: p.state,
        user: p.user,
        started: p.started,
      }));

    // Top 25 by memory usage
    const byMem = procs.list
      .sort((a, b) => b.mem - a.mem)
      .slice(0, 25)
      .map(p => ({
        pid: p.pid,
        name: p.name,
        command: p.command?.slice(0, 200),
        cpu: p.cpu,
        mem: p.mem,
        memRss: p.memRss,
        state: p.state,
        user: p.user,
        started: p.started,
      }));

    res.json({
      total: procs.all,
      running: procs.running,
      sleeping: procs.sleeping,
      blocked: procs.blocked,
      byCpu,
      byMem,
    });
  } catch (err) {
    console.error('[system] processes error:', err);
    res.status(500).json({ error: 'Failed to read process info' });
  }
});

// GET /api/system/gpu
router.get('/gpu', async (_req: Request, res: Response): Promise<void> => {
  try {
    // Try nvidia-smi first for detailed NVIDIA info
    try {
      const { stdout } = await execAsync(
        'nvidia-smi --query-gpu=name,temperature.gpu,utilization.gpu,utilization.memory,memory.total,memory.used,memory.free,power.draw,fan.speed --format=csv,noheader,nounits',
        { timeout: 5000 },
      );

      const gpus = stdout.trim().split('\n').map(line => {
        const [name, temp, gpuUtil, memUtil, memTotal, memUsed, memFree, power, fan] =
          line.split(',').map(s => s.trim());
        return {
          name,
          temperatureC: parseFloat(temp) || null,
          gpuUtilization: parseFloat(gpuUtil) || null,
          memoryUtilization: parseFloat(memUtil) || null,
          memoryTotal: parseFloat(memTotal) || null,
          memoryUsed: parseFloat(memUsed) || null,
          memoryFree: parseFloat(memFree) || null,
          powerDraw: parseFloat(power) || null,
          fanSpeed: parseFloat(fan) || null,
        };
      });

      res.json({ available: true, driver: 'nvidia', gpus });
      return;
    } catch {
      // nvidia-smi not available, fall back to systeminformation
    }

    const graphics = await si.graphics();
    if (graphics.controllers.length === 0) {
      res.json({ available: false, gpus: [] });
      return;
    }

    res.json({
      available: true,
      driver: 'generic',
      gpus: graphics.controllers.map(c => ({
        name: c.model,
        vendor: c.vendor,
        vram: c.vram,
        temperatureC: c.temperatureGpu ?? null,
        bus: c.bus,
      })),
    });
  } catch (err) {
    console.error('[system] gpu error:', err);
    res.status(500).json({ error: 'Failed to read GPU info' });
  }
});

// GET /api/system/docker
router.get('/docker', async (_req: Request, res: Response): Promise<void> => {
  try {
    const Dockerode = (await import('dockerode')).default;
    const docker = new Dockerode({ socketPath: '/var/run/docker.sock' });

    const [containers, images, info] = await Promise.all([
      docker.listContainers({ all: true }),
      docker.listImages(),
      docker.info(),
    ]);

    res.json({
      running: info.ContainersRunning,
      paused: info.ContainersPaused,
      stopped: info.ContainersStopped,
      totalImages: info.Images,
      serverVersion: info.ServerVersion,
      containers: containers.map(c => ({
        id: c.Id.slice(0, 12),
        names: c.Names,
        image: c.Image,
        state: c.State,
        status: c.Status,
        created: c.Created,
        ports: c.Ports,
      })),
      images: images.slice(0, 50).map(img => ({
        id: img.Id.slice(7, 19),
        repoTags: img.RepoTags,
        size: img.Size,
        created: img.Created,
        formatted: { size: formatBytes(img.Size) },
      })),
    });
  } catch (err: any) {
    if (err.code === 'ENOENT' || err.code === 'EACCES') {
      res.json({ available: false, error: 'Docker socket not accessible' });
    } else {
      console.error('[system] docker error:', err);
      res.status(500).json({ error: 'Failed to read Docker info' });
    }
  }
});

// GET /api/system/services
router.get('/services', async (_req: Request, res: Response): Promise<void> => {
  const services = [
    'docker', 'nginx', 'apache2', 'sshd', 'postgresql', 'mysql', 'redis-server',
    'mongod', 'ufw', 'fail2ban', 'cron', 'NetworkManager', 'tailscaled',
  ];

  try {
    const results = await Promise.allSettled(
      services.map(async (name) => {
        try {
          const { stdout } = await execAsync(
            `systemctl is-active ${name} 2>/dev/null`,
            { timeout: 3000 },
          );
          return { name, status: stdout.trim() };
        } catch {
          return { name, status: 'inactive' };
        }
      }),
    );

    const serviceList = results.map((r, i) => {
      if (r.status === 'fulfilled') return r.value;
      return { name: services[i], status: 'unknown' };
    });

    res.json({ services: serviceList });
  } catch (err) {
    console.error('[system] services error:', err);
    res.status(500).json({ error: 'Failed to read service status' });
  }
});

// Helpers
function kbToBytes(kb: number): number {
  return kb * 1024;
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${(bytes / Math.pow(1024, i)).toFixed(2)} ${units[i]}`;
}

function formatUptime(seconds: number): string {
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const parts: string[] = [];
  if (days > 0) parts.push(`${days}d`);
  if (hours > 0) parts.push(`${hours}h`);
  parts.push(`${minutes}m`);
  return parts.join(' ');
}

export default router;
