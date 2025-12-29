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

// Mock console methods for testing
global.console = {
  ...console,
  log: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  debug: jest.fn(),
};

// Mock window for browser-specific tests
global.window = global.window || {};

// Mock Datadog SDK
(global as any).datadogLogs = {
  init: jest.fn(() => ({
    logger: {
      log: jest.fn(),
      addContext: jest.fn(),
    },
  })),
};

(global as any).datadogRum = {
  init: jest.fn(() => ({})),
  getInternalContext: jest.fn(() => ({session_id: 'test-session-id'})),
};
