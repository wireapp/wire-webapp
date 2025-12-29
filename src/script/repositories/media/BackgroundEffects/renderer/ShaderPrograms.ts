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
import compositeBlurFrag from '../shaders/compositeBlur.frag';
// @ts-ignore
import compositeVirtualFrag from '../shaders/compositeVirtual.frag';
// @ts-ignore
import debugOverlayFrag from '../shaders/debugOverlay.frag';
// @ts-ignore
import downsampleFrag from '../shaders/downsample.frag';
// @ts-ignore
import fullscreenVert from '../shaders/fullscreen.vert';
// @ts-ignore
import gaussianBlurHFrag from '../shaders/gaussianBlurH.frag';
// @ts-ignore
import gaussianBlurVFrag from '../shaders/gaussianBlurV.frag';
// @ts-ignore
import jointBilateralFrag from '../shaders/jointBilateralMask.frag';
// @ts-ignore
import maskUpsampleFrag from '../shaders/maskUpsample.frag';
// @ts-ignore
import temporalMaskFrag from '../shaders/temporalMask.frag';

export interface ProgramInfo {
  program: WebGLProgram;
  uniforms: Record<string, WebGLUniformLocation | null>;
}

export class ShaderPrograms {
  private readonly programs: Record<string, ProgramInfo>;

  constructor(private readonly gl: WebGL2RenderingContext) {
    this.programs = this.createPrograms();
  }

  public use(programKey: string, uniforms: Record<string, any>): void {
    const programInfo = this.programs[programKey];
    if (!programInfo) {
      return;
    }

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

  public destroy(): void {
    Object.values(this.programs).forEach(({program}) => this.gl.deleteProgram(program));
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
}
