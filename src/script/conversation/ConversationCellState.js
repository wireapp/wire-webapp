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

import {t} from 'utils/LocalizerUtil';

window.z = window.z || {};
window.z.conversation = z.conversation || {};

z.conversation.ConversationCellState = (() => {
  const ACTIVITY_TYPE = {
    CALL: 'ConversationCellState.ACTIVITY_TYPE.CALL',
    MENTION: 'ConversationCellState.ACTIVITY_TYPE.MENTION',
    MESSAGE: 'ConversationCellState.ACTIVITY_TYPE.MESSAGE',
    PING: 'ConversationCellState.ACTIVITY_TYPE.PING',
    REPLY: 'ConversationCellState.ACTIVITY_TYPE.REPLY',
  };

  const _accumulateSummary = (conversationEntity, prioritizeMentionAndReply) => {
    const {
      calls: unreadCalls,
      otherMessages: unreadOtherMessages,
      pings: unreadPings,
      selfMentions: unreadSelfMentions,
      selfReplies: unreadSelfReplies,
    } = conversationEntity.unreadState();

    // Sorted in order of alert type priority
    const activities = {
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
          ? `${messageEntity.unsafeSenderName()}: ${messageEntity.get_first_asset().text}`
          : messageEntity.get_first_asset().text;
      }
    }

    return _generateSummaryDescription(activities);
  };

  const _generateSummaryDescription = activities => {
    return Object.entries(activities)
      .map(([activity, activityCount]) => {
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
              throw new z.error.ConversationError();
          }
        }
      })
      .filter(activityString => !!activityString)
      .join(', ');
  };

  const _getStateAlert = {
    description: conversationEntity => _accumulateSummary(conversationEntity, true),
    icon: conversationEntity => {
      const {
        calls: unreadCalls,
        pings: unreadPings,
        selfMentions: unreadSelfMentions,
        selfReplies: unreadSelfReplies,
      } = conversationEntity.unreadState();

      if (unreadSelfMentions.length) {
        return z.conversation.ConversationStatusIcon.UNREAD_MENTION;
      }

      if (unreadSelfReplies.length) {
        return z.conversation.ConversationStatusIcon.UNREAD_REPLY;
      }

      if (unreadCalls.length) {
        return z.conversation.ConversationStatusIcon.MISSED_CALL;
      }

      if (unreadPings.length) {
        return z.conversation.ConversationStatusIcon.UNREAD_PING;
      }
    },
    match: conversationEntity => {
      const {
        calls: unreadCalls,
        pings: unreadPings,
        selfMentions: unreadSelfMentions,
        selfReplies: unreadSelfReplies,
      } = conversationEntity.unreadState();

      const hasUnreadActivities =
        unreadCalls.length > 0 ||
        unreadPings.length > 0 ||
        unreadSelfMentions.length > 0 ||
        unreadSelfReplies.length > 0;

      return hasUnreadActivities;
    },
  };

  const _getStateCall = {
    description: conversationEntity => {
      const creatorName = conversationEntity.call().creatingUser.first_name();
      return t('conversationsSecondaryLineIncomingCall', creatorName);
    },
    icon: () => z.conversation.ConversationStatusIcon.NONE,
    match: conversationEntity => {
      return conversationEntity.call()
        ? conversationEntity.call().canJoinState() && !conversationEntity.call().selfUserJoined()
        : false;
    },
  };

  const _getStateDefault = {
    description: () => '',
    icon: () => z.conversation.ConversationStatusIcon.NONE,
  };

  const _getStateGroupActivity = {
    description: conversationEntity => {
      const lastMessageEntity = conversationEntity.getLastMessage();

      if (lastMessageEntity.is_member()) {
        const userCount = lastMessageEntity.userEntities().length;
        const hasUserCount = userCount >= 1;

        if (hasUserCount) {
          const userCountIsOne = userCount === 1;

          if (lastMessageEntity.isMemberJoin()) {
            if (userCountIsOne) {
              if (!lastMessageEntity.remoteUserEntities().length) {
                return t('conversationsSecondaryLinePersonAddedYou', lastMessageEntity.user().name());
              }

              const [remoteUserEntity] = lastMessageEntity.remoteUserEntities();
              const userSelfJoined = lastMessageEntity.user().id === remoteUserEntity.id;
              const string = userSelfJoined
                ? t('conversationsSecondaryLinePersonAddedSelf', remoteUserEntity.name())
                : t('conversationsSecondaryLinePersonAdded', remoteUserEntity.name());

              return string;
            }

            return t('conversationsSecondaryLinePeopleAdded', userCount);
          }

          if (lastMessageEntity.isMemberRemoval()) {
            if (userCountIsOne) {
              const [remoteUserEntity] = lastMessageEntity.remoteUserEntities();

              if (remoteUserEntity) {
                if (lastMessageEntity.isTeamMemberLeave()) {
                  const name = lastMessageEntity.name() || remoteUserEntity.name();
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

      const isConversationRename = lastMessageEntity.is_system() && lastMessageEntity.is_conversation_rename();
      if (isConversationRename) {
        return t('conversationsSecondaryLineRenamed', lastMessageEntity.user().name());
      }
    },
    icon: conversationEntity => {
      const lastMessageEntity = conversationEntity.getLastMessage();
      const isMemberRemoval = lastMessageEntity.is_member() && lastMessageEntity.isMemberRemoval();

      if (isMemberRemoval) {
        return conversationEntity.showNotificationsEverything()
          ? z.conversation.ConversationStatusIcon.UNREAD_MESSAGES
          : z.conversation.ConversationStatusIcon.MUTED;
      }
    },
    match: conversationEntity => {
      const lastMessageEntity = conversationEntity.getLastMessage();
      const isExpectedType = lastMessageEntity ? lastMessageEntity.is_member() || lastMessageEntity.is_system() : false;
      const unreadEvents = conversationEntity.unreadState().allEvents;

      return conversationEntity.isGroup() && unreadEvents.length > 0 && isExpectedType;
    },
  };

  const _getStateMuted = {
    description: conversationEntity => {
      return _accumulateSummary(conversationEntity, conversationEntity.showNotificationsMentionsAndReplies());
    },
    icon: conversationEntity => {
      const hasSelfMentions = conversationEntity.unreadState().selfMentions.length > 0;
      const hasSelfReplies = conversationEntity.unreadState().selfReplies.length > 0;
      const showMentionsIcon = hasSelfMentions && conversationEntity.showNotificationsMentionsAndReplies();
      const showRepliesIcon = hasSelfReplies && conversationEntity.showNotificationsMentionsAndReplies();

      if (showMentionsIcon) {
        return z.conversation.ConversationStatusIcon.UNREAD_MENTION;
      }

      if (showRepliesIcon) {
        return z.conversation.ConversationStatusIcon.UNREAD_REPLY;
      }

      return z.conversation.ConversationStatusIcon.MUTED;
    },
    match: conversationEntity => !conversationEntity.showNotificationsEverything(),
  };

  const _getStateRemoved = {
    description: conversationEntity => {
      const lastMessageEntity = conversationEntity.getLastMessage();
      const selfUserId = conversationEntity.selfUser().id;

      const isMemberRemoval = lastMessageEntity && lastMessageEntity.is_member() && lastMessageEntity.isMemberRemoval();
      const wasSelfRemoved = isMemberRemoval && lastMessageEntity.userIds().includes(selfUserId);
      if (wasSelfRemoved) {
        const selfLeft = lastMessageEntity.user().id === selfUserId;
        return selfLeft ? t('conversationsSecondaryLineYouLeft') : t('conversationsSecondaryLineYouWereRemoved');
      }

      return '';
    },
    icon: () => z.conversation.ConversationStatusIcon.NONE,
    match: conversationEntity => conversationEntity.removed_from_conversation(),
  };

  const _getStateUnreadMessage = {
    description: conversationEntity => {
      const unreadMessages = conversationEntity.unreadState().allMessages;

      for (const messageEntity of unreadMessages) {
        let string;

        if (messageEntity.is_ping()) {
          string = t('notificationPing');
        } else if (messageEntity.has_asset_text()) {
          string = true;
        } else if (messageEntity.has_asset()) {
          const assetEntity = messageEntity.get_first_asset();
          const isUploaded = assetEntity.status() === z.assets.AssetTransferState.UPLOADED;

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
          const stateText = hasString ? string : messageEntity.get_first_asset().text;
          return conversationEntity.isGroup() ? `${messageEntity.unsafeSenderName()}: ${stateText}` : stateText;
        }
      }
    },
    icon: () => z.conversation.ConversationStatusIcon.UNREAD_MESSAGES,
    match: conversationEntity => conversationEntity.unreadState().allMessages.length > 0,
  };

  const _getStateUserName = {
    description: conversationEntity => {
      const [userEntity] = conversationEntity.participating_user_ets();
      const hasUsername = userEntity && userEntity.username();
      return hasUsername ? `@${userEntity.username()}` : '';
    },
    icon: conversationEntity => {
      if (conversationEntity.isRequest()) {
        return z.conversation.ConversationStatusIcon.PENDING_CONNECTION;
      }
    },
    match: conversationEntity => {
      const lastMessageEntity = conversationEntity.getLastMessage();
      const isMemberJoin = lastMessageEntity && lastMessageEntity.is_member() && lastMessageEntity.isMemberJoin();
      const isEmpty1to1Conversation = conversationEntity.is1to1() && isMemberJoin;

      return conversationEntity.isRequest() || isEmpty1to1Conversation;
    },
  };

  return {
    generate: conversationEntity => {
      const states = [
        _getStateCall,
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
    },
  };
})();
