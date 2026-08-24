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

// @ts-check

import 'core-js/full/reflect';

// Polyfill for "tsyringe" dependency injection
import {ClientClassification, ClientType} from '@wireapp/api-client/lib/client/';

import ko from 'knockout';
import {container} from 'tsyringe';

import {AssetRepository} from 'Repositories/assets/assetRepository';
import {AudioRepository} from 'Repositories/audio/audioRepository';
import {CallingRepository} from 'Repositories/calling/CallingRepository';
import {ClientEntity} from 'Repositories/client/ClientEntity';
import {ClientRepository} from 'Repositories/client/ClientRepository';
import {ClientService} from 'Repositories/client/ClientService';
import {ClientState} from 'Repositories/client/ClientState';
import {ConnectionRepository} from 'Repositories/connection/connectionRepository';
import {ConnectionService} from 'Repositories/connection/connectionService';
import {ConversationRepository} from 'Repositories/conversation/ConversationRepository';
import {ConversationService} from 'Repositories/conversation/ConversationService';
import {ConversationState} from 'Repositories/conversation/ConversationState';
import {MessageRepository} from 'Repositories/conversation/MessageRepository';
import {CryptographyRepository} from 'Repositories/cryptography/CryptographyRepository';
import {User} from 'Repositories/entity/User';
import {EventRepository} from 'Repositories/event/EventRepository';
import {EventService} from 'Repositories/event/EventService';
import {NotificationService} from 'Repositories/event/NotificationService';
import {PropertiesRepository} from 'Repositories/properties/propertiesRepository';
import {PropertiesService} from 'Repositories/properties/propertiesService';
import {SearchRepository} from 'Repositories/search/searchRepository';
import {SelfService} from 'Repositories/self/SelfService';
import {SelfRepository} from 'Repositories/self/SelfRepository';
import {Core} from 'src/script/service/coreSingleton';
import {APIClient} from 'src/script/service/apiClientSingleton';
import {createStorageEngine, DatabaseTypes} from 'src/script/service/storeEngineProvider';
import {StorageService} from 'Repositories/storage';
import {StorageRepository} from 'Repositories/storage/storageRepository';
import {TeamRepository} from 'Repositories/team/TeamRepository';
import {TeamService} from 'Repositories/team/TeamService';
import {TeamState} from 'Repositories/team/TeamState';
import {EventTrackingRepository} from 'Repositories/tracking/eventTrackingRepository';
import {UserRepository} from 'Repositories/user/userRepository';
import {UserService} from 'Repositories/user/userService';
import {UserState} from 'Repositories/user/userState';
import {serverTimeHandler} from 'src/script/time/serverTimeHandler';
import {translate} from 'Util/localizerUtil';

import {entities} from '../api/payloads';
import {MediaStreamHandler} from 'Repositories/media/MediaStreamHandler';
import {MediaDevicesHandler} from 'Repositories/media/MediaDevicesHandler';
import {MediaConstraintsHandler} from 'Repositories/media/MediaConstraintsHandler';
import {BackgroundEffectsHandler} from 'Repositories/media/backgroundEffectsHandler';

export class TestFactory {
  constructor() {
    container.clearInstances();
    /** @type {StorageService} */
    this.storage_service = Object.create(StorageService.prototype);
    /** @type {StorageRepository} */
    this.storage_repository = Object.create(StorageRepository.prototype);
    /** @type {CryptographyRepository} */
    this.cryptography_repository = Object.create(CryptographyRepository.prototype);
    /** @type {ClientRepository} */
    this.client_repository = Object.create(ClientRepository.prototype);
    /** @type {EventService} */
    this.event_service = Object.create(EventService.prototype);
    /** @type {EventRepository} */
    this.event_repository = Object.create(EventRepository.prototype);
    /** @type {AssetRepository} */
    this.assetRepository = Object.create(AssetRepository.prototype);
    /** @type {ConnectionRepository} */
    this.connection_repository = Object.create(ConnectionRepository.prototype);
    /** @type {UserRepository} */
    this.user_repository = Object.create(UserRepository.prototype);
    /** @type {TeamRepository} */
    this.team_repository = Object.create(TeamRepository.prototype);
    /** @type {SelfRepository} */
    this.self_repository = Object.create(SelfRepository.prototype);
    /** @type {MessageRepository} */
    this.message_repository = Object.create(MessageRepository.prototype);
    /** @type {CallingRepository} */
    this.calling_repository = Object.create(CallingRepository.prototype);
    /** @type {ConversationRepository} */
    this.conversation_repository = Object.create(ConversationRepository.prototype);
  }

  /**
   * @returns {Promise<StorageRepository>} The storage repository.
   */
  async exposeStorageActors() {
    container.registerInstance(StorageService, new StorageService());
    this.storage_service = container.resolve(StorageService);
    if (!this.storage_service.db) {
      const engine = await createStorageEngine('test', DatabaseTypes.PERMANENT);
      this.storage_service.init(engine);
    }
    this.storage_repository = singleton(StorageRepository, this.storage_service);

    return this.storage_repository;
  }

  /**
   * @returns {Promise<CryptographyRepository>} The cryptography repository.
   */
  async exposeCryptographyActors() {
    await this.exposeStorageActors();
    const currentClient = new ClientEntity(true, null);
    currentClient.id = entities.clients.john_doe.permanent.id;
    this.cryptography_repository = new CryptographyRepository();

    return this.cryptography_repository;
  }

  /**
   * @returns {Promise<ClientRepository>} The client repository.
   */
  async exposeClientActors() {
    const cryptographyRepository = await this.exposeCryptographyActors();

    this.client_service = new ClientService(this.storage_service);
    this.client_repository = new ClientRepository(
      this.client_service,
      cryptographyRepository,
      translate,
      new ClientState(),
    );

    const currentClient = new ClientEntity(false, null);
    currentClient.address = '62.96.148.44';
    currentClient.class = ClientClassification.DESKTOP;
    currentClient.cookie = 'webapp@2153234453@temporary@1470926647664';
    currentClient.id = '132b3653b33f851f';
    currentClient.label = 'Windows 10';
    currentClient.meta = {isVerified: ko.observable(true), primaryKey: 'local_identity'};
    currentClient.model = 'Chrome (Temporary)';
    currentClient.time = '2016-10-07T16:01:42.133Z';
    currentClient.type = ClientType.TEMPORARY;

    this.client_repository['clientState'].currentClient = currentClient;

    return this.client_repository;
  }

  /**
   * @returns {Promise<EventRepository>} The event repository.
   */
  async exposeEventActors() {
    const userRepository = await this.exposeUserActors();

    this.event_service = new EventService(this.storage_service);
    this.notification_service = new NotificationService(this.storage_service);
    this.conversation_service = new ConversationService(this.event_service);

    this.event_repository = new EventRepository(
      this.event_service,
      this.notification_service,
      serverTimeHandler,
      userRepository['userState'],
    );

    return this.event_repository;
  }

  /**
   * @returns {Promise<UserRepository>} The user repository.
   */
  async exposeUserActors() {
    const clientRepository = await this.exposeClientActors();
    this.assetRepository = new AssetRepository();

    this.connection_service = new ConnectionService();
    this.user_service = new UserService(this.storage_service);
    this.propertyRepository = new PropertiesRepository(new PropertiesService(), new SelfService(), translate);

    const userState = new UserState();
    const selfUser = new User('self-id', '', translate);
    selfUser.isMe = true;
    userState.self(selfUser);
    userState.users([selfUser]);

    this.user_repository = new UserRepository(
      this.user_service,
      this.assetRepository,
      new SelfService(),
      clientRepository,
      serverTimeHandler,
      this.propertyRepository,
      translate,
      userState,
    );

    return this.user_repository;
  }

  /**
   * @returns {Promise<ConnectionRepository>} The connection repository.
   */
  async exposeConnectionActors() {
    const userRepository = await this.exposeUserActors();
    this.connection_service = new ConnectionService();
    this.self_service = new SelfService();
    this.team_service = new TeamService();

    this.connection_repository = new ConnectionRepository(
      this.connection_service,
      userRepository,
      this.self_service,
      this.team_service,
      translate,
    );

    return this.connection_repository;
  }

  /**
   * @returns {Promise<SearchRepository>} The search repository.
   */
  async exposeSearchActors() {
    const userRepository = await this.exposeUserActors();
    this.search_repository = new SearchRepository(userRepository);

    return this.search_repository;
  }

  /**
   * @returns {Promise<TeamRepository>} The team repository.
   */
  async exposeTeamActors() {
    const userRepository = await this.exposeUserActors();
    if (this.assetRepository === undefined) {
      throw new Error('Asset repository was not initialized');
    }
    this.team_service = new TeamService();
    this.team_service.getAllTeamFeatures = async () => ({});
    this.team_repository = new TeamRepository(
      userRepository,
      this.assetRepository,
      () => Promise.resolve(),
      this.team_service,
      translate,
      userRepository['userState'],
      new TeamState(userRepository['userState']),
    );
    return this.team_repository;
  }

  /**
   * @returns {Promise<SelfRepository>} The self repository.
   */
  async exposeSelfActors() {
    const userRepository = await this.exposeUserActors();
    const teamRepository = await this.exposeTeamActors();
    const clientRepository = await this.exposeClientActors();

    this.self_service = new SelfService();

    this.self_repository = new SelfRepository(
      this.self_service,
      userRepository,
      teamRepository,
      clientRepository,
      userRepository['userState'],
    );

    return this.self_repository;
  }

  /**
   * @returns {Promise<ConversationRepository>} The conversation repository.
   */
  async exposeConversationActors() {
    const connectionRepository = await this.exposeConnectionActors();
    await this.exposeTeamActors();
    const eventRepository = await this.exposeEventActors();
    const selfRepository = await this.exposeSelfActors();

    if (this.event_service === undefined) {
      throw new Error('Event service was not initialized');
    }
    this.conversation_service = new ConversationService(this.event_service);

    this.propertyRepository = new PropertiesRepository(new PropertiesService(), new SelfService(), translate);

    if (
      this.user_repository === undefined ||
      this.team_repository === undefined ||
      this.assetRepository === undefined ||
      this.cryptography_repository === undefined
    ) {
      throw new Error('Conversation dependencies were not initialized');
    }
    const userRepository = this.user_repository;
    const teamRepository = this.team_repository;
    const conversationState = new ConversationState(userRepository['userState'], teamRepository['teamState']);
    const testFactory = this;
    const clientEntity = new ClientEntity(false, null);
    clientEntity.address = '192.168.0.1';
    clientEntity.class = ClientClassification.DESKTOP;
    clientEntity.id = '60aee26b7f55a99f';
    const clientState = new ClientState();
    clientState.currentClient = clientEntity;

    this.message_repository = new MessageRepository(
      /** @returns {ConversationRepository} */
      function getConversationRepository() {
        if (testFactory.conversation_repository === undefined) {
          throw new Error('Conversation repository was not initialized');
        }
        return testFactory.conversation_repository;
      },
      this.cryptography_repository,
      eventRepository,
      this.propertyRepository,
      serverTimeHandler,
      userRepository,
      this.assetRepository,
      new AudioRepository(),
      translate,
      userRepository['userState'],
      clientState,
    );
    const core = container.resolve(Core);
    /** @type {CallingRepository} */
    const callingRepository = this.calling_repository ?? Object.create(CallingRepository.prototype);
    this.conversation_repository = new ConversationRepository(
      this.conversation_service,
      this.message_repository,
      connectionRepository,
      eventRepository,
      teamRepository,
      userRepository,
      selfRepository,
      this.propertyRepository,
      callingRepository,
      serverTimeHandler,
      translate,
      userRepository['userState'],
      teamRepository['teamState'],
      conversationState,
      connectionRepository['connectionState'],
      core,
    );

    return this.conversation_repository;
  }

  /**
   * @returns {Promise<CallingRepository>} The call center.
   */
  async exposeCallingActors() {
    const conversationRepository = await this.exposeConversationActors();
    if (
      this.message_repository === undefined ||
      this.event_repository === undefined ||
      this.user_repository === undefined
    ) {
      throw new Error('Calling dependencies were not initialized');
    }
    const mediaConstraintsHandler = new MediaConstraintsHandler();
    const mediaStreamHandler = new MediaStreamHandler(mediaConstraintsHandler);
    const mediaDevicesHandler = new MediaDevicesHandler();
    /** @type {BackgroundEffectsHandler} */
    const backgroundEffectsHandler = Object.create(BackgroundEffectsHandler.prototype);

    this.calling_repository = new CallingRepository(
      this.message_repository,
      this.event_repository,
      this.user_repository,
      mediaStreamHandler,
      mediaDevicesHandler,
      serverTimeHandler,
      backgroundEffectsHandler,
      translate,
      undefined,
      conversationRepository['conversationState'],
    );

    return this.calling_repository;
  }

  /**
   * @returns {Promise<EventTrackingRepository>} The event tracking repository.
   */
  async exposeTrackingActors() {
    await this.exposeTeamActors();
    if (this.message_repository === undefined) {
      throw new Error('Message repository was not initialized');
    }
    this.tracking_repository = new EventTrackingRepository(this.message_repository, container.resolve(APIClient));

    return this.tracking_repository;
  }
}

/**
 * @template T
 * @typedef {{new (...args: any[]): T}} Constructor<T>
 */

/**
 * @template T
 * @type {Map<Constructor<T>, T>}
 */
const actorsCache = new Map();

/**
 * Will instantiate a service only once (uses the global actorsCache to store instances)
 * @template T
 * @param {Constructor<T>} Service the service to instantiate
 * @param {...any} dependencies the dependencies required by the service
 * @returns {T} the instantiated service
 */
function singleton(Service, ...dependencies) {
  // @ts-ignore
  actorsCache.set(Service, actorsCache.get(Service) || new Service(...dependencies));
  // @ts-ignore
  return actorsCache.get(Service);
}
