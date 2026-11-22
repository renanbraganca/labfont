import React from 'react';

interface SliderControlProps {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  unit?: string;
  formatValue?: (val: number) => string;
  onChange: (val: number) => void;
}

export const SliderControl: React.FC<SliderControlProps> = ({
  label,
  value,
  min,
  max,
  step = 0.01,
  unit = '',
  formatValue,
  onChange,
}) => {
  const display = formatValue
    ? formatValue(value)
    : `${Number.isInteger(step) ? Math.round(value) : value.toFixed(2)}${unit}`;

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between gap-2">
        <label className="text-xs font-medium text-zinc-300 truncate">{label}</label>
        <span className="text-[11px] font-mono-tabular text-zinc-400 shrink-0">{display}</span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className="studio-slider"
      />
    </div>
  );
};

interface ModuleToggleHeaderProps {
  title: string;
  subtitle?: string;
  enabled: boolean;
  onToggle: (next: boolean) => void;
  expanded: boolean;
  onExpandToggle: () => void;
}

export const ModuleToggleHeader: React.FC<ModuleToggleHeaderProps> = ({
  title,
  subtitle,
  enabled,
  onToggle,
  expanded,
  onExpandToggle,
}) => {
  return (
    <div className="flex items-center justify-between gap-3 py-3 px-4 select-none">
      <button
        type="button"
        onClick={onExpandToggle}
        className="flex-1 text-left min-w-0 group focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-blue-500 rounded"
      >
        <div className="flex items-center gap-2">
          <span
            className={`text-xs font-semibold tracking-tight transition-colors ${
              enabled ? 'text-zinc-100' : 'text-zinc-400 group-hover:text-zinc-200'
            }`}
          >
            {title}
          </span>
          <span className="text-[10px] text-zinc-500 font-mono-tabular">
            {expanded ? '−' : '+'}
          </span>
        </div>
        {subtitle && (
          <p className="text-[11px] text-zinc-500 truncate mt-0.5">{subtitle}</p>
        )}
      </button>

      <button
        type="button"
        role="switch"
        aria-checked={enabled}
        aria-label={`Ativar ${title}`}
        onClick={() => onToggle(!enabled)}
        className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full border transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 ${
          enabled
            ? 'bg-blue-500 border-blue-400'
            : 'bg-zinc-800 border-zinc-700 hover:border-zinc-600'
        }`}
      >
        <span
          className={`pointer-events-none inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform duration-150 ${
            enabled ? 'translate-x-4' : 'translate-x-0.5'
          }`}
        />
      </button>
    </div>
  );
};

interface ColorFieldProps {
  label: string;
  value: string;
  onChange: (hex: string) => void;
}

export const ColorField: React.FC<ColorFieldProps> = ({ label, value, onChange }) => {
  return (
    <div className="flex items-center justify-between gap-2">
      <span className="text-xs font-medium text-zinc-300 truncate">{label}</span>
      <label className="flex items-center gap-2 cursor-pointer bg-zinc-900 border border-zinc-800 hover:border-zinc-700 rounded-md px-2 py-1">
        <input
          type="color"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="h-4 w-4 rounded border-0 bg-transparent p-0 cursor-pointer"
        />
        <span className="text-[11px] font-mono-tabular text-zinc-300 uppercase">{value}</span>
      </label>
    </div>
  );
};
