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

import {MemberLeaveReason} from '@wireapp/api-client/lib/conversation/data/';
import {CONVERSATION_EVENT} from '@wireapp/api-client/lib/event/';
import type {QualifiedId} from '@wireapp/api-client/lib/user/';
import ko from 'knockout';

import {ClientEvent} from 'Repositories/event/Client';
import {type Translate, Declension, getUserName} from 'Util/localizerUtil';
import {matchQualifiedIds} from 'Util/qualifiedId';
import {capitalizeFirstChar} from 'Util/stringUtil';

import {SystemMessage} from './systemMessage';

import {SuperType} from '../../../message/superType';
import {SystemMessageType} from '../../../message/systemMessageType';
import {User} from '../User';

export const groupCreationHeaderSenderNameMarkerStart = '__wire_group_creation_sender_name_start__';
export const groupCreationHeaderSenderNameMarkerEnd = '__wire_group_creation_sender_name_end__';

const groupCreationHeaderSenderNameMarker = `${groupCreationHeaderSenderNameMarkerStart}value${groupCreationHeaderSenderNameMarkerEnd}`;

type GroupCreationHeaderTranslationOptions = {
  readonly isNamedCreation: boolean;
  readonly isTemporaryGuest: boolean;
  readonly isCurrentUser: boolean;
  readonly senderName: string;
  readonly translate: Translate;
};

function translateGroupCreationHeader(options: GroupCreationHeaderTranslationOptions): string {
  if (options.isNamedCreation === false) {
    return '';
  }

  if (options.isTemporaryGuest) {
    return options.translate('conversationCreateTemporary');
  }

  const groupCreationString = options.isCurrentUser
    ? options.translate('conversationCreatedNameYou')
    : options.translate('conversationCreatedName', {name: options.senderName});

  return capitalizeFirstChar(groupCreationString);
}

export class MemberMessage extends SystemMessage {
  public allTeamMembers: User[] | undefined;
  public readonly hasUsers: ko.PureComputed<boolean>;
  public readonly userIds: ko.ObservableArray<QualifiedId>;
  public readonly userEntities: ko.ObservableArray<User>;
  /** Users that are affected by the event */
  public readonly targetedUsers: ko.PureComputed<User[]>;
  public readonly name: ko.Observable<string>;
  public readonly otherUser: ko.PureComputed<User>;
  public readonly showNamedCreation: ko.PureComputed<boolean>;
  public readonly htmlGroupCreationHeader: ko.PureComputed<string>;
  public readonly reactGroupCreationHeader: ko.PureComputed<string>;
  public readonly remoteUserEntities: ko.PureComputed<User[]>;
  public showServicesWarning: boolean;
  public memberMessageType: SystemMessageType;
  public reason?: MemberLeaveReason;
  /** this can be used to check uniqueness of the message. It's computed using the timestamp + users involved in the event */
  public readonly hash: ko.PureComputed<string>;

  constructor(translate: Translate) {
    super(translate);

    this.super_type = SuperType.MEMBER;
    this.memberMessageType = SystemMessageType.NORMAL;

    this.userEntities = ko.observableArray<User>([]);
    this.userIds = ko.observableArray();
    this.name = ko.observable('');

    this.hasUsers = ko.pureComputed(() => {
      return this.userEntities().length > 0;
    });
    this.allTeamMembers = undefined;
    this.showServicesWarning = false;

    this.hash = ko.pureComputed(() => {
      const users = this.userIds().map(({id}) => id);
      return `${this.timestamp()}${users.join('')}`;
    });

    this.targetedUsers = ko.pureComputed(() => {
      return this.userEntities().filter(userEntity => {
        return matchQualifiedIds(this.user(), userEntity) === false;
      });
    });

    // Users joined the conversation without self
    this.remoteUserEntities = ko.pureComputed(() => {
      return this.userEntities().filter(userEntity => {
        return userEntity.isMe === false;
      });
    });

    this.senderName = ko.pureComputed(() => {
      const isTeamMemberLeave = this.type === ClientEvent.CONVERSATION.TEAM_MEMBER_LEAVE;
      return isTeamMemberLeave ? this.name() : getUserName(this.user(), this.translate, Declension.NOMINATIVE, true);
    });

    this.showNamedCreation = ko.pureComputed(() => {
      return this.isConversationCreate() && this.name().length > 0;
    });

    this.otherUser = ko.pureComputed(() => {
      return this.hasUsers() ? this.userEntities()[0] : new User('', '', this.translate);
    });

    this.htmlGroupCreationHeader = ko.pureComputed(() => {
      return translateGroupCreationHeader({
        isNamedCreation: this.showNamedCreation(),
        isTemporaryGuest: this.user().isTemporaryGuest(),
        isCurrentUser: this.user().isMe,
        senderName: this.senderName(),
        translate: this.translate,
      });
    });
    this.reactGroupCreationHeader = ko.pureComputed(() => {
      return translateGroupCreationHeader({
        isNamedCreation: this.showNamedCreation(),
        isTemporaryGuest: this.user().isTemporaryGuest(),
        isCurrentUser: this.user().isMe,
        senderName: groupCreationHeaderSenderNameMarker,
        translate: this.translate,
      });
    });
  }

  isConnection(): boolean {
    const connectionMessageTypes = [SystemMessageType.CONNECTION_ACCEPTED, SystemMessageType.CONNECTION_REQUEST];
    return connectionMessageTypes.includes(this.memberMessageType);
  }

  isConnectionRequest(): boolean {
    return this.memberMessageType === SystemMessageType.CONNECTION_REQUEST;
  }

  isCreation(): boolean {
    return [
      SystemMessageType.CONNECTION_ACCEPTED,
      SystemMessageType.CONNECTION_REQUEST,
      SystemMessageType.CONVERSATION_CREATE,
      SystemMessageType.CONVERSATION_RESUME,
    ].includes(this.memberMessageType);
  }

  isConversationCreate(): boolean {
    return this.memberMessageType === SystemMessageType.CONVERSATION_CREATE;
  }

  isConversationResume(): boolean {
    return this.memberMessageType === SystemMessageType.CONVERSATION_RESUME;
  }

  isGroupCreation(): boolean {
    return this.isConversationCreate() || this.isConversationResume();
  }

  isMemberChange(): boolean {
    return this.isMemberJoin() || this.isMemberLeave() || this.isTeamMemberLeave();
  }

  isMemberJoin(): boolean {
    return this.type === CONVERSATION_EVENT.MEMBER_JOIN;
  }

  isMemberLeave(): boolean {
    return this.type === CONVERSATION_EVENT.MEMBER_LEAVE;
  }

  isTeamMemberLeave(): boolean {
    return this.type === ClientEvent.CONVERSATION.TEAM_MEMBER_LEAVE;
  }

  isMemberRemoval(): boolean {
    return this.isMemberLeave() || this.isTeamMemberLeave();
  }

  isUserAffected(userId: QualifiedId): boolean {
    return !!this.userIds().find(user => matchQualifiedIds(user, userId));
  }
}
