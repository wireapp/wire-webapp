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

import {Conversation} from 'src/script/entity/Conversation';
import {ContentMessage} from 'src/script/entity/message/ContentMessage';
import {FileAsset} from 'src/script/entity/message/FileAsset';
import {LinkPreview} from 'src/script/entity/message/LinkPreview';
import {MediumImage} from 'src/script/entity/message/MediumImage';
import {MessageCategory} from 'src/script/message/MessageCategory';
import {createRandomUuid} from 'Util/util';

import {CollectionDetails} from './CollectionDetails';

import {Text} from '../../../../entity/message/Text';

jest.mock('Components/Image', () => ({
  Image: () => <div>Image</div>,
  __esModule: true,
}));
jest.mock('Components/MessagesList/Message/ContentMessage/asset/AudioAsset', () => ({
  AudioAsset: () => <div>Audio</div>,
  __esModule: true,
}));
jest.mock('Components/MessagesList/Message/ContentMessage/asset/FileAssetComponent', () => ({
  FileAsset: () => <div>File</div>,
  __esModule: true,
}));
jest.mock('Components/MessagesList/Message/ContentMessage/asset/LinkPreviewAssetComponent', () => ({
  LinkPreviewAsset: () => <div>Link Preview</div>,
  __esModule: true,
}));

const createImageMessage = (timestamp: number = Date.now()) => {
  const message = new ContentMessage(createRandomUuid());
  message.timestamp(timestamp);
  const image = new MediumImage(createRandomUuid());
  image.resource({} as any);
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
