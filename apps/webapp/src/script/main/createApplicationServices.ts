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

import type {Clock} from '@enormora/clock/clock';
import type {FireAndForgetInvoker} from '@enormora/fire-and-forget';

import type {ApplicationObservability} from '../observability/applicationObservability';
export type ApplicationServices = {
  readonly applicationObservability: ApplicationObservability;
  readonly clock: Clock;
  readonly fireAndForgetInvoker: FireAndForgetInvoker;
};

type CreateApplicationServicesDependencies = {
  readonly createApplicationObservability: () => ApplicationObservability;
  readonly clock: Clock;
  readonly createFireAndForgetInvoker: () => FireAndForgetInvoker;
};

export function createApplicationServices(dependencies: CreateApplicationServicesDependencies): ApplicationServices {
  const {createApplicationObservability, clock, createFireAndForgetInvoker} = dependencies;

  return {
    applicationObservability: createApplicationObservability(),
    clock,
    fireAndForgetInvoker: createFireAndForgetInvoker(),
  };
}
