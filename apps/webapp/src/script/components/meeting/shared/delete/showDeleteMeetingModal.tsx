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

import {noop} from 'noop-esm';

import {TrashIcon} from '@wireapp/react-ui-kit';

import {
  deleteMeetingConfirmButtonContentStyles,
  deleteMeetingConfirmButtonIconStyles,
} from 'Components/meeting/shared/delete/showDeleteMeetingModal.styles';
import {PrimaryModal} from 'Components/Modals/PrimaryModal';
import type {Translate, TranslationKey} from 'Util/localizerUtil';

export type DeleteMeetingModalMode = 'forAll' | 'forMe';

type ShowDeleteMeetingModalParams = {
  mode: DeleteMeetingModalMode;
  isRecurring: boolean;
  onConfirm: () => void;
  translate: Translate;
};

export const getDeleteMeetingModalMessageKey = ({
  mode,
  isRecurring,
}: {
  mode: DeleteMeetingModalMode;
  isRecurring: boolean;
}): TranslationKey => {
  if (mode === 'forAll' && isRecurring) {
    return 'meetings.deleteModal.forAllRecurringMessage';
  }

  if (mode === 'forAll') {
    return 'meetings.deleteModal.forAllMessage';
  }

  return 'meetings.deleteModal.forMeMessage';
};

export const showDeleteMeetingModal = ({
  mode,
  isRecurring,
  onConfirm,
  translate,
}: ShowDeleteMeetingModalParams): void => {
  const isForAll = mode === 'forAll';

  PrimaryModal.show(
    PrimaryModal.type.CONFIRM,
    {
      closeOnConfirm: true,
      closeOnSecondaryAction: true,
      primaryAction: {
        action: onConfirm,
        text: (
          <span css={deleteMeetingConfirmButtonContentStyles}>
            <TrashIcon width={16} height={16} css={deleteMeetingConfirmButtonIconStyles} />
            {translate('meetings.deleteModal.confirmDelete')}
          </span>
        ),
      },
      secondaryAction: {
        action: noop,
        text: translate('meetings.deleteModal.cancel'),
      },
      text: {
        title: translate(isForAll ? 'meetings.deleteModal.forAllTitle' : 'meetings.deleteModal.forMeTitle'),
        message: translate(getDeleteMeetingModalMessageKey({mode, isRecurring})),
      },
    },
    undefined,
    translate,
  );
};
