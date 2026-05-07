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

import is from '@sindresorhus/is';
import {FormattedMessage} from 'react-intl';

import {ErrorMessage, Link} from '@wireapp/react-ui-kit';

import {errorHandlerStrings} from 'Util/errorUtil';
import {validationErrorStrings} from 'Util/validationUtil';

import {Config} from '../../Config';

interface ExceptionProps {
  errors: unknown[];
}

type MessageInterpolationValue = string | number | boolean | Date | JSX.Element | null | undefined;
type MessageInterpolationValues = Record<string, MessageInterpolationValue>;

const toMessageInterpolationValues = (value: unknown): MessageInterpolationValues | undefined => {
  if (!is.object(value)) {
    return undefined;
  }

  const entries = Object.entries(value).filter((entry): entry is [string, MessageInterpolationValue] => {
    const [entryKey, entryValue] = entry;
    return (
      is.nonEmptyString(entryKey) &&
      (entryValue === null ||
        entryValue === undefined ||
        is.string(entryValue) ||
        is.number(entryValue) ||
        is.boolean(entryValue) ||
        is.date(entryValue))
    );
  });

  return entries.length > 0 ? Object.fromEntries(entries) : undefined;
};

const Exception = ({errors = []}: ExceptionProps) => {
  return (
    <Fragment>
      {errors.map(error => {
        const translatedErrors = {...validationErrorStrings, ...errorHandlerStrings};
        if (!is.object(error) || !('label' in error)) {
          return null;
        }
        const errorLabel = is.string(error.label) ? error.label : 'unexpected-error';
        return (
          <ErrorMessage data-uie-name="error-message" data-uie-value={errorLabel} key={errorLabel}>
            {Object.hasOwn(translatedErrors, errorLabel) ? (
              <FormattedMessage
                id={translatedErrors[errorLabel]}
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
              <FormattedMessage id="BackendError.unexpected" values={toMessageInterpolationValues(error)} />
            )}
          </ErrorMessage>
        );
      })}
    </Fragment>
  );
};

export {Exception};
