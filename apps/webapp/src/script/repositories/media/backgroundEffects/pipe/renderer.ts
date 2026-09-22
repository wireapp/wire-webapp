/*
 * Wire
 * Copyright (C) 2026 Wire Swiss GmbH
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

import {getSafeLogger} from 'Repositories/media/backgroundEffects/helper/logger';
import {BackgroundSource} from 'Repositories/media/VideoBackgroundEffects';

export type ImageTexture = {
  texture: WebGLTexture;
  width: number;
  height: number;
  url: string;
};

type ImageInfo = {
  type: 'image';
  texture: WebGLTexture;
  width: number;
  height: number;
  url: string;
};

type ColorInfo = {
  type: 'color';
  texture: WebGLTexture;
  color: readonly [number, number, number, number];
};

type BackgroundRenderInfo = ImageInfo | ColorInfo;

type RenderOptions = {
  smoothing: number;
  smoothstepMin: number;
  smoothstepMax: number;
  backgroundSource?: BackgroundSource | null;
  borderSmooth: number;
  bgBlur: number;
  bgBlurRadius: number;
};

export class WebGLRenderer {
  readonly logger = getSafeLogger('WebGLRenderer');
  readonly canvas: OffscreenCanvas;
  readonly gl: WebGL2RenderingContext;

  readonly blendProgram: WebGLProgram;
  readonly blendLocations: {
    position: number;
    texCoord: number;
    frameTexture: WebGLUniformLocation | null;
    currentStateTexture: WebGLUniformLocation | null;
    backgroundTexture: WebGLUniformLocation | null;
    bgImageDimensions: WebGLUniformLocation | null;
    canvasDimensions: WebGLUniformLocation | null;
    borderSmooth: WebGLUniformLocation | null;
    bgBlur: WebGLUniformLocation | null;
    bgBlurRadius: WebGLUniformLocation | null;
    enabled: WebGLUniformLocation | null;
  };

  readonly stateUpdateProgram: WebGLProgram;
  readonly stateUpdateLocations: {
    position: number;
    texCoord: number;
    categoryTexture: WebGLUniformLocation | null;
    confidenceTexture: WebGLUniformLocation | null;
    prevStateTexture: WebGLUniformLocation | null;
    smoothingFactor: WebGLUniformLocation | null;
    smoothstepMin: WebGLUniformLocation | null;
    smoothstepMax: WebGLUniformLocation | null;
    selfieModel: WebGLUniformLocation | null;
  };

  readonly positionBuffer: WebGLBuffer | null;
  readonly texCoordBuffer: WebGLBuffer | null;
  readonly fbo: WebGLFramebuffer | null;

  storedStateTextures: (WebGLTexture | null)[];

  private running = false;
  private currentStateIndex = 0;
  private hasStoredMask = false;

  private backgroundRenderInfo: BackgroundRenderInfo | null = null;
  private activeBackgroundSourceIdentifier: string | null = null;

  private static readonly DEFAULT_BG_COLOR: readonly [number, number, number, number] = [33, 150, 243, 255];

  constructor(canvas: OffscreenCanvas) {
    this.canvas = canvas;

    const gl = this.canvas.getContext('webgl2', {
      alpha: false,
      antialias: false,
      desynchronized: true,
    });

    if (!gl) {
      throw new Error('WebGL2 not supported');
    }

    this.gl = gl;

    const vertexShaderSource = `
      attribute vec2 a_position;
      attribute vec2 a_texCoord;

      varying vec2 v_texCoord;

      void main() {
        gl_Position = vec4(a_position, 0.0, 1.0);
        v_texCoord = a_texCoord;
      }
    `;

    const stateUpdateFragmentShaderSource = `
      precision mediump float;

      varying vec2 v_texCoord;

      uniform sampler2D u_categoryTexture;
      uniform sampler2D u_confidenceTexture;
      uniform sampler2D u_prevStateTexture;

      uniform float u_smoothingFactor;
      uniform float u_smoothstepMin;
      uniform float u_smoothstepMax;

      uniform int u_selfieModel;

      void main() {
        vec2 prevCoord = vec2(
          v_texCoord.x,
          1.0 - v_texCoord.y
        );

        float categoryValue =
          texture2D(u_categoryTexture, v_texCoord).r;

        float confidenceValue =
          texture2D(u_confidenceTexture, v_texCoord).r;

        if (u_selfieModel == 1) {
          categoryValue = 1.0 - categoryValue;
          confidenceValue = 1.0 - confidenceValue;
        }

        if (categoryValue > 0.0) {
          categoryValue = 1.0;
          confidenceValue = 1.0 - confidenceValue;
        }

        float nonLinearConfidence = smoothstep(
          u_smoothstepMin,
          u_smoothstepMax,
          confidenceValue
        );

        float prevCategoryValue =
          texture2D(u_prevStateTexture, prevCoord).r;

        float alpha =
          u_smoothingFactor * nonLinearConfidence;

        float newCategoryValue =
          alpha * categoryValue +
          (1.0 - alpha) * prevCategoryValue;

        gl_FragColor = vec4(
          newCategoryValue,
          0.0,
          0.0,
          0.0
        );
      }
    `;

    this.stateUpdateProgram = this.createAndLinkProgram(vertexShaderSource, stateUpdateFragmentShaderSource);

    this.stateUpdateLocations = {
      position: gl.getAttribLocation(this.stateUpdateProgram, 'a_position'),
      texCoord: gl.getAttribLocation(this.stateUpdateProgram, 'a_texCoord'),
      categoryTexture: gl.getUniformLocation(this.stateUpdateProgram, 'u_categoryTexture'),
      confidenceTexture: gl.getUniformLocation(this.stateUpdateProgram, 'u_confidenceTexture'),
      prevStateTexture: gl.getUniformLocation(this.stateUpdateProgram, 'u_prevStateTexture'),
      smoothingFactor: gl.getUniformLocation(this.stateUpdateProgram, 'u_smoothingFactor'),
      smoothstepMin: gl.getUniformLocation(this.stateUpdateProgram, 'u_smoothstepMin'),
      smoothstepMax: gl.getUniformLocation(this.stateUpdateProgram, 'u_smoothstepMax'),
      selfieModel: gl.getUniformLocation(this.stateUpdateProgram, 'u_selfieModel'),
    };

    const blendFragmentShaderSource = `
      precision mediump float;

      varying vec2 v_texCoord;

      uniform sampler2D u_frameTexture;
      uniform sampler2D u_currentStateTexture;
      uniform sampler2D u_backgroundTexture;

      uniform vec2 u_bgImageDimensions;
      uniform vec2 u_canvasDimensions;

      uniform float u_borderSmooth;
      uniform float u_bgBlur;
      uniform float u_bgBlurRadius;

      uniform int u_enabled;

      const float PI = 3.141592653589793;

      float gaussianWeight(float offset, float sigma) {
        return exp(
          -(offset * offset) /
          (2.0 * sigma * sigma)
        );
      }

      vec4 getMixedFragColor(
        vec2 bgTexCoord,
        vec2 categoryCoord,
        vec2 offset
      ) {
        vec4 backgroundColor = texture2D(
          u_backgroundTexture,
          bgTexCoord + offset
        );

        vec4 frameColor = texture2D(
          u_frameTexture,
          v_texCoord + offset
        );

        float categoryValue = texture2D(
          u_currentStateTexture,
          categoryCoord + offset
        ).r;

        return mix(
          backgroundColor,
          frameColor,
          categoryValue
        );
      }

      vec4 blurColor(
        float blur,
        float radius,
        bool mixed
      ) {
        vec2 categoryCoord = vec2(
          v_texCoord.x,
          1.0 - v_texCoord.y
        );

        vec2 texelSize =
          1.0 / u_canvasDimensions;

        vec4 blurredColor = vec4(0.0);
        float totalWeight = 0.0;

        for (
          float angle = 0.0;
          angle <= 2.0 * PI;
          angle += PI / 12.0
        ) {
          vec2 direction = vec2(
            cos(angle),
            sin(angle)
          );

          for (int i = -10; i <= 10; i++) {
            float offset =
              float(i) * (radius / 10.0);

            float weight =
              gaussianWeight(offset, blur);

            vec2 v_offset =
              direction * texelSize * offset;

            if (mixed) {
              blurredColor += getMixedFragColor(
                v_texCoord,
                categoryCoord,
                v_offset
              ) * weight;
            } else {
              blurredColor += texture2D(
                u_frameTexture,
                v_texCoord + v_offset
              ) * weight;
            }

            totalWeight += weight;
          }
        }

        return blurredColor / totalWeight;
      }

      void main() {
        if (u_enabled == 0) {
          gl_FragColor = texture2D(
            u_frameTexture,
            v_texCoord
          );

          return;
        }

        vec2 categoryCoord = vec2(
          v_texCoord.x,
          1.0 - v_texCoord.y
        );

        float categoryValue = texture2D(
          u_currentStateTexture,
          categoryCoord
        ).r;

        if (
          u_bgBlur > 0.0 &&
          u_bgBlurRadius > 0.0
        ) {
          if (categoryValue < 0.3) {
            gl_FragColor = blurColor(
              u_bgBlur,
              u_bgBlurRadius,
              false
            );
          } else {
            gl_FragColor = texture2D(
              u_frameTexture,
              v_texCoord
            );
          }

          return;
        }

        float canvasAspect =
          u_canvasDimensions.x /
          u_canvasDimensions.y;

        float bgAspect =
          u_bgImageDimensions.x /
          u_bgImageDimensions.y;

        vec2 bgTexCoord = v_texCoord;

        float scaleX = 1.0;
        float scaleY = 1.0;
        float offsetX = 0.0;
        float offsetY = 0.0;

        if (canvasAspect < bgAspect) {
          scaleY = 1.0;
          scaleX = bgAspect / canvasAspect;
          offsetX = (1.0 - scaleX) / 2.0;
        } else {
          scaleX = 1.0;
          scaleY = canvasAspect / bgAspect;
          offsetY = (1.0 - scaleY) / 2.0;
        }

        bgTexCoord = vec2(
          (v_texCoord.x - offsetX) / scaleX,
          (v_texCoord.y - offsetY) / scaleY
        );

        if (
          u_borderSmooth > 0.0 &&
          categoryValue > 0.1 &&
          categoryValue < 0.9
        ) {
          gl_FragColor = blurColor(
            u_borderSmooth,
            u_bgBlurRadius,
            false
          );
        } else {
          gl_FragColor = getMixedFragColor(
            bgTexCoord,
            categoryCoord,
            vec2(0.0, 0.0)
          );
        }
      }
    `;

    this.blendProgram = this.createAndLinkProgram(vertexShaderSource, blendFragmentShaderSource);

    this.blendLocations = {
      position: gl.getAttribLocation(this.blendProgram, 'a_position'),
      texCoord: gl.getAttribLocation(this.blendProgram, 'a_texCoord'),
      frameTexture: gl.getUniformLocation(this.blendProgram, 'u_frameTexture'),
      currentStateTexture: gl.getUniformLocation(this.blendProgram, 'u_currentStateTexture'),
      backgroundTexture: gl.getUniformLocation(this.blendProgram, 'u_backgroundTexture'),
      bgImageDimensions: gl.getUniformLocation(this.blendProgram, 'u_bgImageDimensions'),
      canvasDimensions: gl.getUniformLocation(this.blendProgram, 'u_canvasDimensions'),
      borderSmooth: gl.getUniformLocation(this.blendProgram, 'u_borderSmooth'),
      bgBlur: gl.getUniformLocation(this.blendProgram, 'u_bgBlur'),
      bgBlurRadius: gl.getUniformLocation(this.blendProgram, 'u_bgBlurRadius'),
      enabled: gl.getUniformLocation(this.blendProgram, 'u_enabled'),
    };

    this.positionBuffer = gl.createBuffer();

    gl.bindBuffer(gl.ARRAY_BUFFER, this.positionBuffer);

    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]), gl.STATIC_DRAW);

    this.texCoordBuffer = gl.createBuffer();

    gl.bindBuffer(gl.ARRAY_BUFFER, this.texCoordBuffer);

    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([0, 1, 1, 1, 0, 0, 0, 0, 1, 1, 1, 0]), gl.STATIC_DRAW);

    this.storedStateTextures = Array.from({length: 2}, () => {
      const texture = gl.createTexture();

      gl.bindTexture(gl.TEXTURE_2D, texture);

      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array([0, 0, 0, 255]));

      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);

      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);

      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);

      return texture;
    });

    gl.bindTexture(gl.TEXTURE_2D, null);

    this.fbo = gl.createFramebuffer();
    this.running = true;
  }

  /**
   * Renders the frame with new MediaPipe masks.
   *
   * This updates the stored ping-pong state and then
   * renders the frame using the newly calculated state.
   */
  public renderWithNewMasks(
    videoFrame: VideoFrame,
    options: RenderOptions,
    categoryTexture: WebGLTexture,
    confidenceTexture: WebGLTexture,
    useSelfieModel = false,
  ): void {
    if (!this.running) {
      return;
    }

    const stateTexture = this.updateMaskState(options, categoryTexture, confidenceTexture, useSelfieModel);

    if (!stateTexture) {
      this.logger.warn('Unable to update segmentation mask state.');

      this.renderPassthrough(videoFrame);
      return;
    }

    this.hasStoredMask = true;

    this.renderWithMaskTexture(videoFrame, options, stateTexture);
  }

  /**
   * Renders the frame using the most recently stored mask.
   *
   * MediaPipe is not called and the state-update shader
   * is not executed.
   */
  public renderWithPreviousMask(videoFrame: VideoFrame, options: RenderOptions): void {
    if (!this.running) {
      return;
    }

    if (!this.hasStoredMask) {
      this.logger.warn('No previous segmentation mask is available.');

      this.renderPassthrough(videoFrame);
      return;
    }

    const stateTexture = this.storedStateTextures[this.currentStateIndex];

    if (!stateTexture) {
      this.logger.warn('Stored segmentation texture is missing.');

      this.renderPassthrough(videoFrame);
      return;
    }

    this.renderWithMaskTexture(videoFrame, options, stateTexture);
  }

  /**
   * Renders the original frame without applying a
   * background effect.
   */
  public renderPassthrough(videoFrame: VideoFrame): void {
    if (!this.running) {
      return;
    }

    const {gl, blendProgram, blendLocations} = this;

    gl.bindFramebuffer(gl.FRAMEBUFFER, null);

    gl.viewport(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight);

    gl.useProgram(blendProgram);

    const frameTexture = this.createFrameTexture(videoFrame);

    if (!frameTexture) {
      this.logger.warn('Unable to create frame texture.');

      return;
    }

    gl.activeTexture(gl.TEXTURE0);

    gl.bindTexture(gl.TEXTURE_2D, frameTexture);

    gl.uniform1i(blendLocations.frameTexture, 0);

    gl.uniform1i(blendLocations.enabled, 0);

    this.bindVertexAttributes(blendLocations.position, blendLocations.texCoord);

    gl.drawArrays(gl.TRIANGLES, 0, 6);

    gl.deleteTexture(frameTexture);

    this.unbindTextures(1);
  }

  /**
   * Updates the smoothed mask state using the current
   * MediaPipe category and confidence textures.
   */
  private updateMaskState(
    options: RenderOptions,
    categoryTexture: WebGLTexture,
    confidenceTexture: WebGLTexture,
    useSelfieModel: boolean,
  ): WebGLTexture | null {
    const {gl, fbo, storedStateTextures, stateUpdateProgram, stateUpdateLocations} = this;

    if (!fbo) {
      return null;
    }

    const width = this.canvas.width;
    const height = this.canvas.height;

    const readStateIndex = this.currentStateIndex;

    const writeStateIndex = (this.currentStateIndex + 1) % 2;

    const previousStateTexture = storedStateTextures[readStateIndex];

    const newStateTexture = storedStateTextures[writeStateIndex];

    if (!previousStateTexture || !newStateTexture) {
      return null;
    }

    gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);

    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, newStateTexture, 0);

    gl.bindTexture(gl.TEXTURE_2D, newStateTexture);

    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, width, height, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);

    gl.viewport(0, 0, width, height);

    gl.useProgram(stateUpdateProgram);

    gl.activeTexture(gl.TEXTURE0);

    gl.bindTexture(gl.TEXTURE_2D, categoryTexture);

    gl.uniform1i(stateUpdateLocations.categoryTexture, 0);

    gl.activeTexture(gl.TEXTURE1);

    gl.bindTexture(gl.TEXTURE_2D, confidenceTexture);

    gl.uniform1i(stateUpdateLocations.confidenceTexture, 1);

    gl.activeTexture(gl.TEXTURE2);

    gl.bindTexture(gl.TEXTURE_2D, previousStateTexture);

    gl.uniform1i(stateUpdateLocations.prevStateTexture, 2);

    gl.uniform1f(stateUpdateLocations.smoothingFactor, options.smoothing);

    gl.uniform1f(stateUpdateLocations.smoothstepMin, options.smoothstepMin);

    gl.uniform1f(stateUpdateLocations.smoothstepMax, options.smoothstepMax);

    gl.uniform1i(stateUpdateLocations.selfieModel, useSelfieModel ? 1 : 0);

    this.bindVertexAttributes(stateUpdateLocations.position, stateUpdateLocations.texCoord);

    gl.drawArrays(gl.TRIANGLES, 0, 6);

    this.currentStateIndex = writeStateIndex;

    return newStateTexture;
  }

  /**
   * Performs the final frame/background blend using
   * the supplied mask-state texture.
   */
  private renderWithMaskTexture(videoFrame: VideoFrame, options: RenderOptions, stateTexture: WebGLTexture): void {
    const {gl, blendProgram, blendLocations} = this;

    const width = this.canvas.width;
    const height = this.canvas.height;

    this.updateBackgroundIfNeeded(options.backgroundSource);

    gl.bindFramebuffer(gl.FRAMEBUFFER, null);

    gl.viewport(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight);

    gl.useProgram(blendProgram);

    const frameTexture = this.createFrameTexture(videoFrame);

    if (!frameTexture) {
      this.logger.warn('Unable to create frame texture.');

      return;
    }

    gl.activeTexture(gl.TEXTURE0);

    gl.bindTexture(gl.TEXTURE_2D, frameTexture);

    gl.uniform1i(blendLocations.frameTexture, 0);

    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D, stateTexture);

    gl.uniform1i(blendLocations.currentStateTexture, 1);

    if (this.backgroundRenderInfo) {
      gl.activeTexture(gl.TEXTURE2);

      gl.bindTexture(gl.TEXTURE_2D, this.backgroundRenderInfo.texture);

      let backgroundWidth = 1;
      let backgroundHeight = 1;

      if (this.backgroundRenderInfo.type === 'image') {
        backgroundWidth = this.backgroundRenderInfo.width;

        backgroundHeight = this.backgroundRenderInfo.height;
      }

      gl.uniform1i(blendLocations.backgroundTexture, 2);

      gl.uniform2f(
        blendLocations.bgImageDimensions,
        backgroundWidth > 0 ? backgroundWidth : 1,
        backgroundHeight > 0 ? backgroundHeight : 1,
      );
    } else {
      this.logger.warn('Background render information is missing.');
    }

    gl.uniform2f(blendLocations.canvasDimensions, width, height);

    gl.uniform1f(blendLocations.borderSmooth, options.borderSmooth);

    gl.uniform1f(blendLocations.bgBlur, options.bgBlur);

    gl.uniform1f(blendLocations.bgBlurRadius, options.bgBlurRadius);

    gl.uniform1i(blendLocations.enabled, 1);

    this.bindVertexAttributes(blendLocations.position, blendLocations.texCoord);

    gl.drawArrays(gl.TRIANGLES, 0, 6);

    gl.deleteTexture(frameTexture);

    this.unbindTextures(3);
  }

  private createFrameTexture(videoFrame: VideoFrame): WebGLTexture | null {
    const {gl} = this;

    const frameTexture = gl.createTexture();

    if (!frameTexture) {
      return null;
    }

    gl.activeTexture(gl.TEXTURE0);

    gl.bindTexture(gl.TEXTURE_2D, frameTexture);

    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, videoFrame);

    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);

    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);

    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);

    return frameTexture;
  }

  private bindVertexAttributes(positionLocation: number, texCoordLocation: number): void {
    const {gl} = this;

    gl.enableVertexAttribArray(positionLocation);

    gl.bindBuffer(gl.ARRAY_BUFFER, this.positionBuffer);

    gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 0, 0);

    gl.enableVertexAttribArray(texCoordLocation);

    gl.bindBuffer(gl.ARRAY_BUFFER, this.texCoordBuffer);

    gl.vertexAttribPointer(texCoordLocation, 2, gl.FLOAT, false, 0, 0);
  }

  private unbindTextures(numberOfTextureUnits: number): void {
    const {gl} = this;

    for (let textureUnit = 0; textureUnit < numberOfTextureUnits; textureUnit++) {
      gl.activeTexture(gl.TEXTURE0 + textureUnit);

      gl.bindTexture(gl.TEXTURE_2D, null);
    }

    gl.activeTexture(gl.TEXTURE0);
  }

  private createAndLinkProgram(vertexShaderSource: string, fragmentShaderSource: string): WebGLProgram {
    const vertexShader = this.createShader(this.gl.VERTEX_SHADER, vertexShaderSource);

    const fragmentShader = this.createShader(this.gl.FRAGMENT_SHADER, fragmentShaderSource);

    const program = this.gl.createProgram();

    if (!program) {
      throw new Error('Failed to create program');
    }

    this.gl.attachShader(program, vertexShader);

    this.gl.attachShader(program, fragmentShader);

    this.gl.linkProgram(program);

    if (!this.gl.getProgramParameter(program, this.gl.LINK_STATUS)) {
      this.logger.error('Program link error:', this.gl.getProgramInfoLog(program));

      this.gl.deleteProgram(program);

      throw new Error('Link fail');
    }

    this.gl.detachShader(program, vertexShader);

    this.gl.detachShader(program, fragmentShader);

    this.gl.deleteShader(vertexShader);
    this.gl.deleteShader(fragmentShader);

    return program;
  }

  private createShader(type: number, source: string): WebGLShader {
    const shader = this.gl.createShader(type);

    if (!shader) {
      throw new Error(`Failed to create shader type: ${type}`);
    }

    this.gl.shaderSource(shader, source);

    this.gl.compileShader(shader);

    if (!this.gl.getShaderParameter(shader, this.gl.COMPILE_STATUS)) {
      this.logger.error('Shader compile error:', this.gl.getShaderInfoLog(shader));

      this.gl.deleteShader(shader);

      throw new Error('Failed to compile shader');
    }

    return shader;
  }

  private createColorTexture(
    red: number,
    green: number,
    blue: number,
    alpha: number,
  ): {
    texture: WebGLTexture;
    color: readonly [number, number, number, number];
  } {
    const texture = this.gl.createTexture();

    if (!texture) {
      throw new Error('Failed to create texture for color');
    }

    this.gl.bindTexture(this.gl.TEXTURE_2D, texture);

    const pixel = new Uint8Array([red, green, blue, alpha]);

    this.gl.texImage2D(this.gl.TEXTURE_2D, 0, this.gl.RGBA, 1, 1, 0, this.gl.RGBA, this.gl.UNSIGNED_BYTE, pixel);

    this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_S, this.gl.CLAMP_TO_EDGE);

    this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_T, this.gl.CLAMP_TO_EDGE);

    this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MIN_FILTER, this.gl.NEAREST);

    this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MAG_FILTER, this.gl.NEAREST);

    this.gl.bindTexture(this.gl.TEXTURE_2D, null);

    return {
      texture,
      color: [red, green, blue, alpha] as const,
    };
  }

  private updateBackgroundIfNeeded(newSource?: BackgroundSource | null): void {
    const {gl} = this;

    let newIdentifier: string;

    if (!newSource) {
      const [red, green, blue, alpha] = WebGLRenderer.DEFAULT_BG_COLOR;

      newIdentifier = `color(${red},${green},${blue},${alpha})`;
    } else {
      newIdentifier = newSource.url;
    }

    if (newIdentifier === this.activeBackgroundSourceIdentifier && this.backgroundRenderInfo) {
      return;
    }

    if (this.backgroundRenderInfo) {
      gl.deleteTexture(this.backgroundRenderInfo.texture);

      this.backgroundRenderInfo = null;
    }

    this.activeBackgroundSourceIdentifier = newIdentifier;

    if (!newSource) {
      const [red, green, blue, alpha] = WebGLRenderer.DEFAULT_BG_COLOR;

      const colorTexture = this.createColorTexture(red, green, blue, alpha);

      this.backgroundRenderInfo = {
        type: 'color',
        texture: colorTexture.texture,
        color: colorTexture.color,
      };
    } else if (newSource.type === 'image') {
      const {media, url} = newSource as {
        media: ImageBitmap;
        url: string;
      };

      const texture = gl.createTexture();

      if (!texture) {
        throw new Error('Failed to create texture object for image.');
      }

      gl.bindTexture(gl.TEXTURE_2D, texture);

      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, media);

      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);

      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);

      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);

      gl.bindTexture(gl.TEXTURE_2D, null);

      this.backgroundRenderInfo = {
        type: 'image',
        texture,
        width: media.width,
        height: media.height,
        url,
      };
    }

    if (!this.backgroundRenderInfo) {
      this.logger.error('Background information is missing. Using the default color.');

      const [red, green, blue, alpha] = WebGLRenderer.DEFAULT_BG_COLOR;

      const colorTexture = this.createColorTexture(red, green, blue, alpha);

      this.backgroundRenderInfo = {
        type: 'color',
        texture: colorTexture.texture,
        color: colorTexture.color,
      };

      this.activeBackgroundSourceIdentifier = `color(${red},${green},${blue},${alpha})`;
    }
  }

  public close(): void {
    if (!this.running) {
      return;
    }

    this.running = false;
    this.hasStoredMask = false;
    this.currentStateIndex = 0;

    const {gl, fbo} = this;

    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);

    gl.bindFramebuffer(gl.FRAMEBUFFER, null);

    gl.deleteFramebuffer(fbo);
    gl.deleteProgram(this.stateUpdateProgram);
    gl.deleteProgram(this.blendProgram);
    gl.deleteBuffer(this.positionBuffer);
    gl.deleteBuffer(this.texCoordBuffer);

    this.storedStateTextures.forEach(texture => {
      if (texture) {
        gl.deleteTexture(texture);
      }
    });

    this.storedStateTextures = [];

    if (this.backgroundRenderInfo?.texture) {
      gl.deleteTexture(this.backgroundRenderInfo.texture);

      this.backgroundRenderInfo = null;
    }

    this.activeBackgroundSourceIdentifier = null;
  }
}
