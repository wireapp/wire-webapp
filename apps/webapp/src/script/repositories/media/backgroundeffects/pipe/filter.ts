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

type QuadBuffers = {
  positionBuffer: WebGLBuffer;
  texCoordBuffer: WebGLBuffer;
};

function createShader(gl: WebGL2RenderingContext, type: number, source: string): WebGLShader {
  const shader = gl.createShader(type);
  if (!shader) {
    throw new Error(`Failed to create shader type: ${type}`);
  }
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    const info = gl.getShaderInfoLog(shader);
    gl.deleteShader(shader);
    throw new Error(`Failed to compile shader: ${info}`);
  }
  return shader;
}

function createAndLinkProgram(
  gl: WebGL2RenderingContext,
  vsSource: string,
  fsSource: string,
  customVertexShader?: WebGLShader,
): WebGLProgram {
  const vs = customVertexShader ?? createShader(gl, gl.VERTEX_SHADER, vsSource);
  const fs = createShader(gl, gl.FRAGMENT_SHADER, fsSource);

  const program = gl.createProgram();
  if (!program) {
    throw new Error('Failed to create program');
  }
  gl.attachShader(program, vs);
  gl.attachShader(program, fs);
  gl.linkProgram(program);

  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    const info = gl.getProgramInfoLog(program);
    gl.deleteProgram(program);
    if (!customVertexShader) {
      gl.deleteShader(vs);
    }
    gl.deleteShader(fs);
    throw new Error(`Failed to link program: ${info}`);
  }
  gl.detachShader(program, vs);
  gl.detachShader(program, fs);
  if (!customVertexShader) {
    gl.deleteShader(vs);
  }
  gl.deleteShader(fs);

  return program;
}

export class VideoFilter {
  readonly logger = getSafeLogger('VideoFilter');
  readonly canvas: OffscreenCanvas | HTMLCanvasElement;
  readonly gl: WebGL2RenderingContext;
  private readonly blurProgram: WebGLProgram;
  private blurLocations: {
    position: number;
    texCoord: number;
    image: WebGLUniformLocation | null;
    resolution: WebGLUniformLocation | null;
    direction: WebGLUniformLocation | null;
    blur: WebGLUniformLocation | null;
  };

  private fbo1: WebGLFramebuffer | null = null;
  private texture1: WebGLTexture | null = null;
  private fbo2: WebGLFramebuffer | null = null;
  private texture2: WebGLTexture | null = null;
  private currentWidth: number = 0;
  private currentHeight: number = 0;
  private readonly quadBuffers: QuadBuffers;

  private readonly vertexShaderSource = `#version 300 es
        // Use 'in' for attributes, 'out' for varying to fragment shader
        in vec2 a_position;
        in vec2 a_texCoord;
        out vec2 v_texCoord;
        void main() {
            gl_Position = vec4(a_position, 0.0, 1.0);
            v_texCoord = a_texCoord;
        }
    `;

  // Single-pass 1D Gaussian blur fragment shader
  private readonly fragmentShaderSource = `#version 300 es
        precision mediump float;
        // Use 'in' for varying from vertex shader, 'out' for output to framebuffer
        in vec2 v_texCoord;
        out vec4 FragColor; // Standard output for GLSL 300 es

        uniform sampler2D u_image;
        uniform vec2 u_resolution;
        uniform vec2 u_direction;
        uniform float u_blur;

        const float PI = 3.141592653589793;

        float gaussianWeight(float offset, float sigma) {
            return exp(-(offset * offset) / (2.0 * sigma * sigma));
        }

        void main() {
            if (u_blur <= 0.0) {
                FragColor = texture(u_image, v_texCoord); // Use texture() in GLSL 300 es
                return;
            }

            vec2 texelSize = 1.0 / u_resolution;
            vec4 blurredColor = vec4(0.0);
            float totalWeight = 0.0;

            int radius = int(min(10.0, ceil(2.5 * u_blur)));

            for (int i = -radius; i <= radius; ++i) {
                float offset = float(i);
                float weight = gaussianWeight(offset, u_blur);
                blurredColor += texture(u_image, v_texCoord + u_direction * texelSize * offset) * weight; // Use texture()
                totalWeight += weight;
            }

            if (totalWeight > 0.0) {
                FragColor = blurredColor / totalWeight;
            } else {
                FragColor = texture(u_image, v_texCoord); // Use texture()
            }
        }
    `;

  // Fragment shader for color adjustments
  private readonly colorAdjustFragmentShaderSource = `#version 300 es
        precision mediump float;
        in vec2 v_texCoord;
        out vec4 FragColor;
        uniform sampler2D u_inputTexture;
        uniform float u_brightness; // e.g., -1.0 to 1.0 (0 is no change)
        uniform float u_contrast;   // e.g., 0.0 to 2.0 (1 is no change)
        uniform float u_gamma;      // e.g., 0.1 to 5.0 (1 is no change)

        void main() {
            vec4 color = texture(u_inputTexture, v_texCoord);

            // Apply brightness
            color.rgb += u_brightness;

            // Apply contrast
            color.rgb = (color.rgb - 0.5) * u_contrast + 0.5;

            // Apply gamma correction
            // Ensure gamma is not zero to avoid division by zero
            if (u_gamma > 0.0) {
                color.rgb = pow(color.rgb, vec3(1.0 / u_gamma));
            }

            FragColor = clamp(color, 0.0, 1.0);
        }
    `;

  private readonly colorAdjustProgram: WebGLProgram;
  private readonly colorAdjustLocations: {
    position: number;
    texCoord: number;
    inputTexture: WebGLUniformLocation | null;
    brightness: WebGLUniformLocation | null;
    contrast: WebGLUniformLocation | null;
    gamma: WebGLUniformLocation | null;
  };

  constructor(canvas: OffscreenCanvas | HTMLCanvasElement) {
    this.canvas = canvas;
    const gl = this.canvas.getContext('webgl2') as WebGL2RenderingContext;
    if (!gl) {
      throw new Error('WebGL2 not supported or canvas context failed.');
    }
    this.gl = gl;

    this.blurProgram = createAndLinkProgram(gl, this.vertexShaderSource, this.fragmentShaderSource);
    this.blurLocations = {
      position: gl.getAttribLocation(this.blurProgram, 'a_position'),
      texCoord: gl.getAttribLocation(this.blurProgram, 'a_texCoord'),
      image: gl.getUniformLocation(this.blurProgram, 'u_image'),
      resolution: gl.getUniformLocation(this.blurProgram, 'u_resolution'),
      direction: gl.getUniformLocation(this.blurProgram, 'u_direction'),
      blur: gl.getUniformLocation(this.blurProgram, 'u_blur'),
    };

    this.colorAdjustProgram = createAndLinkProgram(gl, this.vertexShaderSource, this.colorAdjustFragmentShaderSource);
    this.colorAdjustLocations = {
      position: gl.getAttribLocation(this.colorAdjustProgram, 'a_position'),
      texCoord: gl.getAttribLocation(this.colorAdjustProgram, 'a_texCoord'),
      inputTexture: gl.getUniformLocation(this.colorAdjustProgram, 'u_inputTexture'),
      brightness: gl.getUniformLocation(this.colorAdjustProgram, 'u_brightness'),
      contrast: gl.getUniformLocation(this.colorAdjustProgram, 'u_contrast'),
      gamma: gl.getUniformLocation(this.colorAdjustProgram, 'u_gamma'),
    };

    const positionBuffer = gl.createBuffer();
    if (!positionBuffer) {
      throw new Error('Failed to create position buffer for BlurFilter');
    }
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
    gl.bufferData(
      gl.ARRAY_BUFFER,
      new Float32Array([
        -1,
        1, // Top-left
        -1,
        -1, // Bottom-left
        1,
        1, // Top-right
        1,
        -1, // Bottom-right
        1,
        1, // Top-right (again for 2nd triangle)
        -1,
        -1, // Bottom-left (again for 2nd triangle)
      ]),
      gl.STATIC_DRAW,
    );

    const texCoordBuffer = gl.createBuffer();
    if (!texCoordBuffer) {
      throw new Error('Failed to create texCoord buffer for BlurFilter');
    }
    gl.bindBuffer(gl.ARRAY_BUFFER, texCoordBuffer);
    gl.bufferData(
      gl.ARRAY_BUFFER,
      new Float32Array([
        0,
        1, // Top-left
        0,
        0, // Bottom-left
        1,
        1, // Top-right
        1,
        0, // Bottom-right
        1,
        1, // Top-right (again for 2nd triangle)
        0,
        0, // Bottom-left (again for 2nd triangle)
      ]),
      gl.STATIC_DRAW,
    );
    this.quadBuffers = {positionBuffer, texCoordBuffer};
  }

  private ensureTextures(width: number, height: number) {
    if (this.currentWidth === width && this.currentHeight === height) {
      return;
    }
    this.currentWidth = width;
    this.currentHeight = height;

    if (this.texture1) {
      this.gl.deleteTexture(this.texture1);
    }
    if (this.fbo1) {
      this.gl.deleteFramebuffer(this.fbo1);
    }
    if (this.texture2) {
      this.gl.deleteTexture(this.texture2);
    }
    if (this.fbo2) {
      this.gl.deleteFramebuffer(this.fbo2);
    }

    this.texture1 = this.createTexture(width, height);
    this.fbo1 = this.createFramebuffer(this.texture1);

    this.texture2 = this.createTexture(width, height);
    this.fbo2 = this.createFramebuffer(this.texture2);
  }

  private createTexture(width: number, height: number): WebGLTexture {
    const gl = this.gl;
    const texture = gl.createTexture();
    if (!texture) {
      throw new Error('Failed to create texture for blur filter');
    }
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, width, height, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.bindTexture(gl.TEXTURE_2D, null);
    return texture;
  }

  private createFramebuffer(texture: WebGLTexture | null): WebGLFramebuffer {
    const gl = this.gl;
    const fbo = gl.createFramebuffer();
    if (!fbo) {
      throw new Error('Failed to create FBO for blur filter');
    }
    gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, texture, 0);
    if (gl.checkFramebufferStatus(gl.FRAMEBUFFER) !== gl.FRAMEBUFFER_COMPLETE) {
      this.logger.error('Framebuffer incomplete for blur filter');
    }
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    return fbo;
  }

  private apply(
    sourceTexture: WebGLTexture,
    outputWidth: number,
    outputHeight: number,
    blur: number,
    brightness: number = 0,
    contrast: number = 1,
    gamma: number = 1,
  ): WebGLTexture | null {
    const gl = this.gl;
    let currentTexture = sourceTexture;
    let finalPassOutputToTexture1 = false; // Tracks where the last output was written

    // --- Blur Passes (if blur > 0) ---
    if (blur > 0) {
      this.ensureTextures(outputWidth, outputHeight);
      if (!this.fbo1 || !this.texture1 || !this.fbo2 || !this.texture2) {
        this.logger.error('Blur filter FBOs not initialized');
        return sourceTexture; // Or null if strict error handling
      }

      gl.useProgram(this.blurProgram);
      gl.enableVertexAttribArray(this.blurLocations.position);
      gl.bindBuffer(gl.ARRAY_BUFFER, this.quadBuffers.positionBuffer);
      gl.vertexAttribPointer(this.blurLocations.position, 2, gl.FLOAT, false, 0, 0);
      gl.enableVertexAttribArray(this.blurLocations.texCoord);
      gl.bindBuffer(gl.ARRAY_BUFFER, this.quadBuffers.texCoordBuffer);
      gl.vertexAttribPointer(this.blurLocations.texCoord, 2, gl.FLOAT, false, 0, 0);
      gl.uniform1i(this.blurLocations.image, 0);
      gl.uniform1f(this.blurLocations.blur, blur);
      gl.viewport(0, 0, outputWidth, outputHeight);
      gl.uniform2f(this.blurLocations.resolution, outputWidth, outputHeight);

      // Horizontal Pass (sourceTexture -> FBO1/Texture1)
      gl.bindFramebuffer(gl.FRAMEBUFFER, this.fbo1);
      gl.uniform2f(this.blurLocations.direction, 1, 0);
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, sourceTexture); // Initial source
      gl.drawArrays(gl.TRIANGLES, 0, 6);

      // Vertical Pass (FBO1/Texture1 -> FBO2/Texture2)
      gl.bindFramebuffer(gl.FRAMEBUFFER, this.fbo2);
      gl.uniform2f(this.blurLocations.direction, 0, 1);
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, this.texture1);
      gl.drawArrays(gl.TRIANGLES, 0, 6);

      currentTexture = this.texture2; // Blurred result is in texture2
    }

    // --- Color Adjustment Pass (if needed) ---
    const needsColorAdjust = brightness !== 0 || contrast !== 1 || gamma !== 1;
    if (needsColorAdjust) {
      this.ensureTextures(outputWidth, outputHeight); // Ensure FBOs are ready if not already from blur
      if (!this.fbo1 || !this.texture1 || !this.fbo2 || !this.texture2) {
        this.logger.error('Color adjust FBOs not initialized');
        return currentTexture; // Return whatever we have so far
      }

      // Determine input and output FBO/texture for this pass
      let inputForColorAdjust: WebGLTexture;
      let outputFbo: WebGLFramebuffer;

      if (blur > 0) {
        // If blur was applied, currentTexture is this.texture2
        inputForColorAdjust = this.texture2!;
        outputFbo = this.fbo1!; // Write to texture1
        finalPassOutputToTexture1 = true;
      } else {
        // No blur, currentTexture is the original sourceTexture
        inputForColorAdjust = sourceTexture;
        // We need to draw to an FBO. If FBOs are available, use fbo1.
        // If sourceTexture is the only input and no blur, and we need color adjust,
        // this implies we are drawing from sourceTexture to fbo1/texture1.
        outputFbo = this.fbo1!;
        finalPassOutputToTexture1 = true;
      }

      gl.bindFramebuffer(gl.FRAMEBUFFER, outputFbo);
      gl.viewport(0, 0, outputWidth, outputHeight);
      gl.useProgram(this.colorAdjustProgram);

      gl.uniform1f(this.colorAdjustLocations.brightness, brightness);
      gl.uniform1f(this.colorAdjustLocations.contrast, contrast);
      gl.uniform1f(this.colorAdjustLocations.gamma, gamma);

      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, inputForColorAdjust);
      gl.uniform1i(this.colorAdjustLocations.inputTexture, 0);

      gl.enableVertexAttribArray(this.colorAdjustLocations.position);
      gl.bindBuffer(gl.ARRAY_BUFFER, this.quadBuffers.positionBuffer);
      gl.vertexAttribPointer(this.colorAdjustLocations.position, 2, gl.FLOAT, false, 0, 0);
      gl.enableVertexAttribArray(this.colorAdjustLocations.texCoord);
      gl.bindBuffer(gl.ARRAY_BUFFER, this.quadBuffers.texCoordBuffer);
      gl.vertexAttribPointer(this.colorAdjustLocations.texCoord, 2, gl.FLOAT, false, 0, 0);

      gl.drawArrays(gl.TRIANGLES, 0, 6);

      currentTexture = finalPassOutputToTexture1 ? this.texture1 : this.texture2;
    }

    // Cleanup: Unbind FBO, disable attributes (optional here if subsequent operations handle it)
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.disableVertexAttribArray(this.blurLocations.position); // From blur pass if active
    gl.disableVertexAttribArray(this.blurLocations.texCoord); // From blur pass if active
    if (needsColorAdjust) {
      gl.disableVertexAttribArray(this.colorAdjustLocations.position);
      gl.disableVertexAttribArray(this.colorAdjustLocations.texCoord);
    }

    return currentTexture;
  }

  public destroy() {
    const gl = this.gl;
    if (this.blurProgram) {
      gl.deleteProgram(this.blurProgram);
    }
    if (this.colorAdjustProgram) {
      gl.deleteProgram(this.colorAdjustProgram);
    } // New program
    if (this.texture1) {
      gl.deleteTexture(this.texture1);
    }
    if (this.fbo1) {
      gl.deleteFramebuffer(this.fbo1);
    }
    if (this.texture2) {
      gl.deleteTexture(this.texture2);
    }
    if (this.fbo2) {
      gl.deleteFramebuffer(this.fbo2);
    }
    if (this.quadBuffers.positionBuffer) {
      gl.deleteBuffer(this.quadBuffers.positionBuffer);
    }
    if (this.quadBuffers.texCoordBuffer) {
      gl.deleteBuffer(this.quadBuffers.texCoordBuffer);
    }
  }

  public render(videoFrame: VideoFrame, blur: number, brightness: number = 0, contrast: number = 1, gamma: number = 1) {
    const {canvas, gl} = this;
    const frameWidth = videoFrame.codedWidth;
    const frameHeight = videoFrame.codedHeight;

    if (canvas.width !== frameWidth || canvas.height !== frameHeight) {
      canvas.width = frameWidth;
      canvas.height = frameHeight;
    }

    if (!frameWidth || !frameHeight) {
      throw new Error('VideoFrame has invalid dimensions for videoFrame.');
    }

    const sourceTexture = gl.createTexture();
    if (!sourceTexture) {
      throw new Error('Failed to create source texture for videoFrame');
    }
    gl.bindTexture(gl.TEXTURE_2D, sourceTexture);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, videoFrame);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.bindTexture(gl.TEXTURE_2D, null);

    const finalTexture = this.apply(sourceTexture, frameWidth, frameHeight, blur, brightness, contrast, gamma);

    if (!finalTexture) {
      gl.deleteTexture(sourceTexture);
      throw new Error('BlurFilter.apply failed to return a texture.');
    }

    const drawVS = `#version 300 es
            in vec2 p;
            in vec2 t;
            out vec2 v;
            void main(){
                gl_Position=vec4(p,0,1);
                v=t;
            }`;
    const drawFS = `#version 300 es
            precision mediump float;
            in vec2 v;
            out vec4 o;
            uniform sampler2D tex;
            void main(){
                o=texture(tex,v);
            }`;
    const finalDrawProgram = createAndLinkProgram(gl, drawVS, drawFS);
    const posLoc = gl.getAttribLocation(finalDrawProgram, 'p');
    const tcLoc = gl.getAttribLocation(finalDrawProgram, 't');
    const texLoc = gl.getUniformLocation(finalDrawProgram, 'tex');

    const pBuf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, pBuf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, 1, -1, -1, 1, 1, 1, -1, 1, 1, -1, -1]), gl.STATIC_DRAW);

    const tcBuf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, tcBuf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([0, 1, 0, 0, 1, 1, 1, 0, 1, 1, 0, 0]), gl.STATIC_DRAW);

    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.viewport(0, 0, frameWidth, frameHeight);
    gl.useProgram(finalDrawProgram);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, finalTexture);
    gl.uniform1i(texLoc, 0);

    gl.enableVertexAttribArray(posLoc);
    gl.bindBuffer(gl.ARRAY_BUFFER, pBuf);
    gl.vertexAttribPointer(posLoc, 2, gl.FLOAT, false, 0, 0);

    gl.enableVertexAttribArray(tcLoc);
    gl.bindBuffer(gl.ARRAY_BUFFER, tcBuf);
    gl.vertexAttribPointer(tcLoc, 2, gl.FLOAT, false, 0, 0);

    gl.drawArrays(gl.TRIANGLES, 0, 6);

    gl.deleteTexture(sourceTexture);
    gl.deleteProgram(finalDrawProgram);
    gl.deleteBuffer(pBuf);
    gl.deleteBuffer(tcBuf);
  }
}
