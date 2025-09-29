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

import {actionsStyles, headingStyles, wrapperStyles} from 'Components/Meeting/MeetingHeader/MeetingHeader.styles';
import {MeetNowMultiActionButton} from 'Components/Meeting/MeetNowMultiActionButton/MeetNowMultiActionButton';
import {t} from 'Util/LocalizerUtil';

export const MeetingHeader = () => {
  return (
    <header css={wrapperStyles}>
      <h2 css={headingStyles}>{t('meetings.navigation.title')}</h2>
      <div css={actionsStyles}>
        <MeetNowMultiActionButton />
      </div>
    </header>
  );
};
