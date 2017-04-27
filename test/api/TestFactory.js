/*
 * Wire
 * Copyright (C) 2016 Wire Swiss GmbH
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
 * @param {function} logger_level - A function returning the logger level.
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
  const self = this;
  self.logger.info('- exposeAudioActors');
  return Promise.resolve()
  .then(function() {
    window.audio_repository = new z.audio.AudioRepository();
    window.audio_repository.logger.level = self.settings.logging_level;
    return window.audio_repository;
  });
};

/**
 *
 * @returns {Promise<z.auth.AuthRepository>} The authentication repository.
 */
window.TestFactory.prototype.exposeAuthActors = function() {
  const self = this;
  self.logger.info('- exposeAuthActors');
  return Promise.resolve()
  .then(function() {
    window.auth_service = new z.auth.AuthService(self.client);
    window.auth_service.logger.level = self.settings.logging_level;

    window.auth_repository = new z.auth.AuthRepository(window.auth_service);
    window.auth_repository.logger.level = self.settings.logging_level;
    return window.auth_repository;
  });
};

/**
 *
 * @returns {Promise<z.storage.StorageRepository>} The storage repository.
 */
window.TestFactory.prototype.exposeStorageActors = function() {
  const self = this;
  self.logger.info('- exposeStorageActors');
  return Promise.resolve()
  .then(function() {
    window.storage_service = new z.storage.StorageService();
    window.storage_service.logger.level = self.settings.logging_level;
    return window.storage_service.init(entities.user.john_doe.id);
  })
  .then(function() {
    window.storage_repository = new z.storage.StorageRepository(window.storage_service);
    window.storage_repository.logger.level = self.settings.logging_level;
    return window.storage_repository;
  });
};

/**
 *
 * @returns {Promise<z.cryptography.CryptographyRepository>} The cryptography repository.
 */
window.TestFactory.prototype.exposeCryptographyActors = function() {
  const self = this;
  self.logger.info('- exposeCryptographyActors');
  return Promise.resolve()
  .then(function() {
    return self.exposeStorageActors();
  })
  .then(function() {
    self.logger.info('✓ exposedStorageActors');

    const current_client = new z.client.Client({'id': entities.clients.john_doe.permanent.id});
    window.cryptography_service = new z.cryptography.CryptographyService(self.client);
    window.cryptography_service.logger.level = self.settings.logging_level;

    window.cryptography_repository = new z.cryptography.CryptographyRepository(window.cryptography_service, window.storage_repository);
    window.cryptography_repository.current_client = ko.observable(current_client);
    window.cryptography_repository.logger.level = self.settings.logging_level;

    return window.cryptography_repository.init(window.storage_service.db);
  })
  .then(function() {
    return window.cryptography_repository;
  });
};

/**
 *
 * @returns {Promise<z.client.ClientRepository>} The client repository.
 */
window.TestFactory.prototype.exposeClientActors = function() {
  const self = this;
  self.logger.info('- exposeClientActors');
  return Promise.resolve()
  .then(function() {
    return self.exposeCryptographyActors();
  })
  .then(function() {
    self.logger.info('✓ exposedCryptographyActors');

    const client = new z.client.Client({'address': '192.168.0.1', 'class': 'desktop', 'id': '60aee26b7f55a99f'});

    const user = new z.entity.User(entities.user.john_doe.id);
    user.devices.push(client);
    user.email(entities.user.john_doe.email);
    user.is_me = true;
    user.locale = entities.user.john_doe.locale;
    user.name(entities.user.john_doe.name);
    user.phone(entities.user.john_doe.phone);

    window.client_service = new z.client.ClientService(self.client, window.storage_service);
    window.client_service.logger.level = self.settings.logging_level;

    window.client_repository = new z.client.ClientRepository(client_service, window.cryptography_repository);
    window.client_repository.logger.level = self.settings.logging_level;
    window.client_repository.init(user);
    const payload = {'address': '62.96.148.44', 'class': 'desktop', 'cookie': 'webapp@2153234453@temporary@1470926647664', 'id': '132b3653b33f851f', 'label': 'Windows 10', 'location': {'lat': 52.5233, 'lon': 13.4138}, 'meta': {'is_verified': true, 'primary_key': 'local_identity'}, 'model': 'Chrome (Temporary)', 'time': '2016-10-07T16:01:42.133Z', 'type': 'temporary'};
    const current_client = new z.client.Client(payload);
    window.client_repository.current_client(current_client);

    return window.client_repository;
  });
};

/**
 *
 * @returns {Promise<z.event.EventRepository>} The event repository.
 */
window.TestFactory.prototype.exposeEventActors = function() {
  const self = this;
  self.logger.info('- exposeEventActors');
  return Promise.resolve()
  .then(function() {
    return self.exposeCryptographyActors();
  })
  .then(function() {
    self.logger.info('✓ exposedCryptographyActors');

    window.web_socket_service = new z.event.WebSocketService(self.client, window.storage_service);
    window.web_socket_service.logger.level = self.settings.logging_level;

    window.notification_service = new z.event.NotificationService(self.client, window.storage_service);
    window.notification_service.logger.level = self.settings.logging_level;

    window.conversation_service = new z.conversation.ConversationService(self.client, window.storage_service);
    window.conversation_service.logger.level = self.settings.logging_level;

    window.event_repository = new z.event.EventRepository(web_socket_service, notification_service, window.cryptography_repository, undefined, conversation_service);
    window.event_repository.logger.level = self.settings.logging_level;
    window.event_repository.current_client = ko.observable(window.cryptography_repository.current_client());

    return window.event_repository;
  });
};

/**
 *
 * @returns {Promise<z.user.UserRepository>} The user repository.
 */
window.TestFactory.prototype.exposeUserActors = function() {
  const self = this;
  self.logger.info('- exposeUserActors');
  return Promise.resolve()
  .then(function() {
    return self.exposeClientActors();
  })
  .then(function() {
    self.logger.info('✓ exposedClientActors');

    window.asset_service = new z.assets.AssetService(self.client);
    window.asset_service.logger.level = self.settings.logging_level;

    window.search_service = new z.search.SearchService(self.client);
    window.search_service.logger.level = self.settings.logging_level;

    window.user_service = new z.user.UserService(self.client);
    window.user_service.logger.level = self.settings.logging_level;

    window.user_repository = new z.user.UserRepository(user_service, asset_service, search_service, window.client_repository, window.cryptography_repository);
    window.user_repository.logger.level = self.settings.logging_level;
    window.user_repository.save_user(window.client_repository.self_user(), true);

    return window.user_repository;
  });
};

/**
 *
 * @returns {Promise<z.connect.ConnectRepository>} The connect repository.
 */
window.TestFactory.prototype.exposeConnectActors = function() {
  const self = this;
  self.logger.info('- exposeConnectActors');
  return Promise.resolve()
  .then(function() {
    return self.exposeUserActors();
  })
  .then(function() {
    self.logger.info('✓ exposedUserActors');

    window.connect_service = new z.connect.ConnectService(self.client);
    window.connect_service.logger.level = self.settings.logging_level;

    window.connect_google_service = new z.connect.ConnectGoogleService(self.client);
    window.connect_google_service.logger.level = self.settings.logging_level;

    window.connect_repository = new z.connect.ConnectRepository(window.connect_service, window.connect_google_service, window.user_repository);
    window.connect_repository.logger.level = self.settings.logging_level;

    return window.connect_repository;
  });
};

/**
 *
 * @returns {Promise<z.search.SearchRepository>} The search repository.
 */
window.TestFactory.prototype.exposeSearchActors = function() {
  const self = this;
  self.logger.info('- exposeSearchActors');
  return Promise.resolve()
  .then(function() {
    return self.exposeUserActors();
  })
  .then(function() {
    self.logger.info('✓ exposedUserActors');

    window.search_service = new z.search.SearchService(self.client);
    window.search_service.logger.level = self.settings.logging_level;

    window.search_repository = new z.search.SearchRepository(window.search_service, window.user_repository);
    window.search_repository.logger.level = self.settings.logging_level;

    return window.search_repository;
  });
};

/**
 *
 * @returns {Promise<z.conversation.ConversationRepository>} The conversation repository.
 */
window.TestFactory.prototype.exposeConversationActors = function() {
  const self = this;
  self.logger.info('- exposeConversationActors');
  return Promise.resolve()
  .then(function() {
    return self.exposeUserActors();
  })
  .then(function() {
    self.logger.info('✓ exposedUserActors');

    window.conversation_service = new z.conversation.ConversationService(self.client, window.storage_service);
    window.conversation_service.logger.level = self.settings.logging_level;

    window.conversation_repository = new z.conversation.ConversationRepository(
      conversation_service,
      window.asset_service,
      window.user_repository,
      undefined,
      window.cryptography_repository
    );
    window.conversation_repository.logger.level = self.settings.logging_level;

    return window.conversation_repository;
  });
};

/**
 *
 * @returns {Promise<z.media.MediaRepository>} The media repository.
 */
window.TestFactory.prototype.exposeMediaActors = function() {
  const self = this;
  self.logger.info('- exposeMediaActors');
  return Promise.resolve()
  .then(function() {
    return self.exposeAudioActors();
  })
  .then(function() {
    self.logger.info('✓ exposedAudioActors');

    window.media_repository = new z.media.MediaRepository(window.audio_repository);
    window.media_repository.logger.level = self.settings.logging_level;

    window.media_repository.devices_handler.logger.level = self.settings.logging_level;
    window.media_repository.stream_handler.logger.level = self.settings.logging_level;
    window.media_repository.element_handler.logger.level = self.settings.logging_level;

    return window.v2_call_center;
  });
};

/**
 *
 * @returns {Promise<z.calling.CallCenter>} The call center.
 */
window.TestFactory.prototype.exposeCallingActors = function() {
  const self = this;
  self.logger.info('- exposeCallingActors');
  return Promise.resolve()
  .then(function() {
    return self.exposeMediaActors();
  })
  .then(function() {
    self.logger.info('✓ exposedMediaActors');
    return self.exposeConversationActors();
  })
  .then(function() {
    self.logger.info('✓ exposedConversationActors');

    window.call_service = new z.calling.v2.CallService(self.client);
    window.call_service.logger.level = self.settings.logging_level;

    window.calling_service = new z.calling.CallingService(self.client);
    window.calling_service.logger.level = self.settings.logging_level;

    window.calling_repository = new z.calling.CallingRepository(window.call_service, window.calling_service, window.conversation_repository, window.media_repository, window.user_repository);
    window.calling_repository.logger.level = self.settings.logging_level;

    window.v2_call_center = window.calling_repository.v2_call_center;
    window.v2_call_center.logger.level = self.settings.logging_level;
    window.v2_call_center.state_handler.logger.level = self.settings.logging_level;
    window.v2_call_center.signaling_handler.logger.level = self.settings.logging_level;

    window.v3_call_center = window.calling_repository.v3_call_center;
    window.v3_call_center.logger.level = self.settings.logging_level;

    return window.calling_repository;
  });
};

/**
 *
 * @returns {Promise<z.system_notification.SystemNotificationRepository>} The repository for system notifications.
 */
window.TestFactory.prototype.exposeSystemNotificationActors = function() {
  const self = this;
  self.logger.info('- exposeSystemNotificationActors');
  return Promise.resolve()
  .then(function() {
    return self.exposeConversationActors();
  })
  .then(function() {
    self.logger.info('✓ exposedConversationActors');
    return self.exposeCallingActors();
  })
  .then(function() {
    self.logger.info('✓ exposedCallingActors');

    window.system_notification_repository = new z.system_notification.SystemNotificationRepository(window.v2_call_center, window.conversation_repository);
    window.system_notification_repository.logger.level = self.settings.logging_level;

    return window.system_notification_repository;
  });
};

/**
 *
 * @returns {Promise<z.tracking.EventTrackingRepository>} The event tracking repository.
 */
window.TestFactory.prototype.exposeTrackingActors = function() {
  const self = this;
  self.logger.info('- exposeTrackingActors');
  return Promise.resolve()
  .then(function() {
    return self.exposeConversationActors();
  })
  .then(function() {
    self.logger.info('✓ exposedConversationActors');

    window.tracking_repository = new z.tracking.EventTrackingRepository(window.conversation_repository, window.user_repository);
    window.tracking_repository.logger.level = self.settings.logging_level;

    return window.tracking_repository;
  });
};

/**
 *
 * @returns {Promise<z.announce.AnnounceRepository>} The repository for announcements.
 */
window.TestFactory.prototype.exposeAnnounceActors = function() {
  const self = this;
  self.logger.info('- exposeAnnounceActors');
  return Promise.resolve()
  .then(function() {
    window.announce_service = new z.announce.AnnounceService();
    window.announce_service.logger.level = self.settings.logging_level;

    window.announce_repository = new z.announce.AnnounceRepository(window.announce_service);
    window.announce_repository.logger.level = self.settings.logging_level;
    return window.announce_repository;
  });
};
