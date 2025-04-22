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
import 'core-js/full/reflect';
import 'intersection-observer';
import 'core-js/stable/structured-clone';
import 'fake-indexeddb/auto';
import '@testing-library/jest-dom';

import 'src/script/util/test/mock/createObjectURLMock';
import 'src/script/util/test/mock/cryptoMock';
import 'src/script/util/test/mock/matchMediaMock';
import 'src/script/util/test/mock/mediaDevicesMock';
import 'src/script/util/test/mock/navigatorPermissionsMock';
import 'src/script/util/test/mock/ResponseMock';
import 'src/script/util/test/mock/WebRTCMock';
import 'src/script/util/test/mock/resizeObserver.mock';
import 'src/script/util/test/mock/wireEnvMock';

import encoding from 'text-encoding';

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

window.TextEncoder = encoding.TextEncoder;
window.TextDecoder = encoding.TextDecoder;

window.z = {userPermission: {}};

window.URL.createObjectURL = jest.fn();
window.URL.revokeObjectURL = jest.fn();

Object.defineProperty(document, 'elementFromPoint', {
  writable: true,
  value: jest.fn().mockImplementation((x, y) => {
    return null;
  }),
});

const testLib = require('@testing-library/react');
testLib.configure({testIdAttribute: 'data-uie-name'});

jest.mock('@formkit/auto-animate/react', () => ({
  useAutoAnimate: () => [null, () => {}],
}));

jest.mock('react-pdf', () => ({
  pdfjs: {
    GlobalWorkerOptions: {
      workerSrc: 'pdf.worker.js',
    },
  },
}));
