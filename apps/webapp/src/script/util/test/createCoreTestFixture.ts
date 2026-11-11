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

import type {Core} from '../../service/coreSingleton';

type CoreServices = NonNullable<Core['service']>;

export type CoreTestDependencies = Omit<Partial<Core>, 'service' | 'backendFeatures' | 'recurringTaskScheduler'> & {
  readonly backendFeatures?: Partial<Core['backendFeatures']>;
  readonly recurringTaskScheduler?: Partial<Core['recurringTaskScheduler']>;
  readonly service?: {
    readonly [ServiceName in keyof CoreServices]?: Partial<NonNullable<CoreServices[ServiceName]>>;
  };
};

export function createCoreTestFixture<Dependencies extends CoreTestDependencies>(
  options: Dependencies,
): Core & Dependencies {
  // Existing constructors require the nominal Core class, including private Account state.
  // This test boundary supplies only explicitly requested public dependencies, without constructing Account.
  const fixture = {};
  Object.defineProperties(fixture, Object.getOwnPropertyDescriptors(options));

  return fixture as Core & Dependencies;
}
