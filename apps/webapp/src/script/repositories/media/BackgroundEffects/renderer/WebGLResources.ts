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

import type {QualityTierParams} from '../types';

export interface Size {
  width: number;
  height: number;
}

export interface RendererConfig {
  width: number;
  height: number;
  quality: QualityTierParams;
}

export class WebGLResources {
  private readonly textures: Map<string, WebGLTexture> = new Map();
  private readonly framebuffers: Map<string, WebGLFramebuffer> = new Map();
  private sizes: Record<string, Size> = {};
  private maskTextureConfigured = new WeakSet<WebGLTexture>();
  private floatLinearSupported: boolean | null = null;

  constructor(private readonly gl: WebGL2RenderingContext) {}

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

  public getTexture(key: string): WebGLTexture | undefined {
    return this.textures.get(key);
  }

  public getSize(key: string): Size | undefined {
    return this.sizes[key];
  }

  public getFramebuffer(key: string): WebGLFramebuffer | undefined {
    return this.framebuffers.get(key);
  }

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

  public destroy(): void {
    this.textures.forEach(texture => this.gl.deleteTexture(texture));
    this.framebuffers.forEach(fbo => this.gl.deleteFramebuffer(fbo));
    this.textures.clear();
    this.framebuffers.clear();
    this.sizes = {};
    this.maskTextureConfigured = new WeakSet();
    this.floatLinearSupported = null;
  }

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
