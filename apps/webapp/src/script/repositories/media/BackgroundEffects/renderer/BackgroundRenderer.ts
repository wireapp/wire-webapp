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

import type {Size} from './WebGLResources';

export class BackgroundRenderer {
  private texture: WebGLTexture | null = null;
  private size: Size | null = null;

  constructor(private readonly gl: WebGL2RenderingContext) {}

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

  public getTexture(): WebGLTexture | null {
    return this.texture;
  }

  public getSize(): Size | null {
    return this.size;
  }

  public getCoverScale(target: Size): [number, number] {
    if (!this.size || this.size.width === 0 || this.size.height === 0) {
      return [1, 1];
    }
    const scale = Math.max(target.width / this.size.width, target.height / this.size.height);
    return [(this.size.width * scale) / target.width, (this.size.height * scale) / target.height];
  }

  public destroy(): void {
    if (this.texture) {
      this.gl.deleteTexture(this.texture);
    }
    this.texture = null;
    this.size = null;
  }
}
