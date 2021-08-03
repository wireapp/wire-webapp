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
import {MemberMessage as MemberMessageEntity} from 'src/script/entity/message/MemberMessage';
import MemberMessage, {MemberMessageProps} from './MemberMessage';
import {User} from 'src/script/entity/User';

class MemberMessagePage extends TestPage<MemberMessageProps> {
  constructor(props?: MemberMessageProps) {
    super(MemberMessage, props);
  }

  getMemberMessage = () => this.get('[data-uie-name="element-message-member"]');
  getConnectedMessage = () => this.get('[data-uie-name="element-connected-message"]');
}

const createMemberMessage = (partialMemberMessage: Partial<MemberMessageEntity>) => {
  const memberMessage: Partial<MemberMessageEntity> = {
    hasUsers: ko.pureComputed(() => false),
    isGroupCreation: () => false,
    isMemberChange: () => false,
    isMemberJoin: () => false,
    isMemberLeave: () => false,
    isMemberRemoval: () => false,
    showLargeAvatar: () => false,
    showNamedCreation: ko.pureComputed(() => false),
    timestamp: ko.observable(Date.now()),
    ...partialMemberMessage,
  };
  return memberMessage as MemberMessageEntity;
};

describe('MemberMessage', () => {
  it('shows connected message', async () => {
    const memberMessagePage = new MemberMessagePage({
      hasReadReceiptsTurnedOn: false,
      isSelfTemporaryGuest: false,
      message: createMemberMessage({
        otherUser: ko.pureComputed(() => new User('id', null)),
        showLargeAvatar: () => true,
      }),
      onClickCancelRequest: () => {},
      onClickInvitePeople: () => {},
      onClickParticipants: () => {},
      shouldShowInvitePeople: false,
    });

    expect(memberMessagePage.getConnectedMessage().exists()).toBe(true);
  });
});
