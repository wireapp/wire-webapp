/*
 * Wire
 * Copyright (C) 2017 Wire Swiss GmbH
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
    return message_et.is_ping() || message_et.is_call() && message_et.was_missed();
  }

  function generate_activity_string(activities) {
    const activity_strings = [];

    for (const activity in activities) {
      const count = activities[activity];

      switch (activity) {
        case 'message':
          if (count === 1) {
            activity_strings.push(z.l10n.text(z.string.conversations_secondary_line_new_message, count));
          } else if (count > 1) {
            activity_strings.push(z.l10n.text(z.string.conversations_secondary_line_new_messages, count));
          }
          break;
        case 'ping':
          if (count === 1) {
            activity_strings.push(z.l10n.text(z.string.conversations_secondary_line_ping, count));
          } else if (count > 1) {
            activity_strings.push(z.l10n.text(z.string.conversations_secondary_line_pings, count));
          }
          break;
        case 'call':
          if (count === 1) {
            activity_strings.push(z.l10n.text(z.string.conversations_secondary_line_missed_call, count));
          } else if (count > 1) {
            activity_strings.push(z.l10n.text(z.string.conversations_secondary_line_missed_calls, count));
          }
          break;
        default:
      }
    }

    return activity_strings.join(', ');
  }

  function accumulate_activity(conversation_et) {
    const unread_events = conversation_et.unread_events();
    const activities = {
      'call': 0,
      'message': 0,
      'ping': 0,
    };

    for (const message_et of unread_events) {
      if (message_et.is_call() && message_et.was_missed()) {
        activities.call = activities.call + 1;
      } else if (message_et.is_ping()) {
        activities.ping = activities.ping + 1;
      } else {
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

  const empty_state = {
    description() {
      return z.l10n.text(z.string.conversations_empty_conversation_description);
    },
    icon() {
      return z.conversation.ConversationStatusIcon.NONE;
    },
    match(conversation_et) {
      return conversation_et.participating_user_ids().length === 0;
    },
  };

  const removed_state = {
    description() {
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
      const last_message_et = conversation_et.get_last_message();
      const remote_user_count = last_message_et.remote_user_ets().length;
      const sender_name = last_message_et.sender_name();
      let message_text;

      switch (last_message_et.type) {
        case z.event.Backend.CONVERSATION.MEMBER_LEAVE:
          if (remote_user_count === 1) {
            message_text = z.l10n.text(z.string.conversations_secondary_line_person_left, remote_user_count);
          } else if (remote_user_count > 1) {
            message_text = z.l10n.text(z.string.conversations_secondary_line_people_left, remote_user_count);
          }
          break;
        case z.event.Backend.CONVERSATION.MEMBER_JOIN:
          if (remote_user_count === 1) {
            const remote_name = last_message_et.remote_user_ets()[0].first_name();
            message_text = z.l10n.text(z.string.conversations_secondary_line_person_added, {user1: sender_name, user2: remote_name});
          } else if (remote_user_count > 1) {
            message_text = z.l10n.text(z.string.conversations_secondary_line_people_added, remote_user_count);
          }
          break;
        default:
          message_text = '';
      }
      return message_text;
    },
    icon(conversation_et) {
      const last_message_et = conversation_et.get_last_message();
      if (last_message_et.type === z.event.Backend.CONVERSATION.MEMBER_LEAVE) {
        if (conversation_et.is_muted()) {
          return z.conversation.ConversationStatusIcon.MUTED;
        }
        return z.conversation.ConversationStatusIcon.UNREAD_MESSAGES;
      }
    },
    match(conversation_et) {
      return conversation_et.is_group() && conversation_et.unread_event_count() > 0 && conversation_et.get_last_message().is_member();
    },
  };

  const unread_message_state = {
    description(conversation_et) {
      const last_message_et = conversation_et.get_last_message();
      let message_text = '';

      if (last_message_et.is_ephemeral()) {
        message_text = z.l10n.text(z.string.conversations_secondary_line_timed_message);
      } else if (last_message_et.is_ping()) {
        message_text = z.l10n.text(z.string.system_notification_ping);
      } else if (last_message_et.has_asset_text()) {
        message_text = last_message_et.get_first_asset().text;
      } else if (last_message_et.has_asset()) {
        const asset_et = last_message_et.get_first_asset();
        if (asset_et.is_audio()) {
          message_text = z.l10n.text(z.string.system_notification_shared_audio);
        } else if (asset_et.is_video()) {
          message_text = z.l10n.text(z.string.system_notification_shared_video);
        } else {
          message_text = z.l10n.text(z.string.system_notification_shared_file);
        }
      } else if (last_message_et.has_asset_location()) {
        message_text = z.l10n.text(z.string.system_notification_shared_location);
      } else if (last_message_et.has_asset_image()) {
        message_text = z.l10n.text(z.string.system_notification_asset_add);
      }

      if (conversation_et.is_group()) {
        message_text = `${last_message_et.sender_name()}: ${message_text}`;
      }
      return message_text;
    },
    icon() {
      return z.conversation.ConversationStatusIcon.UNREAD_MESSAGES;
    },
    match(conversation_et) {
      return conversation_et.unread_event_count() > 0;
    },
  };

  const pending_state = {
    description(conversation_et) {
      const [participating_user_et] = conversation_et.participating_user_ets();
      return participating_user_et ? `@${participating_user_et.username()}` : '';
    },
    icon() {
      return z.conversation.ConversationStatusIcon.PENDING_CONNECTION;
    },
    match(conversation_et) {
      return conversation_et.is_request();
    },
  };

  function generate(conversation_et) {
    const states = [empty_state, removed_state, muted_state, alert_state, group_activity_state, unread_message_state, pending_state];
    const icon_state = states.find((state) => state.match(conversation_et));
    const description_state = states.find((state) => state.match(conversation_et));

    return {
      description: (description_state || default_state).description(conversation_et),
      icon: (icon_state || default_state).icon(conversation_et),
    };
  }

  return {
    generate,
  };

})();
