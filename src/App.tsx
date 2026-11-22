import { useCallback, useEffect, useRef, useState } from 'react';
import { CanvasViewport } from './components/CanvasViewport';
import { ExportModal } from './components/ExportModal';
import { LeftPanel } from './components/LeftPanel';
import { RightPanel } from './components/RightPanel';
import { TopBar } from './components/TopBar';
import { loadGoogleFont } from './data/googleFonts';
import { BASE_MEDIA_STATE, PRESETS } from './data/presets';
import { ShaderPipeline } from './engine/ShaderPipeline';
import { MediaElementRef } from './engine/sourceRenderer';
import { StudioParams } from './types/studio';
import { randomizeAggressive, randomizeSubtle } from './utils/randomize';

type MobilePane = 'canvas' | 'source' | 'effects';

export default function App() {
  const [activePresetId, setActivePresetId] = useState<string | null>(PRESETS[0].id);
  const [params, setParams] = useState<StudioParams>(() => structuredClone(PRESETS[0].params));
  const [history, setHistory] = useState<StudioParams[]>([]);
  const [exportOpen, setExportOpen] = useState(false);
  const [mobilePane, setMobilePane] = useState<MobilePane>('canvas');

  const pipelineRef = useRef<ShaderPipeline | null>(null);
  const timeRef = useRef<number>(0);
  const mediaRef = useRef<MediaElementRef>({ image: null, video: null });
  const objectUrlRef = useRef<string | null>(null);

  // Preload preset Google Fonts on startup
  useEffect(() => {
    PRESETS.forEach((p) => {
      loadGoogleFont(p.params.typography.fontFamily, [400, 600, 700, 800]);
    });
  }, []);

  // Ensure current font is always loaded when changed
  useEffect(() => {
    loadGoogleFont(params.typography.fontFamily, [
      300,
      400,
      500,
      600,
      700,
      800,
      900,
      params.typography.fontWeight,
    ]);
  }, [params.typography.fontFamily, params.typography.fontWeight]);

  // Cleanup object URLs on unmount
  useEffect(() => {
    return () => {
      if (objectUrlRef.current) {
        URL.revokeObjectURL(objectUrlRef.current);
      }
    };
  }, []);

  const pushHistory = useCallback((snapshot: StudioParams) => {
    setHistory((prev) => [...prev.slice(-24), structuredClone(snapshot)]);
  }, []);

  const updateParams = useCallback(
    (updater: (prev: StudioParams) => StudioParams, recordHistory = false) => {
      setParams((prev) => {
        if (recordHistory) {
          pushHistory(prev);
        }
        return updater(prev);
      });
    },
    [pushHistory]
  );

  const handleSelectPreset = useCallback(
    (presetId: string) => {
      const found = PRESETS.find((p) => p.id === presetId);
      if (!found) return;
      setActivePresetId(found.id);
      setParams((prev) => {
        pushHistory(prev);
        const next = structuredClone(found.params);
        // Preserve uploaded media if the user already loaded one and is in media/mixed mode
        if (prev.media.type !== 'none') {
          next.media = { ...prev.media };
          if (prev.compositionMode !== 'typography') {
            next.compositionMode = prev.compositionMode;
          }
        }
        return next;
      });
    },
    [pushHistory]
  );

  const handleUndo = useCallback(() => {
    setHistory((prev) => {
      if (prev.length === 0) return prev;
      const last = prev[prev.length - 1];
      setParams(last);
      setActivePresetId(null);
      return prev.slice(0, -1);
    });
  }, []);

  const handleReset = useCallback(() => {
    const targetPreset =
      PRESETS.find((p) => p.id === activePresetId) ?? PRESETS[0];
    setParams((prev) => {
      pushHistory(prev);
      return structuredClone(targetPreset.params);
    });
  }, [activePresetId, pushHistory]);

  const handleRandomizeSubtle = useCallback(() => {
    setActivePresetId(null);
    updateParams((prev) => randomizeSubtle(prev), true);
  }, [updateParams]);

  const handleRandomizeAggressive = useCallback(() => {
    setActivePresetId(null);
    updateParams((prev) => {
      const next = randomizeAggressive(prev);
      loadGoogleFont(next.typography.fontFamily, [400, 600, 700, 800, 900]);
      return next;
    }, true);
  }, [updateParams]);

  const handleUploadMedia = useCallback(
    (file: File) => {
      if (objectUrlRef.current) {
        URL.revokeObjectURL(objectUrlRef.current);
      }
      if (mediaRef.current.video) {
        mediaRef.current.video.pause();
        mediaRef.current.video.src = '';
      }

      const url = URL.createObjectURL(file);
      objectUrlRef.current = url;

      if (file.type.startsWith('video/')) {
        const video = document.createElement('video');
        video.src = url;
        video.loop = true;
        video.muted = true;
        video.playsInline = true;
        video.autoplay = true;
        video.play().catch(() => {});
        mediaRef.current = { image: null, video };

        updateParams(
          (prev) => ({
            ...prev,
            compositionMode: prev.compositionMode === 'typography' ? 'mixed' : prev.compositionMode,
            media: {
              ...prev.media,
              type: 'video',
              url,
              name: file.name,
            },
          }),
          true
        );
      } else {
        const img = new Image();
        img.src = url;
        mediaRef.current = { image: img, video: null };

        updateParams(
          (prev) => ({
            ...prev,
            compositionMode: prev.compositionMode === 'typography' ? 'mixed' : prev.compositionMode,
            media: {
              ...prev.media,
              type: 'image',
              url,
              name: file.name,
            },
          }),
          true
        );
      }
    },
    [updateParams]
  );

  const handleClearMedia = useCallback(() => {
    if (objectUrlRef.current) {
      URL.revokeObjectURL(objectUrlRef.current);
      objectUrlRef.current = null;
    }
    if (mediaRef.current.video) {
      mediaRef.current.video.pause();
      mediaRef.current.video.src = '';
    }
    mediaRef.current = { image: null, video: null };

    updateParams(
      (prev) => ({
        ...prev,
        compositionMode: 'typography',
        media: { ...BASE_MEDIA_STATE },
      }),
      true
    );
  }, [updateParams]);

  return (
    <div className="h-screen w-screen flex flex-col bg-[#09090B] text-zinc-100 overflow-hidden">
      <TopBar
        activePresetId={activePresetId}
        onSelectPreset={handleSelectPreset}
        onOpenExport={() => setExportOpen(true)}
      />

      {/* Desktop 3-Column Studio Layout + Mobile Pane Switching */}
      <div className="flex-1 min-h-0 flex overflow-hidden">
        <div
          className={`${
            mobilePane === 'source' ? 'flex w-full md:w-auto' : 'hidden md:flex'
          } h-full shrink-0`}
        >
          <LeftPanel
            params={params}
            onChange={(fn) => updateParams(fn, false)}
            onUploadMedia={handleUploadMedia}
            onClearMedia={handleClearMedia}
          />
        </div>

        <div
          className={`${
            mobilePane === 'canvas' ? 'flex' : 'hidden md:flex'
          } flex-1 min-w-0 h-full`}
        >
          <CanvasViewport
            params={params}
            mediaRef={mediaRef}
            pipelineRef={pipelineRef}
            timeRef={timeRef}
            canUndo={history.length > 0}
            onUndo={handleUndo}
            onReset={handleReset}
            onRandomizeSubtle={handleRandomizeSubtle}
            onRandomizeAggressive={handleRandomizeAggressive}
            onChange={(fn) => updateParams(fn, false)}
            onSelectPreset={handleSelectPreset}
            onDropMediaFile={handleUploadMedia}
          />
        </div>

        <div
          className={`${
            mobilePane === 'effects' ? 'flex w-full md:w-auto' : 'hidden lg:flex'
          } h-full shrink-0`}
        >
          <RightPanel params={params} onChange={(fn) => updateParams(fn, false)} />
        </div>
      </div>

      {/* Compact Mobile/Tablet Bottom Switcher */}
      <nav
        aria-label="Painéis do estúdio"
        className="lg:hidden shrink-0 grid grid-cols-3 border-t border-zinc-800 bg-[#0D0D10]"
      >
        {(
          [
            { id: 'source', label: 'Fonte & Texto' },
            { id: 'canvas', label: 'Canvas' },
            { id: 'effects', label: 'Efeitos' },
          ] as { id: MobilePane; label: string }[]
        ).map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => setMobilePane(item.id)}
            className={`py-2.5 text-xs font-medium transition-colors cursor-pointer ${
              mobilePane === item.id
                ? 'text-white bg-zinc-800/70'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            {item.label}
          </button>
        ))}
      </nav>

      <ExportModal
        isOpen={exportOpen}
        onClose={() => setExportOpen(false)}
        params={params}
        mediaRef={mediaRef}
        pipelineRef={pipelineRef}
        timeRef={timeRef}
      />
    </div>
  );
}
