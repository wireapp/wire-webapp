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
import type {LogOutput} from './logOutput';
import {getDeploymentStage, logRuntimeIdentity} from './logRuntimeIdentity';

describe('runtime identity', () => {
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
