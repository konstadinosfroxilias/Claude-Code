/**
 * Client-side "week in movement" card renderer. Draws a 1080×1080 PNG on a
 * canvas — nothing leaves the device unless the member taps share.
 *
 * Content is body-neutral by construction: the caller passes counts of
 * classes, minutes and categories, and this module has no idea what a
 * calorie is.
 */
export interface RecapImageInput {
  brand: string;
  heading: string;
  weekLabel: string;
  stats: { value: string; label: string }[];
  footnote?: string;
}

const W = 1080;
const H = 1080;

export async function renderRecapImage(input: RecapImageInput): Promise<Blob> {
  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("canvas unsupported");

  // Background + soft volt glow
  ctx.fillStyle = "#0a0b0e";
  ctx.fillRect(0, 0, W, H);
  const glow = ctx.createRadialGradient(860, 200, 40, 860, 200, 620);
  glow.addColorStop(0, "rgba(200,241,63,0.22)");
  glow.addColorStop(1, "rgba(200,241,63,0)");
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, W, H);

  // Contour rings
  ctx.strokeStyle = "rgba(255,255,255,0.06)";
  ctx.lineWidth = 2;
  for (const r of [140, 240, 360, 500, 660]) {
    ctx.beginPath();
    ctx.arc(860, 200, r, 0, Math.PI * 2);
    ctx.stroke();
  }

  const sans =
    '"Manrope", "Inter", ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif';

  // Brand
  ctx.fillStyle = "#c8f13f";
  ctx.font = `800 40px ${sans}`;
  ctx.textBaseline = "top";
  ctx.fillText(input.brand, 88, 84);

  // Heading
  ctx.fillStyle = "#f2f3f5";
  ctx.font = `800 72px ${sans}`;
  wrapText(ctx, input.heading, 88, 180, 900, 82);

  ctx.fillStyle = "#9aa1ad";
  ctx.font = `500 32px ${sans}`;
  ctx.fillText(input.weekLabel, 88, 372);

  // Stats
  let y = 470;
  for (const s of input.stats.slice(0, 4)) {
    ctx.fillStyle = "#c8f13f";
    ctx.fillRect(88, y + 14, 10, 74);
    ctx.fillStyle = "#f2f3f5";
    ctx.font = `800 84px ${sans}`;
    ctx.fillText(s.value, 124, y - 6);
    ctx.fillStyle = "#9aa1ad";
    ctx.font = `500 30px ${sans}`;
    ctx.fillText(s.label, 130 + ctx.measureText(s.value).width * 2.6 + 20, y + 44);
    y += 128;
  }

  if (input.footnote) {
    ctx.fillStyle = "#5d6470";
    ctx.font = `500 28px ${sans}`;
    wrapText(ctx, input.footnote, 88, 980, 900, 36);
  }

  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error("toBlob failed"))), "image/png");
  });
}

function wrapText(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  lineHeight: number,
): void {
  const words = text.split(" ");
  let line = "";
  for (const word of words) {
    const test = line ? `${line} ${word}` : word;
    if (ctx.measureText(test).width > maxWidth && line) {
      ctx.fillText(line, x, y);
      line = word;
      y += lineHeight;
    } else {
      line = test;
    }
  }
  if (line) ctx.fillText(line, x, y);
}

/** Share the PNG via the Web Share API when files are supported; download otherwise. */
export async function shareOrDownloadImage(
  blob: Blob,
  filename: string,
  text: string,
): Promise<"shared" | "downloaded"> {
  const file = new File([blob], filename, { type: "image/png" });
  const nav = typeof navigator !== "undefined" ? navigator : undefined;
  if (nav && "canShare" in nav && nav.canShare({ files: [file] })) {
    await nav.share({ files: [file], text });
    return "shared";
  }
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
  return "downloaded";
}
