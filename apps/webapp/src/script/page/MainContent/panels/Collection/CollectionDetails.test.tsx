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

import {render} from '@testing-library/react';
import {Conversation} from 'Repositories/entity/Conversation';
import {ContentMessage} from 'Repositories/entity/message/ContentMessage';
import {FileAsset} from 'Repositories/entity/message/FileAsset';
import {LinkPreview} from 'Repositories/entity/message/LinkPreview';
import {MediumImage} from 'Repositories/entity/message/MediumImage';
import {Text} from 'Repositories/entity/message/Text';
import {MessageCategory} from 'src/script/message/MessageCategory';
import {createUuid} from 'Util/uuid';

import {CollectionDetails} from './CollectionDetails';

jest.mock('Components/Image', () => ({
  AssetImage: () => <div>Image</div>,
  __esModule: true,
}));
jest.mock('Components/MessagesList/Message/ContentMessage/asset/AudioAsset/AudioAsset', () => ({
  AudioAsset: () => <div>Audio</div>,
  __esModule: true,
}));
jest.mock('Components/MessagesList/Message/ContentMessage/asset/FileAsset/FileAsset', () => ({
  FileAsset: () => <div>File</div>,
  __esModule: true,
}));
jest.mock('Components/MessagesList/Message/ContentMessage/asset/LinkPreviewAssetComponent', () => ({
  LinkPreviewAsset: () => <div>Link Preview</div>,
  __esModule: true,
}));

const createImageMessage = (timestamp: number = Date.now()) => {
  const message = new ContentMessage(createUuid());
  message.timestamp(timestamp);
  const image = new MediumImage(createUuid());
  image.resource({} as any);
  message.assets.push(image);
  message.category = MessageCategory.IMAGE;
  return message;
};

const createFileMessage = () => {
  const message = new ContentMessage(createUuid());
  const file = new FileAsset(createUuid());
  message.assets.push(file);
  message.category = MessageCategory.FILE;
  return message;
};

const createLinkMessage = () => {
  const message = new ContentMessage(createUuid());
  const link = new Text(createUuid());
  link.previews.push(new LinkPreview({}));
  message.assets.push(link);
  message.category = MessageCategory.LINK_PREVIEW;
  return message;
};

const createAudioMessage = () => {
  const message = new ContentMessage(createUuid());
  const audio = new FileAsset(createUuid());
  spyOn(audio, 'isAudio').and.returnValue(true);
  message.assets.push(audio);
  message.category = MessageCategory.FILE;
  return message;
};

describe('CollectionDetails', () => {
  const conversation = new Conversation();
  it('displays all image assets', async () => {
    const messages = [createImageMessage(), createImageMessage()];
    const {getAllByText} = render(<CollectionDetails conversation={conversation} messages={messages} />);
    expect(getAllByText('Image')).toHaveLength(messages.length);
  });

  it('displays all file assets', async () => {
    const messages = [createFileMessage(), createFileMessage()];
    const {getAllByText} = render(<CollectionDetails conversation={conversation} messages={messages} />);
    expect(getAllByText('File')).toHaveLength(messages.length);
  });

  it('displays all link preview assets', async () => {
    const messages = [createLinkMessage(), createLinkMessage()];
    const {getAllByText} = render(<CollectionDetails conversation={conversation} messages={messages} />);
    expect(getAllByText('Link Preview')).toHaveLength(messages.length);
  });

  it('displays all audio assets', async () => {
    const messages = [createAudioMessage(), createAudioMessage()];
    const {getAllByText} = render(<CollectionDetails conversation={conversation} messages={messages} />);
    expect(getAllByText('Audio')).toHaveLength(messages.length);
  });

  it('groups assets by month', async () => {
    jest.useFakeTimers();
    jest.setSystemTime(1647298800000); // March 15 2022 00:00:00
    const ONE_DAY = 24 * 60 * 60 * 1000;
    const ONE_MONTH = 30 * ONE_DAY;
    const ONE_YEAR = 12 * ONE_MONTH;
    const now = Date.now();
    const messages = [
      createImageMessage(),
      createImageMessage(now - ONE_DAY),
      createImageMessage(now - ONE_MONTH),
      createImageMessage(now - ONE_YEAR),
    ];
    const {getAllByText} = render(<CollectionDetails conversation={conversation} messages={messages} />);
    expect(getAllByText('Image')).toHaveLength(messages.length);
    expect(getAllByText('conversationToday')).toHaveLength(1);
    expect(getAllByText('March')).toHaveLength(1);
    expect(getAllByText('February')).toHaveLength(1);
    expect(getAllByText('March 2021')).toHaveLength(1);
  });
});
