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

import {imageHasExifData, stripImageExifData} from './ImageUtil';

const jpegWithExif = new Blob([new Uint8Array([0xff, 0xd8, 0xff, 0xe1, 0x00, 0x10, 0x45, 0x78, 0x69, 0x66])], {
  type: 'image/jpeg',
});

const jpegWithoutExif = new Blob([new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x04, 0x4a, 0x46])], {
  type: 'image/jpeg',
});

const nonJpeg = new Blob([new Uint8Array([0x00, 0x00, 0x00, 0x00])], {type: 'application/octet-stream'});

URL.createObjectURL = jest.fn(() => 'mocked-url');
URL.revokeObjectURL = jest.fn();

describe('ImageUtil', () => {
  let mockCanvas: HTMLCanvasElement;
  let mockContext: CanvasRenderingContext2D;

  beforeEach(() => {
    global.Image = jest.fn(() => ({
      onload: jest.fn(),
      onerror: jest.fn(),
      set src(value: string) {
        if (value === 'mocked-url') {
          setTimeout(() => this.onload(new Event('load')), 10);
        }
      },
    })) as jest.Mock;

    mockContext = {
      drawImage: jest.fn(),
    } as unknown as CanvasRenderingContext2D;

    mockCanvas = {
      width: 0,
      height: 0,
      getContext: jest.fn(() => mockContext),
      toBlob: jest.fn((callback: (blob: Blob | null) => void) => {
        callback(new Blob(['mocked-data'], {type: 'image/png'}));
      }),
    } as unknown as HTMLCanvasElement;

    jest.spyOn(document, 'createElement').mockImplementation((tagName: string) => {
      if (tagName === 'canvas') {
        return mockCanvas;
      }
      return null as unknown as HTMLElement;
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('imageHasExifData', () => {
    it('returns true for JPEG with EXIF data', async () => {
      const result = await imageHasExifData(jpegWithExif);
      expect(result).toBe(true);
    });

    it('returns false for JPEG without EXIF data', async () => {
      const result = await imageHasExifData(jpegWithoutExif);
      expect(result).toBe(false);
    });

    it('returns false for non-JPEG files', async () => {
      const result = await imageHasExifData(nonJpeg);
      expect(result).toBe(false);
    });
  });

  describe('stripImageExifData', () => {
    it('successfully strips EXIF data and returns a new Blob', async () => {
      const hasExifBefore = await imageHasExifData(jpegWithExif);
      expect(hasExifBefore).toBe(true);

      const result = await stripImageExifData(jpegWithExif);

      const hasExifAfter = await imageHasExifData(result);
      expect(hasExifAfter).toBe(false);
    });

    it('throws an error if the image fails to load', async () => {
      global.Image = jest.fn(() => ({
        onload: jest.fn(),
        onerror: jest.fn(),
        set src(value: string) {
          if (value === 'mocked-url') {
            setTimeout(() => this.onerror?.(new ErrorEvent('error')), 10);
          }
        },
      })) as jest.Mock;

      const inputBlob = new Blob(['dummy-image'], {type: 'image/png'});

      await expect(stripImageExifData(inputBlob)).rejects.toThrow('Failed to load image');
    });
  });
});
