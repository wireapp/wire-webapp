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

import {useEffect, useRef, type ReactElement} from 'react';

import {isEmptyArray} from '@sindresorhus/is';

import {useCoreCryptoSupport} from './coreCryptoSupportContext';

import {ModalComponent} from '../components/Modals/ModalComponent';
import {THEME_ID} from '../uiKit/identity/theme/theme';
import {StyledApp} from '../uiKit/layout/styledApp/styledApp';
import {H2} from '../uiKit/typography/heading/heading';
import type {Translate} from '../util/localizerUtil';

type CoreCryptoUpgradeModalProps = {
  readonly brandName: string;
  readonly isDesktopApp: boolean;
  readonly translate: Translate;
};

export function CoreCryptoUpgradeModal({
  brandName,
  isDesktopApp,
  translate,
}: CoreCryptoUpgradeModalProps): ReactElement | null {
  const support = useCoreCryptoSupport();
  const dialog = useRef<HTMLDivElement>(null);
  useEffect(() => {
    dialog.current?.focus();
  }, []);
  if (isEmptyArray(support.missingFeatures)) {
    return null;
  }

  return (
    <StyledApp themeId={THEME_ID.DEFAULT}>
      <ModalComponent
        isShown
        ref={dialog}
        tabIndex={-1}
        onKeyDown={event => {
          // Let Tab reach ModalComponent's document-level focus trap.
          if (event.key !== 'Tab') {
            event.stopPropagation();
          }
        }}
        id="core-crypto-upgrade-modal"
        data-uie-name="core-crypto-upgrade-modal"
        aria-labelledby="core-crypto-upgrade-title"
        wrapperCSS={{padding: 24, maxWidth: 'calc(100vw - 32px)', overflowY: 'auto'}}
      >
        <H2 id="core-crypto-upgrade-title" css={{margin: 0}}>
          {translate(isDesktopApp ? 'coreCryptoUpgradeDesktopTitle' : 'coreCryptoUpgradeBrowserTitle', {brandName})}
        </H2>
      </ModalComponent>
    </StyledApp>
  );
}
