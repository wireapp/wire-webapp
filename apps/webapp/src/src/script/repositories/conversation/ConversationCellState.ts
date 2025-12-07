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

import {AssetTransferState} from 'Repositories/assets/AssetTransferState';
import type {Conversation} from 'Repositories/entity/Conversation';
import type {FileAsset} from 'Repositories/entity/message/FileAsset';
import type {MemberMessage} from 'Repositories/entity/message/MemberMessage';
import type {SystemMessage} from 'Repositories/entity/message/SystemMessage';
import type {Text} from 'Repositories/entity/message/Text';
import {t} from 'Util/LocalizerUtil';
import {getRenderedTextContent} from 'Util/messageRenderer';
import {matchQualifiedIds} from 'Util/QualifiedId';

import {ConversationStatusIcon} from './ConversationStatusIcon';

import {ConversationError} from '../../error/ConversationError';
import {E2EIVerificationMessageType} from '../../message/E2EIVerificationMessageType';

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

      if (messageEntity.isEphemeral()) {
        let summary;

        if (hasSingleMention) {
          summary = conversationEntity.isGroupOrChannel()
            ? t('conversationsSecondaryLineEphemeralMentionGroup')
            : t('conversationsSecondaryLineEphemeralMention');
        } else {
          summary = conversationEntity.isGroupOrChannel()
            ? t('conversationsSecondaryLineEphemeralReplyGroup')
            : t('conversationsSecondaryLineEphemeralReply');
        }

        return summary;
      }

      return conversationEntity.isGroupOrChannel()
        ? `${messageEntity.unsafeSenderName()}: ${(messageEntity.getFirstAsset() as Text)?.text}`
        : (messageEntity.getFirstAsset() as Text)?.text;
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
              ? t('conversationsSecondaryLineSummaryMissedCall', {number: activityCount})
              : t('conversationsSecondaryLineSummaryMissedCalls', {number: activityCount});
          }

          case ACTIVITY_TYPE.MENTION: {
            return activityCountIsOne
              ? t('conversationsSecondaryLineSummaryMention', {number: activityCount})
              : t('conversationsSecondaryLineSummaryMentions', {number: activityCount});
          }

          case ACTIVITY_TYPE.MESSAGE: {
            return activityCountIsOne
              ? t('conversationsSecondaryLineSummaryMessage', {number: activityCount})
              : t('conversationsSecondaryLineSummaryMessages', {number: activityCount});
          }

          case ACTIVITY_TYPE.PING: {
            return activityCountIsOne
              ? t('conversationsSecondaryLineSummaryPing', {number: activityCount})
              : t('conversationsSecondaryLineSummaryPings', {number: activityCount});
          }

          case ACTIVITY_TYPE.REPLY: {
            return activityCountIsOne
              ? t('conversationsSecondaryLineSummaryReply', {number: activityCount})
              : t('conversationsSecondaryLineSummaryReplies', {number: activityCount});
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
  description: (conversationEntity: Conversation): string => {
    const lastMessageEntity = conversationEntity.getNewestMessage();

    if (lastMessageEntity.isMember()) {
      const userCount = (lastMessageEntity as MemberMessage).userEntities().length;
      const hasUserCount = userCount >= 1;

      if (hasUserCount) {
        const userCountIsOne = userCount === 1;

        if ((lastMessageEntity as MemberMessage).isMemberJoin()) {
          if (userCountIsOne) {
            if (!(lastMessageEntity as MemberMessage).remoteUserEntities().length) {
              return t('conversationsSecondaryLinePersonAddedYou', {
                user: (lastMessageEntity as MemberMessage).user().name(),
              });
            }

            const [remoteUserEntity] = (lastMessageEntity as MemberMessage).remoteUserEntities();
            const userSelfJoined = lastMessageEntity.user().id === remoteUserEntity.id;
            const string = userSelfJoined
              ? t('conversationsSecondaryLinePersonAddedSelf', {user: remoteUserEntity.name()})
              : t('conversationsSecondaryLinePersonAdded', {user: remoteUserEntity.name()});

            return string;
          }

          return t('conversationsSecondaryLinePeopleAdded', {user: userCount});
        }

        if ((lastMessageEntity as MemberMessage).isMemberRemoval()) {
          if (userCountIsOne) {
            const [remoteUserEntity] = (lastMessageEntity as MemberMessage).remoteUserEntities();

            if (remoteUserEntity) {
              if ((lastMessageEntity as MemberMessage).isTeamMemberLeave()) {
                const name = (lastMessageEntity as MemberMessage).name() || remoteUserEntity.name();
                return t('conversationsSecondaryLinePersonRemovedTeam', {user: name});
              }

              const userSelfLeft = remoteUserEntity.id === lastMessageEntity.user().id;
              const string = userSelfLeft
                ? t('conversationsSecondaryLinePersonLeft', {user: remoteUserEntity.name()})
                : t('conversationsSecondaryLinePersonRemoved', {user: remoteUserEntity.name()});

              return string;
            }
          }

          return t('conversationsSecondaryLinePeopleLeft', {number: userCount});
        }
      }
    }

    const isConversationRename =
      lastMessageEntity.isSystem() && (lastMessageEntity as SystemMessage).isConversationRename();
    if (isConversationRename) {
      return t('conversationsSecondaryLineRenamed', {user: lastMessageEntity.user().name()});
    }

    return '';
  },
  icon: (conversationEntity: Conversation): ConversationStatusIcon | void => {
    return conversationEntity.showNotificationsEverything()
      ? ConversationStatusIcon.UNREAD_MESSAGES
      : ConversationStatusIcon.MUTED;
  },
  match: (conversationEntity: Conversation) => {
    const lastMessageEntity = conversationEntity.getNewestMessage();
    const isExpectedType = lastMessageEntity ? lastMessageEntity.isMember() || lastMessageEntity.isSystem() : false;
    const unreadEvents = conversationEntity.unreadState().allEvents;

    return conversationEntity.isGroupOrChannel() && unreadEvents.length > 0 && isExpectedType;
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
    const lastMessageEntity = conversationEntity.getNewestMessage();
    const selfUserId = conversationEntity.selfUser().id;

    const isMemberRemoval = lastMessageEntity && lastMessageEntity.isMember() && lastMessageEntity.isMemberRemoval();
    const wasSelfRemoved =
      isMemberRemoval &&
      !!(lastMessageEntity as MemberMessage)
        .userIds()
        .find(userId => matchQualifiedIds(userId, conversationEntity.selfUser()));
    if (wasSelfRemoved) {
      const selfLeft = lastMessageEntity.user().id === selfUserId;
      return selfLeft ? t('conversationsSecondaryLineYouLeft') : t('conversationsSecondaryLineYouWereRemoved');
    }

    return '';
  },
  icon: () => ConversationStatusIcon.UNREAD_MESSAGES,
  match: (conversationEntity: Conversation) => conversationEntity.isSelfUserRemoved(),
};

const _getStateUnreadMessage = {
  description: (conversationEntity: Conversation): string => {
    const unreadState = conversationEntity.unreadState();

    const {allMessages, systemMessages} = unreadState;

    const allUnread = [...allMessages, ...systemMessages];

    for (const messageEntity of allUnread) {
      let string;

      if (messageEntity.isPing()) {
        string = t('notificationPing');
      } else if (messageEntity.isContent() && messageEntity.hasAssetText()) {
        const assetText = messageEntity.getFirstAsset().text;
        string = getRenderedTextContent(assetText);
      } else if (messageEntity.isContent() && messageEntity.hasAsset()) {
        const assetEntity = messageEntity.getFirstAsset();
        const isUploaded = (assetEntity as FileAsset).status() === AssetTransferState.UPLOADED;

        if (isUploaded) {
          if (assetEntity.isAudio()) {
            string = t('notificationSharedAudio');
          } else if (assetEntity.isVideo()) {
            string = t('notificationSharedVideo');
          } else {
            string = t('notificationSharedFile');
          }
        }
      } else if (messageEntity.hasAssetLocation()) {
        string = t('notificationSharedLocation');
      } else if (messageEntity.hasAssetImage()) {
        string = t('notificationAssetAdd');
      } else if (messageEntity.isE2EIVerification()) {
        string =
          messageEntity.messageType === E2EIVerificationMessageType.VERIFIED
            ? t('conversation.AllE2EIDevicesVerifiedShort')
            : t('conversation.E2EIVerificationDegraded');
      } else if (messageEntity.isVerification()) {
        string = t('conversation.AllDevicesVerified');
      }

      if (!!string) {
        if (messageEntity.isEphemeral()) {
          return conversationEntity.isGroupOrChannel()
            ? t('conversationsSecondaryLineEphemeralMessageGroup')
            : t('conversationsSecondaryLineEphemeralMessage');
        }

        return conversationEntity.isGroupOrChannel() && !messageEntity.isE2EIVerification()
          ? `${messageEntity.unsafeSenderName()}: ${string}`
          : string;
      }
    }
    return '';
  },
  icon: () => ConversationStatusIcon.UNREAD_MESSAGES,
  match: (conversationEntity: Conversation) => {
    const {allMessages, systemMessages} = conversationEntity.unreadState();
    const hasUnreadMessages = [...allMessages, ...systemMessages].length > 0;
    return hasUnreadMessages;
  },
};

const _getStateUserName = {
  description: (conversationEntity: Conversation): string => {
    const [userEntity] = conversationEntity.participating_user_ets();
    const hasHandle = userEntity && userEntity.username();
    return hasHandle ? userEntity.handle : '';
  },
  icon: (conversationEntity: Conversation): ConversationStatusIcon.PENDING_CONNECTION | void => {
    if (conversationEntity.isRequest()) {
      return ConversationStatusIcon.PENDING_CONNECTION;
    }
  },
  match: (conversationEntity: Conversation): boolean => {
    const lastMessageEntity = conversationEntity.getNewestMessage();
    const isMemberJoin =
      lastMessageEntity && lastMessageEntity.isMember() && (lastMessageEntity as MemberMessage).isMemberJoin();
    const isEmpty1to1Conversation = conversationEntity.is1to1() && isMemberJoin;

    return conversationEntity.isRequest() || isEmpty1to1Conversation;
  },
};

export const generateCellState = (
  conversationEntity: Conversation,
): {description: string; icon: ConversationStatusIcon | void} => {
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
