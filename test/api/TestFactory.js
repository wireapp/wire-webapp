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
import PropertiesRepository from 'src/script/properties/PropertiesRepository';
import PropertiesService from 'src/script/properties/PropertiesService';
import StorageService from 'src/script/storage/StorageService';
import UserService from 'src/script/user/UserService';
import UserRepository from 'src/script/user/UserRepository';

import AssetService from 'src/script/assets/AssetService';
import AudioRepository from 'src/script/audio/AudioRepository';
import BackendClient from 'src/script/service/BackendClient';
import BackupService from 'src/script/backup/BackupService';

import resolveDependency, {backendConfig} from './testResolver';

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

  this.logger = new z.util.Logger('TestFactory', z.config.LOGGER.OPTIONS);

  return this;
};

window.TestFactory.prototype.exposeServerActors = function() {
  this.logger.info('- exposeServerActors');
  return Promise.resolve().then(() => {
    TestFactory.serverTimeRepository = new z.time.ServerTimeRepository();
    return TestFactory.serverTimeRepository;
  });
};

/**
 *
 * @returns {Promise<z.auth.AuthRepository>} The authentication repository.
 */
window.TestFactory.prototype.exposeAuthActors = function() {
  this.logger.info('- exposeAuthActors');
  return Promise.resolve().then(() => {
    TestFactory.authService = new z.auth.AuthService(resolveDependency(BackendClient));

    TestFactory.auth_repository = new z.auth.AuthRepository(TestFactory.authService);
    return TestFactory.auth_repository;
  });
};

/**
 *
 * @returns {Promise<z.permission.PermissionRepository>} The permission repository.
 */
window.TestFactory.prototype.exposePermissionActors = function() {
  this.logger.info('- exposePermissionActors');
  return Promise.resolve().then(() => {
    TestFactory.permission_repository = new z.permission.PermissionRepository();
    return TestFactory.permission_repository;
  });
};

/**
 *
 * @returns {Promise<z.storage.StorageRepository>} The storage repository.
 */
window.TestFactory.prototype.exposeStorageActors = function() {
  this.logger.info('- exposeStorageActors');
  return Promise.resolve()
    .then(() => {
      TestFactory.storage_service = resolveDependency(StorageService);
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
  this.logger.info('- exposeBackupActors');
  return Promise.resolve()
    .then(() => this.exposeStorageActors())
    .then(() => this.exposeConversationActors())
    .then(() => {
      this.logger.info('✓ exposedUserActors');

      TestFactory.backup_service = resolveDependency(BackupService);

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
  this.logger.info('- exposeCryptographyActors');
  return Promise.resolve()
    .then(() => this.exposeStorageActors())
    .then(() => {
      this.logger.info('✓ exposedStorageActors');

      const currentClient = new z.client.ClientEntity(true);
      currentClient.id = entities.clients.john_doe.permanent.id;
      TestFactory.cryptography_service = new z.cryptography.CryptographyService(resolveDependency(BackendClient));

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
  this.logger.info('- exposeClientActors');
  return Promise.resolve()
    .then(() => this.exposeCryptographyActors())
    .then(() => {
      this.logger.info('✓ exposedCryptographyActors');

      const clientEntity = new z.client.ClientEntity({
        address: '192.168.0.1',
        class: 'desktop',
        id: '60aee26b7f55a99f',
      });

      const user = new z.entity.User(entities.user.john_doe.id);
      user.devices.push(clientEntity);
      user.email(entities.user.john_doe.email);
      user.is_me = true;
      user.locale = entities.user.john_doe.locale;
      user.name(entities.user.john_doe.name);
      user.phone(entities.user.john_doe.phone);

      TestFactory.client_service = new z.client.ClientService(
        resolveDependency(BackendClient),
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
  this.logger.info('- exposeEventActors');
  return Promise.resolve()
    .then(() => this.exposeCryptographyActors())
    .then(() => this.exposeUserActors())
    .then(() => {
      this.logger.info('✓ exposedCryptographyActors');

      TestFactory.web_socket_service = new z.event.WebSocketService(
        resolveDependency(BackendClient),
        TestFactory.storage_service
      );
      TestFactory.event_service = new z.event.EventService(TestFactory.storage_service);
      TestFactory.event_service_no_compound = new z.event.EventServiceNoCompound(TestFactory.storage_service);
      TestFactory.notification_service = new z.event.NotificationService(
        resolveDependency(BackendClient),
        TestFactory.storage_service
      );
      TestFactory.conversation_service = new z.conversation.ConversationService(
        resolveDependency(BackendClient),
        TestFactory.event_service,
        TestFactory.storage_service
      );

      TestFactory.event_repository = new z.event.EventRepository(
        TestFactory.event_service,
        TestFactory.notification_service,
        TestFactory.web_socket_service,
        TestFactory.conversation_service,
        TestFactory.cryptography_repository,
        TestFactory.serverTimeRepository,
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
  this.logger.info('- exposeUserActors');
  return Promise.resolve()
    .then(() => this.exposeClientActors())
    .then(() => this.exposeServerActors())
    .then(() => {
      this.logger.info('✓ exposedClientActors');

      TestFactory.asset_service = resolveDependency(AssetService);
      TestFactory.connection_service = new z.connection.ConnectionService(resolveDependency(BackendClient));
      TestFactory.self_service = new z.self.SelfService(resolveDependency(BackendClient));
      TestFactory.user_service = new UserService(resolveDependency(BackendClient));
      TestFactory.propertyRepository = new PropertiesRepository(
        new PropertiesService(resolveDependency(BackendClient))
      );

      TestFactory.user_repository = new UserRepository(
        TestFactory.user_service,
        TestFactory.asset_service,
        TestFactory.self_service,
        TestFactory.client_repository,
        TestFactory.serverTimeRepository,
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
  this.logger.info('- exposeConnectionActors');
  return Promise.resolve()
    .then(() => this.exposeUserActors())
    .then(() => {
      this.logger.info('✓ exposedConnectionActors');

      TestFactory.connection_service = new z.connection.ConnectionService(resolveDependency(BackendClient));

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
  this.logger.info('- exposeConnectActors');
  return Promise.resolve()
    .then(() => this.exposeUserActors())
    .then(() => {
      this.logger.info('✓ exposedUserActors');

      TestFactory.connectService = new z.connect.ConnectService(resolveDependency(BackendClient));

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
  this.logger.info('- exposeSearchActors');
  return Promise.resolve()
    .then(() => this.exposeUserActors())
    .then(() => {
      this.logger.info('✓ exposedTeamActors');

      TestFactory.search_service = new z.search.SearchService(resolveDependency(BackendClient));

      TestFactory.search_repository = new z.search.SearchRepository(
        TestFactory.search_service,
        TestFactory.user_repository
      );

      return TestFactory.search_repository;
    });
};

window.TestFactory.prototype.exposeTeamActors = function() {
  this.logger.info('- exposeTeamActors');
  return Promise.resolve()
    .then(() => this.exposeUserActors())
    .then(() => {
      this.logger.info('✓ exposedUserActors');

      TestFactory.teamService = new z.team.TeamService(resolveDependency(BackendClient));
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
  this.logger.info('- exposeConversationActors');
  return Promise.resolve()
    .then(() => this.exposeConnectionActors())
    .then(() => this.exposeTeamActors())
    .then(() => this.exposeEventActors())
    .then(() => {
      this.logger.info('✓ exposedTeamActors');

      TestFactory.conversation_service = new z.conversation.ConversationService(
        resolveDependency(BackendClient),
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
        undefined,
        TestFactory.serverTimeRepository,
        TestFactory.team_repository,
        TestFactory.user_repository,
        TestFactory.propertyRepository
      );

      return TestFactory.conversation_repository;
    });
};

/**
 *
 * @returns {Promise<z.media.MediaRepository>} The media repository.
 */
window.TestFactory.prototype.exposeMediaActors = function() {
  this.logger.info('- exposeMediaActors');
  return Promise.resolve().then(() => {
    const audioRepository = resolveDependency(AudioRepository);
    TestFactory.media_repository = new z.media.MediaRepository(audioRepository);
    return TestFactory.media_repository;
  });
};

/**
 *
 * @returns {Promise<z.calling.CallCenter>} The call center.
 */
window.TestFactory.prototype.exposeCallingActors = function() {
  this.logger.info('- exposeCallingActors');
  return Promise.resolve()
    .then(() => this.exposeMediaActors())
    .then(() => {
      this.logger.info('✓ exposedMediaActors');
      return this.exposeConversationActors();
    })
    .then(() => {
      this.logger.info('✓ exposedConversationActors');

      TestFactory.calling_service = new z.calling.CallingService(resolveDependency(BackendClient));

      TestFactory.calling_repository = new z.calling.CallingRepository(
        TestFactory.calling_service,
        TestFactory.client_repository,
        TestFactory.conversation_repository,
        TestFactory.event_repository,
        TestFactory.media_repository,
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
  this.logger.info('- exposeNotificationActors');
  return Promise.resolve()
    .then(() => this.exposePermissionActors())
    .then(() => {
      this.logger.info('✓ exposedPermissionActors');
      return this.exposeConversationActors();
    })
    .then(() => {
      this.logger.info('✓ exposedConversationActors');
      return this.exposeCallingActors();
    })
    .then(() => {
      this.logger.info('✓ exposedCallingActors');

      TestFactory.notification_repository = new z.notification.NotificationRepository(
        TestFactory.calling_repository,
        TestFactory.conversation_repository,
        TestFactory.permission_repository,
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
  this.logger.info('- exposeTrackingActors');
  return Promise.resolve()
    .then(() => this.exposeTeamActors())
    .then(() => {
      this.logger.info('✓ exposesTeamActors');

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
  this.logger.info('- exposeLifecycleActors');
  return Promise.resolve()
    .then(() => this.exposeUserActors())
    .then(() => {
      this.logger.info('✓ exposedConversationActors');
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
