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

import {AssetTransferState} from 'Repositories/assets/assetTransferState';
import type {Conversation} from 'Repositories/entity/Conversation';
import type {FileAsset} from 'Repositories/entity/message/FileAsset';
import type {MemberMessage} from 'Repositories/entity/message/MemberMessage';
import type {SystemMessage} from 'Repositories/entity/message/SystemMessage';
import type {Text} from 'Repositories/entity/message/Text';
import {t} from 'Util/localizerUtil';
import {getRenderedTextContent} from 'Util/messageRenderer';
import {matchQualifiedIds} from 'Util/qualifiedId';

import {ConversationStatusIcon} from './ConversationStatusIcon';

import {ConversationError} from '../../error/conversationError';
import {E2EIVerificationMessageType} from '../../message/E2EIVerificationMessageType';

enum ACTIVITY_TYPE {
  CALL = 'ConversationCellState.ACTIVITY_TYPE.CALL',
  MENTION = 'ConversationCellState.ACTIVITY_TYPE.MENTION',
  MESSAGE = 'ConversationCellState.ACTIVITY_TYPE.MESSAGE',
  PING = 'ConversationCellState.ACTIVITY_TYPE.PING',
  REPLY = 'ConversationCellState.ACTIVITY_TYPE.REPLY',
}

type ConversationCellStateDefinition = {
  description: (conversationEntity: Conversation, translate: typeof t) => string;
  icon: (conversationEntity: Conversation) => ConversationStatusIcon | void;
  match: (conversationEntity: Conversation) => boolean;
};

const _accumulateSummary = (
  conversationEntity: Conversation,
  translate: typeof t,
  prioritizeMentionAndReply?: boolean,
): string => {
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

  if (prioritizeMentionAndReply === true && (hasSingleAlert || hasOnlyReplies)) {
    const hasSingleMention = activities[ACTIVITY_TYPE.MENTION] === 1;

    if (hasSingleMention || hasOnlyReplies) {
      const [mentionMessageEntity] = unreadSelfMentions;
      const [replyMessageEntity] = unreadSelfReplies;
      const messageEntity = mentionMessageEntity ?? replyMessageEntity;

      if (messageEntity.isEphemeral()) {
        let summary;

        if (hasSingleMention) {
          summary = conversationEntity.isGroupOrChannel()
            ? translate('conversationsSecondaryLineEphemeralMentionGroup')
            : translate('conversationsSecondaryLineEphemeralMention');
        } else {
          summary = conversationEntity.isGroupOrChannel()
            ? translate('conversationsSecondaryLineEphemeralReplyGroup')
            : translate('conversationsSecondaryLineEphemeralReply');
        }

        return summary;
      }

      return conversationEntity.isGroupOrChannel()
        ? `${messageEntity.unsafeSenderName()}: ${(messageEntity.getFirstAsset() as Text)?.text}`
        : (messageEntity.getFirstAsset() as Text)?.text;
    }
  }

  return _generateSummaryDescription(activities, translate);
};

const _generateSummaryDescription = (activities: Record<ACTIVITY_TYPE, number>, translate: typeof t): string => {
  return Object.entries(activities)
    .map(([activity, activityCount]): string | void => {
      if (activityCount) {
        const activityCountIsOne = activityCount === 1;

        switch (activity) {
          case ACTIVITY_TYPE.CALL: {
            return activityCountIsOne
              ? translate('conversationsSecondaryLineSummaryMissedCall', {number: activityCount})
              : translate('conversationsSecondaryLineSummaryMissedCalls', {number: activityCount});
          }

          case ACTIVITY_TYPE.MENTION: {
            return activityCountIsOne
              ? translate('conversationsSecondaryLineSummaryMention', {number: activityCount})
              : translate('conversationsSecondaryLineSummaryMentions', {number: activityCount});
          }

          case ACTIVITY_TYPE.MESSAGE: {
            return activityCountIsOne
              ? translate('conversationsSecondaryLineSummaryMessage', {number: activityCount})
              : translate('conversationsSecondaryLineSummaryMessages', {number: activityCount});
          }

          case ACTIVITY_TYPE.PING: {
            return activityCountIsOne
              ? translate('conversationsSecondaryLineSummaryPing', {number: activityCount})
              : translate('conversationsSecondaryLineSummaryPings', {number: activityCount});
          }

          case ACTIVITY_TYPE.REPLY: {
            return activityCountIsOne
              ? translate('conversationsSecondaryLineSummaryReply', {number: activityCount})
              : translate('conversationsSecondaryLineSummaryReplies', {number: activityCount});
          }

          default:
            throw new ConversationError(ConversationError.TYPE.UNKNOWN_ACTIVITY, `Unknown activity "${activity}"`);
        }
      }
    })
    .filter((activityString): activityString is string => {
      return typeof activityString === 'string' && activityString.length > 0;
    })
    .join(', ');
};

const _getStateAlert: ConversationCellStateDefinition = {
  description: (conversationEntity: Conversation, translate: typeof t) =>
    _accumulateSummary(conversationEntity, translate, true),
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

const _getStateDefault: ConversationCellStateDefinition = {
  description: () => '',
  icon: () => ConversationStatusIcon.NONE,
  match: () => false,
};

const _getStateGroupActivity: ConversationCellStateDefinition = {
  description: (conversationEntity: Conversation, translate: typeof t): string => {
    const lastMessageEntity = conversationEntity.getNewestMessage();
    if (lastMessageEntity === undefined) {
      return '';
    }

    if (lastMessageEntity.isMember()) {
      const userCount = (lastMessageEntity as MemberMessage).userEntities().length;
      const hasUserCount = userCount >= 1;

      if (hasUserCount) {
        const userCountIsOne = userCount === 1;

        if ((lastMessageEntity as MemberMessage).isMemberJoin()) {
          if (userCountIsOne) {
            if (!(lastMessageEntity as MemberMessage).remoteUserEntities().length) {
              return translate('conversationsSecondaryLinePersonAddedYou', {
                user: (lastMessageEntity as MemberMessage).user().name(),
              });
            }

            const [remoteUserEntity] = (lastMessageEntity as MemberMessage).remoteUserEntities();
            if (remoteUserEntity === undefined) {
              return '';
            }
            const userSelfJoined = lastMessageEntity.user().id === remoteUserEntity.id;
            const string = userSelfJoined
              ? translate('conversationsSecondaryLinePersonAddedSelf', {user: remoteUserEntity.name()})
              : translate('conversationsSecondaryLinePersonAdded', {user: remoteUserEntity.name()});

            return string;
          }

          return translate('conversationsSecondaryLinePeopleAdded', {user: userCount});
        }

        if ((lastMessageEntity as MemberMessage).isMemberRemoval()) {
          if (userCountIsOne) {
            const [remoteUserEntity] = (lastMessageEntity as MemberMessage).remoteUserEntities();

            if (remoteUserEntity !== undefined) {
              if ((lastMessageEntity as MemberMessage).isTeamMemberLeave()) {
                const name = (lastMessageEntity as MemberMessage).name() ?? remoteUserEntity.name();
                return translate('conversationsSecondaryLinePersonRemovedTeam', {user: name});
              }

              const userSelfLeft = remoteUserEntity.id === lastMessageEntity.user().id;
              const string = userSelfLeft
                ? translate('conversationsSecondaryLinePersonLeft', {user: remoteUserEntity.name()})
                : translate('conversationsSecondaryLinePersonRemoved', {user: remoteUserEntity.name()});

              return string;
            }
          }

          return translate('conversationsSecondaryLinePeopleLeft', {number: userCount});
        }
      }
    }

    const isConversationRename =
      lastMessageEntity.isSystem() && (lastMessageEntity as SystemMessage).isConversationRename();
    if (isConversationRename) {
      return translate('conversationsSecondaryLineRenamed', {user: lastMessageEntity.user().name()});
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

const _getStateMuted: ConversationCellStateDefinition = {
  description: (conversationEntity: Conversation, translate: typeof t) => {
    return _accumulateSummary(conversationEntity, translate, conversationEntity.showNotificationsMentionsAndReplies());
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

const _getStateRemoved: ConversationCellStateDefinition = {
  description: (conversationEntity: Conversation, translate: typeof t) => {
    const lastMessageEntity = conversationEntity.getNewestMessage();
    const selfUser = conversationEntity.selfUser();
    if (selfUser === undefined) {
      return '';
    }
    const selfUserId = selfUser.id;

    const isMemberRemoval =
      lastMessageEntity !== undefined && lastMessageEntity.isMember() && lastMessageEntity.isMemberRemoval();
    const wasSelfRemoved =
      isMemberRemoval &&
      (lastMessageEntity as MemberMessage).userIds().some(userId => matchQualifiedIds(userId, selfUser));
    if (wasSelfRemoved) {
      const selfLeft = lastMessageEntity.user().id === selfUserId;
      return selfLeft
        ? translate('conversationsSecondaryLineYouLeft')
        : translate('conversationsSecondaryLineYouWereRemoved');
    }

    return '';
  },
  icon: () => ConversationStatusIcon.UNREAD_MESSAGES,
  match: (conversationEntity: Conversation) => conversationEntity.isSelfUserRemoved(),
};

const _getStateUnreadMessage: ConversationCellStateDefinition = {
  description: (conversationEntity: Conversation, translate: typeof t): string => {
    const unreadState = conversationEntity.unreadState();

    const {allMessages, systemMessages} = unreadState;

    const allUnread = [...allMessages, ...systemMessages];

    for (const messageEntity of allUnread) {
      let conversationPreviewText = '';

      if (messageEntity.isPing()) {
        conversationPreviewText = translate('notificationPing');
      } else if (messageEntity.isContent() && messageEntity.hasAssetText()) {
        const assetEntity = messageEntity.getFirstAsset();
        if (assetEntity !== undefined) {
          conversationPreviewText = getRenderedTextContent(assetEntity.text);
        }
      } else if (messageEntity.isContent() && messageEntity.hasAsset()) {
        const assetEntity = messageEntity.getFirstAsset();
        const isUploaded =
          assetEntity !== undefined && (assetEntity as FileAsset).status() === AssetTransferState.UPLOADED;

        if (isUploaded && assetEntity !== undefined) {
          if (assetEntity.isAudio()) {
            conversationPreviewText = translate('notificationSharedAudio');
          } else if (assetEntity.isVideo()) {
            conversationPreviewText = translate('notificationSharedVideo');
          } else {
            conversationPreviewText = translate('notificationSharedFile');
          }
        }
      } else if (messageEntity.hasAssetLocation()) {
        conversationPreviewText = translate('notificationSharedLocation');
      } else if (messageEntity.hasAssetImage()) {
        conversationPreviewText = translate('notificationAssetAdd');
      } else if (messageEntity.isE2EIVerification()) {
        conversationPreviewText =
          messageEntity.messageType === E2EIVerificationMessageType.VERIFIED
            ? translate('conversation.AllE2EIDevicesVerifiedShort')
            : translate('conversation.E2EIVerificationDegraded');
      } else if (messageEntity.isVerification()) {
        conversationPreviewText = translate('conversation.AllDevicesVerified');
      }

      if (conversationPreviewText.length > 0) {
        if (messageEntity.isEphemeral()) {
          return conversationEntity.isGroupOrChannel()
            ? translate('conversationsSecondaryLineEphemeralMessageGroup')
            : translate('conversationsSecondaryLineEphemeralMessage');
        }

        return conversationEntity.isGroupOrChannel() && !messageEntity.isE2EIVerification()
          ? `${messageEntity.unsafeSenderName()}: ${conversationPreviewText}`
          : conversationPreviewText;
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

const _getStateUserName: ConversationCellStateDefinition = {
  description: (conversationEntity: Conversation): string => {
    const [userEntity] = conversationEntity.participating_user_ets();
    const hasHandle = userEntity !== undefined && userEntity.username() !== undefined;
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
      lastMessageEntity !== undefined &&
      lastMessageEntity.isMember() &&
      (lastMessageEntity as MemberMessage).isMemberJoin();
    const isEmpty1to1Conversation = conversationEntity.is1to1() && isMemberJoin === true;

    return conversationEntity.isRequest() || isEmpty1to1Conversation;
  },
};

export const generateCellState = (
  conversationEntity: Conversation,
  translate: typeof t = t,
): {description: string; icon: ConversationStatusIcon | void} => {
  const states = [
    _getStateRemoved,
    _getStateMuted,
    _getStateAlert,
    _getStateGroupActivity,
    _getStateUnreadMessage,
    _getStateUserName,
  ] satisfies ConversationCellStateDefinition[];

  const matchingState = states.find(state => state.match(conversationEntity)) || _getStateDefault;

  return {
    description: matchingState.description(conversationEntity, translate),
    icon: matchingState.icon(conversationEntity),
  };
};
