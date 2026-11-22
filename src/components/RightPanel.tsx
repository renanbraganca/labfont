import React, { useState } from 'react';
import { HalftoneShape, StudioParams } from '../types/studio';
import { ColorField, ModuleToggleHeader, SliderControl } from './ui/StudioControls';

interface RightPanelProps {
  params: StudioParams;
  onChange: (updater: (prev: StudioParams) => StudioParams) => void;
}

type ModuleKey = 'droplet' | 'warp' | 'streaks' | 'defocus' | 'halftone' | 'grade';

export const RightPanel: React.FC<RightPanelProps> = ({ params, onChange }) => {
  const [expanded, setExpanded] = useState<Record<ModuleKey, boolean>>({
    droplet: true,
    warp: true,
    streaks: true,
    defocus: false,
    halftone: false,
    grade: true,
  });

  const toggleExpand = (key: ModuleKey) => {
    setExpanded((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  return (
    <aside className="w-[310px] xl:w-[330px] shrink-0 h-full bg-[#101014] border-l border-zinc-800/90 flex flex-col overflow-hidden">
      <div className="px-4 py-3 border-b border-zinc-800/80 flex items-center justify-between shrink-0">
        <span className="text-xs font-semibold text-zinc-100">Parâmetros Ópticos</span>
        <span className="text-[11px] text-zinc-500">WebGL2</span>
      </div>

      <div className="flex-1 overflow-y-auto divide-y divide-zinc-800/80">
        {/* 1. LIQUID GLASS DROPLET */}
        <div>
          <ModuleToggleHeader
            title="Vidro Líquido & Dispersão"
            subtitle="Lente refrativa prismática"
            enabled={params.droplet.enabled}
            expanded={expanded.droplet}
            onExpandToggle={() => toggleExpand('droplet')}
            onToggle={(next) => {
              onChange((p) => ({ ...p, droplet: { ...p.droplet, enabled: next } }));
              if (next) setExpanded((e) => ({ ...e, droplet: true }));
            }}
          />
          {expanded.droplet && (
            <div className="px-4 pb-4 space-y-3">
              <SliderControl
                label="Raio da Lente"
                value={params.droplet.radius}
                min={0.06}
                max={0.52}
                step={0.01}
                onChange={(v) =>
                  onChange((p) => ({ ...p, droplet: { ...p.droplet, radius: v } }))
                }
              />
              <SliderControl
                label="Organicidade (Blob)"
                value={params.droplet.blobiness}
                min={0}
                max={1.1}
                step={0.01}
                onChange={(v) =>
                  onChange((p) => ({ ...p, droplet: { ...p.droplet, blobiness: v } }))
                }
              />
              <SliderControl
                label="Refração Óptica"
                value={params.droplet.refraction}
                min={0}
                max={1.2}
                step={0.01}
                onChange={(v) =>
                  onChange((p) => ({ ...p, droplet: { ...p.droplet, refraction: v } }))
                }
              />
              <SliderControl
                label="Dispersão Cromática RGB"
                value={params.droplet.dispersion}
                min={0}
                max={1.4}
                step={0.01}
                onChange={(v) =>
                  onChange((p) => ({ ...p, droplet: { ...p.droplet, dispersion: v } }))
                }
              />
              <SliderControl
                label="Brilho Especular & Fresnel"
                value={params.droplet.specular}
                min={0}
                max={1.3}
                step={0.01}
                onChange={(v) =>
                  onChange((p) => ({ ...p, droplet: { ...p.droplet, specular: v } }))
                }
              />
              <SliderControl
                label="Translucidez (Transmissão)"
                value={params.droplet.translucency}
                min={0.1}
                max={1.0}
                step={0.01}
                onChange={(v) =>
                  onChange((p) => ({ ...p, droplet: { ...p.droplet, translucency: v } }))
                }
              />
              <SliderControl
                label="Vidro Fosco (Frost)"
                value={params.droplet.frost}
                min={0}
                max={1.0}
                step={0.01}
                onChange={(v) =>
                  onChange((p) => ({ ...p, droplet: { ...p.droplet, frost: v } }))
                }
              />
              <SliderControl
                label="Quantidade de Gotas"
                value={params.droplet.count}
                min={1}
                max={3}
                step={1}
                onChange={(v) =>
                  onChange((p) => ({ ...p, droplet: { ...p.droplet, count: Math.round(v) } }))
                }
              />
              <label className="flex items-center justify-between text-xs text-zinc-300 cursor-pointer pt-0.5">
                <span>Órbita Orgânica Contínua</span>
                <input
                  type="checkbox"
                  checked={params.droplet.animateOrbit}
                  onChange={(e) =>
                    onChange((p) => ({
                      ...p,
                      droplet: { ...p.droplet, animateOrbit: e.target.checked },
                    }))
                  }
                  className="rounded border-zinc-700 bg-zinc-900 text-blue-500"
                />
              </label>
              <p className="text-[11px] text-zinc-500">
                Arraste diretamente sobre o canvas para posicionar a lente.
              </p>
            </div>
          )}
        </div>

        {/* 2. LIQUID WAVE WARP */}
        <div>
          <ModuleToggleHeader
            title="Distorção Líquida & Onda"
            subtitle="Superfície hiperbólica e RGB"
            enabled={params.warp.enabled}
            expanded={expanded.warp}
            onExpandToggle={() => toggleExpand('warp')}
            onToggle={(next) => {
              onChange((p) => ({ ...p, warp: { ...p.warp, enabled: next } }));
              if (next) setExpanded((e) => ({ ...e, warp: true }));
            }}
          />
          {expanded.warp && (
            <div className="px-4 pb-4 space-y-3">
              <SliderControl
                label="Amplitude da Distorção"
                value={params.warp.amplitude}
                min={0}
                max={1.0}
                step={0.01}
                onChange={(v) => onChange((p) => ({ ...p, warp: { ...p.warp, amplitude: v } }))}
              />
              <SliderControl
                label="Frequência da Malha"
                value={params.warp.frequency}
                min={0.5}
                max={8.0}
                step={0.05}
                onChange={(v) => onChange((p) => ({ ...p, warp: { ...p.warp, frequency: v } }))}
              />
              <SliderControl
                label="Velocidade do Fluxo"
                value={params.warp.speed}
                min={0}
                max={2.0}
                step={0.02}
                onChange={(v) => onChange((p) => ({ ...p, warp: { ...p.warp, speed: v } }))}
              />
              <SliderControl
                label="Separação RGB"
                value={params.warp.chromaticSplit}
                min={0}
                max={1.4}
                step={0.01}
                onChange={(v) =>
                  onChange((p) => ({ ...p, warp: { ...p.warp, chromaticSplit: v } }))
                }
              />
              <SliderControl
                label="Brilho Especular"
                value={params.warp.glossHighlight}
                min={0}
                max={1.2}
                step={0.01}
                onChange={(v) =>
                  onChange((p) => ({ ...p, warp: { ...p.warp, glossHighlight: v } }))
                }
              />
              <SliderControl
                label="Pinça Radial"
                value={params.warp.pinch}
                min={-1.0}
                max={1.0}
                step={0.02}
                onChange={(v) => onChange((p) => ({ ...p, warp: { ...p.warp, pinch: v } }))}
              />
            </div>
          )}
        </div>

        {/* 3. DIRECTIONAL STREAKS */}
        <div>
          <ModuleToggleHeader
            title="Feixes Direcionais"
            subtitle="Rastros luminosos e bloom"
            enabled={params.streaks.enabled}
            expanded={expanded.streaks}
            onExpandToggle={() => toggleExpand('streaks')}
            onToggle={(next) => {
              onChange((p) => ({ ...p, streaks: { ...p.streaks, enabled: next } }));
              if (next) setExpanded((e) => ({ ...e, streaks: true }));
            }}
          />
          {expanded.streaks && (
            <div className="px-4 pb-4 space-y-3">
              <SliderControl
                label="Intensidade"
                value={params.streaks.intensity}
                min={0}
                max={1.6}
                step={0.01}
                onChange={(v) =>
                  onChange((p) => ({ ...p, streaks: { ...p.streaks, intensity: v } }))
                }
              />
              <SliderControl
                label="Comprimento do Rastro"
                value={params.streaks.length}
                min={0.05}
                max={1.0}
                step={0.01}
                onChange={(v) =>
                  onChange((p) => ({ ...p, streaks: { ...p.streaks, length: v } }))
                }
              />
              <SliderControl
                label="Ângulo"
                value={params.streaks.angle}
                min={0}
                max={360}
                step={1}
                unit="°"
                onChange={(v) =>
                  onChange((p) => ({ ...p, streaks: { ...p.streaks, angle: v } }))
                }
              />
              <SliderControl
                label="Limiar de Luminância"
                value={params.streaks.threshold}
                min={0.05}
                max={0.95}
                step={0.01}
                onChange={(v) =>
                  onChange((p) => ({ ...p, streaks: { ...p.streaks, threshold: v } }))
                }
              />
              <label className="flex items-center justify-between text-xs text-zinc-300 cursor-pointer">
                <span>Feixe Bidirecional</span>
                <input
                  type="checkbox"
                  checked={params.streaks.bidirectional}
                  onChange={(e) =>
                    onChange((p) => ({
                      ...p,
                      streaks: { ...p.streaks, bidirectional: e.target.checked },
                    }))
                  }
                  className="rounded border-zinc-700 bg-zinc-900 text-blue-500"
                />
              </label>
            </div>
          )}
        </div>

        {/* 4. OPTICAL DEFOCUS & INK MELT */}
        <div>
          <ModuleToggleHeader
            title="Desfoque Óptico & Fusão"
            subtitle="Bokeh focal e fusão metaball"
            enabled={params.defocus.enabled}
            expanded={expanded.defocus}
            onExpandToggle={() => toggleExpand('defocus')}
            onToggle={(next) => {
              onChange((p) => ({ ...p, defocus: { ...p.defocus, enabled: next } }));
              if (next) setExpanded((e) => ({ ...e, defocus: true }));
            }}
          />
          {expanded.defocus && (
            <div className="px-4 pb-4 space-y-3">
              <SliderControl
                label="Desfoque Óptico"
                value={params.defocus.blurAmount}
                min={0}
                max={1.0}
                step={0.01}
                onChange={(v) =>
                  onChange((p) => ({ ...p, defocus: { ...p.defocus, blurAmount: v } }))
                }
              />
              <SliderControl
                label="Plano Focal (Tilt-Shift)"
                value={params.defocus.tiltShift}
                min={0}
                max={1.0}
                step={0.01}
                onChange={(v) =>
                  onChange((p) => ({ ...p, defocus: { ...p.defocus, tiltShift: v } }))
                }
              />
              <SliderControl
                label="Fusão de Tinta (Ink Melt)"
                value={params.defocus.inkMelt}
                min={0}
                max={1.0}
                step={0.01}
                onChange={(v) =>
                  onChange((p) => ({ ...p, defocus: { ...p.defocus, inkMelt: v } }))
                }
              />
              <SliderControl
                label="Limiar Metaball"
                value={params.defocus.meltThreshold}
                min={0}
                max={1.0}
                step={0.01}
                onChange={(v) =>
                  onChange((p) => ({ ...p, defocus: { ...p.defocus, meltThreshold: v } }))
                }
              />
            </div>
          )}
        </div>

        {/* 5. HALFTONE DOT MATRIX */}
        <div>
          <ModuleToggleHeader
            title="Retícula Halftone"
            subtitle="Matriz de pontos e tramas"
            enabled={params.halftone.enabled}
            expanded={expanded.halftone}
            onExpandToggle={() => toggleExpand('halftone')}
            onToggle={(next) => {
              onChange((p) => ({ ...p, halftone: { ...p.halftone, enabled: next } }));
              if (next) setExpanded((e) => ({ ...e, halftone: true }));
            }}
          />
          {expanded.halftone && (
            <div className="px-4 pb-4 space-y-3">
              <SliderControl
                label="Mistura da Retícula"
                value={params.halftone.mix}
                min={0}
                max={1.0}
                step={0.01}
                onChange={(v) =>
                  onChange((p) => ({ ...p, halftone: { ...p.halftone, mix: v } }))
                }
              />
              <SliderControl
                label="Tamanho da Célula"
                value={params.halftone.dotSize}
                min={3}
                max={28}
                step={1}
                unit="px"
                onChange={(v) =>
                  onChange((p) => ({ ...p, halftone: { ...p.halftone, dotSize: v } }))
                }
              />
              <SliderControl
                label="Ângulo da Trama"
                value={params.halftone.angle}
                min={0}
                max={180}
                step={1}
                unit="°"
                onChange={(v) =>
                  onChange((p) => ({ ...p, halftone: { ...p.halftone, angle: v } }))
                }
              />
              <SliderControl
                label="Contraste do Ponto"
                value={params.halftone.contrast}
                min={0.1}
                max={1.0}
                step={0.01}
                onChange={(v) =>
                  onChange((p) => ({ ...p, halftone: { ...p.halftone, contrast: v } }))
                }
              />
              <div className="space-y-1">
                <span className="text-xs font-medium text-zinc-300">Formato do Elemento</span>
                <div className="grid grid-cols-3 gap-1 p-1 bg-zinc-900 rounded-md border border-zinc-800/80">
                  {(
                    [
                      { id: 'circle', label: 'Círculo' },
                      { id: 'diamond', label: 'Losango' },
                      { id: 'line', label: 'Linha' },
                    ] as { id: HalftoneShape; label: string }[]
                  ).map((s) => (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() =>
                        onChange((p) => ({ ...p, halftone: { ...p.halftone, shape: s.id } }))
                      }
                      className={`py-1 px-2 rounded text-[11px] font-medium cursor-pointer ${
                        params.halftone.shape === s.id
                          ? 'bg-zinc-800 text-white'
                          : 'text-zinc-400 hover:text-zinc-200'
                      }`}
                    >
                      {s.label}
                    </button>
                  ))}
                </div>
              </div>

              <label className="flex items-center justify-between text-xs text-zinc-300 cursor-pointer pt-1">
                <span>Cores Personalizadas</span>
                <input
                  type="checkbox"
                  checked={params.halftone.useCustomColors}
                  onChange={(e) =>
                    onChange((p) => ({
                      ...p,
                      halftone: { ...p.halftone, useCustomColors: e.target.checked },
                    }))
                  }
                  className="rounded border-zinc-700 bg-zinc-900 text-blue-500"
                />
              </label>
              {params.halftone.useCustomColors && (
                <div className="space-y-2.5">
                  <ColorField
                    label="Cor do Ponto"
                    value={params.halftone.foregroundColor}
                    onChange={(hex) =>
                      onChange((p) => ({
                        ...p,
                        halftone: { ...p.halftone, foregroundColor: hex },
                      }))
                    }
                  />
                  <ColorField
                    label="Cor da Base"
                    value={params.halftone.backgroundColor}
                    onChange={(hex) =>
                      onChange((p) => ({
                        ...p,
                        halftone: { ...p.halftone, backgroundColor: hex },
                      }))
                    }
                  />
                </div>
              )}
            </div>
          )}
        </div>

        {/* 6. FILM GRAIN & COLOR GRADE */}
        <div className="p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-semibold text-zinc-100">Grão Estocástico & Tom</h2>
            <button
              type="button"
              onClick={() =>
                onChange((p) => ({
                  ...p,
                  grade: { ...p.grade, invert: !p.grade.invert },
                }))
              }
              className={`px-2 py-0.5 text-[11px] font-medium rounded border transition-colors cursor-pointer ${
                params.grade.invert
                  ? 'bg-zinc-100 text-zinc-950 border-zinc-100'
                  : 'bg-transparent border-zinc-800 text-zinc-400 hover:text-zinc-200'
              }`}
            >
              Inverter
            </button>
          </div>
          <SliderControl
            label="Intensidade do Grão"
            value={params.grade.grainAmount}
            min={0}
            max={1.0}
            step={0.01}
            onChange={(v) => onChange((p) => ({ ...p, grade: { ...p.grade, grainAmount: v } }))}
          />
          <SliderControl
            label="Escala do Grão"
            value={params.grade.grainSize}
            min={1.0}
            max={4.0}
            step={0.1}
            unit="px"
            onChange={(v) => onChange((p) => ({ ...p, grade: { ...p.grade, grainSize: v } }))}
          />
          <SliderControl
            label="Contraste Global"
            value={params.grade.contrast}
            min={0.6}
            max={1.8}
            step={0.01}
            onChange={(v) => onChange((p) => ({ ...p, grade: { ...p.grade, contrast: v } }))}
          />
          <SliderControl
            label="Brilho"
            value={params.grade.brightness}
            min={-0.3}
            max={0.3}
            step={0.01}
            onChange={(v) => onChange((p) => ({ ...p, grade: { ...p.grade, brightness: v } }))}
          />
        </div>
      </div>
    </aside>
  );
};
