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

import {render, screen, within, type RenderResult} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {ThemeProvider} from '@wireapp/react-ui-kit';

import type {SharedDriveUploadStatus} from './sharedDriveUploadStatus';
import {SharedDriveUploadStatusPopup} from './sharedDriveUploadStatusPopup';
const upload: SharedDriveUploadStatus = {
  uploadId: 'upload-1',
  conversationQualifiedId: 'conversation@example.com',
  fileName: 'report.pdf',
  fileSize: 4,
  kind: 'uploading',
  progress: 0,
  hasProgress: false,
  isTransferActive: true,
  isFolder: false,
  cancellableUploadIds: ['upload-1'],
  retryableUploads: [],
};

const renderPopup = (
  kind: SharedDriveUploadStatus['kind'],
  isExpanded = false,
  isRetrying = false,
  fileName = upload.fileName,
): RenderResult => {
  return render(
    <ThemeProvider>
      <SharedDriveUploadStatusPopup
        upload={{
          ...upload,
          fileName,
          kind,
          isTransferActive: kind === 'uploading',
          cancellableUploadIds: kind === 'uploading' ? [upload.uploadId] : [],
          retryableUploads: kind === 'failed' ? [{uploadId: upload.uploadId, action: 'upload'}] : [],
        }}
        title={`${kind} report.pdf`}
        statusLabel={
          kind === 'failed' ? 'Couldn’t upload file' : `${kind === 'uploading' ? 'Uploading' : 'Uploaded'} 4 KB`
        }
        destination="to Shared Drive"
        isExpanded={isExpanded}
        toggleLabel={isExpanded ? 'Hide upload details' : 'Show upload details'}
        cancelLabel="Cancel"
        dismissLabel="Close"
        dismissAriaLabel="Close upload status"
        retryLabel="Retry"
        isCancelling={false}
        isRetrying={isRetrying}
        onToggle={jest.fn()}
        onCancelAll={jest.fn()}
        onCancelUpload={jest.fn()}
        onRetry={jest.fn()}
        onDismissAll={jest.fn()}
        onDismissRow={jest.fn()}
      />
    </ThemeProvider>,
  );
};

describe('SharedDriveUploadStatusPopup', () => {
  it('renders ordered rows with distinct queued and active states', async () => {
    const user = userEvent.setup();
    const onCancelUpload = jest.fn();
    const secondUpload: SharedDriveUploadStatus = {
      ...upload,
      uploadId: 'upload-2',
      fileName: 'queued.txt',
      kind: 'queued',
      isTransferActive: false,
      cancellableUploadIds: ['upload-2'],
    };

    render(
      <ThemeProvider>
        <SharedDriveUploadStatusPopup
          upload={upload}
          uploads={[upload, secondUpload]}
          aggregateKind="uploading"
          title="Uploading 2 files"
          statusLabel="Uploading"
          statusLabels={
            new Map([
              [upload.uploadId, 'Uploading 4 B'],
              [secondUpload.uploadId, 'Queued'],
            ])
          }
          destination="to Shared Drive"
          isExpanded
          toggleLabel="Hide upload details"
          cancelLabel="Cancel"
          retryLabel="Retry"
          isCancelling={false}
          isRetrying={false}
          onToggle={jest.fn()}
          onCancelAll={jest.fn()}
          onCancelUpload={onCancelUpload}
          onRetry={jest.fn()}
        />
      </ThemeProvider>,
    );

    const rows = screen.getAllByRole('listitem');
    expect(rows).toHaveLength(2);
    expect(within(rows[0]).getByText('report.pdf')).toBeInTheDocument();
    expect(within(rows[1]).getByText('queued.txt')).toBeInTheDocument();
    expect(within(rows[1]).getByText('Queued')).toBeInTheDocument();
    expect(screen.getAllByRole('progressbar')).toHaveLength(1);
    expect(within(rows[0]).queryByRole('progressbar')).not.toBeInTheDocument();
    expect(within(rows[1]).queryByRole('progressbar')).not.toBeInTheDocument();

    await user.click(within(rows[1]).getByRole('button', {name: 'Cancel'}));
    expect(onCancelUpload).toHaveBeenCalledWith('upload-2');
  });

  it('shows the filename and destination while uploading with indeterminate progress', () => {
    const {getByRole, getByText} = renderPopup('uploading');

    expect(getByRole('status')).toBeInTheDocument();
    expect(getByText('uploading report.pdf')).toBeInTheDocument();
    expect(getByText('to Shared Drive')).toBeInTheDocument();
    const progress = getByRole('progressbar', {name: 'report.pdf'});
    expect(progress).not.toHaveAttribute('aria-valuenow');
    expect(progress).not.toHaveAttribute('aria-valuemin');
    expect(progress).not.toHaveAttribute('aria-valuemax');
    expect(getByRole('progressbar')).toBeInTheDocument();
  });

  it('shows determinate progress when Cells reports bytes sent', () => {
    render(
      <ThemeProvider>
        <SharedDriveUploadStatusPopup
          upload={{...upload, progress: 0.45, hasProgress: true}}
          title="Uploading report.pdf"
          statusLabel="Uploading 4 B"
          destination="to Shared Drive"
          isExpanded={false}
          toggleLabel="Expand upload details"
          cancelLabel="Cancel"
          retryLabel="Retry"
          isCancelling={false}
          isRetrying={false}
          onToggle={jest.fn()}
          onCancelAll={jest.fn()}
          onCancelUpload={jest.fn()}
          onRetry={jest.fn()}
        />
      </ThemeProvider>,
    );

    const progress = screen.getByRole('progressbar', {name: 'report.pdf'});
    expect(progress).toHaveAttribute('aria-valuemin', '0');
    expect(progress).toHaveAttribute('aria-valuemax', '100');
    expect(progress).toHaveAttribute('aria-valuenow', '45');
    expect(progress).toHaveStyle({width: '100%', transform: 'scaleX(0.45)'});
  });

  it('updates progress without replacing the bar or its style rule', () => {
    const {rerender} = render(
      <ThemeProvider>
        <SharedDriveUploadStatusPopup
          upload={{...upload, progress: 0.45, hasProgress: true}}
          title="Uploading report.pdf"
          statusLabel="Uploading 4 B"
          destination="to Shared Drive"
          isExpanded={false}
          toggleLabel="Expand upload details"
          cancelLabel="Cancel"
          retryLabel="Retry"
          isCancelling={false}
          isRetrying={false}
          onToggle={jest.fn()}
          onCancelAll={jest.fn()}
          onCancelUpload={jest.fn()}
          onRetry={jest.fn()}
        />
      </ThemeProvider>,
    );

    const progress = screen.getByRole('progressbar', {name: 'report.pdf'});
    const progressClassName = progress.className;
    const statusIcon = screen
      .getByRole('listitem', {hidden: true})
      .querySelector('[data-uie-name="shared-drive-upload-uploading"]');
    expect(statusIcon).toHaveAttribute('aria-hidden', 'true');

    rerender(
      <ThemeProvider>
        <SharedDriveUploadStatusPopup
          upload={{...upload, progress: 0.46, hasProgress: true}}
          title="Uploading report.pdf"
          statusLabel="Uploading 4 B"
          destination="to Shared Drive"
          isExpanded={false}
          toggleLabel="Expand upload details"
          cancelLabel="Cancel"
          retryLabel="Retry"
          isCancelling={false}
          isRetrying={false}
          onToggle={jest.fn()}
          onCancelAll={jest.fn()}
          onCancelUpload={jest.fn()}
          onRetry={jest.fn()}
        />
      </ThemeProvider>,
    );

    expect(screen.getByRole('progressbar', {name: 'report.pdf'})).toBe(progress);
    expect(screen.getByRole('progressbar', {name: 'report.pdf'})).toHaveClass(progressClassName);
    expect(screen.getByRole('progressbar', {name: 'report.pdf'})).toHaveStyle({transform: 'scaleX(0.46)'});
    expect(
      screen.getByRole('listitem', {hidden: true}).querySelector('[data-uie-name="shared-drive-upload-uploading"]'),
    ).toBe(statusIcon);
  });

  it.each([
    ['uploading', 'shared-drive-upload-uploading'],
    ['uploaded', 'shared-drive-upload-uploaded'],
    ['failed', 'shared-drive-upload-failed'],
  ] as const)('hides the decorative %s icon from assistive technology', (kind, iconName) => {
    renderPopup(kind, true);

    expect(screen.getByRole('listitem', {hidden: true}).querySelector(`[data-uie-name="${iconName}"]`)).toHaveAttribute(
      'aria-hidden',
      'true',
    );
  });

  it('provides full text for ellipsized row content', () => {
    renderPopup('uploading', true);

    expect(screen.getByText('report.pdf')).toHaveAttribute('title', 'report.pdf');
    expect(screen.getByText('Uploading 4 KB')).toHaveAttribute('title', 'Uploading 4 KB');
  });

  it('shows uploaded status with a completed progress bar', () => {
    const {getByRole, getByText} = renderPopup('uploaded');

    expect(getByText('uploaded report.pdf')).toBeInTheDocument();
    expect(getByRole('progressbar')).toBeInTheDocument();
  });

  it('shows an icon when an uploaded file has no extension', () => {
    renderPopup('uploaded', true, false, 'Wire – New Features');

    expect(
      screen.getByRole('listitem', {hidden: true}).querySelector('[data-uie-name="shared-drive-upload-uploaded"]'),
    ).toHaveAttribute('aria-hidden', 'true');
  });

  it('does not expose failed transfer decoration as progress', () => {
    renderPopup('failed', true);

    expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();
  });

  it('starts collapsed and exposes accessible cancel and toggle actions in the header', () => {
    renderPopup('uploading');

    const header = screen.getByRole('group');
    const toggle = within(header).getByRole('button', {name: 'Show upload details'});
    expect(within(header).getByRole('button', {name: 'Cancel'})).toBeInTheDocument();
    expect(toggle).toHaveAttribute('aria-expanded', 'false');
    expect(toggle).toHaveAttribute('aria-controls', 'shared-drive-upload-status-upload-1');
    expect(screen.getByRole('status').querySelector('button')).not.toBeInTheDocument();
    expect(screen.getByRole('listitem', {hidden: true})).not.toBeVisible();
  });

  it.each([
    ['uploading', 'Uploading 4 KB', 'shared-drive-upload-uploading'],
    ['uploaded', 'Uploaded 4 KB', 'shared-drive-upload-uploaded'],
    ['failed', 'Couldn’t upload file', 'shared-drive-upload-failed'],
  ] as const)('shows the %s file status row without duplicate header icons', (kind, label, iconName) => {
    renderPopup(kind, true);

    const header = screen.getByRole('group');
    const row = screen.getByRole('listitem', {hidden: true});
    expect(screen.getByRole('button', {name: 'Hide upload details'})).toHaveAttribute('aria-expanded', 'true');
    expect(row).toBeVisible();
    expect(within(row).getByText('report.pdf')).toBeInTheDocument();
    expect(row.querySelector(`[data-uie-name="${iconName}"]`)).toHaveAttribute('aria-hidden', 'true');
    expect(header.querySelector(`[data-uie-name="${iconName}"]`)).not.toBeInTheDocument();
  });

  it('calls the toggle handler when activated by keyboard', async () => {
    const user = userEvent.setup();
    const onToggle = jest.fn();
    render(
      <SharedDriveUploadStatusPopup
        upload={upload}
        title="Uploading report.pdf"
        statusLabel="Uploading"
        destination="to Shared Drive"
        isExpanded={false}
        toggleLabel="Show upload details"
        cancelLabel="Cancel"
        retryLabel="Retry"
        isCancelling={false}
        isRetrying={false}
        onToggle={onToggle}
        onCancelAll={jest.fn()}
        onCancelUpload={jest.fn()}
        onRetry={jest.fn()}
      />,
    );

    screen.getByRole('button', {name: 'Show upload details'}).focus();
    await user.keyboard('{Enter}');
    await user.keyboard(' ');

    expect(onToggle).toHaveBeenCalledTimes(2);
  });

  it('invokes cancellation from the header', async () => {
    const user = userEvent.setup();
    const onCancelAll = jest.fn();
    render(
      <ThemeProvider>
        <SharedDriveUploadStatusPopup
          upload={upload}
          title="Uploading report.pdf"
          statusLabel="Uploading"
          destination="to Shared Drive"
          isExpanded={false}
          toggleLabel="Show upload details"
          cancelLabel="Cancel"
          retryLabel="Retry"
          isCancelling={false}
          isRetrying={false}
          onToggle={jest.fn()}
          onCancelAll={onCancelAll}
          onCancelUpload={jest.fn()}
          onRetry={jest.fn()}
        />
      </ThemeProvider>,
    );

    await user.click(within(screen.getByRole('group')).getByRole('button', {name: 'Cancel'}));

    expect(onCancelAll).toHaveBeenCalledTimes(1);
  });

  it('invokes cancellation from the expanded row icon action', async () => {
    const user = userEvent.setup();
    const onCancelUpload = jest.fn();
    render(
      <ThemeProvider>
        <SharedDriveUploadStatusPopup
          upload={upload}
          title="Uploading report.pdf"
          statusLabel="Uploading"
          destination="to Shared Drive"
          isExpanded
          toggleLabel="Hide upload details"
          cancelLabel="Cancel"
          retryLabel="Retry"
          isCancelling={false}
          isRetrying={false}
          onToggle={jest.fn()}
          onCancelAll={jest.fn()}
          onCancelUpload={onCancelUpload}
          onRetry={jest.fn()}
        />
      </ThemeProvider>,
    );

    const row = screen.getByRole('listitem', {hidden: true});
    const rowCancel = within(row).getByRole('button', {name: 'Cancel'});
    expect(rowCancel).toHaveAttribute('data-uie-name', 'shared-drive-upload-cancel');
    expect(rowCancel.querySelector('svg')).toHaveAttribute('aria-hidden', 'true');
    await user.click(rowCancel);

    expect(onCancelUpload).toHaveBeenCalledTimes(1);
  });

  it('disables every cancel action while cancellation is pending', () => {
    render(
      <ThemeProvider>
        <SharedDriveUploadStatusPopup
          upload={upload}
          title="Uploading report.pdf"
          statusLabel="Uploading"
          destination="to Shared Drive"
          isExpanded
          toggleLabel="Hide upload details"
          cancelLabel="Cancel"
          retryLabel="Retry"
          isCancelling
          isRetrying={false}
          onToggle={jest.fn()}
          onCancelAll={jest.fn()}
          onCancelUpload={jest.fn()}
          onRetry={jest.fn()}
        />
      </ThemeProvider>,
    );

    expect(screen.getAllByRole('button', {name: 'Cancel'})).toHaveLength(2);
    screen.getAllByRole('button', {name: 'Cancel'}).forEach(cancel => {
      expect(cancel).toBeDisabled();
    });
  });

  it('invokes retry from the failed file row', async () => {
    const user = userEvent.setup();
    const onRetry = jest.fn();
    render(
      <ThemeProvider>
        <SharedDriveUploadStatusPopup
          upload={{
            ...upload,
            kind: 'failed',
            cancellableUploadIds: [],
            retryableUploads: [{uploadId: upload.uploadId, action: 'upload'}],
          }}
          title="Upload failed report.pdf"
          statusLabel="Couldn’t upload file"
          destination="to Shared Drive"
          isExpanded
          toggleLabel="Hide upload details"
          cancelLabel="Cancel"
          retryLabel="Retry"
          isCancelling={false}
          isRetrying={false}
          onToggle={jest.fn()}
          onCancelAll={jest.fn()}
          onCancelUpload={jest.fn()}
          onRetry={onRetry}
        />
      </ThemeProvider>,
    );

    await user.click(screen.getByRole('button', {name: 'Retry'}));

    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it('invokes dismiss from the uploaded header action', async () => {
    const user = userEvent.setup();
    const onDismissAll = jest.fn();
    render(
      <ThemeProvider>
        <SharedDriveUploadStatusPopup
          upload={{
            ...upload,
            kind: 'uploaded',
            isTransferActive: false,
            cancellableUploadIds: [],
            retryableUploads: [],
          }}
          title="Uploaded report.pdf"
          statusLabel="Uploaded 4 KB"
          destination="to Shared Drive"
          isExpanded={false}
          toggleLabel="Show upload details"
          cancelLabel="Cancel"
          dismissLabel="Close"
          dismissAriaLabel="Close upload status"
          retryLabel="Retry"
          isCancelling={false}
          isRetrying={false}
          onToggle={jest.fn()}
          onCancelAll={jest.fn()}
          onCancelUpload={jest.fn()}
          onRetry={jest.fn()}
          onDismissAll={onDismissAll}
          onDismissRow={jest.fn()}
        />
      </ThemeProvider>,
    );

    const headerClose = within(screen.getByRole('group')).getByRole('button', {
      name: 'Close upload status',
    });
    expect(headerClose).toHaveTextContent('Close');
    expect(headerClose).toHaveAttribute('data-uie-name', 'shared-drive-upload-header-dismiss');

    await user.click(headerClose);

    expect(onDismissAll).toHaveBeenCalledTimes(1);
  });

  it.each(['uploading', 'failed'] as const)('does not show header close while %s status is actionable', kind => {
    renderPopup(kind, true);

    expect(
      within(screen.getByRole('group')).queryByRole('button', {
        name: 'Close upload status',
      }),
    ).not.toBeInTheDocument();
  });

  it('invokes dismiss for an expanded failed row', async () => {
    const user = userEvent.setup();
    const onDismissRow = jest.fn();
    render(
      <ThemeProvider>
        <SharedDriveUploadStatusPopup
          upload={{
            ...upload,
            kind: 'failed',
            cancellableUploadIds: [],
            retryableUploads: [{uploadId: upload.uploadId, action: 'upload'}],
          }}
          title="Upload failed report.pdf"
          statusLabel="Couldn’t upload file"
          destination="to Shared Drive"
          isExpanded
          toggleLabel="Hide upload details"
          cancelLabel="Cancel"
          dismissAriaLabel="Close upload status"
          retryLabel="Retry"
          isCancelling={false}
          isRetrying={false}
          onToggle={jest.fn()}
          onCancelAll={jest.fn()}
          onCancelUpload={jest.fn()}
          onRetry={jest.fn()}
          onDismissRow={onDismissRow}
        />
      </ThemeProvider>,
    );

    const dismiss = screen.getByRole('button', {name: 'Close upload status'});
    expect(dismiss).toHaveAttribute('data-uie-name', 'shared-drive-upload-dismiss');
    await user.click(dismiss);

    expect(onDismissRow).toHaveBeenCalledWith('upload-1');
  });

  it('disables retry while a failed upload is being retried', () => {
    renderPopup('failed', true, true);

    expect(screen.getByRole('button', {name: 'Retry'})).toBeDisabled();
  });

  it.each(['uploaded', 'uploading'] as const)('does not show retry for %s status', kind => {
    expect(renderPopup(kind).queryByRole('button', {name: 'Retry'})).not.toBeInTheDocument();
  });

  it.each(['uploaded', 'failed'] as const)('does not show cancel for %s status', kind => {
    const {queryByRole} = renderPopup(kind);

    expect(queryByRole('button', {name: 'Cancel'})).not.toBeInTheDocument();
  });
});
