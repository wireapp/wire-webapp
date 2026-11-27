/*
 * Wire
 * Copyright (C) 2026 Wire Swiss GmbH
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

import {render, screen} from '@testing-library/react';
import {IntlProvider} from 'react-intl';

import germanMessages from '../../../i18n/de-DE.json';

import {Exception} from './exception';

import {LabeledError} from '../module/action/labeledError';
import {withTheme} from '../util/test/testUtil';

const storageErrorLabel = LabeledError.GENERAL_ERRORS.CORE_CRYPTO_DATABASE_OPEN;
const storageErrorMessageId = 'LabeledError.GENERAL_ERRORS.CORE_CRYPTO_DATABASE_OPEN';
const englishStorageErrorMessage = 'Wire couldn’t open your local message storage. Please try logging in again.';
const germanMessagesWithoutStorageError: Record<string, string> = {...germanMessages};
delete germanMessagesWithoutStorageError[storageErrorMessageId];

describe('Exception', () => {
  it('uses the English storage message when the selected locale has no translation', () => {
    render(
      withTheme(
        <IntlProvider locale="de-DE" messages={germanMessagesWithoutStorageError} onError={jest.fn()}>
          <Exception errors={[{label: storageErrorLabel}]} />
        </IntlProvider>,
      ),
    );

    expect(screen.getByText(englishStorageErrorMessage)).toBeVisible();
  });

  it('uses the selected locale translation when available', () => {
    const localStorageErrorMessage = 'Lokalisierte Nachricht';

    render(
      withTheme(
        <IntlProvider
          locale="de-DE"
          messages={{...germanMessages, [storageErrorMessageId]: localStorageErrorMessage}}
          onError={jest.fn()}
        >
          <Exception errors={[{label: storageErrorLabel}]} />
        </IntlProvider>,
      ),
    );

    expect(screen.getByText(localStorageErrorMessage)).toBeVisible();
  });
});
