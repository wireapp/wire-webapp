/*
 * Wire
 * Copyright (C) 2021 Wire Swiss GmbH
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

import React from 'react';
import {t} from 'Util/LocalizerUtil';
import Duration from 'Components/calling/Duration';

interface CallDurationProps {
  isCbrEnabled: boolean;
  isOngoing: boolean;
  startedAt: number;
}

const CallDuration: React.FC<CallDurationProps> = ({isOngoing, startedAt, isCbrEnabled}) => {
  return isOngoing && startedAt ? (
    <div className="conversation-list-info-wrapper">
      <span className="conversation-list-cell-description" data-uie-name="call-duration">
        <Duration {...{startedAt}} />
      </span>
      {isCbrEnabled && (
        <span className="conversation-list-cell-description" data-uie-name="call-cbr">
          {t('callStateCbr')}
        </span>
      )}
    </div>
  ) : null;
};

export default CallDuration;
