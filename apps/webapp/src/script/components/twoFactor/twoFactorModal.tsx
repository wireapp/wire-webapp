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

import type {ReactNode} from 'react';

import {IconButton, IconButtonVariant} from '@wireapp/react-ui-kit';

import {CloseIcon} from 'Components/icon';
import {ModalComponent} from 'Components/Modals/ModalComponent';
import {useApplicationContext} from 'src/script/page/rootProvider';
import {handleEscDown} from 'Util/keyboardUtil';

import {twoFactorStyles} from './twoFactor.styles';

export function TwoFactorModal({
  children,
  onClose,
  canClose = true,
}: {
  children: ReactNode;
  onClose: () => void;
  canClose?: boolean;
}) {
  const {translate} = useApplicationContext();
  const close = () => {
    if (canClose) {
      onClose();
    }
  };
  return (
    <ModalComponent
      isShown
      onBgClick={close}
      onKeyDown={event => {
        return handleEscDown(event, close);
      }}
      wrapperCSS={{width: 'min(400px, calc(100vw - 32px))', borderRadius: 20, overflowY: 'auto'}}
      aria-label={translate('preferencesSecurityTwoFactorAuthentication')}
    >
      <section css={twoFactorStyles} style={{position: 'relative'}}>
        {children}
        {canClose && (
          <IconButton
            className="two-factor-close"
            variant={IconButtonVariant.SECONDARY}
            aria-label={translate('preferencesSecurityClose')}
            onClick={close}
          >
            <CloseIcon aria-hidden="true" />
          </IconButton>
        )}
      </section>
    </ModalComponent>
  );
}
