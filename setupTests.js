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

// Polyfill for "tsyringe" dependency injection
require('core-js/es7/reflect');
require('intersection-observer');
require('fake-indexeddb/auto');

require('src/script/util/test/mock/createObjectURLMock');
require('src/script/util/test/mock/cryptoMock');
require('src/script/util/test/mock/iconsMock');
require('src/script/util/test/mock/matchMediaMock');
require('src/script/util/test/mock/mediaDevicesMock');
require('src/script/util/test/mock/navigatorPermissionsMock');
require('src/script/util/test/mock/ResponseMock');
require('src/script/util/test/mock/SVGProviderMock');
require('src/script/util/test/mock/WebRTCMock');

jest.mock('axios', () => {
  return {
    create: () => {
      return {
        interceptors: {
          request: {eject: jest.fn(), use: jest.fn()},
          response: {eject: jest.fn(), use: jest.fn()},
        },
        request: jest.fn(),
      };
    },
  };
});

require('test/api/payloads');
const testLib = require('@testing-library/react');
const Adapter = require('@wojtekmaj/enzyme-adapter-react-17');
const {amplify} = require('amplify');
const {configure} = require('enzyme');
const jQuery = require('jquery');
const ko = require('knockout');
const sinon = require('sinon');
const encoding = require('text-encoding');

configure({adapter: new Adapter()});

window.TextEncoder = encoding.TextEncoder;
window.TextDecoder = encoding.TextDecoder;

window.sinon = sinon;

window.ko = ko;

window.amplify = amplify;

window.jQuery = jQuery;
window.$ = jQuery;

window.wire = {
  env: {
    FEATURE: {},
  },
};

window.z = {userPermission: {}};

testLib.configure({testIdAttribute: 'data-uie-name'});
