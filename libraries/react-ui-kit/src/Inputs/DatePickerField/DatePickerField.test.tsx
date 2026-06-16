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

import {parseDate} from '@internationalized/date';

import {DatePickerField} from './DatePickerField';

import {matchComponent} from '../../utils/testUtil';
import React from 'react';

const fixedDate = parseDate('2026-06-15');

const defaultLabels = {
  openCalendarLabel: 'Open calendar',
  previousMonthLabel: 'Previous month',
  nextMonthLabel: 'Next month',
};

const defaultProps: React.ComponentProps<typeof DatePickerField> = {
  dataUieName: 'date-picker-test',
  id: 'date-picker-test',
  labels: defaultLabels,
  ariaLabel: 'Select date',
  value: fixedDate,
  onChange: () => undefined,
};

describe('"DatePickerField"', () => {
  it('renders', () => matchComponent(<DatePickerField {...defaultProps} />));
  it('renders with label', () => matchComponent(<DatePickerField {...defaultProps} label="Date" />));
  it('renders as invalid', () => matchComponent(<DatePickerField {...defaultProps} markInvalid />));
  it('renders as disabled', () => matchComponent(<DatePickerField {...defaultProps} disabled />));
});
