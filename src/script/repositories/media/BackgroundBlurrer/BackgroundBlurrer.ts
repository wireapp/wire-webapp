/*
 * Wire
 * Copyright (C) 2024 Wire Swiss GmbH
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

export type VideoDimensions = {width: number; height: number};

let program: WebGLProgram;

/** Locations of all the values we want to pass from javascript to the shaders */
let locations: {
  position: number;
  texcoord: number;

  /* the resolution of the image */
  resolution: WebGLUniformLocation | null;
  /* the size of the texture */
  textureSize: WebGLUniformLocation | null;
  /* the mask to apply computed from the segmentation */
  mask: WebGLUniformLocation | null;
};
let buffers: {
  position: WebGLBuffer | null;
  textcoord: WebGLBuffer | null;
};

/**
 * Will:
 *  - setup the shader program for the webgl context
 *  - setup all the variable locations that we want to send from javascript to the shaders
 * @param canvas the canvas in which to init the webgl context
 * @param dimension the dimensions (width, height) of the video that we want to blur
 */
export function initShaderProgram(canvas: HTMLCanvasElement, {width, height}: VideoDimensions) {
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
    // This represents the 6 points of the 2 triangles reprensenting the rectangle we want to paint
    new Float32Array([0.0, 0.0, 1.0, 0.0, 0.0, 1.0, 0.0, 1.0, 1.0, 0.0, 1.0, 1.0]),
    gl.STATIC_DRAW,
  );

  return gl;
}

/**
 * Will blur a single frame of the given video.
 * It will apply the segmentation mask on the area of the image we do not want to blur
 * @param segmentationResults results from the segmentation
 * @param videoElement the video element that plays the video we want to blur
 * @param gl the webgl context
 * @param param3 the width and height of the video
 */
export function blurBackground(
  segmentationResults: ImageSegmenterResult,
  videoElement: HTMLVideoElement,
  gl: WebGLRenderingContext,
  {width, height}: VideoDimensions,
) {
  // Clear the canvas
  gl.viewport(0, 0, width, height);
  gl.clearColor(0, 0, 0, 0);
  gl.clear(gl.COLOR_BUFFER_BIT);

  // Tell it to use our program (pair of shaders)
  gl.useProgram(program);

  // Bind the position buffer.
  gl.enableVertexAttribArray(locations.position);
  gl.bindBuffer(gl.ARRAY_BUFFER, buffers.position);
  // Tell the position attribute how to get data out of positionBuffer (ARRAY_BUFFER)
  const size = 2; // 2 components per iteration
  const type = gl.FLOAT; // the data is 32bit floats
  const normalize = false; // don't normalize the data
  const stride = 0; // 0 = move forward size * sizeof(type) each iteration to get the next position
  const offset = 0; // start at the beginning of the buffer
  gl.vertexAttribPointer(locations.position, size, type, normalize, stride, offset);

  // bind the texcoord buffer.
  gl.enableVertexAttribArray(locations.texcoord);
  gl.bindBuffer(gl.ARRAY_BUFFER, buffers.textcoord);
  gl.vertexAttribPointer(locations.texcoord, size, type, normalize, stride, offset);

  // set the size of the image
  gl.uniform2f(locations.textureSize, width, height);

  // start with the original image
  // Create a texture and put the image in it.
  const originalImageTexture = createAndSetupTexture(gl);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, videoElement);
  gl.activeTexture(gl.TEXTURE0);
  gl.bindTexture(gl.TEXTURE_2D, originalImageTexture);

  // Assiging the segmentation mask to the mask uniform (so that it's accessible to the shader)
  const segmentationMask = segmentationResults.confidenceMasks?.[0]?.getAsWebGLTexture() ?? null;
  gl.activeTexture(gl.TEXTURE1);
  gl.bindTexture(gl.TEXTURE_2D, segmentationMask);
  gl.uniform1i(locations.mask, 1);

  setFramebuffer(gl, null, width, height);

  gl.drawArrays(gl.TRIANGLES, 0, 6 /* we draw a rectangle with 2 triangles (so 6 points) */);
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
