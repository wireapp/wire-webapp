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

import {render} from '@testing-library/react';

import {ImageAssetLarge} from './ImageAssetLarge';

jest.mock('Components/FileFullscreenModal/FileFullscreenModal', () => ({
  FileFullscreenModal: (): null => null,
}));

describe('ImageAssetLarge', () => {
  const defaultProps = {
    id: 'test-id',
    name: 'photo',
    extension: 'jpg',
    metadata: {width: 800, height: 600},
    isError: false,
    senderName: 'Alice',
    timestamp: 1234567890,
    filePreviewUrl: 'https://example.com/preview.jpg',
    fileUrl: 'https://example.com/original.jpg',
  };

  describe('display image source selection (WPB-22331)', () => {
    it('uses the original fileUrl for JPEG images', () => {
      const {container} = render(<ImageAssetLarge {...defaultProps} extension="jpg" />);

      expect(container.querySelector('img')).toHaveAttribute('src', 'https://example.com/original.jpg');
    });

    it('uses the original fileUrl for PNG images', () => {
      const {container} = render(<ImageAssetLarge {...defaultProps} extension="png" />);

      expect(container.querySelector('img')).toHaveAttribute('src', 'https://example.com/original.jpg');
    });

    it('uses the server-generated preview for HEIC files (not natively decodable by browsers)', () => {
      const {container} = render(
        <ImageAssetLarge
          {...defaultProps}
          extension="heic"
          fileUrl="https://example.com/original.heic"
        />,
      );

      expect(container.querySelector('img')).toHaveAttribute('src', 'https://example.com/preview.jpg');
    });

    it('falls back to filePreviewUrl when fileUrl is absent for a previewable format', () => {
      const {container} = render(<ImageAssetLarge {...defaultProps} extension="jpg" fileUrl={undefined} />);

      expect(container.querySelector('img')).toHaveAttribute('src', 'https://example.com/preview.jpg');
    });
  });
});
