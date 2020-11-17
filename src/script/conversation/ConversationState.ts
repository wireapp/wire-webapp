/*
 * Wire
 * Copyright (C) 2020 Wire Swiss GmbH
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

import ko from 'knockout';
import {container, singleton} from 'tsyringe';
import {sortGroupsByLastEvent} from 'Util/util';
import {Conversation} from '../entity/Conversation';
import {ConnectionStatus} from '@wireapp/api-client/src/connection';
import {User} from '../entity/User';
import {UserState} from '../user/UserState';
import {TeamState} from '../team/TeamState';

@singleton()
export class ConversationState {
  public readonly conversations_cleared: ko.ObservableArray<Conversation>;
  public readonly sorted_conversations: ko.PureComputed<Conversation[]>;
  public readonly activeConversation: ko.Observable<Conversation>;
  public readonly connectedUsers: ko.PureComputed<User[]>;
  public readonly conversations_archived: ko.ObservableArray<Conversation>;
  public readonly conversations_unarchived: ko.ObservableArray<Conversation>;
  public readonly conversations: ko.ObservableArray<Conversation>;
  public readonly filtered_conversations: ko.PureComputed<Conversation[]>;
  public readonly self_conversation: ko.PureComputed<Conversation>;

  constructor(
    private readonly userState = container.resolve(UserState),
    private readonly teamState = container.resolve(TeamState),
  ) {
    this.activeConversation = ko.observable();
    this.conversations = ko.observableArray([]);
    this.conversations_archived = ko.observableArray([]);
    this.conversations_cleared = ko.observableArray([]);
    this.conversations_unarchived = ko.observableArray([]);

    this.sorted_conversations = ko.pureComputed(() => this.filtered_conversations().sort(sortGroupsByLastEvent));
    this.self_conversation = ko.pureComputed(() => this.findConversation(this.userState.self()?.id));

    this.filtered_conversations = ko.pureComputed(() => {
      return this.conversations().filter(conversationEntity => {
        const states_to_filter = [ConnectionStatus.BLOCKED, ConnectionStatus.CANCELLED, ConnectionStatus.PENDING];

        if (conversationEntity.isSelf() || states_to_filter.includes(conversationEntity.connection().status())) {
          return false;
        }

        return !(conversationEntity.is_cleared() && conversationEntity.removed_from_conversation());
      });
    });

    this.connectedUsers = ko.pureComputed(() => {
      const inviterId = this.teamState.memberInviters()[this.userState.self().id];
      const inviter = inviterId ? this.userState.users().find(({id}) => id === inviterId) : null;
      const connectedUsers = inviter ? [inviter] : [];
      const selfTeamId = this.userState.self().teamId;
      for (const conversation of this.conversations()) {
        for (const user of conversation.participating_user_ets()) {
          const isNotService = !user.isService;
          const isNotIncluded = !connectedUsers.includes(user);
          if (isNotService && isNotIncluded && (user.teamId === selfTeamId || user.isConnected())) {
            connectedUsers.push(user);
          }
        }
      }
      return connectedUsers;
    });
  }

  /**
   * Find a local conversation by ID.
   * @param conversationId ID of conversation to get
   * @returns Conversation is locally available
   */
  findConversation(conversationId: string) {
    // we prevent access to local conversation if the team is deleted
    return this.teamState.isTeamDeleted()
      ? undefined
      : this.conversations().find(conversation => conversation.id === conversationId);
  }

  /**
   * Check whether conversation is currently displayed.
   */
  isActiveConversation(conversationEntity: Conversation): boolean {
    const activeConversation = this.activeConversation();
    return !!activeConversation && !!conversationEntity && activeConversation.id === conversationEntity.id;
  }
}
