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

/**
 *
 * @returns {Window.TestFactory}
 * @constructor
 */
window.TestFactory = function (logger_level) {
  if (!logger_level) {
    logger_level = z.util.Logger.prototype.levels.ERROR;
  }

  this.settings = {
    logging_level: logger_level,
    connection: {
      environment: 'test',
      rest_url: 'http://localhost',
      websocket_url: 'wss://localhost'
    }
  };

  this.client = new z.service.Client(this.settings.connection);
  return this;
};

/**
 *
 * @returns {Promise<z.auth.AuthRepository>}
 */
window.TestFactory.prototype.exposeAuthActors = function () {
  var self = this;
  return new Promise(function (resolve) {
    window.auth_service = new z.auth.AuthService(self.client);
    window.auth_service.logger.level = self.settings.logging_level;

    window.auth_repository = new z.auth.AuthRepository(window.auth_service);
    window.auth_repository.logger.level = self.settings.logging_level;
    resolve(window.auth_repository);
  });
};

/**
 *
 * @returns {Promise<z.storage.StorageRepository>}
 */
window.TestFactory.prototype.exposeStorageActors = function () {
  var self = this;
  return new Promise(function (resolve) {
    window.storage_service = new z.storage.StorageService();
    window.storage_service.logger.level = self.settings.logging_level;

    window.storage_service.init(entities.user.john_doe.id).then(function () {
      window.storage_repository = new z.storage.StorageRepository(window.storage_service);
      window.storage_repository.logger.level = self.settings.logging_level;
      resolve(window.storage_repository);
    });
  });
};

/**
 *
 * @returns {Promise<z.cryptography.CryptographyRepository>}
 */
window.TestFactory.prototype.exposeCryptographyActors = function () {
  var self = this;
  return new Promise(function (resolve) {
    self.exposeStorageActors().then(function () {
      var current_client = new z.client.Client({"id": entities.clients.john_doe.permanent.id});
      window.cryptography_service = new z.cryptography.CryptographyService(self.client);
      window.cryptography_service.logger.level = self.settings.logging_level;

      window.cryptography_repository = new z.cryptography.CryptographyRepository(window.cryptography_service, window.storage_repository);
      window.cryptography_repository.current_client = ko.observable(current_client);
      window.cryptography_repository.logger.level = self.settings.logging_level;

      window.cryptography_repository.init().then(function () {
        resolve(window.cryptography_repository);
      });
    });
  });
};

/**
 *
 * @returns {Promise<z.client.ClientRepository>}
 */
window.TestFactory.prototype.exposeClientActors = function () {
  var self = this;
  return new Promise(function (resolve) {
    self.exposeCryptographyActors().then(function () {
      var client = new z.client.Client();
      client.id = '60aee26b7f55a99f';
      client.class = 'desktop';

      var user = new z.entity.User(entities.user.john_doe.id);
      user.devices.push(client);
      user.email(entities.user.john_doe.email);
      user.is_me = true;
      user.locale = entities.user.john_doe.locale;
      user.name(entities.user.john_doe.name);
      user.phone(entities.user.john_doe.phone);
      user.tracking_id = entities.user.john_doe.tracking_id;

      window.client_service = new z.client.ClientService(self.client, window.storage_service);
      window.client_service.logger.level = self.settings.logging_level;

      window.client_repository = new z.client.ClientRepository(client_service, window.cryptography_repository);
      window.client_repository.logger.level = self.settings.logging_level;
      window.client_repository.init(user);

      resolve(window.client_repository);
    });
  });
};

/**
 *
 * @returns {Promise<z.event.EventRepository>}
 */
window.TestFactory.prototype.exposeEventActors = function () {
  var self = this;
  return new Promise(function (resolve) {
    self.exposeCryptographyActors().then(function () {
      window.web_socket_service = new z.event.WebSocketService(self.client, window.storage_service);
      window.web_socket_service.logger.level = self.settings.logging_level;

      window.notification_service = new z.event.NotificationService(self.client, window.storage_service);
      window.notification_service.logger.level = self.settings.logging_level;

      window.event_repository = new z.event.EventRepository(web_socket_service, notification_service, window.cryptography_repository, undefined);
      window.event_repository.logger.level = self.settings.logging_level;
      window.event_repository.current_client = ko.observable(window.cryptography_repository.current_client());

      resolve(window.event_repository);
    });
  });
};

/**
 *
 * @returns {Promise<z.user.UserRepository>}
 */
window.TestFactory.prototype.exposeUserActors = function () {
  var self = this;
  return new Promise(function (resolve) {
    self.exposeClientActors().then(function () {
      window.asset_service = new z.assets.AssetService(self.client);
      window.asset_service.logger.level = self.settings.logging_level;

      window.search_service = new z.search.SearchService(self.client);
      window.search_service.logger.level = self.settings.logging_level;

      window.user_service = new z.user.UserService(self.client);
      window.user_service.logger.level = self.settings.logging_level;

      window.user_repository = new z.user.UserRepository(user_service, asset_service, search_service, window.client_repository, window.cryptography_repository);
      window.user_repository.logger.level = self.settings.logging_level;
      window.user_repository.save_user(window.client_repository.self_user(), true);
      resolve(window.user_repository);
    });
  });
};

/**
 *
 * @returns {Promise<z.connect.ConnectRepository>}
 */
window.TestFactory.prototype.exposeConnectActors = function () {
  var self = this;
  return new Promise(function (resolve) {
    self.exposeUserActors().then(function () {
      window.connect_service = new z.connect.ConnectService(self.client);
      window.connect_service.logger.level = self.settings.logging_level;

      window.connect_google_service = new z.connect.ConnectGoogleService(self.client);
      window.connect_google_service.logger.level = self.settings.logging_level;

      window.connect_repository = new z.connect.ConnectRepository(window.connect_service, window.connect_google_service, window.user_repository);
      window.connect_repository.logger.level = self.settings.logging_level;
      resolve(window.connect_repository);
    });
  });
};

/**
 *
 * @returns {Promise<z.search.SearchRepository>}
 */
window.TestFactory.prototype.exposeSearchActors = function () {
  var self = this;
  return new Promise(function (resolve) {
    self.exposeUserActors().then(function () {
      window.search_service = new z.search.SearchService(self.client);
      window.search_service.logger.level = self.settings.logging_level;

      window.search_repository = new z.search.SearchRepository(window.search_service, window.user_repository);
      window.search_repository.logger.level = self.settings.logging_level;
      resolve(window.search_repository);
    });
  });
};

/**
 *
 * @returns {Promise<z.conversation.ConversationRepository>}
 */
window.TestFactory.prototype.exposeConversationActors = function () {
  var self = this;
  return new Promise(function (resolve) {
    self.exposeUserActors().then(function () {
      window.conversation_service = new z.conversation.ConversationService(self.client);
      window.conversation_service.logger.level = self.settings.logging_level;

      window.conversation_repository = new z.conversation.ConversationRepository(
        conversation_service,
        window.asset_service,
        window.user_repository,
        undefined,
        window.cryptography_repository
      );
      window.conversation_repository.logger.level = self.settings.logging_level;
      resolve(window.conversation_repository);
    });
  });
};

/**
 *
 * @returns {Promise<z.calling.CallCenter>}
 */
window.TestFactory.prototype.exposeCallingActors = function () {
  var self = this;
  return new Promise(function (resolve) {
    self.exposeConversationActors().then(function () {
      window.call_service = new z.calling.CallService(self.client);
      window.call_service.logger.level = self.settings.logging_level;

      window.call_center = new z.calling.CallCenter(window.call_service, window.conversation_repository, window.user_repository);
      window.call_center.logger.level = self.settings.logging_level;

      window.call_center.media_devices_handler.logger.level = self.settings.logging_level;
      window.call_center.media_stream_handler.logger.level = self.settings.logging_level;
      window.call_center.media_element_handler.logger.level = self.settings.logging_level;
      window.call_center.state_handler.logger.level = self.settings.logging_level;
      window.call_center.signaling_handler.logger.level = self.settings.logging_level;
      resolve(window.call_center);
    });
  });
};

/**
 *
 * @returns {Promise<z.SystemNotification.SystemNotificationRepository>}
 */
window.TestFactory.prototype.exposeSystemNotificationActors = function () {
  var self = this;
  return new Promise(function (resolve) {
    self.exposeConversationActors().then(function () {
      window.system_notification_repository = new z.SystemNotification.SystemNotificationRepository(window.conversation_repository);
      window.system_notification_repository.logger.level = self.settings.logging_level;
      resolve(window.system_notification_repository);
    });
  });
};

/**
 *
 * @returns {Promise<z.tracking.EventTrackingRepository>}
 */
window.TestFactory.prototype.exposeTrackingActors = function () {
  var self = this;
  return new Promise(function (resolve) {
    self.exposeConversationActors().then(function () {
      window.tracking_repository = new z.tracking.EventTrackingRepository(window.user_repository, window.conversation_repository);
      window.tracking_repository.logger.level = self.settings.logging_level;
      resolve(window.tracking_repository);
    });
  });
};

/**
 *
 * @returns {Promise<z.announce.AnnounceRepository>}
 */
window.TestFactory.prototype.exposeAnnounceActors = function () {
  var self = this;
  return new Promise(function (resolve) {
    window.announce_service = new z.announce.AnnounceService();
    window.announce_service.logger.level = self.settings.logging_level;

    window.announce_repository = new z.announce.AnnounceRepository(window.announce_service);
    window.announce_repository.logger.level = self.settings.logging_level;
    resolve(window.announce_repository);
  });
};
