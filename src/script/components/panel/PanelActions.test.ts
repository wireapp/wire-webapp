/*
 * Wire
 * Copyright (C) 2021 Wire Swiss GmbH
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

import TestPage from 'Util/test/TestPage';

import PanelActions, {MenuItem, PanelActionsProps} from './PanelActions';

class PanelActionsPage extends TestPage<PanelActionsProps> {
  constructor(props?: PanelActionsProps) {
    super(PanelActions, props);
  }

  getMainAction = (identifier: string) => this.get(`div[data-uie-name="${identifier}"]`);
  getMainActionLabel = (identifier: string) => this.get(`div[data-uie-name="${identifier}-item-text"]`);
  clickMainAction = (identifier: string) => this.click(this.getMainAction(identifier));
}

describe('PanelActions', () => {
  it('displays a single action', () => {
    const items: MenuItem[] = [{click: () => {}, icon: 'edit-icon', identifier: 'testIdentifier', label: 'testLabel'}];
    const itemSpy = jest.spyOn(items[0], 'click');

    const panelAction = new PanelActionsPage({items});

    const mainActionLabel = panelAction.getMainActionLabel(items[0].identifier);
    const mainAction = panelAction.getMainAction(items[0].identifier);

    expect(mainActionLabel.text()).toBe(items[0].label);
    expect(mainAction.exists()).toBe(true);

    panelAction.clickMainAction(items[0].identifier);

    expect(itemSpy).toHaveBeenCalled();
  });

  it('displays more than one action', () => {
    const items: MenuItem[] = [
      {click: () => {}, icon: 'copy-icon', identifier: 'mainIdentifier', label: 'mainLabel'},
      {click: () => {}, icon: 'pickup-icon', identifier: 'secondaryIdentifier', label: 'secondaryLabel'},
    ];

    const panelAction = new PanelActionsPage({items});

    const mainActionLabel = panelAction.getMainActionLabel(items[0].identifier);
    const mainAction = panelAction.getMainAction(items[0].identifier);
    const secondaryAction = panelAction.getMainAction(items[1].identifier);

    expect(mainActionLabel.text()).toBe(items[0].label);
    expect(mainAction.exists()).toBe(true);
    expect(secondaryAction.exists()).toBe(true);
  });
});
