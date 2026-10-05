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

import {render} from '@testing-library/react';
import type {Virtualizer} from '@tanstack/react-virtual';
import {CONVERSATION_PROTOCOL} from '@wireapp/api-client/lib/team';
import ko from 'knockout';
import {noop} from 'noop-esm';

import {AssetRepository} from 'Repositories/assets/assetRepository';
import {ConversationRepository} from 'Repositories/conversation/conversationRepository';
import {MessageRepository} from 'Repositories/conversation/messageRepository';
import {Conversation} from 'Repositories/entity/conversation';
import {User} from 'Repositories/entity/user';
import {
  createRootContextValueForTest,
  createRootProviderWrapperForTest,
  requireValueForTest,
} from 'src/script/page/testSupport/rootContextTestSupport';
import {translateForTest} from 'Util/test/translateForTest';

import {VirtualizedMessagesList} from './virtualizedMessagesList';

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
    conversationLastReadTimestamp: {current: 0},
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
  it.each([
    {cachedHeightPixels: undefined, expectedHeightPixels: 50},
    {cachedHeightPixels: 0, expectedHeightPixels: 50},
    {cachedHeightPixels: Number.NaN, expectedHeightPixels: 50},
    {cachedHeightPixels: -1, expectedHeightPixels: -1},
    {cachedHeightPixels: 1, expectedHeightPixels: 1},
  ])('preserves cached measurement fallback for $cachedHeightPixels pixels', options => {
    const {cachedHeightPixels, expectedHeightPixels} = options;
    const virtualizerModule = jest.requireActual<typeof import('@tanstack/react-virtual')>('@tanstack/react-virtual');
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
