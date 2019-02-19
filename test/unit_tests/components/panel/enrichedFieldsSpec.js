/*
 * Wire
 * Copyright (C) 2019 Wire Swiss GmbH
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

import {instantiateComponent} from '../../../api/knockoutHelpers';

import 'src/script/components/panel/enrichedFields';

const entriesListSelector = '.enriched-fields__entry';

describe('enriched-fields', () => {
  it('displays all the given fields', () => {
    const params = {
      participant: () => ({extendedFields: () => ({field1: 'value1', field2: 'value2'})}),
    };

    return instantiateComponent('enriched-fields', params).then(domContainer => {
      const fields = domContainer.querySelectorAll(entriesListSelector);

      expect(fields.length).toBe(2);
    });
  });

  it('updates live if the fields are updated', () => {
    const extendedFields = ko.observable({field1: 'value1', field2: 'value2'});
    const params = {
      participant: () => ({extendedFields}),
    };

    return instantiateComponent('enriched-fields', params).then(domContainer => {
      expect(domContainer.querySelectorAll(entriesListSelector).length).toBe(2);

      extendedFields({field1: 'value1', field2: 'value2', field3: 'value3'});

      expect(domContainer.querySelectorAll(entriesListSelector).length).toBe(3);
    });
  });
});
