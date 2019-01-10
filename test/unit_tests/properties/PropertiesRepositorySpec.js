/*
 * Wire
 * Copyright (C) 2018 Wire Swiss GmbH
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

import PropertiesRepository from 'src/script/properties/PropertiesRepository';
import PropertiesService from 'src/script/properties/PropertiesService';

describe('PropertiesRepository', () => {
  let propertiesRepository = undefined;

  beforeEach(() => {
    const urls = {
      restUrl: 'http://localhost.com',
      websocket_url: 'wss://localhost',
    };
    const backendClient = new z.service.BackendClient(urls);
    const propertiesService = new PropertiesService(backendClient);
    propertiesRepository = new PropertiesRepository(propertiesService);
  });

  describe('deleteProperty', () => {
    it('resets a known property to its default value', () => {
      const property = PropertiesRepository.CONFIG.ENABLE_READ_RECEIPTS;
      const defaultValue = property.defaultValue;

      propertiesRepository.setProperty(property.key, !defaultValue);

      expect(propertiesRepository.receiptMode()).not.toBe(defaultValue);

      propertiesRepository.deleteProperty(property.key);

      expect(propertiesRepository.receiptMode()).toBe(defaultValue);
    });

    it('ignores unknown properties', () => {
      const key = 'UNKNOWN_TEST_PROPERTY_KEY';

      expect(() => {
        propertiesRepository.deleteProperty(key);
      }).not.toThrow();
    });
  });
});
