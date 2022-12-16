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

/* eslint-disable import/order */

// Polyfill for "tsyringe" dependency injection
require('core-js/full/reflect');
require('intersection-observer');
require('fake-indexeddb/auto');

require('src/script/util/test/mock/createObjectURLMock');
require('src/script/util/test/mock/cryptoMock');
require('src/script/util/test/mock/matchMediaMock');
require('src/script/util/test/mock/mediaDevicesMock');
require('src/script/util/test/mock/navigatorPermissionsMock');
require('src/script/util/test/mock/ResponseMock');
require('src/script/util/test/mock/SVGProviderMock');
require('src/script/util/test/mock/WebRTCMock');
require('src/script/util/test/mock/resizeObserver.mock');

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

const encoding = require('text-encoding');
window.TextEncoder = encoding.TextEncoder;
window.TextDecoder = encoding.TextDecoder;

const sinon = require('sinon');
window.sinon = sinon;

const ko = require('knockout');
window.ko = ko;

const {amplify} = require('amplify');
window.amplify = amplify;

const jQuery = require('jquery');
window.jQuery = jQuery;
window.$ = jQuery;

window.wire = {
  env: {
    FEATURE: {},
  },
};

window.z = {userPermission: {}};

window.URL.createObjectURL = jest.fn();

const testLib = require('@testing-library/react');
testLib.configure({testIdAttribute: 'data-uie-name'});
