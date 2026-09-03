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

import {render, screen, within} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {ThemeProvider} from '@wireapp/react-ui-kit';

import type {SharedDriveUploadStatus} from './sharedDriveUploadStatus';
import {SharedDriveUploadStatusPopup} from './sharedDriveUploadStatusPopup';
import {sharedDriveUploadStatusPopupProgressStyles} from './sharedDriveUploadStatusPopup.styles';

const upload: SharedDriveUploadStatus = {
  uploadId: 'upload-1',
  conversationQualifiedId: 'conversation@example.com',
  fileName: 'report.pdf',
  fileSize: 4,
  kind: 'uploading',
  canCancel: true,
};

const renderPopup = (kind: SharedDriveUploadStatus['kind'], isExpanded = false) =>
  render(
    <ThemeProvider>
      <SharedDriveUploadStatusPopup
        upload={{...upload, kind, canCancel: kind === 'uploading'}}
        title={`${kind} report.pdf`}
        statusLabel={
          kind === 'failed' ? 'Couldn’t upload file' : `${kind === 'uploading' ? 'Uploading' : 'Uploaded'} 4 KB`
        }
        destination="to Shared Drive"
        isExpanded={isExpanded}
        toggleLabel={isExpanded ? 'Collapse upload details' : 'Expand upload details'}
        cancelLabel="Cancel"
        isCancelling={false}
        onToggle={jest.fn()}
        onCancel={jest.fn()}
      />
    </ThemeProvider>,
  );

describe('SharedDriveUploadStatusPopup', () => {
  it('positions progress at the bottom when closed and below the header when expanded', () => {
    expect(sharedDriveUploadStatusPopupProgressStyles(false)).toMatchObject({
      position: 'absolute',
      bottom: 0,
      left: 3,
      top: undefined,
    });
    expect(sharedDriveUploadStatusPopupProgressStyles(true)).toMatchObject({
      position: 'absolute',
      top: 51,
      left: 0,
      bottom: undefined,
    });
  });

  it('shows the filename and destination while uploading with indeterminate progress', () => {
    const {getByRole, getByText, getByTestId} = renderPopup('uploading');

    expect(getByRole('status')).toBeInTheDocument();
    expect(getByText('uploading report.pdf')).toBeInTheDocument();
    expect(getByText('to Shared Drive')).toBeInTheDocument();
    expect(getByTestId('shared-drive-upload-progress')).toBeInTheDocument();
  });

  it.each([
    ['uploading', 'shared-drive-upload-uploading'],
    ['uploaded', 'shared-drive-upload-uploaded'],
    ['failed', 'shared-drive-upload-failed'],
  ] as const)('hides the decorative %s icon from assistive technology', (kind, iconName) => {
    renderPopup(kind, true);

    expect(
      screen.getByTestId('shared-drive-upload-status-row').querySelector(`[data-uie-name="${iconName}"]`),
    ).toHaveAttribute('aria-hidden', 'true');
  });

  it('provides full text for ellipsized row content', () => {
    renderPopup('uploading', true);

    expect(screen.getByText('report.pdf')).toHaveAttribute('title', 'report.pdf');
    expect(screen.getByText('Uploading 4 KB')).toHaveAttribute('title', 'Uploading 4 KB');
  });

  it('shows uploaded status without a progress bar', () => {
    const {getByText, queryByTestId} = renderPopup('uploaded');

    expect(getByText('uploaded report.pdf')).toBeInTheDocument();
    expect(queryByTestId('shared-drive-upload-progress')).not.toBeInTheDocument();
  });

  it('starts collapsed and exposes accessible cancel and toggle actions in the header', () => {
    renderPopup('uploading');

    const header = screen.getByTestId('shared-drive-upload-status-header');
    const toggle = within(header).getByRole('button', {name: 'Expand upload details'});
    expect(within(header).getByRole('button', {name: 'Cancel'})).toBeInTheDocument();
    expect(toggle).toHaveAttribute('aria-expanded', 'false');
    expect(toggle).toHaveAttribute('aria-controls', 'shared-drive-upload-status-upload-1');
    expect(screen.getByRole('status').querySelector('button')).not.toBeInTheDocument();
    expect(screen.getByTestId('shared-drive-upload-status-row')).not.toBeVisible();
  });

  it.each([
    ['uploading', 'Uploading 4 KB', '#0667c8', 'shared-drive-upload-uploading'],
    ['uploaded', 'Uploaded 4 KB', '#1d7833', 'shared-drive-upload-uploaded'],
    ['failed', 'Couldn’t upload file', '#c20013', 'shared-drive-upload-failed'],
  ] as const)('shows the %s file status row without duplicate header icons', (kind, label, color, iconName) => {
    renderPopup(kind, true);

    const header = screen.getByTestId('shared-drive-upload-status-header');
    const row = screen.getByTestId('shared-drive-upload-status-row');
    expect(screen.getByRole('button', {name: 'Collapse upload details'})).toHaveAttribute('aria-expanded', 'true');
    expect(row).toBeVisible();
    expect(within(row).getByText('report.pdf')).toBeInTheDocument();
    expect(within(row).getByText(label)).toHaveStyle({color});
    expect(within(row).getByTestId(iconName)).toBeInTheDocument();
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
        toggleLabel="Expand upload details"
        cancelLabel="Cancel"
        isCancelling={false}
        onToggle={onToggle}
        onCancel={jest.fn()}
      />,
    );

    screen.getByRole('button', {name: 'Expand upload details'}).focus();
    await user.keyboard('{Enter}');
    await user.keyboard(' ');

    expect(onToggle).toHaveBeenCalledTimes(2);
  });

  it('invokes cancellation from the header', async () => {
    const user = userEvent.setup();
    const onCancel = jest.fn();
    render(
      <ThemeProvider>
        <SharedDriveUploadStatusPopup
          upload={upload}
          title="Uploading report.pdf"
          statusLabel="Uploading"
          destination="to Shared Drive"
          isExpanded={false}
          toggleLabel="Expand upload details"
          cancelLabel="Cancel"
          isCancelling={false}
          onToggle={jest.fn()}
          onCancel={onCancel}
        />
      </ThemeProvider>,
    );

    await user.click(
      within(screen.getByTestId('shared-drive-upload-status-header')).getByRole('button', {name: 'Cancel'}),
    );

    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it('invokes cancellation from the expanded row icon action', async () => {
    const user = userEvent.setup();
    const onCancel = jest.fn();
    render(
      <ThemeProvider>
        <SharedDriveUploadStatusPopup
          upload={upload}
          title="Uploading report.pdf"
          statusLabel="Uploading"
          destination="to Shared Drive"
          isExpanded
          toggleLabel="Collapse upload details"
          cancelLabel="Cancel"
          isCancelling={false}
          onToggle={jest.fn()}
          onCancel={onCancel}
        />
      </ThemeProvider>,
    );

    const row = screen.getByTestId('shared-drive-upload-status-row');
    const rowCancel = within(row).getByRole('button', {name: 'Cancel'});
    expect(rowCancel).toHaveAttribute('data-uie-name', 'shared-drive-upload-cancel');
    expect(rowCancel.querySelector('svg')).toHaveAttribute('aria-hidden', 'true');
    await user.click(rowCancel);

    expect(onCancel).toHaveBeenCalledTimes(1);
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
          toggleLabel="Collapse upload details"
          cancelLabel="Cancel"
          isCancelling
          onToggle={jest.fn()}
          onCancel={jest.fn()}
        />
      </ThemeProvider>,
    );

    expect(screen.getAllByRole('button', {name: 'Cancel'})).toHaveLength(2);
    screen.getAllByRole('button', {name: 'Cancel'}).forEach(cancel => expect(cancel).toBeDisabled());
  });

  it.each(['uploaded', 'failed'] as const)('does not show cancel for %s status', kind => {
    const {queryByRole} = renderPopup(kind);

    expect(queryByRole('button', {name: 'Cancel'})).not.toBeInTheDocument();
  });
});
