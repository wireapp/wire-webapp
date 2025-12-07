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

import {FormattedMessage} from 'react-intl';
import {errorHandlerStrings} from 'Util/ErrorUtil';
import {validationErrorStrings} from 'Util/ValidationUtil';

import {ErrorMessage} from '@wireapp/react-ui-kit';

export function parseError(error: any): JSX.Element | null {
  if (error) {
    if (errorHandlerStrings.hasOwnProperty(error.label)) {
      return (
        <ErrorMessage data-uie-name="error-message" data-uie-value={error.label}>
          <FormattedMessage id={errorHandlerStrings[error.label]} />
        </ErrorMessage>
      );
    }
    return (
      <ErrorMessage data-uie-name="error-message" data-uie-value={'unexpected-error'}>
        <FormattedMessage id="BackendError.unexpected" values={error} />
      </ErrorMessage>
    );
  }
  return null;
}

export function parseValidationErrors(errors: any | any[]): JSX.Element[] {
  const errorMessages = [].concat(errors || []);
  return errorMessages.map(error => (
    <ErrorMessage data-uie-name="error-message" data-uie-value={error.label} key={error.label}>
      {validationErrorStrings.hasOwnProperty(error.label) ? (
        <FormattedMessage id={validationErrorStrings[error.label]} />
      ) : (
        <FormattedMessage id="BackendError.unexpected" values={error} />
      )}
    </ErrorMessage>
  ));
}
