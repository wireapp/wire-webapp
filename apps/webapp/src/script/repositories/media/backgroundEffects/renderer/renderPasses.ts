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

import type {ShaderPrograms} from './shaderPrograms';
import type {Size, WebGlResources} from './webGlResources';

/**
 * Helper class for executing WebGL render passes.
 *
 * Provides utilities for drawing to framebuffers and the default framebuffer
 * using shader programs. Handles viewport setup, program binding, and uniform
 * configuration.
 */
export class RenderPasses {
  constructor(
    private readonly gl: WebGL2RenderingContext,
    private readonly programs: ShaderPrograms,
    private readonly resources: WebGlResources,
  ) {}

  /**
   * Draws to a texture using a framebuffer.
   *
   * Binds the specified framebuffer, sets viewport, and draws a fullscreen
   * quad using the specified shader program. Sets uFlipY to 0 for texture rendering.
   *
   * @param programKey - Key identifying the shader program to use.
   * @param targetKey - Key identifying the target framebuffer/texture.
   * @param size - Viewport size (width and height).
   * @param uniforms - Uniform values to pass to the shader program.
   * @returns Nothing.
   */
  public drawToTexture(programKey: string, targetKey: string, size: Size, uniforms: Record<string, any>): void {
    const fbo = this.resources.getFramebuffer(targetKey);
    if (!fbo) {
      return;
    }
    this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, fbo);
    this.gl.viewport(0, 0, size.width, size.height);
    this.programs.use(programKey, {...uniforms, uFlipY: 0.0});
    this.gl.drawArrays(this.gl.TRIANGLE_STRIP, 0, 4);
  }

  /**
   * Draws to a framebuffer or the default framebuffer (screen).
   *
   * Binds the specified framebuffer (or null for default), sets viewport,
   * and draws a fullscreen quad. Automatically sets uFlipY based on whether
   * rendering to texture (0) or screen (1).
   *
   * @param programKey - Key identifying the shader program to use.
   * @param fbo - Framebuffer to render to, or null for default framebuffer.
   * @param width - Viewport width in pixels.
   * @param height - Viewport height in pixels.
   * @param uniforms - Uniform values to pass to the shader program.
   * @returns Nothing.
   */
  public drawSimple(
    programKey: string,
    fbo: WebGLFramebuffer | null,
    width: number,
    height: number,
    uniforms: Record<string, any>,
  ): void {
    this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, fbo);
    this.gl.viewport(0, 0, width, height);
    const flipY = fbo === null ? 1.0 : 0.0;
    this.programs.use(programKey, {...uniforms, uFlipY: flipY});
    this.gl.drawArrays(this.gl.TRIANGLE_STRIP, 0, 4);
  }
}
