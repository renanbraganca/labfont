import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Dices, Droplet, Move, Pause, Play, RotateCcw, Type, Undo2, Zap } from 'lucide-react';
import { ShaderPipeline } from '../engine/ShaderPipeline';
import {
  CharacterPlacement,
  computeCharacterPlacements,
  getAspectDimensions,
  MediaElementRef,
} from '../engine/sourceRenderer';
import { AspectRatioKey, StudioParams } from '../types/studio';
import { PRESETS } from '../data/presets';

interface CanvasViewportProps {
  params: StudioParams;
  mediaRef: React.MutableRefObject<MediaElementRef>;
  pipelineRef: React.MutableRefObject<ShaderPipeline | null>;
  timeRef: React.MutableRefObject<number>;
  canUndo: boolean;
  onUndo: () => void;
  onReset: () => void;
  onRandomizeSubtle: () => void;
  onRandomizeAggressive: () => void;
  onChange: (updater: (prev: StudioParams) => StudioParams) => void;
  onSelectPreset: (id: string) => void;
  onDropMediaFile: (file: File) => void;
}

const ASPECT_OPTIONS: AspectRatioKey[] = ['3:4', '4:5', '1:1', '16:9', '9:16'];

type DragToolMode = 'char' | 'text' | 'droplet';

export const CanvasViewport: React.FC<CanvasViewportProps> = ({
  params,
  mediaRef,
  pipelineRef,
  timeRef,
  canUndo,
  onUndo,
  onReset,
  onRandomizeSubtle,
  onRandomizeAggressive,
  onChange,
  onSelectPreset,
  onDropMediaFile,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const measureCtxRef = useRef<CanvasRenderingContext2D | null>(null);
  const paramsRef = useRef(params);
  paramsRef.current = params;

  const [dragTool, setDragTool] = useState<DragToolMode>('char');
  const [isDragging, setIsDragging] = useState(false);
  const [isResizingChar, setIsResizingChar] = useState(false);
  const [hoveredCharIndex, setHoveredCharIndex] = useState<number | null>(null);
  const [selectedCharIndex, setSelectedCharIndex] = useState<number | null>(null);

  const dragStartRef = useRef<{
    clientX: number;
    clientY: number;
    startOffsetX: number;
    startOffsetY: number;
    charIdx: number | null;
  } | null>(null);

  const resizeStartRef = useRef<{
    centerClientX: number;
    centerClientY: number;
    startDist: number;
    startScale: number;
    charIdx: number;
  } | null>(null);

  const [isDragOverFile, setIsDragOverFile] = useState(false);
  const [contextLost, setContextLost] = useState(false);

  useEffect(() => {
    const c = document.createElement('canvas');
    measureCtxRef.current = c.getContext('2d');
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const pipeline = new ShaderPipeline(canvas, (lost) => setContextLost(lost));
    pipelineRef.current = pipeline;

    let rafId = 0;
    let lastTs = performance.now();

    const tick = (now: number) => {
      const dt = Math.min(0.1, (now - lastTs) / 1000);
      lastTs = now;

      const cur = paramsRef.current;
      if (cur.animationPlaying) {
        timeRef.current += dt * cur.animationSpeed;
      }

      const { width, height } = getAspectDimensions(cur.aspectRatio, 1080);
      pipeline.renderFrame(width, height, cur, mediaRef.current, timeRef.current);

      rafId = requestAnimationFrame(tick);
    };

    rafId = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(rafId);
      pipeline.dispose();
      pipelineRef.current = null;
    };
  }, [mediaRef, pipelineRef, timeRef]);

  const dims = getAspectDimensions(params.aspectRatio, 1080);

  const activeTool: DragToolMode =
    dragTool === 'droplet' && !params.droplet.enabled ? 'char' : dragTool;

  const getCurrentPlacements = (): CharacterPlacement[] => {
    const ctx = measureCtxRef.current;
    if (!ctx) return [];
    return computeCharacterPlacements(ctx, dims.width, dims.height, params, timeRef.current);
  };

  const findHitCharacter = (clientX: number, clientY: number): CharacterPlacement | null => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();
    const nx = (clientX - rect.left) / Math.max(1, rect.width);
    const ny = (clientY - rect.top) / Math.max(1, rect.height);

    const placements = getCurrentPlacements();
    let best: CharacterPlacement | null = null;
    let bestScore = Infinity;

    for (const p of placements) {
      const rx = Math.max(0.035, p.normHalfW * 1.25);
      const ry = Math.max(0.035, p.normHalfH * 1.15);
      const dx = (nx - p.normX) / rx;
      const dy = (ny - p.normY) / ry;
      const d2 = dx * dx + dy * dy;
      if (d2 <= 1.35 && d2 < bestScore) {
        bestScore = d2;
        best = p;
      }
    }
    return best;
  };

  const highlightedPlacement = useMemo(() => {
    if (activeTool !== 'char') return null;
    const targetIdx = selectedCharIndex ?? hoveredCharIndex;
    if (targetIdx === null) return null;
    const ctx = measureCtxRef.current;
    if (!ctx) return null;
    const list = computeCharacterPlacements(ctx, dims.width, dims.height, params, timeRef.current);
    return list.find((p) => p.index === targetIdx) ?? null;
  }, [activeTool, selectedCharIndex, hoveredCharIndex, dims.width, dims.height, params, timeRef]);

  const setCharScale = (charIdx: number, nextScale: number) => {
    const clamped = Number(Math.min(4.5, Math.max(0.2, nextScale)).toFixed(2));
    onChange((p) => {
      const prev = p.typography.charOffsets?.[charIdx] ?? { dx: 0, dy: 0 };
      return {
        ...p,
        typography: {
          ...p.typography,
          charOffsets: {
            ...p.typography.charOffsets,
            [charIdx]: {
              dx: prev.dx,
              dy: prev.dy,
              scale: clamped,
            },
          },
        },
      };
    });
  };

  const updateDropletPosition = (clientX: number, clientY: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const nx = Math.min(0.95, Math.max(0.05, (clientX - rect.left) / rect.width));
    const ny = Math.min(0.95, Math.max(0.05, (clientY - rect.top) / rect.height));
    onChange((p) => ({
      ...p,
      droplet: {
        ...p.droplet,
        x: Number(nx.toFixed(3)),
        y: Number(ny.toFixed(3)),
      },
    }));
  };

  const updateTextPosition = (clientX: number, clientY: number) => {
    const canvas = canvasRef.current;
    const start = dragStartRef.current;
    if (!canvas || !start) return;
    const rect = canvas.getBoundingClientRect();
    const dx = (clientX - start.clientX) / Math.max(1, rect.width);
    const dy = (clientY - start.clientY) / Math.max(1, rect.height);
    const nextX = Math.min(0.85, Math.max(-0.85, start.startOffsetX + dx));
    const nextY = Math.min(0.85, Math.max(-0.85, start.startOffsetY + dy));
    onChange((p) => ({
      ...p,
      typography: {
        ...p.typography,
        offsetX: Number(nextX.toFixed(3)),
        offsetY: Number(nextY.toFixed(3)),
      },
    }));
  };

  const updateSingleCharPosition = (clientX: number, clientY: number) => {
    const canvas = canvasRef.current;
    const start = dragStartRef.current;
    if (!canvas || !start || start.charIdx === null) return;
    const rect = canvas.getBoundingClientRect();
    const dx = (clientX - start.clientX) / Math.max(1, rect.width);
    const dy = (clientY - start.clientY) / Math.max(1, rect.height);
    const targetIdx = start.charIdx;

    onChange((p) => {
      const existing = p.typography.charOffsets?.[targetIdx];
      return {
        ...p,
        typography: {
          ...p.typography,
          charOffsets: {
            ...p.typography.charOffsets,
            [targetIdx]: {
              dx: Number(Math.min(0.9, Math.max(-0.9, start.startOffsetX + dx)).toFixed(4)),
              dy: Number(Math.min(0.9, Math.max(-0.9, start.startOffsetY + dy)).toFixed(4)),
              scale: existing?.scale,
            },
          },
        },
      };
    });
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (activeTool === 'droplet') {
      e.currentTarget.setPointerCapture(e.pointerId);
      setIsDragging(true);
      updateDropletPosition(e.clientX, e.clientY);
      return;
    }

    if (activeTool === 'char') {
      const hit = findHitCharacter(e.clientX, e.clientY);
      if (hit) {
        e.currentTarget.setPointerCapture(e.pointerId);
        setIsDragging(true);
        setSelectedCharIndex(hit.index);
        const existing = params.typography.charOffsets?.[hit.index] ?? { dx: 0, dy: 0 };
        dragStartRef.current = {
          clientX: e.clientX,
          clientY: e.clientY,
          startOffsetX: existing.dx,
          startOffsetY: existing.dy,
          charIdx: hit.index,
        };
      } else {
        setSelectedCharIndex(null);
      }
      return;
    }

    e.currentTarget.setPointerCapture(e.pointerId);
    setIsDragging(true);
    dragStartRef.current = {
      clientX: e.clientX,
      clientY: e.clientY,
      startOffsetX: params.typography.offsetX,
      startOffsetY: params.typography.offsetY,
      charIdx: null,
    };
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDragging) {
      if (activeTool === 'char') {
        const hit = findHitCharacter(e.clientX, e.clientY);
        setHoveredCharIndex(hit ? hit.index : null);
      } else if (hoveredCharIndex !== null) {
        setHoveredCharIndex(null);
      }
      return;
    }

    if (activeTool === 'droplet') {
      updateDropletPosition(e.clientX, e.clientY);
    } else if (activeTool === 'char') {
      updateSingleCharPosition(e.clientX, e.clientY);
    } else {
      updateTextPosition(e.clientX, e.clientY);
    }
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (isDragging) {
      if (e.currentTarget.hasPointerCapture(e.pointerId)) {
        e.currentTarget.releasePointerCapture(e.pointerId);
      }
      setIsDragging(false);
      dragStartRef.current = null;
    }
  };

  const handlePointerLeave = () => {
    if (!isDragging) {
      setHoveredCharIndex(null);
    }
  };

  const handleWheel = (e: React.WheelEvent<HTMLCanvasElement>) => {
    if (activeTool !== 'char') return;
    const hit = findHitCharacter(e.clientX, e.clientY);
    const targetIdx = hit?.index ?? selectedCharIndex;
    if (targetIdx === null) return;

    e.preventDefault();
    setSelectedCharIndex(targetIdx);
    const currentScale = params.typography.charOffsets?.[targetIdx]?.scale ?? 1;
    const delta = e.deltaY < 0 ? 0.08 : -0.08;
    setCharScale(targetIdx, currentScale + delta);
  };

  const handleDoubleClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (activeTool === 'char') {
      const hit = findHitCharacter(e.clientX, e.clientY);
      if (hit) {
        onChange((p) => {
          const nextOffsets = { ...p.typography.charOffsets };
          delete nextOffsets[hit.index];
          return {
            ...p,
            typography: { ...p.typography, charOffsets: nextOffsets },
          };
        });
      }
    } else if (activeTool === 'text') {
      onChange((p) => ({
        ...p,
        typography: { ...p.typography, offsetX: 0, offsetY: 0 },
      }));
    }
  };

  // Corner Resize Handle Pointer Handlers
  const handleResizeHandleDown = (e: React.PointerEvent<HTMLButtonElement>) => {
    e.stopPropagation();
    if (!highlightedPlacement || !canvasRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const centerClientX = rect.left + highlightedPlacement.normX * rect.width;
    const centerClientY = rect.top + highlightedPlacement.normY * rect.height;
    const dist = Math.max(12, Math.hypot(e.clientX - centerClientX, e.clientY - centerClientY));
    const currentScale = params.typography.charOffsets?.[highlightedPlacement.index]?.scale ?? 1;

    e.currentTarget.setPointerCapture(e.pointerId);
    setIsResizingChar(true);
    setSelectedCharIndex(highlightedPlacement.index);
    resizeStartRef.current = {
      centerClientX,
      centerClientY,
      startDist: dist,
      startScale: currentScale,
      charIdx: highlightedPlacement.index,
    };
  };

  const handleResizeHandleMove = (e: React.PointerEvent<HTMLButtonElement>) => {
    if (!isResizingChar || !resizeStartRef.current) return;
    const st = resizeStartRef.current;
    const curDist = Math.max(8, Math.hypot(e.clientX - st.centerClientX, e.clientY - st.centerClientY));
    const ratio = curDist / st.startDist;
    setCharScale(st.charIdx, st.startScale * ratio);
  };

  const handleResizeHandleUp = (e: React.PointerEvent<HTMLButtonElement>) => {
    if (isResizingChar) {
      if (e.currentTarget.hasPointerCapture(e.pointerId)) {
        e.currentTarget.releasePointerCapture(e.pointerId);
      }
      setIsResizingChar(false);
      resizeStartRef.current = null;
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.types.includes('Files')) {
      setIsDragOverFile(true);
    }
  };

  const handleDragLeave = () => {
    setIsDragOverFile(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOverFile(false);
    const file = e.dataTransfer.files?.[0];
    if (file && (file.type.startsWith('image/') || file.type.startsWith('video/'))) {
      onDropMediaFile(file);
    }
  };

  const hasCustomCharOffsets = Object.keys(params.typography.charOffsets || {}).length > 0;
  const activeSelectedScale =
    selectedCharIndex !== null
      ? params.typography.charOffsets?.[selectedCharIndex]?.scale ?? 1
      : 1;

  return (
    <main
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className="flex-1 min-w-0 h-full bg-[#09090B] flex flex-col overflow-hidden relative"
    >
      {/* Workspace Action Toolbar */}
      <div className="shrink-0 px-4 py-2.5 border-b border-zinc-800/80 bg-[#0C0C0F] flex flex-wrap items-center justify-between gap-2.5">
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-0.5 p-0.5 bg-zinc-900 rounded-md border border-zinc-800">
            {ASPECT_OPTIONS.map((ratio) => (
              <button
                key={ratio}
                type="button"
                onClick={() => onChange((p) => ({ ...p, aspectRatio: ratio }))}
                className={`px-2 py-1 text-[11px] font-mono-tabular rounded transition-colors cursor-pointer whitespace-nowrap ${
                  params.aspectRatio === ratio
                    ? 'bg-zinc-800 text-white font-medium'
                    : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                {ratio}
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={() =>
              onChange((p) => ({ ...p, animationPlaying: !p.animationPlaying }))
            }
            title={params.animationPlaying ? 'Pausar animação' : 'Reproduzir animação'}
            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-zinc-200 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 rounded-md transition-colors cursor-pointer whitespace-nowrap"
          >
            {params.animationPlaying ? (
              <Pause className="w-3.5 h-3.5" />
            ) : (
              <Play className="w-3.5 h-3.5" />
            )}
            <span className="hidden xl:inline">
              {params.animationPlaying ? 'Pausar' : 'Animar'}
            </span>
          </button>

          {/* 3-Way Canvas Drag & Resize Tool */}
          <div className="flex items-center gap-0.5 p-0.5 bg-zinc-900 rounded-md border border-zinc-800">
            <button
              type="button"
              onClick={() => setDragTool('char')}
              title="Mover e redimensionar letra por letra no canvas"
              className={`inline-flex items-center gap-1 px-2 py-1 text-[11px] font-medium rounded transition-colors cursor-pointer whitespace-nowrap ${
                activeTool === 'char'
                  ? 'bg-zinc-800 text-white'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <Type className="w-3 h-3" />
              <span>Editar Letras</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setDragTool('text');
                setSelectedCharIndex(null);
              }}
              title="Arrastar todo o bloco de texto no canvas"
              className={`inline-flex items-center gap-1 px-2 py-1 text-[11px] font-medium rounded transition-colors cursor-pointer whitespace-nowrap ${
                activeTool === 'text'
                  ? 'bg-zinc-800 text-white'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <Move className="w-3 h-3" />
              <span>Mover Texto</span>
            </button>
            <button
              type="button"
              disabled={!params.droplet.enabled}
              onClick={() => {
                setDragTool('droplet');
                setSelectedCharIndex(null);
              }}
              title={
                params.droplet.enabled
                  ? 'Arrastar lente de vidro no canvas'
                  : 'Ative Vidro Líquido para mover a lente'
              }
              className={`inline-flex items-center gap-1 px-2 py-1 text-[11px] font-medium rounded transition-colors cursor-pointer whitespace-nowrap disabled:opacity-35 disabled:pointer-events-none ${
                activeTool === 'droplet'
                  ? 'bg-zinc-800 text-white'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <Droplet className="w-3 h-3" />
              <span>Lente</span>
            </button>
          </div>

          {hasCustomCharOffsets && (
            <button
              type="button"
              onClick={() => {
                setSelectedCharIndex(null);
                onChange((p) => ({
                  ...p,
                  typography: { ...p.typography, charOffsets: {} },
                }));
              }}
              className="px-2 py-1 text-[11px] font-medium text-blue-300 bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/30 rounded-md transition-colors cursor-pointer whitespace-nowrap"
            >
              Resetar Letras
            </button>
          )}
        </div>

        {/* Randomize Subtle / Aggressive & Undo / Reset */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onUndo}
            disabled={!canUndo}
            title="Desfazer última alteração"
            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-zinc-300 bg-zinc-900 hover:bg-zinc-800 disabled:opacity-35 disabled:pointer-events-none border border-zinc-800 rounded-md transition-colors cursor-pointer whitespace-nowrap"
          >
            <Undo2 className="w-3.5 h-3.5" />
            <span className="hidden md:inline">Desfazer</span>
          </button>

          <button
            type="button"
            onClick={onReset}
            title="Resetar para o padrão"
            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-zinc-300 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 rounded-md transition-colors cursor-pointer whitespace-nowrap"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>

          <div className="h-4 w-px bg-zinc-800 mx-0.5" aria-hidden="true" />

          <button
            type="button"
            onClick={onRandomizeSubtle}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-zinc-100 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 rounded-md transition-colors cursor-pointer whitespace-nowrap"
          >
            <Dices className="w-3.5 h-3.5 text-blue-400" />
            <span>Randomizar Leve</span>
          </button>

          <button
            type="button"
            onClick={onRandomizeAggressive}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-500 rounded-md transition-colors cursor-pointer whitespace-nowrap"
          >
            <Zap className="w-3.5 h-3.5" />
            <span>Randomizar Agressivo</span>
          </button>
        </div>
      </div>

      {/* Mobile/Tablet Preset Bar */}
      <div className="lg:hidden px-3 py-2 border-b border-zinc-800/80 bg-[#0D0D10] flex items-center gap-1.5 overflow-x-auto">
        {PRESETS.map((preset) => (
          <button
            key={preset.id}
            type="button"
            onClick={() => onSelectPreset(preset.id)}
            className="px-2.5 py-1 text-[11px] font-medium text-zinc-300 bg-zinc-900 hover:bg-zinc-800 rounded whitespace-nowrap shrink-0"
          >
            {preset.name}
          </button>
        ))}
      </div>

      {/* Centered Canvas Stage */}
      <div className="flex-1 min-h-0 flex items-center justify-center p-6 lg:p-8 relative overflow-hidden bg-[radial-gradient(#18181b_1px,transparent_1px)] [background-size:20px_20px]">
        <div
          className="relative flex items-center justify-center shadow-2xl shadow-black/80 ring-1 ring-white/10 overflow-hidden bg-black"
          style={{
            aspectRatio: `${dims.width} / ${dims.height}`,
            maxHeight: '100%',
            maxWidth: '100%',
            height: dims.height >= dims.width ? '100%' : 'auto',
            width: dims.width > dims.height ? '100%' : 'auto',
          }}
        >
          <canvas
            ref={canvasRef}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerLeave={handlePointerLeave}
            onWheel={handleWheel}
            onDoubleClick={handleDoubleClick}
            className={`w-full h-full block ${
              isResizingChar
                ? 'cursor-nwse-resize'
                : isDragging
                  ? 'cursor-grabbing'
                  : activeTool === 'char'
                    ? hoveredCharIndex !== null
                      ? 'cursor-grab'
                      : 'cursor-default'
                    : activeTool === 'text'
                      ? 'cursor-move'
                      : 'cursor-grab'
            }`}
          />

          {/* Non-exported visual selection box + corner resize handle */}
          {highlightedPlacement && (
            <div
              className="pointer-events-none absolute border border-blue-400/90 bg-blue-500/10 rounded-xs transition-opacity duration-75"
              style={{
                left: `${(highlightedPlacement.normX - highlightedPlacement.normHalfW) * 100}%`,
                top: `${(highlightedPlacement.normY - highlightedPlacement.normHalfH) * 100}%`,
                width: `${highlightedPlacement.normHalfW * 200}%`,
                height: `${highlightedPlacement.normHalfH * 200}%`,
              }}
            >
              <span className="absolute -top-5 left-0 px-1.5 py-0.5 text-[10px] font-mono-tabular bg-blue-600 text-white rounded-xs leading-none whitespace-nowrap">
                {highlightedPlacement.char} ·{' '}
                {(params.typography.charOffsets?.[highlightedPlacement.index]?.scale ?? 1).toFixed(2)}x
              </span>

              {/* Bottom-Right Interactive Resize Corner Handle */}
              <button
                type="button"
                aria-label={`Redimensionar caractere ${highlightedPlacement.char}`}
                onPointerDown={handleResizeHandleDown}
                onPointerMove={handleResizeHandleMove}
                onPointerUp={handleResizeHandleUp}
                className="pointer-events-auto absolute -bottom-1.5 -right-1.5 w-3.5 h-3.5 bg-white border-2 border-blue-500 rounded-xs shadow cursor-nwse-resize hover:scale-125 transition-transform"
              />
            </div>
          )}

          {contextLost && (
            <div className="absolute inset-0 bg-zinc-950/90 flex items-center justify-center p-6 text-center">
              <p className="text-xs text-zinc-300">
                Contexto WebGL2 suspenso pelo navegador. Restaurando renderização...
              </p>
            </div>
          )}
        </div>

        {/* File Drop Overlay */}
        {isDragOverFile && (
          <div className="absolute inset-4 rounded-xl border-2 border-dashed border-blue-400 bg-zinc-950/85 backdrop-blur-sm flex items-center justify-center pointer-events-none z-20">
            <p className="text-sm font-medium text-blue-200">
              Solte uma imagem ou vídeo para aplicar na composição
            </p>
          </div>
        )}
      </div>

      {/* Bottom Canvas Readout + Selected Character Scale Bar */}
      <div className="shrink-0 px-4 py-1.5 border-t border-zinc-800/80 bg-[#0C0C0F] flex flex-wrap items-center justify-between gap-3 text-[11px] text-zinc-400">
        {activeTool === 'char' && selectedCharIndex !== null && highlightedPlacement ? (
          <div className="flex items-center gap-3 w-full sm:w-auto">
            <span className="text-zinc-200 font-medium whitespace-nowrap">
              Letra <strong className="font-mono-tabular text-blue-400">{highlightedPlacement.char}</strong>
            </span>
            <div className="flex items-center gap-2 flex-1 sm:w-44">
              <span className="text-zinc-500">Escala</span>
              <input
                type="range"
                min={0.2}
                max={4.5}
                step={0.02}
                value={activeSelectedScale}
                onChange={(e) =>
                  setCharScale(selectedCharIndex, parseFloat(e.target.value))
                }
                className="studio-slider"
              />
              <span className="font-mono-tabular text-zinc-200 w-10 text-right">
                {activeSelectedScale.toFixed(2)}x
              </span>
            </div>
            <button
              type="button"
              onClick={() => {
                onChange((p) => {
                  const next = { ...p.typography.charOffsets };
                  delete next[selectedCharIndex];
                  return { ...p, typography: { ...p.typography, charOffsets: next } };
                });
              }}
              className="px-2 py-0.5 text-[11px] bg-zinc-800 hover:bg-zinc-700 text-zinc-200 rounded cursor-pointer whitespace-nowrap"
            >
              Restaurar Letra
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <span className="font-mono-tabular text-zinc-500">
              {dims.width} × {dims.height}px
            </span>
            <span aria-hidden="true" className="text-zinc-600">·</span>
            <span className="text-zinc-500">{params.typography.fontFamily}</span>
          </div>
        )}

        <span className="hidden md:inline text-zinc-500">
          {activeTool === 'char'
            ? 'Arraste uma letra para mover · Puxe a alça do canto ou use o scroll para redimensionar'
            : activeTool === 'droplet'
              ? 'Arraste no canvas para mover a lente de vidro'
              : 'Arraste no canvas para mover o texto · Duplo clique centraliza'}
        </span>
      </div>
    </main>
  );
};
