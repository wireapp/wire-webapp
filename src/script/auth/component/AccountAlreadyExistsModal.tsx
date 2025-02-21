/*
 * Wire
 * Copyright (C) 2023 Wire Swiss GmbH
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

import {CSSObject} from '@emotion/react';

import {Button, Container, H2, Link, Modal, Text} from '@wireapp/react-ui-kit';

import {Config} from 'src/script/Config';
import {t} from 'Util/LocalizerUtil';

export interface AccountAlreadyExistsModalProps {
  onClose: () => void;
  backendName: string;
}

export const AccountAlreadyExistsModal = ({onClose, backendName}: AccountAlreadyExistsModalProps) => {
  return (
    <Modal onClose={onClose}>
      <Container style={{maxWidth: '360px'}}>
        <H2 style={{whiteSpace: 'break-spaces', fontWeight: 500, marginTop: '10px', textAlign: 'center'}}>
          {t('accountAlreadyExistsModal.header')}
        </H2>
        <Text block fontSize="var(--font-size-base)" style={{marginBottom: 24}}>
          {t('accountAlreadyExistsModal.content', {backendName})}
        </Text>
        <Text block>
          👉{' '}
          <Link href={Config.getConfig().URL.SUPPORT.CHANGE_EMAIL_ADDRESS} target="_blank" css={linkStyles}>
            {t('accountAlreadyExistsModal.changeEmailLink')}
          </Link>
        </Text>
        <Text block>
          👉{' '}
          <Link href={Config.getConfig().URL.SUPPORT.DELETE_PERSONAL_ACCOUNT} target="_blank" css={linkStyles}>
            {t('accountAlreadyExistsModal.deletePersonalAccount')}
          </Link>{' '}
          {t('index.or')}{' '}
          <Link href={Config.getConfig().URL.SUPPORT.REMOVE_TEAM_MEMBER} target="_blank" css={linkStyles}>
            {t('accountAlreadyExistsModal.removeTeamMember')}
          </Link>
        </Text>
        <Button
          css={{marginBottom: '0px', marginTop: '1rem'}}
          block
          type="button"
          onClick={onClose}
          data-uie-name="guest-link-join-submit-button"
        >
          {t('authHistoryButton')}
        </Button>
      </Container>
    </Modal>
  );
};

const linkStyles: CSSObject = {
  textDecoration: 'underline',
  textTransform: 'none',
  fontSize: 'var(--font-size-base)',
};
