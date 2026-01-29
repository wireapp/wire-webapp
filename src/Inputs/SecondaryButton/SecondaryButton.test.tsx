/*
 * Wire
 * Copyright (C) 2024 Wire Swiss GmbH
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

import {fireEvent, render, screen} from '@testing-library/react';

import {SecondaryButton} from './SecondaryButton';

describe('"SecondaryButton"', () => {
  it('fires onClick when clicked', () => {
    const onClick = jest.fn();

    render(
      <SecondaryButton onClick={onClick} fullWidth={false}>
        Label
      </SecondaryButton>,
    );

    fireEvent.click(screen.getByRole('button', {name: 'Label'}));

    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('does not fire onClick when disabled', () => {
    const onClick = jest.fn();

    render(
      <SecondaryButton onClick={onClick} fullWidth={false} disabled>
        Label
      </SecondaryButton>,
    );

    const button = screen.getByRole('button', {name: 'Label'}) as HTMLButtonElement;

    expect(button.disabled).toBe(true);
    fireEvent.click(button);
    expect(onClick).not.toHaveBeenCalled();
  });

  it('sets data-uie-name when provided', () => {
    render(
      <SecondaryButton onClick={() => {}} fullWidth={false} uieName="secondary">
        Label
      </SecondaryButton>,
    );

    const button = screen.getByRole('button', {name: 'Label'});

    expect(button.getAttribute('data-uie-name')).toBe('secondary');
  });
});
