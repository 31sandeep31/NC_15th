import {
  computeContainedRect,
  downloadCanvasImage,
  getPillStyle,
  type Rect,
} from "@/features/poster/lib/canvas";

import type { DistrictShape } from "./districts";
import { buildMapSvg, mapSvgToDataUrl } from "./districts";

export type NcExportText = {
  el: HTMLElement;
  text: string;
  scale: number;
  color?: string;
  align?: "center" | "left";
};

export type NcExportConfig = {
  stage: HTMLDivElement;
  frameImage: HTMLImageElement;
  photoImage?: HTMLImageElement;
  photoSrc: string;
  hasPhoto: boolean;
  hasOverlay: boolean;
  overlaySrc: string;
  name?: NcExportText;
  designations: NcExportText[];
  mapLabel?: NcExportText;
  map?: { el: HTMLElement; fill: string; shape: DistrictShape };
};

async function loadHtmlImage(src: string): Promise<HTMLImageElement> {
  const img = new Image();
  img.crossOrigin = "anonymous";
  img.src = src;
  await new Promise<void>((resolve, reject) => {
    if (img.complete && img.naturalWidth > 0) {
      resolve();
      return;
    }
    img.onload = () => resolve();
    img.onerror = () => reject(new Error(`Image failed to load: ${src}`));
  });
  return img;
}

function toFrameRect(
  el: HTMLElement,
  stageRect: DOMRect,
  frameRect: Rect,
): { height: number; width: number; x: number; y: number } {
  const rect = el.getBoundingClientRect();
  return {
    height: rect.height,
    width: rect.width,
    x: rect.left - stageRect.left - frameRect.x,
    y: rect.top - stageRect.top - frameRect.y,
  };
}

export async function generateNcPoster(config: NcExportConfig) {
  const { stage, frameImage } = config;

  const stageRect = stage.getBoundingClientRect();
  if (stageRect.width <= 0 || stageRect.height <= 0) {
    throw new Error("Stage has no size");
  }

  const safeFrameImage = await loadHtmlImage(frameImage.src);
  if (!safeFrameImage.naturalWidth || !safeFrameImage.naturalHeight) {
    throw new Error("Frame image not ready");
  }

  const overlayEl = document.getElementById("frameOverlay");
  let frameRectStage: Rect;
  if (overlayEl) {
    const oRect = overlayEl.getBoundingClientRect();
    frameRectStage = {
      height: oRect.height,
      width: oRect.width,
      x: oRect.left - stageRect.left,
      y: oRect.top - stageRect.top,
    };
  } else {
    frameRectStage = computeContainedRect(
      stageRect.width,
      stageRect.height,
      safeFrameImage.naturalWidth,
      safeFrameImage.naturalHeight,
    );
  }

  const canvas = document.createElement("canvas");
  canvas.width = safeFrameImage.naturalWidth;
  canvas.height = safeFrameImage.naturalHeight;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Unable to create canvas context.");

  const sx = safeFrameImage.naturalWidth / frameRectStage.width;
  const sy = safeFrameImage.naturalHeight / frameRectStage.height;

  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(safeFrameImage, 0, 0, canvas.width, canvas.height);

  if (config.hasPhoto && config.photoImage && config.photoSrc) {
    const safePhoto = await loadHtmlImage(config.photoImage.src);
    const container = config.photoImage.parentElement;
    if (container) {
      const pRect = container.getBoundingClientRect();
      const centerXPx = pRect.left + pRect.width / 2 - stageRect.left;
      const centerYPx = pRect.top + pRect.height / 2 - stageRect.top;
      const centerX = (centerXPx - frameRectStage.x) * sx;
      const centerY = (centerYPx - frameRectStage.y) * sy;
      const width = pRect.width * sx;
      const height = pRect.height * sy;
      ctx.drawImage(safePhoto, centerX - width / 2, centerY - height / 2, width, height);
    }
  }

  if (config.hasOverlay && config.overlaySrc) {
    try {
      const overlayImage = await loadHtmlImage(config.overlaySrc);
      ctx.drawImage(overlayImage, 0, 0, canvas.width, canvas.height);
    } catch {
      // Overlay is decorative — never block the export because of it.
    }
  }

  if (config.map) {
    const svg = buildMapSvg(config.map.shape, config.map.fill);
    try {
      const mapImage = await loadHtmlImage(mapSvgToDataUrl(svg));
      const mRect = toFrameRect(config.map.el, stageRect, frameRectStage);
      ctx.drawImage(
        mapImage,
        mRect.x * sx,
        mRect.y * sy,
        mRect.width * sx,
        mRect.height * sy,
      );
    } catch {
      // A malformed map path should not break the export.
    }
  }

  const drawText = (item: NcExportText) => {
    const text = item.text.trim();
    if (!text) return;

    const style = getPillStyle(item.el);
    if (item.color) style.textColor = item.color;

    const fontSize = style.fontSizePx * sy * item.scale;
    const lineHeight = style.lineHeightPx * sy * item.scale;
    const halfLeading = (lineHeight - fontSize) / 2;

    const italic = style.fontStyle === "italic" ? "italic " : "";
    ctx.save();
    ctx.font = `${italic}${style.fontWeight} ${fontSize}px ${style.fontFamily}`;
    ctx.textBaseline = "top";
    ctx.textAlign = item.align ?? "left";
    ctx.fillStyle = style.textColor;

    const rect = toFrameRect(item.el, stageRect, frameRectStage);
    const x =
      (item.align ?? "left") === "center"
        ? (rect.x + rect.width / 2) * sx
        : rect.x * sx;
    const y = rect.y * sy;

    text.split(/\r?\n/).forEach((line, index) => {
      ctx.fillText(line, x, y + index * lineHeight + halfLeading);
    });
    ctx.restore();
  };

  if (config.name) drawText(config.name);
  for (const designation of config.designations) drawText(designation);
  if (config.mapLabel) drawText(config.mapLabel);

  await downloadCanvasImage(canvas, "nc-15th-mahadhibeshan.jpg");
}
