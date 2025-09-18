/*
 * Wire
 * Copyright (C) 2024 Wire Swiss GmbH
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

import {useEffect, useState} from 'react';

import {TimeInMillis} from '@wireapp/commons/lib/util/TimeUtil';

import {InviteIcon, Tooltip} from '@wireapp/react-ui-kit';

import {t} from 'Util/LocalizerUtil';
import {formatDuration} from 'Util/TimeUtil';

import {toolTipStyles} from './CallParticipantsListItemHandRaiseIcon.styles';

export interface CallParticipantsListItemHandRaiseIconProps {
  handRaisedAt: number;
}

export function CallParticipantsListItemHandRaiseIcon({handRaisedAt}: CallParticipantsListItemHandRaiseIconProps) {
  const [duration, setDuration] = useState<string>();

  useEffect(() => {
    const timerId = setTimeout(() => {
      setDuration(formatDuration(Date.now() - handRaisedAt + TimeInMillis.SECOND).text);
    }, TimeInMillis.SECOND);

    return () => {
      clearTimeout(timerId);
    };
  });

  if (!duration) {
    return null;
  }

  return (
    <>
      <Tooltip
        body={
          <div css={toolTipStyles}>
            <InviteIcon />
            <span>
              {t('videoCallParticipantRaisedHandRaiseDuration', {
                duration,
              })}
            </span>
          </div>
        }
        data-uie-name="hand-raised-at"
      >
        ✋
      </Tooltip>
    </>
  );
}
