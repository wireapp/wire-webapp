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

import {instantiateComponent} from '../../../helper/knockoutHelpers';
import UUID from 'uuidjs';
import {resolve, graph} from '../../../api/testResolver';

import 'src/script/components/panel/enrichedFields';

const entriesListSelector = '.enriched-fields__entry';

describe('enriched-fields', () => {
  it('displays all the given fields', () => {
    const richProfileRepository = resolve(graph.RichProfileRepository);
    const userId = UUID.genV4().hexString;
    const params = {user: () => ({email: () => {}, id: userId})};

    spyOn(richProfileRepository, 'getUserRichProfile').and.returnValue(
      Promise.resolve({fields: [{type: 'field1', value: 'value1'}, {type: 'field2', value: 'value2'}]}),
    );

    return instantiateComponent('enriched-fields', params).then(domContainer => {
      expect(domContainer.querySelectorAll(entriesListSelector).length).toBe(2);
    });
  });

  it('displays the email if set on user', () => {
    const richProfileRepository = resolve(graph.RichProfileRepository);
    const userId = UUID.genV4().hexString;
    const params = {user: () => ({email: () => 'user@inter.net', id: userId})};

    spyOn(richProfileRepository, 'getUserRichProfile').and.returnValue(
      Promise.resolve({fields: [{type: 'field1', value: 'value1'}, {type: 'field2', value: 'value2'}]}),
    );

    return instantiateComponent('enriched-fields', params).then(domContainer => {
      expect(domContainer.querySelectorAll(entriesListSelector).length).toBe(3);
    });
  });

  it('calls the `onFieldsLoaded` function when fields are loaded', () => {
    const richProfileRepository = resolve(graph.RichProfileRepository);
    const userId = UUID.genV4().hexString;
    const params = {onFieldsLoaded: () => {}, user: () => ({email: () => {}, id: userId})};
    const richProfile = {fields: [{type: 'field1', value: 'value1'}, {type: 'field2', value: 'value2'}]};
    spyOn(richProfileRepository, 'getUserRichProfile').and.returnValue(Promise.resolve(richProfile));
    spyOn(params, 'onFieldsLoaded');

    return instantiateComponent('enriched-fields', params).then(() => {
      expect(params.onFieldsLoaded).toHaveBeenCalledWith(richProfile.fields);
    });
  });
});
