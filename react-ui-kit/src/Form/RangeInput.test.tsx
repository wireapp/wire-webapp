/*
 * Wire
 * Copyright (C) 2022 Wire Swiss GmbH
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

import {matchers} from '@emotion/jest';
import {fireEvent, render} from '@testing-library/react';

import {RangeInput, RangeInputProps} from './RangeInput';

import {StyledApp, THEME_ID} from '../Layout';
import {matchComponent} from '../test/testUtil';

expect.extend(matchers);

const getDefaultProps = () => ({
  id: 'zoom-input',
  label: 'Zoom',
  minValueLabel: '-',
  maxValueLabel: '+',
  onChange: jest.fn(),
  value: 0,
  min: 1,
  max: 3,
  step: 0.1,
});

const ThemedRangeInput = (props: RangeInputProps) => (
  <StyledApp themeId={THEME_ID.LIGHT}>
    <RangeInput {...props} />
  </StyledApp>
);

/* eslint-disable jest/expect-expect */

describe('"RangeInput"', () => {
  it('matches snapshot', () => matchComponent(<ThemedRangeInput {...getDefaultProps()} />));

  it('renders label', () => {
    const props = getDefaultProps();
    const {getByLabelText} = render(<ThemedRangeInput {...props} />);
    expect(getByLabelText(props.label)).toBeDefined();
  });

  it('renders min and max value labels', () => {
    const props = getDefaultProps();
    const {getByText} = render(<ThemedRangeInput {...props} />);
    expect(getByText(props.minValueLabel)).toBeDefined();
    expect(getByText(props.maxValueLabel)).toBeDefined();
  });

  it('fires onChange callback', () => {
    const props = getDefaultProps();
    const {getByRole} = render(<ThemedRangeInput {...props} />);

    const rangeInput = getByRole('slider');
    fireEvent.change(rangeInput, {value: 2});

    expect(props.onChange).toHaveBeenCalled();
  });

  it("updates slider's background-size prop based on value", () => {
    const {getByRole, rerender} = render(<ThemedRangeInput {...getDefaultProps()} value={1} />);
    const rangeInput = getByRole('slider');

    expect(rangeInput).toHaveStyleRule('background-size', '0% 100%');

    rerender(<ThemedRangeInput {...getDefaultProps()} value={2} />);
    expect(rangeInput).toHaveStyleRule('background-size', '50% 100%');

    rerender(<ThemedRangeInput {...getDefaultProps()} value={3} />);
    expect(rangeInput).toHaveStyleRule('background-size', '100% 100%');
  });
});
