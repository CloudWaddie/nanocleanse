export interface WatermarkConfig {
  logoSize: number;
  marginRight: number;
  marginBottom: number;
}

export interface WatermarkPosition {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface ProcessingState {
  status: 'idle' | 'processing' | 'success' | 'error';
  message?: string;
}

export interface ImageDimension {
  width: number;
  height: number;
}