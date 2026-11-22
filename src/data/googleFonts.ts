import { GoogleFontItem } from '../types/studio';

export const GOOGLE_FONTS_CATALOG: GoogleFontItem[] = [
  // Display & Brutalist
  { family: 'Syne', category: 'display', weights: [400, 600, 700, 800] },
  { family: 'Unbounded', category: 'display', weights: [400, 600, 700, 900] },
  { family: 'Bricolage Grotesque', category: 'display', weights: [400, 600, 700, 800] },
  { family: 'Archivo Black', category: 'display', weights: [400] },
  { family: 'Climate Crisis', category: 'display', weights: [400] },
  { family: 'Dela Gothic One', category: 'display', weights: [400] },
  { family: 'Rubik Glitch', category: 'display', weights: [400] },
  { family: 'Rubik Pixels', category: 'display', weights: [400] },
  { family: 'Monoton', category: 'display', weights: [400] },
  { family: 'Bungee', category: 'display', weights: [400] },
  { family: 'Righteous', category: 'display', weights: [400] },
  { family: 'Syncopate', category: 'display', weights: [400, 700] },

  // Condensed & Poster
  { family: 'Anton', category: 'condensed', weights: [400] },
  { family: 'Bebas Neue', category: 'condensed', weights: [400] },
  { family: 'Oswald', category: 'condensed', weights: [400, 500, 700] },
  { family: 'Big Shoulders Display', category: 'condensed', weights: [400, 700, 900] },
  { family: 'Antonio', category: 'condensed', weights: [400, 700] },
  { family: 'Barlow Condensed', category: 'condensed', weights: [400, 600, 800] },
  { family: 'Six Caps', category: 'condensed', weights: [400] },

  // Geometric & Neo-Grotesque Sans
  { family: 'Outfit', category: 'sans', weights: [300, 400, 600, 700, 900] },
  { family: 'Plus Jakarta Sans', category: 'sans', weights: [400, 600, 700, 800] },
  { family: 'DM Sans', category: 'sans', weights: [400, 500, 700, 900] },
  { family: 'Manrope', category: 'sans', weights: [400, 600, 800] },
  { family: 'Archivo', category: 'sans', weights: [400, 600, 800, 900] },
  { family: 'Space Grotesk', category: 'sans', weights: [400, 600, 700] },
  { family: 'Urbanist', category: 'sans', weights: [300, 500, 700, 900] },
  { family: 'Sora', category: 'sans', weights: [400, 600, 800] },

  // Editorial & Avant-Garde Serif
  { family: 'Instrument Serif', category: 'serif', weights: [400] },
  { family: 'Playfair Display', category: 'serif', weights: [400, 600, 700, 900] },
  { family: 'Cormorant Garamond', category: 'serif', weights: [400, 600, 700] },
  { family: 'Fraunces', category: 'serif', weights: [400, 600, 800, 900] },
  { family: 'Bodoni Moda', category: 'serif', weights: [400, 600, 800] },
  { family: 'Cinzel', category: 'serif', weights: [400, 700, 900] },
  { family: 'Libre Baskerville', category: 'serif', weights: [400, 700] },
  { family: 'Source Serif 4', category: 'serif', weights: [400, 600, 800] },

  // Experimental & Monospace
  { family: 'JetBrains Mono', category: 'mono', weights: [400, 600, 800] },
  { family: 'Space Mono', category: 'mono', weights: [400, 700] },
  { family: 'IBM Plex Mono', category: 'mono', weights: [400, 600, 700] },
  { family: 'Silkscreen', category: 'mono', weights: [400, 700] },
  { family: 'VT323', category: 'mono', weights: [400] },
  { family: 'Major Mono Display', category: 'mono', weights: [400] },
];

const loadedFonts = new Set<string>(['Plus Jakarta Sans', 'JetBrains Mono']);
const pendingLoads = new Map<string, Promise<boolean>>();

export async function loadGoogleFont(family: string, weights: number[] = [400, 600, 700, 800, 900]): Promise<boolean> {
  const cleanFamily = family.trim();
  if (!cleanFamily) return false;

  const cacheKey = `${cleanFamily}:${weights.join(',')}`;
  if (loadedFonts.has(cleanFamily)) {
    return true;
  }

  if (pendingLoads.has(cacheKey)) {
    return pendingLoads.get(cacheKey)!;
  }

  const promise = (async () => {
    try {
      const encoded = encodeURIComponent(cleanFamily).replace(/%20/g, '+');
      const weightParam = weights.length > 0 ? `:wght@${[...new Set(weights)].sort((a, b) => a - b).join(';')}` : '';
      const href = `https://fonts.googleapis.com/css2?family=${encoded}${weightParam}&display=swap`;

      // Check if link already exists
      const existing = document.querySelector(`link[data-gfont="${cleanFamily}"]`);
      if (!existing) {
        const link = document.createElement('link');
        link.rel = 'stylesheet';
        link.href = href;
        link.setAttribute('data-gfont', cleanFamily);
        document.head.appendChild(link);

        await new Promise<void>((resolve) => {
          link.onload = () => resolve();
          link.onerror = () => resolve();
          setTimeout(resolve, 1800);
        });
      }

      // Explicitly request font faces so canvas 2D renders immediately
      const loadAttempts = weights.slice(0, 3).map((w) =>
        document.fonts.load(`${w} 48px "${cleanFamily}"`).catch(() => [])
      );
      await Promise.all(loadAttempts);
      await document.fonts.ready;

      loadedFonts.add(cleanFamily);
      return true;
    } catch {
      return false;
    } finally {
      pendingLoads.delete(cacheKey);
    }
  })();

  pendingLoads.set(cacheKey, promise);
  return promise;
}
