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

import {t, Declension, joinNames} from 'utils/LocalizerUtil';

window.z = window.z || {};
window.z.entity = z.entity || {};

z.entity.MemberMessage = class MemberMessage extends z.entity.SystemMessage {
  static get CONFIG() {
    return {
      MAX_USERS_VISIBLE: 17,
      MAX_WHOLE_TEAM_USERS_VISIBLE: 10,
      REDUCED_USERS_COUNT: 15,
    };
  }

  constructor() {
    super();

    this.super_type = z.message.SuperType.MEMBER;
    this.memberMessageType = z.message.SystemMessageType.NORMAL;

    this.userEntities = ko.observableArray();
    this.userIds = ko.observableArray();
    this.name = ko.observable('');

    this.exceedsMaxVisibleUsers = ko.pureComputed(() => {
      return this.joinedUserEntities().length > MemberMessage.CONFIG.MAX_USERS_VISIBLE;
    });
    this.visibleUsers = ko.observable([]);
    this.hiddenUserCount = ko.pureComputed(() => this.joinedUserEntities().length - this.visibleUsers().length);
    this.highlightedUsers = ko.pureComputed(() => {
      return this.type === z.event.Backend.CONVERSATION.MEMBER_JOIN ? this.joinedUserEntities() : [];
    });

    this.hasUsers = ko.pureComputed(() => this.userEntities().length);
    this.allTeamMembers = undefined;
    this.showServicesWarning = false;

    // Users joined the conversation without sender
    this.joinedUserEntities = ko.pureComputed(() => {
      return this.userEntities()
        .filter(userEntity => !this.user() || this.user().id !== userEntity.id)
        .map(userEntity => userEntity);
    });

    this.joinedUserEntities.subscribe(joinedUserEntities => {
      const selfUser = joinedUserEntities.find(userEntity => userEntity.is_me);
      const visibleUsers = joinedUserEntities.filter(userEntity => !userEntity.is_me);
      if (this.exceedsMaxVisibleUsers()) {
        const spliceCount = MemberMessage.CONFIG.REDUCED_USERS_COUNT;
        visibleUsers.splice(selfUser ? spliceCount - 1 : spliceCount);
      }
      if (selfUser) {
        visibleUsers.push(selfUser);
      }
      this.visibleUsers(visibleUsers);
    });

    // Users joined the conversation without self
    this.remoteUserEntities = ko.pureComputed(() => {
      return this.userEntities()
        .filter(userEntity => !userEntity.is_me)
        .map(userEntity => userEntity);
    });

    this.senderName = ko.pureComputed(() => {
      const isTeamMemberLeave = this.type === z.event.Client.CONVERSATION.TEAM_MEMBER_LEAVE;
      return isTeamMemberLeave
        ? this.name()
        : z.util.SanitizationUtil.getFirstName(this.user(), Declension.NOMINATIVE, true);
    });

    this.showNamedCreation = ko.pureComputed(() => this.isConversationCreate() && this.name().length);

    this.otherUser = ko.pureComputed(() => (this.hasUsers() ? this.userEntities()[0] : new z.entity.User()));

    this.htmlCaption = ko.pureComputed(() => {
      if (!this.hasUsers()) {
        return '';
      }

      const replaceShowMore = {
        '/showmore': '</a>',
        showmore: '<a class="message-header-show-more" data-uie-name="do-show-more">',
      };

      const count = this.hiddenUserCount();
      const users = this._generateNameString(this.exceedsMaxVisibleUsers(), Declension.DATIVE);
      const name = this.senderName();

      switch (this.memberMessageType) {
        case z.message.SystemMessageType.CONNECTION_ACCEPTED:
        case z.message.SystemMessageType.CONNECTION_REQUEST: {
          if (this.otherUser()) {
            if (this.otherUser().isBlocked()) {
              return t('conversationConnectionBlocked');
            }

            if (this.otherUser().isOutgoingRequest()) {
              return '';
            }
          }

          return t('conversationConnectionAccepted');
        }

        case z.message.SystemMessageType.CONVERSATION_CREATE: {
          if (this.name().length) {
            const exceedsMaxTeam = this.joinedUserEntities().length > MemberMessage.CONFIG.MAX_WHOLE_TEAM_USERS_VISIBLE;
            if (this.allTeamMembers && exceedsMaxTeam) {
              const guestCount = this.joinedUserEntities().filter(userEntity => userEntity.isGuest()).length;
              if (!guestCount) {
                return t('conversationCreateTeam', {}, replaceShowMore);
              }

              const hasSingleGuest = guestCount === 1;
              return hasSingleGuest
                ? t('conversationCreateTeamGuest', {}, replaceShowMore)
                : t('conversationCreateTeamGuests', guestCount, replaceShowMore);
            }

            return this.exceedsMaxVisibleUsers()
              ? t('conversationCreateWithMore', {count, users}, replaceShowMore)
              : t('conversationCreateWith', users);
          }

          if (this.user().is_me) {
            return this.exceedsMaxVisibleUsers()
              ? t('conversationCreatedYouMore', {count, users}, replaceShowMore)
              : t('conversationCreatedYou', users);
          }

          return this.exceedsMaxVisibleUsers()
            ? t('conversationCreatedMore', {count, name, users}, replaceShowMore)
            : t('conversationCreated', {name, users});
        }

        case z.message.SystemMessageType.CONVERSATION_RESUME: {
          return t('conversationResume', this._generateNameString(false, Declension.DATIVE));
        }

        default:
          break;
      }

      switch (this.type) {
        case z.event.Backend.CONVERSATION.MEMBER_JOIN: {
          const senderJoined = this.otherUser().id === this.user().id;
          if (senderJoined) {
            return this.user().is_me
              ? t('conversationMemberJoinedSelfYou')
              : t('conversationMemberJoinedSelf', this.senderName());
          }

          if (this.user().is_me) {
            return this.exceedsMaxVisibleUsers()
              ? t('conversationMemberJoinedYouMore', {count, users}, replaceShowMore)
              : t('conversationMemberJoinedYou', users, replaceShowMore);
          }
          return this.exceedsMaxVisibleUsers()
            ? t('conversationMemberJoinedMore', {count, name, users}, replaceShowMore)
            : t('conversationMemberJoined', {name, users}, replaceShowMore);
        }

        case z.event.Backend.CONVERSATION.MEMBER_LEAVE: {
          const temporaryGuestRemoval = this.otherUser().is_me && this.otherUser().isTemporaryGuest();
          if (temporaryGuestRemoval) {
            return t('temporaryGuestLeaveMessage');
          }

          const senderLeft = this.otherUser().id === this.user().id;
          if (senderLeft) {
            return this.user().is_me ? t('conversationMemberLeftYou') : t('conversationMemberLeft', name);
          }

          const allUsers = this._generateNameString();
          return this.user().is_me
            ? t('conversationMemberRemovedYou', allUsers)
            : t('conversationMemberRemoved', {name, users: allUsers});
        }

        case z.event.Client.CONVERSATION.TEAM_MEMBER_LEAVE: {
          return t('conversationTeamLeft', name);
        }

        default:
          break;
      }
      return '';
    });

    this.htmlGroupCreationHeader = ko.pureComputed(() => {
      if (this.showNamedCreation()) {
        if (this.user().isTemporaryGuest()) {
          return t('conversationCreateTemporary');
        }

        const groupCreationString = this.user().is_me
          ? t('conversationCreatedNameYou')
          : t('conversationCreatedName', this.senderName());
        return z.util.StringUtil.capitalizeFirstChar(groupCreationString);
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

  _generateNameString(skipAnd = false, declension = Declension.ACCUSATIVE) {
    return joinNames(this.visibleUsers(), declension, skipAnd, true);
  }

  isConnection() {
    const connectionMessageTypes = [
      z.message.SystemMessageType.CONNECTION_ACCEPTED,
      z.message.SystemMessageType.CONNECTION_REQUEST,
    ];

    return connectionMessageTypes.includes(this.memberMessageType);
  }

  isConnectionRequest() {
    return this.memberMessageType === z.message.SystemMessageType.CONNECTION_REQUEST;
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

  isUserAffected(userId) {
    return this.userIds().includes(userId);
  }

  guestCount() {
    return this.joinedUserEntities().filter(user => user.isGuest()).length;
  }
};
