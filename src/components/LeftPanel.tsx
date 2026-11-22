import React, { useMemo, useState } from 'react';
import {
  AlignCenter,
  AlignLeft,
  AlignRight,
  Film,
  Image as ImageIcon,
  Layers,
  Search,
  Trash2,
  Type,
  Upload,
} from 'lucide-react';
import { GOOGLE_FONTS_CATALOG, loadGoogleFont } from '../data/googleFonts';
import {
  CompositionMode,
  GoogleFontItem,
  MediaBlendMode,
  StudioParams,
  TypographyLayoutMode,
} from '../types/studio';
import { ColorField, SliderControl } from './ui/StudioControls';

interface LeftPanelProps {
  params: StudioParams;
  onChange: (updater: (prev: StudioParams) => StudioParams) => void;
  onUploadMedia: (file: File) => void;
  onClearMedia: () => void;
}

const FONT_CATEGORIES: { id: 'all' | GoogleFontItem['category']; label: string }[] = [
  { id: 'all', label: 'Todas' },
  { id: 'display', label: 'Display' },
  { id: 'condensed', label: 'Condensada' },
  { id: 'sans', label: 'Sans' },
  { id: 'serif', label: 'Serif' },
  { id: 'mono', label: 'Mono' },
];

export const LeftPanel: React.FC<LeftPanelProps> = ({
  params,
  onChange,
  onUploadMedia,
  onClearMedia,
}) => {
  const [fontQuery, setFontQuery] = useState('');
  const [fontCategory, setFontCategory] = useState<'all' | GoogleFontItem['category']>('all');
  const [customFontInput, setCustomFontInput] = useState('');
  const [fontLoadingState, setFontLoadingState] = useState<'idle' | 'loading' | 'error'>('idle');

  const filteredFonts = useMemo(() => {
    const q = fontQuery.trim().toLowerCase();
    return GOOGLE_FONTS_CATALOG.filter((f) => {
      const catMatch = fontCategory === 'all' || f.category === fontCategory;
      const qMatch = !q || f.family.toLowerCase().includes(q);
      return catMatch && qMatch;
    });
  }, [fontQuery, fontCategory]);

  const handleSelectFont = async (font: GoogleFontItem) => {
    setFontLoadingState('loading');
    await loadGoogleFont(font.family, font.weights);
    setFontLoadingState('idle');
    onChange((prev) => ({
      ...prev,
      typography: {
        ...prev.typography,
        fontFamily: font.family,
        fontWeight: font.weights.includes(prev.typography.fontWeight)
          ? prev.typography.fontWeight
          : font.weights[font.weights.length - 1] ?? 400,
      },
    }));
  };

  const handleLoadCustomGoogleFont = async (e: React.FormEvent) => {
    e.preventDefault();
    const name = customFontInput.trim();
    if (!name) return;
    setFontLoadingState('loading');
    const ok = await loadGoogleFont(name, [300, 400, 500, 600, 700, 800, 900]);
    if (ok) {
      setFontLoadingState('idle');
      onChange((prev) => ({
        ...prev,
        typography: {
          ...prev.typography,
          fontFamily: name,
        },
      }));
    } else {
      setFontLoadingState('error');
      setTimeout(() => setFontLoadingState('idle'), 2500);
    }
  };

  const selectedCatalogFont = GOOGLE_FONTS_CATALOG.find(
    (f) => f.family.toLowerCase() === params.typography.fontFamily.toLowerCase()
  );
  const availableWeights = selectedCatalogFont?.weights ?? [300, 400, 500, 600, 700, 800, 900];

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onUploadMedia(file);
    }
    e.target.value = '';
  };

  return (
    <aside className="w-[310px] xl:w-[330px] shrink-0 h-full bg-[#101014] border-r border-zinc-800/90 flex flex-col overflow-hidden">
      {/* Mode Switcher */}
      <div className="p-4 border-b border-zinc-800/80 space-y-2.5 shrink-0">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-zinc-200">Fonte da Composição</span>
          <span className="text-[11px] text-zinc-500">Camadas</span>
        </div>
        <div className="grid grid-cols-3 gap-1 p-1 bg-zinc-900 rounded-lg border border-zinc-800/80">
          {(
            [
              { id: 'typography', label: 'Texto', Icon: Type },
              { id: 'media', label: 'Mídia', Icon: ImageIcon },
              { id: 'mixed', label: 'Misto', Icon: Layers },
            ] as { id: CompositionMode; label: string; Icon: React.FC<{ className?: string }> }[]
          ).map(({ id, label, Icon }) => {
            const active = params.compositionMode === id;
            return (
              <button
                key={id}
                type="button"
                onClick={() => onChange((p) => ({ ...p, compositionMode: id }))}
                className={`flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-md text-xs font-medium transition-colors whitespace-nowrap cursor-pointer ${
                  active
                    ? 'bg-zinc-800 text-white shadow-sm'
                    : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                <Icon className="w-3.5 h-3.5 shrink-0" />
                <span>{label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Scrollable Inspector Body */}
      <div className="flex-1 overflow-y-auto divide-y divide-zinc-800/80">
        {/* MEDIA INPUT SECTION */}
        {(params.compositionMode === 'media' || params.compositionMode === 'mixed') && (
          <section className="p-4 space-y-3.5">
            <div className="flex items-center justify-between">
              <h2 className="text-xs font-semibold text-zinc-100">Imagem ou Vídeo</h2>
              {params.media.type !== 'none' && (
                <button
                  type="button"
                  onClick={onClearMedia}
                  className="inline-flex items-center gap-1 text-[11px] text-zinc-400 hover:text-red-400 transition-colors cursor-pointer"
                >
                  <Trash2 className="w-3 h-3" />
                  <span>Remover</span>
                </button>
              )}
            </div>

            <label className="flex flex-col items-center justify-center gap-1.5 py-4 px-3 rounded-lg border border-dashed border-zinc-700 hover:border-zinc-500 bg-zinc-900/50 hover:bg-zinc-900 transition-colors cursor-pointer text-center">
              {params.media.type === 'video' ? (
                <Film className="w-5 h-5 text-blue-400" />
              ) : (
                <Upload className="w-5 h-5 text-zinc-400" />
              )}
              <span className="text-xs font-medium text-zinc-200 truncate max-w-full">
                {params.media.type !== 'none' ? params.media.name : 'Carregar Imagem ou Vídeo'}
              </span>
              <span className="text-[11px] text-zinc-500">
                PNG, JPG, WebP, SVG, MP4 ou WebM
              </span>
              <input
                type="file"
                accept="image/*,video/*"
                onChange={handleFileInput}
                className="sr-only"
              />
            </label>

            {params.media.type !== 'none' && (
              <div className="space-y-3 pt-1">
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <label className="text-[11px] text-zinc-400">Enquadramento</label>
                    <select
                      value={params.media.fit}
                      onChange={(e) =>
                        onChange((p) => ({
                          ...p,
                          media: { ...p.media, fit: e.target.value as 'cover' | 'contain' },
                        }))
                      }
                      className="w-full bg-zinc-900 border border-zinc-800 rounded-md px-2 py-1.5 text-xs text-zinc-200"
                    >
                      <option value="cover">Preencher (Cover)</option>
                      <option value="contain">Ajustar (Contain)</option>
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[11px] text-zinc-400">Mesclagem</label>
                    <select
                      value={params.media.blendMode}
                      onChange={(e) =>
                        onChange((p) => ({
                          ...p,
                          media: { ...p.media, blendMode: e.target.value as MediaBlendMode },
                        }))
                      }
                      className="w-full bg-zinc-900 border border-zinc-800 rounded-md px-2 py-1.5 text-xs text-zinc-200"
                    >
                      <option value="source-over">Normal</option>
                      <option value="screen">Screen</option>
                      <option value="multiply">Multiply</option>
                      <option value="difference">Difference</option>
                      <option value="exclusion">Exclusion</option>
                      <option value="overlay">Overlay</option>
                    </select>
                  </div>
                </div>

                <SliderControl
                  label="Escala da Mídia"
                  value={params.media.scale}
                  min={0.3}
                  max={2.4}
                  step={0.02}
                  unit="x"
                  onChange={(v) => onChange((p) => ({ ...p, media: { ...p.media, scale: v } }))}
                />
                <SliderControl
                  label="Opacidade da Mídia"
                  value={params.media.opacity}
                  min={0.05}
                  max={1}
                  step={0.01}
                  onChange={(v) => onChange((p) => ({ ...p, media: { ...p.media, opacity: v } }))}
                />
                <SliderControl
                  label="Contraste da Mídia"
                  value={params.media.contrast}
                  min={0.5}
                  max={2.2}
                  step={0.02}
                  onChange={(v) => onChange((p) => ({ ...p, media: { ...p.media, contrast: v } }))}
                />
                <label className="flex items-center justify-between text-xs text-zinc-300 cursor-pointer">
                  <span>Converter em Monocromático</span>
                  <input
                    type="checkbox"
                    checked={params.media.grayscale}
                    onChange={(e) =>
                      onChange((p) => ({
                        ...p,
                        media: { ...p.media, grayscale: e.target.checked },
                      }))
                    }
                    className="rounded border-zinc-700 bg-zinc-900 text-blue-500"
                  />
                </label>
              </div>
            )}
          </section>
        )}

        {/* TYPOGRAPHY SECTION */}
        {(params.compositionMode === 'typography' || params.compositionMode === 'mixed') && (
          <section className="p-4 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xs font-semibold text-zinc-100">Tipografia & Google Fonts</h2>
              <button
                type="button"
                onClick={() =>
                  onChange((p) => ({
                    ...p,
                    typography: { ...p.typography, uppercase: !p.typography.uppercase },
                  }))
                }
                className={`px-2 py-0.5 text-[11px] font-medium rounded border transition-colors cursor-pointer ${
                  params.typography.uppercase
                    ? 'bg-zinc-800 border-zinc-700 text-zinc-100'
                    : 'bg-transparent border-zinc-800 text-zinc-400 hover:text-zinc-200'
                }`}
              >
                AA / aa
              </button>
            </div>

            {/* Text Input */}
            <textarea
              rows={3}
              value={params.typography.text}
              onChange={(e) =>
                onChange((p) => ({
                  ...p,
                  typography: { ...p.typography, text: e.target.value },
                }))
              }
              placeholder="Digite o texto da composição..."
              className="w-full bg-zinc-900/90 border border-zinc-800 focus:border-blue-500 rounded-md px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-600 focus:outline-none resize-none"
            />

            {/* Google Fonts Browser */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-medium text-zinc-400">
                  Fonte Ativa:{' '}
                  <strong className="text-zinc-100 font-semibold">
                    {params.typography.fontFamily}
                  </strong>
                </span>
                {fontLoadingState === 'loading' && (
                  <span className="text-[10px] text-blue-400">Carregando...</span>
                )}
                {fontLoadingState === 'error' && (
                  <span className="text-[10px] text-amber-400">Fonte não encontrada</span>
                )}
              </div>

              <div className="relative">
                <Search className="w-3.5 h-3.5 text-zinc-500 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  value={fontQuery}
                  onChange={(e) => setFontQuery(e.target.value)}
                  placeholder="Filtrar catálogo Google Fonts..."
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-md pl-8 pr-2.5 py-1.5 text-xs text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:border-zinc-600"
                />
              </div>

              {/* Category Filter */}
              <div className="flex items-center gap-1 overflow-x-auto pb-1">
                {FONT_CATEGORIES.map((cat) => (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => setFontCategory(cat.id)}
                    className={`px-2 py-1 rounded text-[11px] font-medium whitespace-nowrap shrink-0 transition-colors cursor-pointer ${
                      fontCategory === cat.id
                        ? 'bg-zinc-800 text-zinc-100'
                        : 'text-zinc-500 hover:text-zinc-300'
                    }`}
                  >
                    {cat.label}
                  </button>
                ))}
              </div>

              {/* Font List */}
              <div className="max-h-36 overflow-y-auto rounded-md border border-zinc-800 bg-zinc-950/60 divide-y divide-zinc-900">
                {filteredFonts.map((font) => {
                  const selected =
                    font.family.toLowerCase() === params.typography.fontFamily.toLowerCase();
                  return (
                    <button
                      key={font.family}
                      type="button"
                      onClick={() => handleSelectFont(font)}
                      className={`w-full flex items-center justify-between px-2.5 py-1.5 text-left text-xs transition-colors cursor-pointer ${
                        selected
                          ? 'bg-blue-500/15 text-blue-300 font-medium'
                          : 'text-zinc-300 hover:bg-zinc-900'
                      }`}
                    >
                      <span className="truncate">{font.family}</span>
                      <span className="text-[10px] text-zinc-500 capitalize shrink-0 ml-2">
                        {font.category}
                      </span>
                    </button>
                  );
                })}
              </div>

              {/* Any Google Font On-Demand Input */}
              <form onSubmit={handleLoadCustomGoogleFont} className="flex gap-1.5">
                <input
                  type="text"
                  value={customFontInput}
                  onChange={(e) => setCustomFontInput(e.target.value)}
                  placeholder="Qualquer Google Font (ex: Nabla)"
                  className="flex-1 min-w-0 bg-zinc-900 border border-zinc-800 rounded-md px-2.5 py-1.5 text-xs text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:border-zinc-600"
                />
                <button
                  type="submit"
                  className="px-2.5 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-100 text-xs font-medium rounded-md whitespace-nowrap shrink-0 cursor-pointer"
                >
                  Carregar
                </button>
              </form>
            </div>

            {/* Layout Mode: Solid / Scatter / Repeat */}
            <div className="space-y-2 pt-1">
              <span className="text-xs font-medium text-zinc-300">Composição do Texto</span>
              <div className="grid grid-cols-3 gap-1 p-1 bg-zinc-900 rounded-md border border-zinc-800/80">
                {(
                  [
                    { id: 'solid', label: 'Bloco' },
                    { id: 'scatter', label: 'Dispersão' },
                    { id: 'repeat', label: 'Repetição' },
                  ] as { id: TypographyLayoutMode; label: string }[]
                ).map((mode) => (
                  <button
                    key={mode.id}
                    type="button"
                    onClick={() =>
                      onChange((p) => ({
                        ...p,
                        typography: { ...p.typography, layoutMode: mode.id },
                      }))
                    }
                    className={`py-1 px-2 rounded text-[11px] font-medium transition-colors cursor-pointer whitespace-nowrap ${
                      params.typography.layoutMode === mode.id
                        ? 'bg-zinc-800 text-white'
                        : 'text-zinc-400 hover:text-zinc-200'
                    }`}
                  >
                    {mode.label}
                  </button>
                ))}
              </div>
            </div>

            {params.typography.layoutMode === 'scatter' && (
              <div className="space-y-3 p-2.5 rounded-md bg-zinc-900/50 border border-zinc-800/60">
                <SliderControl
                  label="Caos da Dispersão"
                  value={params.typography.scatterChaos}
                  min={0}
                  max={1.2}
                  step={0.02}
                  onChange={(v) =>
                    onChange((p) => ({
                      ...p,
                      typography: { ...p.typography, scatterChaos: v },
                    }))
                  }
                />
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[11px] text-zinc-400">
                    Semente: <span className="font-mono-tabular text-zinc-200">{params.typography.scatterSeed}</span>
                  </span>
                  <button
                    type="button"
                    onClick={() =>
                      onChange((p) => ({
                        ...p,
                        typography: {
                          ...p.typography,
                          scatterSeed: Math.floor(Math.random() * 9999),
                        },
                      }))
                    }
                    className="px-2.5 py-1 bg-zinc-800 hover:bg-zinc-700 rounded text-[11px] font-medium text-zinc-200 cursor-pointer"
                  >
                    Nova Posição
                  </button>
                </div>
              </div>
            )}

            {params.typography.layoutMode === 'repeat' && (
              <SliderControl
                label="Repetições"
                value={params.typography.repeatCount}
                min={2}
                max={12}
                step={1}
                onChange={(v) =>
                  onChange((p) => ({
                    ...p,
                    typography: { ...p.typography, repeatCount: Math.round(v) },
                  }))
                }
              />
            )}

            {/* Weight & Alignment */}
            <div className="grid grid-cols-2 gap-2.5">
              <div className="space-y-1">
                <label className="text-[11px] text-zinc-400">Peso</label>
                <select
                  value={params.typography.fontWeight}
                  onChange={(e) =>
                    onChange((p) => ({
                      ...p,
                      typography: { ...p.typography, fontWeight: Number(e.target.value) },
                    }))
                  }
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-md px-2 py-1.5 text-xs text-zinc-200 font-mono-tabular"
                >
                  {availableWeights.map((w) => (
                    <option key={w} value={w}>
                      {w}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-[11px] text-zinc-400">Alinhamento</label>
                <div className="grid grid-cols-3 gap-1 bg-zinc-900 border border-zinc-800 rounded-md p-0.5">
                  {(
                    [
                      { id: 'left', Icon: AlignLeft },
                      { id: 'center', Icon: AlignCenter },
                      { id: 'right', Icon: AlignRight },
                    ] as const
                  ).map(({ id, Icon }) => (
                    <button
                      key={id}
                      type="button"
                      onClick={() =>
                        onChange((p) => ({
                          ...p,
                          typography: { ...p.typography, textAlign: id },
                        }))
                      }
                      className={`flex items-center justify-center py-1 rounded cursor-pointer ${
                        params.typography.textAlign === id
                          ? 'bg-zinc-800 text-white'
                          : 'text-zinc-500 hover:text-zinc-300'
                      }`}
                    >
                      <Icon className="w-3.5 h-3.5" />
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <SliderControl
              label="Tamanho da Fonte"
              value={params.typography.fontSize}
              min={32}
              max={340}
              step={1}
              unit="px"
              onChange={(v) =>
                onChange((p) => ({ ...p, typography: { ...p.typography, fontSize: v } }))
              }
            />
            <SliderControl
              label="Entrelinha"
              value={params.typography.lineHeight}
              min={0.65}
              max={1.8}
              step={0.01}
              onChange={(v) =>
                onChange((p) => ({ ...p, typography: { ...p.typography, lineHeight: v } }))
              }
            />
            <SliderControl
              label="Espaçamento (Tracking)"
              value={params.typography.letterSpacing}
              min={-0.12}
              max={0.4}
              step={0.005}
              unit="em"
              onChange={(v) =>
                onChange((p) => ({ ...p, typography: { ...p.typography, letterSpacing: v } }))
              }
            />
            <SliderControl
              label="Rotação"
              value={params.typography.rotation}
              min={-45}
              max={45}
              step={1}
              unit="°"
              onChange={(v) =>
                onChange((p) => ({ ...p, typography: { ...p.typography, rotation: v } }))
              }
            />
            <div className="grid grid-cols-2 gap-3">
              <SliderControl
                label="Posição X"
                value={params.typography.offsetX}
                min={-0.85}
                max={0.85}
                step={0.01}
                onChange={(v) =>
                  onChange((p) => ({ ...p, typography: { ...p.typography, offsetX: v } }))
                }
              />
              <SliderControl
                label="Posição Y"
                value={params.typography.offsetY}
                min={-0.85}
                max={0.85}
                step={0.01}
                onChange={(v) =>
                  onChange((p) => ({ ...p, typography: { ...p.typography, offsetY: v } }))
                }
              />
            </div>

            {/* Editorial Footer Toggle */}
            <div className="pt-2 border-t border-zinc-800/70 space-y-2.5">
              <label className="flex items-center justify-between text-xs font-medium text-zinc-300 cursor-pointer">
                <span>Micro-Rodapé Editorial</span>
                <input
                  type="checkbox"
                  checked={params.typography.showEditorialFooter}
                  onChange={(e) =>
                    onChange((p) => ({
                      ...p,
                      typography: { ...p.typography, showEditorialFooter: e.target.checked },
                    }))
                  }
                  className="rounded border-zinc-700 bg-zinc-900 text-blue-500"
                />
              </label>

              {params.typography.showEditorialFooter && (
                <div className="grid grid-cols-3 gap-1.5">
                  <input
                    type="text"
                    value={params.typography.footerLeft}
                    onChange={(e) =>
                      onChange((p) => ({
                        ...p,
                        typography: { ...p.typography, footerLeft: e.target.value },
                      }))
                    }
                    placeholder="Esq."
                    className="bg-zinc-900 border border-zinc-800 rounded px-2 py-1 text-[11px] text-zinc-200"
                  />
                  <input
                    type="text"
                    value={params.typography.footerCenter}
                    onChange={(e) =>
                      onChange((p) => ({
                        ...p,
                        typography: { ...p.typography, footerCenter: e.target.value },
                      }))
                    }
                    placeholder="Centro"
                    className="bg-zinc-900 border border-zinc-800 rounded px-2 py-1 text-[11px] text-zinc-200"
                  />
                  <input
                    type="text"
                    value={params.typography.footerRight}
                    onChange={(e) =>
                      onChange((p) => ({
                        ...p,
                        typography: { ...p.typography, footerRight: e.target.value },
                      }))
                    }
                    placeholder="Dir."
                    className="bg-zinc-900 border border-zinc-800 rounded px-2 py-1 text-[11px] text-zinc-200"
                  />
                </div>
              )}
            </div>
          </section>
        )}

        {/* COLORS & BACKGROUND SECTION */}
        <section className="p-4 space-y-3">
          <h2 className="text-xs font-semibold text-zinc-100">Cores & Fundo</h2>
          <ColorField
            label="Cor do Texto / Tinta"
            value={params.typography.color}
            onChange={(hex) =>
              onChange((p) => ({ ...p, typography: { ...p.typography, color: hex } }))
            }
          />
          <ColorField
            label="Fundo Primário"
            value={params.background.color}
            onChange={(hex) =>
              onChange((p) => ({ ...p, background: { ...p.background, color: hex } }))
            }
          />
          <label className="flex items-center justify-between text-xs text-zinc-300 cursor-pointer">
            <span>Gradiente de Fundo</span>
            <input
              type="checkbox"
              checked={params.background.gradientEnabled}
              onChange={(e) =>
                onChange((p) => ({
                  ...p,
                  background: { ...p.background, gradientEnabled: e.target.checked },
                }))
              }
              className="rounded border-zinc-700 bg-zinc-900 text-blue-500"
            />
          </label>
          {params.background.gradientEnabled && (
            <div className="space-y-3 pt-1">
              <ColorField
                label="Fundo Secundário"
                value={params.background.secondaryColor}
                onChange={(hex) =>
                  onChange((p) => ({
                    ...p,
                    background: { ...p.background, secondaryColor: hex },
                  }))
                }
              />
              <SliderControl
                label="Ângulo do Gradiente"
                value={params.background.gradientAngle}
                min={0}
                max={360}
                step={1}
                unit="°"
                onChange={(v) =>
                  onChange((p) => ({ ...p, background: { ...p.background, gradientAngle: v } }))
                }
              />
            </div>
          )}
        </section>
      </div>
    </aside>
  );
};
