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

import type {FunctionComponent} from 'react';

import {pendingClock, pendingClockIcon} from './pendingClock.styles';

import {PendingIcon} from '../../../../uiKit/dataDisplay/icon/pendingIcon';
import {Tooltip} from '../../../../uiKit/dataDisplay/tooltip/tooltip';

interface PendingClockProps {
  /** Translated by the caller: reading the app context here would add a cycle through rootProvider to contentMessage */
  label: string;
}

export const PendingClock: FunctionComponent<PendingClockProps> = ({label}) => {
  return (
    <Tooltip body={label} css={pendingClock} data-uie-name="status-message-pending">
      <span role="img" aria-label={label} css={{display: 'inline-flex'}}>
        <PendingIcon css={pendingClockIcon} />
      </span>
    </Tooltip>
  );
};
