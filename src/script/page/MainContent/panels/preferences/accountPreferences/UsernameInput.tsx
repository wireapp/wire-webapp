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

import {FormEvent, useState} from 'react';

import cx from 'classnames';

import {validateHandle} from 'Repositories/user/UserHandleGenerator';
import {UserRepository} from 'Repositories/user/UserRepository';
import {t} from 'Util/LocalizerUtil';

import {AccountInput, useInputDone} from './AccountInput';

import {UserError} from '../../../../../error/UserError';

enum UserNameState {
  AVAILABLE = 'AVAILABLE',
  TAKEN = 'TAKEN',
}
interface UsernameInputProps {
  canEditProfile: boolean;
  domain?: string;
  username: string;
  userRepository: UserRepository;
}

const UsernameInput = ({username, domain, userRepository, canEditProfile}: UsernameInputProps) => {
  const [errorState, setErrorState] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [requestedName, setRequestedName] = useState<string | null>(null);
  const [submittedName, setSubmittedName] = useState<string | null>(null);
  const usernameInputDone = useInputDone();

  const verifyUsername = (enteredUsername: string): void => {
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

  const changeUsername = async (newUsername: string): Promise<void> => {
    const normalizedUsername = newUsername.toLowerCase();
    setRequestedName(normalizedUsername);

    const isUnchanged = normalizedUsername === username;
    if (isUnchanged) {
      usernameInputDone.done();
      return;
    }

    const isInvalidName = normalizedUsername.length < UserRepository.CONFIG.MINIMUM_USERNAME_LENGTH;
    if (isInvalidName) {
      setErrorState(null);
      return;
    }

    setSubmittedName(normalizedUsername);
    try {
      await userRepository.changeUsername(normalizedUsername);

      const isCurrentRequest = requestedName === submittedName;
      if (isCurrentRequest) {
        setErrorState(null);
        usernameInputDone.done();
      }
    } catch (error) {
      if (error instanceof UserError) {
        const isUsernameTaken = error.type === UserError.TYPE.USERNAME_TAKEN;
        const isCurrentRequest = requestedName === submittedName;
        if (isUsernameTaken && isCurrentRequest) {
          setErrorState(UserNameState.TAKEN);
        }
      }
    }
  };
  return (
    <div>
      <AccountInput
        label={t('preferencesAccountUsername')}
        value={username}
        onInput={({target}: FormEvent) => verifyUsername((target as HTMLInputElement).value)}
        readOnly={!canEditProfile}
        prefix="@"
        suffix={domain && `@${domain}`}
        setIsEditing={setIsEditing}
        isDone={usernameInputDone.isDone}
        onValueChange={changeUsername}
        maxLength={256 - (domain?.length ?? 0)}
        allowedChars="0-9a-zA-Z_.-"
        fieldName="username"
      />
      {canEditProfile && (
        <p
          className={cx('font-size-xs', {
            'preferences-account-username-error': errorState,
            'text-foreground': !errorState,
            'text-red': errorState === UserNameState.TAKEN,
          })}
          css={{margin: '-15px 0 0 8px'}}
        >
          {isEditing && (
            <>
              {errorState === UserNameState.AVAILABLE && t('preferencesAccountUsernameAvailable')}
              {errorState === UserNameState.TAKEN && t('preferencesAccountUsernameErrorTaken')}
              {!errorState && t('preferencesAccountUsernameHint')}
            </>
          )}
        </p>
      )}
    </div>
  );
};

export {UsernameInput};
