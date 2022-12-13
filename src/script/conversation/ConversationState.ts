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

import {ConnectionStatus} from '@wireapp/api-client/lib/connection/';
import {QualifiedId} from '@wireapp/api-client/lib/user';
import ko from 'knockout';
import {container, singleton} from 'tsyringe';

import {matchQualifiedIds} from 'Util/QualifiedId';
import {sortGroupsByLastEvent} from 'Util/util';

import {isMLSConversation, isSelfConversation} from './ConversationSelectors';

import {Conversation} from '../entity/Conversation';
import {User} from '../entity/User';
import {TeamState} from '../team/TeamState';
import {UserState} from '../user/UserState';

@singleton()
export class ConversationState {
  /**
   * all the conversations available
   */
  public readonly conversations = ko.observableArray<Conversation>([]);
  /**
   * current conversation that is being viewed
   */
  public readonly activeConversation = ko.observable<Conversation | undefined>();
  /**
   * ordered list of conversations that are actives. This is basically the conversations we want to show to the user
   */
  public readonly visibleConversations: ko.PureComputed<Conversation[]>;
  public readonly filteredConversations: ko.PureComputed<Conversation[]>;
  public readonly archivedConversations: ko.PureComputed<Conversation[]>;
  private readonly selfProteusConversation: ko.PureComputed<Conversation | undefined>;
  private readonly selfMLSConversation: ko.PureComputed<Conversation | undefined>;
  public readonly unreadConversations: ko.PureComputed<Conversation[]>;
  public readonly connectedUsers: ko.PureComputed<User[]>;

  public readonly sortedConversations: ko.PureComputed<Conversation[]>;

  constructor(
    private readonly userState = container.resolve(UserState),
    private readonly teamState = container.resolve(TeamState),
  ) {
    this.sortedConversations = ko.pureComputed(() => this.filteredConversations().sort(sortGroupsByLastEvent));
    this.selfProteusConversation = ko.pureComputed(() =>
      this.conversations().find(conversation => !isMLSConversation(conversation) && isSelfConversation(conversation)),
    );
    this.selfMLSConversation = ko.pureComputed(() =>
      this.conversations().find(conversation => isMLSConversation(conversation) && isSelfConversation(conversation)),
    );

    this.visibleConversations = ko.pureComputed(() => {
      return this.sortedConversations().filter(
        conversation => !conversation.is_cleared() && !conversation.is_archived(),
      );
    });
    this.unreadConversations = ko.pureComputed(() => {
      return this.visibleConversations().filter(conversationEntity => conversationEntity.hasUnread());
    });

    this.archivedConversations = ko.pureComputed(() => {
      return this.sortedConversations().filter(conversation => conversation.is_archived());
    });

    this.filteredConversations = ko.pureComputed(() => {
      return this.conversations().filter(conversationEntity => {
        const states_to_filter = [
          ConnectionStatus.MISSING_LEGAL_HOLD_CONSENT,
          ConnectionStatus.BLOCKED,
          ConnectionStatus.CANCELLED,
          ConnectionStatus.PENDING,
        ];

        if (
          isSelfConversation(conversationEntity) ||
          states_to_filter.includes(conversationEntity.connection().status())
        ) {
          return false;
        }

        return !(conversationEntity.is_cleared() && conversationEntity.removed_from_conversation());
      });
    });

    this.connectedUsers = ko.pureComputed(() => {
      const inviterId = this.teamState.memberInviters()[this.userState.self()?.id];
      const inviter = inviterId ? this.userState.users().find(({id}) => id === inviterId) : null;
      const connectedUsers = inviter ? [inviter] : [];
      const selfTeamId = this.userState.self()?.teamId;
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
   * Returns all the selfConversations available (proteus and MLS)
   * The MLS conversation can be manually filtered (in case MLS is not supported)
   * @param includeMLS will filter out the MLS self conversation if false
   */
  getSelfConversations(includeMLS: boolean): Conversation[] {
    const baseConversations = [this.selfProteusConversation()];
    const selfConversations = includeMLS ? baseConversations.concat(this.selfMLSConversation()) : baseConversations;
    return selfConversations.filter((conversation): conversation is Conversation => !!conversation);
  }

  getSelfProteusConversation(): Conversation {
    const proteusConversation = this.selfProteusConversation();
    if (!proteusConversation) {
      throw new Error('No proteus self conversation');
    }
    return proteusConversation;
  }

  getSelfMLSConversation(): Conversation {
    const proteusConversation = this.selfMLSConversation();
    if (!proteusConversation) {
      throw new Error('No MLS self conversation');
    }
    return proteusConversation;
  }

  /**
   * returns true if the conversation should be visible to the user
   * @param conversation the conversation to check visibility
   */
  isVisible(conversation?: Conversation): conversation is Conversation {
    return (
      !!conversation &&
      this.visibleConversations().some(conv => matchQualifiedIds(conv.qualifiedId, conversation.qualifiedId))
    );
  }

  /**
   * Get unarchived conversation with the most recent event.
   * @param allConversations Search all conversations
   * @returns Most recent conversation
   */
  getMostRecentConversation(allConversations: boolean = false): Conversation | undefined {
    const [conversationEntity] = allConversations ? this.sortedConversations() : this.visibleConversations();
    return conversationEntity;
  }

  /**
   * Find a local conversation by ID.
   * @returns Conversation is locally available
   */
  findConversation(conversationId: QualifiedId): Conversation | undefined {
    // we prevent access to local conversation if the team is deleted
    return this.teamState.isTeamDeleted()
      ? undefined
      : this.conversations().find(conversation => {
          return matchQualifiedIds(conversation, conversationId);
        });
  }

  isSelfConversation(conversationId: QualifiedId): boolean {
    const selfConversationIds: QualifiedId[] = [this.selfProteusConversation(), this.selfMLSConversation()]
      .filter((conversation): conversation is Conversation => !!conversation)
      .map(conversation => conversation.qualifiedId);

    return selfConversationIds.some(selfConversation => matchQualifiedIds(selfConversation, conversationId));
  }

  findConversationByGroupId(groupId: string): Conversation | undefined {
    return this.conversations().find(conversation => conversation.groupId === groupId);
  }

  /**
   * Check whether conversation is currently displayed.
   */
  isActiveConversation(conversationEntity: Conversation): boolean {
    const activeConversation = this.activeConversation();
    return !!activeConversation && !!conversationEntity && matchQualifiedIds(activeConversation, conversationEntity);
  }
}
