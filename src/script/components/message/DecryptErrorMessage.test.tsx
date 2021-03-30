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

import ko from 'knockout';
import TestPage from 'Util/test/TestPage';
import {DecryptErrorMessage as DecryptErrorMessageEntity} from 'src/script/entity/message/DecryptErrorMessage';
import DecryptErrorMessage, {DecryptErrorMessageProps} from './DecryptErrorMessage';
import {act} from 'react-dom/test-utils';

class DecryptErrorMessagePage extends TestPage<DecryptErrorMessageProps> {
  constructor(props?: DecryptErrorMessageProps) {
    super(DecryptErrorMessage, props);
  }

  getDecryptErrorMessage = () => this.get('[data-uie-name="element-message-decrypt-error"]');
  getDecryptErrorLink = () => this.get('[data-uie-name="go-decrypt-error-link"]');
  getDecryptErrorLabel = () => this.get('[data-uie-name="status-decrypt-error"]');
  getResetEncryptionSessionLink = () => this.get('[data-uie-name="do-reset-encryption-session"]');
  getResetEncryptionSessionLoadingSpinner = () => this.get('[data-uie-name="status-loading"]');

  clickResetEncryptionSessionLink = () => this.click(this.getResetEncryptionSessionLink());
}

const createDecryptErrorMessage = (partialDecryptErrorMessage: Partial<DecryptErrorMessageEntity>) => {
  const decryptErrorMessage: Partial<DecryptErrorMessageEntity> = {
    htmlCaption: ko.pureComputed(() => ''),
    is_recoverable: ko.pureComputed(() => false),
    is_resetting_session: ko.observable(false),
    link: ko.pureComputed(() => ''),
    ...partialDecryptErrorMessage,
  };
  return decryptErrorMessage as DecryptErrorMessageEntity;
};

describe('DecryptErrorMessage', () => {
  it('shows "reset session" action when error is recoverable', async () => {
    const isRecoverable = ko.observable(false);
    const decryptErrorMessagePage = new DecryptErrorMessagePage({
      message: createDecryptErrorMessage({
        is_recoverable: ko.pureComputed(() => isRecoverable()),
      }),
      onClickResetSession: jest.fn(),
    });

    expect(decryptErrorMessagePage.getDecryptErrorMessage().exists()).toBe(true);
    expect(decryptErrorMessagePage.getResetEncryptionSessionLink().exists()).toBe(false);
    act(() => {
      isRecoverable(true);
    });
    decryptErrorMessagePage.update();

    expect(decryptErrorMessagePage.getResetEncryptionSessionLink().exists()).toBe(true);
  });

  it('shows loading spinner during session reset', async () => {
    const isResetting = ko.observable(false);
    const decryptErrorMessagePage = new DecryptErrorMessagePage({
      message: createDecryptErrorMessage({
        is_recoverable: ko.pureComputed(() => true),
        is_resetting_session: isResetting,
      }),
      onClickResetSession: () => {
        isResetting(true);
      },
    });

    expect(decryptErrorMessagePage.getDecryptErrorMessage().exists()).toBe(true);
    expect(decryptErrorMessagePage.getResetEncryptionSessionLoadingSpinner().exists()).toBe(false);
    expect(decryptErrorMessagePage.getResetEncryptionSessionLink().exists()).toBe(true);

    decryptErrorMessagePage.clickResetEncryptionSessionLink();

    expect(decryptErrorMessagePage.getResetEncryptionSessionLink().exists()).toBe(false);
    expect(decryptErrorMessagePage.getResetEncryptionSessionLoadingSpinner().exists()).toBe(true);

    act(() => {
      isResetting(false);
    });
    decryptErrorMessagePage.update();

    expect(decryptErrorMessagePage.getResetEncryptionSessionLink().exists()).toBe(true);
    expect(decryptErrorMessagePage.getResetEncryptionSessionLoadingSpinner().exists()).toBe(false);
  });
});
