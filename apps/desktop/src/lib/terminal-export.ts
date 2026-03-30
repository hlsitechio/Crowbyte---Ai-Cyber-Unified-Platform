import type { Terminal as XTerm } from "@xterm/xterm";

const EXPORT_MIME_TYPE = "text/plain;charset=utf-8";

const sanitizeFilename = (value: string) =>
  value
    .trim()
    .replace(/[^a-zA-Z0-9-_ ]+/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .toLowerCase();

const createFilenameTimestamp = () => new Date().toISOString().replace(/[:.]/g, "-");

const getTerminalTranscript = (terminal: XTerm) => {
  const lines: string[] = [];
  const buffer = terminal.buffer.active;

  for (let lineIndex = 0; lineIndex < buffer.length; lineIndex += 1) {
    const line = buffer.getLine(lineIndex);
    if (!line) continue;
    lines.push(line.translateToString(true));
  }

  while (lines.length > 0 && lines[lines.length - 1] === "") {
    lines.pop();
  }

  return lines.join("\n");
};

export const exportTerminalTranscript = (terminal: XTerm, sessionName: string) => {
  const content = getTerminalTranscript(terminal);
  if (!content.trim()) return null;

  const safeSessionName = sanitizeFilename(sessionName) || "terminal-session";
  const filename = `crowbyte-${safeSessionName}-${createFilenameTimestamp()}.txt`;
  const blob = new Blob([content], { type: EXPORT_MIME_TYPE });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);

  return filename;
};
