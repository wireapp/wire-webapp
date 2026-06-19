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

import is from '@sindresorhus/is';

import {
  CircleCloseIcon,
  DateTimePickerField,
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
import {getScheduleMeetingRecurrenceSelectOptions} from './scheduleMeetingRecurrence';
import type {
  ScheduleMeetingFormDisplayErrors,
  ScheduleMeetingFormState,
  ScheduleMeetingMode,
  ScheduleMeetingRecurrenceOption,
} from './scheduleMeetingTypes';
import {useScheduleMeetingParticipants} from './useScheduleMeetingParticipants';

export interface ScheduleMeetingFormProps {
  mode: ScheduleMeetingMode;
  formState: ScheduleMeetingFormState;
  errors: ScheduleMeetingFormDisplayErrors;
  onTitleChange: (title: string) => void;
  onStartChange: (start: Date | null) => void;
  onEndChange: (end: Date | null) => void;
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
  const recurrenceOptions = useMemo(() => getScheduleMeetingRecurrenceSelectOptions(translate), [translate]);
  const selectedRecurrenceOption = recurrenceOptions.find(option => option.value === formState.recurrence);
  const portalContainer = getOverlayPortalContainer();

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
          value={formState.start}
          onChange={onStartChange}
          labels={dateTimePickerLabels}
          locale={currentLanguage()}
          menuPortalTarget={portalContainer}
          popoverPortalContainer={portalContainer}
        />

        <DateTimePickerField
          dataUieName="schedule-meeting-end"
          label={translate('meetings.scheduleModal.endsLabel')}
          value={formState.end}
          onChange={onEndChange}
          labels={dateTimePickerLabels}
          locale={currentLanguage()}
          markInvalid={Boolean(errors.endBeforeStart)}
          errorText={errors.endBeforeStart}
          menuPortalTarget={portalContainer}
          popoverPortalContainer={portalContainer}
        />

        <Select
          id="schedule-meeting-recurrence"
          dataUieName="schedule-meeting-recurrence"
          label={translate('meetings.scheduleModal.repeatsLabel')}
          options={recurrenceOptions}
          value={selectedRecurrenceOption}
          onChange={option => {
            if (option !== null) {
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
