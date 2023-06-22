/*
 * Wire
 * Copyright (C) 2023 Wire Swiss GmbH
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
import ko from 'knockout';

import {MemberMessage as MemberMessageEntity} from 'src/script/entity/message/MemberMessage';
import {User} from 'src/script/entity/User';

import {MemberMessage} from './MemberMessage';

const createMemberMessage = (partialMemberMessage: Partial<MemberMessageEntity>) => {
  const memberMessage: Partial<MemberMessageEntity> = {
    hasUsers: ko.pureComputed(() => false),
    isGroupCreation: () => false,
    isMemberChange: () => false,
    isMemberJoin: () => false,
    isMemberLeave: () => false,
    isMemberRemoval: () => false,
    showLargeAvatar: () => false,
    showNamedCreation: ko.pureComputed(() => true),
    timestamp: ko.observable(Date.now()),
    ...partialMemberMessage,
  };
  return memberMessage as MemberMessageEntity;
};

describe('MemberMessage', () => {
  it('shows connected message', async () => {
    const props = {
      hasReadReceiptsTurnedOn: false,
      isSelfTemporaryGuest: false,
      message: createMemberMessage({
        otherUser: ko.pureComputed(() => new User('id')),
        showLargeAvatar: () => true,
      }),
      onClickCancelRequest: () => {},
      onClickInvitePeople: () => {},
      onClickParticipants: () => {},
      shouldShowInvitePeople: false,
      conversationName: 'group 1',
    };

    const {queryByTestId} = render(<MemberMessage {...props} />);
    expect(queryByTestId('element-connected-message')).not.toBeNull();
  });
  it('shows conversation title', async () => {
    const props = {
      hasReadReceiptsTurnedOn: false,
      isSelfTemporaryGuest: false,
      message: createMemberMessage({
        otherUser: ko.pureComputed(() => new User('id')),
      }),
      onClickCancelRequest: () => {},
      onClickInvitePeople: () => {},
      onClickParticipants: () => {},
      shouldShowInvitePeople: false,
      conversationName: 'group 1',
    };

    const {getByTestId} = render(<MemberMessage {...props} />);
    expect(getByTestId('conversation-name').textContent).toBe(props.conversationName);
  });
});
