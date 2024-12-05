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

import {observable, Observable} from 'knockout';

import {InviteIcon, Tooltip} from '@wireapp/react-ui-kit';

import {useKoSubscribableChildren} from 'Util/ComponentUtil';
import {t} from 'Util/LocalizerUtil';
import {formatDuration} from 'Util/TimeUtil';

export interface CallParticipantsListItemHandRaiseIconProps {
  handRaisedAt?: Observable<number | null>;
}

export function CallParticipantsListItemHandRaiseIcon({
  handRaisedAt = observable(null),
}: CallParticipantsListItemHandRaiseIconProps) {
  const {handRaisedAt: handRaisedAtValue} = useKoSubscribableChildren({handRaisedAt}, ['handRaisedAt']);

  if (!handRaisedAtValue) {
    return null;
  }

  return (
    <>
      <Tooltip
        className="message-header-icon-guest"
        body={
          <div className="flex-center" style={{gap: '0.2rem'}}>
            <InviteIcon />
            <span>
              {t('videoCallParticipantRaisedHandRaiseDuration', {
                duration: formatDuration(Date.now() - handRaisedAtValue).text,
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
