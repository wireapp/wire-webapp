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

import {render} from '@testing-library/react';
import {CONVERSATION_EVENT} from '@wireapp/api-client/lib/event';

import {randomInt} from 'crypto';

import en from 'I18n/en-US.json';
import {MemberMessage as MemberMessageEntity} from 'src/script/entity/message/MemberMessage';
import {User} from 'src/script/entity/User';
import {SystemMessageType} from 'src/script/message/SystemMessageType';
import {generateUser} from 'test/helper/UserGenerator';
import {setStrings} from 'Util/LocalizerUtil';

import {MemberMessage} from './MemberMessage';

setStrings({en});

const config = MemberMessageEntity.CONFIG;

function createMemberMessage({systemType, type}: {systemType?: SystemMessageType; type?: string}, users?: User[]) {
  const message = new MemberMessageEntity();
  if (systemType) {
    message.memberMessageType = systemType;
  }
  if (type) {
    message.type = type;
  }
  const actor = generateUser();
  message.user(actor);
  if (users) {
    message.userIds(users.map(user => user.qualifiedId));
    message.userEntities(users);
  } else {
    message.userIds([actor.qualifiedId]);
    message.userEntities([actor]);
  }
  message.name('message');

  return message;
}

const baseProps = {
  hasReadReceiptsTurnedOn: false,
  isSelfTemporaryGuest: false,
  onClickCancelRequest: jest.fn(),
  onClickInvitePeople: jest.fn(),
  onClickParticipants: jest.fn(),
  shouldShowInvitePeople: false,
  conversationName: 'group 1',
};

describe('MemberMessage', () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  it('shows connected message', async () => {
    const props = {
      ...baseProps,
      message: createMemberMessage({systemType: SystemMessageType.CONNECTION_ACCEPTED}, [new User('id')]),
    };

    const {getByTestId} = render(<MemberMessage {...props} />);
    expect(getByTestId('element-connected-message')).not.toBeNull();
  });

  describe('CONVERSATION_CREATE', () => {
    it('displays participants of a newly created conversation', () => {
      const nbUsers = randomInt(1, 10);
      const users = Array.from({length: nbUsers}, () => generateUser());
      const message = createMemberMessage({systemType: SystemMessageType.CONVERSATION_CREATE}, users);
      const props = {
        ...baseProps,
        message,
      };

      const {getByText} = render(<MemberMessage {...props} />);
      users.forEach(user => {
        expect(getByText(user.name())).not.toBeNull();
      });
    });

    it('displays a showMore when there are more than 17 users', () => {
      const nbExtraUsers = randomInt(1, 10);
      const nbUsers = config.MAX_USERS_VISIBLE + nbExtraUsers;

      const users = Array.from({length: nbUsers}, () => generateUser());
      const message = createMemberMessage({systemType: SystemMessageType.CONVERSATION_CREATE}, users);
      const props = {
        ...baseProps,
        message,
      };

      const {getByText} = render(<MemberMessage {...props} />);
      const showMoreButton = getByText(`${nbUsers - config.REDUCED_USERS_COUNT} more`);
      showMoreButton.click();

      expect(props.onClickParticipants).toHaveBeenCalledTimes(1);
    });

    it('displays all team members', () => {
      const nbExtraUsers = randomInt(1, 10);
      const nbTeamUsers = config.MAX_WHOLE_TEAM_USERS_VISIBLE + nbExtraUsers;

      const teamUsers = Array.from({length: nbTeamUsers}, () => generateUser());
      const message = createMemberMessage({systemType: SystemMessageType.CONVERSATION_CREATE}, teamUsers);
      message.allTeamMembers = teamUsers;
      const props = {
        ...baseProps,
        message,
      };

      const {getByText} = render(<MemberMessage {...props} />);
      const showMoreButton = getByText(`all team members`);
      showMoreButton.click();

      expect(props.onClickParticipants).toHaveBeenCalledTimes(1);
    });

    it('displays all team members and one guest message', () => {
      const nbExtraUsers = randomInt(1, 10);
      const nbTeamUsers = config.MAX_WHOLE_TEAM_USERS_VISIBLE + nbExtraUsers;

      const teamUsers = Array.from({length: nbTeamUsers}, () => generateUser());
      const guest = generateUser();
      guest.isGuest(true);
      const message = createMemberMessage({systemType: SystemMessageType.CONVERSATION_CREATE}, [...teamUsers, guest]);
      message.allTeamMembers = teamUsers;
      const props = {
        ...baseProps,
        message,
      };

      const {getByText} = render(<MemberMessage {...props} />);
      expect(getByText(`all team members and one guest`)).not.toBeNull();
    });

    it('displays all team members and multiple guests message', () => {
      const nbGuests = randomInt(2, 10);
      const nbTeamUsers = config.MAX_WHOLE_TEAM_USERS_VISIBLE;

      const teamUsers = Array.from({length: nbTeamUsers}, () => generateUser());
      const guests = Array.from({length: nbGuests}, () => {
        const guest = generateUser();
        guest.isGuest(true);
        return guest;
      });
      const message = createMemberMessage({systemType: SystemMessageType.CONVERSATION_CREATE}, [
        ...teamUsers,
        ...guests,
      ]);
      message.allTeamMembers = teamUsers;
      const props = {
        ...baseProps,
        message,
      };

      const {getByText} = render(<MemberMessage {...props} />);
      expect(getByText(`all team members and ${nbGuests} guests`)).not.toBeNull();
    });

    it('displays that another user created a conversation', () => {
      const nbUsers = randomInt(1, 10);
      const users = Array.from({length: nbUsers}, () => generateUser());
      const message = createMemberMessage({systemType: SystemMessageType.CONVERSATION_CREATE}, users);
      message.name('');
      message.user().name('Creator');
      const props = {
        ...baseProps,
        message,
      };

      const {container} = render(<MemberMessage {...props} />);
      expect(container.textContent).toContain(`Creator started a conversation with`);
    });

    it('displays that self user created a conversation', () => {
      const nbUsers = randomInt(1, 10);
      const users = Array.from({length: nbUsers}, () => generateUser());
      const message = createMemberMessage({systemType: SystemMessageType.CONVERSATION_CREATE}, users);
      message.name('');
      message.user().isMe = true;
      const props = {
        ...baseProps,
        message,
      };

      const {container} = render(<MemberMessage {...props} />);
      expect(container.textContent).toContain(`You started a conversation with`);
    });
  });

  describe('MEMBER_JOIN', () => {
    it('displays that self user added new members', () => {
      const nbUsers = randomInt(1, 10);
      const users = Array.from({length: nbUsers}, () => generateUser());
      const message = createMemberMessage({type: CONVERSATION_EVENT.MEMBER_JOIN}, users);
      message.user().isMe = true;
      const props = {
        ...baseProps,
        message,
      };

      const {container} = render(<MemberMessage {...props} />);
      expect(container.textContent).toContain(`You added `);
    });

    it('displays that a new members were added by someone', () => {
      const nbUsers = randomInt(1, 10);
      const users = Array.from({length: nbUsers}, () => generateUser());
      const message = createMemberMessage({type: CONVERSATION_EVENT.MEMBER_JOIN}, users);
      const props = {
        ...baseProps,
        message,
      };

      const {container} = render(<MemberMessage {...props} />);
      expect(container.textContent).toContain(`${message.user().name()} added `);
    });

    it('displays that a new members joined the conversation', () => {
      const message = createMemberMessage({type: CONVERSATION_EVENT.MEMBER_JOIN});
      const props = {
        ...baseProps,
        message,
      };

      const {container} = render(<MemberMessage {...props} />);
      expect(container.textContent).toContain(`${message.user().name()} joined`);
    });
  });

  describe('MEMBER_LEAVE', () => {
    it('displays that self user left the conversation', () => {
      const message = createMemberMessage({type: CONVERSATION_EVENT.MEMBER_LEAVE});
      message.user().isMe = true;
      const props = {
        ...baseProps,
        message,
      };

      const {container} = render(<MemberMessage {...props} />);
      expect(container.textContent).toContain(`You left`);
    });

    it('displays that a member left the conversation', () => {
      const message = createMemberMessage({type: CONVERSATION_EVENT.MEMBER_LEAVE});
      const props = {
        ...baseProps,
        message,
      };

      const {container} = render(<MemberMessage {...props} />);
      expect(container.textContent).toContain(`${message.user().name()} left`);
    });

    it('displays that a member was removed by someone', () => {
      const removedUser = generateUser();
      const message = createMemberMessage({type: CONVERSATION_EVENT.MEMBER_LEAVE}, [removedUser]);
      const props = {
        ...baseProps,
        message,
      };

      const {container} = render(<MemberMessage {...props} />);
      expect(container.textContent).toContain(`${message.user().name()} removed ${removedUser.name()}`);
    });

    it('displays that many users were removed', () => {
      const nbUsers = randomInt(1, 10);
      const users = Array.from({length: nbUsers}, () => generateUser());
      const message = createMemberMessage({type: CONVERSATION_EVENT.MEMBER_LEAVE}, users);
      message.user().id = '';
      const props = {
        ...baseProps,
        message,
      };

      const {container} = render(<MemberMessage {...props} />);
      expect(container.textContent).toContain(`were removed`);
    });
  });
});
