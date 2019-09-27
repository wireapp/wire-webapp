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

import ko from 'knockout';
import {createRandomUuid} from 'Util/util';

import {t} from 'Util/LocalizerUtil';
import {Conversation} from '../entity/Conversation';

export enum LabelType {
  Custom = 1,
  Favorite = 2,
}

enum DefaultLabelIds {
  Groups = 'groups',
  Contacts = 'contacts',
  Favorites = 'favorites',
}

export interface ConversationLabel {
  id: string;
  name: string;
  conversations: Conversation[];
  type: LabelType;
}

export const createLabel = (
  name: string,
  conversations: Conversation[] = [],
  id: string = createRandomUuid(),
  type: LabelType = LabelType.Custom,
): ConversationLabel => ({
  conversations,
  id,
  name,
  type,
});

export const createLabelGroups = (groups: Conversation[] = []) =>
  createLabel(t('conversationLabelGroups'), groups, DefaultLabelIds.Groups);

export const createLabelContacts = (contacts: Conversation[] = []) =>
  createLabel(t('conversationLabelContacts'), contacts, DefaultLabelIds.Contacts);

export const createLabelFavorites = (favorites: Conversation[] = []) =>
  createLabel(t('conversationLabelFavorites'), favorites, DefaultLabelIds.Favorites);

export class ConversationLabelRepository {
  labels: ko.ObservableArray<ConversationLabel>;
  allLabeledConversations: ko.Computed<Conversation[]>;

  constructor(private readonly conversations: ko.ObservableArray<Conversation>) {
    this.labels = ko.observableArray([]);
    this.allLabeledConversations = ko.computed(() =>
      this.labels().reduce(
        (accumulated: Conversation[], {conversations, type}) =>
          type === LabelType.Custom ? accumulated.concat(conversations) : accumulated,
        [],
      ),
    );
  }

  getGroupsWithoutLabel = () => {
    return this.conversations().filter(
      conversation => conversation.isGroup() && !this.allLabeledConversations().includes(conversation),
    );
  };

  getContactsWithoutLabel = () => {
    return this.conversations().filter(
      conversation => !conversation.isGroup() && !this.allLabeledConversations().includes(conversation),
    );
  };

  getFavoriteLabel = () => this.labels().find(({type}) => type === LabelType.Favorite);

  getFavorites = () => {
    const favoriteLabel = this.getFavoriteLabel();
    return favoriteLabel ? favoriteLabel.conversations : [];
  };

  isFavorite = (conversation: Conversation): boolean => this.getFavorites().includes(conversation);

  addConversationToFavorites = (addedConversation: Conversation): void => {
    let favoriteLabel = this.getFavoriteLabel();
    if (!favoriteLabel) {
      favoriteLabel = createLabel('Favorites', undefined, undefined, LabelType.Favorite);
      this.labels.push(favoriteLabel);
    }
    favoriteLabel.conversations.push(addedConversation);
    this.labels.valueHasMutated();
  };

  removeConversationFromFavorites = (removedConversation: Conversation): void => {
    const favoriteLabel = this.getFavoriteLabel();
    if (favoriteLabel) {
      favoriteLabel.conversations = favoriteLabel.conversations.filter(
        conversation => conversation !== removedConversation,
      );
    }
    this.labels.valueHasMutated();
  };

  getConversationLabelId = (conversation: Conversation) => {
    if (this.allLabeledConversations().includes(conversation)) {
      const label = this.labels().find(({conversations}) => conversations.includes(conversation));
      return label.id;
    }
    if (this.getFavorites().includes(conversation)) {
      return DefaultLabelIds.Favorites;
    }
    if (conversation.isGroup()) {
      return DefaultLabelIds.Groups;
    }
    return DefaultLabelIds.Contacts;
  };
}
