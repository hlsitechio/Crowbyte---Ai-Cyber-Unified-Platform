import { Router, Request, Response } from 'express';
import supabase from '../lib/supabase.js';

const router = Router();

const FLEET_API_KEY = process.env.FLEET_API_KEY ?? '';
const FLEET_USER_ID = process.env.FLEET_USER_ID ?? '';

// ─── API Key Auth (for agent endpoints) ──────────────────────────────────────

function requireApiKey(req: Request, res: Response): boolean {
  const key = req.headers['x-api-key'] as string;
  if (!FLEET_API_KEY || key !== FLEET_API_KEY) {
    res.status(401).json({ error: 'Invalid or missing API key' });
    return false;
  }
  return true;
}

// ─── Status Thresholds ───────────────────────────────────────────────────────

function computeStatus(cpu: number, mem: number, disk: number): string {
  if (cpu > 90 || mem > 95 || disk > 95) return 'critical';
  if (cpu > 70 || mem > 80 || disk > 85) return 'warning';
  return 'online';
}

// ─── POST /register — Agent initial registration ─────────────────────────────

router.post('/register', async (req: Request, res: Response) => {
  if (!requireApiKey(req, res)) return;

  const {
    hostname, ip_address, mac_address,
    os_name, os_version, architecture,
    cpu_model, cpu_cores,
    total_memory_gb, total_disk_gb,
    cpu_usage, memory_usage, disk_usage,
    agent_version, location, tags,
  } = req.body;

  if (!hostname || !mac_address) {
    res.status(400).json({ error: 'hostname and mac_address required' });
    return;
  }

  const status = computeStatus(cpu_usage ?? 0, memory_usage ?? 0, disk_usage ?? 0);

  try {
    // Upsert on hostname + mac_address — same machine re-registering updates
    const { data, error } = await supabase
      .from('endpoints')
      .upsert(
        {
          user_id: FLEET_USER_ID,
          hostname,
          ip_address: ip_address ?? null,
          mac_address,
          os_name: os_name ?? null,
          os_version: os_version ?? null,
          architecture: architecture ?? null,
          cpu_model: cpu_model ?? null,
          cpu_cores: cpu_cores ?? null,
          total_memory_gb: total_memory_gb ?? null,
          total_disk_gb: total_disk_gb ?? null,
          cpu_usage: cpu_usage ?? null,
          memory_usage: memory_usage ?? null,
          disk_usage: disk_usage ?? null,
          agent_version: agent_version ?? '1.0.0',
          status,
          location: location ?? null,
          tags: tags ?? null,
          last_seen_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'hostname,mac_address', ignoreDuplicates: false }
      )
      .select('id')
      .single();

    if (error) {
      // Fallback: if unique constraint doesn't exist on hostname+mac, try matching manually
      const { data: existing } = await supabase
        .from('endpoints')
        .select('id')
        .eq('hostname', hostname)
        .eq('mac_address', mac_address)
        .eq('user_id', FLEET_USER_ID)
        .maybeSingle();

      if (existing) {
        // Update existing
        const { error: updateErr } = await supabase
          .from('endpoints')
          .update({
            ip_address, os_name, os_version, architecture,
            cpu_model, cpu_cores, total_memory_gb, total_disk_gb,
            cpu_usage, memory_usage, disk_usage,
            agent_version: agent_version ?? '1.0.0',
            status,
            location, tags,
            last_seen_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq('id', existing.id);

        if (updateErr) {
          res.status(500).json({ error: updateErr.message });
          return;
        }
        res.json({ ok: true, id: existing.id, action: 'updated' });
        return;
      }

      // Insert new
      const { data: inserted, error: insertErr } = await supabase
        .from('endpoints')
        .insert({
          user_id: FLEET_USER_ID,
          hostname, ip_address, mac_address,
          os_name, os_version, architecture,
          cpu_model, cpu_cores, total_memory_gb, total_disk_gb,
          cpu_usage, memory_usage, disk_usage,
          agent_version: agent_version ?? '1.0.0',
          status, location, tags,
          last_seen_at: new Date().toISOString(),
        })
        .select('id')
        .single();

      if (insertErr) {
        res.status(500).json({ error: insertErr.message });
        return;
      }
      res.json({ ok: true, id: inserted?.id, action: 'created' });
      return;
    }

    res.json({ ok: true, id: data?.id, action: 'registered' });
  } catch (err: any) {
    console.error('[fleet] register error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ─── POST /heartbeat — Agent periodic metrics update ─────────────────────────

router.post('/heartbeat', async (req: Request, res: Response) => {
  if (!requireApiKey(req, res)) return;

  const {
    hostname, mac_address,
    cpu_usage, memory_usage, disk_usage,
    ip_address, agent_version,
  } = req.body;

  if (!hostname || !mac_address) {
    res.status(400).json({ error: 'hostname and mac_address required' });
    return;
  }

  const status = computeStatus(cpu_usage ?? 0, memory_usage ?? 0, disk_usage ?? 0);

  try {
    // Find existing endpoint
    const { data: existing, error: findErr } = await supabase
      .from('endpoints')
      .select('id')
      .eq('hostname', hostname)
      .eq('mac_address', mac_address)
      .eq('user_id', FLEET_USER_ID)
      .maybeSingle();

    if (findErr) {
      res.status(500).json({ error: findErr.message });
      return;
    }

    if (!existing) {
      // Agent not registered — tell it to register first
      res.status(404).json({ error: 'Endpoint not found. Send /register first.' });
      return;
    }

    const { error: updateErr } = await supabase
      .from('endpoints')
      .update({
        cpu_usage: cpu_usage ?? null,
        memory_usage: memory_usage ?? null,
        disk_usage: disk_usage ?? null,
        ip_address: ip_address ?? undefined,
        agent_version: agent_version ?? undefined,
        status,
        last_seen_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', existing.id);

    if (updateErr) {
      res.status(500).json({ error: updateErr.message });
      return;
    }

    res.json({ ok: true, status });
  } catch (err: any) {
    console.error('[fleet] heartbeat error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ─── GET /endpoints — List endpoints (JWT auth via middleware) ────────────────

router.get('/endpoints', async (_req: Request, res: Response) => {
  try {
    const { data, error } = await supabase
      .from('endpoints')
      .select('*')
      .eq('user_id', FLEET_USER_ID)
      .order('last_seen_at', { ascending: false });

    if (error) {
      res.status(500).json({ error: error.message });
      return;
    }

    res.json({ endpoints: data ?? [] });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ─── DELETE /endpoints/:id — Remove endpoint (JWT auth via middleware) ────────

router.delete('/endpoints/:id', async (req: Request, res: Response) => {
  const { id } = req.params;

  try {
    const { error } = await supabase
      .from('endpoints')
      .delete()
      .eq('id', id)
      .eq('user_id', FLEET_USER_ID);

    if (error) {
      res.status(500).json({ error: error.message });
      return;
    }

    res.json({ ok: true, deleted: id });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ─── Offline Detection (background sweep every 60s) ─────────────────────────

const STALE_THRESHOLD_MS = 90_000; // 90 seconds

async function markStaleEndpointsOffline(): Promise<void> {
  if (!FLEET_USER_ID) return;

  const cutoff = new Date(Date.now() - STALE_THRESHOLD_MS).toISOString();

  try {
    const { error } = await supabase
      .from('endpoints')
      .update({ status: 'offline', updated_at: new Date().toISOString() })
      .eq('user_id', FLEET_USER_ID)
      .neq('status', 'offline')
      .lt('last_seen_at', cutoff);

    if (error) {
      console.error('[fleet] offline sweep error:', error.message);
    }
  } catch (err: any) {
    console.error('[fleet] offline sweep error:', err.message);
  }
}

// Start offline detection loop
if (FLEET_USER_ID) {
  setInterval(markStaleEndpointsOffline, 60_000);
  console.log('[+] Fleet offline detection active (60s sweep)');
}

export default router;
