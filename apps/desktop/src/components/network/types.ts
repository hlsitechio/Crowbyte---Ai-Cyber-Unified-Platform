// Network Map — Shared Types

export type DeviceType =
  | 'server' | 'workstation' | 'router' | 'firewall' | 'switch'
  | 'cloud' | 'database' | 'loadbalancer' | 'printer' | 'iot'
  | 'container' | 'vpn' | 'wap' | 'unknown' | 'internet' | 'attacker';

export type DeviceStatus = 'up' | 'down' | 'unknown' | 'scanning';

export interface DevicePort {
  port: number;
  protocol: string;
  state: string;
  service: string;
  version?: string;
}

export interface NetworkDevice {
  id: string;
  type: DeviceType;
  label: string;
  ip?: string;
  hostname?: string;
  mac?: string;
  vendor?: string;
  os?: string;
  osIcon?: string;
  ports: DevicePort[];
  status: DeviceStatus;
  subnet?: string;
  notes?: string;
  tags?: string[];
  // Visual
  color?: string;
  icon?: string;
}

export interface NetworkConnection {
  id: string;
  source: string;
  target: string;
  label?: string;
  protocol?: string;
  ports?: number[];
  bandwidth?: string;
  encrypted?: boolean;
  bidirectional?: boolean;
}

export interface NetworkMapData {
  id: string;
  name: string;
  description?: string;
  devices: NetworkDevice[];
  connections: NetworkConnection[];
  createdAt: string;
  updatedAt: string;
}

// Device type metadata for UI
export const DEVICE_TYPES: Record<DeviceType, { label: string; color: string; bgColor: string; borderColor: string }> = {
  server:       { label: 'Server',        color: 'text-blue-500',    bgColor: 'bg-blue-500/15',    borderColor: 'border-transparent' },
  workstation:  { label: 'Workstation',   color: 'text-slate-500',   bgColor: 'bg-slate-500/15',   borderColor: 'border-transparent' },
  router:       { label: 'Router',        color: 'text-violet-500',  bgColor: 'bg-violet-500/15',  borderColor: 'border-transparent' },
  firewall:     { label: 'Firewall',      color: 'text-red-500',     bgColor: 'bg-red-500/15',     borderColor: 'border-transparent' },
  switch:       { label: 'Switch',        color: 'text-teal-500',    bgColor: 'bg-teal-500/15',    borderColor: 'border-transparent' },
  cloud:        { label: 'Cloud',         color: 'text-sky-500',     bgColor: 'bg-sky-500/15',     borderColor: 'border-transparent' },
  database:     { label: 'Database',      color: 'text-amber-500',   bgColor: 'bg-amber-500/15',   borderColor: 'border-transparent' },
  loadbalancer: { label: 'Load Balancer', color: 'text-emerald-500', bgColor: 'bg-emerald-500/15', borderColor: 'border-transparent' },
  printer:      { label: 'Printer',       color: 'text-zinc-500',    bgColor: 'bg-zinc-500/15',    borderColor: 'border-transparent' },
  iot:          { label: 'IoT Device',    color: 'text-orange-500',  bgColor: 'bg-orange-500/15',  borderColor: 'border-transparent' },
  container:    { label: 'Container',     color: 'text-cyan-500',    bgColor: 'bg-cyan-500/15',    borderColor: 'border-transparent' },
  vpn:          { label: 'VPN Gateway',   color: 'text-emerald-500', bgColor: 'bg-emerald-500/15', borderColor: 'border-transparent' },
  wap:          { label: 'Access Point',  color: 'text-indigo-500',  bgColor: 'bg-indigo-500/15',  borderColor: 'border-transparent' },
  unknown:      { label: 'Unknown',       color: 'text-zinc-500',    bgColor: 'bg-zinc-500/15',    borderColor: 'border-transparent' },
  internet:     { label: 'Internet',      color: 'text-blue-500',    bgColor: 'bg-blue-500/15',    borderColor: 'border-transparent' },
  attacker:     { label: 'Attacker',      color: 'text-emerald-500', bgColor: 'bg-emerald-500/15', borderColor: 'border-transparent' },
};
