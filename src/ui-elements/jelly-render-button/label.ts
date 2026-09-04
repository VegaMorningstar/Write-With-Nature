import type { TgpuRoot } from 'typegpu';

// Rasterised at a comfortable multiple of its on-screen size and mipped, since the
// plane is viewed at an angle and minifies toward the back edge.
const LABEL_WIDTH = 1024;
// 1024x384 matches the label plane's 1.2 x 0.45 world half-extents (aspect 8:3)
const LABEL_HEIGHT = 384;
// Sized so the word spans ~1.35 world units across the 2.4-wide plane, leaving it
// comfortably inside the 1.6-wide blob.
const LABEL_FONT_SIZE = 110;
const LABEL_FONT = `600 ${LABEL_FONT_SIZE}px 'Playfair Display', Georgia, serif`;
const LETTER_SPACING = 0.22;

export async function createLabelTexture(root: TgpuRoot, text: string) {
  const canvas = document.createElement('canvas');
  canvas.width = LABEL_WIDTH;
  canvas.height = LABEL_HEIGHT;

  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('2d context unavailable for the jelly label');
  }

  // The webfont has to be resident before rasterising, otherwise this silently
  // bakes the fallback serif into the texture with no way to tell after the fact.
  if (document.fonts?.load) {
    try {
      await document.fonts.load(LABEL_FONT, text);
      await document.fonts.ready;
    } catch {
      // fall through to whatever the browser resolves
    }
  }

  ctx.clearRect(0, 0, LABEL_WIDTH, LABEL_HEIGHT);
  ctx.font = LABEL_FONT;
  if ('letterSpacing' in ctx) {
    (ctx as CanvasRenderingContext2D & { letterSpacing: string }).letterSpacing =
      `${LETTER_SPACING}em`;
  }
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  // White ink — the shader tints it, so only the coverage in the alpha channel matters
  ctx.fillStyle = '#ffffff';
  // Letter spacing adds a trailing advance that centring counts, nudging the run
  // left by half a gap; put it back.
  ctx.fillText(
    text,
    LABEL_WIDTH / 2 + (LABEL_FONT_SIZE * LETTER_SPACING) / 2,
    LABEL_HEIGHT / 2,
  );

  const bitmap = await createImageBitmap(canvas);

  const texture = root
    .createTexture({
      size: [LABEL_WIDTH, LABEL_HEIGHT, 1],
      format: 'rgba8unorm',
      mipLevelCount: 5,
    })
    .$usage('sampled', 'render');

  texture.write(bitmap);
  texture.generateMipmaps();

  return texture;
}
