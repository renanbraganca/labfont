import React from 'react';
import { Download } from 'lucide-react';
import { PRESETS } from '../data/presets';

interface TopBarProps {
  activePresetId: string | null;
  onSelectPreset: (presetId: string) => void;
  onOpenExport: () => void;
}

export const TopBar: React.FC<TopBarProps> = ({
  activePresetId,
  onSelectPreset,
  onOpenExport,
}) => {
  return (
    <header className="h-14 shrink-0 flex items-center justify-between gap-8 px-5 bg-[#0D0D10] border-b border-zinc-800/90">
      {/* Zone 1: Single-element Brand Wordmark */}
      <span className="text-base font-bold tracking-tight text-zinc-100 whitespace-nowrap shrink-0">
        OptikLab
      </span>

      {/* Zone 2: Reference Preset Switchers (single-line interactive buttons) */}
      <nav
        aria-label="Presets de referência"
        className="hidden lg:flex items-center gap-1 overflow-x-auto"
      >
        {PRESETS.map((preset) => {
          const isActive = activePresetId === preset.id;
          return (
            <button
              key={preset.id}
              type="button"
              onClick={() => onSelectPreset(preset.id)}
              title={preset.subtitle}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 ${
                isActive
                  ? 'bg-zinc-800 text-white'
                  : 'text-zinc-400 hover:text-zinc-100 hover:bg-zinc-900'
              }`}
            >
              {preset.name}
            </button>
          );
        })}
      </nav>

      {/* Zone 3: Single Primary Action */}
      <div className="flex items-center shrink-0">
        <button
          type="button"
          onClick={onOpenExport}
          className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-zinc-950 bg-zinc-100 hover:bg-white rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
        >
          <Download className="w-3.5 h-3.5" />
          <span>Exportar Mídia</span>
        </button>
      </div>
    </header>
  );
};
