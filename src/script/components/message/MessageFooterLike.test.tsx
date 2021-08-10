/*
 * Wire
 * Copyright (C) 2021 Wire Swiss GmbH
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
import TestPage from 'Util/test/TestPage';
import {ContentMessage} from 'src/script/entity/message/ContentMessage';
import MessageFooterLike, {MessageFooterLikeProps} from './MessageFooterLike';

class MessageFooterLikePage extends TestPage<MessageFooterLikeProps> {
  constructor(props?: MessageFooterLikeProps) {
    super(MessageFooterLike, props);
  }

  getMessageFooterLike = () => this.get('[data-uie-name="element-message-call"]');
  getLikeNameList = () => this.get('[data-uie-name="message-liked-names"]');
  getLike = () => this.get('[data-uie-name="do-like-message"]');

  clickLikeNameList = () => this.click(this.getLikeNameList());
  clickLike = () => this.click(this.getLike());
}

const createLikeMessage = (partialLikeMessage: Partial<ContentMessage>) => {
  const likeMessage: Partial<ContentMessage> = {
    is_liked: ko.pureComputed(() => false),
    like_caption: ko.pureComputed(() => ''),
    reactions_user_ids: ko.pureComputed(() => ''),
    ...partialLikeMessage,
  };
  return likeMessage as ContentMessage;
};

describe('MessageFooterLike', () => {
  it('triggers message likes', async () => {
    const spyOnLike = jest.fn();
    const message = createLikeMessage({});
    const messageFooterLikePage = new MessageFooterLikePage({
      is1to1Conversation: false,
      message,
      onClickLikes: () => {},
      onLike: spyOnLike,
    });

    expect(messageFooterLikePage.getLike().exists()).toBe(true);
    messageFooterLikePage.clickLike();

    expect(spyOnLike).toHaveBeenCalledWith(message);
  });

  it('does open conversation details in group conversation when clicking on like names', async () => {
    const spyOnOpenConversationDetails = jest.fn();
    const messageFooterLikePage = new MessageFooterLikePage({
      is1to1Conversation: false,
      message: createLikeMessage({
        is_liked: ko.pureComputed(() => true),
      }),
      onClickLikes: spyOnOpenConversationDetails,
      onLike: () => {},
    });

    expect(messageFooterLikePage.getLikeNameList().exists()).toBe(true);
    messageFooterLikePage.clickLikeNameList();

    expect(spyOnOpenConversationDetails).toHaveBeenCalled();
  });

  it('does not open conversation details in 1:1 conversation when clicking on like names', async () => {
    const spyOnOpenConversationDetails = jest.fn();
    const messageFooterLikePage = new MessageFooterLikePage({
      is1to1Conversation: true,
      message: createLikeMessage({
        is_liked: ko.pureComputed(() => true),
      }),
      onClickLikes: spyOnOpenConversationDetails,
      onLike: () => {},
    });

    expect(messageFooterLikePage.getLikeNameList().exists()).toBe(true);
    messageFooterLikePage.clickLikeNameList();

    expect(spyOnOpenConversationDetails).not.toHaveBeenCalled();
  });
});
