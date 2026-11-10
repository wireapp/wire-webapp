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

import type {FormEvent, FunctionComponent} from 'react';

import {labelStyles, inputStyles, linkStyles, linkTextStyles} from './JoinGuestLinkPasswordForm.styles';

import {Config} from '../../../../Config';
import {COLOR} from '../../../../uiKit/identity/colors/colors';
import {Form} from '../../../../uiKit/inputs/form/form';
import {Link} from '../../../../uiKit/typography/link/link';
import {Text} from '../../../../uiKit/typography/text/text';
import type {Translate} from '../../../../util/localizerUtil';

interface JoinGuestLinkPasswordFormProps {
  readonly translate: Translate;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  inputValue: string;
  onInputChange: (value: string) => void;
}

export const JoinGuestLinkPasswordForm: FunctionComponent<JoinGuestLinkPasswordFormProps> = ({
  translate,
  onSubmit,
  inputValue,
  onInputChange,
}: JoinGuestLinkPasswordFormProps) => {
  return (
    <Form
      name="guest-password-join-form"
      data-uie-name="guest-password-join-form"
      onSubmit={onSubmit}
      autoComplete="off"
    >
      <label css={labelStyles} htmlFor="modal_pswd">
        {translate('guestLinkPasswordModal.passwordInputLabel')}
      </label>

      <input
        css={inputStyles}
        id="modal_pswd"
        className="modal__input"
        type="password"
        value={inputValue}
        placeholder={translate('guestLinkPasswordModal.passwordInputPlaceholder')}
        onChange={event => {
          return onInputChange(event.target.value);
        }}
      />

      <Link css={linkStyles} href={Config.getConfig().URL.SUPPORT.LEARN_MORE_ABOUT_GUEST_LINKS} target="_blank">
        <Text block color={COLOR.BLUE} css={linkTextStyles}>
          {translate('guestLinkPasswordModal.learnMoreLink')}
        </Text>
      </Link>
    </Form>
  );
};
