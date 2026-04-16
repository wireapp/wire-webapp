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

import {FunctionComponent, useEffect} from 'react';

import {Maybe} from 'true-myth';

import {PrimaryModal} from 'Components/Modals/PrimaryModal';
import {t} from 'Util/localizerUtil';
import {TIME_IN_MILLIS} from 'Util/timeUtil';

import {useApplicationContext} from '../../RootProvider';

interface ForceReloadModalProperties {
  readonly reloadApplication: () => void;
}

const forceReloadDelayInMilliseconds = TIME_IN_MILLIS.SECOND * 60;

export const ForceReloadModal: FunctionComponent<ForceReloadModalProperties> = properties => {
  const {reloadApplication} = properties;
  const {doesApplicationNeedForceReload, wallClock} = useApplicationContext();

  useEffect((): void | (() => void) => {
    if (!doesApplicationNeedForceReload) {
      return undefined;
    }

    let hasApplicationReloadBeenTriggered = false;
    let forceReloadTimeoutIdentifier: Maybe<ReturnType<typeof globalThis.setTimeout>> = Maybe.nothing();

    function clearScheduledForceReloadTimeout(): void {
      const timeoutIdentifier = forceReloadTimeoutIdentifier.unwrapOr(undefined);

      if (timeoutIdentifier !== undefined) {
        wallClock.clearTimeout(timeoutIdentifier);
      }

      forceReloadTimeoutIdentifier = Maybe.nothing();
    }

    function triggerReloadApplicationOnce(): void {
      if (hasApplicationReloadBeenTriggered) {
        return;
      }

      hasApplicationReloadBeenTriggered = true;
      clearScheduledForceReloadTimeout();

      reloadApplication();
    }

    PrimaryModal.show(PrimaryModal.type.ACKNOWLEDGE, {
      hideCloseBtn: true,
      hideSecondary: true,
      preventClose: true,
      primaryAction: {
        action: triggerReloadApplicationOnce,
        text: t('forceReloadModalAction'),
      },
      text: {
        title: t('forceReloadModalTitle'),
        htmlMessage: t('forceReloadModalMessage'),
      },
    });
    forceReloadTimeoutIdentifier = Maybe.just(
      wallClock.setTimeout(triggerReloadApplicationOnce, forceReloadDelayInMilliseconds),
    );

    return () => {
      clearScheduledForceReloadTimeout();
    };
  }, [doesApplicationNeedForceReload, reloadApplication, wallClock]);

  return null;
};
