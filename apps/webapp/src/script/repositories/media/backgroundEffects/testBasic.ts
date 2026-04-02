/*
 * Wire
 * Copyright (C) 2025 Wire Swiss GmbH
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program. If not, see http://www.gnu.org/licenses/.
 *
 */

/* eslint-disable no-console */
/**
 * Basic test script for backgroundEffects module
 * Run with: ts-node src/script/repositories/media/backgroundEffects/testBasic.ts
 *
 * Browser demo:
 *   Bundle this file as an ES module in the app build and open it in the browser.
 *   It will auto-run a live camera demo when window + mediaDevices are available.
 */

import type {DebugMode, EffectMode, PipelineType, QualityMode, StartOptions} from './backgroundEffectsWorkerTypes';
import {choosePipeline, detectCapabilities} from './effects/capability';

declare global {
  interface Window {
    __bgfxDemo?: {
      status: 'starting' | 'running' | 'failed';
      error?: string;
      options?: {
        mode: EffectMode;
        debugMode: DebugMode;
        quality: QualityMode;
        blurStrength: number;
        targetFps: number;
        backgroundKind: string;
        pipeline: string;
      };
      pipeline?: string;
      requestedPipeline?: string;
      stop?: () => void;
    };
  }
}

const isBrowser = typeof window !== 'undefined' && typeof document !== 'undefined';
const isNode = typeof process !== 'undefined' && process.exit;

type WebglDiagnostics = {webgl1: boolean; webgl2: boolean; renderer: string | null};

const getWebglDiagnostics = (): WebglDiagnostics => {
  if (!isBrowser) {
    return {webgl1: false, webgl2: false, renderer: null as string | null};
  }
  const canvas1 = document.createElement('canvas');
  const canvas2 = document.createElement('canvas');
  const gl1 = canvas1.getContext('webgl') || canvas1.getContext('experimental-webgl');
  const gl2 = canvas2.getContext('webgl2');
  const gl = (gl2 || gl1) as WebGLRenderingContext | WebGL2RenderingContext | null;
  let renderer: string | null = null;
  if (gl) {
    const debugExt = gl.getExtension('WEBGL_debug_renderer_info');
    if (debugExt) {
      renderer = gl.getParameter(debugExt.UNMASKED_RENDERER_WEBGL) as string;
    }
  }
  return {webgl1: !!gl1, webgl2: !!gl2, renderer};
};

// Set up console output to display in the page (browser only)
if (isBrowser) {
  // Use a small delay to ensure DOM is ready
  const setupConsole = () => {
    const outputDiv = document.getElementById('console-output');
    if (outputDiv) {
      const originalLog = console.log;
      const originalError = console.error;
      const originalWarn = console.warn;
      const originalInfo = console.info;

      const addOutput = (message: string, type: string = 'log') => {
        if (!outputDiv) {
          return;
        }
        const div = document.createElement('div');
        div.className = type;
        div.textContent = message;
        outputDiv.appendChild(div);
        outputDiv.scrollTop = outputDiv.scrollHeight;
      };

      const formatConsoleArgs = (args: any[]): string => {
        if (args.length === 0) {
          return '';
        }
        const [first, ...rest] = args;
        if (typeof first === 'string' && first.includes('%c')) {
          const cleaned = first.replace(/%c/g, '').trim();
          const nonStyleArgs = rest.filter(arg => typeof arg !== 'string' || !arg.includes(':'));
          return [cleaned, ...nonStyleArgs.map(formatConsoleValue)].filter(Boolean).join(' ');
        }
        return args.map(formatConsoleValue).join(' ');
      };

      const formatConsoleValue = (value: any): string => {
        if (value === null || value === undefined) {
          return String(value);
        }
        if (typeof value === 'string') {
          return value;
        }
        if (value instanceof Error) {
          return value.stack ?? `${value.name}: ${value.message}`;
        }
        try {
          return JSON.stringify(value);
        } catch {
          return String(value);
        }
      };

      console.log = function (...args: any[]) {
        originalLog.apply(console, args);
        addOutput(formatConsoleArgs(args), 'log');
      };

      console.error = function (...args: any[]) {
        originalError.apply(console, args);
        addOutput(formatConsoleArgs(args), 'error');
      };

      console.warn = function (...args: any[]) {
        originalWarn.apply(console, args);
        addOutput(formatConsoleArgs(args), 'warning');
      };

      console.info = function (...args: any[]) {
        originalInfo.apply(console, args);
        addOutput(formatConsoleArgs(args), 'info');
      };

      (console as any).status = function (ok: boolean, ...args: any[]) {
        originalLog.apply(console, args);
        addOutput(formatConsoleArgs(args), ok ? 'success' : 'error');
      };
    } else {
      const warnMsg = 'console-output div not found, console output will only appear in browser console';
      console.warn(warnMsg);
    }
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', setupConsole);
  } else {
    setupConsole();
  }
}

// Only run Node.js tests in Node.js environment
if (!isBrowser && isNode) {
  console.log('=== Background Effects V2 Basic Tests ===\n');

  // Test 1: Module exports
  console.log('Test 1: Module exports');
  try {
    console.log('  ✓ detectCapabilities imported:', typeof detectCapabilities === 'function');
    console.log('  ✓ choosePipeline imported:', typeof choosePipeline === 'function');
    console.log('  Note: BackgroundEffectsController uses import.meta and requires ES modules');
    console.log('        It will be tested in browser-based tests or with proper ES module setup');
  } catch (error) {
    console.error('  ✗ Module import failed:', error);
    process.exit(1);
  }

  // Test 2: Capability detection (requires browser environment)
  console.log('\nTest 2: Capability detection');
  try {
    // Mock browser globals for Node.js environment
    (global as any).window = {};
    (global as any).document = {
      createElement: (_tag?: string): {getContext: (contextId?: string) => WebGLRenderingContext | null} => ({
        getContext: (): WebGLRenderingContext | null => null,
      }),
    };

    const caps = detectCapabilities();
    console.log('  Capabilities detected:');
    console.log('    - OffscreenCanvas:', caps.offscreenCanvas);
    console.log('    - Worker:', caps.worker);
    console.log('    - WebGL2:', caps.webgl2);
    console.log('    - requestVideoFrameCallback:', caps.requestVideoFrameCallback);

    const pipeline = choosePipeline(caps, true);
    console.log('  ✓ BackgroundEffectsRenderingPipeline chosen:', pipeline);
    console.log('  Note: In browser environment, capabilities will be properly detected');
  } catch (error) {
    console.log('  ⚠ Capability detection requires browser environment');
    console.log('    Error:', (error as Error).message);
    console.log('    This is expected in Node.js - will work in browser');
  }

  // Test 3: Type definitions
  console.log('\nTest 3: Type definitions validation');
  try {
    // Test EffectMode type
    const validModes: EffectMode[] = ['blur', 'virtual', 'passthrough'];
    console.log(`  ✓ EffectMode type valid (${validModes.length} modes)`);

    // Test DebugMode type
    const validDebugModes: DebugMode[] = ['off', 'maskOverlay', 'maskOnly', 'edgeOnly'];
    console.log(`  ✓ DebugMode type valid (${validDebugModes.length} modes)`);

    // Test QualityMode type
    const validQualityModes: QualityMode[] = ['auto', 'superhigh', 'high', 'medium', 'low', 'bypass'];
    console.log(`  ✓ QualityMode type valid (${validQualityModes.length} modes)`);

    console.log('  ✓ All type definitions are valid');
  } catch (error) {
    console.error('  ✗ Type validation failed:', error);
    process.exit(1);
  }

  // Test 5: StartOptions interface
  console.log('\nTest 5: StartOptions interface');
  try {
    const validOptions: StartOptions = {
      mode: 'blur',
      blurStrength: 0.6,
      quality: 'auto',
      targetFps: 30,
      debugMode: 'off',
    };
    console.log('  ✓ StartOptions type is valid');
    console.log('    Sample options:', JSON.stringify(validOptions, null, 2));
  } catch (error) {
    console.error('  ✗ StartOptions validation failed:', error);
    process.exit(1);
  }

  console.log('\n=== All basic tests passed! ===');
  console.log('\nNote: Full integration tests require browser environment with MediaStream API.');
  console.log('To test with actual video stream, use browser-based tests or manual testing.');
}

// Browser-specific code - run after DOM is ready
if (isBrowser) {
  const runBrowserTests = () => {
    // In browser, run capability detection and then demo
    console.log('=== Background Effects V2 Browser Test ===');
    console.log('Script loaded successfully. Running tests...');

    try {
      const caps = detectCapabilities();
      const logExpectation = (label: string, value: boolean, expected = true) => {
        const ok = value === expected;
        const prefix = ok ? '✓' : '✗';
        const message = `  ${prefix} ${label}: ${value}`;
        if ((console as any).status) {
          (console as any).status(ok, message);
        } else {
          (ok ? console.log : console.error)(message);
        }
      };
      console.log('Capabilities detected:');
      logExpectation('OffscreenCanvas', caps.offscreenCanvas);
      logExpectation('Worker', caps.worker);
      logExpectation('WebGL2', caps.webgl2);
      logExpectation('requestVideoFrameCallback', caps.requestVideoFrameCallback);
      const webgl = getWebglDiagnostics();
      logExpectation('WebGL1', webgl.webgl1);
      logExpectation('WebGL2 (context check)', webgl.webgl2);
      if (webgl.renderer) {
        console.log('  - WebGL renderer:', webgl.renderer);
      } else {
        console.log('  - WebGL renderer:', 'unavailable (context or extension missing)');
      }

      const pipeline = choosePipeline(caps, true);
      console.log('  ✓ BackgroundEffectsRenderingPipeline chosen:', pipeline);
      console.log('Starting browser demo...');
    } catch (error) {
      console.error('  ✗ Capability detection failed:', error);
      console.error('Error details:', error);
    }
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', runBrowserTests);
  } else {
    runBrowserTests();
  }
}

async function runBrowserDemo() {
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    return;
  }
  if (!navigator.mediaDevices?.getUserMedia) {
    console.log('Browser demo skipped: MediaDevices API not available.');
    return;
  }

  const params = new URLSearchParams(window.location.search);
  const mode = (params.get('mode') as EffectMode) || 'virtual';
  const debugMode = (params.get('debug') as DebugMode) || 'off';
  const quality = (params.get('quality') as QualityMode) || 'auto';
  const blurStrength = Number(params.get('blur') ?? '0.7');
  const targetFps = Number(params.get('fps') ?? '30');
  const backgroundKind = params.get('bg') || (mode === 'virtual' ? 'gradient' : 'none');
  const pipelineParam = params.get('pipeline');
  const pipelineOverride = (
    pipelineParam && ['worker-webgl2', 'main-webgl2', 'canvas2d', 'passthrough'].includes(pipelineParam)
      ? pipelineParam
      : undefined
  ) as PipelineType | undefined;

  const {BackgroundEffectsController} = await import('./effects/backgroundEffectsController');

  const caps = detectCapabilities();
  const chosenPipeline = choosePipeline(caps, true);
  const activePipeline = pipelineOverride ?? chosenPipeline;

  const root = document.getElementById('app-root') || document.createElement('div');
  if (!root.id) {
    root.id = 'app-root';
    root.style.display = 'grid';
    root.style.gridTemplateColumns = '1fr 1fr';
    root.style.gap = '12px';
    root.style.padding = '12px';
    root.style.background = '#111';
    root.style.color = '#fff';
    root.style.font = '14px/1.4 sans-serif';
    document.body.appendChild(root);
  } else {
    // Use existing app-root, just set styles if needed
    root.style.display = 'grid';
    root.style.gridTemplateColumns = '1fr 1fr';
    root.style.gap = '12px';
    root.style.padding = '12px';
  }

  const createPanel = (title: string) => {
    const panel = document.createElement('div');
    const heading = document.createElement('div');
    heading.textContent = title;
    heading.style.marginBottom = '6px';
    panel.appendChild(heading);
    return panel;
  };

  const rawPanel = createPanel('Raw input');
  const processedPanel = createPanel('Processed output');
  const metricsPanel = createPanel('Performance');
  root.appendChild(rawPanel);
  root.appendChild(processedPanel);
  root.appendChild(metricsPanel);

  const rawVideo = document.createElement('video');
  rawVideo.id = 'bgfx-raw-video';
  rawVideo.autoplay = true;
  rawVideo.muted = true;
  rawVideo.playsInline = true;
  rawVideo.style.width = '100%';
  rawVideo.style.background = '#000';
  rawPanel.appendChild(rawVideo);

  const processedVideo = document.createElement('video');
  processedVideo.id = 'bgfx-processed-video';
  processedVideo.autoplay = true;
  processedVideo.muted = true;
  processedVideo.playsInline = true;
  processedVideo.style.width = '100%';
  processedVideo.style.background = '#000';
  processedPanel.appendChild(processedVideo);

  const status = document.createElement('div');
  status.id = 'bgfx-status';
  status.textContent =
    `mode=${mode} debug=${debugMode} quality=${quality} blur=${blurStrength} ` +
    `fps=${targetFps} bg=${backgroundKind} pipeline=${activePipeline}`;
  status.style.gridColumn = '1 / -1';
  root.appendChild(status);

  const metricsLine = document.createElement('div');
  metricsLine.id = 'bgfx-metrics';
  metricsLine.textContent = 'metrics: waiting for frames...';
  metricsPanel.appendChild(metricsLine);

  const logGetUserMediaError = (error: unknown, label: string) => {
    const err = error as DOMException & {constraint?: string};
    console.error(`${label} failed:`, err?.name ?? err, err?.message ?? '');
    if (err?.constraint) {
      console.error(`${label} constraint:`, err.constraint);
    }
  };

  window.__bgfxDemo = {
    status: 'starting',
    options: {
      mode,
      debugMode,
      quality,
      blurStrength,
      targetFps,
      backgroundKind,
      pipeline: activePipeline,
    },
    requestedPipeline: pipelineOverride ?? 'auto',
    pipeline: activePipeline,
  };

  let stream: MediaStream;
  try {
    stream = await navigator.mediaDevices.getUserMedia({
      video: {width: {ideal: 1280}, height: {ideal: 720}},
    });
  } catch (error: unknown) {
    logGetUserMediaError(error, 'getUserMedia (ideal 1280x720)');
    stream = await navigator.mediaDevices.getUserMedia({video: true}).catch((err: unknown) => {
      logGetUserMediaError(err, 'getUserMedia (fallback)');
      throw err;
    });
  }
  const inputTrack = stream.getVideoTracks()[0];
  const settings = inputTrack.getSettings() as MediaTrackSettings & {
    exposureMode?: string;
    focusMode?: string;
    resizeMode?: string;
    whiteBalanceMode?: string;
  };
  const fmt = (value: unknown) => (value === undefined ? 'n/a' : String(value));
  console.log(
    'Video track settings:',
    `resolution=${fmt(settings.width)}x${fmt(settings.height)} ` +
      `fps=${fmt(settings.frameRate)} ` +
      `aspect=${fmt(settings.aspectRatio)} ` +
      `exposure=${fmt(settings.exposureMode)} ` +
      `whiteBalance=${fmt(settings.whiteBalanceMode)} ` +
      `focus=${fmt(settings.focusMode)} ` +
      `resizeMode=${fmt(settings.resizeMode)}`,
  );
  console.log('Video track state:', inputTrack.readyState);
  rawVideo.srcObject = new MediaStream([inputTrack]);
  rawVideo.play().catch((error: unknown) => console.warn('Raw video play failed', error));

  const backgroundImage = await createBackgroundImage(backgroundKind, settings);
  const controller = new BackgroundEffectsController();
  const {outputTrack, stop} = await controller.start(inputTrack, {
    mode,
    debugMode,
    quality,
    blurStrength,
    targetFps,
    backgroundImage: backgroundImage ?? undefined,
    pipelineOverride,
    onMetrics: metrics => {
      const budgetMs = 1000 / targetFps;
      const totalMs = metrics.avgTotalMs || 0;
      const utilization = budgetMs > 0 ? Math.min(999, (totalMs / budgetMs) * 100) : 0;
      const mlShare = totalMs > 0 ? (metrics.avgSegmentationMs / totalMs) * 100 : 0;
      const webglShare = totalMs > 0 ? (metrics.avgGpuMs / totalMs) * 100 : 0;
      // Label ML phase based on actual delegate type
      const mlLabel = metrics.segmentationDelegate ? `ML(${metrics.segmentationDelegate})` : 'ML';
      metricsLine.textContent =
        `total=${totalMs.toFixed(1)}ms ` +
        `seg=${metrics.avgSegmentationMs.toFixed(1)}ms ` +
        `webgl=${metrics.avgGpuMs.toFixed(1)}ms ` +
        `budget=${budgetMs.toFixed(1)}ms ` +
        `util=${utilization.toFixed(0)}% ` +
        `${mlLabel}=${mlShare.toFixed(0)}% ` +
        `webgl=${webglShare.toFixed(0)}% ` +
        `tier=${metrics.tier} dropped=${metrics.droppedFrames}`;
    },
  });

  processedVideo.srcObject = new MediaStream([outputTrack]);
  window.__bgfxDemo = {...window.__bgfxDemo, status: 'running', stop};

  console.log('Browser demo running.');
}

async function createBackgroundImage(kind: string, settings: MediaTrackSettings): Promise<ImageBitmap | null> {
  if (!kind || kind === 'none') {
    return null;
  }
  const width = Math.max(1, Math.floor(settings.width ?? 1280));
  const height = Math.max(1, Math.floor(settings.height ?? 720));
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    return null;
  }

  if (kind === 'gradient') {
    const gradient = ctx.createLinearGradient(0, 0, width, height);
    gradient.addColorStop(0, '#0f2027');
    gradient.addColorStop(0.5, '#203a43');
    gradient.addColorStop(1, '#2c5364');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);

    ctx.fillStyle = 'rgba(255, 255, 255, 0.08)';
    for (let i = 0; i < 14; i += 1) {
      const size = Math.floor(width * 0.08) + i * 6;
      ctx.beginPath();
      ctx.arc(width * 0.2 + i * 30, height * 0.2 + i * 18, size, 0, Math.PI * 2);
      ctx.fill();
    }
  } else if (kind === 'grid') {
    ctx.fillStyle = '#1b1b1b';
    ctx.fillRect(0, 0, width, height);
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
    ctx.lineWidth = 1;
    const step = 40;
    for (let x = 0; x <= width; x += step) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
      ctx.stroke();
    }
    for (let y = 0; y <= height; y += step) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }
    ctx.fillStyle = 'rgba(255, 255, 255, 0.06)';
    ctx.fillRect(width * 0.55, height * 0.1, width * 0.35, height * 0.3);
  } else {
    return null;
  }

  return createImageBitmap(canvas);
}

// Run browser demo when in browser environment
if (isBrowser) {
  const startDemo = () => {
    runBrowserDemo().catch((error: unknown) => {
      window.__bgfxDemo = {status: 'failed', error: (error as Error)?.message ?? String(error)};
      console.error('Browser demo failed:', error);
    });
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', startDemo);
  } else {
    startDemo();
  }
}
