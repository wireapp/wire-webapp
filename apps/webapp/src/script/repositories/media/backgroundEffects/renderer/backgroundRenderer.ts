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

import type {Size} from './webGlResources';

/**
 * Manages background image texture for virtual background rendering.
 *
 * Handles WebGL texture creation, upload, and lifecycle for background images
 * used in virtual background mode. Provides utilities for calculating cover
 * scale to ensure background images fill the output canvas appropriately.
 */
export class BackgroundRenderer {
  private texture: WebGLTexture | null = null;
  private size: Size | null = null;

  constructor(private readonly gl: WebGL2RenderingContext) {}

  /**
   * Sets or clears the background image for virtual background mode.
   *
   * Uploads the image to a WebGL texture and stores its dimensions. If null
   * is provided, releases the existing texture. Reuses existing texture if
   * available to avoid unnecessary allocations.
   *
   * @param image - Background image as ImageBitmap, or null to clear.
   * @param width - Image width in pixels.
   * @param height - Image height in pixels.
   * @returns Nothing.
   */
  public setBackground(image: ImageBitmap | null, width: number, height: number): void {
    if (!image) {
      if (this.texture) {
        this.gl.deleteTexture(this.texture);
      }
      this.texture = null;
      this.size = null;
      return;
    }

    const texture = this.texture ?? this.gl.createTexture();
    if (!texture) {
      return;
    }

    this.gl.bindTexture(this.gl.TEXTURE_2D, texture);
    this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MIN_FILTER, this.gl.LINEAR);
    this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MAG_FILTER, this.gl.LINEAR);
    this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_S, this.gl.CLAMP_TO_EDGE);
    this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_T, this.gl.CLAMP_TO_EDGE);
    this.gl.pixelStorei(this.gl.UNPACK_FLIP_Y_WEBGL, 0);
    this.gl.texImage2D(this.gl.TEXTURE_2D, 0, this.gl.RGBA, this.gl.RGBA, this.gl.UNSIGNED_BYTE, image);

    this.texture = texture;
    this.size = {width, height};
  }

  /**
   * Returns the WebGL texture containing the background image.
   *
   * @returns WebGL texture, or null if no background is set.
   */
  public getTexture(): WebGLTexture | null {
    return this.texture;
  }

  /**
   * Returns the dimensions of the background image.
   *
   * @returns Size object with width and height, or null if no background is set.
   */
  public getSize(): Size | null {
    return this.size;
  }

  /**
   * Calculates scale factors for covering target size with background image.
   *
   * Computes scale factors that ensure the background image covers the entire
   * target area while maintaining aspect ratio. Uses the larger of width/height
   * ratios to ensure complete coverage.
   *
   * @param target - Target size to cover.
   * @returns Tuple [scaleX, scaleY] for scaling the background texture coordinates.
   */
  public getCoverScale(target: Size): [number, number] {
    if (!this.size || this.size.width === 0 || this.size.height === 0) {
      return [1, 1];
    }
    const scale = Math.max(target.width / this.size.width, target.height / this.size.height);
    return [(this.size.width * scale) / target.width, (this.size.height * scale) / target.height];
  }

  /**
   * Destroys the background renderer and releases WebGL resources.
   *
   * Deletes the WebGL texture and clears all references. Should be called
   * when the renderer is no longer needed to prevent memory leaks.
   *
   * @returns Nothing.
   */
  public destroy(): void {
    if (this.texture) {
      this.gl.deleteTexture(this.texture);
    }
    this.texture = null;
    this.size = null;
  }
}
