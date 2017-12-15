/*
 * Wire
 * Copyright (C) 2017 Wire Swiss GmbH
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

'use strict';

/**
 * @param {function} [logger_level] - A function returning the logger level.
 * @returns {Window.TestFactory} A TestFactory instance.
 * @constructor
 */
window.TestFactory = function(logger_level) {
  if (!logger_level) {
    logger_level = z.util.Logger.prototype.levels.ERROR;
  }

  this.settings = {
    connection: {
      environment: 'test',
      rest_url: 'http://localhost',
      websocket_url: 'wss://localhost',
    },
    logging_level: logger_level,
  };

  this.client = new z.service.BackendClient(this.settings.connection);
  this.logger = new z.util.Logger('TestFactory', z.config.LOGGER.OPTIONS);
  this.logger.level = logger_level;

  return this;
};

/**
 *
 * @returns {Promise<z.audio.AudioRepository>} The audio repository.
 */
window.TestFactory.prototype.exposeAudioActors = function() {
  this.logger.info('- exposeAudioActors');
  return Promise.resolve().then(() => {
    TestFactory.audio_repository = new z.audio.AudioRepository();
    TestFactory.audio_repository.logger.level = this.settings.logging_level;
    return TestFactory.audio_repository;
  });
};

/**
 *
 * @returns {Promise<z.auth.AuthRepository>} The authentication repository.
 */
window.TestFactory.prototype.exposeAuthActors = function() {
  this.logger.info('- exposeAuthActors');
  return Promise.resolve().then(() => {
    TestFactory.auth_service = new z.auth.AuthService(this.client);
    TestFactory.auth_service.logger.level = this.settings.logging_level;

    TestFactory.auth_repository = new z.auth.AuthRepository(TestFactory.auth_service);
    TestFactory.auth_repository.logger.level = this.settings.logging_level;
    return TestFactory.auth_repository;
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
      TestFactory.storage_service = new z.storage.StorageService();
      TestFactory.storage_service.logger.level = this.settings.logging_level;
      return TestFactory.storage_service.init(entities.user.john_doe.id);
    })
    .then(() => {
      TestFactory.storage_repository = new z.storage.StorageRepository(TestFactory.storage_service);
      TestFactory.storage_repository.logger.level = this.settings.logging_level;
      return TestFactory.storage_repository;
    });
};

/**
 *
 * @returns {Promise<z.cryptography.CryptographyRepository>} The cryptography repository.
 */
window.TestFactory.prototype.exposeCryptographyActors = function() {
  this.logger.info('- exposeCryptographyActors');
  return Promise.resolve()
    .then(() => this.exposeStorageActors())
    .then(() => {
      this.logger.info('✓ exposedStorageActors');

      const current_client = new z.client.Client({id: entities.clients.john_doe.permanent.id});
      TestFactory.cryptography_service = new z.cryptography.CryptographyService(this.client);
      TestFactory.cryptography_service.logger.level = this.settings.logging_level;

      TestFactory.cryptography_repository = new z.cryptography.CryptographyRepository(
        TestFactory.cryptography_service,
        TestFactory.storage_repository
      );
      TestFactory.cryptography_repository.current_client = ko.observable(current_client);
      TestFactory.cryptography_repository.logger.level = this.settings.logging_level;

      return TestFactory.cryptography_repository.create_cryptobox(TestFactory.storage_service.db);
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

      const client = new z.client.Client({address: '192.168.0.1', class: 'desktop', id: '60aee26b7f55a99f'});

      const user = new z.entity.User(entities.user.john_doe.id);
      user.devices.push(client);
      user.email(entities.user.john_doe.email);
      user.is_me = true;
      user.locale = entities.user.john_doe.locale;
      user.name(entities.user.john_doe.name);
      user.phone(entities.user.john_doe.phone);

      TestFactory.client_service = new z.client.ClientService(this.client, TestFactory.storage_service);
      TestFactory.client_service.logger.level = this.settings.logging_level;

      TestFactory.client_repository = new z.client.ClientRepository(
        TestFactory.client_service,
        TestFactory.cryptography_repository
      );
      TestFactory.client_repository.logger.level = this.settings.logging_level;
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
      const current_client = new z.client.Client(payload);
      TestFactory.client_repository.current_client(current_client);

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
    .then(() => {
      this.logger.info('✓ exposedCryptographyActors');

      TestFactory.web_socket_service = new z.event.WebSocketService(this.client, TestFactory.storage_service);
      TestFactory.web_socket_service.logger.level = this.settings.logging_level;

      TestFactory.notification_service = new z.event.NotificationService(this.client, TestFactory.storage_service);
      TestFactory.notification_service.logger.level = this.settings.logging_level;

      TestFactory.conversation_service = new z.conversation.ConversationService(
        this.client,
        TestFactory.storage_service
      );
      TestFactory.conversation_service.logger.level = this.settings.logging_level;

      TestFactory.event_repository = new z.event.EventRepository(
        TestFactory.web_socket_service,
        TestFactory.notification_service,
        TestFactory.cryptography_repository,
        undefined,
        TestFactory.conversation_service
      );
      TestFactory.event_repository.logger.level = this.settings.logging_level;
      TestFactory.event_repository.current_client = ko.observable(TestFactory.cryptography_repository.current_client());

      return TestFactory.event_repository;
    });
};

/**
 *
 * @returns {Promise<z.user.UserRepository>} The user repository.
 */
window.TestFactory.prototype.exposeUserActors = function() {
  this.logger.info('- exposeUserActors');
  return Promise.resolve()
    .then(() => this.exposeClientActors())
    .then(() => {
      this.logger.info('✓ exposedClientActors');

      TestFactory.asset_service = new z.assets.AssetService(this.client);
      TestFactory.asset_service.logger.level = this.settings.logging_level;

      TestFactory.search_service = new z.search.SearchService(this.client);
      TestFactory.search_service.logger.level = this.settings.logging_level;

      TestFactory.user_service = new z.user.UserService(this.client);
      TestFactory.user_service.logger.level = this.settings.logging_level;

      TestFactory.user_repository = new z.user.UserRepository(
        TestFactory.user_service,
        TestFactory.asset_service,
        TestFactory.search_service,
        TestFactory.client_repository,
        TestFactory.cryptography_repository
      );
      TestFactory.user_repository.logger.level = this.settings.logging_level;
      TestFactory.user_repository.save_user(TestFactory.client_repository.self_user(), true);

      return TestFactory.user_repository;
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

      TestFactory.connectService = new z.connect.ConnectService(this.client);
      TestFactory.connectService.logger.level = this.settings.logging_level;

      TestFactory.connectGoogleService = new z.connect.ConnectGoogleService(this.client);
      TestFactory.connectGoogleService.logger.level = this.settings.logging_level;

      TestFactory.connect_repository = new z.connect.ConnectRepository(
        TestFactory.connectService,
        TestFactory.connectGoogleService,
        TestFactory.user_repository
      );
      TestFactory.connect_repository.logger.level = this.settings.logging_level;

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

      TestFactory.search_service = new z.search.SearchService(this.client);
      TestFactory.search_service.logger.level = this.settings.logging_level;

      TestFactory.search_repository = new z.search.SearchRepository(
        TestFactory.search_service,
        TestFactory.user_repository
      );
      TestFactory.search_repository.logger.level = this.settings.logging_level;

      return TestFactory.search_repository;
    });
};

window.TestFactory.prototype.exposeTeamActors = function() {
  this.logger.info('- exposeTeamActors');
  return Promise.resolve()
    .then(() => this.exposeUserActors())
    .then(() => {
      this.logger.info('✓ exposedUserActors');

      TestFactory.team_service = new z.team.TeamService(this.client);
      TestFactory.team_service.logger.level = this.settings.logging_level;
      return TestFactory.team_service;
    })
    .then(() => {
      TestFactory.team_repository = new z.team.TeamRepository(TestFactory.team_service, TestFactory.user_repository);
      TestFactory.team_repository.logger.level = this.settings.logging_level;
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
    .then(() => this.exposeTeamActors())
    .then(() => {
      this.logger.info('✓ exposedTeamActors');

      TestFactory.conversation_service = new z.conversation.ConversationService(
        this.client,
        TestFactory.storage_service
      );
      TestFactory.conversation_service.logger.level = this.settings.logging_level;

      TestFactory.conversation_repository = new z.conversation.ConversationRepository(
        TestFactory.conversation_service,
        TestFactory.asset_service,
        TestFactory.client_repository,
        TestFactory.cryptography_repository,
        undefined,
        undefined,
        TestFactory.team_repository,
        TestFactory.user_repository
      );
      TestFactory.conversation_repository.logger.level = this.settings.logging_level;

      return TestFactory.conversation_repository;
    });
};

/**
 *
 * @returns {Promise<z.media.MediaRepository>} The media repository.
 */
window.TestFactory.prototype.exposeMediaActors = function() {
  this.logger.info('- exposeMediaActors');
  return Promise.resolve()
    .then(() => this.exposeAudioActors())
    .then(() => {
      this.logger.info('✓ exposedAudioActors');

      TestFactory.media_repository = new z.media.MediaRepository(TestFactory.audio_repository);
      TestFactory.media_repository.logger.level = this.settings.logging_level;

      TestFactory.media_repository.devices_handler.logger.level = this.settings.logging_level;
      TestFactory.media_repository.element_handler.logger.level = this.settings.logging_level;
      TestFactory.media_repository.stream_handler.logger.level = this.settings.logging_level;

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

      TestFactory.calling_service = new z.calling.CallingService(this.client);
      TestFactory.calling_service.logger.level = this.settings.logging_level;

      TestFactory.calling_repository = new z.calling.CallingRepository(
        TestFactory.calling_service,
        TestFactory.client_repository,
        TestFactory.conversation_repository,
        TestFactory.media_repository,
        TestFactory.user_repository
      );
      TestFactory.calling_repository.logger.level = this.settings.logging_level;

      return TestFactory.calling_repository;
    });
};

/**
 *
 * @returns {Promise<z.system_notification.SystemNotificationRepository>} The repository for system notifications.
 */
window.TestFactory.prototype.exposeSystemNotificationActors = function() {
  this.logger.info('- exposeSystemNotificationActors');
  return Promise.resolve()
    .then(() => this.exposeConversationActors())
    .then(() => {
      this.logger.info('✓ exposedConversationActors');
      return this.exposeCallingActors();
    })
    .then(() => {
      this.logger.info('✓ exposedCallingActors');

      TestFactory.system_notification_repository = new z.system_notification.SystemNotificationRepository(
        TestFactory.calling_repository,
        TestFactory.conversation_repository
      );
      TestFactory.system_notification_repository.logger.level = this.settings.logging_level;

      return TestFactory.system_notification_repository;
    });
};

/**
 *
 * @returns {Promise<z.tracking.EventTrackingRepository>} The event tracking repository.
 */
window.TestFactory.prototype.exposeTrackingActors = function() {
  this.logger.info('- exposeTrackingActors');
  return Promise.resolve()
    .then(() => this.exposeConversationActors())
    .then(() => {
      this.logger.info('✓ exposedConversationActors');

      TestFactory.tracking_repository = new z.tracking.EventTrackingRepository(
        TestFactory.conversation_repository,
        TestFactory.team_repository,
        TestFactory.user_repository
      );
      TestFactory.tracking_repository.logger.level = this.settings.logging_level;

      return TestFactory.tracking_repository;
    });
};

/**
 *
 * @returns {Promise<z.lifecycle.LifecycleRepository>} The lifecycle repository.
 */
window.TestFactory.prototype.exposeLifecycleActors = function() {
  this.logger.info('- exposeLifecycleActors');
  return Promise.resolve().then(() => {
    TestFactory.lifecycle_service = new z.lifecycle.LifecycleService();
    TestFactory.lifecycle_service.logger.level = this.settings.logging_level;

    TestFactory.lifecycle_repository = new z.lifecycle.LifecycleRepository(TestFactory.lifecycle_service);
    TestFactory.lifecycle_repository.logger.level = this.settings.logging_level;
    return TestFactory.lifecycle_repository;
  });
};
