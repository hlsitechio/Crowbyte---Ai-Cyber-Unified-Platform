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
  server:       { label: 'Server',        color: 'text-blue-400',    bgColor: 'bg-blue-500/10',    borderColor: 'border-blue-500/30' },
  workstation:  { label: 'Workstation',   color: 'text-slate-400',   bgColor: 'bg-slate-500/10',   borderColor: 'border-slate-500/30' },
  router:       { label: 'Router',        color: 'text-purple-400',  bgColor: 'bg-purple-500/10',  borderColor: 'border-purple-500/30' },
  firewall:     { label: 'Firewall',      color: 'text-red-400',     bgColor: 'bg-red-500/10',     borderColor: 'border-red-500/30' },
  switch:       { label: 'Switch',        color: 'text-teal-400',    bgColor: 'bg-teal-500/10',    borderColor: 'border-teal-500/30' },
  cloud:        { label: 'Cloud',         color: 'text-sky-400',     bgColor: 'bg-sky-500/10',     borderColor: 'border-sky-500/30' },
  database:     { label: 'Database',      color: 'text-amber-400',   bgColor: 'bg-amber-500/10',   borderColor: 'border-amber-500/30' },
  loadbalancer: { label: 'Load Balancer', color: 'text-emerald-400', bgColor: 'bg-emerald-500/10', borderColor: 'border-emerald-500/30' },
  printer:      { label: 'Printer',       color: 'text-gray-400',    bgColor: 'bg-gray-500/10',    borderColor: 'border-gray-500/30' },
  iot:          { label: 'IoT Device',    color: 'text-orange-400',  bgColor: 'bg-orange-500/10',  borderColor: 'border-orange-500/30' },
  container:    { label: 'Container',     color: 'text-cyan-400',    bgColor: 'bg-cyan-500/10',    borderColor: 'border-cyan-500/30' },
  vpn:          { label: 'VPN Gateway',   color: 'text-green-400',   bgColor: 'bg-green-500/10',   borderColor: 'border-green-500/30' },
  wap:          { label: 'Access Point',  color: 'text-indigo-400',  bgColor: 'bg-indigo-500/10',  borderColor: 'border-indigo-500/30' },
  unknown:      { label: 'Unknown',       color: 'text-zinc-400',    bgColor: 'bg-zinc-500/10',    borderColor: 'border-zinc-500/30' },
  internet:     { label: 'Internet',      color: 'text-blue-300',    bgColor: 'bg-blue-400/10',    borderColor: 'border-blue-400/30' },
  attacker:     { label: 'Attacker',      color: 'text-emerald-400',  bgColor: 'bg-emerald-600/10',  borderColor: 'border-emerald-500/40' },
};
