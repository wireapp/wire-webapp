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

/**
 * WebGL2 renderer for background effects processing.
 *
 * This module provides GPU-accelerated rendering for background blur and virtual
 * background effects. It implements a multi-pass rendering pipeline:
 * - Mask refinement (upsample, joint bilateral filtering)
 * - Temporal stabilization
 * - Background blur (downsample + Gaussian blur)
 * - Final compositing (blur or virtual background)
 *
 * The renderer works with both HTMLCanvasElement (main thread) and OffscreenCanvas
 * (Web Worker), enabling background thread processing for better performance.
 */

import {BackgroundRenderer} from './backgroundRenderer';
import {RenderPasses} from './renderPasses';
import {ShaderPrograms} from './shaderPrograms';
import {type Size, WebGlResources} from './webGlResources';

import type {DebugMode, EffectMode, QualityTierParams} from '../backgroundEffectsWorkerTypes';
import {computeBlurRadius} from '../quality';

/**
 * Renderer configuration state.
 */
interface RendererConfig {
  /** Output canvas width in pixels. */
  width: number;
  /** Output canvas height in pixels. */
  height: number;
  /** Quality tier parameters controlling rendering performance. */
  quality: QualityTierParams;
  /** Effect mode ('blur', 'virtual', or 'passthrough'). */
  mode: EffectMode;
  /** Debug visualization mode. */
  debugMode: DebugMode;
  /** Blur strength (0-1) for blur effect mode. */
  blurStrength: number;
}

interface MaskInputBitmap {
  type: 'bitmap';
  bitmap: ImageBitmap;
  width: number;
  height: number;
}

interface MaskInputTexture {
  type: 'texture';
  texture: WebGLTexture;
  width: number;
  height: number;
}

type MaskInput = MaskInputBitmap | MaskInputTexture;

/**
 * WebGL2 renderer for background effects processing.
 *
 * This class implements a multi-pass GPU rendering pipeline for background blur
 * and virtual background effects. It manages WebGL resources (textures, framebuffers,
 * shader programs) and performs the following rendering passes:
 *
 * 1. **Mask refinement**: Upsample low-res mask, apply joint bilateral filtering
 * 2. **Temporal stabilization**: Smooth mask across frames using exponential moving average
 * 3. **Background blur**: Downsample video, apply separable Gaussian blur
 * 4. **Compositing**: Blend foreground and blurred/virtual background using refined mask
 *
 * The renderer supports both main thread (HTMLCanvasElement) and worker thread
 * (OffscreenCanvas) operation for optimal performance.
 */
export class WebGlRenderer {
  /** WebGL2 rendering context. */
  private readonly gl: WebGL2RenderingContext;
  /** Vertex array object for fullscreen quad rendering. */
  private readonly vao: WebGLVertexArrayObject;
  /** Shader program manager. */
  private readonly programs: ShaderPrograms;
  /** WebGL resource manager for textures/framebuffers. */
  private readonly resources: WebGlResources;
  /** Render pass helpers. */
  private readonly passes: RenderPasses;
  /** Current renderer configuration. */
  private config: RendererConfig;
  /** Background renderer for virtual background mode. */
  private readonly background: BackgroundRenderer;
  /** Flag indicating if maskPrev has been initialized (for temporal stabilization). */
  private maskPrevInitialized = false;

  /**
   * Creates a new WebGL renderer.
   *
   * Initializes WebGL2 context, creates fullscreen quad VAO, compiles all shader
   * programs, and sets up initial configuration. The context is created with
   * premultipliedAlpha: false and desynchronized: true for optimal performance.
   *
   * @param canvas - Canvas element (HTMLCanvasElement or OffscreenCanvas).
   * @param width - Initial canvas width in pixels.
   * @param height - Initial canvas height in pixels.
   * @throws Error if WebGL2 is not supported.
   */
  constructor(canvas: HTMLCanvasElement | OffscreenCanvas, width: number, height: number) {
    const isOffscreen = typeof OffscreenCanvas !== 'undefined' && canvas instanceof OffscreenCanvas;
    // Create WebGL2 context with performance optimizations
    const gl = canvas.getContext('webgl2', {
      premultipliedAlpha: false,
      desynchronized: isOffscreen,
    });
    if (!gl) {
      throw new Error('WebGL2 not supported');
    }
    this.gl = gl;
    // Create fullscreen quad for rendering
    this.vao = this.createQuad();
    // Compile all shader programs
    this.programs = new ShaderPrograms(this.gl);
    // Initialize resources and passes
    this.resources = new WebGlResources(this.gl);
    this.passes = new RenderPasses(this.gl, this.programs, this.resources);
    this.background = new BackgroundRenderer(this.gl);
    // Initialize default configuration
    this.config = {
      width,
      height,
      quality: {
        tier: 'superhigh',
        segmentationWidth: 256,
        segmentationHeight: 144,
        segmentationCadence: 1,
        maskRefineScale: 0.5,
        blurDownsampleScale: 0.25,
        blurRadius: 4,
        bilateralRadius: 5,
        bilateralSpatialSigma: 3.5,
        bilateralRangeSigma: 0.1,
        softLow: 0.3,
        softHigh: 0.65,
        matteLow: 0.45,
        matteHigh: 0.6,
        matteHysteresis: 0.04,
        temporalAlpha: 0.8,
        bypass: false,
      },
      mode: 'blur',
      debugMode: 'off',
      blurStrength: 0.5,
    };
    // Configure renderer with initial settings (creates textures/framebuffers)
    this.configure(
      width,
      height,
      this.config.quality,
      this.config.mode,
      this.config.debugMode,
      this.config.blurStrength,
    );
  }

  /**
   * Configures the renderer with new settings.
   *
   * Updates configuration and ensures all textures and framebuffers are
   * created/resized to match the new dimensions and quality settings.
   * Should be called whenever dimensions or quality tier changes.
   *
   * @param width - New canvas width in pixels.
   * @param height - New canvas height in pixels.
   * @param quality - Quality tier parameters.
   * @param mode - Effect mode ('blur', 'virtual', or 'passthrough').
   * @param debugMode - Debug visualization mode.
   * @param blurStrength - Blur strength (0-1) for blur effect mode.
   */
  public configure(
    width: number,
    height: number,
    quality: QualityTierParams,
    mode: EffectMode,
    debugMode: DebugMode,
    blurStrength: number,
  ): void {
    this.config = {width, height, quality, mode, debugMode, blurStrength};
    // Ensure all textures and framebuffers exist with correct sizes
    const maskPrevWasNew = this.resources.ensureResources({width, height, quality});
    if (maskPrevWasNew) {
      this.maskPrevInitialized = false;
    }
  }

  /**
   * Sets the background image/video for virtual background mode.
   *
   * Uploads the image bitmap to a WebGL texture. If image is null, clears
   * the background. The texture is reused if it already exists (updated
   * in place for efficiency).
   *
   * @param image - Background image as ImageBitmap, or null to clear.
   * @param width - Image width in pixels.
   * @param height - Image height in pixels.
   */
  public setBackground(image: ImageBitmap | null, width: number, height: number): void {
    this.background.setBackground(image, width, height);
  }

  /**
   * Renders a frame with background effects applied.
   *
   * This is the main rendering method that implements the multi-pass pipeline:
   *
   * **Early exits:**
   * - If no mask and no previous mask: passthrough
   * - If bypass mode or passthrough mode: passthrough
   *
   * **Mask refinement pipeline:**
   * 1. Downsample video for blur processing
   * 2. Upsample low-res mask to refine resolution
   * 3. Joint bilateral filter (edge-preserving smoothing using video as guide)
   * 4. Temporal stabilization (exponential moving average with previous frame)
   *
   * **Blur pipeline:**
   * 5. Horizontal Gaussian blur pass
   * 6. Vertical Gaussian blur pass (separable blur for efficiency)
   *
   * **Final compositing:**
   * - Debug mode: Overlay mask visualization
   * - Virtual mode: Composite with background image/video
   * - Blur mode: Composite with blurred background
   *
   * @param frame - Input video frame as ImageBitmap.
   * @param maskLow - Low-resolution segmentation mask (bitmap or GPU texture),
   *                  or null if not available (will use previous frame's mask).
   */
  public render(frame: ImageBitmap, maskLow: MaskInput | null): void {
    const gl = this.gl;
    const {quality, width, height, mode, debugMode, blurStrength} = this.config;
    const isClassDebug = debugMode === 'classOverlay' || debugMode === 'classOnly';

    // Ensure all textures and framebuffers are ready
    const maskPrevWasNew = this.resources.ensureResources({width, height, quality});
    if (maskPrevWasNew) {
      this.maskPrevInitialized = false;
    }

    gl.bindVertexArray(this.vao);
    // Upload input frame to video texture
    this.resources.uploadTexture('videoTex', frame, width, height, undefined, undefined, true);
    // Upload low-res mask if available
    let maskTexture: WebGLTexture | null = null;
    let maskSize: Size | null = null;
    if (maskLow) {
      if (maskLow.type === 'bitmap') {
        this.resources.uploadTexture(
          'maskLowTex',
          maskLow.bitmap,
          maskLow.width,
          maskLow.height,
          gl.RGBA8,
          gl.RGBA,
          true,
        );
        maskTexture = this.resources.getTexture('maskLowTex') ?? null;
        maskSize = {width: maskLow.width, height: maskLow.height};
      } else {
        this.resources.ensureExternalMaskTexture(maskLow.texture);
        maskTexture = maskLow.texture;
        maskSize = {width: maskLow.width, height: maskLow.height};
      }
    } else if (!this.resources.getTexture('maskPrev')) {
      // No mask and no previous mask: passthrough
      this.passes.drawSimple('compositePassthrough', null, width, height, {
        uSrc: this.resources.getTexture('videoTex'),
        uTexelSize: [1 / width, 1 / height],
      });
      return;
    }

    if (isClassDebug) {
      if (!maskTexture) {
        this.passes.drawSimple('compositePassthrough', null, width, height, {
          uSrc: this.resources.getTexture('videoTex'),
          uTexelSize: [1 / width, 1 / height],
        });
        return;
      }
      this.passes.drawSimple('debugOverlay', null, width, height, {
        uVideo: this.resources.getTexture('videoTex'),
        uMask: maskTexture,
        uMode: debugMode,
      });
      return;
    }

    // Bypass mode: passthrough without processing
    if (quality.bypass || mode === 'passthrough') {
      this.passes.drawSimple('compositePassthrough', null, width, height, {
        uSrc: this.resources.getTexture('videoTex'),
        uTexelSize: [1 / width, 1 / height],
      });
      return;
    }

    // Pass 1: Downsample video for blur (reduces blur processing cost)
    this.passes.drawToTexture('downsample', 'videoSmallTex', this.resources.getSize('videoSmallTex')!, {
      uSrc: this.resources.getTexture('videoTex'),
      uTexelSize: [1 / width, 1 / height],
    });

    // Pass 2: Upsample mask to refine resolution
    if (maskTexture && maskSize) {
      // Use new low-res mask from segmentation
      this.passes.drawToTexture('maskUpsample', 'maskRefineA', this.resources.getSize('maskRefineA')!, {
        uSrc: maskTexture,
        uTexelSize: [1 / maskSize.width, 1 / maskSize.height],
      });
    } else {
      // Reuse previous frame's mask (cadence > 1)
      const maskPrevSize = this.resources.getSize('maskPrev')!;
      this.passes.drawToTexture('maskUpsample', 'maskRefineA', this.resources.getSize('maskRefineA')!, {
        uSrc: this.resources.getTexture('maskPrev'),
        uTexelSize: [1 / maskPrevSize.width, 1 / maskPrevSize.height],
      });
    }

    // Pass 3: Joint bilateral filter (edge-preserving smoothing using video as guide)
    const maskRefineASize = this.resources.getSize('maskRefineA')!;
    this.passes.drawToTexture('jointBilateral', 'maskRefineB', this.resources.getSize('maskRefineB')!, {
      uMask: this.resources.getTexture('maskRefineA'),
      uVideo: this.resources.getTexture('videoTex'),
      uTexelSize: [1 / maskRefineASize.width, 1 / maskRefineASize.height],
      uSpatialSigma: quality.bilateralSpatialSigma,
      uRangeSigma: quality.bilateralRangeSigma,
      uRadius: quality.bilateralRadius,
    });

    // Pass 4: Temporal stabilization (exponential moving average with previous frame)
    if (this.maskPrevInitialized) {
      // Blend current mask with previous frame's mask for temporal consistency
      const maskStableSize = this.resources.getSize('maskStable')!;
      this.passes.drawToTexture('temporalMask', 'maskStable', maskStableSize, {
        uMask: this.resources.getTexture('maskRefineB'),
        uPrevMask: this.resources.getTexture('maskPrev'),
        uTexelSize: [1 / maskStableSize.width, 1 / maskStableSize.height],
        uAlpha: quality.temporalAlpha,
      });
      // Swap stable mask to maskPrev for next frame
      this.resources.swapTextures('maskStable', 'maskPrev');
    } else {
      // First frame: copy refined mask directly to maskPrev (no previous frame to blend)
      this.resources.swapTextures('maskRefineB', 'maskPrev');
      this.maskPrevInitialized = true;
    }

    // Pass 5: Horizontal Gaussian blur (separable blur for efficiency)
    const dynamicBlurRadius = computeBlurRadius(quality, blurStrength, true);

    const videoSmallSize = this.resources.getSize('videoSmallTex')!;
    this.passes.drawToTexture('blurH', 'blurHTex', this.resources.getSize('blurHTex')!, {
      uSrc: this.resources.getTexture('videoSmallTex'),
      uTexelSize: [1 / videoSmallSize.width, 1 / videoSmallSize.height],
      uRadius: dynamicBlurRadius,
    });

    // Pass 6: Vertical Gaussian blur (completes separable blur)
    const blurHSize = this.resources.getSize('blurHTex')!;
    this.passes.drawToTexture('blurV', 'blurVTex', this.resources.getSize('blurVTex')!, {
      uSrc: this.resources.getTexture('blurHTex'),
      uTexelSize: [1 / blurHSize.width, 1 / blurHSize.height],
      uRadius: dynamicBlurRadius,
    });

    // Debug mode: Overlay mask visualization
    if (debugMode !== 'off') {
      this.passes.drawSimple('debugOverlay', null, width, height, {
        uVideo: this.resources.getTexture('videoTex'),
        uMask: this.resources.getTexture('maskPrev'),
        uMode: debugMode,
      });
      return;
    }

    // Virtual background mode: Composite with background image/video
    if (mode === 'virtual') {
      this.passes.drawSimple('compositeVirtual', null, width, height, {
        uVideo: this.resources.getTexture('videoTex'),
        uMask: this.resources.getTexture('maskPrev'),
        uBg: this.background.getTexture() ?? this.resources.getTexture('videoTex'),
        uTexelSize: [1 / width, 1 / height],
        uMatteLow: quality.matteLow,
        uMatteHigh: quality.matteHigh,
        uBgScale: this.background.getCoverScale({width, height}),
      });
      return;
    }

    // Blur mode: Composite with blurred background
    this.passes.drawSimple('compositeBlur', null, width, height, {
      uVideo: this.resources.getTexture('videoTex'),
      uBlur: this.resources.getTexture('blurVTex'),
      uMask: this.resources.getTexture('maskPrev'),
      uTexelSize: [1 / width, 1 / height],
      uSoftLow: quality.softLow,
      uSoftHigh: quality.softHigh,
      uBlurStrength: blurStrength,
    });
  }

  /**
   * Destroys all WebGL resources and cleans up.
   *
   * Deletes all textures, framebuffers, shader programs, and the vertex array object.
   * Should be called when the renderer is no longer needed to free GPU resources.
   */
  public destroy(): void {
    const gl = this.gl;
    this.resources.destroy();
    this.background.destroy();
    this.programs.destroy();
    gl.deleteVertexArray(this.vao);
  }

  /**
   * Creates a fullscreen quad vertex array object.
   *
   * Creates a VAO with a quad covering the entire screen (-1 to 1 in NDC space)
   * with texture coordinates (0,0) to (1,1). Used for all fullscreen rendering passes.
   *
   * Vertex format: [x, y, u, v] per vertex (4 vertices, 16 bytes per vertex)
   *
   * @returns Vertex array object for fullscreen quad rendering.
   * @throws Error if VAO or buffer creation fails.
   */
  private createQuad(): WebGLVertexArrayObject {
    const gl = this.gl;
    const vao = gl.createVertexArray();
    if (!vao) {
      throw new Error('Failed to create VAO');
    }
    gl.bindVertexArray(vao);

    const buffer = gl.createBuffer();
    if (!buffer) {
      throw new Error('Failed to create quad buffer');
    }
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    // Quad vertices: bottom-left, bottom-right, top-left, top-right
    // Format: [x, y, u, v] per vertex
    gl.bufferData(
      gl.ARRAY_BUFFER,
      new Float32Array([-1, -1, 0, 0, 1, -1, 1, 0, -1, 1, 0, 1, 1, 1, 1, 1]),
      gl.STATIC_DRAW,
    );

    // Position attribute (location 0): 2 floats, stride 16, offset 0
    const positionLocation = 0;
    // Texture coordinate attribute (location 1): 2 floats, stride 16, offset 8
    const texLocation = 1;
    gl.enableVertexAttribArray(positionLocation);
    gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 16, 0);
    gl.enableVertexAttribArray(texLocation);
    gl.vertexAttribPointer(texLocation, 2, gl.FLOAT, false, 16, 8);

    return vao;
  }

  // Resource and program management moved to helper classes.
}
