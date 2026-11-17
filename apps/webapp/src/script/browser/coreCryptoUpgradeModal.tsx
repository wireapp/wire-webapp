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

import {useCoreCryptoSupport} from './coreCryptoSupportContext';

import {ModalComponent} from '../components/Modals/ModalComponent';
import {THEME_ID} from '../uiKit/identity/theme/theme';
import {Button} from '../uiKit/inputs/button/button';
import {StyledApp} from '../uiKit/layout/styledApp/styledApp';
import {H2} from '../uiKit/typography/heading/heading';
import {Text} from '../uiKit/typography/text/text';

export function CoreCryptoUpgradeModal(): ReactElement | null {
  const {support, isDesktopApp, translate} = useCoreCryptoSupport();
  const reloadButton = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    reloadButton.current?.focus();
  }, []);
  if (support.missingFeatures.length === 0) {
    return null;
  }

  return (
    <StyledApp themeId={THEME_ID.DEFAULT}>
      <ModalComponent
        isShown
        id="core-crypto-upgrade-modal"
        data-uie-name="core-crypto-upgrade-modal"
        aria-labelledby="core-crypto-upgrade-title"
        aria-describedby="core-crypto-upgrade-message"
        wrapperCSS={{padding: 24, maxWidth: 'calc(100vw - 32px)', overflowY: 'auto'}}
      >
        <H2 id="core-crypto-upgrade-title" css={{marginTop: 0}}>
          {translate('coreCryptoUpgradeTitle')}
        </H2>
        <Text block id="core-crypto-upgrade-message" css={{marginBottom: 24}}>
          {translate(isDesktopApp ? 'coreCryptoUpgradeDesktopMessage' : 'coreCryptoUpgradeBrowserMessage')}
        </Text>
        <Button
          ref={reloadButton}
          type="button"
          onClick={() => {
            window.location.reload();
          }}
          data-uie-name="do-reload-wire"
        >
          {translate('coreCryptoUpgradeReload')}
        </Button>
      </ModalComponent>
    </StyledApp>
  );
}
