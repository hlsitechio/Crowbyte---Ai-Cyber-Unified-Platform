/**
 * NodeEditor — Right sidebar for adding/editing network nodes.
 */

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import {
  X, Save, Trash2, Plus, Server, Monitor, Router, ShieldAlert,
  Layers, Cloud, Database, Scale, Printer, Cpu, Container,
  ShieldCheck, Wifi, HelpCircle, Globe, Skull, Lock, Unlock,
  Copy, ExternalLink, Tag,
} from 'lucide-react';
import { type NetworkDevice, type DeviceType, type DevicePort, DEVICE_TYPES } from './types';

interface NodeEditorProps {
  device: NetworkDevice | null;
  isNew?: boolean;
  onSave: (device: NetworkDevice) => void;
  onDelete?: (id: string) => void;
  onClose: () => void;
}

const DEVICE_ICONS: Record<string, React.ElementType> = {
  server: Server, workstation: Monitor, router: Router, firewall: ShieldAlert,
  switch: Layers, cloud: Cloud, database: Database, loadbalancer: Scale,
  printer: Printer, iot: Cpu, container: Container, vpn: ShieldCheck,
  wap: Wifi, unknown: HelpCircle, internet: Globe, attacker: Skull,
};

export function NodeEditor({ device, isNew, onSave, onDelete, onClose }: NodeEditorProps) {
  const [form, setForm] = useState<NetworkDevice>({
    id: '',
    type: 'server',
    label: '',
    ip: '',
    hostname: '',
    mac: '',
    os: '',
    ports: [],
    status: 'up',
    notes: '',
    tags: [],
  });

  const [newPort, setNewPort] = useState({ port: '', service: '' });
  const [newTag, setNewTag] = useState('');

  useEffect(() => {
    if (device) {
      setForm({ ...device });
    } else {
      setForm({
        id: `device-${Date.now()}`,
        type: 'server',
        label: '',
        ip: '',
        hostname: '',
        mac: '',
        os: '',
        ports: [],
        status: 'up',
        notes: '',
        tags: [],
      });
    }
  }, [device]);

  const updateField = (field: keyof NetworkDevice, value: string | DeviceType) => {
    setForm(prev => ({ ...prev, [field]: value }));
  };

  const addPort = () => {
    const portNum = parseInt(newPort.port);
    if (!portNum || portNum < 1 || portNum > 65535) return;
    setForm(prev => ({
      ...prev,
      ports: [...prev.ports, { port: portNum, protocol: 'tcp', state: 'open', service: newPort.service || 'unknown', version: '' }],
    }));
    setNewPort({ port: '', service: '' });
  };

  const removePort = (index: number) => {
    setForm(prev => ({
      ...prev,
      ports: prev.ports.filter((_, i) => i !== index),
    }));
  };

  const addTag = () => {
    if (!newTag.trim()) return;
    setForm(prev => ({
      ...prev,
      tags: [...(prev.tags || []), newTag.trim()],
    }));
    setNewTag('');
  };

  const removeTag = (index: number) => {
    setForm(prev => ({
      ...prev,
      tags: (prev.tags || []).filter((_, i) => i !== index),
    }));
  };

  const handleSave = () => {
    if (!form.label.trim()) return;
    onSave(form);
  };

  const Icon = DEVICE_ICONS[form.type] || HelpCircle;
  const meta = DEVICE_TYPES[form.type];
  const openPorts = form.ports.filter(p => p.state === 'open').length;

  return (
    <div className="w-80 border-l border-zinc-800 bg-zinc-900/80 backdrop-blur-sm flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-800">
        <div className="flex items-center gap-2">
          <div className={`p-1 rounded ${meta.bgColor} ${meta.color}`}>
            <Icon className="h-4 w-4" />
          </div>
          <span className="text-sm font-medium text-white">
            {isNew ? 'Add Device' : 'Edit Device'}
          </span>
        </div>
        <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={onClose}>
          <X className="h-3.5 w-3.5" />
        </Button>
      </div>

      {/* Form */}
      <ScrollArea className="flex-1">
        <div className="p-4 space-y-4">
          {/* Device Type */}
          <div className="space-y-1.5">
            <Label className="text-[11px] text-zinc-400">Device Type</Label>
            <Select value={form.type} onValueChange={(v) => updateField('type', v as DeviceType)}>
              <SelectTrigger className="h-8 text-xs bg-zinc-800/50">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(DEVICE_TYPES).map(([key, val]) => {
                  const TypeIcon = DEVICE_ICONS[key] || HelpCircle;
                  return (
                    <SelectItem key={key} value={key} className="text-xs">
                      <div className="flex items-center gap-2">
                        <TypeIcon className={`h-3 w-3 ${val.color}`} />
                        {val.label}
                      </div>
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
          </div>

          {/* Name */}
          <div className="space-y-1.5">
            <Label className="text-[11px] text-zinc-400">Name *</Label>
            <Input
              value={form.label}
              onChange={e => updateField('label', e.target.value)}
              placeholder="e.g. web-prod-01"
              className="h-8 text-xs bg-zinc-800/50 font-mono"
            />
          </div>

          {/* IP + Hostname */}
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1.5">
              <Label className="text-[11px] text-zinc-400">IP Address</Label>
              <Input
                value={form.ip || ''}
                onChange={e => updateField('ip', e.target.value)}
                placeholder="10.0.1.5"
                className="h-8 text-xs bg-zinc-800/50 font-mono"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-[11px] text-zinc-400">Status</Label>
              <Select value={form.status} onValueChange={(v) => updateField('status', v)}>
                <SelectTrigger className="h-8 text-xs bg-zinc-800/50">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="up" className="text-xs text-green-400">Up</SelectItem>
                  <SelectItem value="down" className="text-xs text-red-400">Down</SelectItem>
                  <SelectItem value="unknown" className="text-xs text-zinc-400">Unknown</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Hostname */}
          <div className="space-y-1.5">
            <Label className="text-[11px] text-zinc-400">Hostname</Label>
            <Input
              value={form.hostname || ''}
              onChange={e => updateField('hostname', e.target.value)}
              placeholder="web-prod-01.corp.local"
              className="h-8 text-xs bg-zinc-800/50 font-mono"
            />
          </div>

          {/* MAC + Vendor */}
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1.5">
              <Label className="text-[11px] text-zinc-400">MAC</Label>
              <Input
                value={form.mac || ''}
                onChange={e => updateField('mac', e.target.value)}
                placeholder="AA:BB:CC:..."
                className="h-8 text-xs bg-zinc-800/50 font-mono"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-[11px] text-zinc-400">Vendor</Label>
              <Input
                value={form.vendor || ''}
                onChange={e => updateField('vendor', e.target.value)}
                placeholder="Dell, Cisco..."
                className="h-8 text-xs bg-zinc-800/50"
              />
            </div>
          </div>

          {/* OS */}
          <div className="space-y-1.5">
            <Label className="text-[11px] text-zinc-400">Operating System</Label>
            <Input
              value={form.os || ''}
              onChange={e => updateField('os', e.target.value)}
              placeholder="Ubuntu 22.04, Windows Server 2022..."
              className="h-8 text-xs bg-zinc-800/50"
            />
          </div>

          {/* Subnet */}
          <div className="space-y-1.5">
            <Label className="text-[11px] text-zinc-400">Subnet / VLAN</Label>
            <Input
              value={form.subnet || ''}
              onChange={e => updateField('subnet', e.target.value)}
              placeholder="10.0.1.0/24 or VLAN 100"
              className="h-8 text-xs bg-zinc-800/50 font-mono"
            />
          </div>

          <Separator className="bg-zinc-800" />

          {/* Ports */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-[11px] text-zinc-400">Open Ports</Label>
              <Badge variant="outline" className="text-[9px] h-4">{openPorts} open</Badge>
            </div>

            {/* Existing ports */}
            {form.ports.length > 0 && (
              <div className="space-y-0.5">
                {form.ports.map((p, i) => (
                  <div key={i} className="flex items-center justify-between px-2 py-1 rounded bg-zinc-800/30 group">
                    <div className="flex items-center gap-2">
                      {p.state === 'open' ? (
                        <Unlock className="h-2.5 w-2.5 text-green-400" />
                      ) : (
                        <Lock className="h-2.5 w-2.5 text-yellow-400" />
                      )}
                      <span className="text-[11px] font-mono text-white">{p.port}/{p.protocol}</span>
                      <span className="text-[10px] text-cyan-400">{p.service}</span>
                    </div>
                    <Button
                      variant="ghost" size="sm"
                      className="h-5 w-5 p-0 opacity-0 group-hover:opacity-100"
                      onClick={() => removePort(i)}
                    >
                      <X className="h-2.5 w-2.5 text-red-400" />
                    </Button>
                  </div>
                ))}
              </div>
            )}

            {/* Add port */}
            <div className="flex gap-1">
              <Input
                value={newPort.port}
                onChange={e => setNewPort(prev => ({ ...prev, port: e.target.value }))}
                placeholder="Port"
                className="h-7 text-[11px] bg-zinc-800/50 font-mono w-20"
                type="number"
                onKeyDown={e => e.key === 'Enter' && addPort()}
              />
              <Input
                value={newPort.service}
                onChange={e => setNewPort(prev => ({ ...prev, service: e.target.value }))}
                placeholder="Service"
                className="h-7 text-[11px] bg-zinc-800/50 flex-1"
                onKeyDown={e => e.key === 'Enter' && addPort()}
              />
              <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={addPort}>
                <Plus className="h-3 w-3" />
              </Button>
            </div>
          </div>

          <Separator className="bg-zinc-800" />

          {/* Tags */}
          <div className="space-y-2">
            <Label className="text-[11px] text-zinc-400">Tags</Label>
            {form.tags && form.tags.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {form.tags.map((tag, i) => (
                  <Badge
                    key={i}
                    variant="outline"
                    className="text-[9px] h-5 gap-1 cursor-pointer hover:bg-red-500/10"
                    onClick={() => removeTag(i)}
                  >
                    <Tag className="h-2 w-2" />{tag}<X className="h-2 w-2" />
                  </Badge>
                ))}
              </div>
            )}
            <div className="flex gap-1">
              <Input
                value={newTag}
                onChange={e => setNewTag(e.target.value)}
                placeholder="Add tag..."
                className="h-7 text-[11px] bg-zinc-800/50 flex-1"
                onKeyDown={e => e.key === 'Enter' && addTag()}
              />
              <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={addTag}>
                <Plus className="h-3 w-3" />
              </Button>
            </div>
          </div>

          <Separator className="bg-zinc-800" />

          {/* Notes */}
          <div className="space-y-1.5">
            <Label className="text-[11px] text-zinc-400">Notes</Label>
            <textarea
              value={form.notes || ''}
              onChange={e => setForm(prev => ({ ...prev, notes: e.target.value }))}
              placeholder="Internal notes, vulns, observations..."
              className="w-full h-20 text-xs bg-zinc-800/50 border border-zinc-700 rounded-md px-2 py-1.5 resize-none text-zinc-300 focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>

          {/* Quick actions (edit mode only) */}
          {!isNew && device?.ip && (
            <div className="flex flex-wrap gap-1">
              <Button variant="outline" size="sm" className="h-6 text-[10px] gap-1"
                onClick={() => navigator.clipboard.writeText(device.ip || '')}>
                <Copy className="h-2.5 w-2.5" /> Copy IP
              </Button>
              <Button variant="outline" size="sm" className="h-6 text-[10px] gap-1"
                onClick={() => window.open(`https://www.shodan.io/host/${device.ip}`, '_blank')}>
                <ExternalLink className="h-2.5 w-2.5" /> Shodan
              </Button>
            </div>
          )}
        </div>
      </ScrollArea>

      {/* Actions */}
      <div className="flex items-center gap-2 p-3 border-t border-zinc-800">
        {!isNew && onDelete && (
          <Button variant="destructive" size="sm" className="h-8 text-xs gap-1"
            onClick={() => onDelete(form.id)}>
            <Trash2 className="h-3 w-3" /> Delete
          </Button>
        )}
        <div className="flex-1" />
        <Button variant="ghost" size="sm" className="h-8 text-xs" onClick={onClose}>Cancel</Button>
        <Button size="sm" className="h-8 text-xs gap-1" onClick={handleSave} disabled={!form.label.trim()}>
          <Save className="h-3 w-3" /> {isNew ? 'Add' : 'Save'}
        </Button>
      </div>
    </div>
  );
}
