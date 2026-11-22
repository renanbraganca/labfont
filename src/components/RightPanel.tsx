import React, { useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { BlurZone, HalftoneShape, StudioParams } from '../types/studio';
import { ColorField, ModuleToggleHeader, SliderControl } from './ui/StudioControls';

interface RightPanelProps {
  params: StudioParams;
  onChange: (updater: (prev: StudioParams) => StudioParams) => void;
}

type ModuleKey = 'warp' | 'streaks' | 'defocus' | 'halftone' | 'grade';

export const RightPanel: React.FC<RightPanelProps> = ({ params, onChange }) => {
  const [expanded, setExpanded] = useState<Record<ModuleKey, boolean>>({
    warp: true,
    streaks: true,
    defocus: true,
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
        {/* 1. LIQUID WAVE WARP */}
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
            <div className="px-4 pb-4 space-y-3.5">
              <SliderControl
                label="% de Uso do Efeito"
                value={params.defocus.mix}
                min={0}
                max={1.0}
                step={0.01}
                formatValue={(v) => `${Math.round(v * 100)}%`}
                onChange={(v) =>
                  onChange((p) => ({ ...p, defocus: { ...p.defocus, mix: v } }))
                }
              />
              <SliderControl
                label="Intensidade do Desfoque"
                value={params.defocus.blurAmount}
                min={0}
                max={1.0}
                step={0.01}
                formatValue={(v) => `${Math.round(v * 100)}%`}
                onChange={(v) =>
                  onChange((p) => ({ ...p, defocus: { ...p.defocus, blurAmount: v } }))
                }
              />

              {/* Zone Mode Selector */}
              <div className="space-y-1.5">
                <span className="text-xs font-medium text-zinc-300">Onde Aplicar</span>
                <div className="grid grid-cols-2 gap-1 p-1 bg-zinc-900 rounded-md border border-zinc-800/80">
                  <button
                    type="button"
                    onClick={() =>
                      onChange((p) => ({
                        ...p,
                        defocus: { ...p.defocus, zoneMode: 'full' },
                      }))
                    }
                    className={`py-1 px-2 rounded text-[11px] font-medium transition-colors cursor-pointer ${
                      params.defocus.zoneMode === 'full'
                        ? 'bg-zinc-800 text-white'
                        : 'text-zinc-400 hover:text-zinc-200'
                    }`}
                  >
                    Tela Inteira
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      onChange((p) => ({
                        ...p,
                        defocus: { ...p.defocus, zoneMode: 'zones' },
                      }))
                    }
                    className={`py-1 px-2 rounded text-[11px] font-medium transition-colors cursor-pointer ${
                      params.defocus.zoneMode === 'zones'
                        ? 'bg-zinc-800 text-white'
                        : 'text-zinc-400 hover:text-zinc-200'
                    }`}
                  >
                    Zonas de Desfoque
                  </button>
                </div>
              </div>

              {params.defocus.zoneMode === 'zones' && (
                <div className="space-y-3 pt-1">
                  <div className="space-y-1.5">
                    <span className="text-[11px] text-zinc-400">Comportamento das Zonas</span>
                    <div className="grid grid-cols-2 gap-1 p-1 bg-zinc-900 rounded-md border border-zinc-800/80">
                      <button
                        type="button"
                        onClick={() =>
                          onChange((p) => ({
                            ...p,
                            defocus: { ...p.defocus, invertZones: false },
                          }))
                        }
                        className={`py-1 px-2 rounded text-[11px] font-medium transition-colors cursor-pointer ${
                          !params.defocus.invertZones
                            ? 'bg-zinc-800 text-white'
                            : 'text-zinc-400 hover:text-zinc-200'
                        }`}
                      >
                        Desfocar Zonas
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          onChange((p) => ({
                            ...p,
                            defocus: { ...p.defocus, invertZones: true },
                          }))
                        }
                        className={`py-1 px-2 rounded text-[11px] font-medium transition-colors cursor-pointer ${
                          params.defocus.invertZones
                            ? 'bg-zinc-800 text-white'
                            : 'text-zinc-400 hover:text-zinc-200'
                        }`}
                      >
                        Nítido nas Zonas
                      </button>
                    </div>
                  </div>

                  {/* Zones List */}
                  <div className="space-y-2.5 divide-y divide-zinc-800/70">
                    {params.defocus.zones.map((zone, idx) => {
                      const updateZone = (patch: Partial<BlurZone>) => {
                        onChange((p) => ({
                          ...p,
                          defocus: {
                            ...p.defocus,
                            zones: p.defocus.zones.map((z) =>
                              z.id === zone.id ? { ...z, ...patch } : z
                            ),
                          },
                        }));
                      };
                      return (
                        <div key={zone.id} className={idx > 0 ? 'pt-3 space-y-2.5' : 'space-y-2.5'}>
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-[11px] font-semibold text-zinc-200 font-mono-tabular">
                              Zona {idx + 1}
                            </span>
                            <div className="flex items-center gap-1.5">
                              <div className="flex bg-zinc-900 border border-zinc-800 rounded p-0.5">
                                <button
                                  type="button"
                                  onClick={() => updateZone({ type: 'radial' })}
                                  className={`px-1.5 py-0.5 text-[10px] rounded cursor-pointer ${
                                    zone.type === 'radial'
                                      ? 'bg-zinc-700 text-white'
                                      : 'text-zinc-400 hover:text-zinc-200'
                                  }`}
                                >
                                  Radial
                                </button>
                                <button
                                  type="button"
                                  onClick={() => updateZone({ type: 'linear' })}
                                  className={`px-1.5 py-0.5 text-[10px] rounded cursor-pointer ${
                                    zone.type === 'linear'
                                      ? 'bg-zinc-700 text-white'
                                      : 'text-zinc-400 hover:text-zinc-200'
                                  }`}
                                >
                                  Faixa
                                </button>
                              </div>
                              {params.defocus.zones.length > 1 && (
                                <button
                                  type="button"
                                  aria-label={`Remover Zona ${idx + 1}`}
                                  onClick={() =>
                                    onChange((p) => ({
                                      ...p,
                                      defocus: {
                                        ...p.defocus,
                                        zones: p.defocus.zones.filter((z) => z.id !== zone.id),
                                      },
                                    }))
                                  }
                                  className="text-zinc-500 hover:text-red-400 p-0.5 cursor-pointer"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </div>
                          </div>

                          <SliderControl
                            label="% na Zona"
                            value={zone.intensity}
                            min={0}
                            max={1.0}
                            step={0.01}
                            formatValue={(v) => `${Math.round(v * 100)}%`}
                            onChange={(v) => updateZone({ intensity: v })}
                          />
                          <div className="grid grid-cols-2 gap-2.5">
                            <SliderControl
                              label="Posição X"
                              value={zone.x}
                              min={0.0}
                              max={1.0}
                              step={0.01}
                              formatValue={(v) => `${Math.round(v * 100)}%`}
                              onChange={(v) => updateZone({ x: v })}
                            />
                            <SliderControl
                              label="Posição Y"
                              value={zone.y}
                              min={0.0}
                              max={1.0}
                              step={0.01}
                              formatValue={(v) => `${Math.round(v * 100)}%`}
                              onChange={(v) => updateZone({ y: v })}
                            />
                          </div>
                          <div className="grid grid-cols-2 gap-2.5">
                            <SliderControl
                              label="Tamanho / Raio"
                              value={zone.radius}
                              min={0.05}
                              max={0.85}
                              step={0.01}
                              onChange={(v) => updateZone({ radius: v })}
                            />
                            <SliderControl
                              label="Suavidade"
                              value={zone.softness}
                              min={0.05}
                              max={1.0}
                              step={0.01}
                              onChange={(v) => updateZone({ softness: v })}
                            />
                          </div>
                          {zone.type === 'linear' && (
                            <SliderControl
                              label="Ângulo da Faixa"
                              value={zone.angle}
                              min={0}
                              max={360}
                              step={1}
                              unit="°"
                              onChange={(v) => updateZone({ angle: v })}
                            />
                          )}
                        </div>
                      );
                    })}
                  </div>

                  {params.defocus.zones.length < 4 && (
                    <button
                      type="button"
                      onClick={() =>
                        onChange((p) => ({
                          ...p,
                          defocus: {
                            ...p.defocus,
                            zones: [
                              ...p.defocus.zones,
                              {
                                id: `z-${Date.now().toString(36)}`,
                                type: 'radial',
                                x: 0.55,
                                y: 0.45,
                                radius: 0.24,
                                softness: 0.5,
                                intensity: 0.85,
                                angle: 45,
                              },
                            ],
                          },
                        }))
                      }
                      className="w-full inline-flex items-center justify-center gap-1.5 py-1.5 px-3 text-xs font-medium text-zinc-200 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 rounded-md transition-colors cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Adicionar Zona de Desfoque ({params.defocus.zones.length}/4)</span>
                    </button>
                  )}
                </div>
              )}

              <div className="pt-2 border-t border-zinc-800/70 space-y-3">
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
