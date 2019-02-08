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

import {instantiateComponent} from '../../api/knockoutHelpers';

import 'src/script/components/icons';
import 'src/script/components/panel/extendedAction';

const contextualMenuSelector = '.panel__action-item__context';
const mainActionLabelSelector = '.panel__action-item__text';

describe('participant-avatar', () => {
  it('displays a single action and no extra menu', () => {
    const params = {
      items: [{click: () => {}, icon: 'edit-icon', label: 'test', uie: 'test'}],
    };

    spyOn(params.items[0], 'click');
    return instantiateComponent('extended-action', params, 'participant: user').then(domContainer => {
      const mainActionLabel = domContainer.querySelector(mainActionLabelSelector);
      const mainAction = domContainer.querySelector('[data-uie-name=test]');
      const contextualMenu = domContainer.querySelector(contextualMenuSelector);

      expect(mainActionLabel.innerText).toBe(params.items[0].label);
      expect(mainAction).not.toBe(null);
      expect(contextualMenu).toBe(null);

      mainAction.click();

      expect(params.items[0].click).toHaveBeenCalled();
    });
  });

  it('displays an extra menu when there are more than one action', () => {
    const params = {
      items: [
        {click: () => {}, icon: 'copy-icon', label: 'main', uie: 'main'},
        {click: () => {}, icon: 'pickup-icon', label: 'secondary', uie: 'secondary'},
      ],
    };

    spyOn(params.items[1], 'click');

    return instantiateComponent('extended-action', params, 'participant: user').then(domContainer => {
      const contextualMenu = domContainer.querySelector(contextualMenuSelector);

      expect(contextualMenu).not.toBe(null);

      // open the contextual menu
      contextualMenu.click();
      // click on the secondary item
      const secondaryActionButton = domContainer.querySelector('[data-uie-name=secondary]');

      expect(secondaryActionButton).not.toBe(null);
      secondaryActionButton.click();

      expect(params.items[1].click).toHaveBeenCalled();
    });
  });
});
