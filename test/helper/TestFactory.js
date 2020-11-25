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

/* eslint no-undef: "off" */

// Polyfill for "tsyringe" dependency injection
import 'core-js/es7/reflect';
import {container} from 'tsyringe';
import ko from 'knockout';

import 'src/script/main/globals';

import {CallingRepository} from 'src/script/calling/CallingRepository';
import {serverTimeHandler} from 'src/script/time/serverTimeHandler';
import {User} from 'src/script/entity/User';
import {BackupRepository} from 'src/script/backup/BackupRepository';
import {UserRepository} from 'src/script/user/UserRepository';
import {NotificationRepository} from 'src/script/notification/NotificationRepository';
import {StorageRepository} from 'src/script/storage/StorageRepository';
import {ClientRepository} from 'src/script/client/ClientRepository';
import {EventTrackingRepository} from 'src/script/tracking/EventTrackingRepository';
import {ClientEntity} from 'src/script/client/ClientEntity';
import {Cryptobox} from '@wireapp/cryptobox';
import {EventRepository} from 'src/script/event/EventRepository';
import {EventServiceNoCompound} from 'src/script/event/EventServiceNoCompound';
import {EventService} from 'src/script/event/EventService';
import {NotificationService} from 'src/script/event/NotificationService';
import {WebSocketService} from 'src/script/event/WebSocketService';
import {ConnectionService} from 'src/script/connection/ConnectionService';
import {ConnectionRepository} from 'src/script/connection/ConnectionRepository';
import {CryptographyRepository} from 'src/script/cryptography/CryptographyRepository';
import {CryptographyService} from 'src/script/cryptography/CryptographyService';
import {TeamRepository} from 'src/script/team/TeamRepository';
import {SearchRepository} from 'src/script/search/SearchRepository';
import {ConversationService} from 'src/script/conversation/ConversationService';
import {ConversationRepository} from 'src/script/conversation/ConversationRepository';
import {MessageRepository} from 'src/script/conversation/MessageRepository';
import {SelfService} from 'src/script/self/SelfService';
import {LinkPreviewRepository} from 'src/script/links/LinkPreviewRepository';
import {PropertiesRepository} from 'src/script/properties/PropertiesRepository';
import {PropertiesService} from 'src/script/properties/PropertiesService';
import {MessageSender} from 'src/script/message/MessageSender';
import {UserService} from 'src/script/user/UserService';
import {BackupService} from 'src/script/backup/BackupService';
import {StorageService} from 'src/script/storage';
import {MediaRepository} from 'src/script/media/MediaRepository';
import {PermissionRepository} from 'src/script/permission/PermissionRepository';
import {AuthRepository} from 'src/script/auth/AuthRepository';
import {ClientService} from 'src/script/client/ClientService';
import {TeamService} from 'src/script/team/TeamService';
import {SearchService} from 'src/script/search/SearchService';
import {AssetRepository} from 'src/script/assets/AssetRepository';
import {UserState} from 'src/script/user/UserState';
import {ClientState} from 'src/script/client/ClientState';
import {TeamState} from 'src/script/team/TeamState';
import {ConversationState} from 'src/script/conversation/ConversationState';

export class TestFactory {
  constructor() {
    container.clearInstances();
  }
  /**
   * @returns {Promise<AuthRepository>} The authentication repository.
   */
  async exposeAuthActors() {
    this.auth_repository = new AuthRepository();
    return this.auth_repository;
  }

  /**
   * @returns {Promise<StorageRepository>} The storage repository.
   */
  async exposeStorageActors() {
    container.registerInstance(StorageService, new StorageService());
    this.storage_service = container.resolve(StorageService);
    if (!this.storage_service.db) {
      this.storage_service.init(entities.user.john_doe.id, false);
    }
    this.storage_repository = singleton(StorageRepository, this.storage_service);

    return this.storage_repository;
  }

  async exposeBackupActors() {
    await this.exposeStorageActors();
    await this.exposeConversationActors();
    this.backup_service = new BackupService(this.storage_service);

    this.backup_repository = new BackupRepository(
      this.backup_service,
      this.connection_repository,
      this.conversation_repository,
      this.client_repository.clientState,
      this.user_repository.userState,
    );

    return this.backup_repository;
  }

  /**
   * @param {boolean} mockCryptobox do not initialize a full cryptobox (cryptobox initialization is a very costy operation)
   * @returns {Promise<CryptographyRepository>} The cryptography repository.
   */
  async exposeCryptographyActors(mockCryptobox = true) {
    const storageRepository = await this.exposeStorageActors();
    const currentClient = new ClientEntity(true);
    currentClient.id = entities.clients.john_doe.permanent.id;
    this.cryptography_service = new CryptographyService();

    this.cryptography_repository = new CryptographyRepository(this.cryptography_service, this.storage_repository);
    this.cryptography_repository.currentClient = ko.observable(currentClient);

    if (mockCryptobox === true) {
      spyOn(this.cryptography_repository, 'initCryptobox').and.returnValue(Promise.resolve());
    } else {
      const storeEngine = storageRepository.storageService.engine;
      this.cryptography_repository.cryptobox = new Cryptobox(storeEngine, 10);
      await this.cryptography_repository.cryptobox.create();
    }

    return this.cryptography_repository;
  }

  /**
   * @returns {Promise<ClientRepository>} The client repository.
   */
  async exposeClientActors() {
    await this.exposeCryptographyActors();
    const clientEntity = new ClientEntity();
    clientEntity.address = '192.168.0.1';
    clientEntity.class = 'desktop';
    clientEntity.id = '60aee26b7f55a99f';

    const user = new User(entities.user.john_doe.id);
    user.devices.push(clientEntity);
    user.email(entities.user.john_doe.email);
    user.isMe = true;
    user.locale = entities.user.john_doe.locale;
    user.name(entities.user.john_doe.name);
    user.phone(entities.user.john_doe.phone);

    this.client_service = new ClientService(this.storage_service);
    this.client_repository = new ClientRepository(this.client_service, this.cryptography_repository, new ClientState());
    this.client_repository.init(user);

    const currentClient = new ClientEntity();
    currentClient.address = '62.96.148.44';
    currentClient.class = 'desktop';
    currentClient.cookie = 'webapp@2153234453@temporary@1470926647664';
    currentClient.id = '132b3653b33f851f';
    currentClient.label = 'Windows 10';
    currentClient.location = {lat: 52.5233, lon: 13.4138};
    currentClient.meta = {is_verified: true, primary_key: 'local_identity'};
    currentClient.model = 'Chrome (Temporary)';
    currentClient.time = '2016-10-07T16:01:42.133Z';
    currentClient.type = 'temporary';

    this.client_repository['clientState'].currentClient(currentClient);

    return this.client_repository;
  }

  /**
   * @returns {Promise<EventRepository>} The event repository.
   */
  async exposeEventActors() {
    await this.exposeCryptographyActors();
    await this.exposeUserActors();

    this.web_socket_service = new WebSocketService();
    this.event_service = new EventService(this.storage_service);
    this.event_service_no_compound = new EventServiceNoCompound(this.storage_service);
    this.notification_service = new NotificationService(this.storage_service);
    this.conversation_service = new ConversationService(this.event_service);

    this.event_repository = new EventRepository(
      this.event_service,
      this.notification_service,
      this.web_socket_service,
      this.cryptography_repository,
      serverTimeHandler,
      this.user_repository.userState,
    );
    this.event_repository.currentClient = ko.observable(this.cryptography_repository.currentClient());

    return this.event_repository;
  }

  /**
   * @returns {Promise<UserRepository>} The user repository.
   */
  async exposeUserActors() {
    await this.exposeClientActors();
    this.assetRepository = new AssetRepository();

    this.connection_service = new ConnectionService();
    this.user_service = new UserService(this.storage_service);
    this.propertyRepository = new PropertiesRepository(new PropertiesService(), new SelfService());

    this.user_repository = new UserRepository(
      this.user_service,
      this.assetRepository,
      new SelfService(),
      this.client_repository,
      serverTimeHandler,
      this.propertyRepository,
      new UserState(),
    );

    this.user_repository.userState.self(this.client_repository.selfUser());

    return this.user_repository;
  }

  /**
   * @returns {Promise<ConnectionRepository>} The connection repository.
   */
  async exposeConnectionActors() {
    await this.exposeUserActors();
    this.connection_service = new ConnectionService();

    this.connection_repository = new ConnectionRepository(this.connection_service, this.user_repository);

    return this.connection_repository;
  }

  /**
   * @returns {Promise<SearchRepository>} The search repository.
   */
  async exposeSearchActors() {
    await this.exposeUserActors();
    this.search_service = new SearchService();
    this.search_repository = new SearchRepository(this.search_service, this.user_repository);

    return this.search_repository;
  }

  async exposeTeamActors() {
    await this.exposeUserActors();
    this.team_service = new TeamService();
    this.team_repository = new TeamRepository(
      this.team_service,
      this.user_repository,
      this.assetRepository,
      this.user_repository.userState,
      new TeamState(this.user_repository.userState),
    );
    return this.team_repository;
  }

  /**
   * @returns {Promise<ConversationRepository>} The conversation repository.
   */
  async exposeConversationActors() {
    await this.exposeConnectionActors();
    await this.exposeTeamActors();
    await this.exposeEventActors();

    this.conversation_service = new ConversationService(this.event_service);

    this.propertyRepository = new PropertiesRepository(new PropertiesService(), new SelfService());

    const assetRepository = container.resolve(AssetRepository);

    this.conversation_repository = null;
    const conversationState = new ConversationState(this.user_repository.userState, this.team_repository.teamState);

    this.message_repository = new MessageRepository(
      this.client_repository,
      () => this.conversation_repository,
      this.cryptography_repository,
      this.event_repository,
      new MessageSender(),
      this.propertyRepository,
      serverTimeHandler,
      this.user_repository,
      this.conversation_service,
      new LinkPreviewRepository(assetRepository, this.propertyRepository),
      this.assetRepository,
      this.user_repository.userState,
      this.team_repository.teamState,
      conversationState,
    );
    this.conversation_repository = new ConversationRepository(
      this.conversation_service,
      () => this.message_repository,
      this.connection_repository,
      this.event_repository,
      this.team_repository,
      this.user_repository,
      this.propertyRepository,
      serverTimeHandler,
      this.user_repository.userState,
      this.team_repository.teamState,
      conversationState,
    );

    return this.conversation_repository;
  }

  /**
   * @returns {Promise<CallingRepository>} The call center.
   */
  async exposeCallingActors() {
    await this.exposeConversationActors();
    this.calling_repository = new CallingRepository(
      this.message_repository,
      this.event_repository,
      this.user_repository,
      new MediaRepository(new PermissionRepository()).streamHandler,
      serverTimeHandler,
      this.conversation_repository.conversationState,
    );

    return this.calling_repository;
  }

  /**
   * @returns {Promise<NotificationRepository>} The repository for system notifications.
   */
  async exposeNotificationActors() {
    await this.exposeConversationActors();
    await this.exposeCallingActors();

    this.notification_repository = new NotificationRepository(
      this.calling_repository,
      this.conversation_repository,
      new PermissionRepository(),
      this.user_repository.userState,
      this.conversation_repository.conversationState,
    );

    return this.notification_repository;
  }

  /**
   * @returns {Promise<EventTrackingRepository>} The event tracking repository.
   */
  async exposeTrackingActors() {
    await this.exposeTeamActors();
    this.tracking_repository = new EventTrackingRepository(this.message_repository, this.user_repository.userState);

    return this.tracking_repository;
  }

  /**
   * @returns {Promise<z.lifecycle.LifecycleRepository>} The lifecycle repository.
   */
  async exposeLifecycleActors() {
    await this.exposeUserActors();
    this.lifecycle_service = new z.lifecycle.LifecycleService();

    this.lifecycle_repository = new z.lifecycle.LifecycleRepository(this.lifecycle_service, this.user_repository);
    return this.lifecycle_repository;
  }
}

const actorsCache = new Map();

/**
 * Will instantiate a service only once (uses the global actorsCache to store instances)
 * @param {Constructor} Service the service to instantiate
 * @param {any} ...dependencies the dependencies required by the service
 * @returns {Object} the instantiated service
 */
function singleton(Service, ...dependencies) {
  actorsCache[Service] = actorsCache[Service] || new Service(...dependencies);
  return actorsCache[Service];
}
