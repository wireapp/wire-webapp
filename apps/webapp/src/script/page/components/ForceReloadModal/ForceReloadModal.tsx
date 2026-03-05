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

import {FunctionComponent, useEffect, useRef} from 'react';

import {PrimaryModal} from 'Components/Modals/PrimaryModal';
import {t} from 'Util/LocalizerUtil';

import {useApplicationContext} from '../../RootProvider';

interface ForceReloadModalProperties {
  readonly reloadApplication: () => void;
}

export const ForceReloadModal: FunctionComponent<ForceReloadModalProperties> = properties => {
  const {reloadApplication} = properties;
  const hasForceReloadModalBeenShown = useRef(false);
  const {doesApplicationNeedForceReload} = useApplicationContext();

  useEffect(() => {
    if (!doesApplicationNeedForceReload) {
      hasForceReloadModalBeenShown.current = false;
      return;
    }

    if (hasForceReloadModalBeenShown.current) {
      return;
    }

    hasForceReloadModalBeenShown.current = true;

    PrimaryModal.show(PrimaryModal.type.ACKNOWLEDGE, {
      hideCloseBtn: true,
      hideSecondary: true,
      preventClose: true,
      primaryAction: {
        action: reloadApplication,
        text: t('forceReloadModalAction'),
      },
      text: {
        title: t('forceReloadModalTitle'),
        htmlMessage: t('forceReloadModalMessage'),
      },
    });
  }, [doesApplicationNeedForceReload, reloadApplication]);

  return null;
};
