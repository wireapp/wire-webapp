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

import {MemberLeaveReason} from '@wireapp/api-client/lib/conversation/data/';
import {CONVERSATION_EVENT} from '@wireapp/api-client/lib/event/';

import {Config} from 'src/script/Config';
import {MemberMessage as MemberMessageEntity} from 'src/script/entity/message/MemberMessage';
import {User} from 'src/script/entity/User';
import {ClientEvent} from 'src/script/event/Client';
import {SystemMessageType} from 'src/script/message/SystemMessageType';
import {Declension, joinNames, replaceLink, t} from 'Util/LocalizerUtil';
import {replaceReactComponents} from 'Util/LocalizerUtil/ReactLocalizerUtil';
import {matchQualifiedIds} from 'Util/QualifiedId';

export const CONFIG = {
  MAX_USERS_VISIBLE: 17,
  MAX_WHOLE_TEAM_USERS_VISIBLE: 10,
  REDUCED_USERS_COUNT: 15,
} as const;

function generateNames(users: User[], declension = Declension.ACCUSATIVE, hasExtra = false) {
  const visibleUsers = hasExtra ? getVisibleUsers(users) : users;
  return joinNames(visibleUsers, declension, hasExtra, true);
}

function getVisibleUsers(users: User[]) {
  return users.slice(0, CONFIG.REDUCED_USERS_COUNT);
}

function ShowMoreButton({children, onClick}: {children: React.ReactNode; onClick: () => void}) {
  return (
    <button
      className="message-header-show-more button-reset-default accent-text"
      onClick={event => {
        event.preventDefault();
        onClick();
      }}
      data-uie-name="do-show-more"
    >
      {children}
    </button>
  );
}

function getContent(message: MemberMessageEntity) {
  if (!message.hasUsers()) {
    return '';
  }

  /** the users that are impacted by the member event */
  const targetedUsers = message.targetedUsers();
  /** the user that triggered the action */
  const actor = message.user();

  const exceedsMaxVisibleUsers = targetedUsers.length > CONFIG.MAX_USERS_VISIBLE;

  /** the number of users that will not be displayed on screen */
  const hiddenUsersCount = exceedsMaxVisibleUsers ? targetedUsers.length - CONFIG.REDUCED_USERS_COUNT : 0;

  const dativeUsers = generateNames(targetedUsers, Declension.DATIVE, exceedsMaxVisibleUsers);
  const accusativeUsers = generateNames(targetedUsers, Declension.ACCUSATIVE, exceedsMaxVisibleUsers);
  const name = message.senderName();

  switch (message.memberMessageType) {
    case SystemMessageType.CONVERSATION_CREATE: {
      if (message.name().length) {
        const exceedsMaxTeam = targetedUsers.length > CONFIG.MAX_WHOLE_TEAM_USERS_VISIBLE;
        if (message.allTeamMembers && exceedsMaxTeam) {
          const guestCount = targetedUsers.filter(userEntity => userEntity.isGuest()).length;
          if (!guestCount) {
            return t('conversationCreateTeam');
          }

          const hasSingleGuest = guestCount === 1;
          return hasSingleGuest
            ? t('conversationCreateTeamGuest')
            : t('conversationCreateTeamGuests', {count: guestCount});
        }

        return exceedsMaxVisibleUsers
          ? t('conversationCreateWithMore', {count: hiddenUsersCount.toString(), users: dativeUsers}, {}, true)
          : t('conversationCreateWith', {users: dativeUsers}, {}, true);
      }

      if (actor.isMe) {
        return exceedsMaxVisibleUsers
          ? t('conversationCreatedYouMore', {count: hiddenUsersCount.toString(), users: dativeUsers}, {}, true)
          : t('conversationCreatedYou', {users: dativeUsers}, {}, true);
      }

      return exceedsMaxVisibleUsers
        ? t('conversationCreatedMore', {count: hiddenUsersCount.toString(), name, users: dativeUsers}, {}, true)
        : t('conversationCreated', {name, users: dativeUsers}, {}, true);
    }

    case SystemMessageType.CONVERSATION_RESUME: {
      return t('conversationResume', {users: generateNames(targetedUsers, Declension.DATIVE, false)}, {}, true);
    }

    default:
      break;
  }

  switch (message.type) {
    case CONVERSATION_EVENT.MEMBER_JOIN: {
      const senderJoined = matchQualifiedIds(message.otherUser(), actor);
      if (senderJoined) {
        return message.user().isMe
          ? t('conversationMemberJoinedSelfYou')
          : t('conversationMemberJoinedSelf', {name: message.senderName()}, {}, true);
      }

      if (message.user().isMe) {
        return exceedsMaxVisibleUsers
          ? t('conversationMemberJoinedYouMore', {count: hiddenUsersCount.toString(), users: accusativeUsers}, {}, true)
          : t('conversationMemberJoinedYou', {users: accusativeUsers}, {}, true);
      }
      return exceedsMaxVisibleUsers
        ? t(
            'conversationMemberJoinedMore',
            {count: hiddenUsersCount.toString(), name, users: accusativeUsers},
            {},
            true,
          )
        : t('conversationMemberJoined', {name, users: accusativeUsers}, {}, true);
    }

    case CONVERSATION_EVENT.MEMBER_LEAVE: {
      if (message.reason === MemberLeaveReason.LEGAL_HOLD_POLICY_CONFLICT) {
        const replaceLinkLegalHold = replaceLink(
          Config.getConfig().URL.SUPPORT.LEGAL_HOLD_BLOCK,
          '',
          'read-more-legal-hold',
        );
        if (message.userEntities().some(user => user.isMe)) {
          return t('conversationYouRemovedMissingLegalHoldConsent', undefined, replaceLinkLegalHold);
        }
        const users = generateNames(targetedUsers);

        if (message.userEntities().length === 1) {
          return t('conversationMemberRemovedMissingLegalHoldConsent', {user: users}, replaceLinkLegalHold);
        }
        if (exceedsMaxVisibleUsers) {
          return t(
            'conversationMultipleMembersRemovedMissingLegalHoldConsentMore',
            {
              count: hiddenUsersCount.toString(10),
              users,
            },
            replaceLinkLegalHold,
            true,
          );
        }
        return t('conversationMultipleMembersRemovedMissingLegalHoldConsent', {users}, replaceLinkLegalHold);
      }
      const temporaryGuestRemoval = message.otherUser().isMe && message.otherUser().isTemporaryGuest();
      if (temporaryGuestRemoval) {
        return t('temporaryGuestLeaveMessage');
      }

      const senderLeft = matchQualifiedIds(message.otherUser(), actor);
      if (senderLeft) {
        return message.user().isMe ? t('conversationMemberLeftYou') : t('conversationMemberLeft', {name}, {}, true);
      }

      const allUsers = generateNames(targetedUsers);
      if (!actor.id) {
        return t('conversationMemberWereRemoved', {users: allUsers}, {}, true);
      }

      if (message.reason === MemberLeaveReason.USER_DELETED) {
        return t('conversationMemberDeleted');
      }

      return actor.isMe
        ? t('conversationMemberRemovedYou', {users: allUsers}, {}, true)
        : t('conversationMemberRemoved', {name, users: allUsers}, {}, true);
    }

    case ClientEvent.CONVERSATION.TEAM_MEMBER_LEAVE: {
      return t('conversationTeamLeft', {name}, {}, true);
    }

    default:
      break;
  }
  return '';
}

export function MessageContent({
  message,
  onClickParticipants,
}: {
  message: MemberMessageEntity;
  onClickParticipants: (participants: User[]) => void;
}) {
  const htmlCaption = getContent(message);
  const content = replaceReactComponents(htmlCaption, [
    {start: '<strong>', end: '</strong>', render: text => <strong key={text}>{text}</strong>},
    {
      start: '[showmore]',
      end: '[/showmore]',
      render: text => (
        <ShowMoreButton key={text} onClick={() => onClickParticipants(message.targetedUsers())}>
          {text}
        </ShowMoreButton>
      ),
    },
  ]);
  return <p className="message-header-caption">{content}</p>;
}
