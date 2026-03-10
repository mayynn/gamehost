"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useMutation } from "@tanstack/react-query";
import { Send, Trash2 } from "lucide-react";
import { GlassCard } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { serversApi } from "@/lib/api/servers";
import toast from "react-hot-toast";
import { getApiErrorMessage } from "@/lib/utils";

export function ConsoleTab({ serverId }: { serverId: string }) {
  const [logs, setLogs] = useState<string[]>([]);
  const [command, setCommand] = useState("");
  const [connected, setConnected] = useState(false);
  const [history, setHistory] = useState<string[]>([]);
  const [histIdx, setHistIdx] = useState(-1);
  const logsRef = useRef<HTMLDivElement>(null);
  const wsRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    let ws: WebSocket | null = null;
    let cancelled = false;

    (async () => {
      try {
        const { data } = await serversApi.getConsole(serverId);
        if (cancelled) return;

        ws = new WebSocket(data.url);
        wsRef.current = ws;

        ws.onopen = () => {
          ws!.send(JSON.stringify({ event: "auth", args: [data.token] }));
        };

        ws.onmessage = (event) => {
          try {
            const msg = JSON.parse(event.data);
            if (msg.event === "auth success") {
              setConnected(true);
            } else if (msg.event === "console output") {
              const line = msg.args?.[0];
              if (typeof line === "string") {
                setLogs((prev) => [...prev.slice(-500), line]);
              }
            } else if (msg.event === "status") {
              setLogs((prev) => [...prev, `[Server ${msg.args?.[0]}]`]);
            }
          } catch { /* ignore non-json */ }
        };

        ws.onclose = () => setConnected(false);
        ws.onerror = () => setConnected(false);
      } catch {
        toast.error("Failed to connect to console");
      }
    })();

    return () => {
      cancelled = true;
      ws?.close();
    };
  }, [serverId]);

  useEffect(() => {
    if (logsRef.current) {
      logsRef.current.scrollTop = logsRef.current.scrollHeight;
    }
  }, [logs]);

  const sendMutation = useMutation({
    mutationFn: (cmd: string) => serversApi.sendCommand(serverId, { command: cmd }),
    onError: (e: unknown) => toast.error(getApiErrorMessage(e, "Failed to send command")),
  });

  const handleSend = useCallback(() => {
    const cmd = command.trim();
    if (!cmd) return;
    sendMutation.mutate(cmd);
    setHistory((prev) => [cmd, ...prev.slice(0, 49)]);
    setHistIdx(-1);
    setCommand("");
  }, [command, sendMutation]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleSend();
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      if (history.length > 0) {
        const next = Math.min(histIdx + 1, history.length - 1);
        setHistIdx(next);
        setCommand(history[next]);
      }
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      if (histIdx > 0) {
        const next = histIdx - 1;
        setHistIdx(next);
        setCommand(history[next]);
      } else {
        setHistIdx(-1);
        setCommand("");
      }
    }
  };

  return (
    <GlassCard className="p-0 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-white/5">
        <div className="flex items-center gap-2">
          <span className={`w-2 h-2 rounded-full ${connected ? "bg-neon-green animate-pulse" : "bg-muted-foreground"}`} />
          <span className="text-xs text-muted-foreground">{connected ? "Connected" : "Disconnected"}</span>
        </div>
        <Button variant="ghost" size="sm" onClick={() => setLogs([])}><Trash2 className="w-3.5 h-3.5" /></Button>
      </div>

      {/* Log output */}
      <div ref={logsRef} className="h-[500px] overflow-y-auto p-4 font-mono text-xs leading-relaxed bg-black/40 custom-scrollbar">
        {logs.length === 0 ? (
          <p className="text-muted-foreground">Waiting for console output...</p>
        ) : (
          logs.map((line, i) => (
            <div key={i} className="hover:bg-white/[0.02] px-1 -mx-1 rounded whitespace-pre-wrap break-all">
              <AnsiLine text={line} />
            </div>
          ))
        )}
      </div>

      {/* Command input */}
      <div className="flex items-center gap-2 p-3 border-t border-white/5 bg-white/[0.02]">
        <span className="text-neon-orange font-mono text-sm">&gt;</span>
        <Input value={command} onChange={(e) => { setCommand(e.target.value); setHistIdx(-1); }}
          onKeyDown={handleKeyDown} placeholder="Enter command..."
          className="flex-1 border-0 bg-transparent focus-visible:ring-0 font-mono text-sm" />
        <Button variant="ghost" size="sm" onClick={handleSend} disabled={!command.trim()}>
          <Send className="w-4 h-4" />
        </Button>
      </div>
    </GlassCard>
  );
}

/** Safe ANSI color code → React elements (no dangerouslySetInnerHTML) */
const ansiColorMap: Record<string, string> = {
  "30": "#4a4a4a", "31": "#ef4444", "32": "#10b981", "33": "#eab308",
  "34": "#3b82f6", "35": "#a855f7", "36": "#06b6d4", "37": "#e5e5e5",
  "90": "#737373", "91": "#f87171", "92": "#34d399", "93": "#fde047",
  "94": "#60a5fa", "95": "#c084fc", "96": "#22d3ee", "97": "#ffffff",
};

function AnsiLine({ text }: { text: string }) {
  const parts: React.ReactNode[] = [];
  const regex = /\x1b\[([0-9;]*)m/g;
  let lastIndex = 0;
  let currentColor: string | null = null;
  let bold = false;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(text)) !== null) {
    // Push text before this escape code
    if (match.index > lastIndex) {
      const segment = text.slice(lastIndex, match.index);
      const style: React.CSSProperties = {};
      if (currentColor) style.color = currentColor;
      if (bold) style.fontWeight = "bold";
      parts.push(
        <span key={parts.length} style={Object.keys(style).length > 0 ? style : undefined} className={currentColor ? undefined : "text-white/80"}>
          {segment}
        </span>
      );
    }
    lastIndex = regex.lastIndex;

    const codes = match[1];
    if (codes === "0" || codes === "") {
      currentColor = null;
      bold = false;
    } else {
      const codeParts = codes.split(";");
      for (const c of codeParts) {
        if (c === "1") bold = true;
        else if (ansiColorMap[c]) currentColor = ansiColorMap[c];
      }
    }
  }

  // Push remaining text
  if (lastIndex < text.length) {
    const segment = text.slice(lastIndex);
    const style: React.CSSProperties = {};
    if (currentColor) style.color = currentColor;
    if (bold) style.fontWeight = "bold";
    parts.push(
      <span key={parts.length} style={Object.keys(style).length > 0 ? style : undefined} className={currentColor ? undefined : "text-white/80"}>
        {segment}
      </span>
    );
  }

  return <>{parts}</>;
}
