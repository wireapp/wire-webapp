export type BackgroundSource = {
  type: string;
  media?: ImageBitmap | ReadableStream;
  url: string;
  video?: HTMLVideoElement;
  track?: MediaStreamTrack;
};

export type ProcessVideoTrackOptions = {
  wasmLoaderPath: string;
  wasmBinaryPath: string;
  modelPath: string;
  useWorker: boolean;
  // Virtual background options.
  enabled: boolean;
  backgroundUrl: string;
  backgroundSource?: BackgroundSource | null;
  showStats: boolean;
  // Segmenter options.
  borderSmooth: number;
  smoothing: number;
  smoothstepMin: number;
  smoothstepMax: number;
  restartEvery: number;
  bgBlur: number;
  bgBlurRadius: number;
  // Filter options.
  enableFilters: boolean;
  blur: number;
  brightness: number;
  contrast: number;
  gamma: number;
};

/**
 * Configuration options for the virtual background.
 */
export const defaultOpts = {
  wasmLoaderPath: '/min/mediapipe/wasm/vision_wasm_internal.js',
  wasmBinaryPath: '/min/mediapipe/wasm/vision_wasm_internal.wasm',
  modelPath: '/assets/mediapipe-models/selfie_multiclass_256x256.tflite',
  useWorker: false,
  enabled: true,
  backgroundUrl: '',
  showStats: false,
  // Segmenter options.
  borderSmooth: 0.0,
  smoothing: 0.8,
  smoothstepMin: 0.6,
  smoothstepMax: 0.9,
  restartEvery: 0,
  bgBlur: 0.0,
  bgBlurRadius: 30,
  // Filter options.
  enableFilters: false,
  blur: 0,
  brightness: 0,
  contrast: 1,
  gamma: 1,
} as ProcessVideoTrackOptions;
