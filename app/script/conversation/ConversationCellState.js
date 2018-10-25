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

'use strict';

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

    // sorted in order of priority
    const activities = {
      [ACTIVITY_TYPE.MENTION]: unreadSelfMentions.length,
      [ACTIVITY_TYPE.REPLY]: unreadSelfReplies.length,
      [ACTIVITY_TYPE.CALL]: unreadCalls.length,
      [ACTIVITY_TYPE.PING]: unreadPings.length,
      [ACTIVITY_TYPE.MESSAGE]: unreadOtherMessages.length,
    };

    if (prioritizeMentionAndReply) {
      if (activities[ACTIVITY_TYPE.MENTION].length === 1 || activities[ACTIVITY_TYPE.REPLY].length === 1) {
        const numberOfAlerts = Object.values(activities).reduce((accumulator, value) => accumulator + value, 0);

        if (numberOfAlerts === 1) {
          const [messageEntity] = unreadSelfMentions;

          if (messageEntity.is_ephemeral()) {
            const stringId = conversationEntity.isGroup()
              ? z.string.conversationsSecondaryLineEphemeralMentionGroup
              : z.string.conversationsSecondaryLineEphemeralMention;
            return z.l10n.text(stringId);
          }

          return conversationEntity.isGroup()
            ? `${messageEntity.unsafeSenderName()}: ${messageEntity.get_first_asset().text}`
            : messageEntity.get_first_asset().text;
        }
      }
    }

    return _generateSummaryDescription(activities);
  };

  const _generateSummaryDescription = activities => {
    return Object.entries(activities)
      .map(([activity, activityCount]) => {
        if (activityCount) {
          const activityCountIsOne = activityCount === 1;
          let stringId = undefined;

          switch (activity) {
            case ACTIVITY_TYPE.CALL: {
              stringId = activityCountIsOne
                ? z.string.conversationsSecondaryLineSummaryMissedCall
                : z.string.conversationsSecondaryLineSummaryMissedCalls;
              break;
            }

            case ACTIVITY_TYPE.MENTION: {
              stringId = activityCountIsOne
                ? z.string.conversationsSecondaryLineSummaryMention
                : z.string.conversationsSecondaryLineSummaryMentions;
              break;
            }

            case ACTIVITY_TYPE.MESSAGE: {
              stringId = activityCountIsOne
                ? z.string.conversationsSecondaryLineSummaryMessage
                : z.string.conversationsSecondaryLineSummaryMessages;
              break;
            }

            case ACTIVITY_TYPE.PING: {
              stringId = activityCountIsOne
                ? z.string.conversationsSecondaryLineSummaryPing
                : z.string.conversationsSecondaryLineSummaryPings;
              break;
            }

            default:
              throw new z.error.ConversationError();
          }

          return z.l10n.text(stringId, activityCount);
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
      } = conversationEntity.unreadState();

      if (unreadSelfMentions.length) {
        return z.conversation.ConversationStatusIcon.UNREAD_MENTION;
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
      } = conversationEntity.unreadState();
      return unreadCalls.length || unreadPings.length || unreadSelfMentions.length;
    },
  };

  const _getStateCall = {
    description: conversationEntity => {
      const creatorName = conversationEntity.call().creatingUser.first_name();
      return z.l10n.text(z.string.conversationsSecondaryLineIncomingCall, creatorName);
    },
    icon: () => z.conversation.ConversationStatusIcon.NONE,
    match: conversationEntity => {
      if (conversationEntity.call()) {
        return conversationEntity.call().canJoinState() && !conversationEntity.call().selfUserJoined();
      }
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
                return z.l10n.text(z.string.conversationsSecondaryLinePersonAddedYou, lastMessageEntity.user().name());
              }

              const [remoteUserEntity] = lastMessageEntity.remoteUserEntities();
              const userSelfJoined = lastMessageEntity.user().id === remoteUserEntity.id;
              const stringId = userSelfJoined
                ? z.string.conversationsSecondaryLinePersonAddedSelf
                : z.string.conversationsSecondaryLinePersonAdded;

              return z.l10n.text(stringId, remoteUserEntity.name());
            }

            return z.l10n.text(z.string.conversationsSecondaryLinePeopleAdded, userCount);
          }

          if (lastMessageEntity.isMemberRemoval()) {
            if (userCountIsOne) {
              const [remoteUserEntity] = lastMessageEntity.remoteUserEntities();

              if (remoteUserEntity) {
                if (lastMessageEntity.isTeamMemberLeave()) {
                  const name = lastMessageEntity.name() || remoteUserEntity.name();
                  return z.l10n.text(z.string.conversationsSecondaryLinePersonRemovedTeam, name);
                }

                const userSelfLeft = remoteUserEntity.id === lastMessageEntity.user().id;
                const stringId = userSelfLeft
                  ? z.string.conversationsSecondaryLinePersonLeft
                  : z.string.conversationsSecondaryLinePersonRemoved;

                return z.l10n.text(stringId, remoteUserEntity.name());
              }
            }

            return z.l10n.text(z.string.conversationsSecondaryLinePeopleLeft, userCount);
          }
        }
      }

      const isConversationRename = lastMessageEntity.is_system() && lastMessageEntity.is_conversation_rename();
      if (isConversationRename) {
        return z.l10n.text(z.string.conversationsSecondaryLineRenamed, lastMessageEntity.user().name());
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
      const hasSelfMentions = conversationEntity.unreadState().selfMentions.length;
      const showMentionsIcon = hasSelfMentions && conversationEntity.showNotificationsMentionsAndReplies();

      return showMentionsIcon
        ? z.conversation.ConversationStatusIcon.UNREAD_MENTION
        : z.conversation.ConversationStatusIcon.MUTED;
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
        const stringId = selfLeft
          ? z.string.conversationsSecondaryLineYouLeft
          : z.string.conversationsSecondaryLineYouWereRemoved;

        return z.l10n.text(stringId);
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
        let stringId;

        if (messageEntity.is_ping()) {
          stringId = z.string.notificationPing;
        } else if (messageEntity.has_asset_text()) {
          stringId = true;
        } else if (messageEntity.has_asset()) {
          const assetEntity = messageEntity.get_first_asset();
          const isUploaded = assetEntity.status() === z.assets.AssetTransferState.UPLOADED;

          if (isUploaded) {
            if (assetEntity.is_audio()) {
              stringId = z.string.notificationSharedAudio;
            } else if (assetEntity.is_video()) {
              stringId = z.string.notificationSharedVideo;
            } else {
              stringId = z.string.notificationSharedFile;
            }
          }
        } else if (messageEntity.has_asset_location()) {
          stringId = z.string.notificationSharedLocation;
        } else if (messageEntity.has_asset_image()) {
          stringId = z.string.notificationAssetAdd;
        }

        if (!!stringId) {
          if (messageEntity.is_ephemeral()) {
            stringId = conversationEntity.isGroup()
              ? z.string.conversationsSecondaryLineEphemeralMessageGroup
              : z.string.conversationsSecondaryLineEphemeralMessage;
            return z.l10n.text(stringId);
          }

          const hasStringId = stringId && stringId !== true;
          const stateText = hasStringId ? z.l10n.text(stringId) : messageEntity.get_first_asset().text;
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
