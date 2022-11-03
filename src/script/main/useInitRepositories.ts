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

import {container} from 'tsyringe';
import create from 'zustand';

import {useInitServices} from './useInitServices';

import {AssetRepository} from '../assets/AssetRepository';
import {AudioRepository} from '../audio/AudioRepository';
import {BackupRepository} from '../backup/BackupRepository';
import {BackupService} from '../backup/BackupService';
import {CallingRepository} from '../calling/CallingRepository';
import {ClientRepository} from '../client/ClientRepository';
import {ClientService} from '../client/ClientService';
import {ConnectionRepository} from '../connection/ConnectionRepository';
import {ConnectionService} from '../connection/ConnectionService';
import {ConversationRepository} from '../conversation/ConversationRepository';
import {MessageRepository} from '../conversation/MessageRepository';
import {CryptographyRepository} from '../cryptography/CryptographyRepository';
import {EventRepository} from '../event/EventRepository';
import {QuotedMessageMiddleware} from '../event/preprocessor/QuotedMessageMiddleware';
import {ReceiptsMiddleware} from '../event/preprocessor/ReceiptsMiddleware';
import {ServiceMiddleware} from '../event/preprocessor/ServiceMiddleware';
import {GiphyRepository} from '../extension/GiphyRepository';
import {GiphyService} from '../extension/GiphyService';
import {IntegrationRepository} from '../integration/IntegrationRepository';
import {MediaRepository} from '../media/MediaRepository';
import {NotificationRepository} from '../notification/NotificationRepository';
import {PreferenceNotificationRepository} from '../notification/PreferenceNotificationRepository';
import {PermissionRepository} from '../permission/PermissionRepository';
import {PropertiesRepository} from '../properties/PropertiesRepository';
import {PropertiesService} from '../properties/PropertiesService';
import {SearchRepository} from '../search/SearchRepository';
import {SearchService} from '../search/SearchService';
import {SelfService} from '../self/SelfService';
import {StorageRepository} from '../storage';
import {TeamRepository} from '../team/TeamRepository';
import {TeamService} from '../team/TeamService';
import {serverTimeHandler} from '../time/serverTimeHandler';
import {EventTrackingRepository} from '../tracking/EventTrackingRepository';
import {UserRepository} from '../user/UserRepository';
import {UserService} from '../user/UserService';
import {ViewModelRepositories} from '../view_model/MainViewModel';

export const useInitRepositories = create<ViewModelRepositories>(() => {
  const services = useInitServices.getState();

  const repositories: ViewModelRepositories = {} as ViewModelRepositories;
  const selfService = new SelfService();

  repositories.asset = container.resolve(AssetRepository);

  repositories.giphy = new GiphyRepository(new GiphyService());
  repositories.properties = new PropertiesRepository(new PropertiesService(), selfService);
  repositories.serverTime = serverTimeHandler;
  repositories.storage = new StorageRepository();

  repositories.cryptography = new CryptographyRepository();
  repositories.client = new ClientRepository(new ClientService(), repositories.cryptography, repositories.storage);
  repositories.media = new MediaRepository(new PermissionRepository());
  repositories.audio = new AudioRepository(repositories.media.devicesHandler);

  repositories.user = new UserRepository(
    new UserService(),
    repositories.asset,
    selfService,
    repositories.client,
    serverTimeHandler,
    repositories.properties,
  );
  repositories.connection = new ConnectionRepository(new ConnectionService(), repositories.user);
  repositories.event = new EventRepository(services.event, services.notification, serverTimeHandler);
  repositories.search = new SearchRepository(new SearchService(), repositories.user);
  repositories.team = new TeamRepository(new TeamService(), repositories.user, repositories.asset);

  repositories.message = new MessageRepository(
    /*
     * ToDo: there is a cyclic dependency between message and conversation repos.
     * MessageRepository should NOT depend upon ConversationRepository.
     * We need to remove all usages of conversationRepository inside the messageRepository
     */
    () => repositories.conversation,
    repositories.cryptography,
    repositories.event,
    repositories.properties,
    serverTimeHandler,
    repositories.user,
    repositories.asset,
  );

  repositories.conversation = new ConversationRepository(
    services.conversation,
    repositories.message,
    repositories.connection,
    repositories.event,
    repositories.team,
    repositories.user,
    repositories.properties,
    serverTimeHandler,
  );

  repositories.eventTracker = new EventTrackingRepository(repositories.message);

  const serviceMiddleware = new ServiceMiddleware(repositories.conversation, repositories.user);
  const quotedMessageMiddleware = new QuotedMessageMiddleware(services.event);

  const readReceiptMiddleware = new ReceiptsMiddleware(services.event, repositories.conversation);

  repositories.event.setEventProcessMiddlewares([
    serviceMiddleware.processEvent.bind(serviceMiddleware),
    quotedMessageMiddleware.processEvent.bind(quotedMessageMiddleware),
    readReceiptMiddleware.processEvent.bind(readReceiptMiddleware),
  ]);
  repositories.backup = new BackupRepository(new BackupService(), repositories.conversation);
  repositories.calling = new CallingRepository(
    repositories.message,
    repositories.event,
    repositories.user,
    repositories.media.streamHandler,
    repositories.media.devicesHandler,
    serverTimeHandler,
  );
  repositories.integration = new IntegrationRepository(
    services.integration,
    repositories.conversation,
    repositories.team,
  );
  repositories.permission = new PermissionRepository();
  repositories.notification = new NotificationRepository(repositories.conversation, repositories.permission);
  repositories.preferenceNotification = new PreferenceNotificationRepository(repositories.user['userState'].self);

  repositories.conversation.leaveCall = repositories.calling.leaveCall;
  return repositories;
});
