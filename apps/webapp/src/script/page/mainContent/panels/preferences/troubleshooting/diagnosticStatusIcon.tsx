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

import type {JSX} from 'react';

import {statusIconStyles, statusStyles} from './troubleshooting.styles';

import {ErrorStatusIcon} from '../../../../../uiKit/dataDisplay/icon/errorStatusIcon';
import {NeutralStatusIcon} from '../../../../../uiKit/dataDisplay/icon/neutralStatusIcon';
import {SuccessStatusIcon} from '../../../../../uiKit/dataDisplay/icon/successStatusIcon';
import {WarningStatusIcon} from '../../../../../uiKit/dataDisplay/icon/warningStatusIcon';

type StatusTone = 'good' | 'warning' | 'bad' | 'muted';

const statusIcons = {
  good: SuccessStatusIcon,
  bad: ErrorStatusIcon,
  warning: WarningStatusIcon,
  muted: NeutralStatusIcon,
};

export const DiagnosticStatusIcon = ({tone}: {tone: StatusTone}): JSX.Element => {
  const StatusIcon = statusIcons[tone];

  return (
    <span css={[statusStyles(tone), statusIconStyles]} aria-hidden="true">
      <StatusIcon />
    </span>
  );
};
