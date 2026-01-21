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

import {USER_EVENT} from '@wireapp/api-client/lib/event/';
import {amplify} from 'amplify';
import ko from 'knockout';

import {WebAppEvents} from '@wireapp/webapp-events';

import {PrimaryModal} from 'Components/Modals/PrimaryModal';
import type {Conversation} from 'Repositories/entity/Conversation';
import type {PropertiesService} from 'Repositories/properties/PropertiesService';
import {SidebarTabs, useSidebarStore} from 'src/script/page/LeftSidebar/panels/Conversations/useSidebarStore';
import {t} from 'Util/LocalizerUtil';
import {getLogger, Logger} from 'Util/Logger';
import {TypedEventTarget} from 'Util/TypedEventTarget';
import {createUuid} from 'Util/uuid';

export enum LabelType {
  Custom = 0,
  Favorite = 1,
}

enum DefaultLabelIds {
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
  lastSyncTimestamp?: number;
  version?: number;
}

const propertiesKey = 'labels';

export const createLabel = (
  name: string,
  conversations: Conversation[] = [],
  id: string = createUuid(),
  type: LabelType = LabelType.Custom,
): ConversationLabel => ({
  conversations: ko.observableArray(conversations),
  id,
  name,
  type,
});

export class ConversationLabelRepository extends TypedEventTarget<{type: 'conversation-favorited'}> {
  labels: ko.ObservableArray<ConversationLabel>;
  private allLabeledConversations: ko.Computed<Conversation[]>;
  private logger: Logger;

  static LocalStorageKey = 'CONVERSATION_LABEL_REPOSITORY_PROPERTIES';

  constructor(
    private readonly allConversations: ko.ObservableArray<Conversation>,
    private readonly conversations: ko.PureComputed<Conversation[]>,
    private readonly propertiesService: PropertiesService,
  ) {
    super();
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

  readonly marshal = (): LabelProperty => {
    const labelJson = this.labels().map(({id, type, name, conversations}) => ({
      conversations: conversations().map(({id}) => id),
      id,
      name,
      type,
    }));

    return {labels: labelJson};
  };

  readonly unmarshal = (labelJson: LabelProperty) => {
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

  readonly saveLabels = () => {
    const currentData = this.marshal();
    const storedData = localStorage.getItem(ConversationLabelRepository.LocalStorageKey);
    let parsedStoredData: LabelProperty | null = null;

    if (storedData) {
      try {
        parsedStoredData = JSON.parse(storedData);
      } catch (error) {
        this.logger.warn(`Failed to parse stored labels: ${error instanceof Error ? error.message : String(error)}`);
        // Clear corrupted data
        localStorage.removeItem(ConversationLabelRepository.LocalStorageKey);
      }
    }

    // Only save if data has actually changed
    if (!parsedStoredData || JSON.stringify(currentData.labels) !== JSON.stringify(parsedStoredData.labels)) {
      const conversationLabelJson = {
        ...currentData,
        lastSyncTimestamp: Date.now(),
        version: (parsedStoredData?.version || 0) + 1,
      };
      void this.propertiesService.putPropertiesByKey(propertiesKey, conversationLabelJson);
      this.persistValues(conversationLabelJson);
    }
  };

  loadLabels = async () => {
    try {
      const conversationLabelJson = localStorage.getItem(ConversationLabelRepository.LocalStorageKey);
      let localData: LabelProperty | null = null;

      if (conversationLabelJson) {
        try {
          localData = JSON.parse(conversationLabelJson);
        } catch (error) {
          this.logger.warn(
            `Failed to parse stored labels, clearing corrupted data: ${error instanceof Error ? error.message : String(error)}`,
          );
          localStorage.removeItem(ConversationLabelRepository.LocalStorageKey);
        }
      }

      // Always fetch from backend first
      const labelProperties = await this.propertiesService.getPropertiesByKey(propertiesKey);

      if (localData && labelProperties) {
        // Compare timestamps to determine which is newer
        const localTimestamp = localData.lastSyncTimestamp || 0;
        const remoteTimestamp = labelProperties.lastSyncTimestamp || 0;
        const localVersion = localData.version || 0;
        const remoteVersion = labelProperties.version || 0;

        // Use local data if it has a newer timestamp, or same timestamp but higher version
        const isLocalNewer =
          localTimestamp > remoteTimestamp || (localTimestamp === remoteTimestamp && localVersion > remoteVersion);

        if (isLocalNewer) {
          // Local data is newer, use it and update backend
          this.unmarshal(localData);
          const updatedData = {
            ...localData,
            lastSyncTimestamp: Date.now(),
            version: (localData.version || 0) + 1,
          };
          void this.propertiesService.putPropertiesByKey(propertiesKey, updatedData);
          this.persistValues(updatedData);
          return;
        }
      }

      // Use backend data if available (either because local is empty or older)
      if (labelProperties) {
        this.unmarshal(labelProperties);
        this.persistValues(labelProperties);
      } else if (localData) {
        // Backend has no data but local does, use local and sync to backend
        this.unmarshal(localData);
        const updatedData = {
          ...localData,
          lastSyncTimestamp: Date.now(),
          version: (localData.version || 0) + 1,
        };
        void this.propertiesService.putPropertiesByKey(propertiesKey, updatedData);
        this.persistValues(updatedData);
      }
      // If both are null, labels remain empty (default state)
    } catch (error) {
      this.logger.warn(`No labels were loaded: ${error instanceof Error ? error.message : String(error)}`);
      // Don't save empty state on error
    }
  };

  private persistValues = (data?: LabelProperty) => {
    const values = data || this.marshal();
    localStorage.setItem(ConversationLabelRepository.LocalStorageKey, JSON.stringify(values));
  };

  readonly onUserEvent = (event: any) => {
    if (event.type === USER_EVENT.PROPERTIES_SET && event.key === propertiesKey) {
      this.unmarshal(event.value);
    }
  };

  readonly getGroupsWithoutLabel = (conversations = this.conversations()) => {
    return conversations.filter(
      conversation => conversation.isGroupOrChannel() && !this.allLabeledConversations().includes(conversation),
    );
  };

  readonly getContactsWithoutLabel = (conversations = this.conversations()) => {
    return conversations.filter(
      conversation => !conversation.isGroupOrChannel() && !this.allLabeledConversations().includes(conversation),
    );
  };

  readonly getFavoriteLabel = (): ConversationLabel | undefined =>
    this.labels().find(({type}) => type === LabelType.Favorite);

  readonly getFavorites = (conversations = this.conversations()): Conversation[] => {
    const favoriteLabel = this.getFavoriteLabel();
    return favoriteLabel ? this.getLabelConversations(favoriteLabel, conversations) : [];
  };

  readonly getLabelConversations = (label: ConversationLabel, conversations = this.conversations()): Conversation[] =>
    label ? conversations.filter(conversation => label.conversations().includes(conversation)) : [];

  readonly isFavorite = (conversation: Conversation): boolean => this.getFavorites().includes(conversation);

  readonly addConversationToFavorites = (addedConversation: Conversation): void => {
    // update the reference to the favorite label in the labels array to trigger a rerender
    const favoriteLabel = this.getFavoriteLabel();
    const updatedLabel = createLabel(
      '',
      [...(favoriteLabel?.conversations() || []), addedConversation],
      undefined,
      LabelType.Favorite,
    );

    if (favoriteLabel) {
      const folderIndex = this.labels.indexOf(favoriteLabel);
      this.labels.splice(folderIndex, 1, updatedLabel);
    } else {
      // The favorite label doesn't need a name since it is set at runtime for i18n compatibility
      this.labels.push(updatedLabel);
    }
    this.dispatch({type: 'conversation-favorited'});
    this.saveLabels();
  };

  readonly removeConversationFromFavorites = (removedConversation: Conversation): void => {
    // update the reference to the favorite label in the labels array to trigger a rerender
    const favoriteLabel = this.getFavoriteLabel();
    if (favoriteLabel) {
      const updatedLabel = createLabel(
        '',
        favoriteLabel.conversations().filter(conversation => conversation !== removedConversation),
        undefined,
        LabelType.Favorite,
      );
      const folderIndex = this.labels.indexOf(favoriteLabel);
      this.labels.splice(folderIndex, 1, updatedLabel);

      // trigger a rerender on sidebar to remove the conversation from favorites
      const {currentTab, setCurrentTab} = useSidebarStore.getState();
      if (currentTab === SidebarTabs.FAVORITES) {
        setCurrentTab(SidebarTabs.FAVORITES);
      }
    }
    this.saveLabels();
  };

  readonly getConversationLabelIds = (conversation: Conversation): string[] => {
    const ids: string[] = [];

    if (this.getFavorites().includes(conversation)) {
      ids.push(DefaultLabelIds.Favorites);
    }

    const isInCustomFolder = this.allLabeledConversations().includes(conversation);

    if (isInCustomFolder) {
      const customLabel = this.getConversationCustomLabel(conversation);
      if (customLabel) {
        ids.push(customLabel.id);
      }
    } else if (conversation.isGroupOrChannel()) {
      ids.push(DefaultLabelIds.Groups);
    } else {
      ids.push(DefaultLabelIds.Contacts);
    }

    return ids;
  };

  readonly getConversationCustomLabel = (conversation: Conversation, includeFavorites: boolean = false) =>
    this.labels().find(
      ({type, conversations}) =>
        (includeFavorites || type === LabelType.Custom) && conversations().includes(conversation),
    );

  readonly getLabels = (): ConversationLabel[] =>
    this.labels()
      .filter(({type}) => type === LabelType.Custom)
      .sort(({name: nameA}, {name: nameB}) => nameA.localeCompare(nameB, undefined, {sensitivity: 'base'}));

  readonly removeConversationFromLabel = (label: ConversationLabel, removeConversation: Conversation): void => {
    const {setCurrentTab} = useSidebarStore.getState();

    // Remove conversation from folder and update folder in labels
    const folderIndex = this.labels.indexOf(label);
    const updatedFolder = createLabel(
      label.name,
      label.conversations().filter(conversation => conversation !== removeConversation),
      label.id,
      label.type,
    );

    this.labels.splice(folderIndex, 1, updatedFolder);

    // Delete folder if it no longer contains any conversation
    if (!label.conversations().length) {
      this.labels.remove(label);
      // switch sidebar to recent tabs
      setCurrentTab(SidebarTabs.RECENT);
    } else {
      // trigger rerender on folders to remove conversation from folder
      setCurrentTab(SidebarTabs.FOLDER);
    }
    this.saveLabels();
  };

  readonly removeConversationFromAllLabels = (
    removeConversation: Conversation,
    removeFromFavorites: boolean = false,
  ): void => {
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

  readonly addConversationToLabel = (label: ConversationLabel, conversation: Conversation): void => {
    const {setCurrentTab} = useSidebarStore.getState();
    if (!label.conversations().includes(conversation)) {
      this.removeConversationFromAllLabels(conversation);
      label.conversations.push(conversation);
      amplify.publish(WebAppEvents.CONTENT.EXPAND_FOLDER, label.id);
      this.saveLabels();
      setCurrentTab(SidebarTabs.FOLDER);
    }
  };

  readonly addConversationToNewLabel = (conversation: Conversation) => {
    const {setCurrentTab} = useSidebarStore.getState();
    PrimaryModal.show(PrimaryModal.type.INPUT, {
      primaryAction: {
        action: (name: string) => {
          this.removeConversationFromAllLabels(conversation);
          const newFolder = createLabel(name, [conversation]);
          this.labels.push(newFolder);
          amplify.publish(WebAppEvents.CONTENT.EXPAND_FOLDER, newFolder.id);
          this.saveLabels();
          setCurrentTab(SidebarTabs.FOLDER);
        },
        text: t('modalCreateFolderAction'),
      },
      text: {
        closeBtnLabel: t('modalNewFolderCloseBtn'),
        input: t('modalCreateFolderPlaceholder'),
        message: t('modalCreateFolderMessage'),
        title: t('modalCreateFolderHeadline'),
      },
    });
  };
}
