/*
 * Wire
 * Copyright (C) 2022 Wire Swiss GmbH
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

import {fireEvent, render, waitFor, act} from '@testing-library/react';
import {container} from 'tsyringe';

import {AssetRepository} from 'Repositories/assets/assetRepository';
import {MessageRepository} from 'Repositories/conversation/MessageRepository';
import {Conversation} from 'Repositories/entity/Conversation';
import {ContentMessage} from 'Repositories/entity/message/contentMessage';
import {FileAsset} from 'Repositories/entity/message/fileAsset';
import {LinkPreview} from 'Repositories/entity/message/linkPreview';
import {MediumImage} from 'Repositories/entity/message/mediumImage';
import {Text} from 'Repositories/entity/message/text';
import {User} from 'Repositories/entity/User';
import {withTheme} from 'src/script/auth/util/test/TestUtil';
import {MessageCategory} from 'src/script/message/messageCategory';
import {
  createRootContextValueForTest,
  createRootProviderWrapperForTest,
} from 'src/script/page/testSupport/rootContextTestSupport';
import {translate} from 'Util/localizerUtil';
import {translateForTest} from 'Util/test/translateForTest';
import {createUuid} from 'Util/uuid';

import {Collection} from './collection';
import {FullSearch} from './fullSearch';
import {CONVERSATION_PROTOCOL} from '@wireapp/api-client/lib/team';

jest.mock('./collectionDetails', () => ({
  CollectionDetails: () => <div>CollectionDetails</div>,
  __esModule: true,
}));
jest.mock('./collectionItem', () => ({
  CollectionItem: () => <div>CollectionItem</div>,
  __esModule: true,
}));

const createImageMessage = (timestamp: number = Date.now()) => {
  const message = new ContentMessage(createUuid(), translateForTest);
  message.timestamp(timestamp);
  const image = new MediumImage(createUuid());
  message.assets.push(image);
  message.category = MessageCategory.IMAGE;
  return message;
};

const createFileMessage = () => {
  const message = new ContentMessage(createUuid(), translateForTest);
  const file = new FileAsset(createUuid());
  message.assets.push(file);
  message.category = MessageCategory.FILE;
  return message;
};

const createLinkMessage = () => {
  const message = new ContentMessage(createUuid(), translateForTest);
  const link = new Text(createUuid(), 'term');
  link.previews.push(new LinkPreview({}));
  message.assets.push(link);
  message.category = MessageCategory.LINK_PREVIEW;
  return message;
};

function createTextMessage(text: string) {
  const message = new ContentMessage(createUuid(), translateForTest);
  message.assets.push(new Text(createUuid(), text));
  message.category = MessageCategory.TEXT;
  return message;
}

const createAudioMessage = () => {
  const message = new ContentMessage(createUuid(), translateForTest);
  const audio = new FileAsset(createUuid());
  audio.isAudio = () => true;
  message.assets.push(audio);
  message.category = MessageCategory.FILE;
  return message;
};

describe('Collection', () => {
  const rootProviderWrapper = createRootProviderWrapperForTest(
    createRootContextValueForTest({translate: translateForTest}),
  );
  const conversation = new Conversation('', '', CONVERSATION_PROTOCOL.PROTEUS, translateForTest);
  const messages = [createImageMessage(), createLinkMessage(), createAudioMessage(), createFileMessage()];
  const mockConversationRepository = {
    getEventsForCategory: jest.fn().mockResolvedValue(messages),
    searchInConversation: jest.fn().mockResolvedValue({messageEntities: [createLinkMessage()], query: 'term'}),
  };
  const mockAssetRepository = container.resolve(AssetRepository);
  const mockMessageRepository = {} as MessageRepository;
  const mockSelfUser = new User(createUuid(), '', translateForTest);

  beforeEach(() => {
    jest.clearAllMocks();
    mockConversationRepository.getEventsForCategory.mockResolvedValue(messages);
    mockConversationRepository.searchInConversation.mockResolvedValue({
      messageEntities: [createLinkMessage()],
      query: 'term',
    });
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('displays all image assets', async () => {
    const {getAllByText, getByText, queryByText} = render(
      withTheme(
        <Collection
          assetRepository={mockAssetRepository}
          conversation={conversation}
          conversationRepository={mockConversationRepository as any}
          messageRepository={mockMessageRepository}
          selfUser={mockSelfUser}
        />,
      ),
      {wrapper: rootProviderWrapper},
    );

    await waitFor(() => getAllByText('CollectionItem'));
    expect(getAllByText('CollectionItem')).toHaveLength(messages.length);
    expect(getByText('collectionSectionAudio')).toBeDefined();
    expect(getByText('collectionSectionImages')).toBeDefined();
    expect(getByText('collectionSectionLinks')).toBeDefined();
    expect(getByText('collectionSectionFiles')).toBeDefined();
    expect(queryByText('collectionDetails')).toBeNull();
  });

  it('displays collection details when a section is selected', async () => {
    const IMAGE_COLLECTION_LENGTH = 13;
    const imageMessages = new Array(IMAGE_COLLECTION_LENGTH).fill(null).map(createImageMessage);
    mockConversationRepository.getEventsForCategory.mockResolvedValueOnce(imageMessages);

    const {getAllByText, getByText} = render(
      withTheme(
        <Collection
          assetRepository={mockAssetRepository}
          messageRepository={mockMessageRepository}
          conversation={conversation}
          conversationRepository={mockConversationRepository as any}
          selfUser={mockSelfUser}
        />,
      ),
      {wrapper: rootProviderWrapper},
    );

    await waitFor(() => getAllByText('CollectionItem'));
    act(() => {
      getAllByText('collectionShowAll')[0].click();
    });
    expect(getByText('CollectionDetails')).toBeDefined();
  });

  it('should display search results when term is typed', async () => {
    jest.useFakeTimers();
    const {getAllByText, queryByText, getByTestId} = render(
      withTheme(
        <Collection
          assetRepository={mockAssetRepository}
          messageRepository={mockMessageRepository}
          conversation={conversation}
          conversationRepository={mockConversationRepository as any}
          selfUser={mockSelfUser}
        />,
      ),
      {wrapper: rootProviderWrapper},
    );

    await waitFor(() => getAllByText('CollectionItem'));
    await act(async () => {
      const input = getByTestId('full-search-header-input');
      fireEvent.change(input, {target: {value: 'term'}});
      jest.advanceTimersByTime(499);
    });
    expect(mockConversationRepository.searchInConversation).not.toHaveBeenCalled();

    await act(async () => {
      jest.advanceTimersByTime(1);
    });
    expect(mockConversationRepository.searchInConversation).toHaveBeenCalledWith(
      conversation,
      'term',
      expect.any(AbortSignal),
    );

    expect(queryByText('CollectionTime')).toBeNull();
  });

  it('hides collection content immediately when the parent search term changes', async () => {
    jest.useFakeTimers();

    const {getAllByText, getByTestId, queryByText} = render(
      withTheme(
        <Collection
          assetRepository={mockAssetRepository}
          messageRepository={mockMessageRepository}
          conversation={conversation}
          conversationRepository={mockConversationRepository as any}
          selfUser={mockSelfUser}
        />,
      ),
      {wrapper: rootProviderWrapper},
    );

    await waitFor(() => getAllByText('CollectionItem'));
    const input = getByTestId('full-search-header-input');

    await act(async () => {
      fireEvent.change(input, {target: {value: 'term'}});
    });

    expect(queryByText('collectionSectionImages')).toBeNull();
    expect(mockConversationRepository.searchInConversation).not.toHaveBeenCalled();
  });
});

describe('FullSearch', () => {
  const rootProviderWrapper = createRootProviderWrapperForTest(
    createRootContextValueForTest({translate: translateForTest}),
  );

  afterEach(() => {
    jest.useRealTimers();
  });

  it('calls change immediately with the normalized query and debounces the search provider', async () => {
    jest.useFakeTimers();
    const change = jest.fn();
    const searchProvider = jest.fn().mockResolvedValue({
      messageEntities: [createTextMessage('term result')],
      query: 'term',
    });

    const {getByTestId} = render(withTheme(<FullSearch change={change} searchProvider={searchProvider} />), {
      wrapper: rootProviderWrapper,
    });

    await act(async () => {
      fireEvent.change(getByTestId('full-search-header-input'), {target: {value: ' term '}});
      jest.advanceTimersByTime(499);
    });

    expect(change).toHaveBeenCalledWith('term');
    expect(searchProvider).not.toHaveBeenCalled();

    await act(async () => {
      jest.advanceTimersByTime(1);
    });

    await waitFor(() => expect(searchProvider).toHaveBeenCalledWith('term', expect.any(AbortSignal)));
  });

  it('clears no-results state immediately when the input is cleared', async () => {
    jest.useFakeTimers();
    const searchProvider = jest.fn().mockResolvedValue({messageEntities: [], query: 'term'});

    const {getByTestId, getByText, queryByText} = render(withTheme(<FullSearch searchProvider={searchProvider} />), {
      wrapper: rootProviderWrapper,
    });

    await act(async () => {
      fireEvent.change(getByTestId('full-search-header-input'), {target: {value: 'term'}});
      jest.advanceTimersByTime(500);
    });

    await waitFor(() => getByText('fullsearchNoResults'));

    await act(async () => {
      fireEvent.change(getByTestId('full-search-header-input'), {target: {value: ''}});
    });

    expect(queryByText('fullsearchNoResults')).toBeNull();
  });

  it('ignores slow stale search results so the latest query wins', async () => {
    jest.useFakeTimers();
    let resolveFirstSearch: (value: {messageEntities: ContentMessage[]; query: string}) => void = () => {};
    let resolveSecondSearch: (value: {messageEntities: ContentMessage[]; query: string}) => void = () => {};
    const searchProvider = jest.fn((query: string) => {
      if (query === 'term') {
        return new Promise<{messageEntities: ContentMessage[]; query: string}>(resolve => {
          resolveFirstSearch = resolve;
        });
      }

      return new Promise<{messageEntities: ContentMessage[]; query: string}>(resolve => {
        resolveSecondSearch = resolve;
      });
    });

    const {container: renderedContainer, getByTestId} = render(
      withTheme(<FullSearch searchProvider={searchProvider} />),
      {wrapper: rootProviderWrapper},
    );
    const input = getByTestId('full-search-header-input');

    await act(async () => {
      fireEvent.change(input, {target: {value: 'term'}});
      jest.advanceTimersByTime(500);
    });
    await waitFor(() => expect(searchProvider).toHaveBeenCalledTimes(1));

    await act(async () => {
      fireEvent.change(input, {target: {value: 'terms'}});
      jest.advanceTimersByTime(500);
    });
    await waitFor(() => expect(searchProvider).toHaveBeenCalledTimes(2));
    expect(searchProvider).toHaveBeenLastCalledWith('terms', expect.any(AbortSignal));

    await act(async () => {
      resolveSecondSearch({messageEntities: [createTextMessage('latest terms result')], query: 'terms'});
    });
    await waitFor(() => {
      expect(renderedContainer.querySelector('[data-uie-name="full-search-item-text"]')?.textContent).toBe(
        'latest terms result',
      );
    });

    await act(async () => {
      resolveFirstSearch({messageEntities: [createTextMessage('stale term result')], query: 'term'});
    });

    expect(renderedContainer.querySelector('[data-uie-name="full-search-item-text"]')?.textContent).toBe(
      'latest terms result',
    );
  });
});
