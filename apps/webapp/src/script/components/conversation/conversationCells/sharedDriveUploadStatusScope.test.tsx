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

import type {ReactElement} from 'react';

import {render, screen} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {Maybe, maybe} from 'true-myth';

import {SharedDriveUploadStatusScope, useSharedDriveUploadStatus} from './sharedDriveUploadStatusContext';

const StatusProbe = ({conversationId}: {readonly conversationId: string}): ReactElement => {
  const {createMoveStatusId, getMoveStatus, updateMoveStatus} = useSharedDriveUploadStatus();
  const status = getMoveStatus(conversationId);
  return (
    <div>
      <span>{maybe.isJust(status) ? status.value.kind : 'empty'}</span>
      <button
        type="button"
        onClick={() => {
          updateMoveStatus({
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
    </div>
  );
};

const StatusTree = ({
  enabled,
  conversationId,
}: {
  readonly enabled: boolean;
  readonly conversationId: string;
}): ReactElement => {
  return (
    <SharedDriveUploadStatusScope enabled={enabled} scopeKey={Maybe.nothing()}>
      <SharedDriveUploadStatusScope enabled={!enabled} scopeKey={Maybe.just(conversationId)}>
        <StatusProbe conversationId={conversationId} />
      </SharedDriveUploadStatusScope>
    </SharedDriveUploadStatusScope>
  );
};

describe('SharedDriveUploadStatusScope', () => {
  it.each([
    {enabled: false, expectedOnReturn: 'empty'},
    {enabled: true, expectedOnReturn: 'processing'},
  ])(
    'keeps status across conversations only when the feature is enabled: $enabled',
    async ({enabled, expectedOnReturn}) => {
      const user = userEvent.setup();
      const view = render(<StatusTree enabled={enabled} conversationId="conversation-1" />);

      await user.click(screen.getByRole('button', {name: 'Start'}));
      expect(screen.getByText('processing')).toBeInTheDocument();
      view.rerender(<StatusTree enabled={enabled} conversationId="conversation-2" />);
      expect(screen.getByText('empty')).toBeInTheDocument();
      view.rerender(<StatusTree enabled={enabled} conversationId="conversation-1" />);
      expect(screen.getByText(expectedOnReturn)).toBeInTheDocument();
    },
  );
});
