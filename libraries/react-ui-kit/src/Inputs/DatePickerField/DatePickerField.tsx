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

import {useMemo} from 'react';

import {CSSObject} from '@emotion/react';
import {DateValue} from '@internationalized/date';
import is from '@sindresorhus/is';
import {
  Button,
  Calendar,
  CalendarCell,
  CalendarGrid,
  CalendarGridBody,
  CalendarGridHeader,
  CalendarHeaderCell,
  DateInput,
  DatePicker,
  DateSegment,
  Dialog,
  Group,
  Heading,
  I18nProvider,
  Popover,
} from 'react-aria-components';

import {
  calendarButtonStyles,
  calendarCellStyles,
  calendarGridHeaderStyles,
  calendarGridStyles,
  calendarHeaderCellStyles,
  calendarHeaderStyles,
  calendarHeadingStyles,
  calendarIconStyles,
  calendarNavButtonStyles,
  calendarPopoverStyles,
  calendarPopoverZIndex,
  dateInputStyles,
  datePickerGroupDisabledStyles,
  datePickerGroupFocusStyles,
  datePickerGroupInvalidStyles,
  datePickerGroupStyles,
  datePickerWrapperStyles,
  dateSegmentStyles,
} from './DatePickerField.styles';

import {CalendarIcon} from '../../DataDisplay/Icon';
import {Theme} from '../../Identity/Theme';
import {getOverlayPortalContainer} from '../../utils/overlayPortal';
import {InputLabel} from '../InputLabel';

export interface DatePickerFieldLabels {
  openCalendarLabel: string;
  previousMonthLabel: string;
  nextMonthLabel: string;
}

export interface DatePickerFieldProps {
  /** Controlled calendar date value (`DateValue` from `@internationalized/date`). */
  value: DateValue | null;
  onChange: (value: DateValue | null) => void;
  dataUieName: string;
  id?: string;
  label?: string;
  /** Used when no visible label is provided. */
  ariaLabel?: string;
  labels: DatePickerFieldLabels;
  locale?: string;
  markInvalid?: boolean;
  disabled?: boolean;
  /** Portal target for the calendar popover. Defaults to `document.body`. */
  popoverPortalContainer?: HTMLElement;
  popoverPlacement?: 'top' | 'bottom' | 'top start' | 'bottom start';
  minValue?: DateValue;
  maxValue?: DateValue;
  wrapperCSS?: CSSObject;
}

export const DatePickerField = ({
  value,
  onChange,
  dataUieName,
  id,
  label,
  ariaLabel,
  labels,
  locale = 'de-DE',
  markInvalid = false,
  disabled = false,
  popoverPortalContainer,
  popoverPlacement = 'bottom start',
  minValue,
  maxValue,
  wrapperCSS = {},
}: DatePickerFieldProps) => {
  const labelId = is.nonEmptyString(id) ? `${id}-label` : undefined;
  const portalContainer = popoverPortalContainer ?? getOverlayPortalContainer();
  const dateGroupStyles = useMemo(() => {
    const styles = {...datePickerGroupStyles, ...datePickerGroupFocusStyles};

    if (markInvalid) {
      return {...styles, ...datePickerGroupInvalidStyles};
    }

    if (disabled) {
      return {...styles, ...datePickerGroupDisabledStyles};
    }

    return styles;
  }, [disabled, markInvalid]);

  return (
    <div
      css={(theme: Theme) => ({
        marginBottom: markInvalid ? '2px' : '20px',
        ...datePickerWrapperStyles,
        '&:focus-within label': {
          color: theme.general.primaryColor,
        },
        ...wrapperCSS,
      })}
      data-uie-name={dataUieName}
    >
      {is.nonEmptyString(label) && (
        <InputLabel htmlFor={id} markInvalid={markInvalid} id={labelId}>
          {label}
        </InputLabel>
      )}

      <I18nProvider locale={locale}>
        <DatePicker
          id={id}
          aria-label={is.nonEmptyString(label) ? undefined : ariaLabel}
          aria-labelledby={is.nonEmptyString(label) ? labelId : undefined}
          value={value}
          onChange={onChange}
          isDisabled={disabled}
          minValue={minValue}
          maxValue={maxValue}
        >
          <Group css={dateGroupStyles}>
            <DateInput css={dateInputStyles}>
              {segment => (
                <DateSegment segment={segment} css={dateSegmentStyles}>
                  {segment.type === 'literal' ? '.' : segment.text}
                </DateSegment>
              )}
            </DateInput>
            <Button css={calendarButtonStyles} aria-label={labels.openCalendarLabel} isDisabled={disabled}>
              <CalendarIcon css={calendarIconStyles} aria-hidden="true" />
            </Button>
          </Group>
          <Popover
            css={calendarPopoverStyles}
            style={{zIndex: calendarPopoverZIndex}}
            placement={popoverPlacement}
            shouldFlip={false}
            offset={8}
            UNSTABLE_portalContainer={portalContainer}
          >
            <Dialog>
              <Calendar>
                <div css={calendarHeaderStyles}>
                  <Button slot="previous" aria-label={labels.previousMonthLabel} css={calendarNavButtonStyles}>
                    ‹
                  </Button>
                  <Heading css={calendarHeadingStyles} />
                  <Button slot="next" aria-label={labels.nextMonthLabel} css={calendarNavButtonStyles}>
                    ›
                  </Button>
                </div>
                <CalendarGrid css={calendarGridStyles}>
                  <CalendarGridHeader css={calendarGridHeaderStyles}>
                    {day => <CalendarHeaderCell css={calendarHeaderCellStyles}>{day}</CalendarHeaderCell>}
                  </CalendarGridHeader>
                  <CalendarGridBody>{date => <CalendarCell date={date} css={calendarCellStyles} />}</CalendarGridBody>
                </CalendarGrid>
              </Calendar>
            </Dialog>
          </Popover>
        </DatePicker>
      </I18nProvider>
    </div>
  );
};
