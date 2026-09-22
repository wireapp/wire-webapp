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

import {isUndefined} from '@sindresorhus/is';

import {buildTimeOptions, filterTimeOptionsAfter, getTimeOptionTotalMinutes, parseTimeLabel} from './timePickerUtils';

describe('timePickerUtils', () => {
  it('filters out time options at or before the minimum time', () => {
    const options = buildTimeOptions('en-US');
    const minTime = new Date(2026, 6, 13, 16, 27, 0, 0);

    const filteredOptions = filterTimeOptionsAfter(options, minTime);

    expect(filteredOptions.some(option => option.label === '4:15 PM')).toBe(false);
    expect(filteredOptions.some(option => option.label === '4:30 PM')).toBe(true);
    const firstFilteredOption = filteredOptions[0];
    if (isUndefined(firstFilteredOption)) {
      throw new Error('Expected filtered time options to be non-empty');
    }
    expect(getTimeOptionTotalMinutes(firstFilteredOption)).toBeGreaterThan(16 * 60 + 27);
  });

  it('formats options according to the provided regional locale', () => {
    const options = buildTimeOptions('de-DE');

    expect(options.find(option => option.value === '14:00')).toEqual({value: '14:00', label: '14:00'});
  });

  it('formats a regional locale not supported for application translations', () => {
    const options = buildTimeOptions('en-GB');

    expect(options.find(option => option.value === '14:00')).toEqual({value: '14:00', label: '14:00'});
  });

  it.each([
    {input: '3:00 PM', expected: {hour24: 15, minutes: 0}},
    {input: ' 3:00   PM ', expected: {hour24: 15, minutes: 0}},
    {input: '15:00', expected: {hour24: 15, minutes: 0}},
  ])('parses both legacy and canonical time values: $input', ({input, expected}) => {
    expect(parseTimeLabel(input)).toEqual(expected);
  });
});
