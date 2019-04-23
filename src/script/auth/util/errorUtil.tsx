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

import {ErrorMessage} from '@wireapp/react-ui-kit';
import * as React from 'react';
import {FormattedHTMLMessage} from 'react-intl';
import {errorHandlerStrings, validationErrorStrings} from '../../strings';

export function parseError(error: any) {
  if (error) {
    if (errorHandlerStrings.hasOwnProperty(error.label)) {
      return <FormattedHTMLMessage {...errorHandlerStrings[error.label]} />;
    }
    return <FormattedHTMLMessage {...errorHandlerStrings.unexpected} values={error} />;
  }
  return null;
}

export function parseValidationErrors(errors: any | any[]) {
  const errorMessages = [].concat(errors || []);
  return errorMessages.map(error => (
    <ErrorMessage data-uie-name="error-message" key={error.label}>
      {validationErrorStrings.hasOwnProperty(error.label) ? (
        <FormattedHTMLMessage {...validationErrorStrings[error.label]} />
      ) : (
        <FormattedHTMLMessage {...validationErrorStrings.unexpected} values={error} />
      )}
    </ErrorMessage>
  ));
}
