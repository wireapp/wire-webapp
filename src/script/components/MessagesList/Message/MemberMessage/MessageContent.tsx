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

import {MemberMessage as MemberMessageEntity} from 'src/script/entity/message/MemberMessage';
import {useKoSubscribableChildren} from 'Util/ComponentUtil';

export const config = {
  MAX_USERS_VISIBLE: 17,
  MAX_WHOLE_TEAM_USERS_VISIBLE: 10,
  REDUCED_USERS_COUNT: 15,
} as const;

/*
function getMessage(message: MemberMessageEntity) {
  if (!message.hasUsers()) {
    return '';
  }
  const exceedsMaxVisibleUsers = message.joinedUserEntities().length > config.MAX_USERS_VISIBLE;

  const replaceShowMore = {
    '/showmore': '</a>',
    showmore: '<a class="message-header-show-more" data-uie-name="do-show-more">',
  };

  const count = message.hiddenUserCount();
  const dativeUsers = message.generateNameString(exceedsMaxVisibleUsers, Declension.DATIVE);
  const accusativeUsers = message.generateNameString(exceedsMaxVisibleUsers, Declension.ACCUSATIVE);
  const name = message.senderName();

  switch (message.memberMessageType) {
    case SystemMessageType.CONVERSATION_CREATE: {
      if (message.name().length) {
        const exceedsMaxTeam = message.joinedUserEntities().length > config.MAX_WHOLE_TEAM_USERS_VISIBLE;
        if (message.allTeamMembers && exceedsMaxTeam) {
          const guestCount = message.joinedUserEntities().filter(userEntity => userEntity.isGuest()).length;
          if (!guestCount) {
            return t('conversationCreateTeam', {}, replaceShowMore);
          }

          const hasSingleGuest = guestCount === 1;
          return hasSingleGuest
            ? t('conversationCreateTeamGuest', {}, replaceShowMore)
            : t('conversationCreateTeamGuests', guestCount, replaceShowMore);
        }

        return exceedsMaxVisibleUsers
          ? t('conversationCreateWithMore', {count: count.toString(), users: dativeUsers}, replaceShowMore)
          : t('conversationCreateWith', dativeUsers);
      }

      if (message.user().isMe) {
        return exceedsMaxVisibleUsers
          ? t('conversationCreatedYouMore', {count: count.toString(), users: dativeUsers}, replaceShowMore)
          : t('conversationCreatedYou', dativeUsers);
      }

      return exceedsMaxVisibleUsers
        ? t('conversationCreatedMore', {count: count.toString(), name, users: dativeUsers}, replaceShowMore)
        : t('conversationCreated', {name, users: dativeUsers});
    }

    case SystemMessageType.CONVERSATION_RESUME: {
      return t('conversationResume', message.generateNameString(false, Declension.DATIVE));
    }

    default:
      break;
  }

  switch (message.type) {
    case CONVERSATION_EVENT.MEMBER_JOIN: {
      const senderJoined = matchQualifiedIds(message.otherUser(), message.user());
      if (senderJoined) {
        return message.user().isMe
          ? t('conversationMemberJoinedSelfYou')
          : t('conversationMemberJoinedSelf', message.senderName());
      }

      if (message.user().isMe) {
        return exceedsMaxVisibleUsers
          ? t('conversationMemberJoinedYouMore', {count: count.toString(), users: accusativeUsers}, replaceShowMore)
          : t('conversationMemberJoinedYou', accusativeUsers, replaceShowMore);
      }
      return exceedsMaxVisibleUsers
        ? t('conversationMemberJoinedMore', {count: count.toString(), name, users: accusativeUsers}, replaceShowMore)
        : t('conversationMemberJoined', {name, users: accusativeUsers}, replaceShowMore);
    }

    case CONVERSATION_EVENT.MEMBER_LEAVE: {
      if (message.reason === MemberLeaveReason.LEGAL_HOLD_POLICY_CONFLICT) {
        return message.generateLegalHoldLeaveMessage();
      }
      const temporaryGuestRemoval = message.otherUser().isMe && message.otherUser().isTemporaryGuest();
      if (temporaryGuestRemoval) {
        return t('temporaryGuestLeaveMessage');
      }

      const senderLeft = matchQualifiedIds(message.otherUser(), message.user());
      if (senderLeft) {
        return message.user().isMe ? t('conversationMemberLeftYou') : t('conversationMemberLeft', name);
      }

      const allUsers = message.generateNameString();
      if (!message.user().isMe && !name) {
        return t('conversationMemberWereRemoved', allUsers);
      }
      return message.user().isMe
        ? t('conversationMemberRemovedYou', allUsers)
        : t('conversationMemberRemoved', {name, users: allUsers});
    }

    case ClientEvent.CONVERSATION.TEAM_MEMBER_LEAVE: {
      return t('conversationTeamLeft', name);
    }

    default:
      break;
  }
  return '';
}
*/

export function MessageContent({message}: {message: MemberMessageEntity}) {
  const {htmlCaption} = useKoSubscribableChildren(message, ['htmlCaption']);
  return <p className="message-header-caption" dangerouslySetInnerHTML={{__html: htmlCaption}}></p>;
  //const textContent = getMessage(message);

  //return <p className="message-header-caption">{textContent}</p>;
}
