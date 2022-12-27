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

import {withTheme} from 'src/script/auth/util/test/TestUtil';
import {Conversation} from 'src/script/entity/Conversation';
import {ContentMessage} from 'src/script/entity/message/ContentMessage';
import {FileAsset} from 'src/script/entity/message/FileAsset';
import {LinkPreview} from 'src/script/entity/message/LinkPreview';
import {MediumImage} from 'src/script/entity/message/MediumImage';
import {MessageCategory} from 'src/script/message/MessageCategory';
import {createRandomUuid} from 'Util/util';

import {Collection} from './Collection';

import {AssetRepository} from '../../../../assets/AssetRepository';
import {MessageRepository} from '../../../../conversation/MessageRepository';
import {Text} from '../../../../entity/message/Text';

jest.mock('./CollectionDetails', () => ({
  CollectionDetails: () => <div>CollectionDetails</div>,
  __esModule: true,
}));
jest.mock('./CollectionItem', () => ({
  CollectionItem: () => <div>CollectionItem</div>,
  __esModule: true,
}));

const createImageMessage = (timestamp: number = Date.now()) => {
  const message = new ContentMessage(createRandomUuid());
  message.timestamp(timestamp);
  const image = new MediumImage(createRandomUuid());
  message.assets.push(image);
  message.category = MessageCategory.IMAGE;
  return message;
};

const createFileMessage = () => {
  const message = new ContentMessage(createRandomUuid());
  const file = new FileAsset(createRandomUuid());
  message.assets.push(file);
  message.category = MessageCategory.FILE;
  return message;
};

const createLinkMessage = () => {
  const message = new ContentMessage(createRandomUuid());
  const link = new Text(createRandomUuid());
  link.previews.push(new LinkPreview({}));
  message.assets.push(link);
  message.category = MessageCategory.LINK_PREVIEW;
  return message;
};

const createAudioMessage = () => {
  const message = new ContentMessage(createRandomUuid());
  const audio = new FileAsset(createRandomUuid());
  audio.isAudio = () => true;
  message.assets.push(audio);
  message.category = MessageCategory.FILE;
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

  it('displays all image assets', async () => {
    const {getAllByText, getByText, queryByText} = render(
      withTheme(
        <Collection
          assetRepository={mockAssetRepository}
          conversation={conversation}
          conversationRepository={mockConversationRepository as any}
          messageRepository={mockMessageRepository}
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
