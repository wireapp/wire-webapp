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
import {AccentColor} from '@wireapp/commons';

class AccentColorPickerPage extends TestPage<AccentColorPickerProps> {
  constructor(props?: AccentColorPickerProps) {
    super(AccentColorPicker, props);
  }

  getAccentColors = () => this.get('input[data-uie-name="do-set-accent-color"]');
  getAccentColorInput = (accentColorId: number) =>
    this.get(`input[data-uie-name="do-set-accent-color"][data-uie-value=${accentColorId}]`);
  changeAccentColorInput = (accentColorId: number) =>
    this.changeValue(this.getAccentColorInput(accentColorId), {checked: true});
}

describe('AccentColorPicker', () => {
  it('shows expected accent colors', async () => {
    const colorPicker = new AccentColorPickerPage({
      doSetAccentColor: () => {},
      user: {
        accent_id: () => AccentColor.BRIGHT_ORANGE.id,
      } as User,
    });

    expect(colorPicker.getAccentColors().exists()).toBe(true);
    expect(colorPicker.getAccentColors().length).toBe(AccentColor.ACCENT_COLORS.length);
    AccentColor.ACCENT_COLORS.forEach(accentColor =>
      expect(colorPicker.getAccentColorInput(accentColor.id).exists()).toBe(true),
    );
  });

  it('selects users current accent color', async () => {
    const selectedAccentColorId = AccentColor.BRIGHT_ORANGE.id;
    const colorPicker = new AccentColorPickerPage({
      doSetAccentColor: () => {},
      user: {
        accent_id: () => selectedAccentColorId,
      } as User,
    });

    expect(colorPicker.getAccentColorInput(selectedAccentColorId).exists()).toBe(true);
    expect(colorPicker.getAccentColorInput(selectedAccentColorId).props().checked).toBe(true);
  });

  it('updates users accent color on click', async () => {
    const colorPicker = new AccentColorPickerPage({
      doSetAccentColor: jasmine.createSpy(),
      user: {
        accent_id: () => 0,
      } as User,
    });

    AccentColor.ACCENT_COLORS.forEach(accentColor => {
      colorPicker.changeAccentColorInput(accentColor.id);
      expect(colorPicker.getProps().doSetAccentColor).toHaveBeenCalledWith(accentColor.id);
    });
  });

  it('selects color on remote user accent color update', async () => {
    const colorPicker = new AccentColorPickerPage({
      doSetAccentColor: jasmine.createSpy(),
      user: {
        accent_id: () => 0,
      } as User,
    });

    AccentColor.ACCENT_COLORS.forEach(accentColor => {
      colorPicker['driver'].setProps({
        user: {
          accent_id: () => accentColor.id,
        },
      });
      expect(colorPicker.getAccentColorInput(accentColor.id).props().checked).toBe(true);
    });
  });
});
