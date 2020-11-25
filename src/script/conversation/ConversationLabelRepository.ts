/*
 * Wire
 * Copyright (C) 2019 Wire Swiss GmbH
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
import {WebAppEvents} from '@wireapp/webapp-events';
import {USER_EVENT} from '@wireapp/api-client/src/event';
import ko from 'knockout';

import {t} from 'Util/LocalizerUtil';
import {Logger, getLogger} from 'Util/Logger';
import {createRandomUuid} from 'Util/util';

import type {Conversation} from '../entity/Conversation';
import type {PropertiesService} from '../properties/PropertiesService';
import {ModalsViewModel} from '../view_model/ModalsViewModel';

export enum LabelType {
  Custom = 0,
  Favorite = 1,
}

export enum DefaultLabelIds {
  Contacts = 'contacts',
  Favorites = 'favorites',
  Groups = 'groups',
}

export interface ConversationLabel {
  conversations: ko.ObservableArray<Conversation>;
  id: string;
  name: string;
  type: LabelType;
}

interface ConversationLabelJson extends Omit<ConversationLabel, 'conversations'> {
  conversations: string[];
}

interface LabelProperty {
  labels: ConversationLabelJson[];
}

const propertiesKey = 'labels';

export const createLabel = (
  name: string,
  conversations: Conversation[] = [],
  id: string = createRandomUuid(),
  type: LabelType = LabelType.Custom,
): ConversationLabel => ({
  conversations: ko.observableArray(conversations),
  id,
  name,
  type,
});

export const createLabelGroups = (groups: Conversation[] = []) =>
  createLabel(t('conversationLabelGroups'), groups, DefaultLabelIds.Groups);

export const createLabelPeople = (contacts: Conversation[] = []) =>
  createLabel(t('conversationLabelPeople'), contacts, DefaultLabelIds.Contacts);

export const createLabelFavorites = (favorites: Conversation[] = []) =>
  createLabel(t('conversationLabelFavorites'), favorites, DefaultLabelIds.Favorites);

export class ConversationLabelRepository {
  labels: ko.ObservableArray<ConversationLabel>;
  allLabeledConversations: ko.Computed<Conversation[]>;
  logger: Logger;

  constructor(
    private readonly allConversations: ko.ObservableArray<Conversation>,
    private readonly conversations: ko.ObservableArray<Conversation>,
    private readonly propertiesService: PropertiesService,
  ) {
    this.labels = ko.observableArray([]);
    this.allLabeledConversations = ko.pureComputed(() =>
      this.labels().reduce(
        (accumulated: Conversation[], {conversations, type}) =>
          type === LabelType.Custom ? accumulated.concat(conversations()) : accumulated,
        [],
      ),
    );
    this.logger = getLogger('ConversationLabelRepository');
    amplify.subscribe(WebAppEvents.USER.EVENT_FROM_BACKEND, this.onUserEvent);
  }

  marshal = (): LabelProperty => {
    const labelJson = this.labels().map(({id, type, name, conversations}) => ({
      conversations: conversations().map(({id}) => id),
      id,
      name,
      type,
    }));
    return {labels: labelJson};
  };

  unmarshal = (labelJson: LabelProperty) => {
    const labels = labelJson.labels.map(
      ({id, type, name, conversations}): ConversationLabel => ({
        conversations: ko.observableArray(
          conversations
            .map(conversationId =>
              this.allConversations().find(({id}) => id.toLowerCase() === conversationId.toLowerCase()),
            )
            .filter(conversation => !!conversation),
        ),
        id,
        name,
        type,
      }),
    );
    this.labels(labels);
  };

  saveLabels = () => {
    this.propertiesService.putPropertiesByKey(propertiesKey, this.marshal());
  };

  loadLabels = async () => {
    try {
      const labelProperties = await this.propertiesService.getPropertiesByKey(propertiesKey);
      this.unmarshal(labelProperties);
    } catch (error) {
      this.logger.warn(`No labels were loaded: ${error.message}`);
    }
  };

  onUserEvent = (event: any) => {
    if (event.type === USER_EVENT.PROPERTIES_SET && event.key === propertiesKey) {
      this.unmarshal(event.value);
    }
  };

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

  getFavorites = (): Conversation[] => this.getLabelConversations(this.getFavoriteLabel());

  getLabelConversations = (label: ConversationLabel): Conversation[] =>
    label ? this.conversations().filter(conversation => label.conversations().includes(conversation)) : [];

  isFavorite = (conversation: Conversation): boolean => this.getFavorites().includes(conversation);

  addConversationToFavorites = (addedConversation: Conversation): void => {
    let favoriteLabel = this.getFavoriteLabel();
    if (!favoriteLabel) {
      // The favorite label doesn't need a name since it is set at runtime for i18n compatibility
      favoriteLabel = createLabel('', undefined, undefined, LabelType.Favorite);
      this.labels.push(favoriteLabel);
    }
    favoriteLabel.conversations.push(addedConversation);
    this.saveLabels();
  };

  removeConversationFromFavorites = (removedConversation: Conversation): void => {
    const favoriteLabel = this.getFavoriteLabel();
    if (favoriteLabel) {
      favoriteLabel.conversations(
        favoriteLabel.conversations().filter(conversation => conversation !== removedConversation),
      );
    }
    this.saveLabels();
  };

  // TODO: Write test cases!
  getConversationLabelIds = (conversation: Conversation): string[] => {
    const ids: string[] = [];

    if (this.getFavorites().includes(conversation)) {
      ids.push(DefaultLabelIds.Favorites);
    }

    const isInCustomFolder = this.allLabeledConversations().includes(conversation);

    if (isInCustomFolder) {
      ids.push(this.getConversationCustomLabel(conversation).id);
    } else if (conversation.isGroup()) {
      ids.push(DefaultLabelIds.Groups);
    } else {
      ids.push(DefaultLabelIds.Contacts);
    }

    return ids;
  };

  getConversationCustomLabel = (conversation: Conversation, includeFavorites: boolean = false) =>
    this.labels().find(
      ({type, conversations}) =>
        (includeFavorites || type === LabelType.Custom) && conversations().includes(conversation),
    );

  getLabels = (): ConversationLabel[] =>
    this.labels()
      .filter(({type}) => type === LabelType.Custom)
      .sort(({name: nameA}, {name: nameB}) => nameA.localeCompare(nameB, undefined, {sensitivity: 'base'}));

  removeConversationFromLabel = (label: ConversationLabel, removeConversation: Conversation): void => {
    label.conversations(label.conversations().filter(conversation => conversation !== removeConversation));
    if (!label.conversations().length) {
      this.labels.remove(label);
    }
    this.saveLabels();
  };

  removeConversationFromAllLabels = (removeConversation: Conversation, removeFromFavorites: boolean = false): void => {
    this.labels().forEach(label => {
      const isCustom = label.type === LabelType.Custom;
      if (removeFromFavorites || isCustom) {
        label.conversations(label.conversations().filter(conversation => conversation !== removeConversation));
      }
      if (isCustom && !label.conversations().length) {
        this.labels.remove(label);
      }
    });
  };

  addConversationToLabel = (label: ConversationLabel, conversation: Conversation): void => {
    if (!label.conversations().includes(conversation)) {
      this.removeConversationFromAllLabels(conversation);
      label.conversations.push(conversation);
      amplify.publish(WebAppEvents.CONTENT.EXPAND_FOLDER, label.id);
      this.saveLabels();
    }
  };

  addConversationToNewLabel = (conversation: Conversation) => {
    amplify.publish(WebAppEvents.WARNING.MODAL, ModalsViewModel.TYPE.INPUT, {
      primaryAction: {
        action: (name: string) => {
          this.removeConversationFromAllLabels(conversation);
          const newFolder = createLabel(name, [conversation]);
          this.labels.push(newFolder);
          amplify.publish(WebAppEvents.CONTENT.EXPAND_FOLDER, newFolder.id);
          this.saveLabels();
        },
        text: t('modalCreateFolderAction'),
      },
      text: {
        input: t('modalCreateFolderPlaceholder'),
        message: t('modalCreateFolderMessage'),
        title: t('modalCreateFolderHeadline'),
      },
    });
  };
}
