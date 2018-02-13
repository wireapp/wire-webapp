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
window.z.entity = z.entity || {};

z.entity.MemberMessage = class MemberMessage extends z.entity.SystemMessage {
  constructor() {
    super();

    this.super_type = z.message.SuperType.MEMBER;
    this.memberMessageType = z.message.SystemMessageType.NORMAL;

    this.userEntities = ko.observableArray();
    this.userIds = ko.observableArray();
    this.name = ko.observable('');

    this.hasUsers = ko.pureComputed(() => this.userEntities().length);

    // Users joined the conversation without sender
    this.joinedUserEntities = ko.pureComputed(() => {
      return this.userEntities()
        .filter(userEntity => userEntity.id !== this.user().id)
        .map(userEntity => userEntity);
    });

    // Users joined the conversation without self
    this.remoteUserEntities = ko.pureComputed(() => {
      return this.userEntities()
        .filter(userEntity => !userEntity.is_me)
        .map(userEntity => userEntity);
    });

    this.senderName = ko.pureComputed(() => {
      const isTeamMemberLeave = this.type === z.event.Client.CONVERSATION.TEAM_MEMBER_LEAVE;
      return isTeamMemberLeave ? this.name() : z.util.get_first_name(this.user());
    });

    this.showNamedCreation = ko.pureComputed(() => this.isConversationCreate() && this.name().length);
    this.showSenderName = ko.pureComputed(() => {
      const isUnnamedGroupCreation = this.isConversationCreate() && !this.name().length;
      return isUnnamedGroupCreation || this.isMemberChange();
    });

    this.otherUser = ko.pureComputed(() => {
      if (this.hasUsers()) {
        return this.userEntities()[0];
      }
      return new z.entity.User();
    });

    this.caption = ko.pureComputed(() => {
      switch (this.memberMessageType) {
        case z.message.SystemMessageType.CONNECTION_ACCEPTED:
        case z.message.SystemMessageType.CONNECTION_REQUEST:
          return this._getCaptionConnection(this.otherUser());
        case z.message.SystemMessageType.CONVERSATION_CREATE:
          if (this.name().length) {
            const namedCreateStringId = this.userIds().length
              ? z.string.conversationCreateWith
              : z.string.conversationCreateWithOut;
            return z.l10n.text(namedCreateStringId, this._generateNameString());
          }
          if (this.user().is_me) {
            return z.l10n.text(z.string.conversation_create_you, this._generateNameString());
          }
          return z.l10n.text(z.string.conversation_create, this._generateNameString(z.string.Declension.DATIVE));
        case z.message.SystemMessageType.CONVERSATION_RESUME:
          return z.l10n.text(z.string.conversation_resume, this._generateNameString(z.string.Declension.DATIVE));
        default:
          break;
      }

      switch (this.type) {
        case z.event.Backend.CONVERSATION.MEMBER_LEAVE:
          const senderLeft = this.otherUser().id === this.user().id;
          if (senderLeft) {
            const userLeftStringId = this.user().is_me
              ? z.string.conversation_member_leave_left_you
              : z.string.conversation_member_leave_left;
            return z.l10n.text(userLeftStringId);
          }

          const userRemovedStringId = this.user().is_me
            ? z.string.conversation_member_leave_removed_you
            : z.string.conversation_member_leave_removed;
          return z.l10n.text(userRemovedStringId, this._generateNameString());
        case z.event.Backend.CONVERSATION.MEMBER_JOIN:
          const userJoinedStringId = this.user().is_me
            ? z.string.conversation_member_join_you
            : z.string.conversation_member_join;

          return z.l10n.text(userJoinedStringId, this._generateNameString());
        case z.event.Client.CONVERSATION.TEAM_MEMBER_LEAVE:
          return z.l10n.text(z.string.conversation_team_leave);
        default:
          break;
      }
      return '';
    });

    this.groupCreationHeader = ko.pureComputed(() => {
      if (this.showNamedCreation()) {
        const groupCreationStringId = this.user().is_me
          ? z.string.conversationCreateNameYou
          : z.string.conversationCreateName;
        return z.util.StringUtil.capitalize_first_char(z.l10n.text(groupCreationStringId, this.senderName()));
      }
      return '';
    });
    this.showLargeAvatar = () => {
      const largeAvatarTypes = [
        z.message.SystemMessageType.CONNECTION_ACCEPTED,
        z.message.SystemMessageType.CONNECTION_REQUEST,
      ];
      return largeAvatarTypes.includes(this.memberMessageType);
    };
  }

  _generateNameString(declension = z.string.Declension.ACCUSATIVE) {
    if (this.hasUsers()) {
      return z.util.LocalizerUtil.join_names(this.joinedUserEntities(), declension);
    }
    return '';
  }

  _getCaptionConnection(userEntity) {
    if (userEntity) {
      if (userEntity.is_blocked()) {
        return z.l10n.text(z.string.conversation_connection_blocked);
      }

      if (userEntity.is_outgoing_request()) {
        return '';
      }
    }

    return z.l10n.text(z.string.conversation_connection_accepted);
  }

  isConnection() {
    const connectionMessageTypes = [
      z.message.SystemMessageType.CONNECTION_ACCEPTED,
      z.message.SystemMessageType.CONNECTION_REQUEST,
    ];

    return connectionMessageTypes.includes(this.memberMessageType);
  }

  isCreation() {
    return [
      z.message.SystemMessageType.CONNECTION_ACCEPTED,
      z.message.SystemMessageType.CONNECTION_REQUEST,
      z.message.SystemMessageType.CONVERSATION_CREATE,
      z.message.SystemMessageType.CONVERSATION_RESUME,
    ].includes(this.memberMessageType);
  }

  isConversationCreate() {
    return this.memberMessageType === z.message.SystemMessageType.CONVERSATION_CREATE;
  }

  isConversationResume() {
    return this.memberMessageType === z.message.SystemMessageType.CONVERSATION_RESUME;
  }

  isGroupCreation() {
    return this.isConversationCreate() || this.isConversationResume();
  }

  isMemberChange() {
    return this.isMemberJoin() || this.isMemberLeave() || this.isTeamMemberLeave();
  }

  isMemberJoin() {
    return this.type === z.event.Backend.CONVERSATION.MEMBER_JOIN;
  }

  isMemberLeave() {
    return this.type === z.event.Backend.CONVERSATION.MEMBER_LEAVE;
  }

  isTeamMemberLeave() {
    return this.type === z.event.Client.CONVERSATION.TEAM_MEMBER_LEAVE;
  }

  isMemberRemoval() {
    return this.isMemberLeave() || this.isTeamMemberLeave();
  }
};
