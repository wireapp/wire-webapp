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

import ko from 'knockout';
import {
  ConversationLabelRepository,
  LabelType,
  createLabel,
} from 'Repositories/conversation/ConversationLabelRepository';
import {Conversation} from 'Repositories/entity/Conversation';
import {PropertiesService} from 'Repositories/properties/PropertiesService';
import {createUuid} from 'Util/uuid';

// Simple integration test to verify the synchronization fix
describe('ConversationLabelRepository Integration - Synchronization Fix', () => {
  let conversationLabelRepository: ConversationLabelRepository;
  let propertiesService: PropertiesService;
  let allConversations: ko.ObservableArray<Conversation>;
  let conversations: ko.ObservableArray<Conversation>;

  beforeEach(() => {
    // Clear localStorage before each test
    localStorage.clear();

    // Create test conversations
    allConversations = ko.observableArray<Conversation>([]);
    conversations = ko.observableArray<Conversation>([]);

    // Create a simple properties service that uses localStorage for simulation
    propertiesService = {
      getPropertiesByKey: async (key: string) => {
        const data = localStorage.getItem(`test_${key}`);
        return data ? JSON.parse(data) : null;
      },
      putPropertiesByKey: async (key: string, value: any) => {
        localStorage.setItem(`test_${key}`, JSON.stringify(value));
      },
    } as PropertiesService;

    // Create repository instance
    conversationLabelRepository = new ConversationLabelRepository(
      allConversations,
      ko.pureComputed(() => conversations()),
      propertiesService,
    );
  });

  it('should preserve newer localStorage data over older backend data', async () => {
    // Arrange
    const now = Date.now();
    const localLabels = {
      labels: [
        {
          id: createUuid(),
          name: 'Local Folder',
          type: LabelType.Custom,
          conversations: [createUuid()],
        },
      ],
      lastSyncTimestamp: now,
      version: 1,
    };

    const backendLabels = {
      labels: [
        {
          id: createUuid(),
          name: 'Backend Folder',
          type: LabelType.Custom,
          conversations: [createUuid()],
        },
      ],
      lastSyncTimestamp: now - 1000, // 1 second older
      version: 1,
    };

    // Simulate existing localStorage data
    localStorage.setItem(ConversationLabelRepository.LocalStorageKey, JSON.stringify(localLabels));

    // Act
    await conversationLabelRepository.loadLabels();

    // Assert
    expect(conversationLabelRepository.labels()).toHaveLength(1);
    expect(conversationLabelRepository.labels()[0].name).toBe('Local Folder');

    // Verify that localStorage was updated with the newer data
    const storedData = localStorage.getItem(ConversationLabelRepository.LocalStorageKey);
    expect(storedData).toBeTruthy();
    const parsedData = JSON.parse(storedData!);
    expect(parsedData.labels[0].name).toBe('Local Folder');
  });

  it('should use newer backend data over older localStorage data', async () => {
    // Arrange
    const now = Date.now();
    const localLabels = {
      labels: [
        {
          id: createUuid(),
          name: 'Local Folder',
          type: LabelType.Custom,
          conversations: [createUuid()],
        },
      ],
      lastSyncTimestamp: now - 1000, // 1 second older
      version: 1,
    };

    const backendLabels = {
      labels: [
        {
          id: createUuid(),
          name: 'Backend Folder',
          type: LabelType.Custom,
          conversations: [createUuid()],
        },
      ],
      lastSyncTimestamp: now,
      version: 1,
    };

    // Simulate existing localStorage data
    localStorage.setItem(ConversationLabelRepository.LocalStorageKey, JSON.stringify(localLabels));

    // Act
    await conversationLabelRepository.loadLabels();

    // Assert
    expect(conversationLabelRepository.labels()).toHaveLength(1);
    expect(conversationLabelRepository.labels()[0].name).toBe('Backend Folder');

    // Verify that localStorage was updated with the newer data
    const storedData = localStorage.getItem(ConversationLabelRepository.LocalStorageKey);
    expect(storedData).toBeTruthy();
    const parsedData = JSON.parse(storedData!);
    expect(parsedData.labels[0].name).toBe('Backend Folder');
  });

  it('should handle empty localStorage correctly', async () => {
    // Arrange
    const backendLabels = {
      labels: [
        {
          id: createUuid(),
          name: 'Backend Folder',
          type: LabelType.Custom,
          conversations: [createUuid()],
        },
      ],
      lastSyncTimestamp: Date.now(),
      version: 1,
    };

    // Ensure localStorage is empty
    localStorage.removeItem(ConversationLabelRepository.LocalStorageKey);

    // Act
    await conversationLabelRepository.loadLabels();

    // Assert
    expect(conversationLabelRepository.labels()).toHaveLength(1);
    expect(conversationLabelRepository.labels()[0].name).toBe('Backend Folder');

    // Verify that localStorage was populated
    const storedData = localStorage.getItem(ConversationLabelRepository.LocalStorageKey);
    expect(storedData).toBeTruthy();
    const parsedData = JSON.parse(storedData!);
    expect(parsedData.labels).toHaveLength(1);
  });

  it('should not overwrite localStorage on network error', async () => {
    // Arrange
    const localLabels = {
      labels: [
        {
          id: createUuid(),
          name: 'Local Folder',
          type: LabelType.Custom,
          conversations: [createUuid()],
        },
      ],
      lastSyncTimestamp: Date.now(),
      version: 1,
    };

    // Simulate existing localStorage data
    localStorage.setItem(ConversationLabelRepository.LocalStorageKey, JSON.stringify(localLabels));

    // Mock a network error
    propertiesService.getPropertiesByKey = jest.fn().mockRejectedValue(new Error('Network error'));

    // Act
    await conversationLabelRepository.loadLabels();

    // Assert
    // Should not clear existing labels on error
    const storedData = localStorage.getItem(ConversationLabelRepository.LocalStorageKey);
    expect(storedData).toBe(JSON.stringify(localLabels));
  });
});
