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

import type {MeetingSubmitErrors} from 'Components/Meeting/meetingSubmitErrors';
import {PrimaryModal} from 'Components/Modals/PrimaryModal';
import type {Translate} from 'Util/localizerUtil';

import type {MeetingSubmitErrorTranslationMap} from './meetingSubmitErrorKeys';

export const showMeetingSubmitError = (
  translate: Translate,
  error: MeetingSubmitErrors,
  translationKeys: MeetingSubmitErrorTranslationMap,
): void => {
  const {titleKey, messageKey} = translationKeys[error];
  PrimaryModal.show(
    PrimaryModal.type.ACKNOWLEDGE,
    {
      text: {
        title: translate(titleKey),
        message: translate(messageKey),
      },
    },
    undefined,
    translate,
  );
};
