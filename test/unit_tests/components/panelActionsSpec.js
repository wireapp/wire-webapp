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

import {instantiateComponent} from '../../helper/knockoutHelpers';

import 'src/script/components/icons';
import 'src/script/components/panel/panelActions';

const mainActionLabelSelector = '.panel__action-item__text';

describe('panel-actions', () => {
  it('displays a single action', () => {
    const params = {
      items: ko.observable([{click: () => {}, icon: 'edit-icon', identifier: 'test', label: 'test'}]),
    };

    spyOn(params.items()[0], 'click');
    return instantiateComponent('panel-actions', params).then(domContainer => {
      const mainActionLabel = domContainer.querySelector(mainActionLabelSelector);
      const mainAction = domContainer.querySelector('[data-uie-name=test]');

      expect(mainActionLabel.innerText).toBe(params.items()[0].label);
      expect(mainAction).not.toBe(null);

      mainAction.click();

      expect(params.items()[0].click).toHaveBeenCalled();
    });
  });

  it('displays more than one action', () => {
    const params = {
      items: ko.observable([
        {click: () => {}, icon: 'copy-icon', identifier: 'main', label: 'mainlabel'},
        {click: () => {}, icon: 'pickup-icon', identifier: 'secondary', label: 'secondarylabel'},
      ]),
    };

    return instantiateComponent('panel-actions', params).then(domContainer => {
      const mainActionLabel = domContainer.querySelector(`[data-uie-name=main] ${mainActionLabelSelector}`);
      const mainAction = domContainer.querySelector('[data-uie-name=main]');
      const secondaryAction = domContainer.querySelector('[data-uie-name=secondary]');

      expect(mainActionLabel.innerText).toBe(params.items()[0].label);
      expect(mainAction).not.toBe(null);
      expect(secondaryAction).not.toBe(null);
    });
  });
});
