"use client";

/**
 * Devora desktop-app preview — a real UI composition (no stock imagery).
 * Simulated editor typing, AI conversation panel, and terminal output.
 * The whole composition is decorative: it is aria-hidden and clearly
 * captioned as a product demonstration.
 */

import { useEffect, useMemo, useRef, useState } from "react";
import { useReducedMotion } from "framer-motion";
import {
  ChevronDown,
  ChevronRight,
  FileCode,
  FileJson,
  Folder,
  FolderOpen,
  GitBranch,
  TerminalSquare,
} from "lucide-react";
import { cn } from "@/lib/utils";

// ---------------------------------------------------------------------------
// Simulated source code (tokenized for subtle syntax coloring)
// ---------------------------------------------------------------------------

type Token = { cls?: string; text: string };

const CODE: Token[][] = [
  [{ cls: "tok-cm", text: "// Suggested by Devora — retry with backoff" }],
  [
    { cls: "tok-kw", text: "export async function" },
    { text: " " },
    { cls: "tok-fn", text: "request" },
    { cls: "tok-pn", text: "<" },
    { cls: "tok-var", text: "T" },
    { cls: "tok-pn", text: ">(" },
    { cls: "tok-var", text: "path" },
    { cls: "tok-pn", text: ": " },
    { cls: "tok-kw", text: "string" },
    { cls: "tok-pn", text: ", init?: " },
    { cls: "tok-var", text: "RequestInit" },
    { cls: "tok-pn", text: ")" },
    { cls: "tok-pn", text: " {" },
  ],
  [
    { cls: "tok-kw", text: "  const" },
    { text: " res = " },
    { cls: "tok-kw", text: "await" },
    { text: " " },
    { cls: "tok-fn", text: "fetchWithRetry" },
    { cls: "tok-pn", text: "(BASE_URL + path, {" },
  ],
  [{ text: "    ...init, retries: " }, { cls: "tok-str", text: "3" }, { cls: "tok-pn", text: " });" }],
  [
    { cls: "tok-kw", text: "  if" },
    { text: " (!res.ok) " },
    { cls: "tok-kw", text: "throw new" },
    { text: " " },
    { cls: "tok-fn", text: "ApiError" },
    { cls: "tok-pn", text: "(res.status, res.requestId);" },
  ],
  [
    { cls: "tok-kw", text: "  return" },
    { text: " res.json() " },
    { cls: "tok-kw", text: "as" },
    { text: " " },
    { cls: "tok-var", text: "T" },
    { cls: "tok-pn", text: ";" },
  ],
  [{ cls: "tok-pn", text: "}" }],
];

const TOTAL_CHARS = CODE.reduce(
  (sum, line) => sum + line.reduce((s, t) => s + t.text.length, 0) + 1,
  0
);

function flattenTokens(): { line: number; cls?: string; ch: string }[] {
  const chars: { line: number; cls?: string; ch: string }[] = [];
  CODE.forEach((line, li) => {
    line.forEach((tok) => {
      for (const ch of tok.text) chars.push({ line: li, cls: tok.cls, ch });
    });
    chars.push({ line: li, ch: "\n" });
  });
  return chars;
}

const FILES = [
  { name: "src", type: "folder" as const, depth: 0 },
  { name: "lib", type: "folder-open" as const, depth: 1 },
  { name: "client.ts", type: "file-code" as const, depth: 2, active: true },
  { name: "errors.ts", type: "file-code" as const, depth: 2 },
  { name: "retry.ts", type: "file-code" as const, depth: 2 },
  { name: "components", type: "folder" as const, depth: 1 },
  { name: "tests", type: "folder" as const, depth: 1 },
  { name: "package.json", type: "file-json" as const, depth: 0 },
];

const TERMINAL_SCRIPT: { text: string; cls?: string }[] = [
  { text: "$ devora plan \"add retry with backoff to api client\"", cls: "text-zinc-300" },
  { text: "✓ Scanned workspace — 42 files, 3 targets", cls: "text-zinc-500" },
  { text: "✓ Plan ready — 3 steps, 1 file changed", cls: "text-zinc-400" },
  { text: "$ devora apply", cls: "text-zinc-300" },
  { text: "✓ Wrote src/lib/client.ts (+14 −2)", cls: "text-zinc-400" },
  { text: "✓ Tests passed 14/14 in 1.9s", cls: "text-emerald-300/80" },
  { text: "$ ", cls: "text-zinc-300" },
];

function FileIcon({ type }: { type: "folder" | "folder-open" | "file-code" | "file-json" }) {
  const cls = "h-3.5 w-3.5 shrink-0";
  switch (type) {
    case "folder":
      return <Folder className={cn(cls, "text-zinc-500")} />;
    case "folder-open":
      return <FolderOpen className={cn(cls, "text-zinc-400")} />;
    case "file-json":
      return <FileJson className={cn(cls, "text-zinc-500")} />;
    default:
      return <FileCode className={cn(cls, "text-zinc-500")} />;
  }
}

export function EditorPreview() {
  const reduce = useReducedMotion();
  const chars = useMemo(() => flattenTokens(), []);
  const [typed, setTyped] = useState(TOTAL_CHARS);
  const [termCount, setTermCount] = useState(TERMINAL_SCRIPT.length);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const termTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Editor typing animation (loops: type → hold → clear → retype)
  useEffect(() => {
    if (reduce) return;
    let count = 0;
    let holdUntil = 0;
    timerRef.current = setInterval(() => {
      const now = Date.now();
      if (holdUntil > now) return;
      count += 1;
      if (count >= TOTAL_CHARS) {
        count = TOTAL_CHARS;
        if (holdUntil === 0) holdUntil = now + 4200;
        else {
          count = 0;
          holdUntil = 0;
        }
      }
      setTyped(count);
    }, 26);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [reduce]);

  // Terminal output animation (loops)
  useEffect(() => {
    if (reduce) return;
    let count = 0;
    let pausedUntil = 0;
    termTimerRef.current = setInterval(() => {
      const now = Date.now();
      if (pausedUntil > now) return;
      if (count < TERMINAL_SCRIPT.length) {
        count += 1;
        if (count === TERMINAL_SCRIPT.length) pausedUntil = now + 5000;
      } else {
        count = 0;
        pausedUntil = 0;
      }
      setTermCount(count);
    }, 620);
    return () => {
      if (termTimerRef.current) clearInterval(termTimerRef.current);
    };
  }, [reduce]);

  // Render editor lines from typed character count
  const lines: { cls?: string; text: string }[][] = [];
  let remaining = reduce ? TOTAL_CHARS : typed;
  for (const line of CODE) {
    const out: { cls?: string; text: string }[] = [];
    for (const tok of line) {
      if (remaining <= 0) break;
      const take = Math.min(tok.text.length, remaining);
      out.push({ cls: tok.cls, text: tok.text.slice(0, take) });
      remaining -= take;
    }
    lines.push(out);
    if (remaining <= 0 && !reduce) break;
  }
  const typingDone = typed >= TOTAL_CHARS;
  const caret = !reduce && (
    <span className="ml-px inline-block h-[1.05em] w-[2px] translate-y-[3px] animate-pulse bg-zinc-200" />
  );

  return (
    <div
      aria-hidden="true"
      className="glow-top relative overflow-hidden rounded-xl border border-white/10 bg-[#050505]"
    >
      {/* Title bar */}
      <div className="flex h-11 items-center justify-between border-b border-white/[0.07] bg-[#070707] px-4">
        <div className="flex items-center gap-2">
          <span className="h-3 w-3 rounded-full bg-zinc-700" />
          <span className="h-3 w-3 rounded-full bg-zinc-700" />
          <span className="h-3 w-3 rounded-full bg-zinc-700" />
        </div>
        <div className="flex items-center gap-2 text-xs text-zinc-500">
          <FileCode className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">devora-workspace</span>
          <span className="hidden text-zinc-700 sm:inline">—</span>
          <span>client.ts</span>
        </div>
        <div className="hidden items-center gap-1.5 rounded-md border border-white/10 bg-white/[0.03] px-2 py-1 text-[11px] text-zinc-400 sm:flex">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-300/70" />
          Ask Devora
          <ChevronDown className="h-3 w-3 text-zinc-600" />
        </div>
      </div>

      <div className="flex">
        {/* File explorer */}
        <div className="hidden w-52 shrink-0 border-r border-white/[0.07] bg-[#060606] p-2 md:block">
          <div className="flex items-center gap-1.5 px-2 pb-2 pt-1 text-[11px] font-medium uppercase tracking-wider text-zinc-600">
            Explorer
          </div>
          <ul className="space-y-0.5">
            {FILES.map((file) => (
              <li
                key={file.name}
                style={{ paddingLeft: `${file.depth * 14 + 8}px` }}
                className={cn(
                  "flex items-center gap-1.5 rounded-md py-[5px] pr-2 text-[13px]",
                  "active" in file && file.active
                    ? "bg-white/[0.06] text-zinc-200"
                    : "text-zinc-500"
                )}
              >
                <FileIcon type={file.type} />
                <span className="truncate">{file.name}</span>
              </li>
            ))}
          </ul>
          <div className="mt-4 border-t border-white/[0.06] px-2 pt-3 text-[11px] text-zinc-600">
            <GitBranch className="mr-1.5 inline h-3 w-3" />
            feat/retry-backoff
          </div>
        </div>

        {/* Editor + terminal */}
        <div className="min-w-0 flex-1">
          {/* Tabs */}
          <div className="flex h-9 items-center border-b border-white/[0.07] bg-[#060606] px-1 text-[13px]">
            <div className="flex h-full items-center gap-2 border-t-2 border-transparent border-t-white/60 bg-[#0a0a0a] px-3 text-zinc-200">
              <FileCode className="h-3.5 w-3.5 text-zinc-500" />
              client.ts
              <span className="ml-1 h-1.5 w-1.5 rounded-full bg-zinc-600" />
            </div>
            <div className="ml-2 hidden h-full items-center px-3 text-zinc-600 sm:flex">
              errors.ts
            </div>
          </div>

          {/* Code area */}
          <div className="devora-code relative h-[232px] overflow-hidden p-4 font-mono text-[13px] leading-6 sm:h-[248px]">
            {lines.map((line, i) => (
              <div key={i} className="flex">
                <span className="w-7 shrink-0 select-none text-right text-zinc-700">
                  {i + 1}
                </span>
                <span className="pl-4 text-zinc-300">
                  {line.map((tok, j) => (
                    <span key={j} className={tok.cls}>
                      {tok.text}
                    </span>
                  ))}
                  {(!reduce && i === lines.length - 1 && !typingDone) || (reduce && i === CODE.length - 1)
                    ? caret
                    : null}
                </span>
              </div>
            ))}
          </div>

          {/* Terminal */}
          <div className="border-t border-white/[0.07] bg-[#040404]">
            <div className="flex items-center gap-2 border-b border-white/[0.05] px-4 py-1.5 text-[11px] font-medium uppercase tracking-wider text-zinc-600">
              <TerminalSquare className="h-3.5 w-3.5" />
              Terminal
            </div>
            <div className="h-[124px] overflow-hidden p-4 pt-2 font-mono text-[12.5px] leading-6">
              {(reduce ? TERMINAL_SCRIPT : TERMINAL_SCRIPT.slice(0, termCount)).map(
                (line, i) => (
                  <div key={i} className={line.cls}>
                    {line.text}
                  </div>
                )
              )}
              {!reduce && termCount < TERMINAL_SCRIPT.length && (
                <span className="inline-block h-3.5 w-[7px] animate-pulse bg-zinc-400 align-middle" />
              )}
            </div>
          </div>
        </div>

        {/* AI panel */}
        <div className="hidden w-72 shrink-0 border-l border-white/[0.07] bg-[#060606] lg:block xl:w-80">
          <div className="flex items-center justify-between border-b border-white/[0.07] px-4 py-2.5">
            <span className="text-[13px] font-medium text-zinc-200">Devora AI</span>
            <span className="rounded-md border border-white/10 bg-white/[0.03] px-1.5 py-0.5 text-[10px] text-zinc-500">
              Plan mode
            </span>
          </div>
          <div className="space-y-3 p-3.5">
            <div className="ml-auto w-fit max-w-[95%] rounded-lg rounded-br-sm border border-white/[0.08] bg-white/[0.05] px-3 py-2 text-[12.5px] leading-relaxed text-zinc-300">
              Add retry with backoff to our API client and make failures easier
              to debug.
            </div>
            <div className="max-w-[95%] rounded-lg rounded-bl-sm border border-white/[0.08] bg-[#0a0a0a] px-3 py-2.5 text-[12.5px] leading-relaxed text-zinc-400">
              <div className="mb-1.5 text-[11px] font-medium uppercase tracking-wider text-zinc-500">
                Proposed plan
              </div>
              <ol className="list-inside list-decimal space-y-1.5">
                <li>Add ApiError with status and request id</li>
                <li>Wrap fetch in retry (3 attempts, exponential backoff)</li>
                <li>Surface structured errors to callers</li>
              </ol>
              <div className="mt-3 flex items-center gap-2">
                <span className="rounded-md bg-white px-2.5 py-1 text-[11px] font-medium text-black">
                  Apply changes
                </span>
                <span className="rounded-md border border-white/10 px-2.5 py-1 text-[11px] text-zinc-400">
                  Edit plan
                </span>
              </div>
            </div>
            <div className="flex items-center gap-2 px-1 pt-1 text-[11px] text-zinc-600">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-zinc-500" />
              Devora is reviewing your workspace…
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
