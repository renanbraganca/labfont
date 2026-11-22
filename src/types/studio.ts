export type AspectRatioKey = '3:4' | '4:5' | '1:1' | '16:9' | '9:16';

export type CompositionMode = 'typography' | 'media' | 'mixed';

export type TypographyLayoutMode = 'solid' | 'scatter' | 'repeat';

export type TextAlignMode = 'left' | 'center' | 'right';

export type MediaBlendMode = 'source-over' | 'screen' | 'multiply' | 'difference' | 'exclusion' | 'overlay';

export type MediaFitMode = 'cover' | 'contain';

export type HalftoneShape = 'circle' | 'diamond' | 'line';

export interface MediaSourceState {
  type: 'none' | 'image' | 'video';
  url: string | null;
  name: string;
  opacity: number;
  scale: number;
  blendMode: MediaBlendMode;
  fit: MediaFitMode;
  grayscale: boolean;
  contrast: number;
}

export interface CharOffset {
  dx: number;
  dy: number;
  scale?: number;
}

export interface TypographyState {
  text: string;
  fontFamily: string;
  fontWeight: number;
  fontSize: number;
  lineHeight: number;
  letterSpacing: number;
  textAlign: TextAlignMode;
  layoutMode: TypographyLayoutMode;
  scatterChaos: number;
  scatterSeed: number;
  repeatCount: number;
  rotation: number;
  offsetX: number;
  offsetY: number;
  charOffsets: Record<number, CharOffset>;
  color: string;
  opacity: number;
  uppercase: boolean;
  showEditorialFooter: boolean;
  footerLeft: string;
  footerCenter: string;
  footerRight: string;
}

export interface BackgroundState {
  color: string;
  secondaryColor: string;
  gradientEnabled: boolean;
  gradientAngle: number;
}

export interface BlurZone {
  id: string;
  type: 'radial' | 'linear';
  x: number; // 0..1 normalized
  y: number; // 0..1 normalized
  radius: number; // 0.05..0.85
  softness: number; // 0.05..1.0
  intensity: number; // 0..1 (% of blur effect in this zone)
  angle: number; // 0..360 deg (used when type === 'linear')
}

export interface OpticalDefocusParams {
  enabled: boolean;
  mix: number; // 0..1 (% of defocus effect applied overall)
  blurAmount: number; // 0 to 1
  zoneMode: 'full' | 'zones';
  invertZones: boolean; // false = blur inside zones, true = sharp inside zones (blur outside)
  zones: BlurZone[];
  inkMelt: number; // 0 to 1 (pre-threshold organic metaball fusion)
  meltThreshold: number; // 0 to 1 (0 = off, >0 sharpens fused shapes)
}

export interface LiquidWarpParams {
  enabled: boolean;
  amplitude: number; // 0..1
  frequency: number; // 0.5..8
  speed: number; // 0..2
  chromaticSplit: number; // 0..1
  glossHighlight: number; // 0..1
  pinch: number; // -1..1
}

export interface DirectionalStreakParams {
  enabled: boolean;
  intensity: number; // 0..1.5
  length: number; // 0..1
  angle: number; // 0..360 deg (90 = vertical like Make Some Noise)
  threshold: number; // 0..0.95
  bidirectional: boolean;
}

export interface HalftoneParams {
  enabled: boolean;
  mix: number; // 0..1
  dotSize: number; // 3..28 px
  angle: number; // 0..180 deg
  contrast: number; // 0.1..1
  shape: HalftoneShape;
  foregroundColor: string;
  backgroundColor: string;
  useCustomColors: boolean;
}

export interface GrainAndGradeParams {
  grainAmount: number; // 0..1
  grainSize: number; // 1..4
  contrast: number; // 0.5..2.0
  brightness: number; // -0.4..0.4
  invert: boolean;
}

export interface StudioParams {
  aspectRatio: AspectRatioKey;
  compositionMode: CompositionMode;
  animationPlaying: boolean;
  animationSpeed: number;
  background: BackgroundState;
  typography: TypographyState;
  media: MediaSourceState;
  defocus: OpticalDefocusParams;
  warp: LiquidWarpParams;
  streaks: DirectionalStreakParams;
  halftone: HalftoneParams;
  grade: GrainAndGradeParams;
}

export interface PresetDefinition {
  id: string;
  name: string;
  subtitle: string;
  referenceLabel: string;
  params: StudioParams;
}

export interface GoogleFontItem {
  family: string;
  category: 'display' | 'sans' | 'serif' | 'mono' | 'condensed';
  weights: number[];
}
