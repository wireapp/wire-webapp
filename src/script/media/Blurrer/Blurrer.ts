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

import {ImageSegmenterResult} from '@mediapipe/tasks-vision';
// @ts-ignore
import {createProgramFromSources} from 'webgl-utils.js';

// @ts-ignore
import fragmentShader from './fragmentShader.glsl';
// @ts-ignore
import vertexShader from './vertexShader.glsl';

let program: WebGLProgram;

let locations: {
  position: number;
  texcoord: number;

  resolution: WebGLUniformLocation | null;
  textureSize: WebGLUniformLocation | null;
  flipY: WebGLUniformLocation | null;
  mask: WebGLUniformLocation | null;
};
let buffers: any;

export function prepareWebglContext(canvas: HTMLCanvasElement, {width, height}: {width: number; height: number}) {
  const gl = canvas.getContext('webgl2');
  if (!gl) {
    throw new Error('WebGL not supported');
  }

  program = createProgramFromSources(gl, [vertexShader, fragmentShader]);
  locations = {
    position: gl.getAttribLocation(program, 'a_position'),
    texcoord: gl.getAttribLocation(program, 'a_texCoord'),

    resolution: gl.getUniformLocation(program, 'u_resolution'),
    textureSize: gl.getUniformLocation(program, 'u_textureSize'),
    flipY: gl.getUniformLocation(program, 'u_flipY'),
    mask: gl.getUniformLocation(program, 'u_mask'),
  };

  // Create a buffer to put three 2d clip space points in
  buffers = {position: gl.createBuffer(), textcoord: gl.createBuffer()};
  // Bind it to ARRAY_BUFFER (think of it as ARRAY_BUFFER = positionBuffer)
  gl.bindBuffer(gl.ARRAY_BUFFER, buffers.position);
  // Set a rectangle the same size as the image.
  setRectangle(gl, 0, 0, width, height);

  // provide texture coordinates for the rectangle.
  gl.bindBuffer(gl.ARRAY_BUFFER, buffers.textcoord);
  gl.bufferData(
    gl.ARRAY_BUFFER,
    new Float32Array([0.0, 0.0, 1.0, 0.0, 0.0, 1.0, 0.0, 1.0, 1.0, 0.0, 1.0, 1.0]),
    gl.STATIC_DRAW,
  );

  return gl;
}

export function blur(
  segmentationResults: ImageSegmenterResult,
  videoElement: HTMLVideoElement,
  gl: WebGLRenderingContext,
  {width, height}: {width: number; height: number},
) {
  // Create a texture and put the image in it.
  gl.activeTexture(gl.TEXTURE0);
  const originalImageTexture = createAndSetupTexture(gl);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, videoElement);

  // Clear the canvas
  gl.viewport(0, 0, width, height);
  gl.clearColor(0, 0, 0, 0);
  gl.clear(gl.COLOR_BUFFER_BIT);

  // Tell it to use our program (pair of shaders)
  gl.useProgram(program);

  // Turn on the position attribute
  gl.enableVertexAttribArray(locations.position);

  // Bind the position buffer.
  gl.bindBuffer(gl.ARRAY_BUFFER, buffers.position);

  // Tell the position attribute how to get data out of positionBuffer (ARRAY_BUFFER)
  const size = 2; // 2 components per iteration
  const type = gl.FLOAT; // the data is 32bit floats
  const normalize = false; // don't normalize the data
  const stride = 0; // 0 = move forward size * sizeof(type) each iteration to get the next position
  const offset = 0; // start at the beginning of the buffer
  gl.vertexAttribPointer(locations.position, size, type, normalize, stride, offset);

  // Turn on the texcoord attribute
  gl.enableVertexAttribArray(locations.texcoord);

  // Assiging the segmentation mask to the mask uniform (so that it's accessible to the shader)
  const segmentationMask = segmentationResults.confidenceMasks[0].getAsWebGLTexture();
  gl.activeTexture(gl.TEXTURE1);
  gl.bindTexture(gl.TEXTURE_2D, segmentationMask);
  gl.uniform1i(locations.mask, 1);

  // bind the texcoord buffer.
  gl.bindBuffer(gl.ARRAY_BUFFER, buffers.textcoord);

  gl.vertexAttribPointer(locations.texcoord, size, type, normalize, stride, offset);

  // set the size of the image
  gl.uniform2f(locations.textureSize, width, height);

  // start with the original image
  gl.activeTexture(gl.TEXTURE0);
  gl.bindTexture(gl.TEXTURE_2D, originalImageTexture);

  // finally draw the result to the canvas.
  gl.uniform1f(locations.flipY, -1); // need to y flip for canvas
  setFramebuffer(gl, null, width, height);
  draw(gl);
}

function draw(gl: WebGLRenderingContext) {
  // Draw the rectangle.
  const primitiveType = gl.TRIANGLES;
  const offset = 0;
  const count = 6;
  gl.drawArrays(primitiveType, offset, count);
}

function setFramebuffer(gl: WebGLRenderingContext, fbo: WebGLFramebuffer | null, width: number, height: number) {
  // make this the framebuffer we are rendering to.
  gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);

  // Tell the shader the resolution of the framebuffer.
  gl.uniform2f(locations.resolution, width, height);

  // Tell webgl the viewport setting needed for framebuffer.
  gl.viewport(0, 0, width, height);
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

function setRectangle(gl: WebGL2RenderingContext, x: number, y: number, width: number, height: number) {
  const x1 = x;
  const x2 = x + width;
  const y1 = y;
  const y2 = y + height;
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([x1, y1, x2, y1, x1, y2, x1, y2, x2, y1, x2, y2]), gl.STATIC_DRAW);
}
