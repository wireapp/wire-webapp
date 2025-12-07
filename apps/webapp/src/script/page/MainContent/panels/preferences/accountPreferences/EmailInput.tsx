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

import {PrimaryModal} from 'Components/Modals/PrimaryModal';
import {StatusCodes as HTTP_STATUS} from 'http-status-codes';
import {UserRepository} from 'Repositories/user/UserRepository';
import {t} from 'Util/LocalizerUtil';
import {getLogger} from 'Util/Logger';

import {AccountInput, useInputDone} from './AccountInput';

interface EmailInputProps {
  canEditProfile: boolean;
  email: string;
  userRepository: UserRepository;
}

const logger = getLogger('EmailInput');

const EmailInput = ({email, canEditProfile, userRepository}: EmailInputProps) => {
  const emailInputDone = useInputDone();

  const changeEmail = async (enteredEmail: string): Promise<void> => {
    const showWarning = (title: string, message: string) => {
      PrimaryModal.show(PrimaryModal.type.ACKNOWLEDGE, {
        text: {
          message,
          title,
        },
      });
    };
    try {
      await userRepository.changeEmail(enteredEmail);
      emailInputDone.done();
      showWarning(t('modalPreferencesAccountEmailHeadline'), t('authPostedResendDetail'));
    } catch (error) {
      logger.warn('Failed to send reset email request', error);
      if (error.code === HTTP_STATUS.BAD_REQUEST) {
        showWarning(t('modalPreferencesAccountEmailErrorHeadline'), t('modalPreferencesAccountEmailInvalidMessage'));
      }
      if (error.code === HTTP_STATUS.CONFLICT) {
        showWarning(t('modalPreferencesAccountEmailErrorHeadline'), t('modalPreferencesAccountEmailTakenMessage'));
      }
    }
  };

  return (
    <AccountInput
      label={t('preferencesAccountEmail')}
      value={email}
      readOnly={!canEditProfile}
      onValueChange={changeEmail}
      isDone={emailInputDone.isDone}
      fieldName="email"
    />
  );
};

export {EmailInput};
