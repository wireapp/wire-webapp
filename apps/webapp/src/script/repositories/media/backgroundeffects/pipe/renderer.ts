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

import {getSafeLogger} from 'Repositories/media/backgroundeffects/helper/logger';
import {BackgroundSource} from 'Repositories/media/videobackgroundeffects';

export type ImageTexture = {texture: WebGLTexture; width: number; height: number; url: string};

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
  storedStateTextures: (WebGLTexture | null)[];
  readonly fbo: WebGLFramebuffer | null;

  private running = false;
  private static readonly DEFAULT_BG_COLOR: readonly [number, number, number, number] = [33, 150, 243, 255];
  private currentStateIndex = 0;
  private backgroundRenderInfo: BackgroundRenderInfo | null = null;
  private activeBackgroundSourceIdentifier: string | null = null;

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

    // State Update Shader
    const stateUpdateVertexShaderSource = `attribute vec2 a_position; attribute vec2 a_texCoord; varying vec2 v_texCoord; void main() { gl_Position = vec4(a_position, 0.0, 1.0); v_texCoord = a_texCoord; }`;
    const stateUpdateFragmentShaderSource = `
            precision mediump float;
            varying vec2 v_texCoord;
            uniform sampler2D u_categoryTexture;    // Current category mask
            uniform sampler2D u_confidenceTexture; // Current confidence mask
            uniform sampler2D u_prevStateTexture;  // Previous frame's averaged state
            uniform float u_smoothingFactor;     // Alpha for moving average
            uniform float u_smoothstepMin;       // Lower edge for smoothstep
            uniform float u_smoothstepMax;       // Upper edge for smoothstep
            uniform int u_selfieModel;

            void main() {
                vec2 prevCoord = vec2(v_texCoord.x, 1.0 - v_texCoord.y);
                float categoryValue = texture2D(u_categoryTexture, v_texCoord).r;
                float confidenceValue = texture2D(u_confidenceTexture, v_texCoord).r;

                if (u_selfieModel == 1) {
                    categoryValue = 1.0 - categoryValue;
                    confidenceValue = 1.0 - confidenceValue;
                }

                if (categoryValue > 0.0) {
                    categoryValue = 1.0;
                    confidenceValue = 1.0 - confidenceValue;
                }

                float nonLinearConfidence = smoothstep(u_smoothstepMin, u_smoothstepMax, confidenceValue);
                float prevCategoryValue = texture2D(u_prevStateTexture, prevCoord).r;
                float alpha = u_smoothingFactor * nonLinearConfidence;
                float newCategoryValue = alpha * categoryValue + (1.0 - alpha) * prevCategoryValue;

                gl_FragColor = vec4(newCategoryValue, 0.0, 0.0, 0.0);
            }
        `;
    this.stateUpdateProgram = this.createAndLinkProgram(stateUpdateVertexShaderSource, stateUpdateFragmentShaderSource);
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

    // Blending Shader
    const blendVertexShaderSource = stateUpdateVertexShaderSource; // Reuse vertex shader
    const blendFragmentShaderSource = `
            precision mediump float;
            varying vec2 v_texCoord;

            uniform sampler2D u_frameTexture;
            uniform sampler2D u_currentStateTexture; // Reads the UPDATED state
            uniform sampler2D u_backgroundTexture; // Use background texture
            uniform vec2 u_bgImageDimensions;   // Dimensions of the background image
            uniform vec2 u_canvasDimensions;    // Dimensions of the canvas
            uniform float u_borderSmooth;
            uniform float u_bgBlur;
            uniform float u_bgBlurRadius;
            uniform int u_enabled;

            const float PI = 3.141592653589793;

            float gaussianWeight(float offset, float sigma) {
                return exp(-(offset * offset) / (2.0 * sigma * sigma));
            }

            vec4 getMixedFragColor(vec2 bgTexCoord, vec2 categoryCoord, vec2 offset) {
                vec4 backgroundColor = texture2D(u_backgroundTexture, bgTexCoord + offset);
                vec4 frameColor = texture2D(u_frameTexture, v_texCoord + offset);
                float categoryValue = texture2D(u_currentStateTexture, categoryCoord + offset).r;
                return mix(backgroundColor, frameColor, categoryValue);
            }

            vec4 blurColor(float blur, float radius, bool mixed) {
                vec2 categoryCoord = vec2(v_texCoord.x, 1.0 - v_texCoord.y);
                vec2 texelSize = 1.0 / u_canvasDimensions;
                vec4 blurredColor = vec4(0.0);
                float totalWeight = 0.0;
                for (float angle = 0.0; angle <= 2.0 * PI; angle += PI / 12.0) {
                    vec2 direction = vec2(cos(angle), sin(angle));
                    for (int i = -10; i <= 10; i++) {
                        float offset = float(i) * (radius / 10.0);
                        float weight = gaussianWeight(offset, blur);
                        vec2 v_offset = direction * texelSize * offset;
                        if (mixed) {
                            blurredColor += getMixedFragColor(v_texCoord, categoryCoord, v_offset) * weight;
                        } else {
                            blurredColor += texture2D(u_frameTexture, v_texCoord + v_offset) * weight;
                        }
                        totalWeight += weight;
                    }
                }
                return blurredColor / totalWeight;
            }

            void main() {
                if (u_enabled == 0) {
                    gl_FragColor = texture2D(u_frameTexture, v_texCoord);
                    return;
                }

                vec2 categoryCoord = vec2(v_texCoord.x, 1.0 - v_texCoord.y);
                float categoryValue = texture2D(u_currentStateTexture, categoryCoord).r;

                if (u_bgBlur > 0.0 && u_bgBlurRadius > 0.0) {
                    if (categoryValue < 0.3) {
                        gl_FragColor = blurColor(u_bgBlur, u_bgBlurRadius, false);
                    } else {
                        gl_FragColor = texture2D(u_frameTexture, v_texCoord);
                    }
                    return;
                }

                // Calculate tex coords for "cover" effect
                float canvasAspect = u_canvasDimensions.x / u_canvasDimensions.y;
                float bgAspect = u_bgImageDimensions.x / u_bgImageDimensions.y;

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
                bgTexCoord = vec2( (v_texCoord.x - offsetX) / scaleX, (v_texCoord.y - offsetY) / scaleY );

                // Apply border smoothing
                if (u_borderSmooth > 0.0 && categoryValue > 0.1 && categoryValue < 0.9) {
                    gl_FragColor = blurColor(u_borderSmooth, u_bgBlurRadius, false);
                } else {
                    gl_FragColor = getMixedFragColor(bgTexCoord, categoryCoord, vec2(0.0, 0.0));
                }
            }
        `;
    this.blendProgram = this.createAndLinkProgram(blendVertexShaderSource, blendFragmentShaderSource);
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

    // Buffers for fullscreen quad
    this.positionBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, this.positionBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]), gl.STATIC_DRAW);

    this.texCoordBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, this.texCoordBuffer);
    gl.bufferData(
      gl.ARRAY_BUFFER,
      new Float32Array([
        0,
        1,
        1,
        1,
        0,
        0,
        0,
        0,
        1,
        1,
        1,
        0, // Flipped Y for WebGL texture coordinates
      ]),
      gl.STATIC_DRAW,
    );

    // Create Textures for Storing State (Ping-Pong)
    this.storedStateTextures = Array.from({length: 2}, () => {
      const tex = gl.createTexture();
      gl.bindTexture(gl.TEXTURE_2D, tex);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array([0, 0, 0, 255]));
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      return tex;
    });
    gl.bindTexture(gl.TEXTURE_2D, null);

    this.fbo = gl.createFramebuffer();

    this.running = true;
  }

  private createAndLinkProgram(vsSource: string, fsSource: string): WebGLProgram {
    const vs = this.createShader(this.gl.VERTEX_SHADER, vsSource);
    const fs = this.createShader(this.gl.FRAGMENT_SHADER, fsSource);
    const prog = this.gl.createProgram();
    if (!prog) {
      throw new Error('Failed to create program');
    }
    this.gl.attachShader(prog, vs);
    this.gl.attachShader(prog, fs);
    this.gl.linkProgram(prog);
    if (!this.gl.getProgramParameter(prog, this.gl.LINK_STATUS)) {
      this.logger.error('Program link error:', this.gl.getProgramInfoLog(prog));
      this.gl.deleteProgram(prog);
      throw new Error('Link fail');
    }
    this.gl.detachShader(prog, vs);
    this.gl.detachShader(prog, fs);
    this.gl.deleteShader(vs);
    this.gl.deleteShader(fs);
    return prog;
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
    r: number,
    g: number,
    b: number,
    a: number,
  ): {texture: WebGLTexture; color: readonly [number, number, number, number]} {
    const texture = this.gl.createTexture();
    if (!texture) {
      throw new Error('Failed to create texture for color');
    }
    this.gl.bindTexture(this.gl.TEXTURE_2D, texture);
    const pixel = new Uint8Array([r, g, b, a]);
    this.gl.texImage2D(this.gl.TEXTURE_2D, 0, this.gl.RGBA, 1, 1, 0, this.gl.RGBA, this.gl.UNSIGNED_BYTE, pixel);
    this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_S, this.gl.CLAMP_TO_EDGE);
    this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_T, this.gl.CLAMP_TO_EDGE);
    this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MIN_FILTER, this.gl.NEAREST);
    this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MAG_FILTER, this.gl.NEAREST);
    this.gl.bindTexture(this.gl.TEXTURE_2D, null);
    return {texture, color: [r, g, b, a] as const};
  }

  private updateBackgroundIfNeeded(newSource?: BackgroundSource | null) {
    const gl = this.gl;
    let newIdentifier: string;

    if (!newSource) {
      const [r, g, b, a] = WebGLRenderer.DEFAULT_BG_COLOR;
      newIdentifier = `color(${r},${g},${b},${a})`;
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
      const [r, g, b, a] = WebGLRenderer.DEFAULT_BG_COLOR;
      const colorTexData = this.createColorTexture(r, g, b, a);
      this.backgroundRenderInfo = {
        type: 'color',
        texture: colorTexData.texture,
        color: colorTexData.color,
      };
      this.activeBackgroundSourceIdentifier = `color(${r},${g},${b},${a})`;
    } else if (newSource.type === 'image') {
      const {media, url} = newSource as {media: ImageBitmap; url: string};
      const texture = this.gl.createTexture();
      if (!texture) {
        throw new Error('Failed to create texture object for image.');
      }
      this.gl.bindTexture(this.gl.TEXTURE_2D, texture);
      this.gl.texImage2D(this.gl.TEXTURE_2D, 0, this.gl.RGBA, this.gl.RGBA, this.gl.UNSIGNED_BYTE, media);
      this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_S, this.gl.CLAMP_TO_EDGE);
      this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_T, this.gl.CLAMP_TO_EDGE);
      this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MIN_FILTER, this.gl.LINEAR);
      this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MAG_FILTER, this.gl.LINEAR);
      this.gl.bindTexture(this.gl.TEXTURE_2D, null);

      this.backgroundRenderInfo = {
        type: 'image',
        texture,
        width: media.width,
        height: media.height,
        url,
      };
    }

    if (!this.backgroundRenderInfo) {
      this.logger.error('Critical: backgroundRenderInfo is null after processing new source. Setting default color.');
      const [r, g, b, a] = WebGLRenderer.DEFAULT_BG_COLOR;
      const colorTexData = this.createColorTexture(r, g, b, a);
      this.backgroundRenderInfo = {
        type: 'color',
        texture: colorTexData.texture,
        color: colorTexData.color,
      };
      this.activeBackgroundSourceIdentifier = `color(${r},${g},${b},${a})`;
    }
  }

  public render(
    videoFrame: VideoFrame,
    options: {
      smoothing: number;
      smoothstepMin: number;
      smoothstepMax: number;
      backgroundSource?: BackgroundSource | null;
      borderSmooth: number;
      bgBlur: number;
      bgBlurRadius: number;
    },
    categoryTexture?: WebGLTexture,
    confidenceTexture?: WebGLTexture,
    useSelfieModel?: boolean,
  ) {
    if (!this.running) {
      return;
    }
    const {gl, fbo, storedStateTextures, stateUpdateProgram, stateUpdateLocations, blendProgram, blendLocations} = this;

    const width = this.canvas.width;
    const height = this.canvas.height;

    if (!categoryTexture || !confidenceTexture) {
      gl.viewport(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight);
      gl.useProgram(blendProgram);

      const frameTexture = gl.createTexture();
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, frameTexture);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, videoFrame);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
      gl.uniform1i(blendLocations.frameTexture, 0);
      gl.uniform1i(blendLocations.enabled, 0);

      gl.enableVertexAttribArray(blendLocations.position);
      gl.bindBuffer(gl.ARRAY_BUFFER, this.positionBuffer);
      gl.vertexAttribPointer(blendLocations.position, 2, gl.FLOAT, false, 0, 0);
      gl.enableVertexAttribArray(blendLocations.texCoord);
      gl.bindBuffer(gl.ARRAY_BUFFER, this.texCoordBuffer);
      gl.vertexAttribPointer(blendLocations.texCoord, 2, gl.FLOAT, false, 0, 0);

      gl.drawArrays(gl.TRIANGLES, 0, 6);

      gl.deleteTexture(frameTexture);
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, null);

      return;
    }

    // Determine read/write indices for state ping-pong
    const readStateIndex = this.currentStateIndex;
    const writeStateIndex = (this.currentStateIndex + 1) % 2;
    const prevStateTexture = storedStateTextures[readStateIndex];
    const newStateTexture = storedStateTextures[writeStateIndex];

    this.updateBackgroundIfNeeded(options.backgroundSource);

    // --- 1. State Update Pass (Calculates Moving Average) ---
    gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, newStateTexture, 0);

    // Ensure state texture is correctly sized
    gl.bindTexture(gl.TEXTURE_2D, newStateTexture);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, width, height, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);

    gl.viewport(0, 0, width, height);
    gl.useProgram(stateUpdateProgram);

    // Bind inputs: Current Cat (0), Current Conf (1), Prev State (2)
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, categoryTexture);
    gl.uniform1i(stateUpdateLocations.categoryTexture, 0);
    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D, confidenceTexture);
    gl.uniform1i(stateUpdateLocations.confidenceTexture, 1);
    gl.activeTexture(gl.TEXTURE2);
    gl.bindTexture(gl.TEXTURE_2D, prevStateTexture); // Read previous state
    gl.uniform1i(stateUpdateLocations.prevStateTexture, 2);

    // Set smoothing factors from sliders
    gl.uniform1f(stateUpdateLocations.smoothingFactor, options.smoothing);
    gl.uniform1f(stateUpdateLocations.smoothstepMin, options.smoothstepMin);
    gl.uniform1f(stateUpdateLocations.smoothstepMax, options.smoothstepMax);

    // Set selfie model flag
    gl.uniform1i(stateUpdateLocations.selfieModel, useSelfieModel ? 1 : 0);

    // Set vertex attributes
    gl.enableVertexAttribArray(stateUpdateLocations.position);
    gl.bindBuffer(gl.ARRAY_BUFFER, this.positionBuffer);
    gl.vertexAttribPointer(stateUpdateLocations.position, 2, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(stateUpdateLocations.texCoord);
    gl.bindBuffer(gl.ARRAY_BUFFER, this.texCoordBuffer);
    gl.vertexAttribPointer(stateUpdateLocations.texCoord, 2, gl.FLOAT, false, 0, 0);

    // Draw quad to calculate and write the new state
    gl.drawArrays(gl.TRIANGLES, 0, 6);

    // --- 2. Blending Pass (Uses the NEW state) ---
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.viewport(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight);
    gl.useProgram(blendProgram);

    // Bind Frame Texture (Unit 0)
    const frameTexture = gl.createTexture();
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, frameTexture);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, videoFrame);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    gl.uniform1i(blendLocations.frameTexture, 0);
    gl.uniform1f(blendLocations.borderSmooth, options.borderSmooth);
    gl.uniform1f(blendLocations.bgBlur, options.bgBlur);
    gl.uniform1f(blendLocations.bgBlurRadius, options.bgBlurRadius);
    gl.uniform1i(blendLocations.enabled, 1);

    // Bind Current State Texture (Unit 1)
    const currentStateTexture = storedStateTextures[writeStateIndex]; // Use the *newly written* state
    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D, currentStateTexture);
    gl.uniform1i(blendLocations.currentStateTexture, 1);

    // Bind Background Texture (Unit 2)
    if (this.backgroundRenderInfo) {
      gl.activeTexture(gl.TEXTURE2);
      gl.bindTexture(gl.TEXTURE_2D, this.backgroundRenderInfo.texture);

      let bgHeight = 1;
      let bgWidth = 1; // Default for color type

      if (this.backgroundRenderInfo.type === 'image') {
        bgWidth = this.backgroundRenderInfo.width;
        bgHeight = this.backgroundRenderInfo.height;
      }
      gl.uniform1i(blendLocations.backgroundTexture, 2);
      gl.uniform2f(blendLocations.bgImageDimensions, bgWidth > 0 ? bgWidth : 1, bgHeight > 0 ? bgHeight : 1);
      gl.uniform2f(blendLocations.canvasDimensions, width, height);
    } else {
      this.logger.warn('backgroundRenderInfo is null in render loop. Background may not render correctly.');
    }

    // Set vertex attributes
    gl.enableVertexAttribArray(blendLocations.position);
    gl.bindBuffer(gl.ARRAY_BUFFER, this.positionBuffer);
    gl.vertexAttribPointer(blendLocations.position, 2, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(blendLocations.texCoord);
    gl.bindBuffer(gl.ARRAY_BUFFER, this.texCoordBuffer);
    gl.vertexAttribPointer(blendLocations.texCoord, 2, gl.FLOAT, false, 0, 0);

    // Draw quad to blend onto canvas
    gl.drawArrays(gl.TRIANGLES, 0, 6);

    // --- 3. Cleanup ---
    gl.deleteTexture(frameTexture);
    // Unbind textures (Units 0, 1, 2 used)
    for (let i = 0; i < 3; ++i) {
      gl.activeTexture(gl.TEXTURE0 + i);
      gl.bindTexture(gl.TEXTURE_2D, null);
    }

    // Swap state index for next frame
    this.currentStateIndex = writeStateIndex;
  }

  public close() {
    if (!this.running) {
      return;
    }
    this.running = false;
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
    this.storedStateTextures = this.storedStateTextures.toSpliced(0, this.storedStateTextures.length);
    if (this.backgroundRenderInfo?.texture) {
      gl.deleteTexture(this.backgroundRenderInfo.texture);
      this.backgroundRenderInfo = null;
    }
    this.activeBackgroundSourceIdentifier = null;
  }
}
