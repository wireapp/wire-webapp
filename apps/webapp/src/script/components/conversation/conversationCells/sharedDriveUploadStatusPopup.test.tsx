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

import {render} from '@testing-library/react';

import type {SharedDriveUploadStatus} from './sharedDriveUploadStatus';
import {SharedDriveUploadStatusPopup} from './sharedDriveUploadStatusPopup';

const upload: SharedDriveUploadStatus = {
  uploadId: 'upload-1',
  conversationQualifiedId: 'conversation@example.com',
  fileName: 'report.pdf',
  kind: 'uploading',
};

const renderPopup = (kind: SharedDriveUploadStatus['kind']) =>
  render(
    <SharedDriveUploadStatusPopup
      upload={{...upload, kind}}
      title={`${kind} report.pdf`}
      destination="to Shared Drive"
    />,
  );

describe('SharedDriveUploadStatusPopup', () => {
  it('shows the filename and destination while uploading with indeterminate progress', () => {
    const {getByRole, getByText, getByTestId} = renderPopup('uploading');

    expect(getByRole('status')).toBeInTheDocument();
    expect(getByText('uploading report.pdf')).toBeInTheDocument();
    expect(getByText('to Shared Drive')).toBeInTheDocument();
    expect(getByTestId('shared-drive-upload-progress')).toBeInTheDocument();
  });

  it('shows uploaded status without a progress bar', () => {
    const {getByText, queryByTestId} = renderPopup('uploaded');

    expect(getByText('uploaded report.pdf')).toBeInTheDocument();
    expect(queryByTestId('shared-drive-upload-progress')).not.toBeInTheDocument();
  });

  it('shows failed status without retry or cancel actions', () => {
    const {getByText, queryByRole} = renderPopup('failed');

    expect(getByText('failed report.pdf')).toBeInTheDocument();
    expect(queryByRole('button')).not.toBeInTheDocument();
  });
});
