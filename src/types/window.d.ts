/*
 * Wire
 * Copyright (C) 2022 Wire Swiss GmbH
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

import {amplify} from 'amplify';

import {WireModule} from './Wire.types';

interface Connection {
  // See https://developer.mozilla.org/en-US/docs/Web/API/NetworkInformation/effectiveType
  effectiveType: 'slow-2g' | '2g' | '3g' | '4g';
  addEventListener: (type: 'change', listener: () => void) => void;
  removeEventListener: (type: 'change', listener: () => void) => void;
}

declare global {
  interface Window {
    wire: WireModule;
    amplify: amplify.Static;
    z: any;
  }

  interface Navigator {
    // TODO: Remove once the type is available in TS native types
    connection?: Connection;
  }
}
