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

/** @jsx jsx */
import {jsx} from '@emotion/core';
import {ErrorMessage} from '@wireapp/react-ui-kit';
import {Fragment} from 'react';
import {FormattedMessage} from 'react-intl';
import {errorHandlerStrings, validationErrorStrings} from '../../strings';
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
                {...translatedErrors[error.label]}
                values={{
                  minPasswordLength: Config.getConfig().MINIMUM_PASSWORD_LENGTH,
                  supportEmailExistsLink: (
                    <a target="_blank" rel="noopener noreferrer" href={Config.getConfig().URL.SUPPORT.EMAIL_EXISTS}>
                      <FormattedMessage {...errorHandlerStrings.learnMore} />
                    </a>
                  ),
                }}
              />
            ) : (
              <FormattedMessage {...translatedErrors.unexpected} values={error} />
            )}
          </ErrorMessage>
        );
      })}
    </Fragment>
  );
};

export default Exception;
