import { Router, Request, Response } from 'express';
import Dockerode from 'dockerode';

const router = Router();

// Helper to safely extract route param as string
function paramId(req: Request): string {
  const id = req.params.id;
  return Array.isArray(id) ? id[0] : id;
}

function getDocker(): Dockerode {
  return new Dockerode({ socketPath: '/var/run/docker.sock' });
}

// Middleware to check Docker availability
async function checkDocker(_req: Request, res: Response, next: Function): Promise<void> {
  try {
    const docker = getDocker();
    await docker.ping();
    next();
  } catch (err: any) {
    if (err.code === 'ENOENT') {
      res.status(503).json({ error: 'Docker socket not found at /var/run/docker.sock' });
    } else if (err.code === 'EACCES') {
      res.status(503).json({ error: 'Permission denied accessing Docker socket' });
    } else {
      res.status(503).json({ error: 'Docker daemon is not running' });
    }
  }
}

router.use(checkDocker);

// GET /api/docker/containers
router.get('/containers', async (req: Request, res: Response): Promise<void> => {
  try {
    const docker = getDocker();
    const all = req.query.all !== 'false'; // default to showing all
    const containers = await docker.listContainers({ all });

    res.json({
      count: containers.length,
      containers: containers.map(c => ({
        id: c.Id.slice(0, 12),
        fullId: c.Id,
        names: c.Names.map(n => n.replace(/^\//, '')),
        image: c.Image,
        imageId: c.ImageID?.slice(7, 19),
        command: c.Command,
        created: c.Created,
        state: c.State,
        status: c.Status,
        ports: c.Ports.map(p => ({
          ip: p.IP,
          privatePort: p.PrivatePort,
          publicPort: p.PublicPort,
          type: p.Type,
        })),
        labels: c.Labels,
        mounts: c.Mounts?.map(m => ({
          type: m.Type,
          source: m.Source,
          destination: m.Destination,
          mode: m.Mode,
          rw: m.RW,
        })),
        networkMode: Object.keys(c.NetworkSettings?.Networks ?? {}),
      })),
    });
  } catch (err) {
    console.error('[docker] list containers error:', err);
    res.status(500).json({ error: 'Failed to list containers' });
  }
});

// POST /api/docker/containers — create container
router.post('/containers', async (req: Request, res: Response): Promise<void> => {
  try {
    const docker = getDocker();
    const { image, name, env, ports, volumes, command, restart } = req.body;

    if (!image) {
      res.status(400).json({ error: 'image is required' });
      return;
    }

    const createOptions: Dockerode.ContainerCreateOptions = {
      Image: image,
      name: name || undefined,
      Env: env || undefined,
      Cmd: command ? (Array.isArray(command) ? command : command.split(' ')) : undefined,
      HostConfig: {
        RestartPolicy: restart ? { Name: restart } : undefined,
        PortBindings: undefined,
        Binds: volumes || undefined,
      },
      ExposedPorts: undefined,
    };

    // Handle port mappings: { "8080/tcp": "80" } => PortBindings
    if (ports && typeof ports === 'object') {
      const portBindings: Record<string, Array<{ HostPort: string }>> = {};
      const exposedPorts: Record<string, object> = {};

      for (const [containerPort, hostPort] of Object.entries(ports)) {
        const key = containerPort.includes('/') ? containerPort : `${containerPort}/tcp`;
        portBindings[key] = [{ HostPort: String(hostPort) }];
        exposedPorts[key] = {};
      }

      createOptions.HostConfig!.PortBindings = portBindings;
      createOptions.ExposedPorts = exposedPorts;
    }

    const container = await docker.createContainer(createOptions);
    const info = await container.inspect();

    res.status(201).json({
      id: info.Id.slice(0, 12),
      fullId: info.Id,
      name: info.Name.replace(/^\//, ''),
      state: info.State.Status,
      image: info.Config.Image,
    });
  } catch (err: any) {
    console.error('[docker] create container error:', err);
    res.status(500).json({ error: err.message || 'Failed to create container' });
  }
});

// POST /api/docker/containers/:id/start
router.post('/containers/:id/start', async (req: Request, res: Response): Promise<void> => {
  try {
    const docker = getDocker();
    const container = docker.getContainer(paramId(req));
    await container.start();
    res.json({ message: 'Container started', id: paramId(req) });
  } catch (err: any) {
    if (err.statusCode === 304) {
      res.json({ message: 'Container already running', id: paramId(req) });
    } else if (err.statusCode === 404) {
      res.status(404).json({ error: 'Container not found' });
    } else {
      console.error('[docker] start error:', err);
      res.status(500).json({ error: err.message || 'Failed to start container' });
    }
  }
});

// POST /api/docker/containers/:id/stop
router.post('/containers/:id/stop', async (req: Request, res: Response): Promise<void> => {
  try {
    const docker = getDocker();
    const container = docker.getContainer(paramId(req));
    const timeout = parseInt(req.query.timeout as string) || 10;
    await container.stop({ t: timeout });
    res.json({ message: 'Container stopped', id: paramId(req) });
  } catch (err: any) {
    if (err.statusCode === 304) {
      res.json({ message: 'Container already stopped', id: paramId(req) });
    } else if (err.statusCode === 404) {
      res.status(404).json({ error: 'Container not found' });
    } else {
      console.error('[docker] stop error:', err);
      res.status(500).json({ error: err.message || 'Failed to stop container' });
    }
  }
});

// DELETE /api/docker/containers/:id
router.delete('/containers/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    const docker = getDocker();
    const container = docker.getContainer(paramId(req));
    const force = req.query.force === 'true';
    const removeVolumes = req.query.v === 'true';
    await container.remove({ force, v: removeVolumes });
    res.json({ message: 'Container removed', id: paramId(req) });
  } catch (err: any) {
    if (err.statusCode === 404) {
      res.status(404).json({ error: 'Container not found' });
    } else {
      console.error('[docker] remove error:', err);
      res.status(500).json({ error: err.message || 'Failed to remove container' });
    }
  }
});

// GET /api/docker/containers/:id/logs
router.get('/containers/:id/logs', async (req: Request, res: Response): Promise<void> => {
  try {
    const docker = getDocker();
    const container = docker.getContainer(paramId(req));
    const tail = parseInt(req.query.tail as string) || 100;
    const since = parseInt(req.query.since as string) || 0;

    const logs = await container.logs({
      stdout: true,
      stderr: true,
      tail,
      since,
      timestamps: true,
    });

    // Docker multiplexed stream: strip header bytes
    const logStr = typeof logs === 'string' ? logs : logs.toString('utf-8');

    // Clean up Docker stream headers (8-byte header per frame)
    const cleanedLines = logStr
      .split('\n')
      .map(line => {
        // Remove Docker stream header bytes if present
        if (line.length > 8) {
          const firstChar = line.charCodeAt(0);
          if (firstChar === 1 || firstChar === 2) {
            return line.slice(8);
          }
        }
        return line;
      })
      .filter(Boolean);

    res.json({
      id: paramId(req),
      lines: cleanedLines.length,
      logs: cleanedLines,
    });
  } catch (err: any) {
    if (err.statusCode === 404) {
      res.status(404).json({ error: 'Container not found' });
    } else {
      console.error('[docker] logs error:', err);
      res.status(500).json({ error: err.message || 'Failed to get container logs' });
    }
  }
});

// GET /api/docker/containers/:id/stats
router.get('/containers/:id/stats', async (req: Request, res: Response): Promise<void> => {
  try {
    const docker = getDocker();
    const container = docker.getContainer(paramId(req));

    // stream: false returns a single stats snapshot
    const stats = await container.stats({ stream: false }) as any;

    // Calculate CPU usage percentage
    const cpuDelta = stats.cpu_stats.cpu_usage.total_usage - stats.precpu_stats.cpu_usage.total_usage;
    const systemDelta = stats.cpu_stats.system_cpu_usage - stats.precpu_stats.system_cpu_usage;
    const numCpus = stats.cpu_stats.online_cpus || stats.cpu_stats.cpu_usage.percpu_usage?.length || 1;
    const cpuPercent = systemDelta > 0 ? (cpuDelta / systemDelta) * numCpus * 100 : 0;

    // Memory usage
    const memUsage = stats.memory_stats.usage - (stats.memory_stats.stats?.cache ?? 0);
    const memLimit = stats.memory_stats.limit;
    const memPercent = memLimit > 0 ? (memUsage / memLimit) * 100 : 0;

    // Network I/O
    let netRx = 0, netTx = 0;
    if (stats.networks) {
      for (const iface of Object.values(stats.networks) as any[]) {
        netRx += iface.rx_bytes || 0;
        netTx += iface.tx_bytes || 0;
      }
    }

    // Block I/O
    let blockRead = 0, blockWrite = 0;
    if (stats.blkio_stats?.io_service_bytes_recursive) {
      for (const entry of stats.blkio_stats.io_service_bytes_recursive) {
        if (entry.op === 'read' || entry.op === 'Read') blockRead += entry.value;
        if (entry.op === 'write' || entry.op === 'Write') blockWrite += entry.value;
      }
    }

    res.json({
      id: paramId(req),
      cpu: {
        percent: Math.round(cpuPercent * 100) / 100,
        numCpus,
      },
      memory: {
        usage: memUsage,
        limit: memLimit,
        percent: Math.round(memPercent * 100) / 100,
        formatted: {
          usage: formatBytes(memUsage),
          limit: formatBytes(memLimit),
        },
      },
      network: {
        rxBytes: netRx,
        txBytes: netTx,
        formatted: {
          rx: formatBytes(netRx),
          tx: formatBytes(netTx),
        },
      },
      blockIo: {
        readBytes: blockRead,
        writeBytes: blockWrite,
        formatted: {
          read: formatBytes(blockRead),
          write: formatBytes(blockWrite),
        },
      },
      pids: stats.pids_stats?.current ?? 0,
    });
  } catch (err: any) {
    if (err.statusCode === 404) {
      res.status(404).json({ error: 'Container not found' });
    } else {
      console.error('[docker] stats error:', err);
      res.status(500).json({ error: err.message || 'Failed to get container stats' });
    }
  }
});

// GET /api/docker/images
router.get('/images', async (_req: Request, res: Response): Promise<void> => {
  try {
    const docker = getDocker();
    const images = await docker.listImages();

    res.json({
      count: images.length,
      images: images.map(img => ({
        id: img.Id.slice(7, 19),
        fullId: img.Id,
        repoTags: img.RepoTags ?? ['<none>:<none>'],
        repoDigests: img.RepoDigests,
        size: img.Size,
        virtualSize: img.VirtualSize,
        created: img.Created,
        formatted: {
          size: formatBytes(img.Size),
        },
      })),
    });
  } catch (err) {
    console.error('[docker] list images error:', err);
    res.status(500).json({ error: 'Failed to list images' });
  }
});

// POST /api/docker/images/pull
router.post('/images/pull', async (req: Request, res: Response): Promise<void> => {
  try {
    const docker = getDocker();
    const { image } = req.body;

    if (!image || typeof image !== 'string') {
      res.status(400).json({ error: 'image is required (e.g., "nginx:latest")' });
      return;
    }

    // Validate image name format
    if (!/^[\w.\-/:@]+$/.test(image)) {
      res.status(400).json({ error: 'Invalid image name format' });
      return;
    }

    const stream = await docker.pull(image);

    // Collect pull progress
    const progress: string[] = [];

    await new Promise<void>((resolve, reject) => {
      docker.modem.followProgress(
        stream,
        (err: Error | null, output: any[]) => {
          if (err) reject(err);
          else resolve();
        },
        (event: any) => {
          if (event.status) {
            progress.push(event.status + (event.progress ? ` ${event.progress}` : ''));
          }
        },
      );
    });

    res.json({
      message: `Image '${image}' pulled successfully`,
      image,
      progress: progress.slice(-10), // last 10 progress lines
    });
  } catch (err: any) {
    console.error('[docker] pull error:', err);
    res.status(500).json({ error: err.message || 'Failed to pull image' });
  }
});

function formatBytes(bytes: number): string {
  if (!bytes || bytes === 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${(bytes / Math.pow(1024, i)).toFixed(2)} ${units[i]}`;
}

export default router;
