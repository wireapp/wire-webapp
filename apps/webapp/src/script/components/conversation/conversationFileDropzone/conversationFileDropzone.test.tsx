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

import {fireEvent, render, screen} from '@testing-library/react';

import {StyledApp, THEME_ID} from '@wireapp/react-ui-kit';

import {
  createRootContextValueForTest,
  createRootProviderWrapperForTest,
} from 'src/script/page/testSupport/rootContextTestSupport';
import {translateForTest} from 'Util/test/translateForTest';

import {ConversationFileDropzone} from './conversationFileDropzone';

const rootProviderWrapper = createRootProviderWrapperForTest(
  createRootContextValueForTest({translate: translateForTest}),
);

const renderConversationFileDropzone = ({
  isCellsEnabled = true,
  isConversationFileDropzoneEnabled = true,
  onDragEnter = jest.fn(),
  onFileDropped = jest.fn(),
}: {
  isCellsEnabled?: boolean;
  isConversationFileDropzoneEnabled?: boolean;
  onDragEnter?: jest.Mock;
  onFileDropped?: jest.Mock;
} = {}) => {
  const result = render(
    <StyledApp themeId={THEME_ID.DEFAULT}>
      <ConversationFileDropzone
        isCellsEnabled={isCellsEnabled}
        isConversationFileDropzoneEnabled={isConversationFileDropzoneEnabled}
        isConversationLoaded
        isDragAccept
        isFileDropAllowed
        onFileDropped={onFileDropped}
        rootProps={{onDragEnter}}
        inputProps={{}}
      >
        <div>Conversation content</div>
      </ConversationFileDropzone>
    </StyledApp>,
    {wrapper: rootProviderWrapper},
  );

  const conversation = result.container.querySelector('#conversation');

  if (!conversation) {
    throw new Error('Conversation was not rendered');
  }

  return {conversation, onDragEnter, onFileDropped};
};

describe('ConversationFileDropzone', () => {
  it('mounts the conversation upload dropzone while Cells conversation view handles file drops', () => {
    const onDragEnter = jest.fn();
    const {conversation} = renderConversationFileDropzone({onDragEnter});

    fireEvent.dragEnter(conversation);

    expect(onDragEnter).toHaveBeenCalledTimes(1);
    expect(screen.getByText('conversationFileUploadOverlayTitle')).toBeInTheDocument();
  });

  it('does not mount the conversation upload dropzone while Shared Drive handles file drops', () => {
    const onDragEnter = jest.fn();
    const {conversation} = renderConversationFileDropzone({
      isConversationFileDropzoneEnabled: false,
      onDragEnter,
    });

    fireEvent.dragEnter(conversation);

    expect(screen.queryByText('conversationFileUploadOverlayTitle')).not.toBeInTheDocument();
    expect(onDragEnter).not.toHaveBeenCalled();
  });

  it('uses the legacy drop file area when Cells is disabled', () => {
    const onDragEnter = jest.fn();
    const {conversation} = renderConversationFileDropzone({
      isCellsEnabled: false,
      onDragEnter,
    });

    fireEvent.dragEnter(conversation);

    expect(screen.queryByText('conversationFileUploadOverlayTitle')).not.toBeInTheDocument();
    expect(onDragEnter).not.toHaveBeenCalled();
  });
});
