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

import {useCallback, useMemo} from 'react';

import {DateValue} from '@internationalized/date';
import is from '@sindresorhus/is';

import {
  dateTimePickerContentStyles,
  dateTimePickerErrorTextStyles,
  dateTimePickerFieldWrapperStyles,
  dateTimePickerFieldsRowStyles,
} from './DateTimePickerField.styles';
import {combineDateAndTime, dateValueFromDate} from './dateTimeUtils';

import {BASE_DARK_COLOR, BASE_LIGHT_COLOR} from '../../Identity';
import {DatePickerField, DatePickerFieldLabels} from '../DatePickerField';
import {InputLabel} from '../InputLabel';
import {Option} from '../Select';
import {TimePickerField} from '../TimePickerField';
import {nearestTimeOptionFromDate} from '../TimePickerField/timePickerUtils';

export interface DateTimePickerFieldLabels extends DatePickerFieldLabels {
  dateAriaLabel: string;
  timeAriaLabel: string;
}

export interface DateTimePickerFieldProps {
  /** Controlled combined date-time value exposed as a native `Date`. */
  value: Date | null;
  onChange: (value: Date | null) => void;
  dataUieName: string;
  dateFieldId?: string;
  timeFieldId?: string;
  label?: string;
  labels: DateTimePickerFieldLabels;
  locale?: string;
  markInvalid?: boolean;
  disabled?: boolean;
  menuPortalTarget?: HTMLElement;
  popoverPortalContainer?: HTMLElement;
  errorText?: string;
}

export const DateTimePickerField = ({
  value,
  onChange,
  dataUieName,
  dateFieldId = `${dataUieName}-date`,
  timeFieldId = `${dataUieName}-time`,
  label,
  labels,
  locale = 'de-DE',
  markInvalid = false,
  disabled = false,
  menuPortalTarget,
  popoverPortalContainer,
  errorText,
}: DateTimePickerFieldProps) => {
  const labelId = `${dataUieName}-label`;
  const selectedDate = useMemo(() => (value ? dateValueFromDate(value) : null), [value]);
  const selectedTime = useMemo(() => (value ? nearestTimeOptionFromDate(value) : null), [value]);

  const handleDateChange = useCallback(
    (nextDate: DateValue | null) => {
      onChange(combineDateAndTime(nextDate, selectedTime));
    },
    [onChange, selectedTime],
  );

  const handleTimeChange = useCallback(
    (nextTime: Option | null) => {
      onChange(combineDateAndTime(selectedDate, nextTime));
    },
    [onChange, selectedDate],
  );

  const labelStyles = markInvalid
    ? {
        color: BASE_LIGHT_COLOR.RED,
        'body.theme-dark &': {
          color: BASE_DARK_COLOR.RED,
        },
      }
    : undefined;

  return (
    <div css={dateTimePickerContentStyles} data-uie-name={dataUieName}>
      {is.nonEmptyString(label) && (
        <InputLabel markInvalid={markInvalid} id={labelId} labelCSS={labelStyles}>
          {label}
        </InputLabel>
      )}

      <div
        css={dateTimePickerFieldsRowStyles}
        role="group"
        aria-labelledby={is.nonEmptyString(label) ? labelId : undefined}
      >
        <DatePickerField
          id={dateFieldId}
          dataUieName={`${dataUieName}-date`}
          value={selectedDate}
          onChange={handleDateChange}
          ariaLabel={labels.dateAriaLabel}
          labels={labels}
          locale={locale}
          markInvalid={markInvalid}
          disabled={disabled}
          popoverPortalContainer={popoverPortalContainer}
          wrapperCSS={dateTimePickerFieldWrapperStyles}
        />
        <TimePickerField
          id={timeFieldId}
          dataUieName={`${dataUieName}-time`}
          value={selectedTime}
          onChange={handleTimeChange}
          ariaLabel={labels.timeAriaLabel}
          markInvalid={markInvalid}
          disabled={disabled}
          menuPortalTarget={menuPortalTarget}
          wrapperCSS={dateTimePickerFieldWrapperStyles}
        />
      </div>

      {markInvalid && is.nonEmptyString(errorText) && <p css={dateTimePickerErrorTextStyles}>{errorText}</p>}
    </div>
  );
};
