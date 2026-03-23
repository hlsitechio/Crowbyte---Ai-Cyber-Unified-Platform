import { readFile } from 'node:fs/promises';

export interface CpuUsage {
  total: number;
  perCore: number[];
  user: number;
  system: number;
  idle: number;
  iowait: number;
}

export interface MemoryInfo {
  totalKb: number;
  freeKb: number;
  availableKb: number;
  buffersKb: number;
  cachedKb: number;
  swapTotalKb: number;
  swapFreeKb: number;
  swapUsedKb: number;
  usedKb: number;
  usedPercent: number;
}

export interface NetworkStat {
  iface: string;
  rxBytes: number;
  txBytes: number;
  rxPackets: number;
  txPackets: number;
  rxErrors: number;
  txErrors: number;
}

export interface DiskStat {
  device: string;
  readsCompleted: number;
  writesCompleted: number;
  sectorsRead: number;
  sectorsWritten: number;
  ioInProgress: number;
  ioTimeMs: number;
}

export interface LoadAvg {
  load1: number;
  load5: number;
  load15: number;
  runningProcesses: number;
  totalProcesses: number;
}

// Stores previous CPU readings for delta calculation
let prevCpuTimes: number[][] | null = null;

async function readProcFile(path: string): Promise<string> {
  return readFile(path, 'utf-8');
}

function parseCpuLine(line: string): number[] {
  // cpu  user nice system idle iowait irq softirq steal guest guest_nice
  return line.trim().split(/\s+/).slice(1).map(Number);
}

function calcCpuPercent(prev: number[], curr: number[]): number {
  const prevTotal = prev.reduce((a, b) => a + b, 0);
  const currTotal = curr.reduce((a, b) => a + b, 0);
  const totalDelta = currTotal - prevTotal;
  if (totalDelta === 0) return 0;
  // idle is index 3
  const idleDelta = curr[3] - prev[3];
  return Math.round(((totalDelta - idleDelta) / totalDelta) * 10000) / 100;
}

export async function readCpuUsage(): Promise<CpuUsage> {
  const raw = await readProcFile('/proc/stat');
  const lines = raw.split('\n');

  const allCores: number[][] = [];
  const coreLines: number[][] = [];

  for (const line of lines) {
    if (line.startsWith('cpu ')) {
      allCores.push(parseCpuLine(line));
    } else if (line.startsWith('cpu')) {
      coreLines.push(parseCpuLine(line));
    }
  }

  const currentTimes = [allCores[0], ...coreLines];

  let total = 0;
  const perCore: number[] = [];
  let user = 0, system = 0, idle = 0, iowait = 0;

  if (prevCpuTimes && prevCpuTimes.length === currentTimes.length) {
    total = calcCpuPercent(prevCpuTimes[0], currentTimes[0]);
    for (let i = 1; i < currentTimes.length; i++) {
      perCore.push(calcCpuPercent(prevCpuTimes[i], currentTimes[i]));
    }

    const prev = prevCpuTimes[0];
    const curr = currentTimes[0];
    const totalDelta = curr.reduce((a, b) => a + b, 0) - prev.reduce((a, b) => a + b, 0);
    if (totalDelta > 0) {
      user = Math.round(((curr[0] - prev[0]) / totalDelta) * 10000) / 100;
      system = Math.round(((curr[2] - prev[2]) / totalDelta) * 10000) / 100;
      idle = Math.round(((curr[3] - prev[3]) / totalDelta) * 10000) / 100;
      iowait = Math.round(((curr[4] - prev[4]) / totalDelta) * 10000) / 100;
    }
  } else {
    // First read — no delta available, return instantaneous estimate
    const t = currentTimes[0];
    const sum = t.reduce((a, b) => a + b, 0);
    if (sum > 0) {
      total = Math.round(((sum - t[3]) / sum) * 10000) / 100;
      user = Math.round((t[0] / sum) * 10000) / 100;
      system = Math.round((t[2] / sum) * 10000) / 100;
      idle = Math.round((t[3] / sum) * 10000) / 100;
      iowait = Math.round((t[4] / sum) * 10000) / 100;
    }
    for (let i = 1; i < currentTimes.length; i++) {
      const ct = currentTimes[i];
      const s = ct.reduce((a, b) => a + b, 0);
      perCore.push(s > 0 ? Math.round(((s - ct[3]) / s) * 10000) / 100 : 0);
    }
  }

  prevCpuTimes = currentTimes;

  return { total, perCore, user, system, idle, iowait };
}

export async function readMemory(): Promise<MemoryInfo> {
  const raw = await readProcFile('/proc/meminfo');
  const map: Record<string, number> = {};

  for (const line of raw.split('\n')) {
    const match = line.match(/^(\w+):\s+(\d+)/);
    if (match) {
      map[match[1]] = parseInt(match[2], 10);
    }
  }

  const totalKb = map['MemTotal'] ?? 0;
  const freeKb = map['MemFree'] ?? 0;
  const availableKb = map['MemAvailable'] ?? 0;
  const buffersKb = map['Buffers'] ?? 0;
  const cachedKb = map['Cached'] ?? 0;
  const swapTotalKb = map['SwapTotal'] ?? 0;
  const swapFreeKb = map['SwapFree'] ?? 0;
  const swapUsedKb = swapTotalKb - swapFreeKb;
  const usedKb = totalKb - availableKb;
  const usedPercent = totalKb > 0 ? Math.round((usedKb / totalKb) * 10000) / 100 : 0;

  return {
    totalKb, freeKb, availableKb, buffersKb, cachedKb,
    swapTotalKb, swapFreeKb, swapUsedKb, usedKb, usedPercent,
  };
}

export async function readNetworkStats(): Promise<NetworkStat[]> {
  const raw = await readProcFile('/proc/net/dev');
  const lines = raw.split('\n').slice(2); // skip header lines
  const stats: NetworkStat[] = [];

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    const [ifacePart, rest] = trimmed.split(':');
    if (!rest) continue;

    const iface = ifacePart.trim();
    const values = rest.trim().split(/\s+/).map(Number);

    stats.push({
      iface,
      rxBytes: values[0],
      rxPackets: values[1],
      rxErrors: values[2],
      txBytes: values[8],
      txPackets: values[9],
      txErrors: values[10],
    });
  }

  return stats;
}

export async function readDiskStats(): Promise<DiskStat[]> {
  const raw = await readProcFile('/proc/diskstats');
  const stats: DiskStat[] = [];

  for (const line of raw.split('\n')) {
    const parts = line.trim().split(/\s+/);
    if (parts.length < 14) continue;

    const device = parts[2];
    // Skip partition-level entries (e.g., sda1) — keep only whole disks and dm-*
    if (/\d$/.test(device) && !device.startsWith('dm-') && !device.startsWith('nvme')) continue;

    stats.push({
      device,
      readsCompleted: parseInt(parts[3], 10),
      writesCompleted: parseInt(parts[7], 10),
      sectorsRead: parseInt(parts[5], 10),
      sectorsWritten: parseInt(parts[9], 10),
      ioInProgress: parseInt(parts[11], 10),
      ioTimeMs: parseInt(parts[12], 10),
    });
  }

  return stats;
}

export async function readLoadAvg(): Promise<LoadAvg> {
  const raw = await readProcFile('/proc/loadavg');
  const parts = raw.trim().split(/\s+/);
  const [running, total] = (parts[3] ?? '0/0').split('/').map(Number);

  return {
    load1: parseFloat(parts[0]),
    load5: parseFloat(parts[1]),
    load15: parseFloat(parts[2]),
    runningProcesses: running,
    totalProcesses: total,
  };
}

export async function readUptime(): Promise<{ uptimeSeconds: number; idleSeconds: number }> {
  const raw = await readProcFile('/proc/uptime');
  const parts = raw.trim().split(/\s+/);

  return {
    uptimeSeconds: parseFloat(parts[0]),
    idleSeconds: parseFloat(parts[1]),
  };
}
