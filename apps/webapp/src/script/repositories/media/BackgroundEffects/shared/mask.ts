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

export interface MaskSource {
  mask: ImageBitmap | null;
  maskTexture: WebGLTexture | null;
  width: number;
  height: number;
  release: () => void;
}

export interface MaskInputBitmap {
  type: 'bitmap';
  bitmap: ImageBitmap;
  width: number;
  height: number;
}

export interface MaskInputTexture {
  type: 'texture';
  texture: WebGLTexture;
  width: number;
  height: number;
}

export type MaskInput = MaskInputBitmap | MaskInputTexture;

export interface MaskBuildResult {
  maskInput: MaskInput | null;
  maskBitmap: ImageBitmap | null;
  release: (() => void) | null;
}

export const buildMaskInput = (source: MaskSource | null): MaskBuildResult => {
  if (!source) {
    return {maskInput: null, maskBitmap: null, release: null};
  }

  if (source.maskTexture) {
    return {
      maskInput: {
        type: 'texture',
        texture: source.maskTexture,
        width: source.width,
        height: source.height,
      },
      maskBitmap: null,
      release: source.release,
    };
  }

  if (source.mask) {
    return {
      maskInput: {
        type: 'bitmap',
        bitmap: source.mask,
        width: source.width,
        height: source.height,
      },
      maskBitmap: source.mask,
      release: source.release,
    };
  }

  return {maskInput: null, maskBitmap: null, release: source.release};
};
