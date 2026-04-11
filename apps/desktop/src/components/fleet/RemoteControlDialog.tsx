/**
 * Remote Control Dialog — Full AnyDesk/TeamViewer-like remote desktop viewer
 *
 * Embedded in Fleet Management. E2E encrypted screen sharing + input control.
 * Renders inside a full-screen dialog with toolbar for session management.
 */

import { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { UilMonitor, UilEye, UilMouseAlt, UilExpandArrows, UilCompressArrows, UilCopy, UilClipboard, UilPlaneFly, UilFolderOpen, UilCog, UilTimes, UilWifi, UilLock, UilShield, UilShieldCheck, UilHistory, UilBolt, UilTachometerFast, UilExclamationTriangle, UilCheckCircle, UilClock, UilDownloadAlt, UilUpload, UilCommentDots, UilVideo, UilStopCircle, UilKeyboard } from "@iconscout/react-unicons";
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { VisuallyHidden } from '@radix-ui/react-visually-hidden';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Separator } from '@/components/ui/separator';
import { remoteControl, RemoteSession, RemotePermission, FrameData, InputEvent, SessionStatus } from '@/services/remote-control';
import { Endpoint } from '@/services/endpointService';
import { toast } from 'sonner';

interface RemoteControlDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  endpoint: Endpoint | null;
}

export function RemoteControlDialog({ open, onOpenChange, endpoint }: RemoteControlDialogProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [session, setSession] = useState<RemoteSession | null>(null);
  const [status, setStatus] = useState<SessionStatus>('requesting');
  const [permission, setPermission] = useState<RemotePermission>('shared_control');
  const [latency, setLatency] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [showToolbar, setShowToolbar] = useState(true);
  const [quality, setQuality] = useState<'low' | 'medium' | 'high' | 'lossless'>('high');
  const [bytesTransferred, setBytesTransferred] = useState(0);
  const [connectionTime, setConnectionTime] = useState(0);
  const [cursorPos, setCursorPos] = useState({ x: 0, y: 0 });
  const frameSequence = useRef(0);
  const connectionTimer = useRef<NodeJS.Timeout | null>(null);

  // ─── Initialize Session ────────────────────────────────────────────────

  useEffect(() => {
    if (!open || !endpoint) return;

    const initSession = async () => {
      try {
        const sess = await remoteControl.requestSession({
          endpointId: endpoint.id,
          hostname: endpoint.hostname,
          ip: endpoint.ip_address,
          permission,
        });
        setSession(sess);
      } catch (error: any) {
        toast.error('Failed to initiate remote session', { description: error.message });
        onOpenChange(false);
      }
    };

    initSession();

    return () => {
      remoteControl.disconnect();
      if (connectionTimer.current) clearInterval(connectionTimer.current);
    };
  }, [open, endpoint]);

  // ─── Event Listeners ───────────────────────────────────────────────────

  useEffect(() => {
    const onStatus = (_: string, data: { status: SessionStatus }) => {
      setStatus(data.status);
      if (data.status === 'connected') {
        connectionTimer.current = setInterval(() => {
          setConnectionTime(prev => prev + 1);
        }, 1000);
      }
    };

    const onFrame = (_: string, frame: FrameData) => {
      renderFrame(frame);
      setBytesTransferred(remoteControl.getSession()?.bytesTransferred || 0);
    };

    const onLatency = (_: string, data: { latency: number }) => {
      setLatency(data.latency);
    };

    const onConsentApproved = () => {
      toast.success('Remote access approved', { description: `${endpoint?.hostname} accepted the connection` });
    };

    const onConsentDenied = (_: string, data: { reason: string }) => {
      toast.error('Remote access denied', { description: data.reason || 'The user declined the connection' });
      onOpenChange(false);
    };

    const onError = (_: string, data: { message: string }) => {
      toast.error('Remote control error', { description: data.message });
    };

    const onEnded = (_: string, data: { reason: string }) => {
      toast.info('Session ended', { description: data.reason });
      if (connectionTimer.current) clearInterval(connectionTimer.current);
    };

    const onCursor = (_: string, data: { x: number; y: number }) => {
      setCursorPos(data);
    };

    remoteControl.on('session:status', onStatus);
    remoteControl.on('frame:received', onFrame);
    remoteControl.on('session:latency', onLatency);
    remoteControl.on('consent:approved', onConsentApproved);
    remoteControl.on('consent:denied', onConsentDenied);
    remoteControl.on('error', onError);
    remoteControl.on('session:ended', onEnded);
    remoteControl.on('cursor:update', onCursor);

    return () => {
      remoteControl.off('session:status', onStatus);
      remoteControl.off('frame:received', onFrame);
      remoteControl.off('session:latency', onLatency);
      remoteControl.off('consent:approved', onConsentApproved);
      remoteControl.off('consent:denied', onConsentDenied);
      remoteControl.off('error', onError);
      remoteControl.off('session:ended', onEnded);
      remoteControl.off('cursor:update', onCursor);
    };
  }, [endpoint]);

  // ─── Frame Rendering ──────────────────────────────────────────────────

  const renderFrame = useCallback((frame: FrameData) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    if (frame.type === 'full') {
      canvas.width = frame.width;
      canvas.height = frame.height;
    }

    // Decode pixel data and draw to canvas
    try {
      const imageData = new ImageData(
        new Uint8ClampedArray(frame.data),
        frame.width,
        frame.height
      );
      ctx.putImageData(imageData, frame.x, frame.y);
      frameSequence.current = frame.sequence;
    } catch {
      // Frame data might be JPEG/PNG encoded — use createImageBitmap
      const blob = new Blob([frame.data], { type: 'image/jpeg' });
      createImageBitmap(blob).then(bitmap => {
        ctx.drawImage(bitmap, frame.x, frame.y, frame.width, frame.height);
        bitmap.close();
      }).catch(() => {});
    }
  }, []);

  // ─── Input Handling ───────────────────────────────────────────────────

  const getScaledCoords = (e: React.MouseEvent): { x: number; y: number } => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    return {
      x: Math.round((e.clientX - rect.left) * scaleX),
      y: Math.round((e.clientY - rect.top) * scaleY),
    };
  };

  const getModifiers = (e: React.MouseEvent | React.KeyboardEvent) => ({
    ctrl: e.ctrlKey,
    alt: e.altKey,
    shift: e.shiftKey,
    meta: e.metaKey,
  });

  const handleMouseMove = (e: React.MouseEvent) => {
    if (permission === 'view_only') return;
    const { x, y } = getScaledCoords(e);
    remoteControl.sendInput({ type: 'mouse_move', x, y, modifiers: getModifiers(e), timestamp: Date.now() });
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (permission === 'view_only') return;
    const { x, y } = getScaledCoords(e);
    remoteControl.sendInput({ type: 'mouse_down', x, y, button: e.button, modifiers: getModifiers(e), timestamp: Date.now() });
  };

  const handleMouseUp = (e: React.MouseEvent) => {
    if (permission === 'view_only') return;
    const { x, y } = getScaledCoords(e);
    remoteControl.sendInput({ type: 'mouse_up', x, y, button: e.button, modifiers: getModifiers(e), timestamp: Date.now() });
  };

  const handleWheel = (e: React.WheelEvent) => {
    if (permission === 'view_only') return;
    const { x, y } = getScaledCoords(e);
    remoteControl.sendInput({ type: 'mouse_scroll', x, y, deltaX: e.deltaX, deltaY: e.deltaY, timestamp: Date.now() });
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (permission === 'view_only') return;
    e.preventDefault();
    remoteControl.sendInput({ type: 'key_down', key: e.key, code: e.code, modifiers: getModifiers(e), timestamp: Date.now() });
  };

  const handleKeyUp = (e: React.KeyboardEvent) => {
    if (permission === 'view_only') return;
    e.preventDefault();
    remoteControl.sendInput({ type: 'key_up', key: e.key, code: e.code, modifiers: getModifiers(e), timestamp: Date.now() });
  };

  // ─── Toolbar Actions ──────────────────────────────────────────────────

  const handleDisconnect = async () => {
    await remoteControl.disconnect();
    onOpenChange(false);
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      containerRef.current?.requestFullscreen();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  const toggleRecording = () => {
    const newState = !isRecording;
    remoteControl.toggleRecording(newState);
    setIsRecording(newState);
    toast.info(newState ? 'Recording started' : 'Recording stopped');
  };

  const handleCtrlAltDel = () => {
    remoteControl.sendCtrlAltDel();
    toast.info('Sent Ctrl+Alt+Del');
  };

  const handleClipboardSync = async () => {
    try {
      const text = await navigator.clipboard.readText();
      await remoteControl.sendClipboard(text);
      toast.success('Clipboard synced');
    } catch {
      toast.error('Clipboard access denied');
    }
  };

  const handleQualityChange = (q: string) => {
    const quality = q as RemoteControlConfig['quality'];
    setQuality(quality);
    remoteControl.setQuality(quality);
  };

  const handlePermissionChange = (p: string) => {
    const perm = p as RemotePermission;
    setPermission(perm);
    remoteControl.changePermission(perm);
  };

  const formatBytes = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`;
    if (bytes < 1073741824) return `${(bytes / 1048576).toFixed(1)} MB`;
    return `${(bytes / 1073741824).toFixed(1)} GB`;
  };

  const formatTime = (seconds: number): string => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    if (h > 0) return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  const getStatusDisplay = () => {
    switch (status) {
      case 'requesting': return { text: 'Requesting...', color: 'text-blue-500', icon: UilWifi };
      case 'waiting_consent': return { text: 'Waiting for approval', color: 'text-amber-500', icon: UilClock };
      case 'connecting': return { text: 'Connecting (E2E handshake)', color: 'text-blue-500', icon: UilLock };
      case 'connected': return { text: 'Connected (encrypted)', color: 'text-emerald-500', icon: UilShieldCheck };
      case 'recording': return { text: 'Recording', color: 'text-red-500', icon: UilVideo };
      case 'disconnected': return { text: 'Disconnected', color: 'text-zinc-500', icon: UilMonitor };
      case 'denied': return { text: 'Access Denied', color: 'text-red-500', icon: UilMonitor };
      case 'error': return { text: 'Error', color: 'text-red-500', icon: UilExclamationTriangle };
      default: return { text: status, color: 'text-zinc-500', icon: UilMonitor };
    }
  };

  const isActive = status === 'connected' || status === 'recording';
  const statusInfo = getStatusDisplay();
  const StatusIcon = statusInfo.icon;

  // ─── Render ───────────────────────────────────────────────────────────

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) handleDisconnect(); onOpenChange(v); }}>
      <DialogContent
        className="max-w-[98vw] max-h-[98vh] w-[98vw] h-[98vh] p-0 bg-black border-zinc-800 overflow-hidden"
        ref={containerRef}
        onMouseEnter={() => setShowToolbar(true)}
      >
        <VisuallyHidden>
          <DialogTitle>Remote Control Session</DialogTitle>
          <DialogDescription>Remote desktop viewer</DialogDescription>
        </VisuallyHidden>
        {/* ─── Top Toolbar ─────────────────────────────────────────── */}
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
                  <UilMonitor size={16} className="text-emerald-500" />
                  <span className="text-sm font-medium text-white">{endpoint?.hostname}</span>
                  <span className="text-xs text-zinc-500 font-mono">{endpoint?.ip_address}</span>
                </div>

                <Separator orientation="vertical" className="h-5 bg-zinc-700" />

                <div className="flex items-center gap-1.5">
                  <StatusIcon size={14} className={statusInfo.color} />
                  <span className={`text-xs ${statusInfo.color}`}>{statusInfo.text}</span>
                </div>

                {isActive && (
                  <>
                    <span className="flex items-center gap-1 text-[10px] text-zinc-400">
                      <UilTachometerFast size={12} />
                      {latency}ms
                    </span>
                    <span className="flex items-center gap-1 text-[10px] text-zinc-400">
                      <UilClock size={12} />
                      {formatTime(connectionTime)}
                    </span>
                    <span className="text-[10px] text-zinc-400">
                      {formatBytes(bytesTransferred)}
                    </span>
                  </>
                )}
              </div>

              {/* Center — Controls */}
              <div className="flex items-center gap-1">
                <TooltipProvider delayDuration={300}>
                  {/* Permission selector */}
                  <Select value={permission} onValueChange={handlePermissionChange}>
                    <SelectTrigger className="h-7 w-[140px] border-zinc-700 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="border-zinc-700">
                      <SelectItem value="view_only">
                        <div className="flex items-center gap-1.5"><UilEye size={12} /> View Only</div>
                      </SelectItem>
                      <SelectItem value="shared_control">
                        <div className="flex items-center gap-1.5"><UilMouseAlt size={12} /> Shared Control</div>
                      </SelectItem>
                      <SelectItem value="full_control">
                        <div className="flex items-center gap-1.5"><UilMouseAlt size={12} /> Full Control</div>
                      </SelectItem>
                    </SelectContent>
                  </Select>

                  <Separator orientation="vertical" className="h-5 bg-zinc-700 mx-1" />

                  {/* Quality */}
                  <Select value={quality} onValueChange={handleQualityChange}>
                    <SelectTrigger className="h-7 w-[100px] border-zinc-700 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="border-zinc-700">
                      <SelectItem value="low">Low</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                      <SelectItem value="lossless">Lossless</SelectItem>
                    </SelectContent>
                  </Select>

                  <Separator orientation="vertical" className="h-5 bg-zinc-700 mx-1" />

                  {/* Action buttons */}
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={handleClipboardSync} disabled={!isActive}>
                        <UilClipboard size={14} />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Sync Clipboard</TooltipContent>
                  </Tooltip>

                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={handleCtrlAltDel} disabled={!isActive || permission === 'view_only'}>
                        <UilKeyboard size={14} />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Ctrl+Alt+Del</TooltipContent>
                  </Tooltip>

                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        className={`h-7 w-7 p-0 ${isRecording ? 'text-red-500' : ''}`}
                        onClick={toggleRecording}
                        disabled={!isActive}
                      >
                        {isRecording ? <UilStopCircle size={14} /> : <UilVideo size={14} />}
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>{isRecording ? 'Stop Recording' : 'Start Recording'}</TooltipContent>
                  </Tooltip>

                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={toggleFullscreen}>
                        {isFullscreen ? <UilCompressArrows size={14} /> : <UilExpandArrows size={14} />}
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>{isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}</TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>

              {/* Right — Disconnect */}
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1 text-emerald-500">
                  <UilLock size={12} />
                  <span className="text-[10px]">E2E AES-256</span>
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

        {/* ─── Canvas / Connection States ──────────────────────────── */}
        <div className="w-full h-full flex items-center justify-center bg-black">
          {/* Waiting states */}
          {!isActive && (
            <div className="flex flex-col items-center gap-4 text-center">
              {status === 'requesting' && (
                <>
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ repeat: Infinity, duration: 2, ease: 'linear' }}
                  >
                    <UilWifi size={64} className="text-blue-500" />
                  </motion.div>
                  <p className="text-lg text-zinc-300">Connecting to relay server...</p>
                  <p className="text-sm text-zinc-500">Establishing encrypted tunnel</p>
                </>
              )}

              {status === 'waiting_consent' && (
                <>
                  <motion.div
                    animate={{ scale: [1, 1.1, 1] }}
                    transition={{ repeat: Infinity, duration: 2 }}
                  >
                    <UilClock size={64} className="text-amber-500" />
                  </motion.div>
                  <p className="text-lg text-zinc-300">Waiting for user approval...</p>
                  <p className="text-sm text-zinc-500">
                    A consent prompt has been sent to <span className="text-white font-medium">{endpoint?.hostname}</span>
                  </p>
                  <span className="text-xs text-amber-500">
                    {permission === 'view_only' ? 'View Only' : permission === 'shared_control' ? 'Shared Control' : 'Full Control'}
                  </span>
                </>
              )}

              {status === 'connecting' && (
                <>
                  <motion.div
                    animate={{ scale: [1, 1.05, 1] }}
                    transition={{ repeat: Infinity, duration: 1.5 }}
                  >
                    <UilLock size={64} className="text-emerald-500" />
                  </motion.div>
                  <p className="text-lg text-zinc-300">E2E UilKeySkeleton Exchange...</p>
                  <p className="text-sm text-zinc-500">Negotiating AES-256-GCM session keys</p>
                </>
              )}

              {status === 'denied' && (
                <>
                  <UilMonitor size={64} className="text-red-500" />
                  <p className="text-lg text-zinc-300">Access Denied</p>
                  <p className="text-sm text-zinc-500">The remote user declined the connection request</p>
                  <Button variant="outline" onClick={() => onOpenChange(false)}>Close</Button>
                </>
              )}

              {status === 'error' && (
                <>
                  <UilExclamationTriangle size={64} className="text-red-500" />
                  <p className="text-lg text-zinc-300">Connection Error</p>
                  <p className="text-sm text-zinc-500">Failed to establish remote connection</p>
                  <Button variant="outline" onClick={() => onOpenChange(false)}>Close</Button>
                </>
              )}

              {status === 'disconnected' && (
                <>
                  <UilMonitor size={64} className="text-zinc-500" />
                  <p className="text-lg text-zinc-300">Session Ended</p>
                  <div className="flex items-center gap-4 text-sm text-zinc-500">
                    <span>Duration: {formatTime(connectionTime)}</span>
                    <span>Transferred: {formatBytes(bytesTransferred)}</span>
                  </div>
                  <Button variant="outline" onClick={() => onOpenChange(false)}>Close</Button>
                </>
              )}
            </div>
          )}

          {/* Remote screen canvas */}
          {isActive && (
            <canvas
              ref={canvasRef}
              className="max-w-full max-h-full object-contain cursor-none"
              style={{ imageRendering: quality === 'lossless' ? 'pixelated' : 'auto' }}
              tabIndex={0}
              onMouseMove={handleMouseMove}
              onMouseDown={handleMouseDown}
              onMouseUp={handleMouseUp}
              onWheel={handleWheel}
              onKeyDown={handleKeyDown}
              onKeyUp={handleKeyUp}
              onContextMenu={(e) => e.preventDefault()}
            />
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─── Type Helper (for quality select) ─────────────────────────────────────────

type RemoteControlConfig = { quality: 'low' | 'medium' | 'high' | 'lossless' };

export default RemoteControlDialog;
