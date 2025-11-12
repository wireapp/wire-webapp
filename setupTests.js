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

/**
 * ---------------------------------------------------------------------------
 * Global polyfills required by the application runtime inside the Jest env
 * ---------------------------------------------------------------------------
 */
import 'core-js/full/reflect';
import 'intersection-observer';
import 'core-js/stable/structured-clone';
import 'fake-indexeddb/auto';
import '@testing-library/jest-dom';

/**
 * ---------------------------------------------------------------------------
 * Wire specific side-effect mocks (mutate global objects when imported)
 * ---------------------------------------------------------------------------
 */
import 'src/script/util/test/mock/createObjectURLMock';
import 'src/script/util/test/mock/cryptoMock';
import 'src/script/util/test/mock/matchMediaMock';
import 'src/script/util/test/mock/mediaDevicesMock';
import 'src/script/util/test/mock/navigatorPermissionsMock';
import 'src/script/util/test/mock/ResponseMock';
import 'src/script/util/test/mock/WebRTCMock';
import 'src/script/util/test/mock/resizeObserver.mock';
import 'src/script/util/test/mock/wireEnvMock';
import 'src/script/util/test/mock/browserApiMock';

/**
 * ---------------------------------------------------------------------------
 * Testing library configuration
 * ---------------------------------------------------------------------------
 */
const testLib = require('@testing-library/react');
testLib.configure({testIdAttribute: 'data-uie-name'});

/**
 * ---------------------------------------------------------------------------
 * Third-party module mocks (implementations live in __mocks__)
 * ---------------------------------------------------------------------------
 */
jest.mock('axios');
jest.mock('@formkit/auto-animate/react');
jest.mock('react-pdf');
jest.mock('@wireapp/react-ui-kit');
jest.mock('@wireapp/api-client/lib/team/feature/FeatureAPI');
jest.mock('@wireapp/core');
jest.mock('@wireapp/core-crypto');

// Important: the team module re-exports FeatureAPI. Requiring both modules here
// ensures Node's module cache captures the mocked constructors instead of the real ones.
require('@wireapp/api-client/lib/team/feature/FeatureAPI');
require('@wireapp/api-client/lib/team');
