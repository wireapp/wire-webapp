/*
 * Wire
 * Copyright (C) 2025 Wire Swiss GmbH
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

import {useMemo, useState} from 'react';

import {DateValue, getLocalTimeZone, today} from '@internationalized/date';
import {I18nProvider} from '@react-aria/i18n';
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
  Popover,
} from 'react-aria-components';

import {Label, Select, type Option} from '@wireapp/react-ui-kit';

import {
  calendarButtonStyles,
  calendarCellStyles,
  calendarGridStyles,
  calendarGridHeaderStyles,
  calendarHeaderCellStyles,
  calendarHeaderStyles,
  calendarHeadingStyles,
  calendarIconStyles,
  calendarNavButtonStyles,
  calendarPopoverStyles,
  dateInputStyles,
  datePickerGroupStyles,
  dateSegmentStyles,
  expirationContentStyles,
  expirationFieldsRowStyles,
  expirationLabelStyles,
  timeSelectLabelVisuallyHiddenStyles,
  timeSelectMenuStyles,
  timeSelectMenuPortalStyles,
  timeSelectStyles,
  timeSelectWrapperStyles,
  expirationErrorBorderStyles,
  expirationErrorLabelStyles,
  expirationErrorTextStyles,
} from './CellsShareExpirationStyles';

interface CellsShareExpirationFieldsLabels {
  expiresLabel: string;
  dateAriaLabel: string;
  timeAriaLabel: string;
  openCalendarLabel: string;
  previousMonthLabel: string;
  nextMonthLabel: string;
}

interface CellsShareExpirationFieldsProps {
  labels: CellsShareExpirationFieldsLabels;
  errorText: string;
}

const parseTimeLabel = (value: string | number) => {
  const [timePart, periodPart] = `${value}`.trim().split(' ');
  const [hourPart, minutePart] = (timePart || '').split(':');
  const hour = Number(hourPart);
  const minutes = Number(minutePart);
  const isPm = (periodPart || '').toUpperCase() === 'PM';
  const hour24 = Number.isFinite(hour) ? (isPm ? (hour % 12) + 12 : hour % 12) : 0;
  const safeMinutes = Number.isFinite(minutes) ? minutes : 0;

  return {hour24, minutes: safeMinutes};
};

const formatTimeLabel = (hour24: number, minutes: number): string => {
  const hour12 = ((hour24 + 11) % 12) + 1;
  const period = hour24 < 12 ? 'AM' : 'PM';
  return `${hour12}:${String(minutes).padStart(2, '0')} ${period}`;
};

const buildTimeOptions = (): Option[] =>
  Array.from({length: 96}, (_, index) => {
    const totalMinutes = index * 15;
    const hour24 = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    const label = formatTimeLabel(hour24, minutes);
    return {value: label, label};
  });

export const CellsShareExpirationFields = ({labels, errorText}: CellsShareExpirationFieldsProps) => {
  const timeOptions = useMemo(() => buildTimeOptions(), []);
  const [selectedTime, setSelectedTime] = useState<Option>(timeOptions[0]);
  const [selectedDate, setSelectedDate] = useState<DateValue | null>(() => today(getLocalTimeZone()));
  const menuMaxHeight = 200;
  const portalContainer = typeof document === 'undefined' ? undefined : document.body;
  const popoverStyle = {zIndex: 10000020};
  const labelId = 'cells-share-expiration-label';
  const isExpirationInvalid = useMemo(() => {
    if (!selectedDate || !selectedTime?.value) {
      return false;
    }

    const {hour24, minutes} = parseTimeLabel(selectedTime.value);
    const date = selectedDate.toDate(getLocalTimeZone());
    const selectedDateTime = new Date(date.getFullYear(), date.getMonth(), date.getDate(), hour24, minutes, 0, 0);

    return selectedDateTime.getTime() < Date.now();
  }, [selectedDate, selectedTime]);
  const dateGroupStyles = isExpirationInvalid
    ? {...datePickerGroupStyles, ...expirationErrorBorderStyles}
    : datePickerGroupStyles;
  const timeControlStyles = timeSelectStyles;
  const labelStyles = isExpirationInvalid
    ? {...expirationLabelStyles, ...expirationErrorLabelStyles}
    : expirationLabelStyles;

  return (
    <div css={expirationContentStyles}>
      <Label css={labelStyles} id={labelId}>
        {labels.expiresLabel}
      </Label>
      <div css={expirationFieldsRowStyles} role="group" aria-labelledby={labelId}>
        <I18nProvider locale="de-DE">
          <DatePicker aria-label={labels.dateAriaLabel} value={selectedDate} onChange={setSelectedDate}>
            <Group css={dateGroupStyles} data-uie-name="cells-share-expiration-date">
              <DateInput css={dateInputStyles}>
                {segment => (
                  <DateSegment segment={segment} css={dateSegmentStyles}>
                    {segment.type === 'literal' ? '.' : segment.text}
                  </DateSegment>
                )}
              </DateInput>
              <Button css={calendarButtonStyles} aria-label={labels.openCalendarLabel}>
                <svg viewBox="0 0 16 16" fill="none" aria-hidden="true" focusable="false" css={calendarIconStyles}>
                  <g clipPath="url(#cells-share-calendar-clip)">
                    <path
                      d="M5.2 1V3.8"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                    <path
                      d="M10.8 1V3.8"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                    <path
                      d="M12.9 2.4004H3.1C2.3268 2.4004 1.7 3.0272 1.7 3.8004V13.6005C1.7 14.3737 2.3268 15.0005 3.1 15.0005H12.9C13.6733 15.0005 14.3001 14.3737 14.3001 13.6005V3.8004C14.3001 3.0272 13.6733 2.4004 12.9 2.4004Z"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                    <path
                      d="M1.7 6.5996H14.3"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </g>
                  <defs>
                    <clipPath id="cells-share-calendar-clip">
                      <rect width="16" height="16" fill="white" />
                    </clipPath>
                  </defs>
                </svg>
              </Button>
            </Group>
            <Popover
              css={calendarPopoverStyles}
              style={popoverStyle}
              placement="top start"
              shouldFlip={false}
              offset={8}
              {...(portalContainer ? {portalContainer} : {})}
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
        <div css={timeSelectWrapperStyles}>
          <label htmlFor="cells-share-expiration-time" css={timeSelectLabelVisuallyHiddenStyles}>
            {labels.timeAriaLabel}
          </label>
          <Select
            id="cells-share-expiration-time"
            dataUieName="cells-share-expiration-time"
            options={timeOptions}
            value={selectedTime}
            selectContainerCSS={timeControlStyles}
            selectControlCSS={timeControlStyles}
            selectMenuPortalCSS={timeSelectMenuPortalStyles}
            menuCSS={timeSelectMenuStyles}
            menuPlacement="top"
            maxMenuHeight={menuMaxHeight}
            {...(portalContainer && {menuPortalTarget: portalContainer})}
            onChange={option => {
              if (option) {
                setSelectedTime(option as Option);
              }
            }}
            markInvalid={isExpirationInvalid}
          />
        </div>
      </div>
      {isExpirationInvalid && <p css={expirationErrorTextStyles}>{errorText}</p>}
    </div>
  );
};
