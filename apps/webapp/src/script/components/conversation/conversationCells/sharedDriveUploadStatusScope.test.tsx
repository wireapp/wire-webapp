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

import type {ReactElement, ReactNode} from 'react';

import {act, render, renderHook, screen} from '@testing-library/react';
import {createDeterministicClock} from '@enormora/clock/deterministic-clock';
import userEvent from '@testing-library/user-event';
import {Maybe, maybe} from 'true-myth';

import {createBulkJobPollingPolicy} from './common/cellsBackgroundActionPolling/createBulkJobPollingPolicy';
import {
  SharedDriveUploadStatusProvider,
  SharedDriveUploadStatusScope,
  useSharedDriveUploadStatus,
} from './sharedDriveUploadStatusContext';

const StatusProbe = ({conversationId}: {readonly conversationId: string}): ReactElement => {
  const {createMoveStatusId, dismissUpload, dismissedUpload, getMoveStatus, startMoveStatus} =
    useSharedDriveUploadStatus();
  const status = getMoveStatus(conversationId);
  return (
    <div>
      <span data-uie-name="bulk-status">{maybe.isJust(status) ? status.value.kind : 'empty'}</span>
      <span data-uie-name="dismissed-upload">
        {maybe.isJust(dismissedUpload) ? dismissedUpload.value.uploadId : 'none'}
      </span>
      <button
        type="button"
        onClick={() => {
          startMoveStatus({
            id: createMoveStatusId(),
            conversationQualifiedId: conversationId,
            action: 'move',
            kind: 'processing',
            items: [],
            destinationPath: '',
          });
        }}
      >
        Start
      </button>
      <button
        type="button"
        onClick={() => {
          dismissUpload({conversationQualifiedId: conversationId, uploadId: 'upload-1'});
        }}
      >
        Dismiss upload
      </button>
    </div>
  );
};

const StatusTree = ({
  enabled,
  conversationId,
  viewId,
}: {
  readonly enabled: boolean;
  readonly conversationId: string;
  readonly viewId: string;
}): ReactElement => {
  return (
    <SharedDriveUploadStatusScope enabled={enabled} scopeKey={Maybe.nothing()}>
      <SharedDriveUploadStatusScope enabled={!enabled} scopeKey={Maybe.just(`${conversationId}:${viewId}`)}>
        <StatusProbe conversationId={conversationId} />
      </SharedDriveUploadStatusScope>
    </SharedDriveUploadStatusScope>
  );
};

describe('SharedDriveUploadStatusScope', () => {
  it('rejects a pending move result after its Files scope is gone', () => {
    let scope = 'folder-a';
    const wrapper = ({children}: {children: ReactNode}): ReactElement => {
      return (
        <SharedDriveUploadStatusProvider resetOnScopeChange={Maybe.just(scope)}>
          {children}
        </SharedDriveUploadStatusProvider>
      );
    };
    const {result, rerender} = renderHook(useSharedDriveUploadStatus, {wrapper});
    const status = {
      id: 'move-a',
      conversationQualifiedId: 'conversation-1',
      action: 'move' as const,
      kind: 'processing' as const,
      items: [],
      destinationPath: 'Reports',
    };

    act(() => {
      return result.current.startMoveStatus(status);
    });
    scope = 'folder-b';
    rerender();
    act(() => {
      return result.current.updateMoveStatus({...status, kind: 'completed'});
    });
    const getBackgroundMoveInfo = jest.fn();
    act(() => {
      return result.current.observeBackgroundAction({
        actionName: 'move',
        status,
        jobUuids: ['job-1'],
        cellsRepository: {getBackgroundMoveInfo},
        clock: createDeterministicClock({initialUnixEpochMicroseconds: 0n}),
        pollingPolicy: createBulkJobPollingPolicy(() => {
          return 0.5;
        }),
        onOutcome: jest.fn(),
      });
    });

    expect(maybe.isNothing(result.current.getMoveStatus('conversation-1'))).toBe(true);
    expect(result.current.isMoveStatusCurrent('conversation-1', 'move-a')).toBe(false);
    expect(getBackgroundMoveInfo).not.toHaveBeenCalled();
  });
  it.each([
    {enabled: false, expectedOnReturn: 'empty'},
    {enabled: true, expectedOnReturn: 'processing'},
  ])(
    'keeps status across conversations only when the feature is enabled: $enabled',
    async ({enabled, expectedOnReturn}) => {
      const user = userEvent.setup();
      const view = render(<StatusTree enabled={enabled} conversationId="conversation-1" viewId="folder-a" />);

      await user.click(screen.getByRole('button', {name: 'Start'}));
      expect(screen.getByTestId('bulk-status')).toHaveTextContent('processing');
      view.rerender(<StatusTree enabled={enabled} conversationId="conversation-2" viewId="folder-a" />);
      expect(screen.getByTestId('bulk-status')).toHaveTextContent('empty');
      view.rerender(<StatusTree enabled={enabled} conversationId="conversation-1" viewId="folder-a" />);
      expect(screen.getByTestId('bulk-status')).toHaveTextContent(expectedOnReturn);
    },
  );

  it.each([
    {enabled: false, expectedAfterNavigation: 'empty'},
    {enabled: true, expectedAfterNavigation: 'processing'},
  ])('keeps bulk status across Files views only when enabled: $enabled', async ({enabled, expectedAfterNavigation}) => {
    const user = userEvent.setup();
    const view = render(<StatusTree enabled={enabled} conversationId="conversation-1" viewId="folder-a" />);

    await user.click(screen.getByRole('button', {name: 'Start'}));
    await user.click(screen.getByRole('button', {name: 'Dismiss upload'}));
    view.rerender(<StatusTree enabled={enabled} conversationId="conversation-1" viewId="folder-b" />);

    expect(screen.getByTestId('bulk-status')).toHaveTextContent(expectedAfterNavigation);
    expect(screen.getByTestId('dismissed-upload')).toHaveTextContent('upload-1');
  });
});
