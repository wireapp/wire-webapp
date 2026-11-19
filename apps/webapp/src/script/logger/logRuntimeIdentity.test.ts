/*
 * Wire
 * Copyright (C) 2026 Wire Swiss GmbH
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

import {createDeterministicClock} from '@enormora/clock/deterministic-clock';
import {noop} from 'noop-esm';
import {Maybe} from 'true-myth';

import {createPinoLogging} from './createPinoLogging';
import type {BrowserLogPersistence} from './createBrowserLogPersistence';
import {initializeLogging} from './initializeLogging';
import type {Logger} from './logger';
import type {LogOutput} from './logOutput';
import {getDeploymentStage, logRuntimeIdentity, logStartupRuntimeIdentity} from './logRuntimeIdentity';

import {createStartupFeatureTogglesFromLocationSearch} from '../featureToggles/startupFeatureToggles';

const desktopAccountIdentifier = '11111111-1111-4111-8111-111111111111';

type ConsoleOutputForTest = Readonly<Record<keyof Logger, jest.Mock<void, [string]>>>;
type StartupLoggingFixture = {
  readonly logging: ReturnType<typeof createPinoLogging>;
  readonly createPersistenceOutput: jest.Mock<Maybe<BrowserLogPersistence>, []>;
  readonly options: Parameters<typeof logStartupRuntimeIdentity>[0] & {readonly consoleOutput: ConsoleOutputForTest};
};

function createStartupLoggingFixture(debugEnabled: boolean): StartupLoggingFixture {
  const clock = createDeterministicClock({initialUnixEpochMicroseconds: 1_000_000n});
  const consoleOutput = {
    debug: jest.fn<void, [string]>(),
    info: jest.fn<void, [string]>(),
    warn: jest.fn<void, [string]>(),
    error: jest.fn<void, [string]>(),
  };
  const logging = createPinoLogging(Maybe.nothing());
  const createPersistenceOutput = jest.fn<Maybe<BrowserLogPersistence>, []>(() => {
    return Maybe.nothing();
  });
  initializeLogging({
    clock,
    consoleOutput,
    locationSearch: `?id=${desktopAccountIdentifier}`,
    debugEnabled,
    storage: Maybe.nothing(),
    configureLogging: logging.configure,
    startupFeatureToggles: createStartupFeatureTogglesFromLocationSearch('?enabled-features=persistent-browser-logs'),
    isElectron: true,
    createPersistenceOutput,
  });

  return {
    logging,
    createPersistenceOutput,
    options: {
      clock,
      consoleOutput,
      logger: logging.getLogger('@wireapp/webapp/RuntimeIdentity'),
      isDesktopApp: true,
      hasDesktopLogPersistence: false,
      locationSearch: `?id=${desktopAccountIdentifier}`,
      hostname: 'wire-webapp-beta.wire.com',
      origin: 'https://wire-webapp-beta.wire.com',
      version: '1.2.3',
      assetVersion: '1.2.3-0123456789abcdef',
    },
  };
}

describe('runtime identity', () => {
  it.each([false, true])(
    'emits one Desktop console identity with debug enabled=%s and preserves ordinary verbosity',
    debugEnabled => {
      const {logging, createPersistenceOutput, options} = createStartupLoggingFixture(debugEnabled);

      logStartupRuntimeIdentity(options);

      expect(createPersistenceOutput).not.toHaveBeenCalled();
      expect(options.consoleOutput.info).toHaveBeenCalledTimes(1);
      const actualRecord: unknown = JSON.parse(options.consoleOutput.info.mock.calls.at(0)?.[0] ?? '{}');
      expect(actualRecord).toEqual({
        level: 30,
        time: 1000,
        component: '@wireapp/webapp/RuntimeIdentity',
        msg: 'WebApp runtime identity',
        deploymentStage: 'beta',
        version: '1.2.3',
        assetVersion: '1.2.3-0123456789abcdef',
        origin: 'https://wire-webapp-beta.wire.com',
      });
      expect(options.consoleOutput.info.mock.calls.at(0)?.[0]).not.toContain(desktopAccountIdentifier);

      const ordinaryLogger = logging.getLogger('@wireapp/webapp/OrdinaryComponent');
      ordinaryLogger.debug('Ordinary debug');
      ordinaryLogger.info('Ordinary info');
      expect(options.consoleOutput.debug).toHaveBeenCalledTimes(debugEnabled ? 1 : 0);
      expect(options.consoleOutput.info).toHaveBeenCalledTimes(debugEnabled ? 2 : 1);
      expect(options.consoleOutput.warn).not.toHaveBeenCalled();
      expect(options.consoleOutput.error).not.toHaveBeenCalled();
    },
  );

  it.each([
    '',
    '?id=',
    '?id=invalid',
    '?id=11111111-1111-1111-8111-111111111111',
    `?id=${desktopAccountIdentifier}&id=${desktopAccountIdentifier}`,
  ])('does not rely on native capture without one valid Desktop account ID: %s', locationSearch => {
    const {options} = createStartupLoggingFixture(false);

    logStartupRuntimeIdentity({
      clock: options.clock,
      consoleOutput: options.consoleOutput,
      logger: options.logger,
      isDesktopApp: options.isDesktopApp,
      hasDesktopLogPersistence: false,
      locationSearch,
      hostname: options.hostname,
      origin: options.origin,
      version: options.version,
      assetVersion: options.assetVersion,
    });

    expect(options.consoleOutput.info).not.toHaveBeenCalled();
  });

  it('keeps browser startup identity on the configured Pino destination', () => {
    const {options} = createStartupLoggingFixture(false);
    const info = jest.fn();

    logStartupRuntimeIdentity({
      clock: options.clock,
      consoleOutput: options.consoleOutput,
      logger: {info},
      isDesktopApp: false,
      hasDesktopLogPersistence: false,
      locationSearch: options.locationSearch,
      hostname: options.hostname,
      origin: options.origin,
      version: options.version,
      assetVersion: options.assetVersion,
    });

    expect(info).toHaveBeenCalledWith('WebApp runtime identity', {
      deploymentStage: 'beta',
      version: options.version,
      assetVersion: options.assetVersion,
      origin: options.origin,
    });
    expect(options.consoleOutput.info).not.toHaveBeenCalled();
  });

  it.each([false, true])('contains logging failures during startup in Desktop=%s', isDesktopApp => {
    const {options} = createStartupLoggingFixture(false);
    const failingOutput = jest.fn(() => {
      throw new Error('Logging unavailable');
    });

    expect(() => {
      logStartupRuntimeIdentity({
        clock: options.clock,
        locationSearch: options.locationSearch,
        hostname: options.hostname,
        origin: options.origin,
        version: options.version,
        assetVersion: options.assetVersion,
        isDesktopApp,
        hasDesktopLogPersistence: false,
        logger: {info: failingOutput},
        consoleOutput: {info: failingOutput},
      });
    }).not.toThrow();
    expect(failingOutput).toHaveBeenCalledTimes(1);
  });

  it.each([
    ['wire-webapp-edge.wire.com', 'edge'],
    ['wire-webapp-beta.wire.com', 'beta'],
    ['app.wire.com', 'production'],
    ['localhost', 'unknown'],
    ['custom.example.com', 'unknown'],
    ['wire-webapp-dev.zinfra.io', 'unknown'],
    ['wire-webapp-staging.wire.com', 'unknown'],
    ['wire-webapp-edge.wire.com.example.com', 'unknown'],
    ['custom.app.wire.com', 'unknown'],
    ['', 'unknown'],
  ])('classifies the exact hostname %s as %s', (hostname, expectedStage) => {
    expect(getDeploymentStage(hostname)).toBe(expectedStage);
  });

  it.each([
    ['wire-webapp-edge.wire.com', 'edge'],
    ['wire-webapp-beta.wire.com', 'beta'],
    ['app.wire.com', 'production'],
    ['custom.example.com', 'unknown'],
  ])('emits INFO attributes through Pino for %s with unchanged build values', (hostname, deploymentStage) => {
    const persistenceOutput = jest.fn<ReturnType<LogOutput>, Parameters<LogOutput>>();
    const logging = createPinoLogging(Maybe.nothing());
    const logger = logging.getLogger('RuntimeIdentity');
    logging.configure(
      Maybe.just({
        clock: createDeterministicClock({initialUnixEpochMicroseconds: 1_000_000n}),
        output: noop,
        namespaces: Maybe.nothing<string>(),
        persistenceOutput: Maybe.just(persistenceOutput),
      }),
    );

    logRuntimeIdentity({
      logger,
      hostname,
      origin: `https://${hostname}`,
      version: '1.2.3',
      assetVersion: '1.2.3-0123456789abcdef',
    });

    expect(persistenceOutput).toHaveBeenCalledTimes(1);
    expect(persistenceOutput).toHaveBeenCalledWith(expect.any(String), 'info');
    const actualRecord: unknown = JSON.parse(persistenceOutput.mock.calls.at(0)?.[0] ?? '{}');
    const expectedRecord = {
      level: 30,
      time: 1000,
      component: 'RuntimeIdentity',
      deploymentStage,
      version: '1.2.3',
      assetVersion: '1.2.3-0123456789abcdef',
      origin: `https://${hostname}`,
      msg: 'WebApp runtime identity',
    };
    expect(actualRecord).toEqual(expectedRecord);
  });
});
