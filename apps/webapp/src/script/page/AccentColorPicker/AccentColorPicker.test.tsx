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

import {act, render} from '@testing-library/react';
import ko from 'knockout';
import {User} from 'Repositories/entity/User';

import {AccentColor} from '@wireapp/commons';

import {AccentColorPicker, AccentColorPickerProps} from './AccentColorPicker';

describe('AccentColorPicker', () => {
  it('shows expected accent colors', async () => {
    const props: AccentColorPickerProps = {
      doSetAccentColor: () => {},
      user: {
        accent_id: ko.observable(AccentColor.BRIGHT_ORANGE.id),
      } as User,
    };
    const {container} = render(<AccentColorPicker {...props} />);

    expect(container.querySelectorAll('[data-uie-name="do-set-accent-color"]').length).toBe(
      AccentColor.ACCENT_COLORS.length,
    );
  });

  it('selects users current accent color', async () => {
    const selectedAccentColorId = AccentColor.BRIGHT_ORANGE.id;
    const props = {
      doSetAccentColor: () => {},
      user: {
        accent_id: ko.observable(selectedAccentColorId),
      } as User,
    };
    const {container} = render(<AccentColorPicker {...props} />);

    const input: HTMLInputElement = container.querySelector(
      `[data-uie-name="do-set-accent-color"][data-uie-value="${selectedAccentColorId}"]`,
    );
    expect(input).not.toBe(null);
    expect(input.checked).toBe(true);
  });

  it('updates users accent color on click', async () => {
    const props = {
      doSetAccentColor: jasmine.createSpy(),
      user: {
        accent_id: ko.observable(0),
      } as User,
    };
    const {container} = render(<AccentColorPicker {...props} />);

    AccentColor.ACCENT_COLORS.forEach(accentColor => {
      act(() => {
        (
          container.querySelector(
            `[data-uie-name="do-set-accent-color"][data-uie-value="${accentColor.id}"]`,
          ) as HTMLInputElement
        ).click();
      });
      expect(props.doSetAccentColor).toHaveBeenCalledWith(accentColor.id);
    });
  });

  it('selects color on remote user accent color update', async () => {
    const props = {
      doSetAccentColor: jasmine.createSpy(),
      user: {
        accent_id: ko.observable(0),
      } as User,
    };
    const {container} = render(<AccentColorPicker {...props} />);

    AccentColor.ACCENT_COLORS.forEach(accentColor => {
      act(() => {
        props.user.accent_id(accentColor.id);
      });
      const input: HTMLInputElement = container.querySelector(
        `[data-uie-name="do-set-accent-color"][data-uie-value="${accentColor.id}"]`,
      );
      expect(input).not.toBe(null);
      expect(input.checked).toBe(true);
    });
  });
});
