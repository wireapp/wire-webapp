/*
 * Wire
 * Copyright (C) 2025 Wire Swiss GmbH
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

// eslint-disable-next-line @typescript-eslint/no-var-requires
const encoding = require('text-encoding');

window.TextEncoder = encoding.TextEncoder;
window.TextDecoder = encoding.TextDecoder;

window.z = {userPermission: {}};

window.URL.createObjectURL = jest.fn();
window.URL.revokeObjectURL = jest.fn();

Object.defineProperty(document, 'elementFromPoint', {
  writable: true,
  value: jest.fn().mockReturnValue(null),
});
