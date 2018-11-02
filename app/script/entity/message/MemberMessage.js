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
        : z.util.SanitizationUtil.getFirstName(this.user(), z.string.Declension.NOMINATIVE, true);
    });

    this.showNamedCreation = ko.pureComputed(() => this.isConversationCreate() && this.name().length);

    this.otherUser = ko.pureComputed(() => (this.hasUsers() ? this.userEntities()[0] : new z.entity.User()));

    this.htmlCaption = ko.pureComputed(() => {
      if (!this.hasUsers()) {
        return '';
      }

      let substitutions;
      const replaceDangerously = {
        '/showmore': '</a>',
        showmore: '<a class="message-header-show-more" data-uie-name="do-show-more">',
      };

      switch (this.memberMessageType) {
        case z.message.SystemMessageType.CONNECTION_ACCEPTED:
        case z.message.SystemMessageType.CONNECTION_REQUEST: {
          if (this.otherUser()) {
            if (this.otherUser().isBlocked()) {
              return z.l10n.safeHtml(z.string.conversationConnectionBlocked);
            }

            if (this.otherUser().isOutgoingRequest()) {
              return '';
            }
          }

          return z.l10n.safeHtml(z.string.conversationConnectionAccepted);
        }

        case z.message.SystemMessageType.CONVERSATION_CREATE: {
          if (this.name().length) {
            const exceedsMaxTeam = this.joinedUserEntities().length > MemberMessage.CONFIG.MAX_WHOLE_TEAM_USERS_VISIBLE;
            if (this.allTeamMembers && exceedsMaxTeam) {
              const guestCount = this.joinedUserEntities().filter(userEntity => userEntity.isGuest()).length;
              substitutions = {replace: {count: guestCount}, replaceDangerously};
              if (!guestCount) {
                return z.l10n.safeHtml(z.string.conversationCreateTeam, substitutions);
              }

              const hasSingleGuest = guestCount === 1;
              const teamStringId = hasSingleGuest
                ? z.string.conversationCreateTeamGuest
                : z.string.conversationCreateTeamGuests;

              return z.l10n.safeHtml(teamStringId, substitutions);
            }

            const createStringId = this.exceedsMaxVisibleUsers()
              ? z.string.conversationCreateWithMore
              : z.string.conversationCreateWith;

            substitutions = {
              replace: {
                count: this.hiddenUserCount(),
                users: this._generateNameString(this.exceedsMaxVisibleUsers(), z.string.Declension.DATIVE),
              },
              replaceDangerously,
            };

            return z.l10n.safeHtml(createStringId, substitutions);
          }

          if (this.user().is_me) {
            const createStringId = this.exceedsMaxVisibleUsers()
              ? z.string.conversationCreatedYouMore
              : z.string.conversationCreatedYou;

            substitutions = {
              replace: {
                count: this.hiddenUserCount(),
                users: this._generateNameString(this.exceedsMaxVisibleUsers()),
              },
              replaceDangerously,
            };

            return z.l10n.safeHtml(createStringId, substitutions);
          }

          const createStringId = this.exceedsMaxVisibleUsers()
            ? z.string.conversationCreatedMore
            : z.string.conversationCreated;

          substitutions = {
            replace: {
              count: this.hiddenUserCount(),
              name: this.senderName(),
              users: this._generateNameString(this.exceedsMaxVisibleUsers(), z.string.Declension.DATIVE),
            },
            replaceDangerously,
          };

          return z.l10n.safeHtml(createStringId, substitutions);
        }

        case z.message.SystemMessageType.CONVERSATION_RESUME: {
          substitutions = {
            replace: {
              users: this._generateNameString(false, z.string.Declension.DATIVE),
            },
          };

          return z.l10n.safeHtml(z.string.conversationResume, substitutions);
        }

        default:
          break;
      }

      switch (this.type) {
        case z.event.Backend.CONVERSATION.MEMBER_JOIN: {
          const senderJoined = this.otherUser().id === this.user().id;
          if (senderJoined) {
            const userJoinedStringId = this.user().is_me
              ? z.string.conversationMemberJoinedSelfYou
              : z.string.conversationMemberJoinedSelf;
            return z.l10n.safeHtml(userJoinedStringId, this.senderName());
          }

          let userJoinedStringId = '';

          if (this.user().is_me) {
            userJoinedStringId = this.exceedsMaxVisibleUsers()
              ? z.string.conversationMemberJoinedYouMore
              : z.string.conversationMemberJoinedYou;
          } else {
            userJoinedStringId = this.exceedsMaxVisibleUsers()
              ? z.string.conversationMemberJoinedMore
              : z.string.conversationMemberJoined;
          }

          substitutions = {
            replace: {
              count: this.hiddenUserCount(),
              name: this.senderName(),
              users: this._generateNameString(this.exceedsMaxVisibleUsers()),
            },
            replaceDangerously,
          };

          return z.l10n.safeHtml(userJoinedStringId, substitutions);
        }

        case z.event.Backend.CONVERSATION.MEMBER_LEAVE: {
          const temporaryGuestRemoval = this.otherUser().is_me && this.otherUser().isTemporaryGuest();
          if (temporaryGuestRemoval) {
            return z.l10n.safeHtml(z.string.temporaryGuestLeaveMessage);
          }

          const senderLeft = this.otherUser().id === this.user().id;
          if (senderLeft) {
            const userLeftStringId = this.user().is_me
              ? z.string.conversationMemberLeftYou
              : z.string.conversationMemberLeft;
            return z.l10n.safeHtml(userLeftStringId, this.senderName());
          }

          const userRemovedStringId = this.user().is_me
            ? z.string.conversationMemberRemovedYou
            : z.string.conversationMemberRemoved;

          substitutions = {replace: {name: this.senderName(), users: this._generateNameString()}};
          return z.l10n.safeHtml(userRemovedStringId, substitutions);
        }

        case z.event.Client.CONVERSATION.TEAM_MEMBER_LEAVE: {
          return z.l10n.safeHtml(z.string.conversationTeamLeft, this.senderName());
        }

        default:
          break;
      }
      return '';
    });

    this.htmlGroupCreationHeader = ko.pureComputed(() => {
      if (this.showNamedCreation()) {
        if (this.user().isTemporaryGuest()) {
          return z.l10n.safeHtml(z.string.conversationCreateTemporary);
        }

        const groupCreationStringId = this.user().is_me
          ? z.string.conversationCreatedNameYou
          : z.string.conversationCreatedName;
        return z.util.StringUtil.capitalizeFirstChar(z.l10n.safeHtml(groupCreationStringId, this.senderName()));
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

  _generateNameString(skipAnd = false, declension = z.string.Declension.ACCUSATIVE) {
    return z.util.LocalizerUtil.joinNames(this.visibleUsers(), declension, skipAnd, true);
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
