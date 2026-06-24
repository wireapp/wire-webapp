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

import {getLocalTimeZone, today} from '@internationalized/date';
import is from '@sindresorhus/is';
import type {Maybe} from 'true-myth';
import {maybe} from 'true-myth';

import {
  CircleCloseIcon,
  DateTimePickerField,
  dateValueFromDate,
  ErrorMessage,
  getOverlayPortalContainer,
  Input,
  Select,
} from '@wireapp/react-ui-kit';

import {MeetingParticipantsPicker} from 'Components/Meeting/MeetingParticipantsPicker';
import type {User} from 'Repositories/entity/User';
import {currentLanguage} from 'src/script/auth/localeConfig';
import {useApplicationContext} from 'src/script/page/rootProvider';

import {
  scheduleMeetingFormColumnCss,
  scheduleMeetingFormDividerCss,
  scheduleMeetingFormLayoutCss,
  scheduleMeetingFormLeftColumnCss,
  scheduleMeetingParticipantsSectionCss,
  scheduleMeetingRecurrenceSelectWrapperStyles,
  scheduleMeetingSelectMenuPortalStyles,
  scheduleMeetingTitleClearButtonStyles,
  scheduleMeetingTitleInputWrapperStyles,
} from './ScheduleMeetingForm.styles';
import {
  SCHEDULE_MEETING_RECURRENCE_OPTIONS,
  SCHEDULE_MEETING_RECURRENCE_TRANSLATION_KEYS,
} from './scheduleMeetingRecurrence';
import type {
  ScheduleMeetingFormDisplayErrors,
  ScheduleMeetingFormState,
  ScheduleMeetingMode,
  ScheduleMeetingRecurrenceOption,
} from './scheduleMeetingTypes';
import {useScheduleMeetingParticipants} from './useScheduleMeetingParticipants';

const toDateTimePickerValue = (value: Maybe<Date>): Date | null => value.unwrapOr(null);

const fromDateTimePickerValue = (value: Date | null): Maybe<Date> =>
  value === null ? maybe.nothing() : maybe.just(value);

const firstNonEmptyError = (...errorMessages: Array<string | undefined>): string | undefined =>
  errorMessages.find(message => is.nonEmptyString(message));

export interface ScheduleMeetingFormProps {
  mode: ScheduleMeetingMode;
  formState: ScheduleMeetingFormState;
  errors: ScheduleMeetingFormDisplayErrors;
  onTitleChange: (title: string) => void;
  onStartChange: (start: Maybe<Date>) => void;
  onEndChange: (end: Maybe<Date>) => void;
  onRecurrenceChange: (recurrence: ScheduleMeetingRecurrenceOption) => void;
  onSelectedUsersChange: (users: User[]) => void;
  onParticipantsFilterChange: (filter: string) => void;
  selfUser: User;
}

export const ScheduleMeetingForm = ({
  mode,
  formState,
  errors,
  onTitleChange,
  onStartChange,
  onEndChange,
  onRecurrenceChange,
  onSelectedUsersChange,
  onParticipantsFilterChange,
  selfUser,
}: ScheduleMeetingFormProps) => {
  const {translate} = useApplicationContext();
  const {users} = useScheduleMeetingParticipants();
  const portalContainer = getOverlayPortalContainer();

  const recurrenceSelectOptions = useMemo(
    () =>
      SCHEDULE_MEETING_RECURRENCE_OPTIONS.map(value => ({
        value,
        label: translate(SCHEDULE_MEETING_RECURRENCE_TRANSLATION_KEYS[value]),
      })),
    [translate],
  );

  const selectedRecurrenceOption = useMemo(
    () => recurrenceSelectOptions.find(option => option.value === formState.recurrence),
    [formState.recurrence, recurrenceSelectOptions],
  );

  const dateTimePickerLabels = useMemo(
    () => ({
      dateAriaLabel: translate('meetings.scheduleModal.openCalendarAriaLabel'),
      timeAriaLabel: translate('meetings.scheduleModal.timeSelectAriaLabel'),
      openCalendarLabel: translate('meetings.scheduleModal.openCalendarAriaLabel'),
      previousMonthLabel: translate('meetings.scheduleModal.previousMonthAriaLabel'),
      nextMonthLabel: translate('meetings.scheduleModal.nextMonthAriaLabel'),
    }),
    [translate],
  );

  const todayValue = useMemo(() => today(getLocalTimeZone()), []);

  const endDateMinValue = useMemo(() => {
    if (formState.start.isNothing) {
      return todayValue;
    }

    const startDate = dateValueFromDate(formState.start.value);
    return startDate.compare(todayValue) > 0 ? startDate : todayValue;
  }, [formState.start, todayValue]);

  const startErrorText = firstNonEmptyError(errors.startInPast);
  const endErrorText = firstNonEmptyError(errors.endInPast, errors.endBeforeStart);

  return (
    <div css={scheduleMeetingFormLayoutCss} data-uie-name="schedule-meeting-form" data-uie-mode={mode}>
      <div css={scheduleMeetingFormLeftColumnCss}>
        <Input
          id="schedule-meeting-title"
          data-uie-name="schedule-meeting-title"
          label={translate('meetings.scheduleModal.titleLabel')}
          placeholder={translate('meetings.scheduleModal.titlePlaceholder')}
          value={formState.title}
          onChange={event => onTitleChange(event.currentTarget.value)}
          markInvalid={is.nonEmptyString(errors.title)}
          error={
            is.nonEmptyString(errors.title) ? (
              <ErrorMessage data-uie-name="schedule-meeting-title-error">{errors.title}</ErrorMessage>
            ) : undefined
          }
          wrapperCSS={scheduleMeetingTitleInputWrapperStyles}
          endContent={
            formState.title.length > 0 && !is.nonEmptyString(errors.title) ? (
              <button
                type="button"
                onClick={() => onTitleChange('')}
                css={scheduleMeetingTitleClearButtonStyles}
                aria-label={translate('accessibility.userProfileDeleteEntry')}
              >
                <CircleCloseIcon />
              </button>
            ) : undefined
          }
        />

        <div css={scheduleMeetingParticipantsSectionCss}>
          <MeetingParticipantsPicker
            id="schedule-meeting-participants"
            dataUieName="schedule-meeting-participants"
            users={users}
            selectedUsers={formState.selectedUsers}
            onSelectedUsersChange={onSelectedUsersChange}
            filter={formState.participantsFilter}
            onFilterChange={onParticipantsFilterChange}
            selfUser={selfUser}
            label={translate('meetings.scheduleModal.participantsLabel')}
            placeholder={translate('meetings.scheduleModal.participantsPlaceholder')}
            popoverPortalContainer={portalContainer}
          />
        </div>
      </div>

      <div css={scheduleMeetingFormDividerCss} aria-hidden="true" />

      <div css={scheduleMeetingFormColumnCss}>
        <DateTimePickerField
          dataUieName="schedule-meeting-start"
          label={translate('meetings.scheduleModal.startsLabel')}
          value={toDateTimePickerValue(formState.start)}
          onChange={date => onStartChange(fromDateTimePickerValue(date))}
          labels={dateTimePickerLabels}
          locale={currentLanguage()}
          markInvalid={is.nonEmptyString(startErrorText)}
          errorText={startErrorText}
          minValue={todayValue}
          menuPortalTarget={portalContainer}
          popoverPortalContainer={portalContainer}
        />

        <DateTimePickerField
          dataUieName="schedule-meeting-end"
          label={translate('meetings.scheduleModal.endsLabel')}
          value={toDateTimePickerValue(formState.end)}
          onChange={date => onEndChange(fromDateTimePickerValue(date))}
          labels={dateTimePickerLabels}
          locale={currentLanguage()}
          markInvalid={is.nonEmptyString(endErrorText)}
          errorText={endErrorText}
          minValue={endDateMinValue}
          menuPortalTarget={portalContainer}
          popoverPortalContainer={portalContainer}
        />

        <Select
          id="schedule-meeting-recurrence"
          dataUieName="schedule-meeting-recurrence"
          label={translate('meetings.scheduleModal.repeatsLabel')}
          options={recurrenceSelectOptions}
          value={selectedRecurrenceOption}
          onChange={option => {
            if (option) {
              onRecurrenceChange(option.value as ScheduleMeetingRecurrenceOption);
            }
          }}
          menuPortalTarget={portalContainer}
          menuPosition="fixed"
          menuShouldScrollIntoView={false}
          selectMenuPortalCSS={scheduleMeetingSelectMenuPortalStyles}
          wrapperCSS={scheduleMeetingRecurrenceSelectWrapperStyles}
        />
      </div>
    </div>
  );
};
