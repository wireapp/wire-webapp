/*
 * Wire
 * Copyright (C) 2026 Wire Swiss GmbH
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
