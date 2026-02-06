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

import {render, screen} from '@testing-library/react';

import {FileWithPreview} from 'Components/Conversation/useFilesUploadState/useFilesUploadState';
import {withTheme} from 'src/script/auth/util/test/TestUtil';

import {FilePreviews} from './FilePreviews';

jest.mock('./ImagePreviewCard/ImagePreviewCard', () => ({
  ImagePreviewCard: () => <div data-uie-name="image-preview-card" />,
}));

jest.mock('./FilePreviewCard/FilePreviewCard', () => ({
  FilePreviewCard: () => <div data-uie-name="file-preview-card" />,
}));

describe('FilePreviews', () => {
  const conversationQualifiedId = {id: 'conv-id', domain: 'example.com'};

  const createFileWithPreview = (file: File): FileWithPreview =>
    Object.assign(file, {
      id: 'file-id',
      preview: 'blob:preview',
      remoteUuid: '',
      remoteVersionId: '',
      uploadStatus: 'uploading' as const,
      uploadProgress: 0,
    });

  it('renders a file preview card for HEIC images', () => {
    const heicFile = createFileWithPreview(new File(['heic'], 'photo.heic', {type: 'image/heic'}));

    render(withTheme(<FilePreviews files={[heicFile]} conversationQualifiedId={conversationQualifiedId} />));

    expect(screen.getByTestId('file-preview-card')).toBeInTheDocument();
    expect(screen.queryByTestId('image-preview-card')).not.toBeInTheDocument();
  });

  it('renders an image preview card for PNG images', () => {
    const pngFile = createFileWithPreview(new File(['png'], 'photo.png', {type: 'image/png'}));

    render(withTheme(<FilePreviews files={[pngFile]} conversationQualifiedId={conversationQualifiedId} />));

    expect(screen.getByTestId('image-preview-card')).toBeInTheDocument();
    expect(screen.queryByTestId('file-preview-card')).not.toBeInTheDocument();
  });
});
