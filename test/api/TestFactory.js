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

import {resolve, graph, backendConfig} from './testResolver';
import User from 'src/script/entity/User';
import UserRepository from 'src/script/user/UserRepository';

window.testConfig = {
  connection: backendConfig,
};

/**
 * @param {function} [logger_level] - A function returning the logger level.
 * @returns {Window.TestFactory} A TestFactory instance.
 * @constructor
 */
window.TestFactory = function(logger_level) {
  if (!logger_level) {
    logger_level = z.util.Logger.prototype.levels.OFF;
  }

  const initialLoggerOptions = z.config.LOGGER.OPTIONS;
  Object.keys(initialLoggerOptions.domains).forEach(domain => {
    initialLoggerOptions.domains[domain] = logger_level;
  });
  initialLoggerOptions.level = logger_level;

  return this;
};

/**
 *
 * @returns {Promise<z.auth.AuthRepository>} The authentication repository.
 */
window.TestFactory.prototype.exposeAuthActors = function() {
  return Promise.resolve().then(() => {
    TestFactory.authService = new z.auth.AuthService(resolve(graph.BackendClient));

    TestFactory.auth_repository = new z.auth.AuthRepository(TestFactory.authService);
    return TestFactory.auth_repository;
  });
};

/**
 *
 * @returns {Promise<z.storage.StorageRepository>} The storage repository.
 */
window.TestFactory.prototype.exposeStorageActors = function() {
  return Promise.resolve()
    .then(() => {
      TestFactory.storage_service = resolve(graph.StorageService);
      if (!TestFactory.storage_service.db) {
        TestFactory.storage_service.init(entities.user.john_doe.id, false);
      }
    })
    .then(() => {
      TestFactory.storage_repository = singleton(z.storage.StorageRepository, TestFactory.storage_service);
      return TestFactory.storage_repository;
    });
};

window.TestFactory.prototype.exposeBackupActors = function() {
  return Promise.resolve()
    .then(() => this.exposeStorageActors())
    .then(() => this.exposeConversationActors())
    .then(() => {
      TestFactory.backup_service = resolve(graph.BackupService);

      TestFactory.backup_repository = new z.backup.BackupRepository(
        TestFactory.backup_service,
        TestFactory.client_repository,
        TestFactory.connection_repository,
        TestFactory.conversation_repository,
        TestFactory.user_repository
      );

      return TestFactory.backup_repository;
    });
};

/**
 *
 * @param {boolean} mockCryptobox - do not initialize a full cryptobox (cryptobox initialization is a very costy operation)
 * @returns {Promise<z.cryptography.CryptographyRepository>} The cryptography repository.
 */
window.TestFactory.prototype.exposeCryptographyActors = function(mockCryptobox = true) {
  return Promise.resolve()
    .then(() => this.exposeStorageActors())
    .then(() => {
      const currentClient = new z.client.ClientEntity(true);
      currentClient.id = entities.clients.john_doe.permanent.id;
      TestFactory.cryptography_service = new z.cryptography.CryptographyService(resolve(graph.BackendClient));

      TestFactory.cryptography_repository = new z.cryptography.CryptographyRepository(
        TestFactory.cryptography_service,
        TestFactory.storage_repository
      );
      TestFactory.cryptography_repository.currentClient = ko.observable(currentClient);

      if (mockCryptobox) {
        // eslint-disable-next-line jasmine/no-unsafe-spy
        spyOn(TestFactory.cryptography_repository, 'createCryptobox').and.returnValue(Promise.resolve());
      }
      return TestFactory.cryptography_repository.createCryptobox(TestFactory.storage_service.db);
    })
    .then(() => TestFactory.cryptography_repository);
};

/**
 *
 * @returns {Promise<z.client.ClientRepository>} The client repository.
 */
window.TestFactory.prototype.exposeClientActors = function() {
  return Promise.resolve()
    .then(() => this.exposeCryptographyActors())
    .then(() => {
      const clientEntity = new z.client.ClientEntity({
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

      TestFactory.client_service = new z.client.ClientService(
        resolve(graph.BackendClient),
        TestFactory.storage_service
      );

      TestFactory.client_repository = new z.client.ClientRepository(
        TestFactory.client_service,
        TestFactory.cryptography_repository
      );
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
      const currentClient = new z.client.ClientEntity(payload);
      TestFactory.client_repository.currentClient(currentClient);

      return TestFactory.client_repository;
    });
};

/**
 *
 * @returns {Promise<z.event.EventRepository>} The event repository.
 */
window.TestFactory.prototype.exposeEventActors = function() {
  return Promise.resolve()
    .then(() => this.exposeCryptographyActors())
    .then(() => this.exposeUserActors())
    .then(() => {
      TestFactory.web_socket_service = new z.event.WebSocketService(
        resolve(graph.BackendClient),
        TestFactory.storage_service
      );
      TestFactory.event_service = new z.event.EventService(TestFactory.storage_service);
      TestFactory.event_service_no_compound = new z.event.EventServiceNoCompound(TestFactory.storage_service);
      TestFactory.notification_service = new z.event.NotificationService(
        resolve(graph.BackendClient),
        TestFactory.storage_service
      );
      TestFactory.conversation_service = new z.conversation.ConversationService(
        resolve(graph.BackendClient),
        TestFactory.event_service,
        TestFactory.storage_service
      );

      TestFactory.event_repository = new z.event.EventRepository(
        TestFactory.event_service,
        TestFactory.notification_service,
        TestFactory.web_socket_service,
        TestFactory.conversation_service,
        TestFactory.cryptography_repository,
        resolve(graph.ServerTimeRepository),
        TestFactory.user_repository
      );
      TestFactory.event_repository.currentClient = ko.observable(TestFactory.cryptography_repository.currentClient());

      return TestFactory.event_repository;
    });
};

/**
 *
 * @returns {Promise<UserRepository>} The user repository.
 */
window.TestFactory.prototype.exposeUserActors = function() {
  return this.exposeClientActors().then(() => {
    TestFactory.asset_service = resolve(graph.AssetService);
    TestFactory.connection_service = new z.connection.ConnectionService(resolve(graph.BackendClient));
    TestFactory.user_service = resolve(graph.UserService);
    TestFactory.propertyRepository = resolve(graph.PropertiesRepository);

    TestFactory.user_repository = new UserRepository(
      TestFactory.user_service,
      TestFactory.asset_service,
      resolve(graph.SelfService),
      TestFactory.client_repository,
      resolve(graph.ServerTimeRepository),
      TestFactory.propertyRepository
    );
    TestFactory.user_repository.save_user(TestFactory.client_repository.selfUser(), true);

    return TestFactory.user_repository;
  });
};

/**
 *
 * @returns {Promise<z.connection.ConnectionRepository>} The connection repository.
 */
window.TestFactory.prototype.exposeConnectionActors = function() {
  return Promise.resolve()
    .then(() => this.exposeUserActors())
    .then(() => {
      TestFactory.connection_service = new z.connection.ConnectionService(resolve(graph.BackendClient));

      TestFactory.connection_repository = new z.connection.ConnectionRepository(
        TestFactory.connection_service,
        TestFactory.user_repository
      );

      return TestFactory.connect_repository;
    });
};

/**
 *
 * @returns {Promise<z.connect.ConnectRepository>} The connect repository.
 */
window.TestFactory.prototype.exposeConnectActors = function() {
  return Promise.resolve()
    .then(() => this.exposeUserActors())
    .then(() => {
      TestFactory.connectService = new z.connect.ConnectService(resolve(graph.BackendClient));

      TestFactory.connect_repository = new z.connect.ConnectRepository(
        TestFactory.connectService,
        TestFactory.user_repository
      );

      return TestFactory.connect_repository;
    });
};

/**
 *
 * @returns {Promise<z.search.SearchRepository>} The search repository.
 */
window.TestFactory.prototype.exposeSearchActors = function() {
  return Promise.resolve()
    .then(() => this.exposeUserActors())
    .then(() => {
      TestFactory.search_service = new z.search.SearchService(resolve(graph.BackendClient));

      TestFactory.search_repository = new z.search.SearchRepository(
        TestFactory.search_service,
        TestFactory.user_repository
      );

      return TestFactory.search_repository;
    });
};

window.TestFactory.prototype.exposeTeamActors = function() {
  return Promise.resolve()
    .then(() => this.exposeUserActors())
    .then(() => {
      TestFactory.teamService = new z.team.TeamService(resolve(graph.BackendClient));
      return TestFactory.teamService;
    })
    .then(() => {
      TestFactory.team_repository = new z.team.TeamRepository(TestFactory.teamService, TestFactory.user_repository);
      return TestFactory.team_repository;
    });
};

/**
 *
 * @returns {Promise<z.conversation.ConversationRepository>} The conversation repository.
 */
window.TestFactory.prototype.exposeConversationActors = function() {
  return Promise.resolve()
    .then(() => this.exposeConnectionActors())
    .then(() => this.exposeTeamActors())
    .then(() => this.exposeEventActors())
    .then(() => {
      TestFactory.conversation_service = new z.conversation.ConversationService(
        resolve(graph.BackendClient),
        TestFactory.event_service,
        TestFactory.storage_service
      );

      TestFactory.conversation_repository = new z.conversation.ConversationRepository(
        TestFactory.conversation_service,
        TestFactory.asset_service,
        TestFactory.client_repository,
        TestFactory.connection_repository,
        TestFactory.cryptography_repository,
        TestFactory.event_repository,
        undefined,
        resolve(graph.LinkPreviewRepository),
        resolve(graph.ServerTimeRepository),
        TestFactory.team_repository,
        TestFactory.user_repository,
        TestFactory.propertyRepository
      );

      return TestFactory.conversation_repository;
    });
};

/**
 *
 * @returns {Promise<z.calling.CallCenter>} The call center.
 */
window.TestFactory.prototype.exposeCallingActors = function() {
  return this.exposeConversationActors().then(() => {
    TestFactory.calling_repository = new z.calling.CallingRepository(
      resolve(graph.CallingService),
      TestFactory.client_repository,
      TestFactory.conversation_repository,
      TestFactory.event_repository,
      resolve(graph.MediaRepository),
      TestFactory.user_repository
    );
    TestFactory.calling_repository.callLogger.level = z.util.Logger.prototype.levels.OFF;

    return TestFactory.calling_repository;
  });
};

/**
 *
 * @returns {Promise<z.notification.NotificationRepository>} The repository for system notifications.
 */
window.TestFactory.prototype.exposeNotificationActors = function() {
  return this.exposeConversationActors()
    .then(() => {
      return this.exposeCallingActors();
    })
    .then(() => {
      TestFactory.notification_repository = new z.notification.NotificationRepository(
        TestFactory.calling_repository,
        TestFactory.conversation_repository,
        resolve(graph.PermissionRepository),
        TestFactory.user_repository
      );

      return TestFactory.notification_repository;
    });
};

/**
 *
 * @returns {Promise<z.tracking.EventTrackingRepository>} The event tracking repository.
 */
window.TestFactory.prototype.exposeTrackingActors = function() {
  return Promise.resolve()
    .then(() => this.exposeTeamActors())
    .then(() => {
      TestFactory.tracking_repository = new z.tracking.EventTrackingRepository(
        TestFactory.team_repository,
        TestFactory.user_repository
      );

      return TestFactory.tracking_repository;
    });
};

/**
 *
 * @returns {Promise<z.lifecycle.LifecycleRepository>} The lifecycle repository.
 */
window.TestFactory.prototype.exposeLifecycleActors = function() {
  return Promise.resolve()
    .then(() => this.exposeUserActors())
    .then(() => {
      TestFactory.lifecycle_service = new z.lifecycle.LifecycleService();

      TestFactory.lifecycle_repository = new z.lifecycle.LifecycleRepository(
        TestFactory.lifecycle_service,
        TestFactory.user_repository
      );
      return TestFactory.lifecycle_repository;
    });
};

const actorsCache = new Map();

/**
 * Will instantiate a service only once (uses the global actorsCache to store instances)
 *
 * @param {Constructor} Service - the service to instantiate
 * @param {any} ...dependencies - the dependencies required by the service
 * @returns {Object} the instantiated service
 */
function singleton(Service, ...dependencies) {
  actorsCache[Service] = actorsCache[Service] || new Service(...dependencies);
  return actorsCache[Service];
}
