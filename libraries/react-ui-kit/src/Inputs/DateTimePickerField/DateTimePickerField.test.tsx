/*
 * Wire
 * Copyright (C) 2026 Wire Swiss GmbH
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

/* eslint-disable jest/expect-expect */

import {DateTimePickerField} from './DateTimePickerField';

const fixedDateTime = new Date(2026, 5, 15, 15, 0, 0, 0);

import {matchComponent} from '../../utils/testUtil';
import React from 'react';

const defaultLabels = {
  dateAriaLabel: 'Select date',
  timeAriaLabel: 'Select time',
  openCalendarLabel: 'Open calendar',
  previousMonthLabel: 'Previous month',
  nextMonthLabel: 'Next month',
};

const defaultProps: React.ComponentProps<typeof DateTimePickerField> = {
  dataUieName: 'datetime-picker-test',
  labels: defaultLabels,
  value: fixedDateTime,
  onChange: () => undefined,
};

describe('"DateTimePickerField"', () => {
  it('renders', () => matchComponent(<DateTimePickerField {...defaultProps} />));
  it('renders with label', () => matchComponent(<DateTimePickerField {...defaultProps} label="Starts at" />));
  it('renders as invalid', () =>
    matchComponent(
      <DateTimePickerField {...defaultProps} markInvalid errorText="Please select a future date and time." />,
    ));
  it('renders as disabled', () => matchComponent(<DateTimePickerField {...defaultProps} disabled />));
});
