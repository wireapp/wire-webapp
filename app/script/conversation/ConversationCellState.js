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
  function is_alert(message_et) {
    return message_et.is_ping() || (message_et.is_call() && message_et.was_missed());
  }

  function generate_activity_string(activities) {
    const activity_strings = [];

    for (const activity in activities) {
      if (activities.hasOwnProperty(activity)) {
        const count = activities[activity];

        switch (activity) {
          case 'message':
            if (count === 1) {
              activity_strings.push(z.l10n.text(z.string.conversationsSecondaryLineNewMessage, count));
            } else if (count > 1) {
              activity_strings.push(z.l10n.text(z.string.conversationsSecondaryLineNewMessages, count));
            }
            break;
          case 'ping':
            if (count === 1) {
              activity_strings.push(z.l10n.text(z.string.conversationsSecondaryLinePing, count));
            } else if (count > 1) {
              activity_strings.push(z.l10n.text(z.string.conversationsSecondaryLinePings, count));
            }
            break;
          case 'call':
            if (count === 1) {
              activity_strings.push(z.l10n.text(z.string.conversationsSecondaryLineMissedCall, count));
            } else if (count > 1) {
              activity_strings.push(z.l10n.text(z.string.conversationsSecondaryLineMissedCalls, count));
            }
            break;
          default:
        }
      }
    }

    return activity_strings.join(', ');
  }

  function accumulate_activity(conversation_et) {
    const unread_events = conversation_et.unread_events();
    const activities = {
      call: 0,
      message: 0,
      ping: 0,
    };

    for (const message_et of unread_events) {
      if (message_et.is_call() && message_et.was_missed()) {
        activities.call = activities.call + 1;
      } else if (message_et.is_ping()) {
        activities.ping = activities.ping + 1;
      } else if (message_et.is_content()) {
        activities.message = activities.message + 1;
      }
    }

    return generate_activity_string(activities);
  }

  const default_state = {
    description() {
      return '';
    },
    icon() {
      return z.conversation.ConversationStatusIcon.NONE;
    },
  };

  const removed_state = {
    description(conversation_et) {
      const last_message_et = conversation_et.getLastMessage();
      const self_user_id = conversation_et.self.id;

      const is_removal_message = last_message_et && last_message_et.is_member() && last_message_et.isMemberRemoval();
      const wasSelfRemoved = is_removal_message && last_message_et.userIds().includes(self_user_id);
      if (wasSelfRemoved) {
        if (last_message_et.user().id === self_user_id) {
          return z.l10n.text(z.string.conversationsSecondaryLineYouLeft);
        }

        return z.l10n.text(z.string.conversationsSecondaryLineYouWereRemoved);
      }

      return '';
    },
    icon() {
      return z.conversation.ConversationStatusIcon.NONE;
    },
    match(conversation_et) {
      return conversation_et.removed_from_conversation();
    },
  };

  const muted_state = {
    description(conversation_et) {
      return accumulate_activity(conversation_et);
    },
    icon() {
      return z.conversation.ConversationStatusIcon.MUTED;
    },
    match(conversation_et) {
      return conversation_et.is_muted();
    },
  };

  const alert_state = {
    description(conversation_et) {
      return accumulate_activity(conversation_et);
    },
    icon(conversation_et) {
      const last_alert = conversation_et.unread_events().find(is_alert);
      if (last_alert.is_ping()) {
        return z.conversation.ConversationStatusIcon.UNREAD_PING;
      }
      if (last_alert.is_call() && last_alert.was_missed()) {
        return z.conversation.ConversationStatusIcon.MISSED_CALL;
      }
    },
    match(conversation_et) {
      return conversation_et.unread_event_count() > 0 && conversation_et.unread_events().find(is_alert) !== undefined;
    },
  };

  const group_activity_state = {
    description(conversation_et) {
      const last_message_et = conversation_et.getLastMessage();

      if (last_message_et.is_member()) {
        const user_count = last_message_et.userEntities().length;

        if (last_message_et.isMemberJoin()) {
          if (user_count === 1) {
            if (!last_message_et.remoteUserEntities().length) {
              return z.l10n.text(z.string.conversationsSecondaryLinePersonAddedYou, last_message_et.user().name());
            }

            const [remote_user_et] = last_message_et.remoteUserEntities();
            const userSelfJoined = remote_user_et.id == last_message_et.user().id;
            if (userSelfJoined) {
              return z.l10n.text(z.string.conversationsSecondaryLinePersonAddedSelf, remote_user_et.name());
            }

            return z.l10n.text(z.string.conversationsSecondaryLinePersonAdded, remote_user_et.name());
          }

          if (user_count > 1) {
            return z.l10n.text(z.string.conversationsSecondaryLinePeopleAdded, user_count);
          }
        }

        if (last_message_et.isMemberRemoval()) {
          if (user_count === 1) {
            const [remote_user_et] = last_message_et.remoteUserEntities();
            if (remote_user_et === last_message_et.user()) {
              return z.l10n.text(z.string.conversationsSecondaryLinePersonLeft, remote_user_et.name());
            }

            return z.l10n.text(z.string.conversationsSecondaryLinePersonRemoved, remote_user_et.name());
          }

          if (user_count > 1) {
            return z.l10n.text(z.string.conversationsSecondaryLinePeopleLeft, user_count);
          }
        }
      }

      if (last_message_et.is_system() && last_message_et.is_conversation_rename()) {
        return z.l10n.text(z.string.conversationsSecondaryLineRenamed, last_message_et.user().name());
      }
    },
    icon(conversation_et) {
      const last_message_et = conversation_et.getLastMessage();
      if (last_message_et.is_member() && last_message_et.isMemberRemoval()) {
        if (conversation_et.is_muted()) {
          return z.conversation.ConversationStatusIcon.MUTED;
        }
        return z.conversation.ConversationStatusIcon.UNREAD_MESSAGES;
      }
    },
    match(conversation_et) {
      const last_message_et = conversation_et.getLastMessage();
      const expected_message_type = last_message_et
        ? last_message_et.is_member() || last_message_et.is_system()
        : false;
      return conversation_et.is_group() && conversation_et.unread_event_count() > 0 && expected_message_type;
    },
  };

  const unread_message_state = {
    description(conversation_et) {
      for (const message_et of conversation_et.unread_events()) {
        let message_text;

        if (message_et.is_ephemeral()) {
          message_text = z.l10n.text(z.string.conversationsSecondaryLineTimedMessage);
        } else if (message_et.is_ping()) {
          message_text = z.l10n.text(z.string.notificationPing);
        } else if (message_et.has_asset_text()) {
          message_text = message_et.get_first_asset().text;
        } else if (message_et.has_asset()) {
          const asset_et = message_et.get_first_asset();
          if (asset_et.status() === z.assets.AssetTransferState.UPLOADED) {
            if (asset_et.is_audio()) {
              message_text = z.l10n.text(z.string.notificationSharedAudio);
            } else if (asset_et.is_video()) {
              message_text = z.l10n.text(z.string.notificationSharedVideo);
            } else {
              message_text = z.l10n.text(z.string.notificationSharedFile);
            }
          }
        } else if (message_et.has_asset_location()) {
          message_text = z.l10n.text(z.string.notificationSharedLocation);
        } else if (message_et.has_asset_image()) {
          message_text = z.l10n.text(z.string.notificationAssetAdd);
        }

        if (message_text) {
          if (conversation_et.is_group()) {
            return `${message_et.sender_name()}: ${message_text}`;
          }

          return message_text;
        }
      }
    },
    icon() {
      return z.conversation.ConversationStatusIcon.UNREAD_MESSAGES;
    },
    match(conversation_et) {
      return conversation_et.unread_event_count() > 0;
    },
  };

  const user_name_state = {
    description(conversation_et) {
      const [user_et] = conversation_et.participating_user_ets();
      const has_username = user_et && user_et.username();
      return has_username ? `@${user_et.username()}` : '';
    },
    icon(conversation_et) {
      if (conversation_et.is_request()) {
        return z.conversation.ConversationStatusIcon.PENDING_CONNECTION;
      }
    },
    match(conversation_et) {
      const last_message_et = conversation_et.getLastMessage();
      const is_member_join = last_message_et && last_message_et.is_member() && last_message_et.isMemberJoin();
      return conversation_et.is_request() || (conversation_et.is_one2one() && is_member_join);
    },
  };

  function _generate(conversation_et) {
    const states = [
      removed_state,
      muted_state,
      alert_state,
      group_activity_state,
      unread_message_state,
      user_name_state,
    ];
    const icon_state = states.find(state => state.match(conversation_et));
    const description_state = states.find(state => state.match(conversation_et));

    return {
      description: (description_state || default_state).description(conversation_et),
      icon: (icon_state || default_state).icon(conversation_et),
    };
  }

  return {
    generate: _generate,
  };
})();
