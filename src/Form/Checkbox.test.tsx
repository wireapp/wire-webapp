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

import '@testing-library/jest-dom/jest-globals';
import {fireEvent, render} from '@testing-library/react';

import {Checkbox, CheckboxLabel} from './Checkbox';

import {StyledApp} from '../../src/Layout/StyledApp';
import {THEME_ID} from '../Layout';
import {matchComponent} from '../test/testUtil';

/* eslint-disable jest/expect-expect */

describe('"Checkbox"', () => {
  it('renders', () => matchComponent(<Checkbox id="1">Check</Checkbox>));
  it('renders (dark theme)', () => matchComponent(<Checkbox id="1">Checkbox</Checkbox>, THEME_ID.DARK));
  it('renders as invalid', () =>
    matchComponent(
      <Checkbox id="1" markInvalid>
        Check
      </Checkbox>,
    ));
  it('renders disabled', () =>
    matchComponent(
      <Checkbox id="1" disabled>
        Check
      </Checkbox>,
    ));
});

describe('"CheckboxLabel"', () => {
  it('renders', () => matchComponent(<CheckboxLabel>Label</CheckboxLabel>));
});

//TODO: - create custom render for UI-Kit with a styledapp wrapper(SQSERVICES-1672)
test('account creation terms and condition checkbox is checked/unchecked', () => {
  const {getByTestId} = render(
    <StyledApp themeId={THEME_ID.LIGHT}>
      <Checkbox id="1" data-testid="do-terms"></Checkbox>
    </StyledApp>,
  );
  const checkbox = getByTestId('do-terms');
  expect(checkbox).not.toBeChecked();
  fireEvent.click(checkbox);
  expect(checkbox).toBeChecked();
});
