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

import {FormEvent, useState} from 'react';

import {StatusCodes as HTTP_STATUS} from 'http-status-codes';

import {Button, COLOR, Container, ErrorMessage, Form, H2, Input, Link, Modal, Text} from '@wireapp/react-ui-kit';

import {t} from 'Util/LocalizerUtil';

import {Config} from '../../Config';

export interface JoinGuestLinkPasswordModalProps {
  onSubmitPassword: (password: string) => void;
  isLoading?: boolean;
  conversationName?: string;
  error: (Error & {label?: string; code?: number; message?: string}) | null;
  onClose: () => void;
}

const JoinGuestLinkPasswordModal = ({
  error,
  onClose,
  isLoading,
  conversationName,
  onSubmitPassword,
}: JoinGuestLinkPasswordModalProps) => {
  const [passwordValue, setPasswordValue] = useState<string>('');

  const onSubmit = (event: FormEvent<HTMLFormElement | HTMLButtonElement>) => {
    event.preventDefault();
    onSubmitPassword(passwordValue);
  };

  const Error = () => {
    if (error?.code === HTTP_STATUS.FORBIDDEN || error?.code === HTTP_STATUS.BAD_REQUEST) {
      return <ErrorMessage>{t('guestLinkPasswordModal.passwordIncorrect')}</ErrorMessage>;
    }
    return null;
  };

  return (
    <Modal onClose={onClose}>
      <Container style={{maxWidth: '400px'}}>
        <H2 style={{whiteSpace: 'break-spaces', fontWeight: 500, marginTop: '10px', textAlign: 'center'}}>
          {conversationName
            ? t('guestLinkPasswordModal.headline', {conversationName})
            : t('guestLinkPasswordModal.headlineDefault')}
        </H2>
        <Text block fontSize="var(--font-size-base)" style={{marginBottom: 24}}>
          {t('guestLinkPasswordModal.description')}
        </Text>
        <Form
          name="guest-password-join-form"
          data-uie-name="guest-password-join-form"
          onSubmit={(event: FormEvent<HTMLFormElement>) => onSubmit(event)}
          autoComplete="off"
        >
          <Input
            error={<Error />}
            data-uie-name="guest-link-join-password-input"
            name="guest-join-password"
            required
            placeholder={t('guestLinkPasswordModal.passwordInputLabel')}
            label={t('guestLinkPasswordModal.passwordInputLabel')}
            id="guest_link_join_password"
            className="modal__input"
            type="password"
            autoComplete="off"
            value={passwordValue}
            onChange={event => setPasswordValue(event.currentTarget.value)}
          />
        </Form>
        <Link href={Config.getConfig().URL.SUPPORT.LEARN_MORE_ABOUT_GUEST_LINKS} target="_blank">
          <Text block color={COLOR.BLUE} style={{textDecoration: 'underline', marginBottom: 24}}>
            {t('guestLinkPasswordModal.learnMoreLink')}
          </Text>
        </Link>
        <Button
          showLoading={isLoading}
          block
          type="button"
          disabled={!passwordValue}
          onClick={(event: FormEvent<HTMLButtonElement>) => onSubmit(event)}
          data-uie-name="guest-link-join-submit-button"
        >
          {t('guestLinkPasswordModal.joinConversation')}
        </Button>
      </Container>
    </Modal>
  );
};

export {JoinGuestLinkPasswordModal};
