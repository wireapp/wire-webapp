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

import {amplify} from 'amplify';
import ko from 'knockout';

import {createRandomUuid} from 'Util/util';

import {t} from 'Util/LocalizerUtil';
import {Conversation} from '../entity/Conversation';
import {WebAppEvents} from '../event/WebApp';
import {ModalsViewModel} from '../view_model/ModalsViewModel';

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

  getFavoriteLabel = (): ConversationLabel => this.labels().find(({type}) => type === LabelType.Favorite);
  getLabelById = (labelId: string): ConversationLabel => this.labels().find(({id}) => id === labelId);

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
      return this.getConversationCustomLabel(conversation).id;
    }
    if (this.getFavorites().includes(conversation)) {
      return DefaultLabelIds.Favorites;
    }
    if (conversation.isGroup()) {
      return DefaultLabelIds.Groups;
    }
    return DefaultLabelIds.Contacts;
  };

  getConversationCustomLabel = (conversation: Conversation) =>
    this.labels().find(({conversations}) => conversations.includes(conversation));

  getLabels = (): ConversationLabel[] => this.labels().filter(({type}) => type === LabelType.Custom);

  removeConversationFromLabel = (label: ConversationLabel, removeConversation: Conversation) => {
    label.conversations = label.conversations.filter(conversation => conversation !== removeConversation);
    if (label.conversations.length) {
      return this.labels.valueHasMutated();
    }
    this.labels.remove(label);
  };

  addConversationToLabel = (label: ConversationLabel, conversation: Conversation) => {
    label.conversations.push(conversation);
    this.labels.valueHasMutated();
  };

  addConversationToNewLabel = (conversation: Conversation) => {
    amplify.publish(WebAppEvents.WARNING.MODAL, ModalsViewModel.TYPE.INPUT, {
      primaryAction: {
        action: (name: string) => {
          const newFolder = createLabel(name, [conversation]);
          this.labels.push(newFolder);
        },
        text: 'Create',
      },
      text: {
        input: 'Folder name',
        message: 'Move the conversation to a new folder',
        title: 'Create new folder',
      },
    });
  };
}
