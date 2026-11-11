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

import type {ComponentProps} from 'react';

import {act, fireEvent, render} from '@testing-library/react';
import type {useVirtualizer as useVirtualizerFunction, Virtualizer} from '@tanstack/react-virtual';
import {CONVERSATION_PROTOCOL} from '../../../apiClient/team/feature/featureList.types';
import ko from 'knockout';
import {noop} from 'noop-esm';

import {withTheme} from '../../../auth/util/test/testUtil';

import {AssetRepository} from '../../../repositories/assets/assetRepository';
import {ConversationRepository} from '../../../repositories/conversation/ConversationRepository';
import {MessageRepository} from '../../../repositories/conversation/MessageRepository';
import {Conversation} from '../../../repositories/entity/Conversation';
import {ContentMessage} from '../../../repositories/entity/message/contentMessage';
import {User} from '../../../repositories/entity/User';
import {
  createRootContextValueForTest,
  createRootProviderWrapperForTest,
  requireValueForTest,
} from '../../../page/testSupport/rootContextTestSupport';
import {translateForTest} from '../../../util/test/translateForTest';

import {VirtualizedMessagesList} from './virtualizedMessagesList';

type VirtualizerModule = {readonly useVirtualizer: typeof useVirtualizerFunction};

function createMessageListProperties(): ComponentProps<typeof VirtualizedMessagesList> {
  return {
    conversation: new Conversation('conversation', '', CONVERSATION_PROTOCOL.PROTEUS, translateForTest),
    assetRepository: {
      processQueue: ko.observableArray([]),
      uploadProgressQueue: ko.observableArray([]),
    } as unknown as AssetRepository,
    conversationRepository: {} as ConversationRepository,
    messageRepository: {} as MessageRepository,
    selfUser: new User('self', '', translateForTest),
    parentElement: document.createElement('div'),
    cancelPendingReadReceiptsForConversation: noop,
    isConversationLoaded: false,
    isMsgElementsFocusable: false,
    cancelConnectionRequest: noop,
    getVisibleCallback: () => {
      return undefined;
    },
    invitePeople: noop,
    loadUsersByIdsFromDb: jest.fn(),
    messageActions: {deleteMessage: noop, deleteMessageEveryone: noop},
    onClickMessage: noop,
    onLoading: noop,
    resetSession: noop,
    setMsgElementsFocusable: noop,
    showImageDetails: noop,
    showMessageDetails: noop,
    showMessageReactions: noop,
    showParticipants: noop,
    showUserDetails: noop,
    updateConversationLastRead: noop,
  };
}

describe('VirtualizedMessagesList', () => {
  it('clears the manual unread marker when jumping to the latest message', () => {
    const properties = createMessageListProperties();
    const selectedMessage = new ContentMessage('selected-message', translateForTest);
    selectedMessage.timestamp(100);
    selectedMessage.user(new User('sender', '', translateForTest));
    properties.conversation.messages_unordered([selectedMessage]);
    properties.conversation.last_read_timestamp(200);
    properties.conversation.markUnreadFrom(selectedMessage);
    properties.isConversationLoaded = true;
    jest.spyOn(properties.conversation, 'hasLastReceivedMessageLoaded').mockReturnValue(true);
    const renderedList = render(withTheme(<VirtualizedMessagesList {...properties} />), {
      wrapper: createRootProviderWrapperForTest(createRootContextValueForTest({translate: translateForTest})),
    });

    fireEvent.click(renderedList.getByRole('button', {name: 'jumpToLastMessage'}));

    expect(properties.conversation.manualUnreadTimestamp()).toBeUndefined();
    expect(properties.conversation.isAutoReadSuppressed()).toBe(false);
    expect(properties.conversation.last_read_timestamp()).toBe(200);
    renderedList.unmount();
    jest.restoreAllMocks();
  });
  it.each([
    {
      description: 'preserves the opening unread separator when the live read timestamp advances',
      updatesReadBoundary: false,
      expectedItemKeys: ['message-message-10', 'marker-unread-20-20-20', 'message-message-20', 'message-message-30'],
    },
    {
      description: 'regroups unchanged messages when a manual marker is cleared after reading',
      updatesReadBoundary: true,
      expectedItemKeys: ['message-message-10', 'message-message-20', 'message-message-30'],
    },
  ])('$description', options => {
    const {updatesReadBoundary, expectedItemKeys} = options;
    const virtualizerModule = jest.requireActual<VirtualizerModule>('@tanstack/react-virtual');
    const useVirtualizer = jest.spyOn(virtualizerModule, 'useVirtualizer');
    const properties = createMessageListProperties();
    const sender = new User('sender', '', translateForTest);
    properties.conversation.last_read_timestamp(10);
    properties.conversation.messages_unordered(
      [10, 20, 30].map(timestamp => {
        const message = new ContentMessage(`message-${timestamp}`, translateForTest);
        message.timestamp(timestamp);
        message.from = sender.id;
        message.user(sender);

        return message;
      }),
    );
    if (updatesReadBoundary) {
      properties.conversation.markUnreadFrom(requireValueForTest(properties.conversation.messages().at(1)));
    }
    const renderedList = render(<VirtualizedMessagesList {...properties} />, {
      wrapper: createRootProviderWrapperForTest(createRootContextValueForTest({translate: translateForTest})),
    });

    try {
      const originalMessages = properties.conversation.messages();
      const [initialVirtualizerOptions] = requireValueForTest(useVirtualizer.mock.calls.at(-1));
      const initialItemKey = requireValueForTest(initialVirtualizerOptions.getItemKey);
      expect(initialVirtualizerOptions.count).toBe(4);
      expect(initialItemKey(1)).toBe('marker-unread-20-20-20');

      act(() => {
        properties.conversation.last_read_timestamp(30);
        if (updatesReadBoundary) {
          properties.conversation.clearManualUnreadMarker();
        }
      });
      renderedList.rerender(<VirtualizedMessagesList {...properties} />);

      const [updatedVirtualizerOptions] = requireValueForTest(useVirtualizer.mock.calls.at(-1));
      const updatedItemKey = requireValueForTest(updatedVirtualizerOptions.getItemKey);
      const actualItemKeys = Array.from({length: updatedVirtualizerOptions.count}, (_item, index) => {
        return updatedItemKey(index);
      });

      expect(properties.conversation.messages()).toBe(originalMessages);
      expect(actualItemKeys).toEqual(expectedItemKeys);
    } finally {
      renderedList.unmount();
      useVirtualizer.mockRestore();
    }
  });

  it.each([
    {cachedHeightPixels: undefined, expectedHeightPixels: 50},
    {cachedHeightPixels: 0, expectedHeightPixels: 50},
    {cachedHeightPixels: Number.NaN, expectedHeightPixels: 50},
    {cachedHeightPixels: -1, expectedHeightPixels: -1},
    {cachedHeightPixels: 1, expectedHeightPixels: 1},
  ])('preserves cached measurement fallback for $cachedHeightPixels pixels', options => {
    const {cachedHeightPixels, expectedHeightPixels} = options;
    const virtualizerModule = jest.requireActual<VirtualizerModule>('@tanstack/react-virtual');
    const useVirtualizer = jest.spyOn(virtualizerModule, 'useVirtualizer');
    const properties = createMessageListProperties();
    const renderedList = render(<VirtualizedMessagesList {...properties} />, {
      wrapper: createRootProviderWrapperForTest(createRootContextValueForTest({translate: translateForTest})),
    });

    try {
      const [virtualizerOptions] = requireValueForTest(useVirtualizer.mock.calls.at(0));
      const measureElement = requireValueForTest(virtualizerOptions.measureElement);
      const messageElement = document.createElement('div');
      messageElement.setAttribute('data-index', '0');
      jest.spyOn(messageElement, 'getBoundingClientRect').mockReturnValue({height: 50} as DOMRect);
      const virtualizer = {
        scrollDirection: 'backward',
        measurementsCache: [{size: cachedHeightPixels}],
      } as unknown as Virtualizer<HTMLDivElement, Element>;

      const actualHeightPixels = measureElement(messageElement, undefined, virtualizer);

      expect(actualHeightPixels).toBe(expectedHeightPixels);
    } finally {
      renderedList.unmount();
      useVirtualizer.mockRestore();
    }
  });
});
