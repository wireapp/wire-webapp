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

import {act, render} from '@testing-library/react';
import {ThemeProvider} from '@wireapp/react-ui-kit';
import {Maybe} from 'true-myth';

import type {UploadState} from 'Repositories/cells/upload';
import {
  createRootContextValueForTest,
  createRootProviderWrapperForTest,
} from 'src/script/page/testSupport/rootContextTestSupport';
import {translateForTest} from 'Util/test/translateForTest';

import type {SharedDriveUploadController} from '../conversationCells/sharedDriveUploadController';
import type {DismissedUpload} from '../conversationCells/sharedDriveUploadStatus';

import {ConversationTabs} from './conversationTabs';
import {SharedDriveUploadStatusProvider} from '../conversationCells/sharedDriveUploadStatusContext';

const conversationQualifiedId = {id: 'conversation', domain: 'example.com'};
const conversationQualifiedIdString = 'conversation@example.com';
const uploadSource = {blob: new Blob(['data']), name: 'report.pdf', contentType: 'application/pdf', size: 4};
const uploadingState: UploadState = {
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
};

const createController = (state: UploadState | null = null) => {
  let currentState = state;
  let notify: () => void = () => undefined;
  const controller: TestController = {
    snapshots: jest.fn(scope => (scope === conversationQualifiedIdString && currentState ? [currentState] : [])),
    subscribe: jest.fn(listener => {
      notify = listener;
      return jest.fn();
    }),
    upload: jest.fn(),
    cancel: jest.fn(),
    retryUpload: jest.fn(),
    retryPublish: jest.fn(),
    discard: jest.fn(),
    retryDiscard: jest.fn(),
  };

  return {
    controller,
    setState: (nextState: UploadState | null) => {
      currentState = nextState;
      notify();
    },
  };
};

const renderTabs = (
  controller: SharedDriveUploadController,
  isUploadStatusIndicatorEnabled = true,
  dismissedUpload: Maybe<DismissedUpload> = Maybe.nothing<DismissedUpload>(),
) =>
  render(
    <ThemeProvider>
      <SharedDriveUploadStatusProvider initialDismissedUpload={dismissedUpload}>
        <ConversationTabs
          activeTabIndex={0}
          onIndexChange={jest.fn()}
          conversationQualifiedId={conversationQualifiedId}
          sharedDriveUploadController={controller}
          isUploadStatusIndicatorEnabled={isUploadStatusIndicatorEnabled}
        />
      </SharedDriveUploadStatusProvider>
    </ThemeProvider>,
    {wrapper: createRootProviderWrapperForTest(createRootContextValueForTest({translate: translateForTest}))},
  );

describe('ConversationTabs', () => {
  it('does not render a shared drive upload icon when there is no file upload', () => {
    const {controller} = createController();
    const view = renderTabs(controller);

    expect(view.queryByTestId('shared-drive-tab-upload-uploading')).not.toBeInTheDocument();
    expect(view.queryByTestId('shared-drive-tab-upload-completed')).not.toBeInTheDocument();
    expect(view.queryByRole('status')).not.toBeInTheDocument();
  });

  it('renders a moving shared drive upload indicator while a file is uploading', () => {
    const {controller} = createController(uploadingState);
    const view = renderTabs(controller);

    expect(view.getByTestId('shared-drive-tab-upload-uploading')).toHaveClass(
      'conversation-tabs__upload-status-icon--uploading',
    );
    expect(view.getByRole('status')).toHaveTextContent('cells.uploadStatus.uploading');
    expect(view.queryByTestId('shared-drive-tab-upload-completed')).not.toBeInTheDocument();
  });

  it('updates the shared drive tab icon as the upload status changes', () => {
    const {controller, setState} = createController(uploadingState);
    const view = renderTabs(controller);

    expect(view.getByTestId('shared-drive-tab-upload-uploading')).toBeInTheDocument();

    act(() => setState(uploadedState));

    expect(view.queryByTestId('shared-drive-tab-upload-uploading')).not.toBeInTheDocument();
    expect(view.getByTestId('shared-drive-tab-upload-completed')).toBeInTheDocument();
    expect(view.getByRole('status')).toHaveTextContent('cells.uploadStatus.uploaded');
  });

  it('renders the completion icon for failed uploads', () => {
    const {controller} = createController(failedState);
    const view = renderTabs(controller);

    expect(view.getByTestId('shared-drive-tab-upload-completed')).toBeInTheDocument();
    expect(view.getByRole('status')).toHaveTextContent('cells.uploadStatus.failed');
    expect(view.queryByTestId('shared-drive-tab-upload-uploading')).not.toBeInTheDocument();
  });

  it('does not render a dismissed shared drive upload indicator', () => {
    const {controller} = createController(uploadedState);
    const view = renderTabs(
      controller,
      true,
      Maybe.just({conversationQualifiedId: conversationQualifiedIdString, uploadId: 'upload-1'}),
    );

    expect(view.queryByTestId('shared-drive-tab-upload-completed')).not.toBeInTheDocument();
    expect(view.queryByRole('status')).not.toBeInTheDocument();
  });

  it('does not render a shared drive upload icon when the indicator is disabled', () => {
    const {controller} = createController(uploadingState);
    const view = renderTabs(controller, false);

    expect(view.queryByTestId('shared-drive-tab-upload-uploading')).not.toBeInTheDocument();
    expect(view.queryByTestId('shared-drive-tab-upload-completed')).not.toBeInTheDocument();
    expect(view.queryByRole('status')).not.toBeInTheDocument();
  });
});
