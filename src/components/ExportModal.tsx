import React, { useMemo, useRef, useState } from 'react';
import { Download, Film, Image as ImageIcon, Loader2, X } from 'lucide-react';
import { ShaderPipeline } from '../engine/ShaderPipeline';
import { getAspectDimensions, MediaElementRef } from '../engine/sourceRenderer';
import { StudioParams } from '../types/studio';

interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  params: StudioParams;
  mediaRef: React.MutableRefObject<MediaElementRef>;
  pipelineRef: React.MutableRefObject<ShaderPipeline | null>;
  timeRef: React.MutableRefObject<number>;
}

type ExportTab = 'image' | 'video';

const STATIC_SCALES = [
  { id: '1x', label: 'HD (1080p)', baseLong: 1080 },
  { id: '2x', label: '2x Retina (2160p)', baseLong: 2160 },
  { id: '3x', label: 'Ultra 3x (3240p)', baseLong: 3240 },
  { id: '4k', label: '4K Máximo (3840p)', baseLong: 3840 },
];

const VIDEO_RES = [
  { id: '1080', label: 'Full HD (1080p)', baseLong: 1080 },
  { id: '1440', label: '2K QHD (1440p)', baseLong: 1440 },
  { id: '2160', label: '4K UHD (2160p)', baseLong: 2160 },
];

function pickSupportedVideoMime(): { mime: string; ext: 'mp4' | 'webm' } {
  const candidates: { mime: string; ext: 'mp4' | 'webm' }[] = [
    { mime: 'video/mp4;codecs=avc1.42E01E', ext: 'mp4' },
    { mime: 'video/mp4', ext: 'mp4' },
    { mime: 'video/webm;codecs=vp9', ext: 'webm' },
    { mime: 'video/webm;codecs=vp8', ext: 'webm' },
    { mime: 'video/webm', ext: 'webm' },
  ];
  for (const c of candidates) {
    if (typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported(c.mime)) {
      return c;
    }
  }
  return { mime: 'video/webm', ext: 'webm' };
}

function triggerDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 4000);
}

export const ExportModal: React.FC<ExportModalProps> = ({
  isOpen,
  onClose,
  params,
  mediaRef,
  pipelineRef,
  timeRef,
}) => {
  const [tab, setTab] = useState<ExportTab>('image');
  const [staticScaleId, setStaticScaleId] = useState('2x');
  const [imageFormat, setImageFormat] = useState<'image/png' | 'image/jpeg'>('image/png');

  const [videoResId, setVideoResId] = useState('1080');
  const [videoFps, setVideoFps] = useState<30 | 60>(30);
  const [videoDuration, setVideoDuration] = useState<number>(5);
  const [videoBitrateMbps, setVideoBitrateMbps] = useState<number>(18);

  const [isExporting, setIsExporting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const abortRef = useRef(false);

  const staticDims = useMemo(() => {
    const found = STATIC_SCALES.find((s) => s.id === staticScaleId) ?? STATIC_SCALES[1];
    return getAspectDimensions(params.aspectRatio, found.baseLong);
  }, [params.aspectRatio, staticScaleId]);

  const videoDims = useMemo(() => {
    const found = VIDEO_RES.find((s) => s.id === videoResId) ?? VIDEO_RES[0];
    return getAspectDimensions(params.aspectRatio, found.baseLong);
  }, [params.aspectRatio, videoResId]);

  if (!isOpen) return null;

  const handleExportStatic = async () => {
    const pipeline = pipelineRef.current;
    if (!pipeline) return;

    setIsExporting(true);
    setErrorMsg(null);

    try {
      const blob = await pipeline.exportStaticBlob(
        staticDims.width,
        staticDims.height,
        params,
        mediaRef.current,
        timeRef.current,
        imageFormat
      );
      const ext = imageFormat === 'image/png' ? 'png' : 'jpg';
      const stamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-');
      triggerDownload(blob, `optiklab-${staticDims.width}x${staticDims.height}-${stamp}.${ext}`);
      onClose();
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Erro ao exportar imagem.');
    } finally {
      setIsExporting(false);
    }
  };

  const handleExportVideo = async () => {
    if (typeof MediaRecorder === 'undefined') {
      setErrorMsg('Este navegador não suporta gravação de vídeo via MediaRecorder.');
      return;
    }

    setIsExporting(true);
    setProgress(0);
    setErrorMsg(null);
    abortRef.current = false;

    const offscreen = document.createElement('canvas');
    offscreen.width = videoDims.width;
    offscreen.height = videoDims.height;

    let tempPipeline: ShaderPipeline | null = null;

    try {
      tempPipeline = new ShaderPipeline(offscreen);
      const { mime, ext } = pickSupportedVideoMime();

      // Render first frame before starting stream
      let simTime = timeRef.current;
      tempPipeline.renderFrame(
        videoDims.width,
        videoDims.height,
        params,
        mediaRef.current,
        simTime
      );

      const stream = offscreen.captureStream(videoFps);
      const recorder = new MediaRecorder(stream, {
        mimeType: mime,
        videoBitsPerSecond: videoBitrateMbps * 1_000_000,
      });

      const chunks: BlobPart[] = [];
      recorder.ondataavailable = (ev) => {
        if (ev.data && ev.data.size > 0) chunks.push(ev.data);
      };

      const donePromise = new Promise<Blob>((resolve, reject) => {
        recorder.onstop = () => {
          resolve(new Blob(chunks, { type: mime }));
        };
        recorder.onerror = () => {
          reject(new Error('Falha durante a codificação do vídeo.'));
        };
      });

      recorder.start(200);

      const startWall = performance.now();
      const totalMs = videoDuration * 1000;
      const frameIntervalMs = 1000 / videoFps;

      await new Promise<void>((resolve) => {
        let lastFrameTime = startWall;

        const step = (now: number) => {
          if (abortRef.current) {
            resolve();
            return;
          }
          const elapsed = now - startWall;
          const pct = Math.min(100, Math.round((elapsed / totalMs) * 100));
          setProgress(pct);

          if (now - lastFrameTime >= frameIntervalMs * 0.85) {
            const dt = (now - lastFrameTime) / 1000;
            lastFrameTime = now;
            simTime += dt * Math.max(0.25, params.animationSpeed);
            tempPipeline?.renderFrame(
              videoDims.width,
              videoDims.height,
              params,
              mediaRef.current,
              simTime
            );
          }

          if (elapsed >= totalMs) {
            setProgress(100);
            resolve();
          } else {
            requestAnimationFrame(step);
          }
        };

        requestAnimationFrame(step);
      });

      recorder.stop();
      stream.getTracks().forEach((t) => t.stop());

      if (!abortRef.current) {
        const videoBlob = await donePromise;
        const stamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-');
        triggerDownload(
          videoBlob,
          `optiklab-${videoDims.width}x${videoDims.height}-${videoDuration}s-${stamp}.${ext}`
        );
        onClose();
      }
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Erro ao exportar vídeo.');
    } finally {
      tempPipeline?.dispose();
      setIsExporting(false);
      setProgress(0);
    }
  };

  const handleCancel = () => {
    if (isExporting) {
      abortRef.current = true;
    } else {
      onClose();
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="export-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4"
    >
      <div className="w-full max-w-md bg-[#121216] border border-zinc-800 rounded-xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-800">
          <h2 id="export-modal-title" className="text-sm font-semibold text-zinc-100">
            Exportar Mídia em Alta Resolução
          </h2>
          <button
            type="button"
            onClick={handleCancel}
            aria-label="Fechar"
            className="text-zinc-400 hover:text-zinc-100 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Mode Tabs */}
        <div className="px-5 pt-4">
          <div className="grid grid-cols-2 gap-1 p-1 bg-zinc-900 rounded-lg border border-zinc-800">
            <button
              type="button"
              disabled={isExporting}
              onClick={() => setTab('image')}
              className={`flex items-center justify-center gap-2 py-2 px-3 rounded-md text-xs font-medium transition-colors cursor-pointer ${
                tab === 'image' ? 'bg-zinc-800 text-white' : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <ImageIcon className="w-3.5 h-3.5" />
              <span>Imagem Estática</span>
            </button>
            <button
              type="button"
              disabled={isExporting}
              onClick={() => setTab('video')}
              className={`flex items-center justify-center gap-2 py-2 px-3 rounded-md text-xs font-medium transition-colors cursor-pointer ${
                tab === 'video' ? 'bg-zinc-800 text-white' : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <Film className="w-3.5 h-3.5" />
              <span>Vídeo Animado</span>
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="p-5 space-y-4">
          {tab === 'image' ? (
            <>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-zinc-300">Resolução de Saída</label>
                <div className="grid grid-cols-2 gap-2">
                  {STATIC_SCALES.map((s) => (
                    <button
                      key={s.id}
                      type="button"
                      disabled={isExporting}
                      onClick={() => setStaticScaleId(s.id)}
                      className={`px-3 py-2 rounded-md border text-left transition-colors cursor-pointer ${
                        staticScaleId === s.id
                          ? 'bg-zinc-800 border-blue-500/70 text-white'
                          : 'bg-zinc-900/70 border-zinc-800 text-zinc-400 hover:text-zinc-200'
                      }`}
                    >
                      <div className="text-xs font-medium">{s.label}</div>
                    </button>
                  ))}
                </div>
                <p className="text-[11px] font-mono-tabular text-zinc-500 pt-0.5">
                  Dimensões finais: {staticDims.width} × {staticDims.height} px
                </p>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-zinc-300">Formato do Arquivo</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    disabled={isExporting}
                    onClick={() => setImageFormat('image/png')}
                    className={`px-3 py-2 rounded-md border text-xs font-medium cursor-pointer ${
                      imageFormat === 'image/png'
                        ? 'bg-zinc-800 border-blue-500/70 text-white'
                        : 'bg-zinc-900/70 border-zinc-800 text-zinc-400'
                    }`}
                  >
                    PNG (Sem Perdas)
                  </button>
                  <button
                    type="button"
                    disabled={isExporting}
                    onClick={() => setImageFormat('image/jpeg')}
                    className={`px-3 py-2 rounded-md border text-xs font-medium cursor-pointer ${
                      imageFormat === 'image/jpeg'
                        ? 'bg-zinc-800 border-blue-500/70 text-white'
                        : 'bg-zinc-900/70 border-zinc-800 text-zinc-400'
                    }`}
                  >
                    JPEG (96% Qualidade)
                  </button>
                </div>
              </div>
            </>
          ) : (
            <>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-zinc-300">Resolução do Vídeo</label>
                <div className="grid grid-cols-3 gap-2">
                  {VIDEO_RES.map((r) => (
                    <button
                      key={r.id}
                      type="button"
                      disabled={isExporting}
                      onClick={() => setVideoResId(r.id)}
                      className={`px-2.5 py-2 rounded-md border text-center text-xs font-medium cursor-pointer ${
                        videoResId === r.id
                          ? 'bg-zinc-800 border-blue-500/70 text-white'
                          : 'bg-zinc-900/70 border-zinc-800 text-zinc-400'
                      }`}
                    >
                      {r.id === '1080' ? '1080p' : r.id === '1440' ? '2K' : '4K'}
                    </button>
                  ))}
                </div>
                <p className="text-[11px] font-mono-tabular text-zinc-500">
                  Resolução: {videoDims.width} × {videoDims.height} px
                </p>
              </div>

              <div className="grid grid-cols-3 gap-2.5">
                <div className="space-y-1">
                  <label className="text-[11px] text-zinc-400">Duração</label>
                  <select
                    disabled={isExporting}
                    value={videoDuration}
                    onChange={(e) => setVideoDuration(Number(e.target.value))}
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-md px-2 py-1.5 text-xs text-zinc-200 font-mono-tabular"
                  >
                    <option value={3}>3 seg</option>
                    <option value={5}>5 seg</option>
                    <option value={8}>8 seg</option>
                    <option value={10}>10 seg</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] text-zinc-400">Taxa (FPS)</label>
                  <select
                    disabled={isExporting}
                    value={videoFps}
                    onChange={(e) => setVideoFps(Number(e.target.value) as 30 | 60)}
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-md px-2 py-1.5 text-xs text-zinc-200 font-mono-tabular"
                  >
                    <option value={30}>30 FPS</option>
                    <option value={60}>60 FPS</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] text-zinc-400">Bitrate</label>
                  <select
                    disabled={isExporting}
                    value={videoBitrateMbps}
                    onChange={(e) => setVideoBitrateMbps(Number(e.target.value))}
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-md px-2 py-1.5 text-xs text-zinc-200 font-mono-tabular"
                  >
                    <option value={12}>12 Mbps</option>
                    <option value={18}>18 Mbps</option>
                    <option value={28}>28 Mbps</option>
                  </select>
                </div>
              </div>

              {isExporting && (
                <div className="space-y-1.5 pt-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-zinc-300">Renderizando e gravando quadros...</span>
                    <span className="font-mono-tabular text-blue-400">{progress}%</span>
                  </div>
                  <div className="w-full h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-blue-500 transition-all duration-150"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                </div>
              )}
            </>
          )}

          {errorMsg && (
            <p className="text-xs text-red-400 bg-red-950/40 border border-red-900/60 rounded-md px-3 py-2">
              {errorMsg}
            </p>
          )}
        </div>

        {/* Footer Actions */}
        <div className="px-5 py-3.5 bg-zinc-950/60 border-t border-zinc-800 flex items-center justify-end gap-2.5">
          <button
            type="button"
            onClick={handleCancel}
            className="px-3.5 py-2 text-xs font-medium text-zinc-300 hover:text-white bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 rounded-md transition-colors cursor-pointer"
          >
            {isExporting ? 'Cancelar' : 'Fechar'}
          </button>

          <button
            type="button"
            disabled={isExporting}
            onClick={tab === 'image' ? handleExportStatic : handleExportVideo}
            className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-zinc-950 bg-zinc-100 hover:bg-white disabled:opacity-50 rounded-md transition-colors cursor-pointer"
          >
            {isExporting ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Processando...</span>
              </>
            ) : (
              <>
                <Download className="w-3.5 h-3.5" />
                <span>{tab === 'image' ? 'Baixar Imagem' : 'Gravar e Baixar Vídeo'}</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
