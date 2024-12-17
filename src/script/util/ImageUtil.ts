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

export const stripImageExifData = async (image: Blob): Promise<Blob> => {
  const url = URL.createObjectURL(image);
  try {
    const img = await createImageElement(url);
    const canvas = drawImageOnCanvas(img);
    const strippedBlob = await canvasToBlob(canvas, image.type);
    return strippedBlob;
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`Failed to strip EXIF data: ${error.message}`);
    }
    throw error;
  } finally {
    URL.revokeObjectURL(url);
  }
};

const createImageElement = (url: string): Promise<HTMLImageElement> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`Failed to load image from ${url}`));
    img.src = url;
  });
};

const drawImageOnCanvas = (img: HTMLImageElement): HTMLCanvasElement => {
  const canvas = document.createElement('canvas');
  canvas.width = img.width;
  canvas.height = img.height;

  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('Failed to get 2D context from canvas');
  }

  ctx.drawImage(img, 0, 0);
  return canvas;
};

const canvasToBlob = (canvas: HTMLCanvasElement, type: string): Promise<Blob> => {
  const validType = type || 'image/png';
  return new Promise((resolve, reject) => {
    canvas.toBlob(blob => {
      if (blob) {
        resolve(blob);
      } else {
        reject(new Error('Failed to convert canvas to Blob'));
      }
    }, validType);
  });
};

const EXIF_MARKER = 0xffe1;
const EXIF_HEADER = 0x45786966; // "Exif" in ASCII
const VALID_MARKER_MASK = 0xff00;
const MIN_SEGMENT_LENGTH = 8;
const INITIAL_OFFSET = 2;
const EXIF_HEADER_OFFSET = 4;
const MARKER_LENGTH = 2;
const HEADER_LENGTH = 4;

export const imageHasExifData = async (image: Blob): Promise<boolean> => {
  try {
    const arrayBuffer = await readFileAsArrayBuffer(image);
    const view = new DataView(arrayBuffer);

    if (!isJPEG(view)) {
      return false;
    }

    return containsExifData(view);
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`Failed to check for EXIF data: ${error.message}`);
    }
    throw error;
  }
};

const readFileAsArrayBuffer = (blob: Blob): Promise<ArrayBuffer> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as ArrayBuffer);
    reader.onerror = () => reject(new Error(`FileReader error`));
    reader.readAsArrayBuffer(blob);
  });
};

const isJPEG = (view: DataView): boolean => {
  return view.getUint16(0, false) === 0xffd8;
};

const containsExifData = (view: DataView): boolean => {
  let offset = INITIAL_OFFSET;

  while (offset < view.byteLength) {
    if (offset + MARKER_LENGTH > view.byteLength) {
      break;
    }

    const marker = view.getUint16(offset, false);

    if (marker === EXIF_MARKER) {
      if (offset + EXIF_HEADER_OFFSET + HEADER_LENGTH > view.byteLength) {
        break;
      }
      return isExifHeader(view, offset + EXIF_HEADER_OFFSET);
    }

    if (!isValidMarker(marker) || isInvalidSegmentLength(view, offset)) {
      break;
    }

    const nextOffset = getNextOffset(view, offset);
    if (offset + nextOffset > view.byteLength) {
      break;
    }

    offset += nextOffset;
  }

  return false;
};

const isExifHeader = (view: DataView, offset: number): boolean => {
  return view.getUint32(offset, false) === EXIF_HEADER;
};

const isValidMarker = (marker: number): boolean => {
  return (marker & VALID_MARKER_MASK) === VALID_MARKER_MASK;
};

const isInvalidSegmentLength = (view: DataView, offset: number): boolean => {
  return view.getUint16(offset + INITIAL_OFFSET, false) <= MIN_SEGMENT_LENGTH;
};

const getNextOffset = (view: DataView, offset: number): number => {
  return INITIAL_OFFSET + view.getUint16(offset, false);
};
