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

import {TimePickerField} from './TimePickerField';
import {buildTimeOptions} from './timePickerUtils';

import {matchComponent} from '../../utils/testUtil';
import React from 'react';

const timeOptions = buildTimeOptions();

const defaultProps: React.ComponentProps<typeof TimePickerField> = {
  id: 'time-picker-test',
  dataUieName: 'time-picker-test',
  ariaLabel: 'Select time',
  value: timeOptions[0],
  onChange: () => undefined,
};

describe('"TimePickerField"', () => {
  it('renders', () => matchComponent(<TimePickerField {...defaultProps} />));
  it('renders with label', () => matchComponent(<TimePickerField {...defaultProps} label="Time" />));
  it('renders as invalid', () => matchComponent(<TimePickerField {...defaultProps} markInvalid />));
  it('renders as disabled', () => matchComponent(<TimePickerField {...defaultProps} disabled />));
});
