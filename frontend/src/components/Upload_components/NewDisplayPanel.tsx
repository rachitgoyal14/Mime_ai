"use client";

import { NewThree, setSpeed, updateWordList } from "@/hooks/NewMain";
import { Activity, ChevronRight, Eye, Layers, Sparkles, Gauge } from "lucide-react";
import { useEffect, useRef, useState } from "react";

interface ChildProps {
  data: string[] | null;
}

export function NewDisplayPanel({ data }: ChildProps) {
  const [isReady, setIsReady] = useState(false);
  const [currentWord, setCurrentWord] = useState<string>("");
  const [wordIdx, setWordIdx] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isDone, setIsDone] = useState(false);
  const [speed, setSpeedState] = useState(4); // frames/sec
  const cleanupRef = useRef<(() => void) | null>(null);
  const initializedRef = useRef(false);

  // Initialize Three.js once
  useEffect(() => {
    if (initializedRef.current) return;
    initializedRef.current = true;

    const cleanup = NewThree("label", "container");
    cleanupRef.current = cleanup || null;
    setIsReady(true);

    return () => {
      cleanupRef.current?.();
    };
  }, []);

  // When new gloss data arrives, feed it to the animation engine
  useEffect(() => {
    if (!data || data.length === 0) return;
    setIsPlaying(true);
    setIsDone(false);
    setWordIdx(0);
    setCurrentWord(data[0] || "");

    updateWordList(
      data,
      // onWordChange callback
      (word: string, idx: number) => {
        setCurrentWord(word);
        setWordIdx(idx);
      },
      // onFinished callback
      () => {
        setIsPlaying(false);
        setIsDone(true);
      }
    );
  }, [data]);

  function handleSpeedChange(val: number) {
    setSpeedState(val);
    setSpeed(val);
  }

  const totalWords = data?.length ?? 0;
  const progress = isDone
    ? 100
    : totalWords > 0
    ? ((wordIdx + 1) / totalWords) * 100
    : 0;

  return (
    <div className="h-full flex flex-col bg-[#0d1117] rounded-3xl shadow-2xl border border-white/8 overflow-hidden relative">

      {/* ── Top bar ─────────────────────────────────────────── */}
      <div className="flex items-center justify-between px-5 py-3 bg-gradient-to-r from-slate-900/90 to-slate-800/90 backdrop-blur-sm border-b border-white/8 flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className="w-9 h-9 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-xl flex items-center justify-center shadow-lg shadow-emerald-900/40">
              <Eye className="w-5 h-5 text-white" />
            </div>
            {isReady && (
              <div className="absolute -top-0.5 -right-0.5 w-3 h-3 bg-emerald-400 rounded-full border-2 border-slate-900 animate-pulse" />
            )}
          </div>
          <div>
            <h2 className="text-base font-semibold text-white leading-tight flex items-center gap-2">
              3D Sign Viewer
              {isPlaying && <Activity className="w-4 h-4 text-emerald-400 animate-pulse" />}
            </h2>
            <p className="text-xs text-white/40">
              {isReady ? (isPlaying ? "Animating…" : isDone ? "Playback complete" : "Ready") : "Initializing…"}
            </p>
          </div>
        </div>

        {/* Speed dial + word count */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 bg-white/6 rounded-full px-3 py-1.5 border border-white/8">
            <Layers className="w-3.5 h-3.5 text-blue-400" />
            <span className="text-xs text-white/70 font-medium">
              {totalWords > 0 ? `${totalWords} sign${totalWords !== 1 ? "s" : ""}` : "Waiting…"}
            </span>
          </div>
          <div className="flex items-center gap-2 bg-white/6 rounded-xl px-3 py-1.5 border border-white/8">
            <Gauge className="w-3.5 h-3.5 text-violet-400 flex-shrink-0" />
            <input
              type="range" min={1} max={16} step={1} value={speed}
              onChange={e => handleSpeedChange(Number(e.target.value))}
              className="slider w-20 h-1 accent-violet-500 cursor-pointer"
            />
            <span className="text-xs text-white/50 w-8 text-right tabular-nums">{speed}fps</span>
          </div>
        </div>
      </div>

      {/* ── Current word + progress ─────────────────────────── */}
      <div className="flex-shrink-0 px-5 pt-3 pb-2 bg-[#0d1117]">
        {/* Big word label — Three.js writes here via DOM id="label" */}
        <div className="text-center mb-2">
          {/* Empty: Three.js sets textContent directly */}
          <h1
            id="label"
            className="text-4xl font-black tracking-[0.15em] bg-gradient-to-r from-cyan-300 via-blue-300 to-violet-400 bg-clip-text text-transparent min-h-[2.5rem]"
          />
          <div className="w-20 h-0.5 bg-gradient-to-r from-cyan-400 via-blue-400 to-violet-500 rounded-full mx-auto mt-1 opacity-60" />
        </div>

        {/* Progress bar */}
        {totalWords > 0 && (
          <div className="mt-2">
            <div className="flex justify-between text-xs text-white/30 mb-1">
              <span>{wordIdx + 1} / {totalWords}</span>
              <span>{Math.round(progress)}%</span>
            </div>
            <div className="h-1 bg-white/8 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-cyan-500 to-violet-500 rounded-full transition-all duration-500 ease-out"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        )}

        {/* Word queue chips — scrollable row */}
        {data && data.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-2 max-h-16 overflow-y-auto">
            {data.map((word, i) => (
              <span
                key={i}
                className={`text-xs px-2 py-0.5 rounded-full border transition-all duration-300 ${
                  i === wordIdx && isPlaying
                    ? "bg-cyan-500/20 border-cyan-400/50 text-cyan-300 scale-105"
                    : i < wordIdx
                    ? "bg-white/5 border-white/10 text-white/25 line-through"
                    : "bg-white/5 border-white/10 text-white/50"
                }`}
              >
                {i === wordIdx && isPlaying && (
                  <ChevronRight className="inline w-3 h-3 mr-0.5" />
                )}
                {word}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* ── Three.js canvas container ──────────────────────── */}
      <div className="relative flex-1 bg-[#0d1117] min-h-0">
        <div
          id="container"
          className="w-full h-full"
          style={{ minHeight: "320px" }}
        />

        {/* Idle overlay — shown before any animation */}
        {isReady && !data && !isPlaying && (
          <div className="absolute inset-0 flex flex-col items-center justify-center z-10 pointer-events-none">
            <div className="text-center">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-cyan-500/20 to-violet-500/20 border border-cyan-500/20 flex items-center justify-center mx-auto mb-4 animate-pulse">
                <Sparkles className="w-8 h-8 text-cyan-400/60" />
              </div>
              <p className="text-white/30 text-sm">Enter text to see sign language</p>
            </div>
          </div>
        )}

        {/* Done banner */}
        {isDone && (
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-20 pointer-events-none">
            <div className="bg-emerald-500/20 border border-emerald-400/40 backdrop-blur-sm rounded-full px-4 py-1.5 flex items-center gap-2">
              <div className="w-2 h-2 bg-emerald-400 rounded-full animate-ping" />
              <span className="text-emerald-300 text-xs font-medium tracking-wide">Playback Complete</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
