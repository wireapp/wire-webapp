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

import {errorMessage, redactSecret} from './releaseAppearanceCommandResult.ts';

export type WriteFailureOptions = {
  readonly writeOutput: (message: string) => Promise<void>;
  readonly message: string;
};

export type WriteSummarySafelyOptions = {
  readonly writeSummary: (summary: string) => Promise<void>;
  readonly summary: string;
  readonly writeOutput: (message: string) => Promise<void>;
  readonly githubToken: string;
};

export async function writeFailure(writeFailureOptions: WriteFailureOptions): Promise<void> {
  try {
    await writeFailureOptions.writeOutput(writeFailureOptions.message);
  } catch {
    // Reporting must not stop processing the remaining pull requests.
  }
}

export async function writeSummarySafely(writeSummaryOptions: WriteSummarySafelyOptions): Promise<boolean> {
  try {
    await writeSummaryOptions.writeSummary(writeSummaryOptions.summary);
    return true;
  } catch (error: unknown) {
    await writeFailure({
      writeOutput: writeSummaryOptions.writeOutput,
      message: `Unable to write GitHub Actions summary: ${redactSecret(
        errorMessage(error),
        writeSummaryOptions.githubToken,
      )}`,
    });
    return false;
  }
}
