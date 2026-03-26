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

import type {QualityTierParams} from '../backgroundEffectsWorkerTypes';

/**
 * Size dimensions for textures and framebuffers.
 */
export interface Size {
  /** Width in pixels. */
  width: number;
  /** Height in pixels. */
  height: number;
}

/**
 * Configuration for WebGL resource allocation.
 */
export interface RendererConfig {
  /** Output canvas width in pixels. */
  width: number;
  /** Output canvas height in pixels. */
  height: number;
  /** Quality tier parameters controlling resource sizes. */
  quality: QualityTierParams;
}

/**
 * Manages WebGL resources (textures, framebuffers) for the rendering pipeline.
 *
 * Handles creation, sizing, and lifecycle of all WebGL resources needed for
 * background effects rendering. Automatically creates textures and framebuffers
 * based on quality tier parameters, and manages resource swapping for ping-pong
 * operations.
 */
export class WebGlResources {
  private readonly textures: Map<string, WebGLTexture> = new Map();
  private readonly framebuffers: Map<string, WebGLFramebuffer> = new Map();
  private sizes: Record<string, Size> = {};
  private maskTextureConfigured = new WeakSet<WebGLTexture>();
  private floatLinearSupported: boolean | null = null;

  constructor(private readonly gl: WebGL2RenderingContext) {}

  /**
   * Ensures all required WebGL resources are created and properly sized.
   *
   * Creates or resizes textures and framebuffers based on the renderer configuration
   * and quality tier. Allocates resources for:
   * - Video input texture
   * - Mask textures (low-res, refined, stable, previous)
   * - Blur intermediate textures (downsampled, horizontal, vertical)
   *
   * Returns true if maskPrev texture was newly created (needs initialization).
   *
   * @param config - Renderer configuration with dimensions and quality parameters.
   * @returns True if maskPrev texture was newly created, false otherwise.
   */
  public ensureResources(config: RendererConfig): boolean {
    const {width, height, quality} = config;
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
    }

    const blurSize = {
      width: Math.max(1, Math.floor(width * quality.blurDownsampleScale)),
      height: Math.max(1, Math.floor(height * quality.blurDownsampleScale)),
    };
    this.ensureTexture('videoSmallTex', blurSize.width, blurSize.height, this.gl.RGBA8, this.gl.RGBA);
    this.ensureTexture('blurHTex', blurSize.width, blurSize.height, this.gl.RGBA8, this.gl.RGBA);
    this.ensureTexture('blurVTex', blurSize.width, blurSize.height, this.gl.RGBA8, this.gl.RGBA);

    return maskPrevWasNew;
  }

  /**
   * Retrieves a texture by key.
   *
   * @param key - Texture key identifier.
   * @returns WebGL texture, or undefined if not found.
   */
  public getTexture(key: string): WebGLTexture | undefined {
    return this.textures.get(key);
  }

  /**
   * Retrieves the size of a texture by key.
   *
   * @param key - Texture key identifier.
   * @returns Size object, or undefined if not found.
   */
  public getSize(key: string): Size | undefined {
    return this.sizes[key];
  }

  /**
   * Retrieves a framebuffer by key.
   *
   * @param key - Framebuffer key identifier.
   * @returns WebGL framebuffer, or undefined if not found.
   */
  public getFramebuffer(key: string): WebGLFramebuffer | undefined {
    return this.framebuffers.get(key);
  }

  /**
   * Uploads image data to a texture.
   *
   * Binds the texture and uploads ImageBitmap data. Supports custom internal
   * format and format parameters, and optional Y-flip for coordinate system conversion.
   *
   * @param key - Texture key identifier.
   * @param source - ImageBitmap to upload.
   * @param width - Image width in pixels.
   * @param height - Image height in pixels.
   * @param internalFormat - Optional internal texture format (defaults to RGBA).
   * @param format - Optional texture format (defaults to RGBA).
   * @param flipY - Whether to flip the image vertically (defaults to false).
   * @returns Nothing.
   */
  public uploadTexture(
    key: string,
    source: ImageBitmap,
    width: number,
    height: number,
    internalFormat?: number,
    format?: number,
    flipY = false,
  ): void {
    const texture = this.textures.get(key);
    if (!texture) {
      return;
    }
    const gl = this.gl;
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
   * Configures an external mask texture for use in the rendering pipeline.
   *
   * Sets texture parameters (filtering, wrapping) for a mask texture that
   * was created outside this resource manager. Uses linear filtering if
   * float linear extension is available, otherwise uses nearest filtering.
   * Only configures once per texture (uses WeakSet to track).
   *
   * @param texture - External WebGL texture to configure.
   * @returns Nothing.
   */
  public ensureExternalMaskTexture(texture: WebGLTexture): void {
    if (this.maskTextureConfigured.has(texture)) {
      return;
    }
    const gl = this.gl;
    const floatLinearSupported =
      this.floatLinearSupported ??
      (this.floatLinearSupported =
        !!gl.getExtension('OES_texture_float_linear') || !!gl.getExtension('OES_texture_half_float_linear'));
    const filter = floatLinearSupported ? gl.LINEAR : gl.NEAREST;
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, filter);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, filter);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    this.maskTextureConfigured.add(texture);
  }

  /**
   * Swaps two textures and their associated framebuffers and sizes.
   *
   * Exchanges the textures, framebuffers, and size records for two keys.
   * Used for ping-pong rendering operations where buffers are alternated
   * between read and write.
   *
   * @param a - First texture key.
   * @param b - Second texture key.
   * @returns Nothing.
   */
  public swapTextures(a: string, b: string): void {
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
   * Destroys all WebGL resources and clears all references.
   *
   * Deletes all textures and framebuffers, and resets internal state.
   * Should be called when the renderer is no longer needed to prevent
   * memory leaks.
   *
   * @returns Nothing.
   */
  public destroy(): void {
    this.textures.forEach(texture => this.gl.deleteTexture(texture));
    this.framebuffers.forEach(fbo => this.gl.deleteFramebuffer(fbo));
    this.textures.clear();
    this.framebuffers.clear();
    this.sizes = {};
    this.maskTextureConfigured = new WeakSet();
    this.floatLinearSupported = null;
  }

  /**
   * Ensures a texture exists and is properly sized.
   *
   * Creates a new texture if it doesn't exist, or resizes it if dimensions
   * have changed. Creates an associated framebuffer for render-to-texture.
   * Returns true if the texture was newly created.
   *
   * @param key - Texture key identifier.
   * @param width - Required texture width in pixels.
   * @param height - Required texture height in pixels.
   * @param internalFormat - Internal texture format.
   * @param format - Texture format.
   * @returns True if texture was newly created, false if it already existed with correct size.
   */
  private ensureTexture(key: string, width: number, height: number, internalFormat: number, format: number): boolean {
    const gl = this.gl;
    const existing = this.textures.get(key);
    const size = this.sizes[key];

    if (existing && size && size.width === width && size.height === height) {
      return false;
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

    return true;
  }

  /**
   * Initializes the maskPrev texture with white (fully opaque).
   *
   * Clears the maskPrev framebuffer to white, providing a safe initial
   * state for temporal mask smoothing. Called when maskPrev is first created.
   *
   * @param width - Texture width in pixels.
   * @param height - Texture height in pixels.
   * @returns Nothing.
   */
  private initializeMaskPrevWithWhite(width: number, height: number): void {
    const fbo = this.framebuffers.get('maskPrev');
    if (!fbo) {
      return;
    }
    const gl = this.gl;
    gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
    gl.viewport(0, 0, width, height);
    gl.clearColor(1.0, 1.0, 1.0, 1.0);
    gl.clear(gl.COLOR_BUFFER_BIT);
  }
}
