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

import {isNull} from '@sindresorhus/is';

import type {CoreCryptoSupport} from './coreCryptoSupport';
import {CoreCryptoUpgradeModal} from './coreCryptoUpgradeModal';
import {renderWithCoreCryptoSupport} from './renderWithCoreCryptoSupport';

import {Config} from '../Config';
import {setAppLocale} from '../localization/Localizer';
import {translate} from '../util/localizerUtil';

type ShowCoreCryptoUpgradeOptions = {
  readonly containerId: string;
  readonly support: CoreCryptoSupport;
  readonly isDesktopApp: boolean;
};

export function showCoreCryptoUpgrade({containerId, support, isDesktopApp}: ShowCoreCryptoUpgradeOptions): void {
  const container = document.getElementById(containerId);
  if (isNull(container)) {
    throw new Error(`No container '${containerId}' found to render upgrade instructions`);
  }
  setAppLocale();
  renderWithCoreCryptoSupport(
    container,
    support,
    <CoreCryptoUpgradeModal
      brandName={Config.getConfig().BRAND_NAME}
      isDesktopApp={isDesktopApp}
      translate={translate}
    />,
  );
}
