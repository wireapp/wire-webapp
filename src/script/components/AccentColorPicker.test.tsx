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

import AccentColorPicker, {AccentColorPickerProps} from './AccentColorPicker';
import TestPage from 'Util/test/TestPage';
import {User} from '../entity/User';

class AccentColorPickerPage extends TestPage<AccentColorPickerProps> {
  constructor(props?: AccentColorPickerProps) {
    super(AccentColorPicker, props);
  }

  getAccentColors = () => this.get('input[data-uie-name="do-set-accent-color"]');
  getAccentColorInput = (accentColorId: number) =>
    this.get(`input[data-uie-name="do-set-accent-color"][data-uie-value=${accentColorId}]`);
}

describe('AccentColorPicker', () => {
  it('selects users current accent color', async () => {
    const selectedAccentColorId = 2;
    const colorPicker = new AccentColorPickerPage({
      doSetAccentColor: () => {},
      user: {
        accent_id: () => selectedAccentColorId,
      } as User,
    });

    expect(colorPicker.getAccentColorInput(selectedAccentColorId).exists()).toBe(true);
    expect(colorPicker.getAccentColorInput(selectedAccentColorId).props().defaultChecked).toBe(true);
  });
});
