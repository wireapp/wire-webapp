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

import {JobsTaskStatus} from 'cells-sdk-ts';

export type EmptyBinOutcome = 'processing' | 'completed' | 'partial' | 'failed';

export const getEmptyBinOutcome = (statuses: readonly (string | undefined)[]): EmptyBinOutcome => {
  if (
    statuses.every(status => {
      return status === JobsTaskStatus.Finished;
    })
  ) {
    return 'completed';
  }

  const hasNonTerminalJob = statuses.some(status => {
    return (
      status !== JobsTaskStatus.Finished && status !== JobsTaskStatus.Error && status !== JobsTaskStatus.Interrupted
    );
  });
  if (hasNonTerminalJob) {
    return 'processing';
  }

  return statuses.some(status => {
    return status === JobsTaskStatus.Finished;
  })
    ? 'partial'
    : 'failed';
};
