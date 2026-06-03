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

import is from '@sindresorhus/is';
import {FormattedMessage} from 'react-intl';

import {ErrorMessage} from '@wireapp/react-ui-kit';

import {errorHandlerStrings} from 'Util/errorUtil';
import {validationErrorStrings} from 'Util/validationUtil';

type LabelledErrorValue = {
  label: string;
};

type MessageInterpolationValue = string | number | boolean | Date | JSX.Element | null | undefined;
type MessageInterpolationValues = Record<string, MessageInterpolationValue>;

const hasLabel = (value: unknown): value is LabelledErrorValue => {
  return is.object(value) && 'label' in value && is.string((value as LabelledErrorValue).label);
};

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

export function parseError(error: unknown): JSX.Element | null {
  if (error !== null && error !== undefined) {
    if (hasLabel(error) && Object.hasOwn(errorHandlerStrings, error.label)) {
      return (
        <ErrorMessage data-uie-name="error-message" data-uie-value={error.label}>
          <FormattedMessage id={errorHandlerStrings[error.label]} />
        </ErrorMessage>
      );
    }
    return (
      <ErrorMessage data-uie-name="error-message" data-uie-value={'unexpected-error'}>
        <FormattedMessage id="BackendError.unexpected" values={toMessageInterpolationValues(error)} />
      </ErrorMessage>
    );
  }
  return null;
}

export function parseValidationErrors(errors: unknown | unknown[]): JSX.Element[] {
  const errorMessages: unknown[] = ([] as unknown[]).concat(errors ?? []);
  return errorMessages.map(error => (
    <ErrorMessage
      data-uie-name="error-message"
      data-uie-value={hasLabel(error) ? error.label : 'unexpected-error'}
      key={hasLabel(error) ? error.label : 'unexpected-error'}
    >
      {hasLabel(error) && Object.hasOwn(validationErrorStrings, error.label) ? (
        <FormattedMessage id={validationErrorStrings[error.label]} />
      ) : (
        <FormattedMessage id="BackendError.unexpected" values={toMessageInterpolationValues(error)} />
      )}
    </ErrorMessage>
  ));
}
