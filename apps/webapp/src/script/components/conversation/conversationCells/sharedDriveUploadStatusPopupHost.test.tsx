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

import {act, render, screen, waitFor} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type {UploadState} from 'Repositories/cells/upload';
import type {SharedDriveUploadController} from './sharedDriveUploadController';
import {SharedDriveUploadStatusPopupHost} from './sharedDriveUploadStatusPopupHost';
import {
  createRootContextValueForTest,
  createRootProviderWrapperForTest,
} from 'src/script/page/testSupport/rootContextTestSupport';
import {translateForTest} from 'Util/test/translateForTest';

const conversationQualifiedId = 'conversation@example.com';
const otherConversationQualifiedId = 'other@example.com';

const uploadSource = {blob: new Blob(['data']), name: 'report.pdf', contentType: 'application/pdf', size: 4};
const uploadState: UploadState = {
  kind: 'uploading',
  identity: {uploadId: 'upload-1'},
  source: uploadSource,
  progress: 0,
};
const uploadedState: UploadState = {
  kind: 'published',
  identity: {uploadId: 'upload-1', resourceUuid: 'resource-1', versionId: 'version-1'},
  source: uploadSource,
};
const failedState: UploadState = {
  kind: 'uploadFailed',
  identity: {uploadId: 'upload-1'},
  source: uploadSource,
  error: {kind: 'uploadFailed', cause: new Error('upload failed')},
};
type TestController = SharedDriveUploadController & {
  snapshots: jest.MockedFunction<SharedDriveUploadController['snapshots']>;
  subscribe: jest.MockedFunction<SharedDriveUploadController['subscribe']>;
  cancel: jest.MockedFunction<SharedDriveUploadController['cancel']>;
};

const createController = (state: UploadState = uploadState): TestController => ({
  snapshots: jest.fn(scope => (scope === conversationQualifiedId ? [state] : [])),
  subscribe: jest.fn((_listener: () => void) => jest.fn()),
  upload: jest.fn(),
  cancel: jest.fn(async (_uploadId: string): Promise<void> => undefined),
  retryUpload: jest.fn(),
  retryPublish: jest.fn(),
  discard: jest.fn(),
  retryDiscard: jest.fn(),
});

const renderHost = (
  controller: TestController,
  scope: string,
  isEnabled = true,
  isFileTabActive = true,
  translate = translateForTest,
) =>
  render(
    <SharedDriveUploadStatusPopupHost
      controller={controller}
      conversationQualifiedId={scope}
      isEnabled={isEnabled}
      isFileTabActive={isFileTabActive}
    />,
    {wrapper: createRootProviderWrapperForTest(createRootContextValueForTest({translate}))},
  );

describe('SharedDriveUploadStatusPopupHost', () => {
  it('does not render when direct upload is disabled', () => {
    renderHost(createController(), conversationQualifiedId, false);

    expect(document.querySelector('[data-uie-name="shared-drive-upload-status-popup"]')).not.toBeInTheDocument();
  });

  it('opens when the upload controller reports a newly registered file', () => {
    const controller = createController();
    let state: UploadState | null = null;
    let notify: () => void = jest.fn();
    controller.snapshots.mockImplementation(scope => (scope === conversationQualifiedId && state ? [state] : []));
    controller.subscribe.mockImplementation(listener => {
      notify = listener;
      return jest.fn();
    });

    renderHost(controller, conversationQualifiedId);
    expect(document.querySelector('[data-uie-name="shared-drive-upload-status-popup"]')).not.toBeInTheDocument();

    state = uploadState;
    act(() => notify());

    expect(document.querySelector('[data-uie-name="shared-drive-upload-status-popup"]')).toBeInTheDocument();
  });

  it.each([
    ['uploading', uploadState],
    ['uploaded', uploadedState],
    ['failed', failedState],
  ])('hides a %s upload on the Messages tab and shows it again on the Files tab', (_kind, state) => {
    const controller = createController(state);
    const view = renderHost(controller, conversationQualifiedId);

    expect(view.getByRole('status')).toBeInTheDocument();

    view.rerender(
      <SharedDriveUploadStatusPopupHost
        controller={controller}
        conversationQualifiedId={conversationQualifiedId}
        isEnabled
        isFileTabActive={false}
      />,
    );

    expect(view.queryByRole('status')).not.toBeInTheDocument();

    view.rerender(
      <SharedDriveUploadStatusPopupHost
        controller={controller}
        conversationQualifiedId={conversationQualifiedId}
        isEnabled
        isFileTabActive
      />,
    );

    expect(view.getByRole('status')).toBeInTheDocument();
    expect(controller.snapshots).toHaveBeenCalledWith(conversationQualifiedId);
  });

  it('cancels the displayed upload and removes its status', async () => {
    const user = userEvent.setup();
    const controller = createController();
    let state: UploadState = uploadState;
    let notify: () => void = jest.fn();
    controller.snapshots.mockImplementation(scope => (scope === conversationQualifiedId ? [state] : []));
    controller.subscribe.mockImplementation(listener => {
      notify = listener;
      return jest.fn();
    });
    controller.cancel.mockImplementation(async uploadId => {
      expect(uploadId).toBe('upload-1');
      state = {...uploadState, kind: 'cancelled'};
      act(() => notify());
    });

    const view = renderHost(controller, conversationQualifiedId);
    await user.click(view.getByRole('button', {name: 'cells.uploadStatus.expand'}));
    await user.click(view.getByRole('button', {name: 'conversationAssetUploadCancel'}));

    expect(controller.cancel).toHaveBeenCalledTimes(1);
    await waitFor(() => expect(view.queryByRole('status')).not.toBeInTheDocument());
  });

  it('re-enables cancellation when the command completes without changing the upload state', async () => {
    const user = userEvent.setup();
    const controller = createController();

    const view = renderHost(controller, conversationQualifiedId);
    await user.click(view.getByRole('button', {name: 'cells.uploadStatus.expand'}));
    const cancel = view.getByRole('button', {name: 'conversationAssetUploadCancel'});
    await user.click(cancel);

    expect(controller.cancel).toHaveBeenCalledTimes(1);
    await waitFor(() => expect(cancel).toBeEnabled());
    expect(view.getByRole('status')).toBeInTheDocument();
  });

  it('blocks a second cancellation while the first command is pending', async () => {
    const user = userEvent.setup();
    const controller = createController();
    let resolveCancellation: () => void = jest.fn();
    const cancellation = new Promise<void>(resolve => {
      resolveCancellation = resolve;
    });
    controller.cancel.mockReturnValue(cancellation);

    const view = renderHost(controller, conversationQualifiedId);
    await user.click(view.getByRole('button', {name: 'cells.uploadStatus.expand'}));
    const cancel = view.getByRole('button', {name: 'conversationAssetUploadCancel'});
    await user.click(cancel);
    await user.click(cancel);

    expect(controller.cancel).toHaveBeenCalledTimes(1);
    expect(cancel).toBeDisabled();

    await act(async () => resolveCancellation());
    await waitFor(() => expect(cancel).toBeEnabled());
  });

  it('formats the source size in the expanded status copy', async () => {
    const user = userEvent.setup();
    const controller = createController();
    const translate = (key: string, substitutions?: Record<string, string | number>) =>
      substitutions?.size ? `${key} ${substitutions.size}` : key;

    const view = renderHost(controller, conversationQualifiedId, true, true, translate);
    await user.click(view.getByRole('button', {name: 'cells.uploadStatus.expand'}));

    expect(view.getByText('cells.uploadStatus.uploadingSize 4 B')).toBeInTheDocument();
  });

  it('keeps the collapsed state when the upload lifecycle changes', () => {
    const controller = createController();
    let state: UploadState = uploadState;
    let notify: () => void = jest.fn();
    controller.snapshots.mockImplementation(scope => (scope === conversationQualifiedId ? [state] : []));
    controller.subscribe.mockImplementation(listener => {
      notify = listener;
      return jest.fn();
    });

    renderHost(controller, conversationQualifiedId);
    expect(screen.getByRole('button', {name: 'cells.uploadStatus.expand'})).toHaveAttribute('aria-expanded', 'false');

    state = uploadedState;
    act(() => notify());

    expect(screen.getByText('cells.uploadStatus.uploaded')).toBeInTheDocument();
    expect(screen.getByRole('button', {name: 'cells.uploadStatus.expand'})).toHaveAttribute('aria-expanded', 'false');
    expect(screen.getByTestId('shared-drive-upload-status-row')).not.toBeVisible();
  });

  it('preserves the expanded state while switching tabs', async () => {
    const user = userEvent.setup();
    const controller = createController();
    const view = renderHost(controller, conversationQualifiedId);

    await user.click(view.getByRole('button', {name: 'cells.uploadStatus.expand'}));
    expect(view.getByTestId('shared-drive-upload-status-row')).toBeVisible();

    view.rerender(
      <SharedDriveUploadStatusPopupHost
        controller={controller}
        conversationQualifiedId={conversationQualifiedId}
        isEnabled
        isFileTabActive={false}
      />,
    );
    expect(view.queryByRole('status')).not.toBeInTheDocument();

    view.rerender(
      <SharedDriveUploadStatusPopupHost
        controller={controller}
        conversationQualifiedId={conversationQualifiedId}
        isEnabled
        isFileTabActive
      />,
    );

    expect(view.getByRole('button', {name: 'cells.uploadStatus.collapse'})).toHaveAttribute('aria-expanded', 'true');
    expect(view.getByTestId('shared-drive-upload-status-row')).toBeVisible();
  });

  it('does not show an upload from another conversation', () => {
    const controller = createController();

    renderHost(controller, otherConversationQualifiedId);

    expect(document.querySelector('[data-uie-name="shared-drive-upload-status-popup"]')).not.toBeInTheDocument();
    expect(controller.snapshots).toHaveBeenCalledWith(otherConversationQualifiedId);
  });

  it('does not render the previous conversation upload while switching conversations', () => {
    const controller = createController();
    const view = renderHost(controller, conversationQualifiedId);

    expect(view.getByRole('status')).toBeInTheDocument();

    view.rerender(
      <SharedDriveUploadStatusPopupHost
        controller={controller}
        conversationQualifiedId={otherConversationQualifiedId}
        isEnabled
        isFileTabActive
      />,
    );

    expect(view.queryByText('Uploading report.pdf')).not.toBeInTheDocument();
    expect(view.queryByRole('status')).not.toBeInTheDocument();
  });

  it('shows the same upload after the host is remounted for the conversation', () => {
    const controller = createController();

    const firstRender = renderHost(controller, conversationQualifiedId);
    expect(document.querySelector('[data-uie-name="shared-drive-upload-status-popup"]')).toBeInTheDocument();

    firstRender.unmount();
    renderHost(controller, conversationQualifiedId);

    expect(document.querySelector('[data-uie-name="shared-drive-upload-status-popup"]')).toBeInTheDocument();
  });
});
