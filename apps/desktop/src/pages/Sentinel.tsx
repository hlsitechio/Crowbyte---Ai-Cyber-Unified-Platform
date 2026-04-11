/**
 * Sentinel AI — Autonomous Security Operations Center
 *
 * Full Pipeline: Infrastructure Profile → CVE Matching → AI Triage → Action Engine
 */

import { useState, useEffect, useCallback } from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { UilShield, UilPlus, UilTrashAlt, UilPen, UilDesktop, UilGlobe, UilCloud, UilCog, UilExclamationTriangle, UilCheckCircle, UilTimesCircle, UilBolt, UilEye, UilSync, UilAngleDown, UilAngleRight, UilCopy, UilCrosshair, UilHeartRate, UilRobot, UilFocusTarget, UilHistory, UilPlay, UilQrcodeScan, UilWindow } from "@iconscout/react-unicons";
import { motion, AnimatePresence } from 'framer-motion';
import { useToast } from '@/hooks/use-toast';
import {
  sentinelService,
  type InfrastructureAsset,
  type ThreatAction,
  type SentinelScan,
  type ServiceEntry,
  type SoftwareEntry,
} from '@/services/sentinel';
import { sentinelEngine, type SentinelEvent } from '@/services/sentinel-engine';
import { sentinelAI, type SentinelChatMessage } from '@/services/sentinel-ai';

// ── Asset Type Icons ─────────────────────────────────────────────────────

const ASSET_ICONS: Record<string, typeof UilDesktop> = {
  host: UilDesktop,
  service: UilCog,
  domain: UilGlobe,
  cloud_asset: UilCloud,
};

const SEVERITY_COLORS: Record<string, string> = {
  critical: 'text-red-500 bg-red-500/10 border-red-500/20',
  high: 'text-orange-500 bg-orange-500/10 border-orange-500/20',
  medium: 'text-yellow-500 bg-yellow-500/10 border-yellow-500/20',
  low: 'text-blue-500 bg-blue-500/10 border-blue-500/20',
  info: 'text-zinc-400 bg-zinc-500/10 border-zinc-500/20',
};

const STATUS_COLORS: Record<string, { dot: string; text: string }> = {
  online: { dot: 'bg-emerald-500', text: 'text-emerald-500' },
  offline: { dot: 'bg-red-500', text: 'text-red-500' },
  unknown: { dot: 'bg-zinc-500', text: 'text-zinc-400' },
};

const THREAT_STATUS_COLORS: Record<string, string> = {
  new: 'bg-red-500/20 text-red-400',
  investigating: 'bg-amber-500/20 text-amber-400',
  mitigating: 'bg-blue-500/20 text-blue-400',
  resolved: 'bg-emerald-500/20 text-emerald-400',
  accepted: 'bg-zinc-500/20 text-zinc-400 border-zinc-500/30',
  false_positive: 'bg-zinc-500/20 text-zinc-500 border-zinc-500/30',
};

// ── Add Asset Modal ──────────────────────────────────────────────────────

function AddAssetForm({ onAdd, onCancel }: { onAdd: (asset: Partial<InfrastructureAsset>) => void; onCancel: () => void }) {
  const [name, setName] = useState('');
  const [assetType, setAssetType] = useState<InfrastructureAsset['asset_type']>('host');
  const [hostname, setHostname] = useState('');
  const [ipAddress, setIpAddress] = useState('');
  const [os, setOs] = useState('');
  const [tags, setTags] = useState('');
  const [services, setServices] = useState<ServiceEntry[]>([]);
  const [software, setSoftware] = useState<SoftwareEntry[]>([]);

  // Service entry form
  const [svcPort, setSvcPort] = useState('');
  const [svcProto, setSvcProto] = useState('tcp');
  const [svcName, setSvcName] = useState('');
  const [svcVersion, setSvcVersion] = useState('');

  // Software entry form
  const [swName, setSwName] = useState('');
  const [swVersion, setSwVersion] = useState('');
  const [swVendor, setSwVendor] = useState('');

  const addService = () => {
    if (!svcPort || !svcName) return;
    setServices(prev => [...prev, { port: parseInt(svcPort), protocol: svcProto, service: svcName, version: svcVersion || undefined }]);
    setSvcPort(''); setSvcName(''); setSvcVersion('');
  };

  const addSoftware = () => {
    if (!swName || !swVersion) return;
    setSoftware(prev => [...prev, { name: swName, version: swVersion, vendor: swVendor || undefined }]);
    setSwName(''); setSwVersion(''); setSwVendor('');
  };

  const handleSubmit = () => {
    if (!name) return;
    onAdd({
      name,
      asset_type: assetType,
      hostname: hostname || undefined,
      ip_address: ipAddress || undefined,
      os: os || undefined,
      tags: tags ? tags.split(',').map(t => t.trim()) : [],
      services,
      software,
      open_ports: services.map(s => s.port),
    });
  };

  return (
    <Card className="bg-zinc-900/80 border-zinc-700/50">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm flex items-center gap-2">
          <UilPlus size={16} className="text-emerald-500" />
          Add Infrastructure Asset
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Basic Info */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs text-zinc-500 mb-1 block">Name *</label>
            <Input value={name} onChange={e => setName(e.target.value)} placeholder="Production Web Server" className="bg-zinc-800/50 border-zinc-700 h-8 text-sm" />
          </div>
          <div>
            <label className="text-xs text-zinc-500 mb-1 block">Type</label>
            <select value={assetType} onChange={e => setAssetType(e.target.value as any)} className="w-full h-8 rounded-md bg-zinc-800/50 border border-zinc-700 text-sm text-zinc-300 px-2">
              <option value="host">Host / Server</option>
              <option value="service">Service / Application</option>
              <option value="domain">Domain</option>
              <option value="cloud_asset">UilCloud Asset</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className="text-xs text-zinc-500 mb-1 block">Hostname</label>
            <Input value={hostname} onChange={e => setHostname(e.target.value)} placeholder="web-prod-01" className="bg-zinc-800/50 border-zinc-700 h-8 text-sm" />
          </div>
          <div>
            <label className="text-xs text-zinc-500 mb-1 block">IP Address</label>
            <Input value={ipAddress} onChange={e => setIpAddress(e.target.value)} placeholder="192.168.1.100" className="bg-zinc-800/50 border-zinc-700 h-8 text-sm" />
          </div>
          <div>
            <label className="text-xs text-zinc-500 mb-1 block">Operating System</label>
            <Input value={os} onChange={e => setOs(e.target.value)} placeholder="Ubuntu 22.04 LTS" className="bg-zinc-800/50 border-zinc-700 h-8 text-sm" />
          </div>
        </div>

        <div>
          <label className="text-xs text-zinc-500 mb-1 block">Tags (comma-separated)</label>
          <Input value={tags} onChange={e => setTags(e.target.value)} placeholder="production, web, public-facing" className="bg-zinc-800/50 border-zinc-700 h-8 text-sm" />
        </div>

        {/* Services */}
        <div className="space-y-2">
          <label className="text-xs text-zinc-500 flex items-center gap-1">
            <UilCog size={12} /> Running Services
          </label>
          {services.length > 0 && (
            <div className="space-y-1">
              {services.map((svc, i) => (
                <div key={i} className="flex items-center gap-2 text-xs bg-zinc-800/30 rounded px-2 py-1">
                  <span className="font-mono text-emerald-400">{svc.port}/{svc.protocol}</span>
                  <span className="text-zinc-300">{svc.service}</span>
                  {svc.version && <span className="text-zinc-500">{svc.version}</span>}
                  <button onClick={() => setServices(prev => prev.filter((_, idx) => idx !== i))} className="ml-auto text-zinc-600 hover:text-red-400">
                    <UilTimesCircle size={14} />
                  </button>
                </div>
              ))}
            </div>
          )}
          <div className="flex items-center gap-2">
            <Input value={svcPort} onChange={e => setSvcPort(e.target.value)} placeholder="Port" className="bg-zinc-800/50 border-zinc-700 h-7 text-xs w-20" />
            <select value={svcProto} onChange={e => setSvcProto(e.target.value)} className="h-7 rounded-md bg-zinc-800/50 border border-zinc-700 text-xs text-zinc-300 px-1 w-16">
              <option value="tcp">TCP</option>
              <option value="udp">UDP</option>
            </select>
            <Input value={svcName} onChange={e => setSvcName(e.target.value)} placeholder="Service name" className="bg-zinc-800/50 border-zinc-700 h-7 text-xs flex-1" />
            <Input value={svcVersion} onChange={e => setSvcVersion(e.target.value)} placeholder="Version" className="bg-zinc-800/50 border-zinc-700 h-7 text-xs w-28" />
            <Button size="sm" variant="ghost" onClick={addService} className="h-7 px-2 text-emerald-500 hover:text-emerald-400">
              <UilPlus size={14} />
            </Button>
          </div>
        </div>

        {/* Software */}
        <div className="space-y-2">
          <label className="text-xs text-zinc-500 flex items-center gap-1">
            <UilBolt size={12} /> Installed Software
          </label>
          {software.length > 0 && (
            <div className="space-y-1">
              {software.map((sw, i) => (
                <div key={i} className="flex items-center gap-2 text-xs bg-zinc-800/30 rounded px-2 py-1">
                  <span className="text-zinc-300">{sw.name}</span>
                  <span className="font-mono text-blue-400">{sw.version}</span>
                  {sw.vendor && <span className="text-zinc-500">({sw.vendor})</span>}
                  <button onClick={() => setSoftware(prev => prev.filter((_, idx) => idx !== i))} className="ml-auto text-zinc-600 hover:text-red-400">
                    <UilTimesCircle size={14} />
                  </button>
                </div>
              ))}
            </div>
          )}
          <div className="flex items-center gap-2">
            <Input value={swName} onChange={e => setSwName(e.target.value)} placeholder="Software name" className="bg-zinc-800/50 border-zinc-700 h-7 text-xs flex-1" />
            <Input value={swVersion} onChange={e => setSwVersion(e.target.value)} placeholder="Version" className="bg-zinc-800/50 border-zinc-700 h-7 text-xs w-28" />
            <Input value={swVendor} onChange={e => setSwVendor(e.target.value)} placeholder="Vendor" className="bg-zinc-800/50 border-zinc-700 h-7 text-xs w-28" />
            <Button size="sm" variant="ghost" onClick={addSoftware} className="h-7 px-2 text-blue-500 hover:text-blue-400">
              <UilPlus size={14} />
            </Button>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 pt-2 border-t border-zinc-800">
          <Button onClick={handleSubmit} size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5">
            <UilPlus size={14} /> Add Asset
          </Button>
          <Button onClick={onCancel} size="sm" variant="ghost" className="text-zinc-400">Cancel</Button>
        </div>
      </CardContent>
    </Card>
  );
}

// ── Asset Card ───────────────────────────────────────────────────────────

function AssetCard({ asset, onDelete, expanded, onToggle }: {
  asset: InfrastructureAsset;
  onDelete: (id: string) => void;
  expanded: boolean;
  onToggle: () => void;
}) {
  const { toast } = useToast();
  const Icon = ASSET_ICONS[asset.asset_type] || UilDesktop;
  const statusColor = STATUS_COLORS[asset.status || 'unknown'];

  const copyCPE = () => {
    if (asset.cpe_list && asset.cpe_list.length > 0) {
      navigator.clipboard.writeText(asset.cpe_list.join('\n'));
      toast({ title: 'Copied', description: `${asset.cpe_list.length} CPE strings copied` });
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      className="bg-zinc-900/60 border border-zinc-800 rounded-lg overflow-hidden"
    >
      {/* Header */}
      <button onClick={onToggle} className="w-full flex items-center gap-3 px-4 py-3 hover:bg-white/[0.02] transition-colors">
        <div className="flex h-8 w-8 items-center justify-center rounded-md bg-zinc-800/80">
          <Icon size={16} className="text-zinc-300" />
        </div>
        <div className="flex-1 text-left">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-zinc-200">{asset.name}</span>
            <span className={`w-1.5 h-1.5 rounded-full ${statusColor.dot}`} />
            <span className={`text-[10px] uppercase font-medium ${statusColor.text}`}>{asset.status}</span>
          </div>
          <div className="flex items-center gap-3 text-xs text-zinc-500 mt-0.5">
            {asset.ip_address && <span className="font-mono">{asset.ip_address}</span>}
            {asset.hostname && <span>{asset.hostname}</span>}
            {asset.os && <span>{asset.os}</span>}
          </div>
        </div>
        <div className="flex items-center gap-2">
          {asset.services && asset.services.length > 0 && (
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-400 font-mono">
              {asset.services.length} svc
            </span>
          )}
          {asset.cpe_list && asset.cpe_list.length > 0 && (
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-400 font-mono">
              {asset.cpe_list.length} CPE
            </span>
          )}
          {asset.tags && asset.tags.map(tag => (
            <span key={tag} className="text-[10px] px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-500">{tag}</span>
          ))}
          {expanded ? <UilAngleDown size={14} className="text-zinc-500" /> : <UilAngleRight size={14} className="text-zinc-500" />}
        </div>
      </button>

      {/* Expanded Details */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="border-t border-zinc-800"
          >
            <div className="px-4 py-3 space-y-3">
              {/* Services */}
              {asset.services && asset.services.length > 0 && (
                <div>
                  <span className="text-[10px] uppercase tracking-wider text-zinc-500 font-medium">Services</span>
                  <div className="mt-1 grid grid-cols-2 gap-1">
                    {asset.services.map((svc, i) => (
                      <div key={i} className="flex items-center gap-2 text-xs bg-zinc-800/40 rounded px-2 py-1">
                        <span className="font-mono text-emerald-400 w-14">{svc.port}/{svc.protocol}</span>
                        <span className="text-zinc-300">{svc.service}</span>
                        {svc.version && <span className="text-zinc-500 ml-auto">{svc.version}</span>}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Software */}
              {asset.software && asset.software.length > 0 && (
                <div>
                  <span className="text-[10px] uppercase tracking-wider text-zinc-500 font-medium">Software</span>
                  <div className="mt-1 grid grid-cols-2 gap-1">
                    {asset.software.map((sw, i) => (
                      <div key={i} className="flex items-center gap-2 text-xs bg-zinc-800/40 rounded px-2 py-1">
                        <span className="text-zinc-300">{sw.name}</span>
                        <span className="font-mono text-blue-400">{sw.version}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* CPE List */}
              {asset.cpe_list && asset.cpe_list.length > 0 && (
                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] uppercase tracking-wider text-zinc-500 font-medium">CPE Strings (auto-generated)</span>
                    <button onClick={copyCPE} className="text-xs text-zinc-500 hover:text-zinc-300 flex items-center gap-1">
                      <UilCopy size={12} /> UilCopy
                    </button>
                  </div>
                  <div className="mt-1 space-y-0.5">
                    {asset.cpe_list.map((cpe, i) => (
                      <div key={i} className="text-[11px] font-mono text-cyan-400/70 bg-zinc-800/30 rounded px-2 py-0.5 truncate">
                        {cpe}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Actions */}
              <div className="flex items-center gap-2 pt-2 border-t border-zinc-800/50">
                <Button size="sm" variant="ghost" className="h-7 text-xs text-zinc-400 gap-1">
                  <UilPen size={12} /> Edit
                </Button>
                <Button size="sm" variant="ghost" className="h-7 text-xs text-zinc-400 gap-1">
                  <UilCrosshair size={12} /> UilQrcodeScan
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => asset.id && onDelete(asset.id)}
                  className="h-7 text-xs text-red-400/70 hover:text-red-400 gap-1 ml-auto"
                >
                  <UilTrashAlt size={12} /> Remove
                </Button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// ── Threat Card ──────────────────────────────────────────────────────────

function ThreatCard({ threat, onExecuteAction, onStatusChange }: {
  threat: ThreatAction;
  onExecuteAction?: (threatId: string, actionId: string) => void;
  onStatusChange?: (threatId: string, status: ThreatAction['status']) => void;
}) {
  const { toast } = useToast();
  const [expanded, setExpanded] = useState(false);
  const [executing, setExecuting] = useState<string | null>(null);
  const sevColor = SEVERITY_COLORS[threat.severity] || SEVERITY_COLORS.info;
  const statusColor = THREAT_STATUS_COLORS[threat.status] || THREAT_STATUS_COLORS.new;

  return (
    <motion.div
      initial={{ opacity: 0, x: -8 }}
      animate={{ opacity: 1, x: 0 }}
      className={`border rounded-lg overflow-hidden ${sevColor.split(' ')[2]}`}
    >
      <button onClick={() => setExpanded(!expanded)} className="w-full text-left px-4 py-3 hover:bg-white/[0.02] transition-colors">
        <div className="flex items-start gap-3">
          <UilExclamationTriangle size={18} className={sevColor.split(' ')[0]} />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs font-bold text-zinc-300">{threat.cve_id}</span>
              <span className={`text-[9px] uppercase font-bold px-1.5 py-0.5 rounded border ${sevColor}`}>
                {threat.severity}
              </span>
              <span className={`text-[9px] uppercase font-bold px-1.5 py-0.5 rounded border ${statusColor}`}>
                {threat.status.replace('_', ' ')}
              </span>
            </div>
            <p className="text-xs text-zinc-400 mt-1 line-clamp-2">{threat.title}</p>
            {threat.matched_assets && threat.matched_assets.length > 0 && (
              <div className="flex items-center gap-1 mt-1.5">
                <UilFocusTarget size={11} className="text-zinc-500" />
                <span className="text-[10px] text-zinc-500">
                  Affects: {threat.matched_assets.join(', ')}
                </span>
              </div>
            )}
          </div>
          <div className="text-right shrink-0">
            {threat.urgency && (
              <span className="text-[10px] text-zinc-500 block">
                {threat.urgency === 'immediate' ? 'ACT NOW' : threat.urgency.toUpperCase()}
              </span>
            )}
            {threat.time_to_act && (
              <span className="text-[10px] font-mono text-amber-400">{threat.time_to_act}</span>
            )}
          </div>
        </div>
      </button>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="border-t border-zinc-800 px-4 py-3 space-y-3"
          >
            <p className="text-xs text-zinc-400">{threat.summary}</p>

            {/* Action Items */}
            {threat.actions && threat.actions.length > 0 && (
              <div>
                <span className="text-[10px] uppercase tracking-wider text-zinc-500 font-medium">Recommended Actions</span>
                <div className="mt-1 space-y-1.5">
                  {threat.actions.map((action) => (
                    <div key={action.id} className="flex items-center gap-2 text-xs group">
                      {action.completed ? (
                        <UilCheckCircle size={14} className="text-emerald-500 shrink-0" />
                      ) : (
                        <div className="w-3.5 h-3.5 rounded-full border border-zinc-600 shrink-0" />
                      )}
                      <span className={`flex-1 ${action.completed ? 'text-zinc-500 line-through' : 'text-zinc-300'}`}>{action.label}</span>
                      <span className="text-[9px] px-1 rounded bg-zinc-800 text-zinc-500 uppercase shrink-0">{action.type}</span>
                      {action.command && !action.completed && onExecuteAction && (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={(e) => { e.stopPropagation(); onExecuteAction(threat.id!, action.id); }}
                          disabled={executing === action.id}
                          className="h-5 px-1.5 text-[10px] text-cyan-400 hover:text-cyan-300 opacity-0 group-hover:opacity-100 transition-opacity gap-1"
                        >
                          {executing === action.id ? <UilSync size={10} className="animate-spin" /> : <UilPlay size={10} />}
                          Execute
                        </Button>
                      )}
                      {action.result && (
                        <button
                          onClick={(e) => { e.stopPropagation(); navigator.clipboard.writeText(action.result || ''); toast({ title: 'Copied output' }); }}
                          className="text-zinc-600 hover:text-zinc-400"
                        >
                          <UilWindow size={12} />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Status Controls */}
            {onStatusChange && threat.status !== 'resolved' && (
              <div className="flex items-center gap-2 pt-2 border-t border-zinc-800/50">
                <span className="text-[10px] text-zinc-600 mr-auto">Change status:</span>
                {threat.status !== 'investigating' && (
                  <Button size="sm" variant="ghost" onClick={(e) => { e.stopPropagation(); onStatusChange(threat.id!, 'investigating'); }}
                    className="h-6 px-2 text-[10px] text-amber-400">Investigating</Button>
                )}
                {threat.status !== 'mitigating' && (
                  <Button size="sm" variant="ghost" onClick={(e) => { e.stopPropagation(); onStatusChange(threat.id!, 'mitigating'); }}
                    className="h-6 px-2 text-[10px] text-blue-400">Mitigating</Button>
                )}
                <Button size="sm" variant="ghost" onClick={(e) => { e.stopPropagation(); onStatusChange(threat.id!, 'resolved'); }}
                  className="h-6 px-2 text-[10px] text-emerald-400">Resolve</Button>
                <Button size="sm" variant="ghost" onClick={(e) => { e.stopPropagation(); onStatusChange(threat.id!, 'false_positive'); }}
                  className="h-6 px-2 text-[10px] text-zinc-500">False Positive</Button>
              </div>
            )}

            {/* Detection Rules */}
            {threat.detection_rules && threat.detection_rules.length > 0 && (
              <div>
                <span className="text-[10px] uppercase tracking-wider text-zinc-500 font-medium">Detection Rules</span>
                <div className="mt-1 space-y-0.5">
                  {threat.detection_rules.map((rule, i) => (
                    <div key={i} className="text-[11px] font-mono text-cyan-400/60 bg-zinc-800/30 rounded px-2 py-0.5">{rule}</div>
                  ))}
                </div>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// ── Main Sentinel Page ───────────────────────────────────────────────────

export default function Sentinel() {
  const { toast } = useToast();
  const [assets, setAssets] = useState<InfrastructureAsset[]>([]);
  const [threats, setThreats] = useState<ThreatAction[]>([]);
  const [scans, setScans] = useState<SentinelScan[]>([]);
  const [stats, setStats] = useState({ totalAssets: 0, activeThreats: 0, criticalThreats: 0, recentScans: 0, resolvedThreats: 0 });
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [expandedAsset, setExpandedAsset] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'infrastructure' | 'threats' | 'scans' | 'chat'>('infrastructure');
  const [pipelineRunning, setPipelineRunning] = useState(false);
  const [pipelineResult, setPipelineResult] = useState<{ matchesFound: number; threatsCreated: number; assetsScanned: number } | null>(null);
  const [scanRunning, setScanRunning] = useState(false);
  const [eventLog, setEventLog] = useState<SentinelEvent[]>([]);
  const [chatMessages, setChatMessages] = useState<SentinelChatMessage[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  const [briefing, setBriefing] = useState<string | null>(null);
  const [briefingLoading, setBriefingLoading] = useState(false);

  // Load data
  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const [assetData, threatData, scanData, statsData] = await Promise.all([
        sentinelService.getAssets(),
        sentinelService.getThreats(),
        sentinelService.getScans(),
        sentinelService.getDashboardStats(),
      ]);
      setAssets(assetData);
      setThreats(threatData);
      setScans(scanData);
      setStats(statsData);
    } catch (err) {
      console.error('Sentinel load error:', err);
      toast({ title: 'Error', description: 'Failed to load Sentinel data', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Engine event listener
  useEffect(() => {
    const unsub = sentinelEngine.on((event) => {
      setEventLog(prev => [event, ...prev].slice(0, 50));
    });
    return unsub;
  }, []);

  // Run full pipeline
  const handleRunPipeline = useCallback(async (skipScan = false) => {
    setPipelineRunning(true);
    setPipelineResult(null);
    try {
      const result = await sentinelEngine.runFullPipeline({ skipScan });
      setPipelineResult({ matchesFound: result.matchesFound, threatsCreated: result.threatsCreated, assetsScanned: result.assetsScanned });
      await loadData(); // Refresh all data
      toast({
        title: 'Sentinel Pipeline Complete',
        description: `${result.matchesFound} CVE matches → ${result.threatsCreated} new threat cards`,
      });
      if (result.threatsCreated > 0) setActiveTab('threats');
    } catch (err) {
      toast({ title: 'Pipeline Error', description: err instanceof Error ? err.message : 'Unknown error', variant: 'destructive' });
    } finally {
      setPipelineRunning(false);
    }
  }, [toast, loadData]);

  // Run scan only
  const handleScan = useCallback(async () => {
    setScanRunning(true);
    try {
      const results = await sentinelEngine.autoScan();
      await loadData();
      toast({ title: 'UilQrcodeScan Complete', description: `${results.length} hosts scanned` });
    } catch (err) {
      toast({ title: 'UilQrcodeScan Error', description: err instanceof Error ? err.message : 'Unknown error', variant: 'destructive' });
    } finally {
      setScanRunning(false);
    }
  }, [toast, loadData]);

  // Execute action from threat card
  const handleExecuteAction = useCallback(async (threatId: string, actionId: string) => {
    try {
      const result = await sentinelEngine.executeAction(threatId, actionId);
      if (result.status === 'completed') {
        toast({ title: 'Action Executed', description: result.output.slice(0, 100) });
      } else {
        toast({ title: 'Action Failed', description: result.error || 'Unknown error', variant: 'destructive' });
      }
      await loadData();
    } catch (err) {
      toast({ title: 'Execution Error', description: err instanceof Error ? err.message : 'Unknown error', variant: 'destructive' });
    }
  }, [toast, loadData]);

  // Change threat status
  const handleStatusChange = useCallback(async (threatId: string, status: ThreatAction['status']) => {
    try {
      await sentinelService.updateThreatStatus(threatId, status);
      setThreats(prev => prev.map(t => t.id === threatId ? { ...t, status } : t));
      toast({ title: 'Status Updated', description: `Threat marked as ${status}` });
    } catch (err) {
      toast({ title: 'Error', description: 'Failed to update status', variant: 'destructive' });
    }
  }, [toast]);

  // Chat with Sentinel AI
  const handleChatSend = useCallback(async () => {
    if (!chatInput.trim() || chatLoading) return;
    const message = chatInput.trim();
    setChatInput('');
    setChatMessages(prev => [...prev, { role: 'user', content: message, timestamp: new Date().toISOString() }]);
    setChatLoading(true);
    try {
      const response = await sentinelAI.chat(message, threats, assets);
      setChatMessages(prev => [...prev, { role: 'sentinel', content: response, timestamp: new Date().toISOString() }]);
    } catch {
      setChatMessages(prev => [...prev, { role: 'sentinel', content: 'Error: Could not reach AI. Check LLM settings.', timestamp: new Date().toISOString() }]);
    } finally {
      setChatLoading(false);
    }
  }, [chatInput, chatLoading, threats, assets]);

  // Generate AI briefing
  const handleBriefing = useCallback(async () => {
    setBriefingLoading(true);
    try {
      const result = await sentinelAI.generateBriefing(threats, assets);
      setBriefing(result);
    } catch {
      setBriefing('Could not generate briefing. Check LLM configuration.');
    } finally {
      setBriefingLoading(false);
    }
  }, [threats, assets]);

  const suggestedQuestions = sentinelAI.getSuggestedQuestions(threats, assets);

  // Realtime subscriptions
  useEffect(() => {
    const unsubThreats = sentinelService.subscribeToThreats((threat) => {
      setThreats(prev => [threat, ...prev]);
      setStats(prev => ({ ...prev, activeThreats: prev.activeThreats + 1 }));
      toast({
        title: `New Threat: ${threat.cve_id}`,
        description: threat.title,
        variant: threat.severity === 'critical' ? 'destructive' : 'default',
      });
    });

    const unsubScans = sentinelService.subscribeToScans((scan) => {
      setScans(prev => {
        const idx = prev.findIndex(s => s.id === scan.id);
        if (idx >= 0) {
          const updated = [...prev];
          updated[idx] = scan;
          return updated;
        }
        return [scan, ...prev];
      });
    });

    return () => { unsubThreats(); unsubScans(); };
  }, [toast]);

  // Add asset handler
  const handleAddAsset = async (assetData: Partial<InfrastructureAsset>) => {
    try {
      const newAsset = await sentinelService.addAsset(assetData as any);
      setAssets(prev => [newAsset, ...prev]);
      setStats(prev => ({ ...prev, totalAssets: prev.totalAssets + 1 }));
      setShowAddForm(false);
      toast({ title: 'Asset Added', description: `${newAsset.name} — ${newAsset.cpe_list?.length || 0} CPE strings generated` });
    } catch (err) {
      toast({ title: 'Error', description: 'Failed to add asset', variant: 'destructive' });
    }
  };

  // Delete asset handler
  const handleDeleteAsset = async (id: string) => {
    try {
      await sentinelService.deleteAsset(id);
      setAssets(prev => prev.filter(a => a.id !== id));
      setStats(prev => ({ ...prev, totalAssets: prev.totalAssets - 1 }));
      toast({ title: 'Removed', description: 'Asset deleted from infrastructure profile' });
    } catch (err) {
      toast({ title: 'Error', description: 'Failed to delete asset', variant: 'destructive' });
    }
  };

  return (
    <ScrollArea className="h-full">
      <div className="p-6 max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-red-500/20 to-orange-500/20">
              <UilShield size={22} className="text-red-400" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-zinc-100 flex items-center gap-2">
                Sentinel AI
                <span className="text-[9px] px-1.5 py-0.5 rounded bg-red-500/10 text-red-400 uppercase font-bold tracking-wider">
                  Phase 1
                </span>
              </h1>
              <p className="text-xs text-zinc-500">Autonomous threat detection & response for your infrastructure</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              onClick={() => handleRunPipeline(false)}
              disabled={pipelineRunning || stats.totalAssets === 0}
              size="sm"
              className="bg-red-600 hover:bg-red-700 text-white gap-1.5"
            >
              {pipelineRunning ? <UilSync size={14} className="animate-spin" /> : <UilPlay size={14} />}
              {pipelineRunning ? 'Running...' : 'Run Full Pipeline'}
            </Button>
            <Button
              onClick={() => handleRunPipeline(true)}
              disabled={pipelineRunning || stats.totalAssets === 0}
              variant="outline"
              size="sm"
              className="gap-1.5"
            >
              <UilCrosshair size={14} />
              CVE Match Only
            </Button>
            <Button
              onClick={handleScan}
              disabled={scanRunning || stats.totalAssets === 0}
              variant="outline"
              size="sm"
              className="gap-1.5"
            >
              {scanRunning ? <UilSync size={14} className="animate-spin" /> : <UilQrcodeScan size={14} />}
              UilQrcodeScan
            </Button>
            <Button onClick={loadData} variant="ghost" size="sm" className="gap-1">
              <UilSync size={14} className={loading ? 'animate-spin' : ''} />
            </Button>
          </div>
        </div>

        {/* Stats Bar */}
        <div className="grid grid-cols-5 gap-3">
          {[
            { label: 'Assets', value: stats.totalAssets, icon: UilDesktop, color: 'text-blue-400' },
            { label: 'Active Threats', value: stats.activeThreats, icon: UilExclamationTriangle, color: 'text-amber-400' },
            { label: 'Critical', value: stats.criticalThreats, icon: UilTimesCircle, color: 'text-red-400' },
            { label: 'Scans (7d)', value: stats.recentScans, icon: UilEye, color: 'text-cyan-400' },
            { label: 'Resolved', value: stats.resolvedThreats, icon: UilCheckCircle, color: 'text-emerald-400' },
          ].map(stat => (
            <Card key={stat.label} className="bg-zinc-900/60 border-zinc-800">
              <CardContent className="p-3 flex items-center gap-3">
                <stat.icon size={20} className={stat.color} />
                <div>
                  <div className="text-lg font-bold text-zinc-100 font-mono">{stat.value}</div>
                  <div className="text-[10px] text-zinc-500 uppercase tracking-wider">{stat.label}</div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Pipeline Result Banner */}
        <AnimatePresence>
          {pipelineResult && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              className="bg-gradient-to-r from-red-500/10 via-orange-500/10 to-amber-500/10 rounded-lg p-3"
            >
              <div className="flex items-center gap-4 text-xs">
                <UilShield size={16} className="text-red-400" />
                <span className="text-zinc-300 font-medium">Pipeline Complete:</span>
                <span className="font-mono text-cyan-400">{pipelineResult.assetsScanned} hosts scanned</span>
                <span className="text-zinc-600">|</span>
                <span className="font-mono text-amber-400">{pipelineResult.matchesFound} CVE matches</span>
                <span className="text-zinc-600">|</span>
                <span className="font-mono text-red-400">{pipelineResult.threatsCreated} new threats</span>
                <button onClick={() => setPipelineResult(null)} className="ml-auto text-zinc-600 hover:text-zinc-400">
                  <UilTimesCircle size={14} />
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Event Log (last 5 events) */}
        {eventLog.length > 0 && (
          <div className="flex items-center gap-2 text-[10px] text-zinc-600 overflow-x-auto">
            <UilHeartRate size={10} className="text-emerald-500 animate-pulse shrink-0" />
            {eventLog.slice(0, 5).map((event, i) => (
              <span key={i} className="shrink-0 flex items-center gap-1">
                <span className="text-zinc-500">{event.type.replace('_', ' ')}</span>
                {i < 4 && <span className="text-zinc-800">|</span>}
              </span>
            ))}
          </div>
        )}

        {/* Tab Navigation */}
        <div className="flex items-center gap-1 bg-zinc-900/40 rounded-lg p-1 w-fit">
          {[
            { key: 'infrastructure' as const, label: 'Infrastructure', icon: UilDesktop, count: stats.totalAssets },
            { key: 'threats' as const, label: 'Threat Actions', icon: UilExclamationTriangle, count: stats.activeThreats },
            { key: 'scans' as const, label: 'UilQrcodeScan History', icon: UilHistory, count: stats.recentScans },
            { key: 'chat' as const, label: 'Sentinel Chat', icon: UilRobot, count: 0 },
          ].map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex items-center gap-2 px-4 py-2 rounded-md text-xs font-medium transition-colors ${
                activeTab === tab.key
                  ? 'bg-zinc-800 text-zinc-100'
                  : 'text-zinc-500 hover:text-zinc-300'
              }`}
            >
              <tab.icon size={14} />
              {tab.label}
              {tab.count > 0 && (
                <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-zinc-700 text-zinc-400 font-mono">
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Infrastructure Tab */}
        {activeTab === 'infrastructure' && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-zinc-300">Infrastructure Profile</h2>
              <Button
                onClick={() => setShowAddForm(!showAddForm)}
                size="sm"
                className={showAddForm ? 'bg-zinc-700' : 'bg-emerald-600 hover:bg-emerald-700 text-white'}
              >
                <UilPlus size={14} className="mr-1" />
                {showAddForm ? 'Cancel' : 'Add Asset'}
              </Button>
            </div>

            <AnimatePresence>
              {showAddForm && (
                <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
                  <AddAssetForm onAdd={handleAddAsset} onCancel={() => setShowAddForm(false)} />
                </motion.div>
              )}
            </AnimatePresence>

            {assets.length === 0 && !loading ? (
              <Card className="bg-zinc-900/40 border-zinc-800 border-dashed">
                <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                  <UilRobot size={48} className="text-zinc-600 mb-3" />
                  <h3 className="text-sm font-medium text-zinc-400">No infrastructure assets yet</h3>
                  <p className="text-xs text-zinc-600 mt-1 max-w-sm">
                    Add your servers, services, and domains. Sentinel AI will auto-generate CPE strings
                    and match them against incoming CVEs to alert you about threats affecting YOUR stack.
                  </p>
                  <Button onClick={() => setShowAddForm(true)} size="sm" className="mt-4 bg-emerald-600 hover:bg-emerald-700 text-white gap-1">
                    <UilPlus size={14} /> Add First Asset
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-2">
                <AnimatePresence>
                  {assets.map(asset => (
                    <AssetCard
                      key={asset.id}
                      asset={asset}
                      onDelete={handleDeleteAsset}
                      expanded={expandedAsset === asset.id}
                      onToggle={() => setExpandedAsset(prev => prev === asset.id ? null : asset.id!)}
                    />
                  ))}
                </AnimatePresence>
              </div>
            )}
          </div>
        )}

        {/* Threats Tab */}
        {activeTab === 'threats' && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-zinc-300">Active Threat Actions</h2>
              <div className="flex items-center gap-2 text-xs text-zinc-500">
                <UilHeartRate size={14} className="text-emerald-500 animate-pulse" />
                Monitoring {stats.totalAssets} assets
              </div>
            </div>

            {threats.length === 0 ? (
              <Card className="bg-zinc-900/40 border-zinc-800 border-dashed">
                <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                  <UilShield size={48} className="text-emerald-600/40 mb-3" />
                  <h3 className="text-sm font-medium text-zinc-400">No active threats</h3>
                  <p className="text-xs text-zinc-600 mt-1">
                    When Sentinel detects CVEs matching your infrastructure, threat action cards will appear here.
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-2">
                {threats.map(threat => (
                  <ThreatCard
                    key={threat.id}
                    threat={threat}
                    onExecuteAction={handleExecuteAction}
                    onStatusChange={handleStatusChange}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {/* Scans Tab */}
        {activeTab === 'scans' && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-zinc-300">UilQrcodeScan History</h2>
            </div>

            {scans.length === 0 ? (
              <Card className="bg-zinc-900/40 border-zinc-800 border-dashed">
                <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                  <UilHistory size={48} className="text-zinc-600 mb-3" />
                  <h3 className="text-sm font-medium text-zinc-400">No scans yet</h3>
                  <p className="text-xs text-zinc-600 mt-1">
                    Sentinel will automatically scan your infrastructure for vulnerabilities. UilQrcodeScan results will appear here.
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-2">
                {scans.map(scan => (
                  <Card key={scan.id} className="bg-zinc-900/60 border-zinc-800">
                    <CardContent className="p-3 flex items-center gap-3">
                      <div className={`w-2 h-2 rounded-full ${scan.status === 'completed' ? 'bg-emerald-500' : scan.status === 'running' ? 'bg-blue-500 animate-pulse' : scan.status === 'failed' ? 'bg-red-500' : 'bg-zinc-500'}`} />
                      <div className="flex-1">
                        <div className="text-xs font-medium text-zinc-300 capitalize">{scan.scan_type.replace('_', ' ')} UilQrcodeScan</div>
                        <div className="text-[10px] text-zinc-500">{scan.targets?.join(', ')}</div>
                      </div>
                      {scan.new_threats !== undefined && scan.new_threats > 0 && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-red-500/10 text-red-400 font-mono">
                          {scan.new_threats} new threats
                        </span>
                      )}
                      {scan.duration_ms && (
                        <span className="text-[10px] text-zinc-500 font-mono">{(scan.duration_ms / 1000).toFixed(1)}s</span>
                      )}
                      <span className="text-[10px] text-zinc-600">
                        {scan.created_at ? new Date(scan.created_at).toLocaleString() : ''}
                      </span>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Sentinel Chat Tab */}
        {activeTab === 'chat' && (
          <div className="space-y-3">
            {/* AI Briefing */}
            <Card className="bg-zinc-900/60 border-zinc-800">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <UilShield size={16} className="text-red-400" />
                    Security Briefing
                  </CardTitle>
                  <Button
                    onClick={handleBriefing}
                    disabled={briefingLoading}
                    size="sm"
                    variant="outline"
                    className="gap-1.5"
                  >
                    {briefingLoading ? <UilSync size={12} className="animate-spin" /> : <UilBolt size={12} />}
                    {briefing ? 'Refresh' : 'Generate'}
                  </Button>
                </div>
              </CardHeader>
              {briefing && (
                <CardContent>
                  <div className="text-xs text-zinc-300 leading-relaxed whitespace-pre-wrap bg-zinc-800/30 rounded-lg p-3 border border-zinc-700/30">
                    {briefing}
                  </div>
                </CardContent>
              )}
            </Card>

            {/* Chat Area */}
            <Card className="bg-zinc-900/60 border-zinc-800">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <UilRobot size={16} className="text-cyan-400" />
                  Talk to Sentinel
                </CardTitle>
                <CardDescription className="text-xs">
                  Ask about threats, get remediation advice, or request reports
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {/* Suggested Questions */}
                {chatMessages.length === 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {suggestedQuestions.map((q, i) => (
                      <button
                        key={i}
                        onClick={() => { setChatInput(q); }}
                        className="text-[11px] px-2.5 py-1.5 rounded-full bg-zinc-800 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-700 transition-colors border border-zinc-700/50"
                      >
                        {q}
                      </button>
                    ))}
                  </div>
                )}

                {/* Messages */}
                {chatMessages.length > 0 && (
                  <div className="space-y-3 max-h-[400px] overflow-y-auto">
                    {chatMessages.map((msg, i) => (
                      <div key={i} className={`flex gap-2 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                        {msg.role === 'sentinel' && (
                          <div className="flex h-6 w-6 items-center justify-center rounded-md bg-red-500/10 shrink-0 mt-0.5">
                            <UilShield size={12} className="text-red-400" />
                          </div>
                        )}
                        <div className={`max-w-[80%] rounded-lg px-3 py-2 text-xs leading-relaxed ${
                          msg.role === 'user'
                            ? 'bg-blue-500/10 text-blue-200'
                            : 'bg-zinc-800/60 text-zinc-300 border border-zinc-700/30'
                        }`}>
                          <div className="whitespace-pre-wrap">{msg.content}</div>
                          <div className="text-[9px] text-zinc-600 mt-1">
                            {new Date(msg.timestamp).toLocaleTimeString()}
                          </div>
                        </div>
                      </div>
                    ))}
                    {chatLoading && (
                      <div className="flex gap-2">
                        <div className="flex h-6 w-6 items-center justify-center rounded-md bg-red-500/10 shrink-0">
                          <UilShield size={12} className="text-red-400 animate-pulse" />
                        </div>
                        <div className="bg-zinc-800/60 rounded-lg px-3 py-2 text-xs text-zinc-500 border border-zinc-700/30">
                          <span className="animate-pulse">Sentinel is thinking...</span>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Input */}
                <div className="flex gap-2">
                  <Input
                    value={chatInput}
                    onChange={e => setChatInput(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && !e.shiftKey && handleChatSend()}
                    placeholder="Ask Sentinel about your security posture..."
                    className="bg-zinc-800/50 border-zinc-700 text-sm flex-1"
                    disabled={chatLoading}
                  />
                  <Button
                    onClick={handleChatSend}
                    disabled={!chatInput.trim() || chatLoading}
                    size="sm"
                    className="bg-red-600 hover:bg-red-700 text-white"
                  >
                    {chatLoading ? <UilSync size={14} className="animate-spin" /> : <UilPlay size={14} />}
                  </Button>
                </div>

                {chatMessages.length > 0 && (
                  <button
                    onClick={() => { setChatMessages([]); sentinelAI.clearChat(); }}
                    className="text-[10px] text-zinc-600 hover:text-zinc-400 flex items-center gap-1"
                  >
                    <UilHistory size={10} /> Clear chat
                  </button>
                )}
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </ScrollArea>
  );
}
