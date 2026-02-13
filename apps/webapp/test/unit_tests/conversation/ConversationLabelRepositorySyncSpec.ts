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

describe('ConversationLabelRepository Synchronization', () => {
  let conversationLabelRepository: ConversationLabelRepository;
  let mockPropertiesService: jest.Mocked<PropertiesService>;
  let mockConversations: ko.ObservableArray<Conversation>;
  let mockAllConversations: ko.ObservableArray<Conversation>;

  beforeEach(() => {
    // Clear localStorage before each test
    localStorage.clear();

    // Create mock conversations
    mockAllConversations = ko.observableArray<Conversation>([]);
    mockConversations = ko.observableArray<Conversation>([]);

    // Create mock properties service
    mockPropertiesService = {
      getPropertiesByKey: jest.fn(),
      putPropertiesByKey: jest.fn(),
    } as any;

    // Create repository instance
    conversationLabelRepository = new ConversationLabelRepository(
      mockAllConversations,
      () => mockConversations(),
      mockPropertiesService,
    );
  });

  describe('loadLabels', () => {
    it('should load labels from backend when localStorage is empty', async () => {
      // Arrange
      const backendLabels = {
        labels: [
          {
            id: createUuid(),
            name: 'Test Folder',
            type: LabelType.Custom,
            conversations: [createUuid()],
          },
        ],
        lastSyncTimestamp: Date.now(),
        version: 1,
      };

      mockPropertiesService.getPropertiesByKey.mockResolvedValue(backendLabels);

      // Act
      await conversationLabelRepository.loadLabels();

      // Assert
      expect(mockPropertiesService.getPropertiesByKey).toHaveBeenCalledWith('labels');
      expect(conversationLabelRepository.labels()).toHaveLength(1);
      expect(conversationLabelRepository.labels()[0].name).toBe('Test Folder');
    });

    it('should use localStorage data when it is newer than backend', async () => {
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

      localStorage.setItem(ConversationLabelRepository.LocalStorageKey, JSON.stringify(localLabels));
      mockPropertiesService.getPropertiesByKey.mockResolvedValue(backendLabels);

      // Act
      await conversationLabelRepository.loadLabels();

      // Assert
      expect(conversationLabelRepository.labels()).toHaveLength(1);
      expect(conversationLabelRepository.labels()[0].name).toBe('Local Folder');
      expect(mockPropertiesService.putPropertiesByKey).toHaveBeenCalled();
    });

    it('should use backend data when it is newer than localStorage', async () => {
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

      localStorage.setItem(ConversationLabelRepository.LocalStorageKey, JSON.stringify(localLabels));
      mockPropertiesService.getPropertiesByKey.mockResolvedValue(backendLabels);

      // Act
      await conversationLabelRepository.loadLabels();

      // Assert
      expect(conversationLabelRepository.labels()).toHaveLength(1);
      expect(conversationLabelRepository.labels()[0].name).toBe('Backend Folder');
    });

    it('should handle errors gracefully and not overwrite localStorage', async () => {
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

      localStorage.setItem(ConversationLabelRepository.LocalStorageKey, JSON.stringify(localLabels));
      mockPropertiesService.getPropertiesByKey.mockRejectedValue(new Error('Network error'));

      // Act
      await conversationLabelRepository.loadLabels();

      // Assert
      // Should not clear existing labels on error
      expect(localStorage.getItem(ConversationLabelRepository.LocalStorageKey)).toBe(JSON.stringify(localLabels));
    });

    it('should save to localStorage after loading from backend', async () => {
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

      mockPropertiesService.getPropertiesByKey.mockResolvedValue(backendLabels);

      // Act
      await conversationLabelRepository.loadLabels();

      // Assert
      const storedData = localStorage.getItem(ConversationLabelRepository.LocalStorageKey);
      expect(storedData).toBeTruthy();
      const parsedData = JSON.parse(storedData!);
      expect(parsedData.labels).toHaveLength(1);
      expect(parsedData.lastSyncTimestamp).toBeTruthy();
    });
  });

  describe('saveLabels', () => {
    it('should only save when data has changed', () => {
      // Arrange
      const label = createLabel('Test Label', [], createUuid(), LabelType.Custom);
      conversationLabelRepository.labels([label]);

      const initialData = conversationLabelRepository.marshal();
      localStorage.setItem(ConversationLabelRepository.LocalStorageKey, JSON.stringify(initialData));

      // Act
      conversationLabelRepository.saveLabels();

      // Assert
      expect(mockPropertiesService.putPropertiesByKey).not.toHaveBeenCalled();
    });

    it('should save when data has changed', () => {
      // Arrange
      const label1 = createLabel('Test Label 1', [], createUuid(), LabelType.Custom);
      conversationLabelRepository.labels([label1]);

      const initialData = conversationLabelRepository.marshal();
      localStorage.setItem(ConversationLabelRepository.LocalStorageKey, JSON.stringify(initialData));

      // Add new label
      const label2 = createLabel('Test Label 2', [], createUuid(), LabelType.Custom);
      conversationLabelRepository.labels([label1, label2]);

      // Act
      conversationLabelRepository.saveLabels();

      // Assert
      expect(mockPropertiesService.putPropertiesByKey).toHaveBeenCalledWith(
        'labels',
        expect.objectContaining({
          labels: expect.any(Array),
          lastSyncTimestamp: expect.any(Number),
          version: expect.any(Number),
        }),
      );
    });
  });
});
