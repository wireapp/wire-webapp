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

import {Button, ButtonVariant} from '@wireapp/react-ui-kit';

import * as Icon from 'Components/Icon';
import {t} from 'Util/LocalizerUtil';
import {generateRandomPassword} from 'Util/StringUtil';

interface PasswordGeneratorButtonProps {
  passwordLength?: number;
  onGeneratePassword: (password: string) => void;
}

export const PasswordGeneratorButton = ({passwordLength = 8, onGeneratePassword}: PasswordGeneratorButtonProps) => {
  const generatePassword = () => {
    const password = generateRandomPassword(passwordLength);
    onGeneratePassword(password);
  };

  return (
    <Button variant={ButtonVariant.TERTIARY} onClick={generatePassword} data-uie-name="do-generate-password">
      <Icon.ShieldIcon data-uie-name="generate-password-icon" width="16" height="16" css={{marginRight: '10px'}} />
      {t('generatePassword')}
    </Button>
  );
};
