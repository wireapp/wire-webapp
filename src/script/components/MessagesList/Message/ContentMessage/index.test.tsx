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

import ko from 'knockout';
import ContentMessageComponent, {ContentMessageProps} from './index';
import {act, render, waitFor} from '@testing-library/react';
import {ContentMessage} from '../../../../entity/message/ContentMessage';
import {Conversation} from '../../../../entity/Conversation';
import {createRandomUuid} from '../../../../util/util';
import {Text} from '../../../../entity/message/Text';
import {User} from '../../../../entity/User';
import {LinkPreview} from 'src/script/entity/message/LinkPreview';
import {QuoteEntity} from 'src/script/message/QuoteEntity';

describe('message', () => {
  let defaultParams: ContentMessageProps;
  const textValue = 'hello';

  beforeEach(() => {
    const message = new ContentMessage();
    message.user(new User(createRandomUuid()));
    const textAsset = new Text('', textValue);
    spyOn(textAsset, 'render').and.returnValue(`<span>${textValue}</span>`);
    message.assets.push(textAsset);

    defaultParams = {
      contextMenu: {entries: ko.observable([])},
      conversation: new Conversation(),
      findMessage: jest.fn(),
      isLastDeliveredMessage: false,
      message,
      onClickAvatar: jest.fn(),
      onClickButton: jest.fn(),
      onClickCancelRequest: jest.fn(),
      onClickImage: jest.fn(),
      onClickInvitePeople: jest.fn(),
      onClickLikes: jest.fn(),
      onClickMessage: jest.fn(),
      onClickParticipants: jest.fn(),
      onClickReceipts: jest.fn(),
      onClickTimestamp: jest.fn(),
      onLike: jest.fn(),
      previousMessage: undefined,
      selfId: {domain: '', id: createRandomUuid()},
    };
  });

  it('displays a message', () => {
    const {getByText} = render(<ContentMessageComponent {...defaultParams} />);
    expect(getByText(textValue)).toBeDefined();
  });

  it('displays a link preview', () => {
    const linkPreview = new LinkPreview({title: 'A link to the past'});
    (defaultParams.message.getFirstAsset() as Text).previews([linkPreview]);

    const {getByText} = render(<ContentMessageComponent {...defaultParams} />);
    expect(getByText(linkPreview.title)).not.toBe(null);
  });

  it('displays a quoted message', async () => {
    const quotedMessage = new ContentMessage(createRandomUuid());
    const quoteText = 'I am a quote';
    const quoteAsset = new Text('', textValue);
    spyOn(quoteAsset, 'render').and.returnValue(`<span>${quoteText}</span>`);
    quotedMessage.assets.push(quoteAsset);
    const findMessage = () => Promise.resolve(quotedMessage);

    const message = new ContentMessage();
    message.user(new User(createRandomUuid()));
    message.quote(new QuoteEntity({messageId: quotedMessage.id, userId: ''}));

    await act(async () => {
      const {getByText} = render(
        <ContentMessageComponent {...defaultParams} message={message} findMessage={findMessage} />,
      );
      await waitFor(() => getByText(quoteText));
    });
  });
});
