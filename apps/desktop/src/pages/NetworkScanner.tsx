/**
 * Network Map — Interactive infrastructure topology with nmap integration.
 *
 * Features:
 *  - ReactFlow canvas for drag-and-drop network topology
 *  - Custom device nodes (server, router, firewall, cloud, etc.)
 *  - nmap scanner integration — scan results auto-populate the map
 *  - Manual node creation/editing
 *  - Connection management
 *  - Save/load network maps
 *  - Layout algorithms (tree, radial, grid)
 */

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  ReactFlow, Controls, MiniMap, Background, BackgroundVariant,
  useNodesState, useEdgesState, addEdge, Panel,
  type Connection, type Edge, type Node, type NodeTypes,
  MarkerType, ConnectionMode,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Network, Server, Play, Square, Loader2, Terminal, Clock, Zap, Shield,
  AlertTriangle, Eye, Crosshair, Wifi, Filter, Plus, Trash2, Download,
  Upload, Layout, LayoutGrid, GitBranch, Copy, Search, Cpu,
  Lock, Unlock, ExternalLink, Map, Maximize2, ChevronRight, Save,
  FolderOpen, RotateCcw, Skull, Globe, Layers,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { DeviceNode } from '@/components/network/DeviceNode';
import { NodeEditor } from '@/components/network/NodeEditor';
import { type NetworkDevice, type DeviceType, type DevicePort, DEVICE_TYPES } from '@/components/network/types';

// ─── Node type registration ──────────────────────────────────────────────────

const nodeTypes: NodeTypes = {
  device: DeviceNode as any,
};

// ─── Scan profiles ───────────────────────────────────────────────────────────

interface ScanProfile {
  id: string;
  name: string;
  args: string;
  description: string;
  icon: React.ReactNode;
  color: string;
}

const SCAN_PROFILES: ScanProfile[] = [
  { id: 'quick', name: 'Quick', args: '-T4 -F --open', description: 'Top 100 ports, fast', icon: <Zap className="h-3.5 w-3.5" />, color: 'text-green-400' },
  { id: 'top1000', name: 'Top 1000', args: '-T4 --top-ports 1000 --open', description: 'Top 1000 ports', icon: <Network className="h-3.5 w-3.5" />, color: 'text-blue-400' },
  { id: 'service', name: 'Services', args: '-sV -sC -T4 --open', description: 'Version + scripts', icon: <Server className="h-3.5 w-3.5" />, color: 'text-cyan-400' },
  { id: 'stealth', name: 'Stealth', args: '-sS -T2 --open', description: 'SYN scan, slow', icon: <Eye className="h-3.5 w-3.5" />, color: 'text-purple-400' },
  { id: 'vuln', name: 'Vuln Scan', args: '-sV --script vuln -T4', description: 'NSE vuln scripts', icon: <AlertTriangle className="h-3.5 w-3.5" />, color: 'text-red-400' },
  { id: 'full', name: 'Full', args: '-p- -sV -sC -T4 --open', description: 'All 65535 ports', icon: <Shield className="h-3.5 w-3.5" />, color: 'text-yellow-400' },
  { id: 'ping', name: 'Ping Sweep', args: '-sn', description: 'Host discovery', icon: <Crosshair className="h-3.5 w-3.5" />, color: 'text-emerald-400' },
  { id: 'os', name: 'OS Detect', args: '-O -sV -T4 --open', description: 'OS fingerprinting', icon: <Terminal className="h-3.5 w-3.5" />, color: 'text-pink-400' },
  { id: 'custom', name: 'Custom', args: '', description: 'Your flags', icon: <Filter className="h-3.5 w-3.5" />, color: 'text-gray-400' },
];

// ─── nmap parser ─────────────────────────────────────────────────────────────

interface ParsedHost {
  ip: string;
  hostname?: string;
  state: string;
  os?: string;
  ports: DevicePort[];
  latency?: string;
  mac?: string;
  vendor?: string;
}

function parseNmapOutput(raw: string): ParsedHost[] {
  const hosts: ParsedHost[] = [];
  const hostBlocks = raw.split(/Nmap scan report for /);

  for (let i = 1; i < hostBlocks.length; i++) {
    const block = hostBlocks[i];
    const lines = block.split('\n');

    const headerLine = lines[0];
    let ip = '', hostname = '';
    const ipMatch = headerLine.match(/(\d+\.\d+\.\d+\.\d+)/);
    const hostMatch = headerLine.match(/^([^\s(]+)/);
    if (ipMatch) ip = ipMatch[1];
    if (hostMatch && hostMatch[1] !== ip) hostname = hostMatch[1];
    if (!ip && hostMatch) ip = hostMatch[1];

    const hostState = block.includes('Host is up') ? 'up' : 'down';
    const latencyMatch = block.match(/latency[:\s]*([0-9.]+s)/i) || block.match(/\(([0-9.]+s) latency\)/);
    const osMatch = block.match(/OS details?:\s*(.+)/i) || block.match(/Running:\s*(.+)/i);
    const macMatch = block.match(/MAC Address:\s*([0-9A-F:]+)\s*\(([^)]*)\)/i);

    const ports: DevicePort[] = [];
    const portRegex = /^(\d+)\/(tcp|udp)\s+(open|closed|filtered|open\|filtered)\s+(\S+)\s*(.*)/;
    for (const line of lines) {
      const m = line.trim().match(portRegex);
      if (m) {
        let version = m[5]?.trim() || '';
        version = version.replace(/^(syn-ack|rst|no-response|conn-refused)\s+(ttl\s+\d+\s*)?/i, '').trim();
        ports.push({ port: parseInt(m[1]), protocol: m[2], state: m[3], service: m[4], version });
      }
    }

    if (ip) {
      hosts.push({
        ip, hostname: hostname || undefined, state: hostState,
        os: osMatch?.[1]?.trim(), ports, latency: latencyMatch?.[1],
        mac: macMatch?.[1], vendor: macMatch?.[2],
      });
    }
  }
  return hosts;
}

// ─── Infer device type from scan data ────────────────────────────────────────

function inferDeviceType(host: ParsedHost): DeviceType {
  const services = host.ports.map(p => p.service.toLowerCase()).join(' ');
  const versions = host.ports.map(p => (p.version || '').toLowerCase()).join(' ');
  const os = (host.os || '').toLowerCase();
  const portNums = host.ports.map(p => p.port);

  if (services.includes('mysql') || services.includes('postgres') || services.includes('mongo') ||
      services.includes('redis') || services.includes('oracle') || services.includes('mssql'))
    return 'database';
  if (services.includes('docker') || portNums.includes(2375) || portNums.includes(2376))
    return 'container';
  if (services.includes('snmp') || services.includes('bgp') || os.includes('cisco') ||
      os.includes('junos') || os.includes('routeros') || os.includes('vyos'))
    return 'router';
  if (os.includes('fortinet') || os.includes('pfsense') || os.includes('palo alto') ||
      services.includes('fortinet'))
    return 'firewall';
  if (services.includes('printer') || services.includes('jetdirect') || portNums.includes(9100))
    return 'printer';
  if (services.includes('openvpn') || services.includes('wireguard') || portNums.includes(1194))
    return 'vpn';
  if (portNums.includes(80) || portNums.includes(443) || portNums.includes(8080) ||
      portNums.includes(8443) || services.includes('http'))
    return 'server';
  if (portNums.includes(22) || portNums.includes(3389))
    return os.includes('windows') ? 'workstation' : 'server';
  return 'unknown';
}

// ─── Layout algorithms ───────────────────────────────────────────────────────

function layoutNodes(nodes: Node[], style: 'grid' | 'tree' | 'radial'): Node[] {
  if (nodes.length === 0) return nodes;

  const spacing = { x: 280, y: 200 };

  if (style === 'grid') {
    const cols = Math.ceil(Math.sqrt(nodes.length));
    return nodes.map((node, i) => ({
      ...node,
      position: { x: (i % cols) * spacing.x, y: Math.floor(i / cols) * spacing.y },
    }));
  }

  if (style === 'tree') {
    // Simple top-down tree
    const cols = Math.max(3, Math.ceil(nodes.length / 3));
    return nodes.map((node, i) => ({
      ...node,
      position: {
        x: (i % cols) * spacing.x + (Math.floor(i / cols) % 2 === 1 ? spacing.x / 2 : 0),
        y: Math.floor(i / cols) * spacing.y,
      },
    }));
  }

  if (style === 'radial') {
    const centerX = 400;
    const centerY = 300;
    if (nodes.length === 1) return [{ ...nodes[0], position: { x: centerX, y: centerY } }];

    // First node at center, rest in circles
    const result = [{ ...nodes[0], position: { x: centerX, y: centerY } }];
    const remaining = nodes.slice(1);
    const rings = Math.ceil(remaining.length / 8);

    remaining.forEach((node, i) => {
      const ring = Math.floor(i / 8) + 1;
      const posInRing = i % 8;
      const totalInThisRing = Math.min(8, remaining.length - Math.floor(i / 8) * 8);
      const angle = (posInRing / totalInThisRing) * Math.PI * 2 - Math.PI / 2;
      const radius = ring * 250;
      result.push({
        ...node,
        position: { x: centerX + Math.cos(angle) * radius, y: centerY + Math.sin(angle) * radius },
      });
    });
    return result;
  }

  return nodes;
}

// ─── Default map with our infra ──────────────────────────────────────────────

function createDefaultNodes(): Node[] {
  return [
    {
      id: 'internet', type: 'device', position: { x: 350, y: 0 },
      data: { id: 'internet', type: 'internet', label: 'Internet', status: 'up', ports: [], tags: ['wan'] } as NetworkDevice,
    },
    {
      id: 'vpn', type: 'device', position: { x: 350, y: 180 },
      data: { id: 'vpn', type: 'vpn', label: 'NordVPN', ip: '185.193.64.167', status: 'up', ports: [], tags: ['tunnel', 'encrypted'], notes: 'Montreal exit node' } as NetworkDevice,
    },
    {
      id: 'attacker', type: 'device', position: { x: 150, y: 360 },
      data: { id: 'attacker', type: 'attacker', label: 'CrowByte', ip: '10.5.0.2', status: 'up', ports: [], os: 'Kali Linux 2025', tags: ['us', 'local'] } as NetworkDevice,
    },
    {
      id: 'vps', type: 'device', position: { x: 550, y: 360 },
      data: {
        id: 'vps', type: 'server', label: 'OpenClaw VPS', ip: import.meta.env.VITE_VPS_IP || '0.0.0.0',
        hostname: import.meta.env.VITE_OPENCLAW_HOSTNAME || 'vps.example.com', os: 'Ubuntu 24.04', status: 'up',
        ports: [
          { port: 22, protocol: 'tcp', state: 'open', service: 'ssh' },
          { port: 18789, protocol: 'tcp', state: 'open', service: 'gateway' },
          { port: 18790, protocol: 'tcp', state: 'open', service: 'vnc-ws' },
          { port: 19990, protocol: 'tcp', state: 'open', service: 'nvidia-proxy' },
        ],
        tags: ['vps', 'agents', 'docker'],
      } as NetworkDevice,
    },
  ];
}

function createDefaultEdges(): Edge[] {
  return [
    {
      id: 'e-internet-vpn', source: 'internet', target: 'vpn',
      animated: true, style: { stroke: '#22c55e' },
      markerEnd: { type: MarkerType.ArrowClosed, color: '#22c55e' },
      label: 'WireGuard',
    },
    {
      id: 'e-vpn-attacker', source: 'vpn', target: 'attacker',
      animated: true, style: { stroke: '#22c55e' },
      markerEnd: { type: MarkerType.ArrowClosed, color: '#22c55e' },
      label: 'Encrypted Tunnel',
    },
    {
      id: 'e-vpn-vps', source: 'vpn', target: 'vps',
      animated: true, style: { stroke: '#3b82f6' },
      markerEnd: { type: MarkerType.ArrowClosed, color: '#3b82f6' },
      label: 'WSS/SSH',
    },
  ];
}

// ─── Main Component ──────────────────────────────────────────────────────────

export default function NetworkScanner() {
  const { toast } = useToast();

  // ReactFlow state
  const [nodes, setNodes, onNodesChange] = useNodesState(createDefaultNodes());
  const [edges, setEdges, onEdgesChange] = useEdgesState(createDefaultEdges());

  // Editor state
  const [selectedNode, setSelectedNode] = useState<NetworkDevice | null>(null);
  const [showEditor, setShowEditor] = useState(false);
  const [isNewNode, setIsNewNode] = useState(false);
  const [activeTab, setActiveTab] = useState<'map' | 'scanner' | 'raw'>('map');
  const [layoutStyle, setLayoutStyle] = useState<'grid' | 'tree' | 'radial'>('tree');
  const [mapName, setMapName] = useState('Network Map');

  // Scanner state
  const [target, setTarget] = useState('');
  const [customArgs, setCustomArgs] = useState('');
  const [selectedProfile, setSelectedProfile] = useState('quick');
  const [isScanning, setIsScanning] = useState(false);
  const [rawOutput, setRawOutput] = useState('');
  const [scanStartTime, setScanStartTime] = useState<number | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const outputRef = useRef<HTMLPreElement>(null);

  // Timer
  useEffect(() => {
    if (!isScanning || !scanStartTime) return;
    const timer = setInterval(() => setElapsed(Math.floor((Date.now() - scanStartTime) / 1000)), 1000);
    return () => clearInterval(timer);
  }, [isScanning, scanStartTime]);

  // Auto-scroll raw output
  useEffect(() => {
    if (outputRef.current) outputRef.current.scrollTop = outputRef.current.scrollHeight;
  }, [rawOutput]);

  const profile = SCAN_PROFILES.find(p => p.id === selectedProfile) || SCAN_PROFILES[0];

  // ─── ReactFlow handlers ──────────────────────────────────────────────

  const onConnect = useCallback((connection: Connection) => {
    setEdges(eds => addEdge({
      ...connection,
      animated: true,
      style: { stroke: '#6366f1' },
      markerEnd: { type: MarkerType.ArrowClosed, color: '#6366f1' },
    }, eds));
  }, [setEdges]);

  const onNodeClick = useCallback((_: React.MouseEvent, node: Node) => {
    const device = node.data as NetworkDevice;
    setSelectedNode(device);
    setIsNewNode(false);
    setShowEditor(true);
  }, []);

  const onPaneClick = useCallback(() => {
    setShowEditor(false);
    setSelectedNode(null);
  }, []);

  // ─── Node CRUD ───────────────────────────────────────────────────────

  const handleAddNode = () => {
    setSelectedNode(null);
    setIsNewNode(true);
    setShowEditor(true);
  };

  const handleSaveNode = (device: NetworkDevice) => {
    if (isNewNode) {
      const newNode: Node = {
        id: device.id,
        type: 'device',
        position: { x: 200 + Math.random() * 400, y: 100 + Math.random() * 300 },
        data: device,
      };
      setNodes(nds => [...nds, newNode]);
      toast({ title: 'Device added', description: device.label });
    } else {
      setNodes(nds => nds.map(n => n.id === device.id ? { ...n, data: device } : n));
      toast({ title: 'Device updated', description: device.label });
    }
    setShowEditor(false);
  };

  const handleDeleteNode = (id: string) => {
    setNodes(nds => nds.filter(n => n.id !== id));
    setEdges(eds => eds.filter(e => e.source !== id && e.target !== id));
    setShowEditor(false);
    toast({ title: 'Device removed' });
  };

  // ─── Layout ──────────────────────────────────────────────────────────

  const applyLayout = (style: 'grid' | 'tree' | 'radial') => {
    setLayoutStyle(style);
    setNodes(nds => layoutNodes(nds, style));
  };

  // ─── Scan ────────────────────────────────────────────────────────────

  const runScan = useCallback(async () => {
    if (!target.trim()) {
      toast({ title: 'No target', description: 'Enter an IP, hostname, or CIDR', variant: 'destructive' });
      return;
    }

    setIsScanning(true);
    setRawOutput('');
    setScanStartTime(Date.now());
    setElapsed(0);
    setActiveTab('raw');

    try {
      if (window.electronAPI?.executeCommand) {
        const args = selectedProfile === 'custom' ? customArgs : profile.args;
        const result = await window.electronAPI.executeCommand(`nmap ${args} ${target.trim()} 2>&1`);
        const output = result || '';
        setRawOutput(output);

        // Parse and add to map
        const hosts = parseNmapOutput(output);
        if (hosts.length > 0) {
          addHostsToMap(hosts);
          toast({ title: 'Scan complete', description: `${hosts.length} host(s) added to map` });
          setActiveTab('map');
        } else {
          toast({ title: 'Scan complete', description: 'No hosts found' });
        }
      } else {
        setRawOutput('Error: Electron API not available. Run in desktop app.');
      }
    } catch (error) {
      setRawOutput(`Error: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setIsScanning(false);
    }
  }, [target, selectedProfile, customArgs, profile, toast]);

  // ─── Add scan results to map ─────────────────────────────────────────

  const addHostsToMap = (hosts: ParsedHost[]) => {
    const existingIPs = new Set(nodes.map(n => (n.data as NetworkDevice).ip));
    const newNodes: Node[] = [];

    hosts.forEach((host, index) => {
      if (existingIPs.has(host.ip)) {
        // Update existing node
        setNodes(nds => nds.map(n => {
          const d = n.data as NetworkDevice;
          if (d.ip === host.ip) {
            return {
              ...n,
              data: {
                ...d,
                status: host.state === 'up' ? 'up' : 'down',
                hostname: host.hostname || d.hostname,
                os: host.os || d.os,
                mac: host.mac || d.mac,
                vendor: host.vendor || d.vendor,
                ports: host.ports.length > 0 ? host.ports : d.ports,
                type: host.ports.length > 0 ? inferDeviceType(host) : d.type,
              } as NetworkDevice,
            };
          }
          return n;
        }));
        return;
      }

      const deviceType = inferDeviceType(host);
      const device: NetworkDevice = {
        id: `scan-${host.ip.replace(/\./g, '-')}-${Date.now()}`,
        type: deviceType,
        label: host.hostname || host.ip,
        ip: host.ip,
        hostname: host.hostname,
        os: host.os,
        mac: host.mac,
        vendor: host.vendor,
        status: host.state === 'up' ? 'up' : 'down',
        ports: host.ports,
        tags: ['scanned'],
      };

      newNodes.push({
        id: device.id,
        type: 'device',
        position: { x: 100 + (index % 5) * 250, y: 400 + Math.floor(index / 5) * 200 },
        data: device,
      });
    });

    if (newNodes.length > 0) {
      setNodes(nds => {
        const all = [...nds, ...newNodes];
        return layoutNodes(all, layoutStyle);
      });

      // Auto-connect new nodes to internet or first router
      const routerNode = nodes.find(n => (n.data as NetworkDevice).type === 'router');
      const connectTo = routerNode?.id || 'internet';
      const newEdges: Edge[] = newNodes.map(n => ({
        id: `e-${connectTo}-${n.id}`,
        source: connectTo,
        target: n.id,
        animated: false,
        style: { stroke: '#52525b' },
        markerEnd: { type: MarkerType.ArrowClosed, color: '#52525b' },
      }));
      setEdges(eds => [...eds, ...newEdges]);
    }
  };

  // ─── Save / Load ─────────────────────────────────────────────────────

  const saveMap = () => {
    const data = {
      name: mapName,
      nodes: nodes.map(n => ({ ...n, data: n.data })),
      edges,
      savedAt: new Date().toISOString(),
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${mapName.replace(/\s+/g, '-').toLowerCase()}-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast({ title: 'Map saved', description: a.download });
  };

  const loadMap = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      try {
        const text = await file.text();
        const data = JSON.parse(text);
        if (data.nodes && data.edges) {
          setNodes(data.nodes);
          setEdges(data.edges);
          setMapName(data.name || 'Imported Map');
          toast({ title: 'Map loaded', description: `${data.nodes.length} devices` });
        }
      } catch {
        toast({ title: 'Invalid file', variant: 'destructive' });
      }
    };
    input.click();
  };

  const clearMap = () => {
    setNodes(createDefaultNodes());
    setEdges(createDefaultEdges());
    toast({ title: 'Map reset' });
  };

  // ─── Stats ───────────────────────────────────────────────────────────

  const deviceCount = nodes.length;
  const upCount = nodes.filter(n => (n.data as NetworkDevice).status === 'up').length;
  const totalPorts = nodes.reduce((sum, n) => sum + ((n.data as NetworkDevice).ports?.length || 0), 0);
  const connectionCount = edges.length;

  const formatElapsed = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return m > 0 ? `${m}m ${sec}s` : `${sec}s`;
  };

  // ─── Render ──────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)] animate-fade-in">
      {/* Top bar */}
      <div className="shrink-0 space-y-2 px-1 pb-2">
        {/* Title + stats */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Map className="h-5 w-5 text-primary" />
            <span className="text-lg font-bold text-white">Network Map</span>
            <Separator orientation="vertical" className="h-5 bg-zinc-700" />
            <div className="flex items-center gap-3 text-[11px]">
              <span className="text-zinc-400"><Server className="h-3 w-3 inline mr-1" />{deviceCount} devices</span>
              <span className="text-green-400">{upCount} up</span>
              <span className="text-cyan-400"><Unlock className="h-3 w-3 inline mr-1" />{totalPorts} ports</span>
              <span className="text-zinc-500"><GitBranch className="h-3 w-3 inline mr-1" />{connectionCount} links</span>
            </div>
          </div>

          <div className="flex items-center gap-1">
            {/* Layout buttons */}
            <Button variant="ghost" size="sm" className={`h-7 text-[10px] gap-1 ${layoutStyle === 'tree' ? 'bg-primary/10' : ''}`}
              onClick={() => applyLayout('tree')} title="Tree layout">
              <GitBranch className="h-3 w-3" /> Tree
            </Button>
            <Button variant="ghost" size="sm" className={`h-7 text-[10px] gap-1 ${layoutStyle === 'grid' ? 'bg-primary/10' : ''}`}
              onClick={() => applyLayout('grid')} title="Grid layout">
              <LayoutGrid className="h-3 w-3" /> Grid
            </Button>
            <Button variant="ghost" size="sm" className={`h-7 text-[10px] gap-1 ${layoutStyle === 'radial' ? 'bg-primary/10' : ''}`}
              onClick={() => applyLayout('radial')} title="Radial layout">
              <Layout className="h-3 w-3" /> Radial
            </Button>

            <Separator orientation="vertical" className="h-5 bg-zinc-700 mx-1" />

            <Button variant="ghost" size="sm" className="h-7 text-[10px] gap-1" onClick={handleAddNode}>
              <Plus className="h-3 w-3" /> Add Device
            </Button>
            <Button variant="ghost" size="sm" className="h-7 text-[10px] gap-1" onClick={saveMap}>
              <Download className="h-3 w-3" /> Save
            </Button>
            <Button variant="ghost" size="sm" className="h-7 text-[10px] gap-1" onClick={loadMap}>
              <Upload className="h-3 w-3" /> Load
            </Button>
            <Button variant="ghost" size="sm" className="h-7 text-[10px] gap-1 text-zinc-500" onClick={clearMap}>
              <RotateCcw className="h-3 w-3" /> Reset
            </Button>
          </div>
        </div>

        {/* Scan bar (inline) */}
        <div className="flex gap-2 items-center">
          <div className="flex-1 flex gap-1.5">
            <Input
              placeholder="Scan target — IP, hostname, CIDR (e.g. 192.168.1.0/24)"
              value={target}
              onChange={e => setTarget(e.target.value)}
              disabled={isScanning}
              className="font-mono text-xs h-8 bg-zinc-900/50 max-w-sm"
              onKeyDown={e => { if (e.key === 'Enter' && !isScanning) runScan(); }}
            />
            <Select value={selectedProfile} onValueChange={setSelectedProfile}>
              <SelectTrigger className="w-28 h-8 text-[11px] bg-zinc-900/50">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {SCAN_PROFILES.map(p => (
                  <SelectItem key={p.id} value={p.id} className="text-xs">
                    <span className={p.color}>{p.name}</span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {selectedProfile === 'custom' && (
              <Input
                placeholder="Custom flags..."
                value={customArgs}
                onChange={e => setCustomArgs(e.target.value)}
                className="font-mono text-xs h-8 bg-zinc-900/50 max-w-xs"
              />
            )}
            <Button
              onClick={runScan}
              disabled={isScanning}
              size="sm"
              className="h-8 gap-1.5 min-w-[90px]"
            >
              {isScanning ? (
                <><Loader2 className="h-3 w-3 animate-spin" /> {formatElapsed(elapsed)}</>
              ) : (
                <><Play className="h-3 w-3" /> Scan</>
              )}
            </Button>
            {isScanning && (
              <Button variant="destructive" size="sm" className="h-8 w-8 p-0" onClick={() => setIsScanning(false)}>
                <Square className="h-3 w-3" />
              </Button>
            )}
          </div>

          {/* Tab switches */}
          <div className="flex items-center gap-0.5 bg-zinc-900/50 rounded-md p-0.5">
            <Button variant={activeTab === 'map' ? 'default' : 'ghost'} size="sm"
              className="h-7 text-[10px] gap-1 px-2" onClick={() => setActiveTab('map')}>
              <Map className="h-3 w-3" /> Map
            </Button>
            <Button variant={activeTab === 'scanner' ? 'default' : 'ghost'} size="sm"
              className="h-7 text-[10px] gap-1 px-2" onClick={() => setActiveTab('scanner')}>
              <Network className="h-3 w-3" /> Devices
            </Button>
            <Button variant={activeTab === 'raw' ? 'default' : 'ghost'} size="sm"
              className="h-7 text-[10px] gap-1 px-2" onClick={() => setActiveTab('raw')}>
              <Terminal className="h-3 w-3" /> Output
            </Button>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 overflow-hidden flex">
        <div className="flex-1 overflow-hidden">
          {/* Map view */}
          {activeTab === 'map' && (
            <div className="h-full w-full" style={{ background: '#09090b' }}>
              <ReactFlow
                nodes={nodes}
                edges={edges}
                onNodesChange={onNodesChange}
                onEdgesChange={onEdgesChange}
                onConnect={onConnect}
                onNodeClick={onNodeClick}
                onPaneClick={onPaneClick}
                nodeTypes={nodeTypes}
                connectionMode={ConnectionMode.Loose}
                fitView
                fitViewOptions={{ padding: 0.2 }}
                defaultEdgeOptions={{
                  animated: false,
                  style: { stroke: '#3f3f46', strokeWidth: 1.5 },
                  markerEnd: { type: MarkerType.ArrowClosed, color: '#3f3f46' },
                }}
                proOptions={{ hideAttribution: true }}
              >
                <Controls className="!bg-zinc-900 !border-zinc-700 !rounded-lg [&>button]:!bg-zinc-800 [&>button]:!border-zinc-700 [&>button]:!text-zinc-300 [&>button:hover]:!bg-zinc-700" />
                <MiniMap
                  className="!bg-zinc-900 !border-zinc-700 !rounded-lg"
                  nodeColor={(node) => {
                    const d = node.data as NetworkDevice;
                    return d.status === 'up' ? '#22c55e' : d.status === 'down' ? '#ef4444' : '#71717a';
                  }}
                  maskColor="rgba(0,0,0,0.7)"
                />
                <Background variant={BackgroundVariant.Dots} gap={20} size={1} color="#27272a" />

                {/* Floating legend */}
                <Panel position="bottom-left" className="!m-3">
                  <div className="bg-zinc-900/90 backdrop-blur-sm border border-zinc-800 rounded-lg px-3 py-2">
                    <p className="text-[10px] text-zinc-500 mb-1.5 font-medium">DEVICE TYPES</p>
                    <div className="grid grid-cols-4 gap-x-4 gap-y-1">
                      {(['server', 'router', 'firewall', 'database', 'cloud', 'container', 'workstation', 'attacker'] as DeviceType[]).map(t => (
                        <div key={t} className="flex items-center gap-1.5">
                          <div className={`w-2 h-2 rounded-sm ${DEVICE_TYPES[t].bgColor} border ${DEVICE_TYPES[t].borderColor}`} />
                          <span className={`text-[9px] ${DEVICE_TYPES[t].color}`}>{DEVICE_TYPES[t].label}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </Panel>
              </ReactFlow>
            </div>
          )}

          {/* Device list view */}
          {activeTab === 'scanner' && (
            <ScrollArea className="h-full">
              <div className="p-3 space-y-2">
                {nodes.length === 0 ? (
                  <div className="flex items-center justify-center h-60">
                    <div className="text-center space-y-2">
                      <Network className="h-10 w-10 mx-auto text-zinc-700" />
                      <p className="text-sm text-zinc-500">No devices on map</p>
                      <p className="text-xs text-zinc-600">Run a scan or add devices manually</p>
                    </div>
                  </div>
                ) : (
                  <div className="grid gap-2">
                    {nodes.map(node => {
                      const d = node.data as NetworkDevice;
                      const meta = DEVICE_TYPES[d.type] || DEVICE_TYPES.unknown;
                      return (
                        <div
                          key={node.id}
                          className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all hover:brightness-110 ${meta.bgColor} ${meta.borderColor}`}
                          onClick={() => { setSelectedNode(d); setIsNewNode(false); setShowEditor(true); }}
                        >
                          <div className={`w-2 h-2 rounded-full ${d.status === 'up' ? 'bg-green-400' : d.status === 'down' ? 'bg-red-400' : 'bg-zinc-500'}`} />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-semibold text-white">{d.label}</span>
                              <Badge variant="outline" className={`text-[9px] h-4 px-1 ${meta.color} ${meta.borderColor}`}>{meta.label}</Badge>
                            </div>
                            <div className="flex items-center gap-3 mt-0.5">
                              {d.ip && <span className="text-[11px] font-mono text-zinc-400">{d.ip}</span>}
                              {d.os && <span className="text-[10px] text-blue-400/70">{d.os}</span>}
                            </div>
                          </div>
                          <div className="flex items-center gap-2 text-[10px] text-zinc-500">
                            {d.ports.length > 0 && (
                              <Badge variant="outline" className="text-[9px] h-4">{d.ports.filter(p => p.state === 'open').length} ports</Badge>
                            )}
                            <ChevronRight className="h-3 w-3" />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </ScrollArea>
          )}

          {/* Raw output view */}
          {activeTab === 'raw' && (
            <div className="h-full relative p-2">
              <pre
                ref={outputRef}
                className="absolute inset-2 bg-[#0c0c0c] border border-zinc-800 rounded-lg p-3 overflow-auto text-xs font-mono text-green-400/80 whitespace-pre-wrap leading-relaxed"
              >
                {rawOutput || (isScanning ? 'Waiting for nmap output...\n' : 'Run a scan to see raw output here.\nResults will auto-populate the network map.')}
              </pre>
              {rawOutput && (
                <Button
                  variant="ghost" size="sm"
                  className="absolute top-4 right-4 h-6 text-[10px] gap-1 bg-black/50 z-10"
                  onClick={() => { navigator.clipboard.writeText(rawOutput); toast({ title: 'Copied' }); }}
                >
                  <Copy className="h-2.5 w-2.5" /> Copy
                </Button>
              )}
            </div>
          )}
        </div>

        {/* Right sidebar — Node editor */}
        {showEditor && (
          <NodeEditor
            device={selectedNode}
            isNew={isNewNode}
            onSave={handleSaveNode}
            onDelete={handleDeleteNode}
            onClose={() => setShowEditor(false)}
          />
        )}
      </div>
    </div>
  );
}
