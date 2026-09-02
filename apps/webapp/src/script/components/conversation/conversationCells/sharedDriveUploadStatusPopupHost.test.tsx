/*
 * Wire
 * Copyright (C) 2026 Wire Swiss GmbH
 */

import {act, render} from '@testing-library/react';
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
type TestController = SharedDriveUploadController & {
  snapshots: jest.MockedFunction<SharedDriveUploadController['snapshots']>;
  subscribe: jest.MockedFunction<SharedDriveUploadController['subscribe']>;
};

const createController = (state: UploadState = uploadState): TestController => ({
  snapshots: jest.fn(scope => (scope === conversationQualifiedId ? [state] : [])),
  subscribe: jest.fn((_listener: () => void) => jest.fn()),
  upload: jest.fn(),
  cancel: jest.fn(),
  retryUpload: jest.fn(),
  retryPublish: jest.fn(),
  discard: jest.fn(),
  retryDiscard: jest.fn(),
});

const renderHost = (controller: TestController, scope: string, isEnabled = true) =>
  render(
    <SharedDriveUploadStatusPopupHost controller={controller} conversationQualifiedId={scope} isEnabled={isEnabled} />,
    {wrapper: createRootProviderWrapperForTest(createRootContextValueForTest({translate: translateForTest}))},
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
