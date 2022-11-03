/*
 * Wire
 * Copyright (C) 2022 Wire Swiss GmbH
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

import {Runtime} from '@wireapp/commons';
import {container} from 'tsyringe';
import create from 'zustand';

import {AssetService} from '../assets/AssetService';
import {ConversationService} from '../conversation/ConversationService';
import {EventService} from '../event/EventService';
import {EventServiceNoCompound} from '../event/EventServiceNoCompound';
import {NotificationService} from '../event/NotificationService';
import {IntegrationService} from '../integration/IntegrationService';
import {StorageService} from '../storage';

/**
 * Create all app services.
 * @param Encrypted database handler
 * @returns All services
 */

interface Services {
  asset: AssetService;
  conversation: ConversationService;
  event: EventService | EventServiceNoCompound;
  integration: IntegrationService;
  notification: NotificationService;
  storage: StorageService;
}

export const useInitServices = create<Services>(() => {
  container.registerInstance(StorageService, new StorageService());
  const storageService = container.resolve(StorageService);
  const eventService = Runtime.isEdge() ? new EventServiceNoCompound() : new EventService();

  return {
    asset: container.resolve(AssetService),
    conversation: new ConversationService(eventService),
    event: eventService,
    integration: new IntegrationService(),
    notification: new NotificationService(),
    storage: storageService,
  };
});
