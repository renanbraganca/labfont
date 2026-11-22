import { GOOGLE_FONTS_CATALOG } from '../data/googleFonts';
import { HalftoneShape, StudioParams, TypographyLayoutMode } from '../types/studio';

const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));
const rand = (min: number, max: number) => min + Math.random() * (max - min);
const pick = <T,>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];

const JITTER = (val: number, span: number, min: number, max: number) =>
  clamp(val + (Math.random() * 2 - 1) * span, min, max);

const HARMONIC_PALETTES = [
  { bg: '#050506', bg2: '#111218', ink: '#F7F7F7' },
  { bg: '#F3F4F2', bg2: '#E1E4DE', ink: '#111215' },
  { bg: '#EDF1F4', bg2: '#CED8E0', ink: '#193146' },
  { bg: '#0A0908', bg2: '#1C1917', ink: '#EFECE6' },
  { bg: '#08101C', bg2: '#11223A', ink: '#E6F0FF' },
  { bg: '#EAE6DF', bg2: '#D8D1C5', ink: '#1E1B18' },
  { bg: '#0B130E', bg2: '#16271C', ink: '#E5F2E8' },
  { bg: '#160B18', bg2: '#2B1330', ink: '#F7ECF9' },
];

/**
 * Randomizar Leve:
 * Perturba suavemente os parâmetros ativos mantendo legibilidade, fonte e paleta coerentes.
 */
export function randomizeSubtle(current: StudioParams): StudioParams {
  const next: StudioParams = structuredClone(current);

  next.typography.letterSpacing = JITTER(next.typography.letterSpacing, 0.025, -0.08, 0.25);
  next.typography.lineHeight = JITTER(next.typography.lineHeight, 0.08, 0.72, 1.45);
  next.typography.scatterChaos = JITTER(next.typography.scatterChaos, 0.22, 0.1, 1.0);
  next.typography.scatterSeed = Math.floor(rand(1, 999));

  if (next.defocus.enabled) {
    next.defocus.blurAmount = JITTER(next.defocus.blurAmount, 0.18, 0.05, 0.85);
    next.defocus.mix = JITTER(next.defocus.mix, 0.18, 0.25, 1.0);
    next.defocus.zones = next.defocus.zones.map((z) => ({
      ...z,
      x: JITTER(z.x, 0.14, 0.12, 0.88),
      y: JITTER(z.y, 0.14, 0.12, 0.88),
      radius: JITTER(z.radius, 0.1, 0.1, 0.65),
      intensity: JITTER(z.intensity, 0.2, 0.25, 1.0),
    }));
    if (next.defocus.inkMelt > 0) {
      next.defocus.inkMelt = JITTER(next.defocus.inkMelt, 0.16, 0.05, 0.85);
    }
  }

  if (next.warp.enabled) {
    next.warp.amplitude = JITTER(next.warp.amplitude, 0.15, 0.05, 0.8);
    next.warp.frequency = JITTER(next.warp.frequency, 0.8, 0.8, 5.5);
    next.warp.chromaticSplit = JITTER(next.warp.chromaticSplit, 0.2, 0, 1.0);
    next.warp.pinch = JITTER(next.warp.pinch, 0.2, -0.6, 0.6);
  }

  if (next.streaks.enabled) {
    next.streaks.intensity = JITTER(next.streaks.intensity, 0.25, 0.2, 1.35);
    next.streaks.length = JITTER(next.streaks.length, 0.18, 0.2, 0.95);
    next.streaks.angle = (next.streaks.angle + rand(-18, 18) + 360) % 360;
  }

  if (next.halftone.enabled) {
    next.halftone.dotSize = Math.round(JITTER(next.halftone.dotSize, 4, 5, 22));
    next.halftone.angle = Math.round((next.halftone.angle + rand(-20, 20) + 180) % 180);
    next.halftone.contrast = JITTER(next.halftone.contrast, 0.12, 0.35, 0.95);
  }

  next.grade.grainAmount = JITTER(next.grade.grainAmount, 0.12, 0.02, 0.65);
  next.grade.contrast = JITTER(next.grade.contrast, 0.1, 0.85, 1.45);

  return next;
}

/**
 * Randomizar Agressivo:
 * Recombina shaders, fonte do Google Fonts, paleta, layout tipográfico e intensidades experimentais.
 */
export function randomizeAggressive(current: StudioParams): StudioParams {
  const next: StudioParams = structuredClone(current);
  const palette = pick(HARMONIC_PALETTES);
  const randomFont = pick(GOOGLE_FONTS_CATALOG);

  next.background.color = palette.bg;
  next.background.secondaryColor = palette.bg2;
  next.background.gradientEnabled = Math.random() > 0.4;
  next.background.gradientAngle = Math.round(rand(0, 360));

  next.typography.fontFamily = randomFont.family;
  next.typography.fontWeight = pick(randomFont.weights);
  next.typography.color = palette.ink;
  next.typography.letterSpacing = Number(rand(-0.06, 0.14).toFixed(3));
  next.typography.lineHeight = Number(rand(0.78, 1.18).toFixed(2));
  next.typography.rotation = Math.random() > 0.7 ? Math.round(rand(-18, 18)) : 0;

  const layouts: TypographyLayoutMode[] = ['solid', 'scatter', 'repeat'];
  next.typography.layoutMode = pick(layouts);
  next.typography.scatterChaos = Number(rand(0.35, 1.0).toFixed(2));
  next.typography.scatterSeed = Math.floor(rand(1, 9999));
  next.typography.repeatCount = Math.floor(rand(3, 8));
  next.typography.charOffsets = {};

  const flags = [
    Math.random() > 0.35, // defocus
    Math.random() > 0.25, // warp
    Math.random() > 0.3,  // streaks
    Math.random() > 0.45, // halftone
  ];
  if (flags.filter(Boolean).length < 2) {
    flags[1] = true;
    flags[2] = true;
  }

  next.defocus = {
    enabled: flags[0],
    mix: Number(rand(0.45, 1.0).toFixed(2)),
    blurAmount: Number(rand(0.18, 0.82).toFixed(2)),
    zoneMode: Math.random() > 0.35 ? 'zones' : 'full',
    invertZones: Math.random() > 0.45,
    zones: [
      {
        id: 'z-1',
        type: Math.random() > 0.4 ? 'radial' : 'linear',
        x: Number(rand(0.22, 0.78).toFixed(2)),
        y: Number(rand(0.22, 0.78).toFixed(2)),
        radius: Number(rand(0.15, 0.48).toFixed(2)),
        softness: Number(rand(0.25, 0.85).toFixed(2)),
        intensity: Number(rand(0.55, 1.0).toFixed(2)),
        angle: Math.round(rand(0, 180)),
      },
    ],
    inkMelt: Math.random() > 0.4 ? Number(rand(0.15, 0.72).toFixed(2)) : 0,
    meltThreshold: Math.random() > 0.55 ? Number(rand(0.3, 0.65).toFixed(2)) : 0,
  };

  next.warp = {
    enabled: flags[1],
    amplitude: Number(rand(0.22, 0.82).toFixed(2)),
    frequency: Number(rand(1.4, 5.2).toFixed(2)),
    speed: Number(rand(0.4, 1.3).toFixed(2)),
    chromaticSplit: Number(rand(0.35, 1.0).toFixed(2)),
    glossHighlight: Number(rand(0.2, 0.9).toFixed(2)),
    pinch: Number(rand(-0.55, 0.55).toFixed(2)),
  };

  next.streaks = {
    enabled: flags[2],
    intensity: Number(rand(0.45, 1.35).toFixed(2)),
    length: Number(rand(0.4, 0.95).toFixed(2)),
    angle: pick([0, 45, 90, 135, 180, Math.round(rand(0, 360))]),
    threshold: Number(rand(0.2, 0.65).toFixed(2)),
    bidirectional: Math.random() > 0.25,
  };

  const shapes: HalftoneShape[] = ['circle', 'diamond', 'line'];
  next.halftone = {
    enabled: flags[3],
    mix: Number(rand(0.65, 1.0).toFixed(2)),
    dotSize: Math.round(rand(6, 18)),
    angle: Math.round(rand(0, 90)),
    contrast: Number(rand(0.55, 0.95).toFixed(2)),
    shape: pick(shapes),
    foregroundColor: palette.ink,
    backgroundColor: palette.bg,
    useCustomColors: Math.random() > 0.5,
  };

  next.grade = {
    grainAmount: Number(rand(0.12, 0.62).toFixed(2)),
    grainSize: Number(rand(1.1, 2.8).toFixed(1)),
    contrast: Number(rand(1.0, 1.42).toFixed(2)),
    brightness: 0,
    invert: Math.random() > 0.85,
  };

  return next;
}
