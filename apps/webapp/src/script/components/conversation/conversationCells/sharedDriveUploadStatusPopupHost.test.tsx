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

import {act, render, screen, waitFor, within} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {noop} from 'noop-esm';
import type {UploadState} from 'Repositories/cells/upload';
import type {Translate} from 'Util/localizerUtil';
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
const queuedState: UploadState = {
  kind: 'queued',
  identity: {uploadId: 'upload-1'},
  source: uploadSource,
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
const publishFailedState: UploadState = {
  kind: 'publishFailed',
  identity: {uploadId: 'upload-1', resourceUuid: 'resource-1', versionId: 'version-1'},
  source: uploadSource,
  error: {kind: 'publishFailed', cause: new Error('publish failed')},
};
type TestController = SharedDriveUploadController & {
  snapshots: jest.MockedFunction<SharedDriveUploadController['snapshots']>;
  subscribe: jest.MockedFunction<SharedDriveUploadController['subscribe']>;
  cancel: jest.MockedFunction<SharedDriveUploadController['cancel']>;
  retryUpload: jest.MockedFunction<SharedDriveUploadController['retryUpload']>;
  retryPublish: jest.MockedFunction<SharedDriveUploadController['retryPublish']>;
  dismiss: jest.MockedFunction<NonNullable<SharedDriveUploadController['dismiss']>>;
  isDismissed: jest.MockedFunction<NonNullable<SharedDriveUploadController['isDismissed']>>;
};

const createController = (state: UploadState | readonly UploadState[] = uploadState): TestController => ({
  snapshots: jest.fn(scope => (scope === conversationQualifiedId ? (Array.isArray(state) ? state : [state]) : [])),
  subscribe: jest.fn((_listener: () => void) => jest.fn()),
  upload: jest.fn(),
  updateRefresh: jest.fn(),
  cancel: jest.fn(async (_uploadId: string): Promise<void> => undefined),
  retryUpload: jest.fn(),
  retryPublish: jest.fn(),
  discard: jest.fn(),
  retryDiscard: jest.fn(),
  dismiss: jest.fn(),
  isDismissed: jest.fn((_conversationQualifiedId: string, _uploadId: string) => false),
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

  it('renders seven ordered files, aggregate header copy, and failed-row dismiss action', async () => {
    const user = userEvent.setup();
    const statuses: UploadState[] = [
      uploadState,
      {...uploadState, identity: {uploadId: 'upload-2'}, source: {...uploadSource, name: 'second.jpg'}},
      {...failedState, identity: {uploadId: 'upload-3'}},
      ...Array.from({length: 4}, (_, index) => ({
        ...uploadedState,
        identity: {
          uploadId: `upload-${index + 4}`,
          resourceUuid: `resource-${index + 4}`,
          versionId: `version-${index + 4}`,
        },
        source: {...uploadSource, name: `uploaded-${index + 4}.txt`},
      })),
    ];
    const controller = createController(statuses);
    const translateAggregate: Translate = (key, substitutions) => {
      if (key === 'cells.uploadStatus.uploadingItems') {
        return `Uploading ${substitutions?.count} items`;
      }
      if (key === 'cells.uploadStatus.cancelAll') {
        return 'Cancel all';
      }
      return translateForTest(key);
    };
    const view = renderHost(controller, conversationQualifiedId, true, true, translateAggregate);

    await user.click(view.getByRole('button', {name: 'cells.uploadStatus.expand'}));
    const rows = view.getAllByTestId('shared-drive-upload-status-row');
    expect(rows).toHaveLength(7);
    expect(view.getByText('Uploading 7 items')).toBeInTheDocument();
    expect(
      within(view.getByTestId('shared-drive-upload-status-header')).getByRole('button', {name: 'Cancel all'}),
    ).toBeInTheDocument();
    expect(Array.from(rows).map(row => row.querySelector('strong')?.textContent)).toEqual([
      'report.pdf',
      'second.jpg',
      'report.pdf',
      'uploaded-4.txt',
      'uploaded-5.txt',
      'uploaded-6.txt',
      'uploaded-7.txt',
    ]);
    expect(within(rows[2]).getByRole('button', {name: 'cells.uploadStatus.closeAriaLabel'})).toBeInTheDocument();
  });

  it('collapses nested folder files and retries only failed children', async () => {
    const user = userEvent.setup();
    const controller = createController([
      {
        ...uploadedState,
        identity: {uploadId: 'upload-folder-1', resourceUuid: 'resource-1', versionId: 'version-1'},
        source: {...uploadSource, name: 'cover.jpg', relativePath: 'Marketing/cover.jpg'},
      },
      {
        ...failedState,
        identity: {uploadId: 'upload-folder-2'},
        source: {...uploadSource, name: 'logo.svg', relativePath: 'Marketing/Assets/logo.svg'},
      },
    ]);
    controller.retryUpload.mockResolvedValue(undefined);
    const translateFolder: Translate = (key, substitutions) => {
      if (key === 'cells.uploadStatus.failedFiles') {
        return `Couldn’t upload ${substitutions?.failed} of ${substitutions?.total} files`;
      }
      if (key === 'cells.uploadStatus.failedItems') {
        return 'Failed to upload items';
      }
      return translateForTest(key);
    };

    const view = renderHost(controller, conversationQualifiedId, true, true, translateFolder);
    await user.click(view.getByRole('button', {name: 'cells.uploadStatus.expand'}));

    const rows = view.getAllByTestId('shared-drive-upload-status-row');
    expect(rows).toHaveLength(1);
    expect(within(rows[0]).getByText('Marketing')).toBeInTheDocument();
    expect(within(rows[0]).getByText('Couldn’t upload 1 of 2 files')).toBeInTheDocument();

    await user.click(within(rows[0]).getByRole('button', {name: 'conversationFilePreviewErrorRetry'}));
    expect(controller.retryUpload).toHaveBeenCalledWith('upload-folder-2');
    expect(controller.retryUpload).not.toHaveBeenCalledWith('upload-folder-1');
  });

  it('keeps a folder uploading while a child fails and another child is active', async () => {
    const user = userEvent.setup();
    const controller = createController([
      {
        ...uploadedState,
        identity: {uploadId: 'upload-folder-uploaded', resourceUuid: 'resource-1', versionId: 'version-1'},
        source: {...uploadSource, relativePath: 'Marketing/cover.jpg'},
      },
      {
        ...failedState,
        identity: {uploadId: 'upload-folder-failed'},
        source: {...uploadSource, relativePath: 'Marketing/logo.svg'},
      },
      {
        ...uploadState,
        identity: {uploadId: 'upload-folder-active'},
        source: {...uploadSource, relativePath: 'Marketing/hero.jpg'},
      },
    ]);
    const translateFolder: Translate = (key, substitutions) => {
      if (key === 'cells.uploadStatus.uploadingFiles') {
        return `Uploading ${substitutions?.uploaded} of ${substitutions?.total} files…`;
      }
      return translateForTest(key);
    };

    const view = renderHost(controller, conversationQualifiedId, true, true, translateFolder);
    await user.click(view.getByRole('button', {name: 'cells.uploadStatus.expand'}));

    const row = view.getByTestId('shared-drive-upload-status-row');
    expect(within(row).getByText('Uploading 1 of 3 files…')).toBeInTheDocument();
    expect(within(row).getByRole('button', {name: 'conversationAssetUploadCancel'})).toBeInTheDocument();
    expect(within(row).queryByRole('button', {name: 'fileCardDefaultCloseButtonLabel'})).not.toBeInTheDocument();
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

  it('keeps other status rows visible while row cancellation is pending', async () => {
    const user = userEvent.setup();
    const controller = createController();
    controller.cancel.mockReturnValue(new Promise<void>(noop));

    const view = renderHost(controller, conversationQualifiedId);
    const cancel = within(view.getByTestId('shared-drive-upload-status-header')).getByRole('button', {
      name: 'conversationAssetUploadCancel',
    });
    await user.click(cancel);

    expect(controller.cancel).toHaveBeenCalledWith('upload-1');
    expect(view.queryByRole('status')).toBeInTheDocument();
    expect(view.queryByTestId('shared-drive-upload-status-popup')).toBeInTheDocument();
  });

  it('keeps each row cancel disabled until its own batch cancellation settles', async () => {
    const user = userEvent.setup();
    const secondUploadState = {...uploadState, identity: {...uploadState.identity, uploadId: 'upload-2'}};
    let rejectFirst: () => void = () => undefined;
    let resolveSecond: () => void = () => undefined;
    const controller = createController([uploadState, secondUploadState]);
    controller.cancel.mockImplementation(
      uploadId =>
        new Promise<void>((resolve, reject) => {
          if (uploadId === 'upload-1') {
            rejectFirst = () => reject(new Error('first cancellation failed'));
          } else {
            resolveSecond = resolve;
          }
        }),
    );
    const view = renderHost(controller, conversationQualifiedId);

    await user.click(view.getByRole('button', {name: 'cells.uploadStatus.expand'}));
    await user.click(
      within(view.getByTestId('shared-drive-upload-status-header')).getByRole('button', {
        name: 'cells.uploadStatus.cancelAll',
      }),
    );
    const rowCancels = view
      .getAllByTestId('shared-drive-upload-status-row')
      .map(row => within(row).getByRole('button', {name: 'conversationAssetUploadCancel'}));
    expect(rowCancels).toHaveLength(2);
    expect(rowCancels[0]).toBeDisabled();
    expect(rowCancels[1]).toBeDisabled();

    rejectFirst();
    await waitFor(() => expect(rowCancels[0]).not.toBeDisabled());
    expect(rowCancels[1]).toBeDisabled();

    resolveSecond();
    await waitFor(() => expect(rowCancels[1]).not.toBeDisabled());
  });

  it('keeps the popup visible when row cancellation fails', async () => {
    const user = userEvent.setup();
    const controller = createController();
    controller.cancel.mockRejectedValue(new Error('cancellation failed'));

    const view = renderHost(controller, conversationQualifiedId);
    const cancel = within(view.getByTestId('shared-drive-upload-status-header')).getByRole('button', {
      name: 'conversationAssetUploadCancel',
    });
    await user.click(cancel);

    expect(controller.cancel).toHaveBeenCalledWith('upload-1');
    await waitFor(() => expect(view.queryByRole('status')).toBeInTheDocument());
  });

  it('dismisses a successful upload from the header close action', async () => {
    const user = userEvent.setup();
    const controller = createController(uploadedState);
    const view = renderHost(controller, conversationQualifiedId);

    const close = within(view.getByTestId('shared-drive-upload-status-header')).getByRole('button', {
      name: 'cells.uploadStatus.closeAriaLabel',
    });
    expect(close).toHaveTextContent('fileCardDefaultCloseButtonLabel');

    await user.click(close);

    expect(view.queryByRole('status')).not.toBeInTheDocument();
    expect(controller.dismiss).toHaveBeenCalledWith(conversationQualifiedId, 'upload-1');
  });

  it('keeps a dismissed successful upload hidden after the popup is remounted', async () => {
    const user = userEvent.setup();
    const controller = createController(uploadedState);
    const firstRender = renderHost(controller, conversationQualifiedId);
    const close = within(firstRender.getByTestId('shared-drive-upload-status-header')).getByRole('button', {
      name: 'cells.uploadStatus.closeAriaLabel',
    });

    await user.click(close);
    controller.isDismissed.mockReturnValue(true);
    firstRender.unmount();
    renderHost(controller, conversationQualifiedId);

    expect(document.querySelector('[data-uie-name="shared-drive-upload-status-popup"]')).not.toBeInTheDocument();
  });

  it('does not show close for a failed upload because retry is still actionable', () => {
    const controller = createController(failedState);
    const view = renderHost(controller, conversationQualifiedId);

    expect(view.queryByRole('button', {name: 'cells.uploadStatus.closeAriaLabel'})).not.toBeInTheDocument();
  });

  it('does not show close when the latest upload succeeded but another upload is still actionable', () => {
    const controller = createController(uploadedState);
    const secondUploadedState = {
      ...uploadedState,
      identity: {...uploadedState.identity, uploadId: 'upload-2'},
    };
    controller.snapshots.mockImplementation(scope =>
      scope === conversationQualifiedId ? [failedState, secondUploadedState] : [],
    );

    const view = renderHost(controller, conversationQualifiedId);

    expect(view.getByText('cells.uploadStatus.failedItems')).toBeInTheDocument();
    expect(view.queryByRole('button', {name: 'cells.uploadStatus.closeAriaLabel'})).not.toBeInTheDocument();
  });

  it('calls retry for a failed upload and prevents duplicate retries for the same row', async () => {
    const user = userEvent.setup();
    const controller = createController(failedState);
    controller.retryUpload.mockReturnValue(new Promise<void>(noop));
    const view = renderHost(controller, conversationQualifiedId);
    await user.click(view.getByRole('button', {name: 'cells.uploadStatus.expand'}));

    const retry = view.getByRole('button', {name: 'conversationFilePreviewErrorRetry'});
    await user.click(retry);
    await user.click(retry);

    expect(controller.retryUpload).toHaveBeenCalledTimes(1);
    expect(controller.retryUpload).toHaveBeenCalledWith('upload-1');
    expect(retry).toBeDisabled();
  });

  it('tracks retry state independently for failed rows', async () => {
    const user = userEvent.setup();
    const secondFailedState = {
      ...failedState,
      identity: {uploadId: 'upload-2'},
      source: {...failedState.source, name: 'second-report.pdf'},
    };
    const controller = createController([failedState, secondFailedState]);
    const retrySettlements = new Map<string, {resolve: () => void; reject: (reason?: unknown) => void}>();
    controller.retryUpload.mockImplementation(
      uploadId =>
        new Promise<void>((resolve, reject) => {
          retrySettlements.set(uploadId, {resolve, reject});
        }),
    );
    const view = renderHost(controller, conversationQualifiedId);
    await user.click(view.getByRole('button', {name: 'cells.uploadStatus.expand'}));

    const retryButtons = view
      .getAllByTestId('shared-drive-upload-status-row')
      .map(row => within(row).getByRole('button', {name: 'conversationFilePreviewErrorRetry'}));
    await user.click(retryButtons[0]);
    await user.click(retryButtons[1]);

    expect(controller.retryUpload).toHaveBeenNthCalledWith(1, 'upload-1');
    expect(controller.retryUpload).toHaveBeenNthCalledWith(2, 'upload-2');
    expect(retryButtons[0]).toBeDisabled();
    expect(retryButtons[1]).toBeDisabled();

    retrySettlements.get('upload-1')?.resolve();
    await waitFor(() => expect(retryButtons[0]).not.toBeDisabled());
    expect(retryButtons[1]).toBeDisabled();

    retrySettlements.get('upload-2')?.reject(new Error('retry failed'));
    await waitFor(() => expect(retryButtons[1]).not.toBeDisabled());
  });

  it('keeps retry available when a retry fails', async () => {
    const user = userEvent.setup();
    const controller = createController(failedState);
    controller.retryUpload.mockRejectedValue(new Error('retry failed'));
    const view = renderHost(controller, conversationQualifiedId);
    await user.click(view.getByRole('button', {name: 'cells.uploadStatus.expand'}));

    await user.click(view.getByRole('button', {name: 'conversationFilePreviewErrorRetry'}));

    await waitFor(() =>
      expect(view.getByRole('button', {name: 'conversationFilePreviewErrorRetry'})).not.toBeDisabled(),
    );
  });

  it('retries publication when the upload succeeded but promotion failed', async () => {
    const user = userEvent.setup();
    const controller = createController(publishFailedState);
    controller.retryPublish.mockResolvedValue(undefined);
    const view = renderHost(controller, conversationQualifiedId);
    await user.click(view.getByRole('button', {name: 'cells.uploadStatus.expand'}));

    await user.click(view.getByRole('button', {name: 'conversationFilePreviewErrorRetry'}));

    expect(controller.retryPublish).toHaveBeenCalledWith('upload-1');
    expect(controller.retryUpload).not.toHaveBeenCalled();
  });

  it('renders every incremental progress update before completion', () => {
    const controller = createController(uploadState);
    let state: UploadState = uploadState;
    let notify: () => void = jest.fn();
    controller.snapshots.mockImplementation(scope => (scope === conversationQualifiedId ? [state] : []));
    controller.subscribe.mockImplementation(listener => {
      notify = listener;
      return jest.fn();
    });

    renderHost(controller, conversationQualifiedId);
    const progress = screen.getByRole('progressbar', {name: 'report.pdf'});
    const indeterminateClassName = progress.className;
    let determinateClassName: string | undefined;

    for (const [index, nextProgress] of [0.1, 0.45, 0.8].entries()) {
      state = {...uploadState, progress: nextProgress};
      act(() => notify());
      expect(document.querySelectorAll('[data-uie-name="shared-drive-upload-status-popup"]')).toHaveLength(1);
      expect(screen.getAllByTestId('shared-drive-upload-progress')).toHaveLength(1);
      expect(screen.getAllByTestId('shared-drive-upload-uploading')).toHaveLength(1);
      expect(screen.getByRole('progressbar', {name: 'report.pdf'})).toBe(progress);
      expect(progress).toHaveAttribute('aria-valuenow', `${nextProgress * 100}`);
      expect(progress).toHaveStyle({transform: `scaleX(${nextProgress})`});
      if (index === 0) {
        determinateClassName = progress.className;
        expect(progress).not.toHaveClass(indeterminateClassName);
      } else {
        expect(progress.className).toBe(determinateClassName);
      }
    }
  });

  it('shows the uploading status when retry updates the upload lifecycle', async () => {
    const user = userEvent.setup();
    const controller = createController(failedState);
    let state: UploadState = failedState;
    let notify: () => void = jest.fn();
    controller.snapshots.mockImplementation(scope => (scope === conversationQualifiedId ? [state] : []));
    controller.subscribe.mockImplementation(listener => {
      notify = listener;
      return jest.fn();
    });
    controller.retryUpload.mockImplementation(async () => {
      state = uploadState;
      act(() => notify());
    });
    const view = renderHost(controller, conversationQualifiedId);
    await user.click(view.getByRole('button', {name: 'cells.uploadStatus.expand'}));

    await user.click(view.getByRole('button', {name: 'conversationFilePreviewErrorRetry'}));

    expect(view.getByText('cells.uploadStatus.uploading')).toBeInTheDocument();
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

  it('uses queued copy for queued uploads', async () => {
    const user = userEvent.setup();
    const controller = createController(queuedState);
    const translate = (key: string, substitutions?: Record<string, string | number>) => {
      if (substitutions?.name) {
        return `${key} ${substitutions.name}`;
      }
      if (substitutions?.size) {
        return `${key} ${substitutions.size}`;
      }
      return key;
    };

    const view = renderHost(controller, conversationQualifiedId, true, true, translate);

    expect(view.getByText('cells.uploadStatus.queued report.pdf')).toBeInTheDocument();

    await user.click(view.getByRole('button', {name: 'cells.uploadStatus.expand'}));

    expect(view.getByText('cells.uploadStatus.queuedSize 4 B')).toBeInTheDocument();
    expect(view.queryByText('cells.uploadStatus.uploadingSize 4 B')).not.toBeInTheDocument();
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
