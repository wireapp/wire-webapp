/*
 * Wire
 * Copyright (C) 2025 Wire Swiss GmbH
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

import {Button, Container, H2, Link, Modal, Text} from '@wireapp/react-ui-kit';

import {Config} from 'src/script/Config';
import {t} from 'Util/LocalizerUtil';

import {buttonCss, containerCss, headerCss, linkCss} from './AccountAlreadyExistsModal.styles';

interface AccountAlreadyExistsModalProps {
  onClose: () => void;
}

export const AccountAlreadyExistsModal = ({onClose}: AccountAlreadyExistsModalProps) => {
  const {CHANGE_EMAIL_ADDRESS: changeEmailAddressUrl, DELETE_PERSONAL_ACCOUNT: deletePersonalAccountUrl} =
    Config.getConfig().URL.SUPPORT;

  return (
    <Modal onClose={onClose}>
      <Container css={containerCss}>
        <H2 css={headerCss}>{t('accountAlreadyExistsModal.header')}</H2>
        <Text block fontSize="var(--font-size-base)" style={{marginBottom: 24}}>
          {t('accountAlreadyExistsModal.content')}
        </Text>
        <Text block>
          👉{' '}
          <Link href={changeEmailAddressUrl} target="_blank" css={linkCss}>
            {t('accountAlreadyExistsModal.changeEmailLink')}
          </Link>
        </Text>
        <Text block>
          👉{' '}
          <Link href={deletePersonalAccountUrl} target="_blank" css={linkCss}>
            {t('accountAlreadyExistsModal.deletePersonalAccount')}
          </Link>
        </Text>
        <Button css={buttonCss} block type="button" onClick={onClose} data-uie-name="guest-link-join-submit-button">
          {t('authHistoryButton')}
        </Button>
      </Container>
    </Modal>
  );
};
