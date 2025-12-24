import { WatermarkConfig, WatermarkPosition } from '../types';
import { BG_48_BASE64, BG_96_BASE64 } from './assets';

// Constants from blendModes.js
const ALPHA_THRESHOLD = 2e-3;
const MAX_ALPHA = 0.99;
const LOGO_VALUE = 255;

// Helper to load an image
export const loadImage = (src: string): Promise<HTMLImageElement> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
};

function calculateAlphaMap(bgCaptureImageData: ImageData): Float32Array {
  const { width, height, data } = bgCaptureImageData;
  const alphaMap = new Float32Array(width * height);
  for (let i = 0; i < alphaMap.length; i++) {
    const idx = i * 4;
    const r = data[idx];
    const g = data[idx + 1];
    const b = data[idx + 2];
    const maxChannel = Math.max(r, g, b);
    alphaMap[i] = maxChannel / 255;
  }
  return alphaMap;
}

function removeWatermarkPixels(imageData: ImageData, alphaMap: Float32Array, position: WatermarkPosition) {
  const { x, y, width, height } = position;
  
  // Boundary checks to prevent array out of bounds
  if (x < 0 || y < 0 || x + width > imageData.width || y + height > imageData.height) {
    return;
  }

  for (let row = 0; row < height; row++) {
    for (let col = 0; col < width; col++) {
      const imgIdx = ((y + row) * imageData.width + (x + col)) * 4;
      const alphaIdx = row * width + col;
      
      let alpha = alphaMap[alphaIdx];
      if (alpha < ALPHA_THRESHOLD) {
        continue;
      }
      alpha = Math.min(alpha, MAX_ALPHA);
      const oneMinusAlpha = 1 - alpha;
      
      for (let c = 0; c < 3; c++) {
        const watermarked = imageData.data[imgIdx + c];
        // The original user script logic: (watermarked - alpha * LOGO_VALUE) / oneMinusAlpha
        const original = (watermarked - alpha * LOGO_VALUE) / oneMinusAlpha;
        imageData.data[imgIdx + c] = Math.max(0, Math.min(255, Math.round(original)));
      }
    }
  }
}

function detectWatermarkConfig(imageWidth: number, imageHeight: number): WatermarkConfig {
  if (imageWidth > 1024 && imageHeight > 1024) {
    return {
      logoSize: 96,
      marginRight: 64,
      marginBottom: 64
    };
  } else {
    return {
      logoSize: 48,
      marginRight: 32,
      marginBottom: 32
    };
  }
}

function calculateWatermarkPosition(imageWidth: number, imageHeight: number, config: WatermarkConfig): WatermarkPosition {
  const { logoSize, marginRight, marginBottom } = config;
  return {
    x: imageWidth - marginRight - logoSize,
    y: imageHeight - marginBottom - logoSize,
    width: logoSize,
    height: logoSize
  };
}

export class WatermarkEngine {
  private alphaMaps: Record<number, Float32Array> = {};
  private bg48: HTMLImageElement | null = null;
  private bg96: HTMLImageElement | null = null;
  private isInitialized = false;

  async init() {
    if (this.isInitialized) return;
    
    const [bg48, bg96] = await Promise.all([
      loadImage(BG_48_BASE64),
      loadImage(BG_96_BASE64)
    ]);
    this.bg48 = bg48;
    this.bg96 = bg96;
    this.isInitialized = true;
  }

  async getAlphaMap(size: number): Promise<Float32Array> {
    if (this.alphaMaps[size]) {
      return this.alphaMaps[size];
    }
    
    if (!this.bg48 || !this.bg96) {
      await this.init();
    }

    const bgImage = size === 48 ? this.bg48! : this.bg96!;
    const canvas = document.createElement("canvas");
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    
    if (!ctx) throw new Error("Could not get canvas context");
    
    ctx.drawImage(bgImage, 0, 0);
    const imageData = ctx.getImageData(0, 0, size, size);
    const alphaMap = calculateAlphaMap(imageData);
    this.alphaMaps[size] = alphaMap;
    return alphaMap;
  }

  async removeWatermark(image: HTMLImageElement): Promise<Blob> {
    if (!this.isInitialized) await this.init();

    const canvas = document.createElement("canvas");
    canvas.width = image.width;
    canvas.height = image.height;
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) throw new Error("Canvas context failed");

    ctx.drawImage(image, 0, 0);
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    
    const config = detectWatermarkConfig(canvas.width, canvas.height);
    const position = calculateWatermarkPosition(canvas.width, canvas.height, config);
    const alphaMap = await this.getAlphaMap(config.logoSize);
    
    removeWatermarkPixels(imageData, alphaMap, position);
    
    ctx.putImageData(imageData, 0, 0);
    
    return new Promise((resolve, reject) => {
      canvas.toBlob((blob) => {
        if (blob) resolve(blob);
        else reject(new Error("Failed to create blob"));
      }, 'image/png');
    });
  }
}

export const engine = new WatermarkEngine();