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
window.z.entity = z.entity || {};

z.entity.MemberMessage = class MemberMessage extends z.entity.SystemMessage {
  constructor() {
    super();

    this.super_type = z.message.SuperType.MEMBER;
    this.member_message_type = z.message.SystemMessageType.NORMAL;

    this.user_ets = ko.observableArray();
    this.user_ids = ko.observableArray();

    // Users joined the conversation without sender
    this.joined_user_ets = ko.pureComputed(() => {
      return this.user_ets()
        .filter(user_et => user_et.id !== this.user().id)
        .map(user_et => user_et);
    });

    // Users joined the conversation without self
    this.remote_user_ets = ko.pureComputed(() => {
      return this.user_ets()
        .filter(user_et => !user_et.is_me)
        .map(user_et => user_et);
    });

    this._generate_name_string = (declension = z.string.Declension.ACCUSATIVE) => {
      return z.util.LocalizerUtil.join_names(this.joined_user_ets(), declension);
    };

    this._get_caption_connection = function(user_et) {
      if (user_et.is_blocked()) {
        return z.l10n.text(z.string.conversation_connection_blocked);
      }

      if (user_et.is_outgoing_request()) {
        return '';
      }

      return z.l10n.text(z.string.conversation_connection_accepted);
    };

    this.show_large_avatar = () => {
      const large_avatar_types = [
        z.message.SystemMessageType.CONNECTION_ACCEPTED,
        z.message.SystemMessageType.CONNECTION_REQUEST,
      ];
      return large_avatar_types.includes(this.member_message_type);
    };

    this.other_user = ko.pureComputed(() => {
      if (this.user_ets().length === 1) {
        return this.user_ets()[0];
      }
      return new z.entity.User();
    });

    this.caption = ko.pureComputed(
      () => {
        if (this.user_ets().length === 0) {
          return '';
        }

        switch (this.member_message_type) {
          case z.message.SystemMessageType.CONNECTION_ACCEPTED:
          case z.message.SystemMessageType.CONNECTION_REQUEST:
            return this._get_caption_connection(this.other_user());
          case z.message.SystemMessageType.CONVERSATION_CREATE:
            if (this.user().is_me) {
              return z.l10n.text(z.string.conversation_create_you, this._generate_name_string());
            }
            return z.l10n.text(z.string.conversation_create, this._generate_name_string(z.string.Declension.DATIVE));
          case z.message.SystemMessageType.CONVERSATION_RESUME:
            return z.l10n.text(z.string.conversation_resume, this._generate_name_string(z.string.Declension.DATIVE));
          default:
            break;
        }

        switch (this.type) {
          case z.event.Backend.CONVERSATION.MEMBER_LEAVE:
            if (this.other_user().id === this.user().id) {
              if (this.user().is_me) {
                return z.l10n.text(z.string.conversation_member_leave_left_you);
              }
              return z.l10n.text(z.string.conversation_member_leave_left);
            }
            if (this.user().is_me) {
              return z.l10n.text(z.string.conversation_member_leave_removed_you, this._generate_name_string());
            }
            return z.l10n.text(z.string.conversation_member_leave_removed, this._generate_name_string());
          case z.event.Backend.CONVERSATION.MEMBER_JOIN:
            if (this.user().is_me) {
              return z.l10n.text(z.string.conversation_member_join_you, this._generate_name_string());
            }
            return z.l10n.text(z.string.conversation_member_join, this._generate_name_string());
          case z.event.Client.CONVERSATION.TEAM_MEMBER_LEAVE:
            return z.l10n.text(z.string.conversation_team_leave);
          default:
            break;
        }
      },
      this,
      {deferEvaluation: true}
    );
  }

  is_connection() {
    return [z.message.SystemMessageType.CONNECTION_ACCEPTED, z.message.SystemMessageType.CONNECTION_REQUEST].includes(
      this.member_message_type
    );
  }

  is_creation() {
    return [
      z.message.SystemMessageType.CONNECTION_ACCEPTED,
      z.message.SystemMessageType.CONNECTION_REQUEST,
      z.message.SystemMessageType.CONVERSATION_CREATE,
      z.message.SystemMessageType.CONVERSATION_RESUME,
    ].includes(this.member_message_type);
  }

  is_conversation_create() {
    return this.member_message_type === z.message.SystemMessageType.CONVERSATION_CREATE;
  }

  is_conversation_initialization() {
    return this.is_conversation_create() || this.is_conversation_resume();
  }

  is_conversation_resume() {
    return this.member_message_type === z.message.SystemMessageType.CONVERSATION_RESUME;
  }

  is_member_change() {
    return this.is_member_join() || this.is_member_leave() || this.is_team_member_leave();
  }

  is_member_join() {
    return this.type === z.event.Backend.CONVERSATION.MEMBER_JOIN;
  }

  is_member_leave() {
    return this.type === z.event.Backend.CONVERSATION.MEMBER_LEAVE;
  }

  is_team_member_leave() {
    return this.type === z.event.Client.CONVERSATION.TEAM_MEMBER_LEAVE;
  }

  is_member_removal() {
    return this.is_member_leave() || this.is_team_member_leave();
  }
};
