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

// @ts-ignore
// @ts-ignore
// @ts-ignore
// @ts-ignore
// @ts-ignore
// @ts-ignore
// @ts-ignore
// @ts-ignore
import compositeBlurFrag from '../shaders/compositeBlur.frag';
// @ts-ignore
import compositeVirtualFrag from '../shaders/compositeVirtual.frag';
// @ts-ignore
import debugOverlayFrag from '../shaders/debugOverlay.frag';
import downsampleFrag from '../shaders/downsample.frag';
import fullscreenVert from '../shaders/fullscreen.vert';
import gaussianBlurHFrag from '../shaders/gaussianBlurH.frag';
import gaussianBlurVFrag from '../shaders/gaussianBlurV.frag';
import jointBilateralFrag from '../shaders/jointBilateralMask.frag';
import maskUpsampleFrag from '../shaders/maskUpsample.frag';
import temporalMaskFrag from '../shaders/temporalMask.frag';
import type {DebugMode, EffectMode, QualityTierParams} from '../types';

interface ProgramInfo {
  program: WebGLProgram;
  uniforms: Record<string, WebGLUniformLocation | null>;
}

interface Size {
  width: number;
  height: number;
}

interface RendererConfig {
  width: number;
  height: number;
  quality: QualityTierParams;
  mode: EffectMode;
  debugMode: DebugMode;
  blurStrength: number;
}

interface BackgroundInfo {
  texture: WebGLTexture | null;
  size: Size | null;
}

export class WebGLRenderer {
  private readonly gl: WebGL2RenderingContext;
  private readonly vao: WebGLVertexArrayObject;
  private readonly programs: Record<string, ProgramInfo>;
  private readonly textures: Map<string, WebGLTexture> = new Map();
  private readonly framebuffers: Map<string, WebGLFramebuffer> = new Map();
  private sizes: Record<string, Size> = {};
  private config: RendererConfig;
  private background: BackgroundInfo = {texture: null, size: null};
  private maskPrevInitialized = false;

  constructor(
    private readonly canvas: HTMLCanvasElement | OffscreenCanvas,
    width: number,
    height: number,
  ) {
    const gl = canvas.getContext('webgl2', {premultipliedAlpha: false, desynchronized: true});
    if (!gl) {
      throw new Error('WebGL2 not supported');
    }
    this.gl = gl;
    this.vao = this.createQuad();
    this.programs = this.createPrograms();
    this.config = {
      width,
      height,
      quality: {
        tier: 'A',
        segmentationWidth: 256,
        segmentationHeight: 144,
        segmentationCadence: 1,
        maskRefineScale: 0.5,
        blurDownsampleScale: 0.5,
        blurRadius: 4,
        bilateralRadius: 5,
        bilateralSpatialSigma: 3.5,
        bilateralRangeSigma: 0.1,
        temporalAlpha: 0.8,
        bypass: false,
      },
      mode: 'blur',
      debugMode: 'off',
      blurStrength: 0.5,
    };
    this.configure(
      width,
      height,
      this.config.quality,
      this.config.mode,
      this.config.debugMode,
      this.config.blurStrength,
    );
  }

  public configure(
    width: number,
    height: number,
    quality: QualityTierParams,
    mode: EffectMode,
    debugMode: DebugMode,
    blurStrength: number,
  ): void {
    this.config = {width, height, quality, mode, debugMode, blurStrength};
    this.ensureResources();
  }

  public setBackground(image: ImageBitmap | null, width: number, height: number): void {
    const gl = this.gl;
    if (!image) {
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

  public render(frame: ImageBitmap, maskLow: ImageBitmap | null): void {
    const gl = this.gl;
    const {quality, width, height, mode, debugMode, blurStrength} = this.config;

    this.ensureResources();

    gl.bindVertexArray(this.vao);
    this.uploadTexture('videoTex', frame, width, height, undefined, undefined, true);
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
      this.drawSimple('compositePassthrough', null, width, height, {
        uSrc: this.textures.get('videoTex'),
        uTexelSize: [1 / width, 1 / height],
      });
      return;
    }

    if (quality.bypass || mode === 'passthrough') {
      this.drawSimple('compositePassthrough', null, width, height, {
        uSrc: this.textures.get('videoTex'),
        uTexelSize: [1 / width, 1 / height],
      });
      return;
    }

    // Pass 1: Downsample video for blur
    this.drawToTexture('downsample', 'videoSmallTex', this.sizes.videoSmallTex, {
      uSrc: this.textures.get('videoTex'),
      uTexelSize: [1 / width, 1 / height],
    });

    // Pass 2: Upsample mask to refine size
    if (maskLow) {
      this.drawToTexture('maskUpsample', 'maskRefineA', this.sizes.maskRefineA, {
        uSrc: this.textures.get('maskLowTex'),
        uTexelSize: [1 / quality.segmentationWidth, 1 / quality.segmentationHeight],
      });
    } else {
      this.drawToTexture('maskUpsample', 'maskRefineA', this.sizes.maskRefineA, {
        uSrc: this.textures.get('maskPrev'),
        uTexelSize: [1 / this.sizes.maskPrev.width, 1 / this.sizes.maskPrev.height],
      });
    }

    // Pass 3: Joint bilateral filter
    this.drawToTexture('jointBilateral', 'maskRefineB', this.sizes.maskRefineB, {
      uMask: this.textures.get('maskRefineA'),
      uVideo: this.textures.get('videoTex'),
      uTexelSize: [1 / this.sizes.maskRefineA.width, 1 / this.sizes.maskRefineA.height],
      uSpatialSigma: quality.bilateralSpatialSigma,
      uRangeSigma: quality.bilateralRangeSigma,
      uRadius: quality.bilateralRadius,
    });

    // Pass 4: Temporal stabilization (skip on first frame when maskPrev is empty)
    if (this.maskPrevInitialized) {
      this.drawToTexture('temporalMask', 'maskStable', this.sizes.maskStable, {
        uMask: this.textures.get('maskRefineB'),
        uPrevMask: this.textures.get('maskPrev'),
        uTexelSize: [1 / this.sizes.maskStable.width, 1 / this.sizes.maskStable.height],
        uAlpha: quality.temporalAlpha,
      });
      this.swapTextures('maskStable', 'maskPrev');
    } else {
      // First frame: copy refined mask directly to maskPrev
      this.swapTextures('maskRefineB', 'maskPrev');
      this.maskPrevInitialized = true;
    }

    // Pass 5+6: Blur
    this.drawToTexture('blurH', 'blurHTex', this.sizes.blurHTex, {
      uSrc: this.textures.get('videoSmallTex'),
      uTexelSize: [1 / this.sizes.videoSmallTex.width, 1 / this.sizes.videoSmallTex.height],
      uRadius: quality.blurRadius,
    });

    this.drawToTexture('blurV', 'blurVTex', this.sizes.blurVTex, {
      uSrc: this.textures.get('blurHTex'),
      uTexelSize: [1 / this.sizes.blurHTex.width, 1 / this.sizes.blurHTex.height],
      uRadius: quality.blurRadius,
    });

    if (debugMode !== 'off') {
      this.drawSimple('debugOverlay', null, width, height, {
        uVideo: this.textures.get('videoTex'),
        uMask: this.textures.get('maskPrev'),
        uMode: debugMode,
      });
      return;
    }

    if (mode === 'virtual') {
      this.drawSimple('compositeVirtual', null, width, height, {
        uVideo: this.textures.get('videoTex'),
        uMask: this.textures.get('maskPrev'),
        uBg: this.background.texture ?? this.textures.get('videoTex'),
        uTexelSize: [1 / width, 1 / height],
        uMatteLow: 0.4,
        uMatteHigh: 0.6,
        uBgScale: this.getCoverScale(this.background.size, {width, height}),
      });
      return;
    }

    this.drawSimple('compositeBlur', null, width, height, {
      uVideo: this.textures.get('videoTex'),
      uBlur: this.textures.get('blurVTex'),
      uMask: this.textures.get('maskPrev'),
      uTexelSize: [1 / width, 1 / height],
      uSoftLow: 0.2,
      uSoftHigh: 0.8,
      uBlurStrength: blurStrength,
    });
  }

  public destroy(): void {
    const gl = this.gl;
    this.textures.forEach(texture => gl.deleteTexture(texture));
    this.framebuffers.forEach(fbo => gl.deleteFramebuffer(fbo));
    Object.values(this.programs).forEach(({program}) => gl.deleteProgram(program));
    gl.deleteVertexArray(this.vao);
  }

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
    gl.bufferData(
      gl.ARRAY_BUFFER,
      new Float32Array([-1, -1, 0, 0, 1, -1, 1, 0, -1, 1, 0, 1, 1, 1, 1, 1]),
      gl.STATIC_DRAW,
    );

    const positionLocation = 0;
    const texLocation = 1;
    gl.enableVertexAttribArray(positionLocation);
    gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 16, 0);
    gl.enableVertexAttribArray(texLocation);
    gl.vertexAttribPointer(texLocation, 2, gl.FLOAT, false, 16, 8);

    return vao;
  }

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

  private getCoverScale(bgSize: Size | null, target: Size): [number, number] {
    if (!bgSize || bgSize.width === 0 || bgSize.height === 0) {
      return [1, 1];
    }
    const scale = Math.max(target.width / bgSize.width, target.height / bgSize.height);
    return [(bgSize.width * scale) / target.width, (bgSize.height * scale) / target.height];
  }
}
