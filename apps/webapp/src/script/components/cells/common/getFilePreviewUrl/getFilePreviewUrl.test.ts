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

import {getFilePreviewUrl} from './getFilePreviewUrl';

describe('getFilePreviewUrl', () => {
  it('uses the PDF preview when the original file URL is unavailable', () => {
    expect(
      getFilePreviewUrl({
        extension: 'pdf',
        url: undefined,
        previewPdfUrl: 'https://cells.example.com/previews/security-report',
      }),
    ).toBe('https://cells.example.com/previews/security-report');
  });

  it('uses an image preview for a guest PDF when the feature is enabled', () => {
    expect(
      getFilePreviewUrl({
        extension: 'pdf',
        previewImageUrl: 'https://cells.example.com/previews/security-report',
        enableGuestPdfImagePreview: true,
      }),
    ).toBe('https://cells.example.com/previews/security-report');
  });

  it('does not use an image preview for a guest PDF when the feature is disabled', () => {
    expect(
      getFilePreviewUrl({
        extension: 'pdf',
        previewImageUrl: 'https://cells.example.com/previews/security-report',
        enableGuestPdfImagePreview: false,
      }),
    ).toBeUndefined();
  });

  it.each(['mp3', 'mp4'])('does not return a preview for %s files', extension => {
    expect(
      getFilePreviewUrl({
        extension,
        url: 'https://cells.example.com/files/media',
        previewPdfUrl: 'https://cells.example.com/previews/media',
      }),
    ).toBeUndefined();
  });
});
