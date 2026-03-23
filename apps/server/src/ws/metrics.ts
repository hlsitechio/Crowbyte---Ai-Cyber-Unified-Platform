import type { WebSocket } from 'ws';
import {
  readCpuUsage,
  readMemory,
  readNetworkStats,
  readLoadAvg,
  readDiskStats,
  type CpuUsage,
  type MemoryInfo,
  type NetworkStat,
  type LoadAvg,
  type DiskStat,
} from '../utils/proc.js';

interface MetricsSubscription {
  cpu: boolean;
  memory: boolean;
  network: boolean;
  disk: boolean;
  load: boolean;
}

interface MetricsClient {
  ws: WebSocket;
  subscription: MetricsSubscription;
  interval: ReturnType<typeof setInterval> | null;
}

const DEFAULT_SUBSCRIPTION: MetricsSubscription = {
  cpu: true,
  memory: true,
  network: true,
  disk: true,
  load: true,
};

const METRICS_INTERVAL_MS = 2000;

const clients = new Set<MetricsClient>();

// Track previous network stats for rate calculation
let prevNetStats: NetworkStat[] | null = null;
let prevNetTimestamp = 0;

async function collectMetrics(sub: MetricsSubscription): Promise<Record<string, any>> {
  const metrics: Record<string, any> = {
    timestamp: Date.now(),
  };

  const tasks: Promise<void>[] = [];

  if (sub.cpu) {
    tasks.push(
      readCpuUsage().then(cpu => { metrics.cpu = cpu; }),
    );
  }

  if (sub.memory) {
    tasks.push(
      readMemory().then(mem => {
        metrics.memory = {
          totalBytes: mem.totalKb * 1024,
          usedBytes: mem.usedKb * 1024,
          freeBytes: mem.freeKb * 1024,
          availableBytes: mem.availableKb * 1024,
          usedPercent: mem.usedPercent,
          swap: {
            totalBytes: mem.swapTotalKb * 1024,
            usedBytes: mem.swapUsedKb * 1024,
            freeBytes: mem.swapFreeKb * 1024,
          },
        };
      }),
    );
  }

  if (sub.network) {
    tasks.push(
      readNetworkStats().then(stats => {
        const now = Date.now();
        const elapsed = prevNetTimestamp > 0 ? (now - prevNetTimestamp) / 1000 : 0;

        metrics.network = stats
          .filter(s => s.iface !== 'lo') // skip loopback
          .map(s => {
            const prev = prevNetStats?.find(p => p.iface === s.iface);
            const rxRate = prev && elapsed > 0
              ? Math.max(0, (s.rxBytes - prev.rxBytes) / elapsed)
              : 0;
            const txRate = prev && elapsed > 0
              ? Math.max(0, (s.txBytes - prev.txBytes) / elapsed)
              : 0;

            return {
              iface: s.iface,
              rxBytes: s.rxBytes,
              txBytes: s.txBytes,
              rxBytesPerSec: Math.round(rxRate),
              txBytesPerSec: Math.round(txRate),
            };
          });

        prevNetStats = stats;
        prevNetTimestamp = now;
      }),
    );
  }

  if (sub.disk) {
    tasks.push(
      readDiskStats().then(stats => { metrics.disk = stats; }),
    );
  }

  if (sub.load) {
    tasks.push(
      readLoadAvg().then(load => { metrics.load = load; }),
    );
  }

  await Promise.all(tasks);
  return metrics;
}

export function handleMetricsConnection(ws: WebSocket, params: Record<string, string>): void {
  // Parse subscription from query params (default: all)
  const subscription: MetricsSubscription = {
    cpu: params.cpu !== 'false',
    memory: params.memory !== 'false',
    network: params.network !== 'false',
    disk: params.disk !== 'false',
    load: params.load !== 'false',
  };

  const client: MetricsClient = {
    ws,
    subscription,
    interval: null,
  };

  clients.add(client);

  // Send initial snapshot immediately
  collectMetrics(subscription)
    .then(metrics => {
      if (ws.readyState === ws.OPEN) {
        ws.send(JSON.stringify({ type: 'metrics', ...metrics }));
      }
    })
    .catch(err => console.error('[metrics] initial collect error:', err));

  // Start periodic streaming
  client.interval = setInterval(async () => {
    if (ws.readyState !== ws.OPEN) {
      cleanup(client);
      return;
    }

    try {
      const metrics = await collectMetrics(client.subscription);
      ws.send(JSON.stringify({ type: 'metrics', ...metrics }));
    } catch (err) {
      console.error('[metrics] collect error:', err);
    }
  }, METRICS_INTERVAL_MS);

  // Handle subscription updates from client
  ws.on('message', (raw: Buffer) => {
    try {
      const msg = JSON.parse(raw.toString());

      if (msg.type === 'subscribe') {
        // Update subscription
        if (typeof msg.cpu === 'boolean') client.subscription.cpu = msg.cpu;
        if (typeof msg.memory === 'boolean') client.subscription.memory = msg.memory;
        if (typeof msg.network === 'boolean') client.subscription.network = msg.network;
        if (typeof msg.disk === 'boolean') client.subscription.disk = msg.disk;
        if (typeof msg.load === 'boolean') client.subscription.load = msg.load;

        ws.send(JSON.stringify({
          type: 'subscription_updated',
          subscription: client.subscription,
        }));
      } else if (msg.type === 'ping') {
        ws.send(JSON.stringify({ type: 'pong', timestamp: Date.now() }));
      }
    } catch {
      // Ignore unparseable messages
    }
  });

  ws.on('close', () => cleanup(client));
  ws.on('error', () => cleanup(client));

  // Notify client of successful connection
  ws.send(JSON.stringify({
    type: 'connected',
    subscription,
    intervalMs: METRICS_INTERVAL_MS,
  }));
}

function cleanup(client: MetricsClient): void {
  if (client.interval) {
    clearInterval(client.interval);
    client.interval = null;
  }
  clients.delete(client);
}

export function getConnectedClientsCount(): number {
  return clients.size;
}
