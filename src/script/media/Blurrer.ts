/*
 * Wire
 * Copyright (C) 2020 Wire Swiss GmbH
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

import {ImageClassifier} from '@mediapipe/tasks-vision';
import {createProgramFromSources} from 'webgl-utils.js';

// Define several convolution kernels
const kernels = {
  normal: [0, 0, 0, 0, 1, 0, 0, 0, 0],
  gaussianBlur: [0.045, 0.122, 0.045, 0.122, 0.332, 0.122, 0.045, 0.122, 0.045],
  gaussianBlur2: [1, 2, 1, 2, 4, 2, 1, 2, 1],
  gaussianBlur3: [0, 1, 0, 1, 1, 1, 0, 1, 0],
};

let program: any;

export function prepareWebglContext(canvas: HTMLCanvasElement, imageSize: number) {
  const gl = canvas.getContext('webgl');
  if (!gl) {
    throw new Error('WebGL not supported');
  }

  program = createProgramFromSources(gl, [
    `
      attribute vec2 a_position;
      attribute vec2 a_texCoord;

      uniform vec2 u_resolution;
      uniform float u_flipY;

      varying vec2 v_texCoord;

      void main() {
      	 // convert the rectangle from pixels to 0.0 to 1.0
      	 vec2 zeroToOne = a_position / u_resolution;

      	 // convert from 0->1 to 0->2
      	 vec2 zeroToTwo = zeroToOne * 2.0;

      	 // convert from 0->2 to -1->+1 (clipspace)
      	 vec2 clipSpace = zeroToTwo - 1.0;

      	 gl_Position = vec4(clipSpace * vec2(1, u_flipY), 0, 1);

      	 // pass the texCoord to the fragment shader
      	 // The GPU will interpolate this value between points.
      	 v_texCoord = a_texCoord;
      }
    `,
    `
    precision mediump float;

    // our texture
    uniform sampler2D u_image;
    uniform vec2 u_textureSize;
    uniform float u_kernel[9];
    uniform float u_kernelWeight;

    // the texCoords passed in from the vertex shader.
    varying vec2 v_texCoord;

    void main() {
        vec2 onePixel = vec2(1.0, 1.0) / u_textureSize;
        if (false) {
          gl_FragColor = texture2D(u_image, v_texCoord);
        } else {
          vec4 colorSum =
                  texture2D(u_image, v_texCoord + onePixel * vec2(-1, -1)) * u_kernel[0] +
                  texture2D(u_image, v_texCoord + onePixel * vec2( 0, -1)) * u_kernel[1] +
                  texture2D(u_image, v_texCoord + onePixel * vec2( 1, -1)) * u_kernel[2] +
                  texture2D(u_image, v_texCoord + onePixel * vec2(-1,  0)) * u_kernel[3] +
                  texture2D(u_image, v_texCoord + onePixel * vec2( 0,  0)) * u_kernel[4] +
                  texture2D(u_image, v_texCoord + onePixel * vec2( 1,  0)) * u_kernel[5] +
                  texture2D(u_image, v_texCoord + onePixel * vec2(-1,  1)) * u_kernel[6] +
                  texture2D(u_image, v_texCoord + onePixel * vec2( 0,  1)) * u_kernel[7] +
                  texture2D(u_image, v_texCoord + onePixel * vec2( 1,  1)) * u_kernel[8] ;
          gl_FragColor = vec4((colorSum / u_kernelWeight).rgb, 1);
        }
    }
  `,
  ]);

  return gl;
}

export function blur(
  videoElement: HTMLVideoElement,
  gl: WebGLRenderingContext,
  segmentationMask: Float32Array,
  {width, height}: {width: number; height: number},
) {
  const computeKernelWeight = (kernel: number[]) => {
    const weight = kernel.reduce((prev, curr) => {
      return prev + curr;
    });
    return weight <= 0 ? 1 : weight;
  };

  // look up where the vertex data needs to go.
  const positionLocation = gl.getAttribLocation(program, 'a_position');
  const texcoordLocation = gl.getAttribLocation(program, 'a_texCoord');

  // Create a buffer to put three 2d clip space points in
  const positionBuffer = gl.createBuffer();
  // Bind it to ARRAY_BUFFER (think of it as ARRAY_BUFFER = positionBuffer)
  gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
  // Set a rectangle the same size as the image.
  setRectangle(gl, 0, 0, width, height);

  // provide texture coordinates for the rectangle.
  const texcoordBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, texcoordBuffer);
  gl.bufferData(
    gl.ARRAY_BUFFER,
    new Float32Array([0.0, 0.0, 1.0, 0.0, 0.0, 1.0, 0.0, 1.0, 1.0, 0.0, 1.0, 1.0]),
    gl.STATIC_DRAW,
  );

  // Create a texture and put the image in it.
  const originalImageTexture = createAndSetupTexture(gl);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, videoElement);

  // create 2 textures and attach them to framebuffers.
  const textures = [];
  const framebuffers = [];
  for (let ii = 0; ii < 2; ++ii) {
    const texture = createAndSetupTexture(gl);
    textures.push(texture);

    // make the texture the same size as the image
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, width, height, 0, gl.RGB, gl.UNSIGNED_BYTE, null);

    // Create a framebuffer
    const fbo = gl.createFramebuffer();
    framebuffers.push(fbo);
    gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);

    // Attach a texture to it.
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, texture, 0);
  }

  // lookup uniforms
  const resolutionLocation = gl.getUniformLocation(program, 'u_resolution');
  const textureSizeLocation = gl.getUniformLocation(program, 'u_textureSize');
  const kernelLocation = gl.getUniformLocation(program, 'u_kernel[0]');
  const kernelWeightLocation = gl.getUniformLocation(program, 'u_kernelWeight');
  const segmentationMaskLocation = gl.getUniformLocation(program, 'u_segmentationMask[0]');
  const flipYLocation = gl.getUniformLocation(program, 'u_flipY');

  /*
  const maskTexture = createAndSetupTexture(gl);
  const maskLocation = gl.getUniformLocation(program, 'u_mask');
  gl.bindTexture(gl.TEXTURE_2D, maskTexture);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, width, height, 0, gl.RGB, gl.FLOAT, new Uint8Array([1, 1, 1, 1, 1, 1, 1, 1]));
  gl.uniform1i(maskLocation, 0);
  */

  drawEffects();
  return;

  const pixels = new Uint8Array(videoElement.width * videoElement.height * 4);
  gl.readPixels(0, 0, videoElement.width, videoElement.height, gl.RGBA, gl.UNSIGNED_BYTE, pixels);

  // WebGL pixels are inverted compared to 2D pixels, so we have to flip
  // the resulting rows. Adapted from https://stackoverflow.com/a/41973289

  //const width = gl.drawingBufferWidth;
  //const height = gl.drawingBufferHeight;
  const halfHeight = Math.floor(height / 2);
  const tmpRow = new Uint8Array(width * 4);
  for (let y = 0; y < halfHeight; y++) {
    const topOffset = y * width * 4;
    const bottomOffset = (height - y - 1) * width * 4;
    tmpRow.set(pixels.subarray(topOffset, topOffset + width * 4));
    pixels.copyWithin(topOffset, bottomOffset, bottomOffset + width * 4);
    pixels.set(tmpRow, bottomOffset);
  }

  return pixels;

  function drawEffects() {
    // Clear the canvas
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);

    // Tell it to use our program (pair of shaders)
    gl.useProgram(program);

    // Turn on the position attribute
    gl.enableVertexAttribArray(positionLocation);

    // Bind the position buffer.
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);

    // Tell the position attribute how to get data out of positionBuffer (ARRAY_BUFFER)
    const size = 2; // 2 components per iteration
    const type = gl.FLOAT; // the data is 32bit floats
    const normalize = false; // don't normalize the data
    const stride = 0; // 0 = move forward size * sizeof(type) each iteration to get the next position
    const offset = 0; // start at the beginning of the buffer
    gl.vertexAttribPointer(positionLocation, size, type, normalize, stride, offset);

    // Turn on the texcoord attribute
    gl.enableVertexAttribArray(texcoordLocation);

    // bind the texcoord buffer.
    gl.bindBuffer(gl.ARRAY_BUFFER, texcoordBuffer);

    gl.vertexAttribPointer(texcoordLocation, size, type, normalize, stride, offset);

    // set the size of the image
    gl.uniform2f(textureSizeLocation, width, height);

    // start with the original image
    gl.bindTexture(gl.TEXTURE_2D, originalImageTexture);

    // don't y flip images while drawing to the textures
    gl.uniform1f(flipYLocation, 1);

    // loop through each effect we want to apply.
    let count = 0;
    for (let ii = 0; ii < 100; ++ii) {
      // Setup to draw into one of the framebuffers.
      setFramebuffer(framebuffers[count % 2], width, height);

      drawWithKernel('gaussianBlur');

      // for the next draw, use the texture we just rendered to.
      gl.bindTexture(gl.TEXTURE_2D, textures[count % 2]);

      // increment count so we use the other texture next time.
      ++count;
    }

    // finally draw the result to the canvas.
    gl.uniform1f(flipYLocation, -1); // need to y flip for canvas
    setFramebuffer(null, width, height);
    drawWithKernel('normal');
  }

  function setFramebuffer(fbo, width, height) {
    // make this the framebuffer we are rendering to.
    gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);

    // Tell the shader the resolution of the framebuffer.
    gl.uniform2f(resolutionLocation, width, height);

    // Tell webgl the viewport setting needed for framebuffer.
    gl.viewport(0, 0, width, height);
  }

  function drawWithKernel(name: keyof typeof kernels) {
    // set the kernel and it's weight
    gl.uniform1fv(kernelLocation, kernels[name]);
    gl.uniform1f(kernelWeightLocation, computeKernelWeight(kernels[name]));
    gl.uniform1fv(segmentationMaskLocation, segmentationMask);

    // Draw the rectangle.
    const primitiveType = gl.TRIANGLES;
    const offset = 0;
    const count = 6;
    gl.drawArrays(primitiveType, offset, count);
  }
}

function createAndSetupTexture(gl: WebGLRenderingContext) {
  const texture = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, texture);

  // Set up texture so we can render any size image and so we are
  // working with pixels.
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
  return texture;
}

function setRectangle(gl, x, y, width, height) {
  const x1 = x;
  const x2 = x + width;
  const y1 = y;
  const y2 = y + height;
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([x1, y1, x2, y1, x1, y2, x1, y2, x2, y1, x2, y2]), gl.STATIC_DRAW);
}
