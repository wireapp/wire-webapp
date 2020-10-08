/*
 * Wire
 * Copyright (C) 2018 Wire Swiss GmbH
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

import {t} from 'Util/LocalizerUtil';
import {getRenderedTextContent} from 'Util/messageRenderer';

import type {Text} from '../entity/message/Text';
import type {FileAsset} from '../entity/message/FileAsset';
import {AssetTransferState} from '../assets/AssetTransferState';
import type {Conversation} from '../entity/Conversation';
import {ConversationStatusIcon} from './ConversationStatusIcon';
import {ConversationError} from '../error/ConversationError';
import type {MemberMessage} from '../entity/message/MemberMessage';
import type {SystemMessage} from '../entity/message/SystemMessage';

enum ACTIVITY_TYPE {
  CALL = 'ConversationCellState.ACTIVITY_TYPE.CALL',
  MENTION = 'ConversationCellState.ACTIVITY_TYPE.MENTION',
  MESSAGE = 'ConversationCellState.ACTIVITY_TYPE.MESSAGE',
  PING = 'ConversationCellState.ACTIVITY_TYPE.PING',
  REPLY = 'ConversationCellState.ACTIVITY_TYPE.REPLY',
}

const _accumulateSummary = (conversationEntity: Conversation, prioritizeMentionAndReply?: boolean): string => {
  const {
    calls: unreadCalls,
    otherMessages: unreadOtherMessages,
    pings: unreadPings,
    selfMentions: unreadSelfMentions,
    selfReplies: unreadSelfReplies,
  } = conversationEntity.unreadState();

  /** Sorted in order of alert type priority */
  const activities: Record<ACTIVITY_TYPE, number> = {
    [ACTIVITY_TYPE.MENTION]: unreadSelfMentions.length,
    [ACTIVITY_TYPE.REPLY]: unreadSelfReplies.length,
    [ACTIVITY_TYPE.CALL]: unreadCalls.length,
    [ACTIVITY_TYPE.PING]: unreadPings.length,
    [ACTIVITY_TYPE.MESSAGE]: unreadOtherMessages.length,
  };

  const alertCount = Object.values(activities).reduce((accumulator, value) => accumulator + value, 0);
  const hasSingleAlert = alertCount === 1;
  const hasOnlyReplies = activities[ACTIVITY_TYPE.REPLY] > 0 && alertCount === activities[ACTIVITY_TYPE.REPLY];

  if (prioritizeMentionAndReply && (hasSingleAlert || hasOnlyReplies)) {
    const hasSingleMention = activities[ACTIVITY_TYPE.MENTION] === 1;

    if (hasSingleMention || hasOnlyReplies) {
      const [mentionMessageEntity] = unreadSelfMentions;
      const [replyMessageEntity] = unreadSelfReplies;
      const messageEntity = mentionMessageEntity || replyMessageEntity;

      if (messageEntity.is_ephemeral()) {
        let summary;

        if (hasSingleMention) {
          summary = conversationEntity.isGroup()
            ? t('conversationsSecondaryLineEphemeralMentionGroup')
            : t('conversationsSecondaryLineEphemeralMention');
        } else {
          summary = conversationEntity.isGroup()
            ? t('conversationsSecondaryLineEphemeralReplyGroup')
            : t('conversationsSecondaryLineEphemeralReply');
        }

        return summary;
      }

      return conversationEntity.isGroup()
        ? `${messageEntity.unsafeSenderName()}: ${(messageEntity.get_first_asset() as Text).text}`
        : (messageEntity.get_first_asset() as Text).text;
    }
  }

  return _generateSummaryDescription(activities);
};

const _generateSummaryDescription = (activities: Record<ACTIVITY_TYPE, number>): string => {
  return Object.entries(activities)
    .map(([activity, activityCount]): string | void => {
      if (activityCount) {
        const activityCountIsOne = activityCount === 1;

        switch (activity) {
          case ACTIVITY_TYPE.CALL: {
            return activityCountIsOne
              ? t('conversationsSecondaryLineSummaryMissedCall', activityCount)
              : t('conversationsSecondaryLineSummaryMissedCalls', activityCount);
          }

          case ACTIVITY_TYPE.MENTION: {
            return activityCountIsOne
              ? t('conversationsSecondaryLineSummaryMention', activityCount)
              : t('conversationsSecondaryLineSummaryMentions', activityCount);
          }

          case ACTIVITY_TYPE.MESSAGE: {
            return activityCountIsOne
              ? t('conversationsSecondaryLineSummaryMessage', activityCount)
              : t('conversationsSecondaryLineSummaryMessages', activityCount);
          }

          case ACTIVITY_TYPE.PING: {
            return activityCountIsOne
              ? t('conversationsSecondaryLineSummaryPing', activityCount)
              : t('conversationsSecondaryLineSummaryPings', activityCount);
          }

          case ACTIVITY_TYPE.REPLY: {
            return activityCountIsOne
              ? t('conversationsSecondaryLineSummaryReply', activityCount)
              : t('conversationsSecondaryLineSummaryReplies', activityCount);
          }

          default:
            throw new ConversationError(ConversationError.TYPE.UNKNOWN_ACTIVITY, `Unknown activity "${activity}"`);
        }
      }
    })
    .filter(activityString => !!activityString)
    .join(', ');
};

const _getStateAlert = {
  description: (conversationEntity: Conversation) => _accumulateSummary(conversationEntity, true),
  icon: (conversationEntity: Conversation): ConversationStatusIcon | void => {
    const {
      calls: unreadCalls,
      pings: unreadPings,
      selfMentions: unreadSelfMentions,
      selfReplies: unreadSelfReplies,
    } = conversationEntity.unreadState();

    if (unreadSelfMentions.length) {
      return ConversationStatusIcon.UNREAD_MENTION;
    }

    if (unreadSelfReplies.length) {
      return ConversationStatusIcon.UNREAD_REPLY;
    }

    if (unreadCalls.length) {
      return ConversationStatusIcon.MISSED_CALL;
    }

    if (unreadPings.length) {
      return ConversationStatusIcon.UNREAD_PING;
    }
  },
  match: (conversationEntity: Conversation) => {
    const {
      calls: unreadCalls,
      pings: unreadPings,
      selfMentions: unreadSelfMentions,
      selfReplies: unreadSelfReplies,
    } = conversationEntity.unreadState();

    const hasUnreadActivities =
      unreadCalls.length > 0 || unreadPings.length > 0 || unreadSelfMentions.length > 0 || unreadSelfReplies.length > 0;

    return hasUnreadActivities;
  },
};

const _getStateDefault = {
  description: () => '',
  icon: () => ConversationStatusIcon.NONE,
};

const _getStateGroupActivity = {
  description: (conversationEntity: Conversation): string | void => {
    const lastMessageEntity = conversationEntity.getLastMessage();

    if (lastMessageEntity.isMember()) {
      const userCount = (lastMessageEntity as MemberMessage).userEntities().length;
      const hasUserCount = userCount >= 1;

      if (hasUserCount) {
        const userCountIsOne = userCount === 1;

        if ((lastMessageEntity as MemberMessage).isMemberJoin()) {
          if (userCountIsOne) {
            if (!(lastMessageEntity as MemberMessage).remoteUserEntities().length) {
              return t('conversationsSecondaryLinePersonAddedYou', (lastMessageEntity as MemberMessage).user().name());
            }

            const [remoteUserEntity] = (lastMessageEntity as MemberMessage).remoteUserEntities();
            const userSelfJoined = lastMessageEntity.user().id === remoteUserEntity.id;
            const string = userSelfJoined
              ? t('conversationsSecondaryLinePersonAddedSelf', remoteUserEntity.name())
              : t('conversationsSecondaryLinePersonAdded', remoteUserEntity.name());

            return string;
          }

          return t('conversationsSecondaryLinePeopleAdded', userCount);
        }

        if ((lastMessageEntity as MemberMessage).isMemberRemoval()) {
          if (userCountIsOne) {
            const [remoteUserEntity] = (lastMessageEntity as MemberMessage).remoteUserEntities();

            if (remoteUserEntity) {
              if ((lastMessageEntity as MemberMessage).isTeamMemberLeave()) {
                const name = (lastMessageEntity as MemberMessage).name() || remoteUserEntity.name();
                return t('conversationsSecondaryLinePersonRemovedTeam', name);
              }

              const userSelfLeft = remoteUserEntity.id === lastMessageEntity.user().id;
              const string = userSelfLeft
                ? t('conversationsSecondaryLinePersonLeft', remoteUserEntity.name())
                : t('conversationsSecondaryLinePersonRemoved', remoteUserEntity.name());

              return string;
            }
          }

          return t('conversationsSecondaryLinePeopleLeft', userCount);
        }
      }
    }

    const isConversationRename =
      lastMessageEntity.is_system() && (lastMessageEntity as SystemMessage).is_conversation_rename();
    if (isConversationRename) {
      return t('conversationsSecondaryLineRenamed', lastMessageEntity.user().name());
    }
  },
  icon: (conversationEntity: Conversation): ConversationStatusIcon | void => {
    const lastMessageEntity = conversationEntity.getLastMessage();
    const isMemberRemoval = lastMessageEntity.isMember() && (lastMessageEntity as MemberMessage).isMemberRemoval();

    if (isMemberRemoval) {
      return conversationEntity.showNotificationsEverything()
        ? ConversationStatusIcon.UNREAD_MESSAGES
        : ConversationStatusIcon.MUTED;
    }
  },
  match: (conversationEntity: Conversation) => {
    const lastMessageEntity = conversationEntity.getLastMessage();
    const isExpectedType = lastMessageEntity ? lastMessageEntity.isMember() || lastMessageEntity.is_system() : false;
    const unreadEvents = conversationEntity.unreadState().allEvents;

    return conversationEntity.isGroup() && unreadEvents.length > 0 && isExpectedType;
  },
};

const _getStateMuted = {
  description: (conversationEntity: Conversation) => {
    return _accumulateSummary(conversationEntity, conversationEntity.showNotificationsMentionsAndReplies());
  },
  icon: (conversationEntity: Conversation) => {
    const hasSelfMentions = conversationEntity.unreadState().selfMentions.length > 0;
    const hasSelfReplies = conversationEntity.unreadState().selfReplies.length > 0;
    const showMentionsIcon = hasSelfMentions && conversationEntity.showNotificationsMentionsAndReplies();
    const showRepliesIcon = hasSelfReplies && conversationEntity.showNotificationsMentionsAndReplies();

    if (showMentionsIcon) {
      return ConversationStatusIcon.UNREAD_MENTION;
    }

    if (showRepliesIcon) {
      return ConversationStatusIcon.UNREAD_REPLY;
    }

    return ConversationStatusIcon.MUTED;
  },
  match: (conversationEntity: Conversation) => !conversationEntity.showNotificationsEverything(),
};

const _getStateRemoved = {
  description: (conversationEntity: Conversation) => {
    const lastMessageEntity = conversationEntity.getLastMessage();
    const selfUserId = conversationEntity.selfUser().id;

    const isMemberRemoval =
      lastMessageEntity && lastMessageEntity.isMember() && (lastMessageEntity as MemberMessage).isMemberRemoval();
    const wasSelfRemoved = isMemberRemoval && (lastMessageEntity as MemberMessage).userIds().includes(selfUserId);
    if (wasSelfRemoved) {
      const selfLeft = lastMessageEntity.user().id === selfUserId;
      return selfLeft ? t('conversationsSecondaryLineYouLeft') : t('conversationsSecondaryLineYouWereRemoved');
    }

    return '';
  },
  icon: () => ConversationStatusIcon.NONE,
  match: (conversationEntity: Conversation) => conversationEntity.removed_from_conversation(),
};

const _getStateUnreadMessage = {
  description: (conversationEntity: Conversation): string | void => {
    const unreadMessages = conversationEntity.unreadState().allMessages;

    for (const messageEntity of unreadMessages) {
      let string;

      if (messageEntity.is_ping()) {
        string = t('notificationPing');
      } else if (messageEntity.has_asset_text()) {
        string = true;
      } else if (messageEntity.has_asset()) {
        const assetEntity = messageEntity.get_first_asset();
        const isUploaded = (assetEntity as FileAsset).status() === AssetTransferState.UPLOADED;

        if (isUploaded) {
          if (assetEntity.is_audio()) {
            string = t('notificationSharedAudio');
          } else if (assetEntity.is_video()) {
            string = t('notificationSharedVideo');
          } else {
            string = t('notificationSharedFile');
          }
        }
      } else if (messageEntity.has_asset_location()) {
        string = t('notificationSharedLocation');
      } else if (messageEntity.has_asset_image()) {
        string = t('notificationAssetAdd');
      }

      if (!!string) {
        if (messageEntity.is_ephemeral()) {
          return conversationEntity.isGroup()
            ? t('conversationsSecondaryLineEphemeralMessageGroup')
            : t('conversationsSecondaryLineEphemeralMessage');
        }

        const hasString = string && string !== true;
        const stateText: string = hasString
          ? (string as string)
          : getRenderedTextContent((messageEntity.get_first_asset() as Text).text);
        return conversationEntity.isGroup() ? `${messageEntity.unsafeSenderName()}: ${stateText}` : stateText;
      }
    }
  },
  icon: () => ConversationStatusIcon.UNREAD_MESSAGES,
  match: (conversationEntity: Conversation) => conversationEntity.unreadState().allMessages.length > 0,
};

const _getStateUserName = {
  description: (conversationEntity: Conversation): string => {
    const [userEntity] = conversationEntity.participating_user_ets();
    const hasUsername = userEntity && userEntity.username();
    return hasUsername ? `@${userEntity.username()}` : '';
  },
  icon: (conversationEntity: Conversation): ConversationStatusIcon.PENDING_CONNECTION | void => {
    if (conversationEntity.isRequest()) {
      return ConversationStatusIcon.PENDING_CONNECTION;
    }
  },
  match: (conversationEntity: Conversation): boolean => {
    const lastMessageEntity = conversationEntity.getLastMessage();
    const isMemberJoin =
      lastMessageEntity && lastMessageEntity.isMember() && (lastMessageEntity as MemberMessage).isMemberJoin();
    const isEmpty1to1Conversation = conversationEntity.is1to1() && isMemberJoin;

    return conversationEntity.isRequest() || isEmpty1to1Conversation;
  },
};

export const generateCellState = (
  conversationEntity: Conversation,
): {description: string | void; icon: ConversationStatusIcon | void} => {
  const states = [
    _getStateRemoved,
    _getStateMuted,
    _getStateAlert,
    _getStateGroupActivity,
    _getStateUnreadMessage,
    _getStateUserName,
  ];
  const matchingState = states.find(state => state.match(conversationEntity)) || _getStateDefault;

  return {
    description: matchingState.description(conversationEntity),
    icon: matchingState.icon(conversationEntity),
  };
};
