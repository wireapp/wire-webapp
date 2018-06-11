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
    MESSAGE: 'ConversationCellState.ACTIVITY_TYPE.MESSAGE',
    PING: 'ConversationCellState.ACTIVITY_TYPE.PING',
  };

  const _accumulateActivity = conversationEntity => {
    const activities = {
      [ACTIVITY_TYPE.CALL]: 0,
      [ACTIVITY_TYPE.MESSAGE]: 0,
      [ACTIVITY_TYPE.PING]: 0,
    };

    conversationEntity.unread_events().forEach(messageEntity => {
      const isMissedCall = messageEntity.is_call() && messageEntity.was_missed();
      if (isMissedCall) {
        activities[ACTIVITY_TYPE.CALL] += 1;
      } else if (messageEntity.is_ping()) {
        activities[ACTIVITY_TYPE.PING] += 1;
      } else if (messageEntity.is_content()) {
        activities[ACTIVITY_TYPE.MESSAGE] += 1;
      }
    });

    return _generateActivityString(activities);
  };

  const _generateActivityString = activities => {
    return Object.entries(activities)
      .map(([activity, activityCount]) => {
        if (activityCount) {
          const activityCountIsOne = activityCount === 1;
          let stringId = undefined;

          switch (activity) {
            case ACTIVITY_TYPE.CALL: {
              stringId = activityCountIsOne
                ? z.string.conversationsSecondaryLineMissedCall
                : z.string.conversationsSecondaryLineMissedCalls;
              break;
            }

            case ACTIVITY_TYPE.MESSAGE: {
              stringId = activityCountIsOne
                ? z.string.conversationsSecondaryLineNewMessage
                : z.string.conversationsSecondaryLineNewMessages;
              break;
            }

            case ACTIVITY_TYPE.PING: {
              stringId = activityCountIsOne
                ? z.string.conversationsSecondaryLinePing
                : z.string.conversationsSecondaryLinePings;
              break;
            }

            default:
              throw new z.conversation.ConversationError();
          }

          return z.l10n.text(stringId, activityCount);
        }
      })
      .filter(activityString => !!activityString)
      .join(', ');
  };

  const _getStateAlert = {
    description: conversationEntity => _accumulateActivity(conversationEntity),
    icon: conversationEntity => {
      const lastAlertMessage = conversationEntity.unread_events().find(_isAlert);

      if (lastAlertMessage) {
        if (lastAlertMessage.is_ping()) {
          return z.conversation.ConversationStatusIcon.UNREAD_PING;
        }

        const isMissedCall = lastAlertMessage.is_call() && lastAlertMessage.was_missed();
        if (isMissedCall) {
          return z.conversation.ConversationStatusIcon.MISSED_CALL;
        }
      }
    },
    match: conversationEntity => {
      const hasUnreadEvents = conversationEntity.unread_event_count() > 0;
      return hasUnreadEvents && conversationEntity.unread_events().some(_isAlert);
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
        return conversationEntity.is_muted()
          ? z.conversation.ConversationStatusIcon.MUTED
          : z.conversation.ConversationStatusIcon.UNREAD_MESSAGES;
      }
    },
    match: conversationEntity => {
      const lastMessageEntity = conversationEntity.getLastMessage();
      const isExpectedType = lastMessageEntity ? lastMessageEntity.is_member() || lastMessageEntity.is_system() : false;

      return conversationEntity.is_group() && conversationEntity.unread_event_count() > 0 && isExpectedType;
    },
  };

  const _getStateMuted = {
    description: conversationEntity => _accumulateActivity(conversationEntity),
    icon: () => z.conversation.ConversationStatusIcon.MUTED,
    match: conversationEntity => conversationEntity.is_muted(),
  };

  const _getStateRemoved = {
    description: conversationEntity => {
      const lastMessageEntity = conversationEntity.getLastMessage();
      const selfUserId = conversationEntity.self.id;

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
      for (const messageEntity of conversationEntity.unread_events()) {
        let stateText;

        if (messageEntity.is_ephemeral()) {
          stateText = z.l10n.text(z.string.conversationsSecondaryLineTimedMessage);
        } else if (messageEntity.is_ping()) {
          stateText = z.l10n.text(z.string.notificationPing);
        } else if (messageEntity.has_asset_text()) {
          stateText = messageEntity.get_first_asset().text;
        } else if (messageEntity.has_asset()) {
          const assetEntity = messageEntity.get_first_asset();
          const isUploaded = assetEntity.status() === z.assets.AssetTransferState.UPLOADED;

          if (isUploaded) {
            if (assetEntity.is_audio()) {
              stateText = z.l10n.text(z.string.notificationSharedAudio);
            } else if (assetEntity.is_video()) {
              stateText = z.l10n.text(z.string.notificationSharedVideo);
            } else {
              stateText = z.l10n.text(z.string.notificationSharedFile);
            }
          }
        } else if (messageEntity.has_asset_location()) {
          stateText = z.l10n.text(z.string.notificationSharedLocation);
        } else if (messageEntity.has_asset_image()) {
          stateText = z.l10n.text(z.string.notificationAssetAdd);
        }

        if (stateText) {
          return conversationEntity.is_group() ? `${messageEntity.sender_name()}: ${stateText}` : stateText;
        }
      }
    },
    icon: () => z.conversation.ConversationStatusIcon.UNREAD_MESSAGES,
    match: conversationEntity => conversationEntity.unread_event_count() > 0,
  };

  const _getStateUserName = {
    description: conversationEntity => {
      const [userEntity] = conversationEntity.participating_user_ets();
      const hasUsername = userEntity && userEntity.username();
      return hasUsername ? `@${userEntity.username()}` : '';
    },
    icon: conversationEntity => {
      if (conversationEntity.is_request()) {
        return z.conversation.ConversationStatusIcon.PENDING_CONNECTION;
      }
    },
    match: conversationEntity => {
      const lastMessageEntity = conversationEntity.getLastMessage();
      const isMemberJoin = lastMessageEntity && lastMessageEntity.is_member() && lastMessageEntity.isMemberJoin();
      const isEmpty1to1Conversation = conversationEntity.is_one2one() && isMemberJoin;

      return conversationEntity.is_request() || isEmpty1to1Conversation;
    },
  };

  const _isAlert = messageEntity => {
    const isMissedCall = messageEntity.is_call() && messageEntity.was_missed();
    return isMissedCall || messageEntity.is_ping();
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
