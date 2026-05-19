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
import {MessageRepository} from 'Repositories/conversation/messageRepository';
import {Conversation} from 'Repositories/entity/conversation';
import {ContentMessage} from 'Repositories/entity/message/contentMessage';
import {FileAsset} from 'Repositories/entity/message/fileAsset';
import {LinkPreview} from 'Repositories/entity/message/linkPreview';
import {MediumImage} from 'Repositories/entity/message/mediumImage';
import {Text} from 'Repositories/entity/message/text';
import {User} from 'Repositories/entity/user';
import {withTheme} from 'src/script/auth/util/test/testUtil';
import {messageCategory} from 'src/script/message/messageCategory';
import {createUuid} from 'Util/uuid';

import {Collection} from './collection';

jest.mock('./collectionDetails', () => ({
  CollectionDetails: () => <div>CollectionDetails</div>,
  __esModule: true,
}));
jest.mock('./collectionItem', () => ({
  CollectionItem: () => <div>CollectionItem</div>,
  __esModule: true,
}));

const createImageMessage = (timestamp: number = Date.now()) => {
  const message = new ContentMessage(createUuid());
  message.timestamp(timestamp);
  const image = new MediumImage(createUuid());
  message.assets.push(image);
  message.category = messageCategory.IMAGE;
  return message;
};

const createFileMessage = () => {
  const message = new ContentMessage(createUuid());
  const file = new FileAsset(createUuid());
  message.assets.push(file);
  message.category = messageCategory.FILE;
  return message;
};

const createLinkMessage = () => {
  const message = new ContentMessage(createUuid());
  const link = new Text(createUuid());
  link.previews.push(new LinkPreview({}));
  message.assets.push(link);
  message.category = messageCategory.LINK_PREVIEW;
  return message;
};

const createAudioMessage = () => {
  const message = new ContentMessage(createUuid());
  const audio = new FileAsset(createUuid());
  audio.isAudio = () => true;
  message.assets.push(audio);
  message.category = messageCategory.FILE;
  return message;
};

describe('Collection', () => {
  const conversation = new Conversation();
  const messages = [createImageMessage(), createLinkMessage(), createAudioMessage(), createFileMessage()];
  const mockConversationRepository = {
    getEventsForCategory: jest.fn().mockResolvedValue(messages),
    searchInConversation: jest.fn().mockResolvedValue({messageEntities: [createLinkMessage()], query: 'term'}),
  };
  const mockAssetRepository = container.resolve(AssetRepository);
  const mockMessageRepository = {} as MessageRepository;
  const mockSelfUser = new User(createUuid());

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
    );

    await waitFor(() => getAllByText('CollectionItem'));
    await act(async () => {
      const input = getByTestId('full-search-header-input');
      fireEvent.change(input, {target: {value: 'term'}});
      jest.advanceTimersByTime(500);
    });
    await waitFor(() => expect(mockConversationRepository.searchInConversation).toHaveBeenCalled());

    expect(queryByText('CollectionTime')).toBeNull();
  });
});
