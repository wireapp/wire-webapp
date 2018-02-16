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
  function isAlert(messageEntity) {
    return messageEntity.is_ping() || (messageEntity.is_call() && messageEntity.was_missed());
  }

  function generateActivityString(activities) {
    const activityStrings = [];

    for (const activity in activities) {
      if (activities.hasOwnProperty(activity)) {
        const count = activities[activity];

        switch (activity) {
          case 'message':
            if (count === 1) {
              activityStrings.push(z.l10n.text(z.string.conversations_secondary_line_new_message, count));
            } else if (count > 1) {
              activityStrings.push(z.l10n.text(z.string.conversations_secondary_line_new_messages, count));
            }
            break;
          case 'ping':
            if (count === 1) {
              activityStrings.push(z.l10n.text(z.string.conversations_secondary_line_ping, count));
            } else if (count > 1) {
              activityStrings.push(z.l10n.text(z.string.conversations_secondary_line_pings, count));
            }
            break;
          case 'call':
            if (count === 1) {
              activityStrings.push(z.l10n.text(z.string.conversations_secondary_line_missed_call, count));
            } else if (count > 1) {
              activityStrings.push(z.l10n.text(z.string.conversations_secondary_line_missed_calls, count));
            }
            break;
          default:
        }
      }
    }

    return activityStrings.join(', ');
  }

  function accumulateActivity(conversationEntity) {
    const unreadEvents = conversationEntity.unread_events();
    const activities = {
      call: 0,
      message: 0,
      ping: 0,
    };

    for (const messageEntity of unreadEvents) {
      if (messageEntity.is_call() && messageEntity.was_missed()) {
        activities.call = activities.call + 1;
      } else if (messageEntity.is_ping()) {
        activities.ping = activities.ping + 1;
      } else if (messageEntity.is_content()) {
        activities.message = activities.message + 1;
      }
    }

    return generateActivityString(activities);
  }

  const defaultState = {
    description() {
      return '';
    },
    icon() {
      return z.conversation.ConversationStatusIcon.NONE;
    },
  };

  const emptyState = {
    description() {
      return z.l10n.text(z.string.conversations_empty_conversation_description);
    },
    icon() {
      return z.conversation.ConversationStatusIcon.NONE;
    },
    match(conversationEntity) {
      return conversationEntity.participating_user_ids().length === 0;
    },
  };

  const removedState = {
    description(conversationEntity) {
      const lastMessageEntity = conversationEntity.getLastMessage();
      const selfUserId = conversationEntity.self.id;

      const isRemovalMessage =
        lastMessageEntity && lastMessageEntity.is_member() && lastMessageEntity.isMemberRemoval();
      const wasSelfRemoved = isRemovalMessage && lastMessageEntity.userIds().includes(selfUserId);
      if (wasSelfRemoved) {
        if (lastMessageEntity.user().id === selfUserId) {
          return z.l10n.text(z.string.conversations_secondary_line_you_left);
        }

        return z.l10n.text(z.string.conversations_secondary_line_you_were_removed);
      }

      return '';
    },
    icon() {
      return z.conversation.ConversationStatusIcon.NONE;
    },
    match(conversationEntity) {
      return conversationEntity.removed_from_conversation();
    },
  };

  const mutedState = {
    description(conversationEntity) {
      return accumulateActivity(conversationEntity);
    },
    icon() {
      return z.conversation.ConversationStatusIcon.MUTED;
    },
    match(conversationEntity) {
      return conversationEntity.is_muted();
    },
  };

  const alertState = {
    description(conversationEntity) {
      return accumulateActivity(conversationEntity);
    },
    icon(conversationEntity) {
      const lastAlert = conversationEntity.unread_events().find(isAlert);
      if (lastAlert.is_ping()) {
        return z.conversation.ConversationStatusIcon.UNREAD_PING;
      }
      if (lastAlert.is_call() && lastAlert.was_missed()) {
        return z.conversation.ConversationStatusIcon.MISSED_CALL;
      }
    },
    match(conversationEntity) {
      return (
        conversationEntity.unread_event_count() > 0 && conversationEntity.unread_events().find(isAlert) !== undefined
      );
    },
  };

  const groupActivityState = {
    description(conversationEntity) {
      const lastMessageEntity = conversationEntity.getLastMessage();

      if (lastMessageEntity.is_member()) {
        const userCount = lastMessageEntity.userEntities().length;

        if (lastMessageEntity.isMemberJoin()) {
          if (userCount === 1) {
            if (!lastMessageEntity.remoteUserEntities().length) {
              return z.l10n.text(
                z.string.conversations_secondary_line_person_added_you,
                lastMessageEntity.user().name()
              );
            }

            const [remoteUserEntity] = lastMessageEntity.remoteUserEntities();
            return z.l10n.text(z.string.conversations_secondary_line_person_added, remoteUserEntity.name());
          }

          if (userCount > 1) {
            return z.l10n.text(z.string.conversations_secondary_line_people_added, userCount);
          }
        }

        if (lastMessageEntity.isMemberRemoval()) {
          if (userCount === 1) {
            const [remoteUserEntity] = lastMessageEntity.remoteUserEntities();
            if (remoteUserEntity === lastMessageEntity.user()) {
              return z.l10n.text(z.string.conversations_secondary_line_person_left, remoteUserEntity.name());
            }

            return z.l10n.text(z.string.conversations_secondary_line_person_removed, remoteUserEntity.name());
          }

          if (userCount > 1) {
            return z.l10n.text(z.string.conversations_secondary_line_people_left, userCount);
          }
        }
      }

      if (lastMessageEntity.is_system() && lastMessageEntity.is_conversation_rename()) {
        return z.l10n.text(z.string.conversations_secondary_line_renamed, lastMessageEntity.user().name());
      }
    },
    icon(conversationEntity) {
      const lastMessageEntity = conversationEntity.getLastMessage();
      if (lastMessageEntity.is_member() && lastMessageEntity.isMemberRemoval()) {
        if (conversationEntity.is_muted()) {
          return z.conversation.ConversationStatusIcon.MUTED;
        }
        return z.conversation.ConversationStatusIcon.UNREAD_MESSAGES;
      }
    },
    match(conversationEntity) {
      const lastMessageEntity = conversationEntity.getLastMessage();
      const expectedMessageType = lastMessageEntity
        ? lastMessageEntity.is_member() || lastMessageEntity.is_system()
        : false;
      return conversationEntity.is_group() && conversationEntity.unread_event_count() > 0 && expectedMessageType;
    },
  };

  const unreadMessageState = {
    description(conversationEntity) {
      for (const messageEntity of conversationEntity.unread_events()) {
        let messageText;

        if (messageEntity.is_ephemeral()) {
          messageText = z.l10n.text(z.string.conversations_secondary_line_timed_message);
        } else if (messageEntity.is_ping()) {
          messageText = z.l10n.text(z.string.system_notification_ping);
        } else if (messageEntity.has_asset_text()) {
          messageText = messageEntity.get_first_asset().text;
        } else if (messageEntity.has_asset()) {
          const asset_et = messageEntity.get_first_asset();
          if (asset_et.status() === z.assets.AssetTransferState.UPLOADED) {
            if (asset_et.is_audio()) {
              messageText = z.l10n.text(z.string.system_notification_shared_audio);
            } else if (asset_et.is_video()) {
              messageText = z.l10n.text(z.string.system_notification_shared_video);
            } else {
              messageText = z.l10n.text(z.string.system_notification_shared_file);
            }
          }
        } else if (messageEntity.has_asset_location()) {
          messageText = z.l10n.text(z.string.system_notification_shared_location);
        } else if (messageEntity.has_asset_image()) {
          messageText = z.l10n.text(z.string.system_notification_asset_add);
        }

        if (messageText) {
          if (conversationEntity.is_group()) {
            return `${messageEntity.sender_name()}: ${messageText}`;
          }

          return messageText;
        }
      }
    },
    icon() {
      return z.conversation.ConversationStatusIcon.UNREAD_MESSAGES;
    },
    match(conversationEntity) {
      return conversationEntity.unread_event_count() > 0;
    },
  };

  const userNameState = {
    description(conversationEntity) {
      const [userEntity] = conversationEntity.participating_user_ets();
      const hasUsername = userEntity && userEntity.username();
      return hasUsername ? `@${userEntity.username()}` : '';
    },
    icon(conversationEntity) {
      if (conversationEntity.is_request()) {
        return z.conversation.ConversationStatusIcon.PENDING_CONNECTION;
      }
    },
    match(conversationEntity) {
      const lastMessageEntity = conversationEntity.getLastMessage();
      const isMemberJoin = lastMessageEntity && lastMessageEntity.is_member() && lastMessageEntity.isMemberJoin();
      return conversationEntity.is_request() || (conversationEntity.is_one2one() && isMemberJoin);
    },
  };

  function _generate(conversationEntity) {
    const states = [
      removedState,
      mutedState,
      alertState,
      groupActivityState,
      unreadMessageState,
      userNameState,
    ];
    const iconState = states.find(state => state.match(conversationEntity));
    const descriptionState = states.find(state => state.match(conversationEntity));

    return {
      description: (descriptionState || defaultState).description(conversationEntity),
      icon: (iconState || defaultState).icon(conversationEntity),
    };
  }

  return {
    generate: _generate,
  };
})();
