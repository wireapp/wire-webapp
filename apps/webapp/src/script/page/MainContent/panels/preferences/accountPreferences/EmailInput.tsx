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

import {StatusCodes as HTTP_STATUS} from 'http-status-codes';

import {PrimaryModal} from 'Components/Modals/PrimaryModal';
import {UserRepository} from 'Repositories/user/userRepository';
import {useApplicationContext} from 'src/script/page/RootProvider';
import {getLogger} from 'Util/logger';
import {isErrorWithCode} from 'Util/typePredicateUtil';

import {AccountInput, useInputDone} from './AccountInput';

interface EmailInputProps {
  canEditProfile: boolean;
  email: string;
  userRepository: UserRepository;
}

const logger = getLogger('EmailInput');

const EmailInput = ({email, canEditProfile, userRepository}: EmailInputProps) => {
  const emailInputDone = useInputDone();
  const {translate} = useApplicationContext();

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
      showWarning(translate('modalPreferencesAccountEmailHeadline'), translate('authPostedResendDetail'));
    } catch (error: unknown) {
      logger.warn('Failed to send reset email request', error);
      if (isErrorWithCode(error) && error.code === HTTP_STATUS.BAD_REQUEST) {
        showWarning(
          translate('modalPreferencesAccountEmailErrorHeadline'),
          translate('modalPreferencesAccountEmailInvalidMessage'),
        );
      }
      if (isErrorWithCode(error) && error.code === HTTP_STATUS.CONFLICT) {
        showWarning(
          translate('modalPreferencesAccountEmailErrorHeadline'),
          translate('modalPreferencesAccountEmailTakenMessage'),
        );
      }
    }
  };

  return (
    <AccountInput
      label={translate('preferencesAccountEmail')}
      value={email}
      readOnly={!canEditProfile}
      onValueChange={changeEmail}
      isDone={emailInputDone.isDone}
      fieldName="email"
    />
  );
};

export {EmailInput};
