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

'use strict';

window.z = window.z || {};
window.z.lifecycle = z.lifecycle || {};

z.lifecycle.LifecycleRepository = class LifecycleRepository {
  static get CONFIG() {
    return {
      CHECK_INTERVAL: 3 * 60 * 60 * 1000,
      CHECK_TIMEOUT: 5 * 60 * 1000,
      UPDATE_INTERVAL: 6 * 60 * 60 * 1000,
    };
  }

  constructor(lifecycleService, userRepository) {
    this.logger = new z.util.Logger('z.lifecycle.LifecycleRepository', z.config.LOGGER.OPTIONS);
    this.lifecycleService = lifecycleService;
    this.userRepository = userRepository;
  }

  init() {
    if (!this.userRepository.selfUser().isTemporaryGuest()) {
      window.setInterval(() => this.checkVersion(), LifecycleRepository.CONFIG.CHECK_INTERVAL);
    }
  }

  checkVersion() {
    if (navigator.onLine) {
      return this.lifecycleService.getVersion().then(serverVersion => {
        const currentVersion = z.util.Environment.version(false, true);
        this.logger.info(`Checking current webapp version. Server '${serverVersion}' vs. local '${currentVersion}'`);

        const isOutdatedVersion = serverVersion > currentVersion;
        if (isOutdatedVersion) {
          amplify.publish(z.event.WebApp.LIFECYCLE.UPDATE, z.lifecycle.UPDATE_SOURCE.WEBAPP);
        }
      });
    }
  }
};
