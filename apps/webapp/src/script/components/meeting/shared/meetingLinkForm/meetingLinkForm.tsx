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

import {CopyToClipboardButton} from 'Components/copyToClipboardButton';
import {PasswordFields, type PasswordFieldsProps} from 'Components/PasswordFields/PasswordFields';
import {PasswordGeneratorButton} from 'Components/PasswordGeneratorButton';
import {Config} from 'src/script/Config';

import {
  embeddedPasswordActionsStyles,
  embeddedPasswordSectionStyles,
  passwordFieldsStyles,
} from './meetingLinkForm.styles';

interface MeetingLinkFormProps extends Omit<PasswordFieldsProps, 'translate'> {
  translate: PasswordFieldsProps['translate'];
  copyDisabled: boolean;
  onGeneratePassword: (password: string) => void;
}

export const MeetingLinkForm = ({
  translate,
  onGeneratePassword,
  copyDisabled,
  ...passwordFieldsProps
}: MeetingLinkFormProps) => (
  <div css={embeddedPasswordSectionStyles}>
    <div css={embeddedPasswordActionsStyles}>
      <div>
        <PasswordGeneratorButton
          translate={translate}
          passwordLength={Config.getConfig().MINIMUM_PASSWORD_LENGTH}
          onGeneratePassword={onGeneratePassword}
        />
      </div>
      <div>
        <CopyToClipboardButton
          disabled={copyDisabled}
          textToCopy={passwordFieldsProps.passwordValue}
          displayText={translate('guestOptionsPasswordCopyToClipboard')}
          copySuccessText={translate('guestOptionsPasswordCopyToClipboardSuccess')}
        />
      </div>
    </div>
    <div css={passwordFieldsStyles}>
      <PasswordFields translate={translate} {...passwordFieldsProps} />
    </div>
  </div>
);
