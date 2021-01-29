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

import InfoToggle, {InfoToggleProps} from './InfoToggle';

class InfoTogglePage extends TestPage<InfoToggleProps> {
  constructor(props?: InfoToggleProps) {
    super(InfoToggle, props);
  }

  getInput = () => this.get('input[data-uie-name="info-toggle-input"]');
  getInfo = (dataUieName: string) => this.get(`div[data-uie-name="status-info-toggle-${dataUieName}"]`);

  changeInputValue = (value: boolean) => this.changeCheckboxValue(this.getInput(), value);
}

describe('InfoToggle', () => {
  it('toggles check property', async () => {
    const dataUieName = 'example';
    let isChecked = false;
    const props = {
      dataUieName,
      info: 'example',
      isChecked,
      isDisabled: false,
      name: 'example',
      setIsChecked: (updatedIsChecked: boolean) => {
        isChecked = updatedIsChecked;
      },
    };

    const infoToggle = new InfoTogglePage(props);
    expect(infoToggle.getInfo(dataUieName).text()).toBe('example');
    infoToggle.changeInputValue(!isChecked);
    expect(isChecked).toBe(true);
  });
});
