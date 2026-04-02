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

/**
 * Source of mask data for rendering.
 *
 * Can provide mask as either ImageBitmap or WebGLTexture, along with
 * dimensions and a release function for cleanup.
 */
export interface MaskSource {
  mask: ImageBitmap | null;
  maskTexture: WebGLTexture | null;
  width: number;
  height: number;
  /** Function to release mask resources when no longer needed. */
  release: () => void;
}

/**
 * Mask input as ImageBitmap.
 */
export interface MaskInputBitmap {
  type: 'bitmap';
  bitmap: ImageBitmap;
  width: number;
  /** Mask height in pixels. */
  height: number;
}

/**
 * Mask input as WebGLTexture.
 */
export interface MaskInputTexture {
  type: 'texture';
  texture: WebGLTexture;
  width: number;
  /** Mask height in pixels. */
  height: number;
}

/**
 * Union type for mask input data.
 *
 * Masks can be provided as either ImageBitmap (for CPU pipelines) or
 * WebGLTexture (for GPU pipelines) to avoid unnecessary conversions.
 */
export type MaskInput = MaskInputBitmap | MaskInputTexture;

/**
 * Result of building mask input from a mask source.
 */
export interface MaskBuildResult {
  maskInput: MaskInput | null;
  maskBitmap: ImageBitmap | null;
  /** Function to release mask resources, or null if no mask. */
  release: (() => void) | null;
}

/**
 * Builds mask input from a mask source.
 *
 * Converts a MaskSource into the appropriate MaskInput format (bitmap or texture)
 * based on what's available. Prefers texture if available (for GPU pipelines),
 * otherwise uses bitmap. Returns null inputs if source is null.
 *
 * @param source - Mask source to convert, or null.
 * @returns MaskBuildResult with mask input, bitmap (if applicable), and release function.
 */
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
