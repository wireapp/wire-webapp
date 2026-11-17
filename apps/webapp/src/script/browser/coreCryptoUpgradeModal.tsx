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

import {Dialog, Heading, Modal, ModalOverlay, Button} from 'react-aria-components';

import {useCoreCryptoSupport} from './coreCryptoSupportContext';

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
    <ModalOverlay
      isOpen
      isDismissable={false}
      isKeyboardDismissDisabled
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0, 0, 0, 0.4)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 24,
        fontFamily: 'system-ui, sans-serif',
        zIndex: 10000,
      }}
    >
      <Modal style={{background: '#fff', color: '#17181a', borderRadius: 12, padding: 32, maxWidth: 480}}>
        <Dialog aria-describedby="core-crypto-upgrade-message" style={{outline: 'none'}}>
          <Heading slot="title">{translate('coreCryptoUpgradeTitle')}</Heading>
          <p id="core-crypto-upgrade-message">
            {translate(isDesktopApp ? 'coreCryptoUpgradeDesktopMessage' : 'coreCryptoUpgradeBrowserMessage')}
          </p>
          <Button
            ref={reloadButton}
            onPress={() => {
              window.location.reload();
            }}
            style={{padding: '10px 20px', cursor: 'pointer'}}
          >
            {translate('coreCryptoUpgradeReload')}
          </Button>
        </Dialog>
      </Modal>
    </ModalOverlay>
  );
}
