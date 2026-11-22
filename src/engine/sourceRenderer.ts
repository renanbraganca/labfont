import { AspectRatioKey, StudioParams } from '../types/studio';

export function getAspectDimensions(ratio: AspectRatioKey, baseLongSide = 1080): { width: number; height: number } {
  switch (ratio) {
    case '3:4':
      return { width: Math.round(baseLongSide * 0.75), height: baseLongSide };
    case '4:5':
      return { width: Math.round(baseLongSide * 0.8), height: baseLongSide };
    case '1:1':
      return { width: baseLongSide, height: baseLongSide };
    case '16:9':
      return { width: baseLongSide, height: Math.round((baseLongSide * 9) / 16) };
    case '9:16':
      return { width: Math.round((baseLongSide * 9) / 16), height: baseLongSide };
    default:
      return { width: Math.round(baseLongSide * 0.75), height: baseLongSide };
  }
}

function mulberry32(seed: number) {
  let a = seed >>> 0;
  return function () {
    let t = (a += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export interface MediaElementRef {
  image: HTMLImageElement | null;
  video: HTMLVideoElement | null;
}

export interface CharacterPlacement {
  index: number;
  char: string;
  x: number;
  y: number;
  normX: number;
  normY: number;
  normHalfW: number;
  normHalfH: number;
  fontSizePx: number;
  rotation: number;
  scale: number;
  alpha: number;
}

export function computeCharacterPlacements(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  params: StudioParams,
  timeSec: number
): CharacterPlacement[] {
  const t = params.typography;
  if (t.text.trim().length === 0) return [];

  const scaleFactor = Math.min(width, height) / 900;
  const rawText = t.uppercase ? t.text.toUpperCase() : t.text;
  const lines = rawText.split('\n');
  const fontSizePx = Math.max(12, t.fontSize * scaleFactor);
  const letterSpacingPx = fontSizePx * t.letterSpacing;
  const fontSpec = `${t.fontWeight} ${fontSizePx}px "${t.fontFamily}", sans-serif`;

  ctx.save();
  ctx.font = fontSpec;

  const centerX = width * (0.5 + t.offsetX);
  const centerY = height * (0.5 + t.offsetY);
  const globalRotRad = (t.rotation * Math.PI) / 180;
  const cosR = Math.cos(globalRotRad);
  const sinR = Math.sin(globalRotRad);

  const placements: CharacterPlacement[] = [];
  let charIndex = 0;

  const pushPlacement = (
    ch: string,
    localX: number,
    localY: number,
    charW: number,
    charRot: number,
    charScale: number,
    alpha: number
  ) => {
    const idx = charIndex++;
    const rx = localX * cosR - localY * sinR;
    const ry = localX * sinR + localY * cosR;
    const off = t.charOffsets?.[idx];
    const finalScale = charScale * (off?.scale ?? 1);
    const absX = centerX + rx + (off ? off.dx * width : 0);
    const absY = centerY + ry + (off ? off.dy * height : 0);
    const halfW = Math.max(10, charW * finalScale * 0.55);
    const halfH = Math.max(12, fontSizePx * finalScale * 0.5);

    placements.push({
      index: idx,
      char: ch,
      x: absX,
      y: absY,
      normX: absX / width,
      normY: absY / height,
      normHalfW: halfW / width,
      normHalfH: halfH / height,
      fontSizePx,
      rotation: globalRotRad + charRot,
      scale: finalScale,
      alpha,
    });
  };

  if (t.layoutMode === 'solid') {
    const lineStep = fontSizePx * t.lineHeight;
    const blockHeight = (lines.length - 1) * lineStep;
    const startY = -blockHeight / 2;
    const anchorX =
      t.textAlign === 'left'
        ? -width * 0.38
        : t.textAlign === 'right'
          ? width * 0.38
          : 0;

    lines.forEach((line, lineIdx) => {
      const chars = Array.from(line);
      const widths = chars.map((ch) => ctx.measureText(ch).width);
      const totalWidth =
        widths.reduce((acc, w) => acc + w, 0) + Math.max(0, chars.length - 1) * letterSpacingPx;

      let cursorX = anchorX;
      if (t.textAlign === 'center') cursorX = anchorX - totalWidth / 2;
      else if (t.textAlign === 'right') cursorX = anchorX - totalWidth;

      const ly = startY + lineIdx * lineStep;
      for (let i = 0; i < chars.length; i++) {
        const ch = chars[i];
        const w = widths[i];
        if (ch.trim() !== '') {
          pushPlacement(ch, cursorX + w / 2, ly, w, 0, 1, t.opacity);
        }
        cursorX += w + letterSpacingPx;
      }
    });
  } else if (t.layoutMode === 'scatter') {
    const chars = Array.from(rawText.replace(/\n/g, ' ')).filter((c) => c !== ' ');
    const rng = mulberry32(t.scatterSeed);
    const count = Math.max(1, chars.length);
    const spanH = height * 0.72;
    const startY = -spanH * 0.48;

    chars.forEach((ch, idx) => {
      const progress = count === 1 ? 0.5 : idx / (count - 1);
      const chaos = t.scatterChaos;
      const jitterX = (rng() - 0.5) * width * 0.42 * chaos;
      const diagDrift = (progress - 0.5) * width * 0.24 * chaos;
      const px = diagDrift + jitterX - width * 0.08 * chaos;
      const py = startY + progress * spanH + (rng() - 0.5) * fontSizePx * 0.35 * chaos;
      const charScale = 1 + (rng() - 0.45) * 0.75 * chaos;
      const charRot = (rng() - 0.5) * 0.85 * chaos + Math.sin(timeSec * 0.5 + idx) * 0.03 * chaos;
      const w = ctx.measureText(ch).width;
      pushPlacement(ch, px, py, w, charRot, charScale, t.opacity);
    });
  } else if (t.layoutMode === 'repeat') {
    const count = Math.max(2, Math.min(12, t.repeatCount));
    const joined = lines.join(' ');
    const chars = Array.from(joined);
    const widths = chars.map((ch) => ctx.measureText(ch).width);
    const totalWidth =
      widths.reduce((acc, w) => acc + w, 0) + Math.max(0, chars.length - 1) * letterSpacingPx;
    const spanH = height * 0.78;
    const step = spanH / count;
    const startY = -spanH / 2 + step / 2;

    for (let r = 0; r < count; r++) {
      const alphaScale = r === Math.floor(count / 2) ? 1.0 : 0.38 + (r % 2) * 0.22;
      const shiftX = Math.sin(timeSec * 0.8 + r * 0.7) * width * 0.02;
      let cursorX = shiftX - totalWidth / 2;
      const ly = startY + r * step;

      for (let i = 0; i < chars.length; i++) {
        const ch = chars[i];
        const w = widths[i];
        if (ch.trim() !== '') {
          pushPlacement(ch, cursorX + w / 2, ly, w, 0, 1, t.opacity * alphaScale);
        }
        cursorX += w + letterSpacingPx;
      }
    }
  }

  ctx.restore();
  return placements;
}

export function renderSourceComposition(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  params: StudioParams,
  mediaRef: MediaElementRef,
  timeSec: number
) {
  const scaleFactor = Math.min(width, height) / 900;

  ctx.save();
  ctx.clearRect(0, 0, width, height);

  // 1. Background Fill / Gradient
  if (params.background.gradientEnabled) {
    const rad = (params.background.gradientAngle * Math.PI) / 180;
    const cx = width / 2;
    const cy = height / 2;
    const r = Math.hypot(width, height) / 2;
    const grad = ctx.createLinearGradient(
      cx - Math.cos(rad) * r,
      cy - Math.sin(rad) * r,
      cx + Math.cos(rad) * r,
      cy + Math.sin(rad) * r
    );
    grad.addColorStop(0, params.background.color);
    grad.addColorStop(1, params.background.secondaryColor);
    ctx.fillStyle = grad;
  } else {
    ctx.fillStyle = params.background.color;
  }
  ctx.fillRect(0, 0, width, height);

  // 2. Uploaded Image or Video Layer
  const showMedia = params.compositionMode === 'media' || params.compositionMode === 'mixed';
  const activeEl =
    params.media.type === 'video'
      ? mediaRef.video
      : params.media.type === 'image'
        ? mediaRef.image
        : null;

  const mediaReady =
    activeEl &&
    (activeEl instanceof HTMLVideoElement
      ? activeEl.readyState >= 2 && activeEl.videoWidth > 0
      : activeEl.complete && activeEl.naturalWidth > 0);

  if (showMedia && mediaReady && activeEl) {
    const mw = activeEl instanceof HTMLVideoElement ? activeEl.videoWidth : activeEl.naturalWidth;
    const mh = activeEl instanceof HTMLVideoElement ? activeEl.videoHeight : activeEl.naturalHeight;

    const scaleBase =
      params.media.fit === 'cover'
        ? Math.max(width / mw, height / mh)
        : Math.min(width / mw, height / mh);

    const drawW = mw * scaleBase * params.media.scale;
    const drawH = mh * scaleBase * params.media.scale;
    const dx = (width - drawW) / 2;
    const dy = (height - drawH) / 2;

    ctx.save();
    ctx.globalAlpha = params.media.opacity;
    ctx.globalCompositeOperation = params.media.blendMode;
    const filters: string[] = [];
    if (params.media.grayscale) filters.push('grayscale(100%)');
    if (Math.abs(params.media.contrast - 1) > 0.01) {
      filters.push(`contrast(${Math.round(params.media.contrast * 100)}%)`);
    }
    if (filters.length > 0 && 'filter' in ctx) {
      ctx.filter = filters.join(' ');
    }
    ctx.drawImage(activeEl, dx, dy, drawW, drawH);
    ctx.restore();
  } else if (params.compositionMode === 'media' && !mediaReady) {
    ctx.save();
    const grad = ctx.createRadialGradient(
      width * 0.5,
      height * 0.48,
      width * 0.04,
      width * 0.5,
      height * 0.5,
      width * 0.55
    );
    grad.addColorStop(0, params.typography.color);
    grad.addColorStop(0.55, params.typography.color + '44');
    grad.addColorStop(1, 'transparent');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(width * 0.5, height * 0.5, width * 0.36, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  // 3. Typography Layer (Character-by-Character Placements)
  const showType = params.compositionMode === 'typography' || params.compositionMode === 'mixed';
  if (showType && params.typography.text.trim().length > 0) {
    const t = params.typography;
    const placements = computeCharacterPlacements(ctx, width, height, params, timeSec);
    const fontSizePx = Math.max(12, t.fontSize * scaleFactor);
    const fontSpec = `${t.fontWeight} ${fontSizePx}px "${t.fontFamily}", sans-serif`;

    ctx.save();
    ctx.fillStyle = t.color;
    ctx.font = fontSpec;
    ctx.textBaseline = 'middle';
    ctx.textAlign = 'center';

    for (const p of placements) {
      ctx.save();
      ctx.globalAlpha = p.alpha;
      ctx.translate(p.x, p.y);
      if (Math.abs(p.rotation) > 0.001) {
        ctx.rotate(p.rotation);
      }
      if (Math.abs(p.scale - 1) > 0.001) {
        ctx.scale(p.scale, p.scale);
      }
      ctx.fillText(p.char, 0, 0);
      ctx.restore();
    }
    ctx.restore();
  }

  // 4. Editorial Micro-Footer
  if (params.typography.showEditorialFooter) {
    const fSize = Math.max(10, 14 * scaleFactor);
    const padX = width * 0.065;
    const footY = height * 0.945;

    ctx.save();
    ctx.fillStyle = params.typography.color;
    ctx.globalAlpha = 0.82;
    ctx.font = `600 ${fSize}px "Plus Jakarta Sans", sans-serif`;
    ctx.textBaseline = 'middle';

    if (params.typography.footerLeft) {
      ctx.textAlign = 'left';
      ctx.fillText(params.typography.footerLeft, padX, footY);
    }
    if (params.typography.footerCenter) {
      ctx.textAlign = 'center';
      ctx.font = `500 ${Math.round(fSize * 0.9)}px "Plus Jakarta Sans", sans-serif`;
      ctx.fillText(params.typography.footerCenter, width / 2, footY);
    }
    if (params.typography.footerRight) {
      ctx.textAlign = 'right';
      ctx.font = `500 ${Math.round(fSize * 0.9)}px "Plus Jakarta Sans", sans-serif`;
      ctx.fillText(params.typography.footerRight, width - padX, footY);
    }
    ctx.restore();
  }

  ctx.restore();
}
