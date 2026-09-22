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

import {BaseError} from '../error/baseError';
import type {ApplicationStartupReport} from '../observability/applicationStartupReport';

type ReportStartup = (result: ApplicationStartupReport['result']) => Promise<void>;

type ReportStartupFailureDependencies = {
  readonly handleBaseError: (error: BaseError) => Promise<void>;
  readonly reportStartup: ReportStartup;
};

export async function reportStartupFailure(
  error: unknown,
  dependencies: ReportStartupFailureDependencies,
): Promise<undefined> {
  const {handleBaseError, reportStartup} = dependencies;

  await reportStartup('failure');

  if (error instanceof BaseError) {
    await handleBaseError(error);
    return undefined;
  }

  throw error;
}
