/*
 * Wire
 * Copyright (C) 2018 Wire Swiss GmbH
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

import {BackendError, BackendErrorLabel, StatusCode} from '.';
import {IdentifierExistsError, InvalidCredentialsError, LoginTooFrequentError, SuspendedAccountError} from '../auth';
import {ConversationIsUnknownError, ConversationOperationError} from '../conversation';
import {InviteEmailInUseError} from '../team';
import {InvalidInvitationCodeError} from '../team/index';
import {UnconnectedUserError, UserIsUnknownError} from '../user';

class BackendErrorMapper {
  public static get ERRORS(): {
    [code: number]: {
      [label: string]: {
        [message: string]: BackendError;
      };
    };
  } {
    return {
      [Number(StatusCode.BAD_REQUEST)]: {
        [String(BackendErrorLabel.CLIENT_ERROR)]: {
          ["[path] 'cnv' invalid: Failed reading: Invalid UUID"]: new ConversationIsUnknownError(
            'Conversation ID is unknown.'
          ),
          ["[path] 'usr' invalid: Failed reading: Invalid UUID"]: new UserIsUnknownError('User ID is unknown.'),
          ['Error in $: Failed reading: satisfy']: new BackendError('Wrong set of parameters.'),
        },
        [String(BackendErrorLabel.INVALID_INVITATION_CODE)]: {
          ['Invalid invitation code.']: new InvalidInvitationCodeError('Invalid invitation code.'),
        },
      },
      [Number(StatusCode.FORBIDDEN)]: {
        [String(BackendErrorLabel.INVALID_CREDENTIALS)]: {
          ['Authentication failed.']: new InvalidCredentialsError(
            'Authentication failed because of invalid credentials.'
          ),
        },
        [String(BackendErrorLabel.NOT_CONNECTED)]: {
          ['Users are not connected']: new UnconnectedUserError('Users are not connected.'),
        },
        [String(BackendErrorLabel.INVALID_OPERATION)]: {
          ['invalid operation for 1:1 conversations']: new ConversationOperationError('Cannot leave 1:1 conversation.'),
        },
        [String(BackendErrorLabel.SUSPENDED_ACCOUNT)]: {
          ['Account suspended.']: new SuspendedAccountError('Account suspended.'),
        },
      },
      [Number(StatusCode.TOO_MANY_REQUESTS)]: {
        [String(BackendErrorLabel.CLIENT_ERROR)]: {
          ['Logins too frequent']: new LoginTooFrequentError('Logins too frequent. User login temporarily disabled.'),
        },
      },
      [Number(StatusCode.CONFLICT)]: {
        [String(BackendErrorLabel.INVITE_EMAIL_EXISTS)]: {
          ['The given e-mail address is in use.']: new InviteEmailInUseError('The given e-mail address is in use.'),
        },
        [String(BackendErrorLabel.KEY_EXISTS)]: {
          ['The given e-mail address or phone number is in use.']: new IdentifierExistsError(
            'The given e-mail address or phone number is in use.'
          ),
        },
      },
    };
  }

  public static map(error: BackendError): BackendError {
    try {
      const mappedError: BackendError | undefined = BackendErrorMapper.ERRORS[Number(error.code)][error.label][
        error.message
      ] as BackendError;
      if (mappedError) {
        return mappedError;
      }
      return error;
    } catch (mappingError) {
      return error;
    }
  }
}

export {BackendErrorMapper};
