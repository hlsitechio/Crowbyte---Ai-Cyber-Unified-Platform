import type { WebSocket } from 'ws';
import * as pty from 'node-pty';
import { v4 as uuidv4 } from 'uuid';
import { execFile } from 'node:child_process';

// Memory-engine bridge for terminal session logging
const BRIDGE_PATH = process.env.MEMORY_BRIDGE_PATH || '/opt/crowbyte/memory-engine/bridge.py';
const PYTHON = process.env.PYTHON_PATH || 'python3';

function saveTerminalToMemory(content: string, role: 'user' | 'assistant', sessionId: string): void {
  if (!content.trim() || content.trim().length < 3) return;
  const args = JSON.stringify({
    content: content.slice(0, 5000), // cap at 5K
    role,
    session_id: `terminal-${sessionId}`,
    source: 'terminal',
  });
  // Fire-and-forget — no shell injection risk with execFile
  execFile(PYTHON, [BRIDGE_PATH, 'chat_save', args], { timeout: 10_000 }, () => {});
}

interface TerminalSession {
  id: string;
  pty: pty.IPty;
  ws: WebSocket;
  createdAt: number;
}

const sessions = new Map<string, TerminalSession>();

export function handleTerminalConnection(ws: WebSocket, params: Record<string, string>): void {
  const sessionId = params.sessionId || uuidv4();
  const shell = process.env.SHELL || '/bin/bash';
  const cols = parseInt(params.cols) || 120;
  const rows = parseInt(params.rows) || 40;

  let ptyProcess: pty.IPty;

  try {
    ptyProcess = pty.spawn(shell, [], {
      name: 'xterm-256color',
      cols,
      rows,
      cwd: process.env.HOME || '/root',
      env: {
        ...process.env,
        TERM: 'xterm-256color',
        COLORTERM: 'truecolor',
      } as Record<string, string>,
    });
  } catch (err: any) {
    ws.send(JSON.stringify({
      type: 'error',
      message: `Failed to spawn shell: ${err.message}`,
    }));
    ws.close();
    return;
  }

  const session: TerminalSession = {
    id: sessionId,
    pty: ptyProcess,
    ws,
    createdAt: Date.now(),
  };

  sessions.set(sessionId, session);

  // Send session info to client
  ws.send(JSON.stringify({
    type: 'session',
    sessionId,
    shell,
    pid: ptyProcess.pid,
  }));

  // Terminal output buffer for memory-engine batching
  let outputBuffer = '';
  let outputFlushTimer: ReturnType<typeof setTimeout> | null = null;

  // Relay pty output to WebSocket
  ptyProcess.onData((data: string) => {
    if (ws.readyState === ws.OPEN) {
      ws.send(JSON.stringify({
        type: 'output',
        data,
      }));
    }

    // Buffer output for memory-engine (flush every 3s of inactivity)
    outputBuffer += data;
    if (outputFlushTimer) clearTimeout(outputFlushTimer);
    outputFlushTimer = setTimeout(() => {
      if (outputBuffer.trim().length > 10) {
        saveTerminalToMemory(outputBuffer, 'assistant', sessionId);
      }
      outputBuffer = '';
    }, 3000);
  });

  ptyProcess.onExit(({ exitCode, signal }) => {
    if (ws.readyState === ws.OPEN) {
      ws.send(JSON.stringify({
        type: 'exit',
        exitCode,
        signal,
      }));
      ws.close();
    }
    sessions.delete(sessionId);
  });

  // Track user command buffer for memory-engine
  let commandBuffer = '';

  // Handle incoming messages from WebSocket
  ws.on('message', (raw: Buffer) => {
    try {
      const msg = JSON.parse(raw.toString());

      switch (msg.type) {
        case 'input':
          // Relay keyboard input to pty
          if (typeof msg.data === 'string') {
            ptyProcess.write(msg.data);

            // Track commands — save on Enter (\r or \n)
            if (msg.data === '\r' || msg.data === '\n') {
              if (commandBuffer.trim().length > 2) {
                saveTerminalToMemory(commandBuffer.trim(), 'user', sessionId);
              }
              commandBuffer = '';
            } else if (msg.data === '\x7f' || msg.data === '\b') {
              // Backspace
              commandBuffer = commandBuffer.slice(0, -1);
            } else if (msg.data.length === 1 && msg.data.charCodeAt(0) >= 32) {
              commandBuffer += msg.data;
            }
          }
          break;

        case 'resize':
          // Handle terminal resize
          if (typeof msg.cols === 'number' && typeof msg.rows === 'number') {
            ptyProcess.resize(
              Math.max(1, Math.min(500, msg.cols)),
              Math.max(1, Math.min(200, msg.rows)),
            );
          }
          break;

        case 'ping':
          ws.send(JSON.stringify({ type: 'pong', timestamp: Date.now() }));
          break;

        default:
          // Unknown message type — ignore
          break;
      }
    } catch {
      // If not JSON, treat as raw input
      ptyProcess.write(raw.toString());
    }
  });

  // Clean up on WebSocket close
  ws.on('close', () => {
    try {
      ptyProcess.kill();
    } catch {
      // Already dead
    }
    sessions.delete(sessionId);
  });

  ws.on('error', (err) => {
    console.error(`[terminal] WebSocket error for session ${sessionId}:`, err.message);
    try {
      ptyProcess.kill();
    } catch {
      // Already dead
    }
    sessions.delete(sessionId);
  });
}

export function getActiveSessions(): Array<{ id: string; pid: number; createdAt: number }> {
  return Array.from(sessions.values()).map(s => ({
    id: s.id,
    pid: s.pty.pid,
    createdAt: s.createdAt,
  }));
}

export function killSession(sessionId: string): boolean {
  const session = sessions.get(sessionId);
  if (!session) return false;

  try {
    session.pty.kill();
    session.ws.close();
  } catch {
    // Best effort
  }

  sessions.delete(sessionId);
  return true;
}
