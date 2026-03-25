/**
 * DeviceNode — Custom ReactFlow node for network devices.
 * Renders as a compact card with icon, name, IP, status, ports.
 */

import { memo } from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import {
  DesktopTower, Monitor, ShareNetwork, ShieldWarning, Stack, Cloud, Database,
  Scales, Printer, Cpu, Package, ShieldCheck, WifiHigh, Question,
  Globe, Skull, Lock, LockOpen,
} from '@phosphor-icons/react';
import { type NetworkDevice, DEVICE_TYPES } from './types';

const DEVICE_ICONS: Record<string, React.ElementType> = {
  server: DesktopTower,
  workstation: Monitor,
  router: ShareNetwork,
  firewall: ShieldWarning,
  switch: Stack,
  cloud: Cloud,
  database: Database,
  loadbalancer: Scales,
  printer: Printer,
  iot: Cpu,
  container: Package,
  vpn: ShieldCheck,
  wap: WifiHigh,
  unknown: Question,
  internet: Globe,
  attacker: Skull,
};

type DeviceNodeData = NetworkDevice & { selected?: boolean };

function DeviceNodeComponent({ data, selected }: NodeProps & { data: DeviceNodeData }) {
  const device = data as DeviceNodeData;
  const meta = DEVICE_TYPES[device.type] || DEVICE_TYPES.unknown;
  const Icon = DEVICE_ICONS[device.type] || Question;
  const openPorts = device.ports?.filter(p => p.state === 'open').length || 0;
  const isUp = device.status === 'up';
  const isAttacker = device.type === 'attacker';
  const isInternet = device.type === 'internet';

  return (
    <>
      {/* Connection handles */}
      <Handle type="target" position={Position.Top} className="!w-2 !h-2 !bg-zinc-600 !border-zinc-500 hover:!bg-primary" />
      <Handle type="source" position={Position.Bottom} className="!w-2 !h-2 !bg-zinc-600 !border-zinc-500 hover:!bg-primary" />
      <Handle type="target" position={Position.Left} className="!w-2 !h-2 !bg-zinc-600 !border-zinc-500 hover:!bg-primary" id="left-in" />
      <Handle type="source" position={Position.Right} className="!w-2 !h-2 !bg-zinc-600 !border-zinc-500 hover:!bg-primary" id="right-out" />

      <div
        className={`
          relative rounded-lg border backdrop-blur-sm transition-all duration-200 min-w-[160px] max-w-[200px]
          ${meta.bgColor} ${meta.borderColor}
          ${selected ? 'ring-2 ring-primary/60 shadow-lg shadow-primary/20' : ''}
          ${isAttacker ? 'shadow-red-500/20 shadow-lg' : ''}
          ${!isUp && !isInternet && !isAttacker ? 'opacity-50' : ''}
          hover:shadow-md hover:brightness-110 cursor-pointer
        `}
      >
        {/* Status indicator */}
        <div className={`absolute -top-1 -right-1 w-3 h-3 rounded-full border-2 border-zinc-900 ${
          device.status === 'up' ? 'bg-emerald-500' :
          device.status === 'scanning' ? 'bg-amber-500 animate-pulse' :
          device.status === 'down' ? 'bg-red-500' : 'bg-zinc-500'
        }`} />

        {/* Header */}
        <div className="flex items-center gap-2 px-3 pt-2.5 pb-1">
          <div className={`p-1.5 rounded-md ${meta.bgColor} ${meta.color}`}>
            <Icon size={16} weight="bold" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-white truncate leading-tight">{device.label}</p>
            <p className="text-[10px] text-zinc-500 truncate">{meta.label}</p>
          </div>
        </div>

        {/* Details */}
        <div className="px-3 pb-2.5 space-y-1">
          {device.ip && (
            <p className="text-[11px] font-mono text-zinc-300">{device.ip}</p>
          )}

          {device.hostname && device.hostname !== device.label && (
            <p className="text-[10px] text-zinc-500 truncate">{device.hostname}</p>
          )}

          {device.os && (
            <p className="text-[10px] text-blue-500/70 truncate">{device.os}</p>
          )}

          {/* Port / service badges */}
          {device.ports && device.ports.length > 0 && (
            <div className="flex flex-wrap gap-0.5 pt-0.5">
              {device.ports.slice(0, 6).map((p, i) => (
                <span
                  key={i}
                  className={`inline-flex items-center gap-0.5 px-1 py-0 rounded text-[9px] font-mono border ${
                    p.state === 'open'
                      ? 'text-emerald-500 bg-transparent border-transparent'
                      : 'text-amber-500 bg-transparent border-transparent'
                  }`}
                >
                  {p.state === 'open' ? <LockOpen size={8} weight="bold" /> : <Lock size={8} weight="bold" />}
                  {p.port}
                </span>
              ))}
              {device.ports.length > 6 && (
                <span className="text-[9px] text-zinc-500 px-1">+{device.ports.length - 6}</span>
              )}
            </div>
          )}

          {/* Tags */}
          {device.tags && device.tags.length > 0 && (
            <div className="flex flex-wrap gap-0.5 pt-0.5">
              {device.tags.slice(0, 3).map((tag, i) => (
                <span key={i} className="text-[8px] px-1 py-0 rounded text-zinc-400 border border-zinc-700">
                  {tag}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
}

export const DeviceNode = memo(DeviceNodeComponent);
export default DeviceNode;
