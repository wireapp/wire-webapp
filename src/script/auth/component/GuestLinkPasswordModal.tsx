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

import React, {useState} from 'react';

import {useIntl} from 'react-intl';

import {Button, COLOR, Container, Form, H2, Input, Link, Modal, Text} from '@wireapp/react-ui-kit';

import {Config} from '../../Config';
import {guestLinkPasswordModalStrings} from '../../strings';

export interface GuestLinkPasswordModalProps {
  onSubmitPassword: (password: string) => void;
  isLoading?: boolean;
  conversationName?: string;
}

const GuestLinkPasswordModal: React.FC<GuestLinkPasswordModalProps> = ({
  isLoading,
  conversationName,
  onSubmitPassword,
}) => {
  const {formatMessage: _} = useIntl();
  const [passwordValue, setPasswordValue] = useState<string>('');

  const onSubmit = () => {
    onSubmitPassword(passwordValue);
  };

  return (
    <Modal>
      <Container style={{maxWidth: '400px'}}>
        <H2 style={{whiteSpace: 'break-spaces', fontWeight: 500, marginTop: '10px', textAlign: 'center'}}>
          {conversationName
            ? _(guestLinkPasswordModalStrings.headline, {conversationName})
            : _(guestLinkPasswordModalStrings.headlineDefault)}
        </H2>
        <Text block fontSize="var(--font-size-base)" style={{marginBottom: 24}}>
          {_(guestLinkPasswordModalStrings.description)}
        </Text>
        <Form
          name="guest-password-join-form"
          data-uie-name="guest-password-join-form"
          onSubmit={onSubmit}
          autoComplete="off"
        >
          <Input
            data-uie-name="guest-link-join-password-input"
            name="guest-join-password"
            required
            placeholder={_(guestLinkPasswordModalStrings.passwordInputLabel)}
            label={_(guestLinkPasswordModalStrings.passwordInputLabel)}
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
            {_(guestLinkPasswordModalStrings.learnMoreLink)}
          </Text>
        </Link>
        <Button
          showLoading={isLoading}
          block
          type="button"
          disabled={!passwordValue}
          onClick={onSubmit}
          data-uie-name="guest-link-join-submit-button"
        >
          {_(guestLinkPasswordModalStrings.joinConversation)}
        </Button>
      </Container>
    </Modal>
  );
};

export {GuestLinkPasswordModal};
