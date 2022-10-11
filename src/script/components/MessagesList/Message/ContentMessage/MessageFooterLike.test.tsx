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

import {render, fireEvent} from '@testing-library/react';
import ko from 'knockout';

import {ContentMessage} from 'src/script/entity/message/ContentMessage';

import MessageFooterLike from './MessageFooterLike';

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
    const message = createLikeMessage({});

    const props = {
      is1to1Conversation: false,
      message,
      onClickLikes: jest.fn(),
      onLike: jest.fn(),
    };

    const {getByTestId} = render(<MessageFooterLike {...props} />);
    const likeMessageElement = getByTestId('do-like-message');

    fireEvent.click(likeMessageElement);
    expect(props.onLike).toHaveBeenCalledWith(message);
  });

  it('does open conversation details in group conversation when clicking on like names', async () => {
    const props = {
      is1to1Conversation: false,
      message: createLikeMessage({
        is_liked: ko.pureComputed(() => true),
      }),
      onClickLikes: jest.fn(),
      onLike: jest.fn(),
    };

    const {getByTestId} = render(<MessageFooterLike {...props} />);
    const likeNameList = getByTestId('message-liked-names');

    fireEvent.click(likeNameList);
    expect(props.onClickLikes).toHaveBeenCalled();
  });

  it('does not open conversation details in 1:1 conversation when clicking on like names', async () => {
    const props = {
      is1to1Conversation: true,
      message: createLikeMessage({
        is_liked: ko.pureComputed(() => true),
      }),
      onClickLikes: jest.fn(),
      onLike: jest.fn(),
    };

    const {getByTestId} = render(<MessageFooterLike {...props} />);

    const likeNameList = getByTestId('message-liked-names');
    expect(likeNameList).not.toBeNull();

    fireEvent.click(likeNameList);
    expect(props.onClickLikes).not.toHaveBeenCalled();
  });
});
