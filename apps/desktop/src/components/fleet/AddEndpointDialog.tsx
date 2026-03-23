/**
 * Add Endpoint Dialog
 * Dialog for adding a new endpoint (current machine) to the fleet
 */

import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Monitor,
  Cpu,
  HardDrive,
  MemoryStick,
  Network,
  Loader2,
  CheckCircle,
  AlertCircle,
} from 'lucide-react';
import { systemMonitor, SystemMetrics } from '@/services/systemMonitor';
import { endpointService } from '@/services/endpointService';
import { toast } from 'sonner';

interface AddEndpointDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onEndpointAdded?: () => void;
}

export function AddEndpointDialog({
  open,
  onOpenChange,
  onEndpointAdded,
}: AddEndpointDialogProps) {
  const [metrics, setMetrics] = useState<SystemMetrics | null>(null);
  const [customName, setCustomName] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      loadSystemMetrics();
    }
  }, [open]);

  const loadSystemMetrics = async () => {
    setLoading(true);
    setError(null);
    try {
      const systemMetrics = await systemMonitor.getMetrics();
      setMetrics(systemMetrics);
      setCustomName(systemMetrics.hostname);
    } catch (err) {
      console.error('Failed to load system metrics:', err);
      setError('Failed to detect system information');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!metrics) return;

    setSaving(true);
    try {
      await endpointService.createFromCurrentMachine(customName);
      toast.success('Endpoint Added', {
        description: `${customName} has been registered successfully`,
      });
      onOpenChange(false);
      onEndpointAdded?.();
    } catch (err: any) {
      console.error('Failed to save endpoint:', err);
      toast.error('Failed to add endpoint', {
        description: err.message || 'Please try again',
      });
    } finally {
      setSaving(false);
    }
  };

  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return '0 GB';
    return `${bytes.toFixed(1)} GB`;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] bg-background/95 backdrop-blur border-border">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Monitor className="h-5 w-5 text-primary" />
            Register This Device
          </DialogTitle>
          <DialogDescription>
            Add your current machine to the fleet for real-time monitoring
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-8 gap-4">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">Detecting system information...</p>
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center py-8 gap-4">
            <AlertCircle className="h-8 w-8 text-destructive" />
            <p className="text-sm text-destructive">{error}</p>
            <Button variant="outline" onClick={loadSystemMetrics}>
              Retry
            </Button>
          </div>
        ) : metrics ? (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="hostname">Device Name</Label>
              <Input
                id="hostname"
                value={customName}
                onChange={(e) => setCustomName(e.target.value)}
                placeholder="Enter device name"
                className="bg-background"
              />
              <p className="text-xs text-muted-foreground">
                Give this device a memorable name for easy identification
              </p>
            </div>

            <div className="rounded-lg border bg-muted/30 p-4 space-y-3">
              <h4 className="text-sm font-medium flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-500" />
                System Detected
              </h4>

              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="flex items-center gap-2">
                  <Monitor className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">OS:</span>
                  <span>{metrics.platform} {metrics.osVersion}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Network className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">IP:</span>
                  <span>{metrics.ipAddress}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Cpu className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">CPU:</span>
                  <span>{metrics.cpuCores} cores</span>
                </div>
                <div className="flex items-center gap-2">
                  <MemoryStick className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">RAM:</span>
                  <span>{formatBytes(metrics.memoryTotal)}</span>
                </div>
              </div>

              <div className="pt-2 border-t border-border/50">
                <h5 className="text-xs font-medium text-muted-foreground mb-2">Current Usage</h5>
                <div className="grid grid-cols-3 gap-2">
                  <div className="text-center">
                    <div className="text-lg font-semibold text-primary">
                      {Math.round(metrics.cpuUsage)}%
                    </div>
                    <div className="text-xs text-muted-foreground">CPU</div>
                  </div>
                  <div className="text-center">
                    <div className="text-lg font-semibold text-blue-500">
                      {Math.round(metrics.memoryUsage)}%
                    </div>
                    <div className="text-xs text-muted-foreground">Memory</div>
                  </div>
                  <div className="text-center">
                    <div className="text-lg font-semibold text-amber-500">
                      {Math.round(metrics.diskUsage)}%
                    </div>
                    <div className="text-xs text-muted-foreground">Disk</div>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-xs">
                {metrics.architecture}
              </Badge>
              <Badge variant="outline" className="text-xs">
                Agent v1.0.0
              </Badge>
            </div>
          </div>
        ) : null}

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={saving}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={loading || saving || !metrics || !customName.trim()}
          >
            {saving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Adding...
              </>
            ) : (
              'Add Endpoint'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
