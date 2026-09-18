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

import {ReactNode} from 'react';

import {MemberLeaveReason} from '@wireapp/api-client/lib/conversation/data/';
import {CONVERSATION_EVENT} from '@wireapp/api-client/lib/event/';

import {MemberMessage as MemberMessageEntity} from 'Repositories/entity/message/memberMessage';
import {User} from 'Repositories/entity/User';
import {ClientEvent} from 'Repositories/event/Client';
import {Config} from 'src/script/Config';
import {SystemMessageType} from 'src/script/message/systemMessageType';
import {useApplicationContext, type RootContextValue} from 'src/script/page/rootProvider';
import {Declension, joinNames} from 'Util/localizerUtil';
import {createReactTranslationMarker, replaceReactComponents} from 'Util/localizerUtil/reactLocalizerUtil';
import {matchQualifiedIds} from 'Util/qualifiedId';

export const CONFIG = {
  MAX_USERS_VISIBLE: 17,
  MAX_WHOLE_TEAM_USERS_VISIBLE: 10,
  REDUCED_USERS_COUNT: 15,
} as const;

function generateNames(
  users: User[],
  translate: RootContextValue['translate'],
  declension = Declension.ACCUSATIVE,
  hasExtra = false,
) {
  const visibleUsers = hasExtra ? getVisibleUsers(users) : users;
  return joinNames(visibleUsers, translate, declension, hasExtra, true);
}

function getVisibleUsers(users: User[]) {
  return users.slice(0, CONFIG.REDUCED_USERS_COUNT);
}

const legalHoldLinkMarker = createReactTranslationMarker('member_message_legal_hold_link');
const legalHoldLinkDangerousSubstitutions = {
  '/link': legalHoldLinkMarker.end,
  link: legalHoldLinkMarker.start,
};

function ShowMoreButton({children, onClick}: {children: ReactNode; onClick: () => void}): ReactNode {
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

function getContent(message: MemberMessageEntity, translate: RootContextValue['translate']): string {
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

  const dativeUsers = generateNames(targetedUsers, translate, Declension.DATIVE, exceedsMaxVisibleUsers);
  const accusativeUsers = generateNames(targetedUsers, translate, Declension.ACCUSATIVE, exceedsMaxVisibleUsers);
  const name = message.senderName();

  switch (message.memberMessageType) {
    case SystemMessageType.CONVERSATION_CREATE: {
      if (message.name().length) {
        const exceedsMaxTeam = targetedUsers.length > CONFIG.MAX_WHOLE_TEAM_USERS_VISIBLE;
        if (message.allTeamMembers && exceedsMaxTeam) {
          const guestCount = targetedUsers.filter(userEntity => userEntity.isGuest()).length;
          if (!guestCount) {
            return translate('conversationCreateTeam');
          }

          const hasSingleGuest = guestCount === 1;
          return hasSingleGuest
            ? translate('conversationCreateTeamGuest')
            : translate('conversationCreateTeamGuests', {count: guestCount});
        }

        return exceedsMaxVisibleUsers
          ? translate('conversationCreateWithMore', {count: hiddenUsersCount.toString(), users: dativeUsers})
          : translate('conversationCreateWith', {users: dativeUsers});
      }

      if (actor.isMe) {
        return exceedsMaxVisibleUsers
          ? translate('conversationCreatedYouMore', {count: hiddenUsersCount.toString(), users: dativeUsers})
          : translate('conversationCreatedYou', {users: dativeUsers});
      }

      return exceedsMaxVisibleUsers
        ? translate('conversationCreatedMore', {count: hiddenUsersCount.toString(), name, users: dativeUsers})
        : translate('conversationCreated', {name, users: dativeUsers});
    }

    case SystemMessageType.CONVERSATION_RESUME: {
      return translate('conversationResume', {users: generateNames(targetedUsers, translate, Declension.DATIVE)});
    }

    default:
      break;
  }

  switch (message.type) {
    case CONVERSATION_EVENT.MEMBER_JOIN: {
      const senderJoined = matchQualifiedIds(message.otherUser(), actor);
      if (senderJoined) {
        return message.user().isMe
          ? translate('conversationMemberJoinedSelfYou')
          : translate('conversationMemberJoinedSelf', {name: message.senderName()});
      }

      if (message.user().isMe) {
        return exceedsMaxVisibleUsers
          ? translate('conversationMemberJoinedYouMore', {count: hiddenUsersCount.toString(), users: accusativeUsers})
          : translate('conversationMemberJoinedYou', {users: accusativeUsers});
      }
      return exceedsMaxVisibleUsers
        ? translate('conversationMemberJoinedMore', {count: hiddenUsersCount.toString(), name, users: accusativeUsers})
        : translate('conversationMemberJoined', {name, users: accusativeUsers});
    }

    case CONVERSATION_EVENT.MEMBER_LEAVE: {
      if (message.reason === MemberLeaveReason.LEGAL_HOLD_POLICY_CONFLICT) {
        if (message.userEntities().some(user => user.isMe)) {
          return translate(
            'conversationYouRemovedMissingLegalHoldConsent',
            undefined,
            legalHoldLinkDangerousSubstitutions,
          );
        }
        const users = generateNames(targetedUsers, translate);

        if (message.userEntities().length === 1) {
          return translate(
            'conversationMemberRemovedMissingLegalHoldConsent',
            {user: users},
            legalHoldLinkDangerousSubstitutions,
          );
        }
        if (exceedsMaxVisibleUsers) {
          return translate(
            'conversationMultipleMembersRemovedMissingLegalHoldConsentMore',
            {
              count: hiddenUsersCount.toString(),
              users,
            },
            legalHoldLinkDangerousSubstitutions,
          );
        }
        return translate(
          'conversationMultipleMembersRemovedMissingLegalHoldConsent',
          {users},
          legalHoldLinkDangerousSubstitutions,
        );
      }
      const temporaryGuestRemoval = message.otherUser().isMe && message.otherUser().isTemporaryGuest();
      if (temporaryGuestRemoval) {
        return translate('temporaryGuestLeaveMessage');
      }

      const senderLeft = matchQualifiedIds(message.otherUser(), actor);
      if (senderLeft) {
        return message.user().isMe
          ? translate('conversationMemberLeftYou')
          : translate('conversationMemberLeft', {name});
      }

      const allUsers = generateNames(targetedUsers, translate);
      if (!actor.id) {
        return translate('conversationMemberWereRemoved', {users: allUsers});
      }
      return actor.isMe
        ? translate('conversationMemberRemovedYou', {users: allUsers})
        : translate('conversationMemberRemoved', {name, users: allUsers});
    }

    case ClientEvent.CONVERSATION.TEAM_MEMBER_LEAVE: {
      return translate('conversationTeamLeft', {name});
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
  const {translate} = useApplicationContext();
  const htmlCaption = getContent(message, translate);
  const content = replaceReactComponents(htmlCaption, [
    {
      start: legalHoldLinkMarker.start,
      end: legalHoldLinkMarker.end,
      render(text): ReactNode {
        return (
          <a
            href={Config.getConfig().URL.SUPPORT.LEGAL_HOLD_BLOCK}
            data-uie-name="read-more-legal-hold"
            rel="nofollow noopener noreferrer"
            target="_blank"
          >
            {text}
          </a>
        );
      },
    },
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
