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

import {mockStoreFactory} from './mockStoreFactory';

describe('mockStoreFactory dependencies', () => {
  it('creates fresh inert defaults for every store factory', () => {
    const firstStore = mockStoreFactory()();
    const secondStore = mockStoreFactory()();
    const firstDependencies = firstStore.dispatch((_dispatch, _getState, dependencies) => {
      return dependencies;
    });
    const secondDependencies = secondStore.dispatch((_dispatch, _getState, dependencies) => {
      return dependencies;
    });

    expect(firstDependencies.core).not.toBe(secondDependencies.core);
    expect(firstDependencies.apiClient).not.toBe(secondDependencies.apiClient);
    expect(firstDependencies.clock).not.toBe(secondDependencies.clock);
    expect(firstDependencies.core).toEqual({});
    expect(firstDependencies.apiClient).toEqual({});
  });

  it('passes explicit dependencies through without mutating the supplied core', () => {
    const core = {logout: jest.fn()};
    const apiClient = {};
    const store = mockStoreFactory({core, apiClient})();
    const dependencies = store.dispatch((_dispatch, _getState, injectedDependencies) => {
      return injectedDependencies;
    });

    expect(dependencies.core).toBe(core);
    expect(dependencies.apiClient).toBe(apiClient);
    expect(core).not.toHaveProperty('apiClient');
  });
});
