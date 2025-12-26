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

// @ts-ignore
import compositeBlurFrag from '../shaders/compositeBlur.frag';
// @ts-ignore
import compositeVirtualFrag from '../shaders/compositeVirtual.frag';
// @ts-ignore
import debugOverlayFrag from '../shaders/debugOverlay.frag';
// @ts-ignore
import downsampleFrag from '../shaders/downsample.frag';
// @ts-ignore
import fullscreenVert from '../shaders/fullscreen.vert';
// @ts-ignore
import gaussianBlurHFrag from '../shaders/gaussianBlurH.frag';
// @ts-ignore
import gaussianBlurVFrag from '../shaders/gaussianBlurV.frag';
// @ts-ignore
import jointBilateralFrag from '../shaders/jointBilateralMask.frag';
// @ts-ignore
import maskUpsampleFrag from '../shaders/maskUpsample.frag';
// @ts-ignore
import temporalMaskFrag from '../shaders/temporalMask.frag';
import type {DebugMode, EffectMode, QualityTierParams} from '../types';

/**
 * WebGL program information including program handle and uniform locations.
 */
interface ProgramInfo {
  /** Compiled and linked WebGL program. */
  program: WebGLProgram;
  /** Map of uniform names to their locations (null if uniform not found). */
  uniforms: Record<string, WebGLUniformLocation | null>;
}

/**
 * Texture or canvas dimensions.
 */
interface Size {
  /** Width in pixels. */
  width: number;
  /** Height in pixels. */
  height: number;
}

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

/**
 * Background texture information for virtual background mode.
 */
interface BackgroundInfo {
  /** WebGL texture containing background image/video. */
  texture: WebGLTexture | null;
  /** Background dimensions. */
  size: Size | null;
}

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
export class WebGLRenderer {
  /** WebGL2 rendering context. */
  private readonly gl: WebGL2RenderingContext;
  /** Vertex array object for fullscreen quad rendering. */
  private readonly vao: WebGLVertexArrayObject;
  /** Map of shader program names to compiled program info. */
  private readonly programs: Record<string, ProgramInfo>;
  /** Map of texture names to WebGL texture objects. */
  private readonly textures: Map<string, WebGLTexture> = new Map();
  /** Map of framebuffer names to WebGL framebuffer objects. */
  private readonly framebuffers: Map<string, WebGLFramebuffer> = new Map();
  /** Map of texture names to their dimensions. */
  private sizes: Record<string, Size> = {};
  /** Current renderer configuration. */
  private config: RendererConfig;
  /** Background texture for virtual background mode. */
  private background: BackgroundInfo = {texture: null, size: null};
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
    this.programs = this.createPrograms();
    // Initialize default configuration
    this.config = {
      width,
      height,
      quality: {
        tier: 'A',
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
    this.ensureResources();
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
    const gl = this.gl;
    if (!image) {
      if (this.background.texture) {
        gl.deleteTexture(this.background.texture);
      }
      this.background = {texture: null, size: null};
      return;
    }

    const texture = this.background.texture ?? gl.createTexture();
    if (!texture) {
      return;
    }

    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, 0);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);

    this.background = {
      texture,
      size: {width, height},
    };
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
   * @param maskLow - Low-resolution segmentation mask, or null if not available
   *                  (will use previous frame's mask for temporal consistency).
   */
  public render(frame: ImageBitmap, maskLow: ImageBitmap | null): void {
    const gl = this.gl;
    const {quality, width, height, mode, debugMode, blurStrength} = this.config;

    // Ensure all textures and framebuffers are ready
    this.ensureResources();

    gl.bindVertexArray(this.vao);
    // Upload input frame to video texture
    this.uploadTexture('videoTex', frame, width, height, undefined, undefined, true);
    // Upload low-res mask if available
    if (maskLow) {
      this.uploadTexture(
        'maskLowTex',
        maskLow,
        quality.segmentationWidth,
        quality.segmentationHeight,
        gl.RGBA8,
        gl.RGBA,
        true,
      );
    } else if (!this.textures.get('maskPrev')) {
      // No mask and no previous mask: passthrough
      this.drawSimple('compositePassthrough', null, width, height, {
        uSrc: this.textures.get('videoTex'),
        uTexelSize: [1 / width, 1 / height],
      });
      return;
    }

    // Bypass mode: passthrough without processing
    if (quality.bypass || mode === 'passthrough') {
      this.drawSimple('compositePassthrough', null, width, height, {
        uSrc: this.textures.get('videoTex'),
        uTexelSize: [1 / width, 1 / height],
      });
      return;
    }

    // Pass 1: Downsample video for blur (reduces blur processing cost)
    this.drawToTexture('downsample', 'videoSmallTex', this.sizes.videoSmallTex, {
      uSrc: this.textures.get('videoTex'),
      uTexelSize: [1 / width, 1 / height],
    });

    // Pass 2: Upsample mask to refine resolution
    if (maskLow) {
      // Use new low-res mask from segmentation
      this.drawToTexture('maskUpsample', 'maskRefineA', this.sizes.maskRefineA, {
        uSrc: this.textures.get('maskLowTex'),
        uTexelSize: [1 / quality.segmentationWidth, 1 / quality.segmentationHeight],
      });
    } else {
      // Reuse previous frame's mask (cadence > 1)
      this.drawToTexture('maskUpsample', 'maskRefineA', this.sizes.maskRefineA, {
        uSrc: this.textures.get('maskPrev'),
        uTexelSize: [1 / this.sizes.maskPrev.width, 1 / this.sizes.maskPrev.height],
      });
    }

    // Pass 3: Joint bilateral filter (edge-preserving smoothing using video as guide)
    this.drawToTexture('jointBilateral', 'maskRefineB', this.sizes.maskRefineB, {
      uMask: this.textures.get('maskRefineA'),
      uVideo: this.textures.get('videoTex'),
      uTexelSize: [1 / this.sizes.maskRefineA.width, 1 / this.sizes.maskRefineA.height],
      uSpatialSigma: quality.bilateralSpatialSigma,
      uRangeSigma: quality.bilateralRangeSigma,
      uRadius: quality.bilateralRadius,
    });

    // Pass 4: Temporal stabilization (exponential moving average with previous frame)
    if (this.maskPrevInitialized) {
      // Blend current mask with previous frame's mask for temporal consistency
      this.drawToTexture('temporalMask', 'maskStable', this.sizes.maskStable, {
        uMask: this.textures.get('maskRefineB'),
        uPrevMask: this.textures.get('maskPrev'),
        uTexelSize: [1 / this.sizes.maskStable.width, 1 / this.sizes.maskStable.height],
        uAlpha: quality.temporalAlpha,
      });
      // Swap stable mask to maskPrev for next frame
      this.swapTextures('maskStable', 'maskPrev');
    } else {
      // First frame: copy refined mask directly to maskPrev (no previous frame to blend)
      this.swapTextures('maskRefineB', 'maskPrev');
      this.maskPrevInitialized = true;
    }

    // Pass 5: Horizontal Gaussian blur (separable blur for efficiency)
    this.drawToTexture('blurH', 'blurHTex', this.sizes.blurHTex, {
      uSrc: this.textures.get('videoSmallTex'),
      uTexelSize: [1 / this.sizes.videoSmallTex.width, 1 / this.sizes.videoSmallTex.height],
      uRadius: quality.blurRadius,
    });

    // Pass 6: Vertical Gaussian blur (completes separable blur)
    this.drawToTexture('blurV', 'blurVTex', this.sizes.blurVTex, {
      uSrc: this.textures.get('blurHTex'),
      uTexelSize: [1 / this.sizes.blurHTex.width, 1 / this.sizes.blurHTex.height],
      uRadius: quality.blurRadius,
    });

    // Debug mode: Overlay mask visualization
    if (debugMode !== 'off') {
      this.drawSimple('debugOverlay', null, width, height, {
        uVideo: this.textures.get('videoTex'),
        uMask: this.textures.get('maskPrev'),
        uMode: debugMode,
      });
      return;
    }

    // Virtual background mode: Composite with background image/video
    if (mode === 'virtual') {
      this.drawSimple('compositeVirtual', null, width, height, {
        uVideo: this.textures.get('videoTex'),
        uMask: this.textures.get('maskPrev'),
        uBg: this.background.texture ?? this.textures.get('videoTex'),
        uTexelSize: [1 / width, 1 / height],
        uMatteLow: quality.matteLow,
        uMatteHigh: quality.matteHigh,
        uBgScale: this.getCoverScale(this.background.size, {width, height}),
      });
      return;
    }

    // Blur mode: Composite with blurred background
    this.drawSimple('compositeBlur', null, width, height, {
      uVideo: this.textures.get('videoTex'),
      uBlur: this.textures.get('blurVTex'),
      uMask: this.textures.get('maskPrev'),
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
    this.textures.forEach(texture => gl.deleteTexture(texture));
    if (this.background.texture) {
      gl.deleteTexture(this.background.texture);
    }
    this.framebuffers.forEach(fbo => gl.deleteFramebuffer(fbo));
    Object.values(this.programs).forEach(({program}) => gl.deleteProgram(program));
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

  /**
   * Creates all shader programs used by the renderer.
   *
   * Compiles and links all shader programs, storing uniform locations for
   * efficient uniform updates during rendering. All programs use the same
   * fullscreen vertex shader with different fragment shaders.
   *
   * @returns Map of program names to program info (program handle and uniform locations).
   */
  private createPrograms(): Record<string, ProgramInfo> {
    return {
      downsample: this.createProgram(fullscreenVert, downsampleFrag, ['uSrc', 'uTexelSize', 'uFlipY']),
      maskUpsample: this.createProgram(fullscreenVert, maskUpsampleFrag, ['uSrc', 'uTexelSize', 'uFlipY']),
      jointBilateral: this.createProgram(fullscreenVert, jointBilateralFrag, [
        'uMask',
        'uVideo',
        'uTexelSize',
        'uSpatialSigma',
        'uRangeSigma',
        'uRadius',
        'uFlipY',
      ]),
      temporalMask: this.createProgram(fullscreenVert, temporalMaskFrag, [
        'uMask',
        'uPrevMask',
        'uTexelSize',
        'uAlpha',
        'uFlipY',
      ]),
      blurH: this.createProgram(fullscreenVert, gaussianBlurHFrag, ['uSrc', 'uTexelSize', 'uRadius', 'uFlipY']),
      blurV: this.createProgram(fullscreenVert, gaussianBlurVFrag, ['uSrc', 'uTexelSize', 'uRadius', 'uFlipY']),
      compositeBlur: this.createProgram(fullscreenVert, compositeBlurFrag, [
        'uVideo',
        'uBlur',
        'uMask',
        'uTexelSize',
        'uSoftLow',
        'uSoftHigh',
        'uBlurStrength',
        'uFlipY',
      ]),
      compositeVirtual: this.createProgram(fullscreenVert, compositeVirtualFrag, [
        'uVideo',
        'uMask',
        'uBg',
        'uTexelSize',
        'uMatteLow',
        'uMatteHigh',
        'uBgScale',
        'uFlipY',
      ]),
      debugOverlay: this.createProgram(fullscreenVert, debugOverlayFrag, ['uVideo', 'uMask', 'uMode', 'uFlipY']),
      compositePassthrough: this.createProgram(fullscreenVert, downsampleFrag, ['uSrc', 'uTexelSize', 'uFlipY']),
    };
  }

  /**
   * Ensures all textures and framebuffers exist with correct dimensions.
   *
   * Creates or resizes textures and framebuffers based on current configuration.
   * Textures are reused if dimensions match, otherwise recreated. This method
   * is called whenever configuration changes to maintain resource consistency.
   */
  private ensureResources(): void {
    const {width, height, quality} = this.config;
    this.ensureTexture('videoTex', width, height, this.gl.RGBA8, this.gl.RGBA);

    const maskLow = {
      width: Math.max(1, quality.segmentationWidth),
      height: Math.max(1, quality.segmentationHeight),
    };
    this.ensureTexture('maskLowTex', maskLow.width, maskLow.height, this.gl.RGBA8, this.gl.RGBA);

    const refineSize = {
      width: Math.max(1, Math.floor(width * quality.maskRefineScale)),
      height: Math.max(1, Math.floor(height * quality.maskRefineScale)),
    };
    this.ensureTexture('maskRefineA', refineSize.width, refineSize.height, this.gl.RGBA8, this.gl.RGBA);
    this.ensureTexture('maskRefineB', refineSize.width, refineSize.height, this.gl.RGBA8, this.gl.RGBA);
    this.ensureTexture('maskStable', refineSize.width, refineSize.height, this.gl.RGBA8, this.gl.RGBA);
    const maskPrevWasNew = this.ensureTexture(
      'maskPrev',
      refineSize.width,
      refineSize.height,
      this.gl.RGBA8,
      this.gl.RGBA,
    );
    if (maskPrevWasNew) {
      this.initializeMaskPrevWithWhite(refineSize.width, refineSize.height);
      this.maskPrevInitialized = false; // Reset flag when texture is recreated
    }

    const blurSize = {
      width: Math.max(1, Math.floor(width * quality.blurDownsampleScale)),
      height: Math.max(1, Math.floor(height * quality.blurDownsampleScale)),
    };
    this.ensureTexture('videoSmallTex', blurSize.width, blurSize.height, this.gl.RGBA8, this.gl.RGBA);
    this.ensureTexture('blurHTex', blurSize.width, blurSize.height, this.gl.RGBA8, this.gl.RGBA);
    this.ensureTexture('blurVTex', blurSize.width, blurSize.height, this.gl.RGBA8, this.gl.RGBA);
  }

  /**
   * Ensures a texture exists with the specified dimensions.
   *
   * Creates a new texture if it doesn't exist or if dimensions changed.
   * Reuses existing texture if dimensions match. Also creates/updates the
   * associated framebuffer for rendering to this texture.
   *
   * @param key - Texture name identifier.
   * @param width - Texture width in pixels.
   * @param height - Texture height in pixels.
   * @param internalFormat - Internal texture format (e.g., RGBA8).
   * @param format - Pixel format (e.g., RGBA).
   * @returns True if a new texture was created, false if existing texture was reused.
   * @throws Error if texture creation fails.
   */
  private ensureTexture(key: string, width: number, height: number, internalFormat: number, format: number): boolean {
    const gl = this.gl;
    const existing = this.textures.get(key);
    const size = this.sizes[key];

    if (existing && size && size.width === width && size.height === height) {
      return false; // Texture already exists with correct size
    }

    if (existing) {
      gl.deleteTexture(existing);
    }

    const texture = gl.createTexture();
    if (!texture) {
      throw new Error('Failed to create texture');
    }
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texImage2D(gl.TEXTURE_2D, 0, internalFormat, width, height, 0, format, gl.UNSIGNED_BYTE, null);

    this.textures.set(key, texture);
    this.sizes[key] = {width, height};

    const fbo = this.framebuffers.get(key) ?? gl.createFramebuffer();
    if (fbo) {
      gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
      gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, texture, 0);
      this.framebuffers.set(key, fbo);
    }

    return true; // New texture was created
  }

  /**
   * Initializes maskPrev texture with white (fully opaque).
   *
   * Used when maskPrev texture is first created to avoid black mask on first frame.
   * White mask means "all foreground" which prevents artifacts during initialization.
   *
   * @param width - Texture width in pixels.
   * @param height - Texture height in pixels.
   */
  private initializeMaskPrevWithWhite(width: number, height: number): void {
    const gl = this.gl;
    const fbo = this.framebuffers.get('maskPrev');
    if (!fbo) {
      return;
    }

    // Fill texture with white using framebuffer clear
    gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
    gl.viewport(0, 0, width, height);
    gl.clearColor(1.0, 1.0, 1.0, 1.0); // White (1.0 = 255/255)
    gl.clear(gl.COLOR_BUFFER_BIT);
  }

  /**
   * Uploads an ImageBitmap to a WebGL texture.
   *
   * Updates the texture with new image data. Supports optional Y-flip for
   * correcting coordinate system differences between ImageBitmap and WebGL.
   *
   * @param key - Texture name identifier.
   * @param source - ImageBitmap to upload.
   * @param width - Image width in pixels.
   * @param height - Image height in pixels.
   * @param internalFormat - Optional internal texture format (defaults to RGBA).
   * @param format - Optional pixel format (defaults to RGBA).
   * @param flipY - If true, flips the image vertically during upload.
   */
  private uploadTexture(
    key: string,
    source: ImageBitmap,
    width: number,
    height: number,
    internalFormat?: number,
    format?: number,
    flipY = false,
  ): void {
    const gl = this.gl;
    const texture = this.textures.get(key);
    if (!texture) {
      return;
    }
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, flipY ? 1 : 0);
    if (internalFormat && format) {
      gl.texImage2D(gl.TEXTURE_2D, 0, internalFormat, width, height, 0, format, gl.UNSIGNED_BYTE, source);
    } else {
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, source);
    }
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, 0);
  }

  /**
   * Renders to a texture using a shader program.
   *
   * Binds the target texture's framebuffer and renders a fullscreen quad
   * using the specified shader program. Used for all intermediate rendering passes.
   *
   * @param programKey - Shader program name to use.
   * @param targetKey - Target texture name to render to.
   * @param size - Target texture dimensions.
   * @param uniforms - Uniform values to set (textures, scalars, vectors).
   */
  private drawToTexture(programKey: string, targetKey: string, size: Size, uniforms: Record<string, any>): void {
    const gl = this.gl;
    const programInfo = this.programs[programKey];
    const fbo = this.framebuffers.get(targetKey);
    if (!programInfo || !fbo) {
      return;
    }

    gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
    gl.viewport(0, 0, size.width, size.height);
    this.useProgram(programInfo, {...uniforms, uFlipY: 0.0});
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  }

  /**
   * Renders to canvas or framebuffer using a shader program.
   *
   * Renders a fullscreen quad using the specified shader program. If fbo is null,
   * renders to the canvas (final output). Otherwise renders to the specified framebuffer.
   * Automatically handles Y-flip for canvas rendering (WebGL coordinate system correction).
   *
   * @param programKey - Shader program name to use.
   * @param fbo - Target framebuffer, or null to render to canvas.
   * @param width - Viewport width in pixels.
   * @param height - Viewport height in pixels.
   * @param uniforms - Uniform values to set (textures, scalars, vectors).
   */
  private drawSimple(
    programKey: string,
    fbo: WebGLFramebuffer | null,
    width: number,
    height: number,
    uniforms: Record<string, any>,
  ): void {
    const gl = this.gl;
    const programInfo = this.programs[programKey];
    if (!programInfo) {
      return;
    }
    gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
    gl.viewport(0, 0, width, height);
    // Flip Y texture coordinates when rendering to canvas (fbo === null), not when rendering to framebuffers
    const flipY = fbo === null ? 1.0 : 0.0;
    this.useProgram(programInfo, {...uniforms, uFlipY: flipY});
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  }

  /**
   * Activates a shader program and sets all uniforms.
   *
   * Binds the program and sets all uniform values. Handles different uniform types:
   * - WebGLTexture: Binds to texture units sequentially
   * - Arrays: Sets as vec2 uniforms
   * - Numbers: Sets as float/int uniforms
   * - Strings: Maps debug mode strings to integers
   *
   * @param programInfo - Program info containing program handle and uniform locations.
   * @param uniforms - Map of uniform names to values.
   */
  private useProgram(programInfo: ProgramInfo, uniforms: Record<string, any>): void {
    const gl = this.gl;
    gl.useProgram(programInfo.program);

    let textureUnit = 0;
    Object.entries(uniforms).forEach(([name, value]) => {
      const location = programInfo.uniforms[name];
      if (!location) {
        return;
      }
      if (value instanceof WebGLTexture) {
        gl.activeTexture(gl.TEXTURE0 + textureUnit);
        gl.bindTexture(gl.TEXTURE_2D, value);
        gl.uniform1i(location, textureUnit);
        textureUnit += 1;
        return;
      }
      if (Array.isArray(value)) {
        gl.uniform2f(location, value[0], value[1]);
        return;
      }
      if (typeof value === 'number') {
        gl.uniform1f(location, value);
        return;
      }
      if (typeof value === 'string') {
        const modeMap: Record<string, number> = {
          off: 0,
          maskOverlay: 1,
          maskOnly: 2,
          edgeOnly: 3,
        };
        gl.uniform1i(location, modeMap[value] ?? 0);
      }
    });
  }

  /**
   * Creates a WebGL shader program from vertex and fragment shader sources.
   *
   * Compiles both shaders, links them into a program, and retrieves uniform locations.
   * Vertex attributes are bound to locations 0 (position) and 1 (texture coordinates).
   *
   * @param vertexSource - Vertex shader source code.
   * @param fragmentSource - Fragment shader source code.
   * @param uniforms - Array of uniform names to retrieve locations for.
   * @returns Program info with program handle and uniform locations.
   * @throws Error if shader compilation or program linking fails.
   */
  private createProgram(vertexSource: string, fragmentSource: string, uniforms: string[]): ProgramInfo {
    const gl = this.gl;
    const vertexShader = this.compileShader(gl.VERTEX_SHADER, vertexSource);
    const fragmentShader = this.compileShader(gl.FRAGMENT_SHADER, fragmentSource);

    const program = gl.createProgram();
    if (!program) {
      throw new Error('Failed to create WebGL program');
    }

    gl.attachShader(program, vertexShader);
    gl.attachShader(program, fragmentShader);
    gl.bindAttribLocation(program, 0, 'aPosition');
    gl.bindAttribLocation(program, 1, 'aTexCoord');
    gl.linkProgram(program);

    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      throw new Error(gl.getProgramInfoLog(program) || 'Failed to link program');
    }

    const uniformLocations: Record<string, WebGLUniformLocation | null> = {};
    uniforms.forEach(name => {
      uniformLocations[name] = gl.getUniformLocation(program, name);
    });

    return {program, uniforms: uniformLocations};
  }

  /**
   * Compiles a WebGL shader from source code.
   *
   * @param type - Shader type (VERTEX_SHADER or FRAGMENT_SHADER).
   * @param source - Shader source code.
   * @returns Compiled shader object.
   * @throws Error if shader compilation fails.
   */
  private compileShader(type: number, source: string): WebGLShader {
    const gl = this.gl;
    const shader = gl.createShader(type);
    if (!shader) {
      throw new Error('Failed to create shader');
    }
    gl.shaderSource(shader, source);
    gl.compileShader(shader);

    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      const info = gl.getShaderInfoLog(shader);
      gl.deleteShader(shader);
      throw new Error(info || 'Failed to compile shader');
    }

    return shader;
  }

  /**
   * Swaps two textures and their associated framebuffers and sizes.
   *
   * Used for ping-pong rendering (e.g., temporal stabilization) where textures
   * are swapped between frames to avoid copying data.
   *
   * @param a - First texture name.
   * @param b - Second texture name.
   */
  private swapTextures(a: string, b: string): void {
    const texA = this.textures.get(a);
    const texB = this.textures.get(b);
    if (!texA || !texB) {
      return;
    }
    this.textures.set(a, texB);
    this.textures.set(b, texA);

    const sizeA = this.sizes[a];
    const sizeB = this.sizes[b];
    this.sizes[a] = sizeB;
    this.sizes[b] = sizeA;

    const fboA = this.framebuffers.get(a);
    const fboB = this.framebuffers.get(b);
    if (fboA && fboB) {
      this.framebuffers.set(a, fboB);
      this.framebuffers.set(b, fboA);
    }
  }

  /**
   * Calculates scale factors for background image to cover target size.
   *
   * Computes scale factors for "cover" sizing (background fills entire area,
   * may be cropped). Used for virtual background to ensure background covers
   * the entire frame while maintaining aspect ratio.
   *
   * @param bgSize - Background image dimensions, or null.
   * @param target - Target dimensions to cover.
   * @returns Scale factors [x, y] for background texture coordinates.
   */
  private getCoverScale(bgSize: Size | null, target: Size): [number, number] {
    if (!bgSize || bgSize.width === 0 || bgSize.height === 0) {
      return [1, 1];
    }
    const scale = Math.max(target.width / bgSize.width, target.height / bgSize.height);
    return [(bgSize.width * scale) / target.width, (bgSize.height * scale) / target.height];
  }
}
