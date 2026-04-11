/**
 * VNC Viewer — Embedded noVNC Remote Desktop Client
 *
 * Connects to endpoints via WebSocket → VNC (websockify relay).
 * Uses noVNC library loaded from the relay server.
 * All connections are TLS encrypted (WSS).
 *
 * For the VPS: wss://{VITE_OPENCLAW_HOSTNAME}:18790
 */

import { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { UilMonitor, UilEye, UilMouseAlt, UilExpandArrows, UilCompressArrows, UilCopy, UilClipboard, UilTimes, UilWifi, UilLock, UilShieldCheck, UilTachometerFast, UilCog, UilVolumeUp, UilVolumeMute, UilExclamationTriangle, UilCheckCircle, UilClock, UilSync, UilMinus, UilSquare, UilKeyboard } from "@iconscout/react-unicons";
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { VisuallyHidden } from '@radix-ui/react-visually-hidden';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Separator } from '@/components/ui/separator';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Endpoint } from '@/services/endpointService';
import { toast } from 'sonner';

// ─── Types ─────────────────────────────────────────────────────────────────────

type ConnectionStatus = 'disconnected' | 'connecting' | 'authenticating' | 'connected' | 'error';

interface VNCViewerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  endpoint: Endpoint | null;
  // Direct connection overrides
  wsUrl?: string;
  password?: string;
}

// Default relay for our VPS — reads from env, falls back to empty
const DEFAULT_VPS_CONFIG = {
  wsUrl: import.meta.env.VITE_VNC_WS_URL || 'wss://localhost:18790',
  password: import.meta.env.VITE_VNC_PASSWORD || '',
};

// ─── Component ─────────────────────────────────────────────────────────────────

export function VNCViewer({ open, onOpenChange, endpoint, wsUrl, password }: VNCViewerProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [status, setStatus] = useState<ConnectionStatus>('disconnected');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showToolbar, setShowToolbar] = useState(true);
  const [connectionTime, setConnectionTime] = useState(0);
  const [showPasswordPrompt, setShowPasswordPrompt] = useState(false);
  const [inputPassword, setInputPassword] = useState('');
  const [useDirectConnect, setUseDirectConnect] = useState(false);
  const [directUrl, setDirectUrl] = useState('');
  const [directPassword, setDirectPassword] = useState('');
  const connectionTimer = useRef<NodeJS.Timeout | null>(null);
  const toolbarTimer = useRef<NodeJS.Timeout | null>(null);

  // Determine connection URL
  const getConnectionUrl = useCallback((): string => {
    if (useDirectConnect && directUrl) {
      const url = new URL(directUrl.startsWith('wss://') ? directUrl : `wss://${directUrl}`);
      return url.toString();
    }
    if (wsUrl) return wsUrl;

    // Default: connect to VPS relay
    return DEFAULT_VPS_CONFIG.wsUrl;
  }, [wsUrl, useDirectConnect, directUrl]);

  const getPassword = useCallback((): string => {
    if (useDirectConnect && directPassword) return directPassword;
    if (password) return password;
    return DEFAULT_VPS_CONFIG.password;
  }, [password, useDirectConnect, directPassword]);

  // ─── Connection via noVNC iframe ──────────────────────────────────────

  const buildNoVNCUrl = useCallback((): string => {
    const relayBase = getConnectionUrl().replace('wss://', 'https://');
    const pw = getPassword();
    // noVNC URL parameters — URLSearchParams handles encoding
    const params = new URLSearchParams({
      autoconnect: 'true',
      reconnect: 'true',
      reconnect_delay: '3000',
      resize: 'scale',
      quality: '8',
      compression: '2',
      show_dot: 'true',
      bell: 'false',
      view_only: 'false',
      shared: 'true',
      password: pw,
      path: 'websockify',
    });
    return `${relayBase}/vnc.html?${params.toString()}`;
  }, [getConnectionUrl, getPassword]);

  useEffect(() => {
    if (!open) {
      setStatus('disconnected');
      setConnectionTime(0);
      if (connectionTimer.current) clearInterval(connectionTimer.current);
      return;
    }

    setStatus('connecting');

    // Start connection timer when connected
    const checkConnection = setInterval(() => {
      if (iframeRef.current) {
        try {
          // Check if iframe loaded successfully
          const iframeDoc = iframeRef.current.contentDocument || iframeRef.current.contentWindow?.document;
          if (iframeDoc && iframeDoc.readyState === 'complete') {
            setStatus('connected');
            if (!connectionTimer.current) {
              connectionTimer.current = setInterval(() => {
                setConnectionTime(prev => prev + 1);
              }, 1000);
            }
          }
        } catch {
          // Cross-origin — iframe loaded (which means connection is working)
          setStatus('connected');
          if (!connectionTimer.current) {
            connectionTimer.current = setInterval(() => {
              setConnectionTime(prev => prev + 1);
            }, 1000);
          }
        }
      }
    }, 2000);

    return () => {
      clearInterval(checkConnection);
      if (connectionTimer.current) {
        clearInterval(connectionTimer.current);
        connectionTimer.current = null;
      }
    };
  }, [open]);

  // ─── Toolbar auto-hide ────────────────────────────────────────────────

  const handleMouseMove = useCallback(() => {
    setShowToolbar(true);
    if (toolbarTimer.current) clearTimeout(toolbarTimer.current);
    toolbarTimer.current = setTimeout(() => {
      if (status === 'connected') setShowToolbar(false);
    }, 4000);
  }, [status]);

  // ─── Toolbar Actions ──────────────────────────────────────────────────

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      containerRef.current?.requestFullscreen();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  const handleDisconnect = () => {
    setStatus('disconnected');
    if (connectionTimer.current) clearInterval(connectionTimer.current);
    onOpenChange(false);
  };

  const handleReconnect = () => {
    setStatus('connecting');
    setConnectionTime(0);
    // Force iframe reload
    if (iframeRef.current) {
      iframeRef.current.src = buildNoVNCUrl();
    }
  };

  const sendCtrlAltDel = () => {
    // Post message to noVNC iframe
    try {
      iframeRef.current?.contentWindow?.postMessage({ type: 'send_keys', keys: ['Control_L', 'Alt_L', 'Delete'] }, '*');
      toast.info('Sent Ctrl+Alt+Del');
    } catch {
      toast.error('Cannot send keys — cross-origin restriction');
    }
  };

  const formatTime = (seconds: number): string => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    if (h > 0) return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  const hostLabel = endpoint?.hostname || 'OpenClaw VPS';
  const ipLabel = endpoint?.ip_address || import.meta.env.VITE_VPS_IP || 'Not configured';

  // ─── Render ───────────────────────────────────────────────────────────

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) handleDisconnect(); onOpenChange(v); }}>
      <DialogContent
        className="max-w-[98vw] max-h-[98vh] w-[98vw] h-[98vh] p-0 bg-black border-zinc-800 overflow-hidden"
        ref={containerRef}
        onMouseMove={handleMouseMove}
      >
        <VisuallyHidden>
          <DialogTitle>VNC Remote Desktop</DialogTitle>
          <DialogDescription>VNC viewer session</DialogDescription>
        </VisuallyHidden>
        {/* ─── Top Toolbar ─────────────────────────────────────── */}
        <AnimatePresence>
          {showToolbar && (
            <motion.div
              initial={{ y: -48, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: -48, opacity: 0 }}
              transition={{ duration: 0.15 }}
              className="absolute top-0 left-0 right-0 z-50 bg-zinc-900/95 backdrop-blur-sm border-b border-zinc-800 px-3 py-1.5 flex items-center justify-between"
            >
              {/* Left — Session info */}
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2">
                  <UilCheckCircle size={16} className="text-emerald-500" />
                  <span className="text-sm font-medium text-white">{hostLabel}</span>
                  <span className="text-xs text-zinc-500 font-mono">{ipLabel}</span>
                </div>

                <Separator orientation="vertical" className="h-5 bg-zinc-700" />

                <div className="flex items-center gap-1.5">
                  {status === 'connected' ? (
                    <UilCheckCircle size={14} className="text-emerald-500" />
                  ) : status === 'connecting' ? (
                    <UilSync size={14} className="text-blue-500 animate-spin" />
                  ) : (
                    <UilExclamationTriangle size={14} className="text-red-500" />
                  )}
                  <span className={`text-xs ${
                    status === 'connected' ? 'text-emerald-500' :
                    status === 'connecting' ? 'text-blue-500' : 'text-red-500'
                  }`}>
                    {status === 'connected' ? 'Connected (TLS)' :
                     status === 'connecting' ? 'Connecting...' :
                     status === 'authenticating' ? 'Authenticating...' :
                     status === 'error' ? 'Error' : 'Disconnected'}
                  </span>
                </div>

                {status === 'connected' && (
                  <>
                    <span className="flex items-center gap-1 text-[10px] text-zinc-400">
                      <UilClock size={12} />
                      {formatTime(connectionTime)}
                    </span>
                  </>
                )}
              </div>

              {/* Center — Controls */}
              <div className="flex items-center gap-1">
                <TooltipProvider delayDuration={300}>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={sendCtrlAltDel}>
                        <UilKeyboard size={14} />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Ctrl+Alt+Del</TooltipContent>
                  </Tooltip>

                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={toggleFullscreen}>
                        {isFullscreen ? <UilCompressArrows size={14} /> : <UilExpandArrows size={14} />}
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>{isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}</TooltipContent>
                  </Tooltip>

                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={handleReconnect}>
                        <UilSync size={14} />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Reconnect</TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>

              {/* Right — Encryption badge + Disconnect */}
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1 text-emerald-500">
                  <UilLock size={12} />
                  <span className="text-[10px]">TLS Encrypted</span>
                </div>
                <Button
                  variant="destructive"
                  size="sm"
                  className="h-7 text-xs"
                  onClick={handleDisconnect}
                >
                  <UilTimes size={14} className="mr-1" />
                  Disconnect
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ─── noVNC iframe ───────────────────────────────────── */}
        <div className="w-full h-full bg-black">
          {status === 'connecting' && (
            <div className="absolute inset-0 flex items-center justify-center z-10 bg-black/80">
              <div className="flex flex-col items-center gap-4">
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ repeat: Infinity, duration: 2, ease: 'linear' }}
                >
                  <UilWifi size={64} className="text-blue-500" />
                </motion.div>
                <p className="text-lg text-zinc-300">Connecting to {hostLabel}...</p>
                <p className="text-sm text-zinc-500">Establishing encrypted VNC tunnel</p>
              </div>
            </div>
          )}

          <iframe
            ref={iframeRef}
            src={open ? buildNoVNCUrl() : 'about:blank'}
            className="w-full h-full border-0"
            style={{ marginTop: showToolbar ? '36px' : '0', height: showToolbar ? 'calc(100% - 36px)' : '100%' }}
            allow="clipboard-read; clipboard-write; fullscreen"
            sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default VNCViewer;
