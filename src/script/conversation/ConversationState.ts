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

import {QualifiedId} from '@wireapp/api-client/lib/user';
import ko from 'knockout';
import {container, singleton} from 'tsyringe';

import {matchQualifiedIds} from 'Util/QualifiedId';
import {sortGroupsByLastEvent} from 'Util/util';

import {
  MLSConversation,
  ProteusConversation,
  isMLS1to1ConversationWithUser,
  isMLSConversation,
  isProteus1to1ConversationWithUser,
  isSelfConversation,
  isReadableConversation,
} from './ConversationSelectors';

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
  public readonly groupConversations: ko.PureComputed<Conversation[]>;
  public readonly directConversations: ko.PureComputed<Conversation[]>;
  public readonly selfProteusConversation: ko.PureComputed<Conversation | undefined>;
  public readonly selfMLSConversation: ko.PureComputed<MLSConversation | undefined>;
  public readonly unreadConversations: ko.PureComputed<Conversation[]>;
  /**
   * All the users that are connected to the selfUser through a conversation. Those users are not necessarily **directly** connected to the selfUser (through a connection request)
   */
  public readonly connectedUsers: ko.PureComputed<User[]>;

  public readonly sortedConversations: ko.PureComputed<Conversation[]>;
  /**
   * conversations that could not be loaded because their back-end is currently offline
   */
  public missingConversations: QualifiedId[] = [];

  constructor(
    private readonly userState = container.resolve(UserState),
    private readonly teamState = container.resolve(TeamState),
  ) {
    this.sortedConversations = ko.pureComputed(() => this.filteredConversations().sort(sortGroupsByLastEvent));
    this.selfProteusConversation = ko.pureComputed(() =>
      this.conversations().find(conversation => !isMLSConversation(conversation) && isSelfConversation(conversation)),
    );
    this.selfMLSConversation = ko.pureComputed(() =>
      this.conversations().find(
        (conversation): conversation is MLSConversation =>
          isMLSConversation(conversation) && isSelfConversation(conversation),
      ),
    );

    this.visibleConversations = ko.pureComputed(() => {
      return this.sortedConversations().filter(
        conversation =>
          !conversation.is_archived() &&
          // We filter out 1 on 1 conversation with unavailable users that don't have messages
          (!conversation.is1to1() ||
            conversation.hasContentMessages() ||
            conversation.firstUserEntity()?.isAvailable()),
      );
    });
    this.unreadConversations = ko.pureComputed(() => {
      return this.visibleConversations().filter(conversationEntity => conversationEntity.hasUnread());
    });

    this.archivedConversations = ko.pureComputed(() => {
      return this.sortedConversations().filter(conversation => conversation.is_archived());
    });

    this.groupConversations = ko.pureComputed(() => {
      return this.sortedConversations().filter(conversation => conversation.isGroup());
    });

    this.directConversations = ko.pureComputed(() => {
      return this.sortedConversations().filter(
        conversation =>
          conversation.is1to1() && (conversation.firstUserEntity()?.isAvailable() || conversation.hasContentMessages()),
      );
    });

    this.filteredConversations = ko.pureComputed(() => {
      return this.conversations().filter(isReadableConversation);
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

  getSelfMLSConversation(): MLSConversation {
    const mlsConversation = this.selfMLSConversation();
    if (!mlsConversation) {
      throw new Error('No MLS self conversation');
    }
    return mlsConversation;
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

  /**
   * Indicates whether the selfUser has a conversation (1:1 or group conversation) with this other user
   * @param user the user to check
   */
  hasConversationWith(user: User) {
    return this.connectedUsers().some(connectedUser => matchQualifiedIds(connectedUser.qualifiedId, user.qualifiedId));
  }

  /**
   * Find a local 1:1 proteus conversation with a user.
   * Because of team-owned 1:1 conversations work (they are really group conversations),
   * it's possible that there is more that one proteus 1:1 team conversation with the same user.
   * @returns ProteusConversation if locally available, otherwise null
   */
  findProteus1to1Conversations(userId: QualifiedId): ProteusConversation[] | null {
    const foundConversations = this.conversations().filter(isProteus1to1ConversationWithUser(userId));

    return foundConversations.length > 0 ? foundConversations : null;
  }

  /**
   * Find a local 1:1 mls conversation with a user.
   * @returns Conversation if locally available, otherwise null
   */
  findMLS1to1Conversation(userId: QualifiedId): MLSConversation | null {
    const mlsConversation = this.conversations().find(isMLS1to1ConversationWithUser(userId));
    return mlsConversation || null;
  }

  has1to1ConversationWithUser(userId: QualifiedId): boolean {
    const foundMLSConversation = this.findMLS1to1Conversation(userId);
    if (foundMLSConversation) {
      return true;
    }

    const foundProteusConversations = this.findProteus1to1Conversations(userId);
    return !!foundProteusConversations && foundProteusConversations.length > 0;
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
  isActiveConversation(conversationEntity?: Conversation): boolean {
    if (!conversationEntity) {
      return false;
    }

    const activeConversation = this.activeConversation();
    return !!activeConversation && !!conversationEntity && matchQualifiedIds(activeConversation, conversationEntity);
  }
}
