/*
 * Wire
 * Copyright (C) 2020 Wire Swiss GmbH
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
import ButtonGroup, {ButtonGroupProps} from './ButtonGroup';

class ButtonGroupPage extends TestPage<ButtonGroupProps> {
  constructor(props?: ButtonGroupProps) {
    super(ButtonGroup, props);
  }

  getWrapper = () => this.get('div[data-uie-name="button-group-wrapper"]');
  getButtons = () => this.get('div[data-uie-name="button-group-item"]');
  getActiveButton = () => this.get('div[data-uie-value="active"]');
  getInactiveButton = () => this.get('div[data-uie-value="inactive"]');

  clickOnInactiveButton = () => this.click(this.getInactiveButton());
  clickOnActiveButton = () => this.click(this.getActiveButton());
}

describe('ButtonGroup', () => {
  it('renders buttons', async () => {
    const buttonGroup = new ButtonGroupPage({
      currentItem: 'all',
      items: ['all', 'active'],
      onChangeItem: () => {},
    });

    expect(buttonGroup.getWrapper().children().length).toBe(2);
  });

  it('changes active button on click', async () => {
    const props = {
      currentItem: 'all',
      items: ['all', 'active'],
      onChangeItem: (currentItem: string) => {
        buttonGroup.setProps({...props, currentItem});
      },
    };

    const buttonGroup = new ButtonGroupPage(props);

    expect(buttonGroup.getWrapper().children().length).toBe(2);
    expect(buttonGroup.getActiveButton().text()).toBe('all');

    buttonGroup.clickOnInactiveButton();
    expect(buttonGroup.getActiveButton().text()).toBe('active');
  });

  it('triggers onChangeItem only on inactive buttons', () => {
    const onChangeSpy = jasmine.createSpy();
    const props = {
      currentItem: 'one',
      items: ['one', 'two'],
      onChangeItem: onChangeSpy,
    };
    const buttonGroup = new ButtonGroupPage(props);

    buttonGroup.clickOnInactiveButton();

    expect(onChangeSpy).toHaveBeenCalled();

    onChangeSpy.calls.reset();
    buttonGroup.clickOnActiveButton();

    expect(onChangeSpy).not.toHaveBeenCalled();
  });
});
