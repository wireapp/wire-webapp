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

import {PropertiesRepository} from 'Repositories/properties/propertiesrepository';
import {PropertiesService} from 'Repositories/properties/propertiesservice';
import {SelfService} from 'Repositories/self/selfservice';
import {PrimaryModal} from 'Components/modals/primarymodal';
import {translate} from 'Util/localizerUtil';

describe('PropertiesRepository', () => {
  let propertiesRepository = undefined;

  beforeEach(() => {
    const propertiesService = new PropertiesService();
    const selfService = new SelfService();
    propertiesRepository = new PropertiesRepository(propertiesService, selfService, translate);
  });

  describe('deleteProperty', () => {
    it('resets a known property to its default value', () => {
      const property = PropertiesRepository.CONFIG.WIRE_RECEIPT_MODE;
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

  describe('checkTelemetrySharingPermission', () => {
    it('uses the injected translate function for modal copy', () => {
      const propertiesService = new PropertiesService();
      const selfService = new SelfService();
      const translate = jest.fn(translationKey => `translated:${translationKey}`);

      propertiesRepository = new PropertiesRepository(propertiesService, selfService, translate);

      const showModal = jest.spyOn(PrimaryModal, 'show').mockImplementation(() => {});

      propertiesRepository.checkTelemetrySharingPermission();

      expect(showModal).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          primaryAction: expect.objectContaining({text: 'translated:dataSharingModalAgree'}),
          secondaryAction: expect.objectContaining({text: 'translated:dataSharingModalDecline'}),
          text: expect.objectContaining({
            closeBtnLabel: 'translated:dataSharingModalCloseBtnTitle',
            title: 'translated:dataSharingModalTitle',
          }),
        }),
      );
    });
  });
});
