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

import type {Clock} from '@enormora/clock/clock';
import {createFireAndForgetInvoker} from '@enormora/fire-and-forget';
import type {Maybe} from 'true-myth';

import {createDesktopLogOutput} from './createDesktopLogOutput';
import type {LogOutput} from './logOutput';
import {selectDesktopApplicationLogWrite} from './selectDesktopApplicationLogWrite';

import {Runtime} from '../commons/util/Runtime';
import type {StartupFeatureToggles} from '../featureToggles/startupFeatureToggles';

/** Composes the Desktop logging transport for the main and authentication entry points. */
export function initializeDesktopLogOutput(
  clock: Pick<Clock, 'setTimeout' | 'clearTimeout'>,
  startupFeatureToggles: StartupFeatureToggles,
): Maybe<LogOutput> {
  return selectDesktopApplicationLogWrite({
    isDesktopApp: Runtime.isDesktopApp(),
    startupFeatureToggles,
    readCapability() {
      return 'desktopApplicationLogs' in window ? window.desktopApplicationLogs : undefined;
    },
  }).map(writeToDesktop => {
    const output = createDesktopLogOutput({
      clock,
      writeToDesktop,
      reportFailure(failure) {
        console.warn(`Desktop structured log batch dropped (${failure})`);
      },
    });
    const flushInvoker = createFireAndForgetInvoker({
      reportError() {
        console.warn('Desktop structured log flush failed');
      },
    });
    window.addEventListener('pagehide', () => {
      // Navigation can end the WebView before asynchronous persistence completes.
      flushInvoker.fireAndForget(output.flush);
    });

    return output.write;
  });
}
