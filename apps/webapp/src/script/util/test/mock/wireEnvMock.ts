/*
 * Wire
 * Copyright (C) 2024 Wire Swiss GmbH
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

import type {ClientConfig} from '@wireapp/config';

import {WireModule} from 'src/types/Wire.types';

const wire: WireModule = {
  app: {} as any,
  env: {
    APP_BASE: 'https://app.wire.com',
    BACKEND_REST: 'https://test.wire.link',
    FEATURE: {},
    URL: {
      SUPPORT: {
        SHARED_DRIVE:
          'https://support.wire.com/auth/v3/signin?brand_id=162184&locale=en-us&return_to=https%3A%2F%2Fsupport.wire.com%2Fhc%2Fen-us%2Farticles%2F36679600377373-File-permissions-in-Shared-Drive&role=end_user',
      },
    },
    NEW_PASSWORD_MINIMUM_LENGTH: 8,
    ASSET_VERSION: 'dev-unknown',
    VERSION: '0.0.0-test',
  } as ClientConfig,
};

Object.defineProperty(window, 'wire', {
  value: wire,
  writable: true,
});
