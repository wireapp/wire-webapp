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
window.z.util = z.util || {};

z.util.DebugUtil = class DebugUtil {
  constructor(user_repository, conversation_repository) {
    this.conversation_repository = conversation_repository;
    this.logger = new z.util.Logger('z.util.DebugUtil', z.config.LOGGER.OPTIONS);
    this.user_repository = user_repository;
  }

  block_all_connections() {
    const block_users = wire.app.repository.user.users().map((user_et) => {
      return this.user_repository.block_user(user_et);
    });
    return Promise.all(block_users);
  }

  break_session(user_id, client_id) {
    const session_id = `${user_id}@${client_id}`;
    return wire.app.repository.cryptography.cryptobox.session_load(session_id)
      .then(function(cryptobox_session) {
        cryptobox_session.session.session_states = {};

        const record = {
          created: Date.now(),
          id: session_id,
          serialised: cryptobox_session.session.serialise(),
          version: 'broken_by_qa',
        };

        return wire.app.repository.storage.storage_service.save(z.storage.StorageService.OBJECT_STORE.SESSIONS, session_id, record);
      })
      .then(() => {
        this.logger.log(`Corrupted Session ID '${session_id}'`);
      });
  }

  get_number_of_clients_in_conversation() {
    const user_ets = this.conversation_repository.active_conversation().participating_user_ets();

    const other_clients = user_ets
      .map((user_et) => user_et.devices().length)
      .reduce((previous, current) => previous + current);

    const my_clients = this.user_repository.self().devices().length;

    return other_clients + my_clients;
  }

  get_event_info(event) {
    const debug_information = {event};

    return this.conversation_repository
      .get_conversation_by_id_async(event.conversation)
      .then((conversation_et) => {
        debug_information.conversation = conversation_et;
        return this.user_repository.get_user_by_id(event.from);
      })
      .then((user_et) => {
        debug_information.user = user_et;
        const log_message = `Hey ${this.user_repository.self().name()}, this is for you:`;
        this.logger.warn(log_message, debug_information);
        this.logger.warn(`Conversation: ${debug_information.conversation.name()}`, debug_information.conversation);
        this.logger.warn(`From: ${debug_information.user.name()}`, debug_information.user);
        return debug_information;
      });
  }

  get_serialised_session(session_id) {
    return wire.app.repository.storage.storage_service.load('sessions', session_id)
      .then(function(record) {
        const base64_encoded_payload = z.util.array_to_base64(record.serialised);
        record.serialised = base64_encoded_payload;
        return record;
      });
  }

  get_serialised_identity() {
    return wire.app.repository.storage.storage_service.load('keys', 'local_identity')
      .then(function(record) {
        const base64_encoded_payload = z.util.array_to_base64(record.serialised);
        record.serialised = base64_encoded_payload;
        return record;
      });
  }

  get_notification_from_stream(notification_id, notification_id_since) {
    const client_id = wire.app.repository.client.current_client().id;

    const _got_notifications = ({has_more, notifications}) => {
      const matching_notifications = notifications.filter((notification) => notification.id === notification_id);
      if (matching_notifications.length) {
        return matching_notifications[0];
      }

      if (has_more) {
        const last_notification = notifications[notifications.length - 1];
        return this.get_notification_from_stream(notification_id, last_notification.id);
      }
      this.logger.log(`Notification '${notification_id}' was not found in encrypted notification stream`);
    };

    return wire.app.service.notification.get_notifications(client_id, notification_id_since, 10000)
      .then(_got_notifications);
  }

  get_notifications_from_stream(remote_user_id, remote_client_id, matching_notifications, notification_id_since) {
    if (matching_notifications == null) {
      matching_notifications = [];
    }
    const local_client_id = wire.app.repository.client.current_client().id;
    const local_user_id = wire.app.repository.user.self().id;

    const _got_notifications = ({has_more, notifications}) => {
      const additional_notifications = notifications.filter(function(notification) {
        const {payload} = notification;
        for (const {data, from} of payload) {
          if (data && [local_user_id, remote_user_id].includes(from)) {
            const {sender, recipient} = data;
            const incoming_event = (sender === remote_client_id) && (recipient === local_client_id);
            const outgoing_event = (sender === local_client_id) && (recipient === remote_client_id);
            return incoming_event || outgoing_event;
          }
        }
        return false;
      });

      matching_notifications = matching_notifications.concat(additional_notifications);
      if (has_more) {
        const last_notification = notifications[notifications.length - 1];
        return this.get_notifications_from_stream(remote_user_id, remote_client_id, matching_notifications, last_notification.id);
      }
      this.logger.log(`Found '${matching_notifications.length}' notification between '${local_client_id}' and '${remote_client_id}'`, matching_notifications);
      return matching_notifications;
    };

    const client_scope = remote_user_id === local_user_id ? undefined : local_client_id;
    return wire.app.service.notification.get_notifications(client_scope, notification_id_since, 10000)
      .then(_got_notifications);
  }

  get_objects_for_decryption_errors(session_id, notification_id) {
    return Promise.all([
      this.get_notification_from_stream(notification_id.toLowerCase()),
      this.get_serialised_identity(),
      this.get_serialised_session(session_id.toLowerCase()),
    ])
    .then((resolve_array) => {
      return JSON.stringify({
        identity: resolve_array[1],
        notification: resolve_array[0],
        session: resolve_array[2],
      });
    });
  }

  get_info_for_client_decryption_errors(remote_user_id, remote_client_id) {
    return Promise.all([
      this.get_notifications_from_stream(remote_user_id, remote_client_id),
      this.get_serialised_identity(),
      this.get_serialised_session(`${remote_user_id}@${remote_client_id}`),
    ])
    .then((resolve_array) => {
      return JSON.stringify({
        identity: resolve_array[1],
        notifications: resolve_array[0],
        session: resolve_array[2],
      });
    });
  }

  get_v2_call_participants(conversation_id = wire.app.repository.conversation.active_conversation().id) {
    return wire.app.service.call.get_state(conversation_id)
      .then((response) => {
        const participants = [];

        for (const id in response.participants) {
          const participant = response.participants[id];
          if (participant.state === z.calling.enum.ParticipantState.JOINED) {
            participants.push(wire.app.repository.user.get_user_by_id(id));
          }
        }

        this.logger.debug(`Call in '${conversation_id}' has '${participants.length}' joined participant/s`, participants);

        for (const participant of participants) {
          this.logger.log(`User '${participant.name()}' with ID '${participant.id}' has state 'joined'.`);
        }
      });
  }

  log_connection_status() {
    this.logger.log('Online Status');
    this.logger.log(`-- Browser online: ${window.navigator.onLine}`);
    this.logger.log(`-- IndexedDB open: ${wire.app.repository.storage.storage_service.db.isOpen()}`);
    this.logger.log(`-- WebSocket ready state: ${window.wire.app.service.web_socket.socket.readyState}`);
  }
};
