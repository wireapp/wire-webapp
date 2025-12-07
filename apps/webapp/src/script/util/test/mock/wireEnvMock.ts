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

import {ClientConfig} from '../../../../../../server/config';
import {WireModule} from 'src/types/Wire.types';

import {ClientConfig} from '../../../../../../server/config';

const wire: WireModule = {
  app: {} as any,
  env: {
    APP_BASE: 'https://app.wire.com',
    BACKEND_REST: 'https://test.wire.link',
    FEATURE: {},
    URL: {SUPPORT: {}},
    NEW_PASSWORD_MINIMUM_LENGTH: 8,
  } as ClientConfig,
};

Object.defineProperty(window, 'wire', {
  value: wire,
  writable: true,
});
