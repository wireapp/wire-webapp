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

/* eslint no-undef: "off" */
import 'core-js/full/reflect';

// Polyfill for "tsyringe" dependency injection
import {ClientClassification, ClientType} from '@wireapp/api-client/lib/client/';

import ko from 'knockout';
import {container} from 'tsyringe';

import {AssetRepository} from 'Repositories/assets/AssetRepository';
import {AudioRepository} from 'Repositories/audio/AudioRepository';
import {CallingRepository} from 'Repositories/calling/CallingRepository';
import {ClientEntity} from 'Repositories/client/ClientEntity';
import {ClientRepository} from 'Repositories/client/ClientRepository';
import {ClientService} from 'Repositories/client/ClientService';
import {ClientState} from 'Repositories/client/ClientState';
import {ConnectionRepository} from 'Repositories/connection/ConnectionRepository';
import {ConnectionService} from 'Repositories/connection/ConnectionService';
import {ConversationRepository} from 'Repositories/conversation/ConversationRepository';
import {ConversationService} from 'Repositories/conversation/ConversationService';
import {ConversationState} from 'Repositories/conversation/ConversationState';
import {MessageRepository} from 'Repositories/conversation/MessageRepository';
import {CryptographyRepository} from 'Repositories/cryptography/CryptographyRepository';
import {User} from 'Repositories/entity/User';
import {EventRepository} from 'Repositories/event/EventRepository';
import {EventService} from 'Repositories/event/EventService';
import {NotificationService} from 'Repositories/event/NotificationService';
import {PropertiesRepository} from 'Repositories/properties/PropertiesRepository';
import {PropertiesService} from 'Repositories/properties/PropertiesService';
import {SearchRepository} from 'Repositories/search/SearchRepository';
import {SelfService} from 'Repositories/self/SelfService';
import {SelfRepository} from 'Repositories/self/SelfRepository';
import {Core} from 'src/script/service/CoreSingleton';
import {createStorageEngine, DatabaseTypes} from 'src/script/service/StoreEngineProvider';
import {StorageService} from 'Repositories/storage';
import {StorageRepository} from 'Repositories/storage/StorageRepository';
import {TeamRepository} from 'Repositories/team/TeamRepository';
import {TeamService} from 'Repositories/team/TeamService';
import {TeamState} from 'Repositories/team/TeamState';
import {EventTrackingRepository} from 'Repositories/tracking/EventTrackingRepository';
import {UserRepository} from 'Repositories/user/UserRepository';
import {UserService} from 'Repositories/user/UserService';
import {UserState} from 'Repositories/user/UserState';
import {serverTimeHandler} from 'src/script/time/serverTimeHandler';

import {entities} from '../api/payloads';
import {MediaStreamHandler} from 'Repositories/media/MediaStreamHandler';
import {MediaDevicesHandler} from 'Repositories/media/MediaDevicesHandler';
import {MediaConstraintsHandler} from 'Repositories/media/MediaConstraintsHandler';

export class TestFactory {
  constructor() {
    container.clearInstances();
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
    await this.exposeCryptographyActors();

    this.client_service = new ClientService(this.storage_service);
    this.client_repository = new ClientRepository(this.client_service, this.cryptography_repository, new ClientState());

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
    await this.exposeUserActors();

    this.event_service = new EventService(this.storage_service);
    this.notification_service = new NotificationService(this.storage_service);
    this.conversation_service = new ConversationService(this.event_service);

    this.event_repository = new EventRepository(
      this.event_service,
      this.notification_service,
      serverTimeHandler,
      this.user_repository['userState'],
    );

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

    const userState = new UserState();
    const selfUser = new User('self-id');
    selfUser.isMe = true;
    userState.self(selfUser);
    userState.users([selfUser]);

    this.user_repository = new UserRepository(
      this.user_service,
      this.assetRepository,
      new SelfService(),
      this.client_repository,
      serverTimeHandler,
      this.propertyRepository,
      userState,
    );

    return this.user_repository;
  }

  /**
   * @returns {Promise<ConnectionRepository>} The connection repository.
   */
  async exposeConnectionActors() {
    await this.exposeUserActors();
    this.connection_service = new ConnectionService();

    this.connection_repository = new ConnectionRepository(
      this.connection_service,
      this.user_repository,
      this.self_service,
      this.team_service,
    );

    return this.connection_repository;
  }

  /**
   * @returns {Promise<SearchRepository>} The search repository.
   */
  async exposeSearchActors() {
    await this.exposeUserActors();
    this.search_repository = new SearchRepository(this.user_repository);

    return this.search_repository;
  }

  /**
   * @returns {Promise<TeamRepository>} The team repository.
   */
  async exposeTeamActors() {
    await this.exposeUserActors();
    this.team_service = new TeamService();
    this.team_service.getAllTeamFeatures = async () => ({});
    this.team_repository = new TeamRepository(
      this.user_repository,
      this.assetRepository,
      () => Promise.resolve(),
      this.team_service,
      this.user_repository['userState'],
      new TeamState(this.user_repository['userState']),
    );
    return this.team_repository;
  }

  /**
   * @returns {Promise<SelfRepository>} The self repository.
   */
  async exposeSelfActors() {
    await this.exposeUserActors();
    await this.exposeTeamActors();
    await this.exposeClientActors();

    this.self_service = new SelfService();

    this.self_repository = new SelfRepository(
      this.self_service,
      this.user_repository,
      this.team_repository,
      this.client_repository,
      this.user_repository['userState'],
    );

    return this.self_repository;
  }

  /**
   * @returns {Promise<ConversationRepository>} The conversation repository.
   */
  async exposeConversationActors() {
    await this.exposeConnectionActors();
    await this.exposeTeamActors();
    await this.exposeEventActors();
    await this.exposeSelfActors();

    this.conversation_service = new ConversationService(this.event_service);

    this.propertyRepository = new PropertiesRepository(new PropertiesService(), new SelfService());

    /** @type {ConversationRepository} */
    this.conversation_repository = null;
    const conversationState = new ConversationState(
      this.user_repository['userState'],
      this.team_repository['teamState'],
    );
    const clientEntity = new ClientEntity(false, null);
    clientEntity.address = '192.168.0.1';
    clientEntity.class = ClientClassification.DESKTOP;
    clientEntity.id = '60aee26b7f55a99f';
    const clientState = new ClientState();
    clientState.currentClient = clientEntity;

    this.message_repository = new MessageRepository(
      () => this.conversation_repository,
      this.cryptography_repository,
      this.event_repository,
      this.propertyRepository,
      serverTimeHandler,
      this.user_repository,
      this.assetRepository,
      new AudioRepository(),
      this.user_repository['userState'],
      clientState,
    );
    const core = container.resolve(Core);
    this.conversation_repository = new ConversationRepository(
      this.conversation_service,
      this.message_repository,
      this.connection_repository,
      this.event_repository,
      this.team_repository,
      this.user_repository,
      this.self_repository,
      this.propertyRepository,
      this.calling_repository,
      serverTimeHandler,
      this.user_repository['userState'],
      this.team_repository['teamState'],
      conversationState,
      this.connection_repository['connectionState'],
      core,
    );

    return this.conversation_repository;
  }

  /**
   * @returns {Promise<CallingRepository>} The call center.
   */
  async exposeCallingActors() {
    await this.exposeConversationActors();
    const mediaConstraintsHandler = new MediaConstraintsHandler();
    const mediaStreamHandler = new MediaStreamHandler(mediaConstraintsHandler);
    const mediaDevicesHandler = new MediaDevicesHandler();

    this.calling_repository = new CallingRepository(
      this.message_repository,
      this.event_repository,
      this.user_repository,
      mediaStreamHandler,
      mediaDevicesHandler,
      serverTimeHandler,
      undefined,
      this.conversation_repository['conversationState'],
    );

    return this.calling_repository;
  }

  /**
   * @returns {Promise<EventTrackingRepository>} The event tracking repository.
   */
  async exposeTrackingActors() {
    await this.exposeTeamActors();
    this.tracking_repository = new EventTrackingRepository(this.message_repository);

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
