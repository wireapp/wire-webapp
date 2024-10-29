/*
 * Wire
 * Copyright (C) 2024 Wire Swiss GmbH
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

import {COLOR, Form, Link, Text} from '@wireapp/react-ui-kit';

import {Config} from 'src/script/Config';
import {t} from 'Util/LocalizerUtil';

interface JoinGuesLinkPasswordFormProps {
  onFormSubmit: () => void;
  inputValue: string;
  onInputChange: (value: string) => void;
}

export const JoinGuesLinkPasswordForm = ({onFormSubmit, inputValue, onInputChange}: JoinGuesLinkPasswordFormProps) => {
  return (
    <Form
      name="guest-password-join-form"
      data-uie-name="guest-password-join-form"
      onSubmit={onFormSubmit}
      autoComplete="off"
    >
      <label
        style={{
          fontSize: '0.875rem',
          fontWeight: 400,
          lineHeight: '1rem',
          color: 'var(--text-input-label)',
          marginBottom: 2,
        }}
        htmlFor="modal_pswd"
      >
        {t('guestLinkPasswordModal.passwordInputLabel')}
      </label>

      <input
        style={{
          boxShadow: '0 0 0 1px var(--text-input-border)',
          borderRadius: 12,
          margin: 0,
        }}
        id="modal_pswd"
        className="modal__input"
        type="password"
        value={inputValue}
        placeholder={t('guestLinkPasswordModal.passwordInputPlaceholder')}
        onChange={event => onInputChange(event.target.value)}
      />

      <Link style={{marginTop: 24}} href={Config.getConfig().URL.SUPPORT.LEARN_MORE_ABOUT_GUEST_LINKS} target="_blank">
        <Text block color={COLOR.BLUE} style={{textDecoration: 'underline', marginBottom: 24}}>
          {t('guestLinkPasswordModal.learnMoreLink')}
        </Text>
      </Link>
    </Form>
  );
};
