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

'use strict';

(function() {
  window.z = window.z || {};
  window.z.auth = z.auth || {};

  window.z.auth.AuthRepository = class AuthRepository {
    constructor(auth_service) {
      this.access_token_refresh = undefined;
      this.auth_service = auth_service;
      this.logger = new z.util.Logger('z.auth.AuthRepository', z.config.LOGGER.OPTIONS);
      amplify.subscribe(z.event.WebApp.CONNECTION.ACCESS_TOKEN.RENEW, this.renew_access_token);
    }
  }
})();
