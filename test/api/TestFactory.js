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

import ko from 'knockout';

import 'src/script/main/globals';

import {backendConfig, graph, resolve as resolveDependency} from './testResolver';
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
import {SelfService} from 'src/script/self/SelfService';
import {LinkPreviewRepository} from 'src/script/links/LinkPreviewRepository';
import {AssetService} from 'src/script/assets/AssetService';
import {PropertiesRepository} from 'src/script/properties/PropertiesRepository';
import {PropertiesService} from 'src/script/properties/PropertiesService';
import {MessageSender} from 'src/script/message/MessageSender';
import {UserService} from 'src/script/user/UserService';
import {BackupService} from 'src/script/backup/BackupService';
import {StorageService} from 'src/script/storage';
import {MediaRepository} from 'src/script/media/MediaRepository';
import {PermissionRepository} from 'src/script/permission/PermissionRepository';
import {AuthRepository} from 'src/script/auth/AuthRepository';
import {AuthService} from 'src/script/auth/AuthService';

window.testConfig = {
  connection: backendConfig,
};

window.TestFactory = class TestFactory {
  /**
   * @returns {Promise<AuthRepository>} The authentication repository.
   */
  async exposeAuthActors() {
    TestFactory.auth_repository = new AuthRepository(new AuthService(resolveDependency(graph.BackendClient)));
    return TestFactory.auth_repository;
  }

  /**
   * @returns {Promise<StorageRepository>} The storage repository.
   */
  async exposeStorageActors() {
    TestFactory.storage_service = new StorageService();
    if (!TestFactory.storage_service.db) {
      TestFactory.storage_service.init(entities.user.john_doe.id, false);
    }
    TestFactory.storage_repository = singleton(StorageRepository, TestFactory.storage_service);

    return TestFactory.storage_repository;
  }

  async exposeBackupActors() {
    await this.exposeStorageActors();
    await this.exposeConversationActors();
    TestFactory.backup_service = new BackupService(TestFactory.storage_service);

    TestFactory.backup_repository = new BackupRepository(
      TestFactory.backup_service,
      TestFactory.client_repository,
      TestFactory.connection_repository,
      TestFactory.conversation_repository,
      TestFactory.user_repository,
    );

    return TestFactory.backup_repository;
  }

  /**
   * @param {boolean} mockCryptobox - do not initialize a full cryptobox (cryptobox initialization is a very costy operation)
   * @returns {Promise<CryptographyRepository>} The cryptography repository.
   */
  async exposeCryptographyActors(mockCryptobox = true) {
    await this.exposeStorageActors();
    const currentClient = new ClientEntity(true);
    currentClient.id = entities.clients.john_doe.permanent.id;
    TestFactory.cryptography_service = new CryptographyService(resolveDependency(graph.BackendClient));

    TestFactory.cryptography_repository = new CryptographyRepository(
      resolveDependency(graph.BackendClient),
      TestFactory.storage_repository,
    );
    TestFactory.cryptography_repository.currentClient = ko.observable(currentClient);

    if (mockCryptobox) {
      // eslint-disable-next-line jasmine/no-unsafe-spy
      spyOn(TestFactory.cryptography_repository, 'createCryptobox').and.returnValue(Promise.resolve());
    }
    await TestFactory.cryptography_repository.createCryptobox(TestFactory.storage_service.db);

    return TestFactory.cryptography_repository;
  }

  /**
   * @returns {Promise<ClientRepository>} The client repository.
   */
  async exposeClientActors() {
    await this.exposeCryptographyActors();
    const clientEntity = new ClientEntity();
    Object.assign(clientEntity, {
      address: '192.168.0.1',
      class: 'desktop',
      id: '60aee26b7f55a99f',
    });

    const user = new User(entities.user.john_doe.id);
    user.devices.push(clientEntity);
    user.email(entities.user.john_doe.email);
    user.is_me = true;
    user.locale = entities.user.john_doe.locale;
    user.name(entities.user.john_doe.name);
    user.phone(entities.user.john_doe.phone);

    TestFactory.client_repository = new ClientRepository(
      resolveDependency(graph.BackendClient),
      TestFactory.storage_service,
      TestFactory.cryptography_repository,
    );
    TestFactory.client_service = TestFactory.client_repository.clientService;
    TestFactory.client_repository.init(user);

    const payload = {
      address: '62.96.148.44',
      class: 'desktop',
      cookie: 'webapp@2153234453@temporary@1470926647664',
      id: '132b3653b33f851f',
      label: 'Windows 10',
      location: {lat: 52.5233, lon: 13.4138},
      meta: {is_verified: true, primary_key: 'local_identity'},
      model: 'Chrome (Temporary)',
      time: '2016-10-07T16:01:42.133Z',
      type: 'temporary',
    };

    const currentClient = new ClientEntity();
    Object.assign(currentClient, payload);

    TestFactory.client_repository.currentClient(currentClient);

    return TestFactory.client_repository;
  }

  /**
   * @returns {Promise<EventRepository>} The event repository.
   */
  async exposeEventActors() {
    await this.exposeCryptographyActors();
    await this.exposeUserActors();

    TestFactory.web_socket_service = new WebSocketService(
      resolveDependency(graph.BackendClient),
      TestFactory.storage_service,
    );
    TestFactory.event_service = new EventService(TestFactory.storage_service);
    TestFactory.event_service_no_compound = new EventServiceNoCompound(TestFactory.storage_service);
    TestFactory.notification_service = new NotificationService(
      resolveDependency(graph.BackendClient),
      TestFactory.storage_service,
    );
    TestFactory.conversation_service = new ConversationService(
      resolveDependency(graph.BackendClient),
      TestFactory.event_service,
      TestFactory.storage_service,
    );

    TestFactory.event_repository = new EventRepository(
      TestFactory.event_service,
      TestFactory.notification_service,
      TestFactory.web_socket_service,
      TestFactory.cryptography_repository,
      serverTimeHandler,
      TestFactory.user_repository,
    );
    TestFactory.event_repository.currentClient = ko.observable(TestFactory.cryptography_repository.currentClient());

    return TestFactory.event_repository;
  }

  /**
   * @returns {Promise<UserRepository>} The user repository.
   */
  async exposeUserActors() {
    await this.exposeClientActors();
    TestFactory.asset_service = new AssetService(resolveDependency(graph.BackendClient));
    TestFactory.connection_service = new ConnectionService(resolveDependency(graph.BackendClient));
    TestFactory.user_service = new UserService(resolveDependency(graph.BackendClient), TestFactory.storage_service);
    TestFactory.propertyRepository = TestFactory.propertyRepository = new PropertiesRepository(
      new PropertiesService(resolveDependency(graph.BackendClient)),
      new SelfService(resolveDependency(graph.BackendClient)),
    );

    TestFactory.user_repository = new UserRepository(
      TestFactory.user_service,
      TestFactory.asset_service,
      new SelfService(resolveDependency(graph.BackendClient)),
      TestFactory.client_repository,
      serverTimeHandler,
      TestFactory.propertyRepository,
    );
    TestFactory.user_repository.save_user(TestFactory.client_repository.selfUser(), true);

    return TestFactory.user_repository;
  }

  /**
   * @returns {Promise<ConnectionRepository>} The connection repository.
   */
  async exposeConnectionActors() {
    await this.exposeUserActors();
    TestFactory.connection_service = new ConnectionService(resolveDependency(graph.BackendClient));

    TestFactory.connection_repository = new ConnectionRepository(
      resolveDependency(graph.BackendClient),
      TestFactory.user_repository,
    );

    return TestFactory.connection_repository;
  }

  /**
   * @returns {Promise<SearchRepository>} The search repository.
   */
  async exposeSearchActors() {
    await this.exposeUserActors();
    TestFactory.search_repository = new SearchRepository(
      resolveDependency(graph.BackendClient),
      TestFactory.user_repository,
    );

    return TestFactory.search_repository;
  }

  async exposeTeamActors() {
    await this.exposeUserActors();
    TestFactory.team_repository = new TeamRepository(
      resolveDependency(graph.BackendClient),
      TestFactory.user_repository,
    );
    return TestFactory.team_repository;
  }

  /**
   * @returns {Promise<ConversationRepository>} The conversation repository.
   */
  async exposeConversationActors() {
    await this.exposeConnectionActors();
    await this.exposeTeamActors();
    await this.exposeEventActors();

    TestFactory.conversation_service = new ConversationService(
      resolveDependency(graph.BackendClient),
      TestFactory.event_service,
      TestFactory.storage_service,
    );

    const propertiesRepository = new PropertiesRepository(
      new PropertiesService(resolveDependency(graph.BackendClient)),
      new SelfService(resolveDependency(graph.BackendClient)),
    );

    TestFactory.conversation_repository = new ConversationRepository(
      TestFactory.conversation_service,
      TestFactory.asset_service,
      TestFactory.client_repository,
      TestFactory.connection_repository,
      TestFactory.cryptography_repository,
      TestFactory.event_repository,
      undefined,
      new LinkPreviewRepository(new AssetService(resolveDependency(graph.BackendClient)), propertiesRepository),
      new MessageSender(),
      serverTimeHandler,
      TestFactory.team_repository,
      TestFactory.user_repository,
      TestFactory.propertyRepository,
    );

    return TestFactory.conversation_repository;
  }

  /**
   * @returns {Promise<CallingRepository>} The call center.
   */
  async exposeCallingActors() {
    await this.exposeConversationActors();
    TestFactory.calling_repository = new CallingRepository(
      resolveDependency(graph.BackendClient),
      TestFactory.conversation_repository,
      TestFactory.event_repository,
      new MediaRepository(new PermissionRepository()).streamHandler,
      serverTimeHandler,
    );

    return TestFactory.calling_repository;
  }

  /**
   * @returns {Promise<NotificationRepository>} The repository for system notifications.
   */
  async exposeNotificationActors() {
    await this.exposeConversationActors();
    await this.exposeCallingActors();

    TestFactory.notification_repository = new NotificationRepository(
      TestFactory.calling_repository,
      TestFactory.conversation_repository,
      new PermissionRepository(),
      TestFactory.user_repository,
    );

    return TestFactory.notification_repository;
  }

  /**
   * @returns {Promise<EventTrackingRepository>} The event tracking repository.
   */
  async exposeTrackingActors() {
    await this.exposeTeamActors();
    TestFactory.tracking_repository = new EventTrackingRepository(
      TestFactory.team_repository,
      TestFactory.user_repository,
    );

    return TestFactory.tracking_repository;
  }

  /**
   * @returns {Promise<z.lifecycle.LifecycleRepository>} The lifecycle repository.
   */
  async exposeLifecycleActors() {
    await this.exposeUserActors();
    TestFactory.lifecycle_service = new z.lifecycle.LifecycleService();

    TestFactory.lifecycle_repository = new z.lifecycle.LifecycleRepository(
      TestFactory.lifecycle_service,
      TestFactory.user_repository,
    );
    return TestFactory.lifecycle_repository;
  }
};

const actorsCache = new Map();

/**
 * Will instantiate a service only once (uses the global actorsCache to store instances)
 * @param {Constructor} Service - the service to instantiate
 * @param {any} ...dependencies - the dependencies required by the service
 * @returns {Object} the instantiated service
 */
function singleton(Service, ...dependencies) {
  actorsCache[Service] = actorsCache[Service] || new Service(...dependencies);
  return actorsCache[Service];
}
