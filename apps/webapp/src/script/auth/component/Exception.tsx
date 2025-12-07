/*
 * Wire
 * Copyright (C) 2020 Wire Swiss GmbH
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

import {Fragment} from 'react';

import {FormattedMessage} from 'react-intl';
import {errorHandlerStrings} from 'Util/ErrorUtil';
import {validationErrorStrings} from 'Util/ValidationUtil';

import {ErrorMessage, Link} from '@wireapp/react-ui-kit';

import {Config} from '../../Config';

interface ExceptionProps {
  errors: any[];
}

const Exception = ({errors = []}: ExceptionProps) => {
  return (
    <Fragment>
      {errors.map(error => {
        const translatedErrors = {...validationErrorStrings, ...errorHandlerStrings};
        if (!error) {
          return null;
        }
        return (
          <ErrorMessage
            data-uie-name="error-message"
            data-uie-value={error.label || 'unexpected-error'}
            key={error.label || 'unexpected-error'}
          >
            {translatedErrors.hasOwnProperty(error.label) ? (
              <FormattedMessage
                id={translatedErrors[error.label]}
                values={{
                  minPasswordLength: Config.getConfig().MINIMUM_PASSWORD_LENGTH,
                  supportEmailExistsLink: (
                    <Link targetBlank href={Config.getConfig().URL.SUPPORT.EMAIL_EXISTS}>
                      <FormattedMessage id="BackendError.learnMore" />
                    </Link>
                  ),
                  supportKeychainLink: (
                    <Link targetBlank href={Config.getConfig().URL.SUPPORT.SYSTEM_KEYCHAIN_ACCESS}>
                      <FormattedMessage id="LabeledError.howToLogIn" />
                    </Link>
                  ),
                }}
              />
            ) : (
              <FormattedMessage id="BackendError.unexpected" values={error} />
            )}
          </ErrorMessage>
        );
      })}
    </Fragment>
  );
};

export {Exception};
