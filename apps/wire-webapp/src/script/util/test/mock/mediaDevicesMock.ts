/*
 * Wire
 * Copyright (C) 2020 Wire Swiss GmbH
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

Object.defineProperty(window.navigator, 'mediaDevices', {
  value: {
    enumerateDevices: jest.fn().mockImplementation(() =>
      Promise.resolve([
        {
          deviceId: '',
          groupId: '87ea57a1cef35b7614c579fa44c2e0417c7cf906f8eec46d1d783b94e9b5e5d0',
          kind: 'audioinput',
          label: '',
        },
      ]),
    ),
    getUserMedia: jest.fn().mockImplementation(() => Promise.resolve()),
  },
});
