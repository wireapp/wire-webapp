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

import {noop} from 'noop-esm';

import {WebGLRenderer} from './renderer';

describe('WebGL failure diagnostics', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it.each([
    {
      shaderCompiled: false,
      message: 'Shader compile error:',
      attribute: 'shaderLog',
      failure: 'Failed to compile shader',
    },
    {shaderCompiled: true, message: 'Program link error:', attribute: 'programLog', failure: 'Link fail'},
  ])('keeps $message details in console text and attributes', options => {
    const {shaderCompiled, message, attribute, failure} = options;
    const diagnosticMessage = 'Graphics driver diagnostic';
    const consoleError = jest.spyOn(console, 'error').mockImplementation(noop);
    const graphicsContext = {
      createShader: jest.fn().mockReturnValue({}),
      shaderSource: noop,
      compileShader: noop,
      getShaderParameter: jest.fn().mockReturnValue(shaderCompiled),
      getShaderInfoLog: jest.fn().mockReturnValue(diagnosticMessage),
      deleteShader: noop,
      createProgram: jest.fn().mockReturnValue({}),
      attachShader: noop,
      linkProgram: noop,
      getProgramParameter: jest.fn().mockReturnValue(false),
      getProgramInfoLog: jest.fn().mockReturnValue(diagnosticMessage),
      deleteProgram: noop,
    };
    const canvas = {
      getContext: jest.fn().mockReturnValue(graphicsContext),
    } as unknown as OffscreenCanvas;

    expect(() => {
      return new WebGLRenderer(canvas);
    }).toThrow(failure);
    expect(consoleError).toHaveBeenCalledWith('[WebGLRenderer]', `${message} ${diagnosticMessage}`, {
      [attribute]: diagnosticMessage,
    });
  });
});
