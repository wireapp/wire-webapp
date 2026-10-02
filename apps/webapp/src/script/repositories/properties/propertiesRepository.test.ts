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

import {User} from 'Repositories/entity/User';
import type {SelfService} from 'Repositories/self/SelfService';
import type {APIClient} from 'src/script/service/apiClientSingleton';
import {translateForTest} from 'Util/test/translateForTest';

import {PropertiesRepository} from './propertiesRepository';
import {PropertiesService} from './propertiesService';

function createPropertiesRepository(webappProperty: unknown): PropertiesRepository {
  const apiClient = {
    api: {
      user: {
        async getProperty<T>(key: string): Promise<T> {
          return (key === 'webapp' ? webappProperty : 0) as T;
        },
      },
    },
  } as APIClient;

  return new PropertiesRepository(new PropertiesService(apiClient), {} as SelfService, translateForTest);
}

function withPrototypePollutionCleanup<TestCase>(
  testBehavior: (testCase: TestCase) => Promise<void>,
): (testCase: TestCase) => Promise<void> {
  return async testCase => {
    try {
      await testBehavior(testCase);
    } finally {
      delete (Object.prototype as Record<string, unknown>).prototypePollutionTestValue;
    }
  };
}

describe('PropertiesRepository persisted webapp settings', function () {
  it('merges partial legacy settings and preserves defaults', async function () {
    const propertiesRepository = createPropertiesRepository({settings: {interface: {theme: 'dark'}}});
    const currentProperties = propertiesRepository.properties;
    const originalProperties = structuredClone(currentProperties);
    const expectedProperties = structuredClone(currentProperties);
    expectedProperties.settings.interface.theme = 'dark';

    await propertiesRepository.init(new User('self-user', '', translateForTest));

    expect(propertiesRepository.properties).not.toBe(currentProperties);
    expect(propertiesRepository.properties).toEqual(expectedProperties);
    expect(currentProperties).toEqual(originalProperties);
  });

  it.each(['__proto__', 'constructor', 'prototype'])(
    'ignores a JSON-parsed top-level %s key',
    withPrototypePollutionCleanup(async function (forbiddenKey: string) {
      const maliciousProperties = JSON.parse(`{"${forbiddenKey}":{"prototypePollutionTestValue":"polluted"}}`);
      const propertiesRepository = createPropertiesRepository(maliciousProperties);
      const expectedProperties = structuredClone(propertiesRepository.properties);

      await propertiesRepository.init(new User('self-user', '', translateForTest));

      expect(({} as Record<string, unknown>).prototypePollutionTestValue).toBeUndefined();
      expect(propertiesRepository.properties).toEqual(expectedProperties);
      expect(Object.hasOwn(propertiesRepository.properties, forbiddenKey)).toBe(false);
      expect(Object.getPrototypeOf(propertiesRepository.properties)).toBe(Object.prototype);
    }),
  );

  it.each(['__proto__', 'constructor', 'prototype'])(
    'ignores a nested %s key and merges safe settings',
    withPrototypePollutionCleanup(async function (forbiddenKey: string) {
      const maliciousProperties = JSON.parse(
        `{"settings":{"interface":{"theme":"dark"},"privacy":{"${forbiddenKey}":{"prototypePollutionTestValue":"polluted"},"marketing_consent":false}}}`,
      );
      const propertiesRepository = createPropertiesRepository(maliciousProperties);
      const expectedProperties = structuredClone(propertiesRepository.properties);
      expectedProperties.settings.interface.theme = 'dark';
      expectedProperties.settings.privacy.marketing_consent = false;

      await propertiesRepository.init(new User('self-user', '', translateForTest));

      expect(({} as Record<string, unknown>).prototypePollutionTestValue).toBeUndefined();
      expect(propertiesRepository.properties).toEqual(expectedProperties);
      expect(Object.hasOwn(propertiesRepository.properties.settings.privacy, forbiddenKey)).toBe(false);
    }),
  );

  it.each([null, false, 1, 'legacy', []])(
    'preserves defaults for a non-object webapp property (%s)',
    async function (webappProperty) {
      const propertiesRepository = createPropertiesRepository(webappProperty);
      const currentProperties = propertiesRepository.properties;
      const expectedProperties = structuredClone(currentProperties);

      await propertiesRepository.init(new User('self-user', '', translateForTest));

      expect(propertiesRepository.properties).toBe(currentProperties);
      expect(propertiesRepository.properties).toEqual(expectedProperties);
    },
  );
});
