/*
 * Wire
 * Copyright (C) 2021 Wire Swiss GmbH
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
import cx from 'classnames';
import {UserError} from '../../../error/UserError';
import {validateHandle} from '../../../user/UserHandleGenerator';
import {UserRepository} from '../../../user/UserRepository';
import {UserNameState} from '../../../view_model/content/PreferencesAccountViewModel';
import {t} from 'Util/LocalizerUtil';
import AccountInput from './AccountInput';

interface UsernameInputProps {
  canEditProfile: boolean;
  domain: string;
  username: string;
  userRepository: UserRepository;
}

const UsernameInput: React.FC<UsernameInputProps> = ({username, domain, userRepository, canEditProfile}) => {
  const [errorState, setErrorState] = useState<string>(null);
  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [requestedName, setRequestedName] = useState<string>(null);

  const verifyUsername = (enteredUsername: string): void => {
    console.log({enteredUsername});
    const usernameTooShort = enteredUsername.length < UserRepository.CONFIG.MINIMUM_USERNAME_LENGTH;
    const usernameUnchanged = enteredUsername === username;
    if (usernameTooShort || usernameUnchanged) {
      return setErrorState(null);
    }

    setRequestedName(enteredUsername);

    if (validateHandle(enteredUsername)) {
      userRepository
        .verifyUserHandle(enteredUsername)
        .then(() => {
          const isCurrentRequest = requestedName === enteredUsername;
          if (isCurrentRequest) {
            setErrorState(UserNameState.AVAILABLE);
          }
        })
        .catch(error => {
          const isUsernameTaken = error.type === UserError.TYPE.USERNAME_TAKEN;
          const isCurrentRequest = requestedName === enteredUsername;
          if (isUsernameTaken && isCurrentRequest) {
            setErrorState(UserNameState.TAKEN);
          }
        });
    }
  };
  return (
    <div>
      <AccountInput
        label="Username"
        value={username}
        onInput={({target}) => verifyUsername((target as HTMLInputElement).value)}
        readOnly={!canEditProfile}
        prefix="@"
        suffix={`@${domain}`}
        setIsEditing={setIsEditing}
      />
      {canEditProfile && (
        <div
          className={cx('font-size-xs', {
            'preferences-account-username-error': errorState,
            'text-foreground': !errorState,
            'text-red': errorState === UserNameState.TAKEN,
          })}
        >
          {errorState === UserNameState.AVAILABLE && t('preferencesAccountUsernameAvailable')}
          {errorState === UserNameState.TAKEN && t('preferencesAccountUsernameErrorTaken')}
          {!errorState && isEditing && t('preferencesAccountUsernameHint')}
        </div>
      )}
    </div>
  );
};

export default UsernameInput;
