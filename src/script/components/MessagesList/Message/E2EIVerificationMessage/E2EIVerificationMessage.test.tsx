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

import {render} from '@testing-library/react';
import ko from 'knockout';

import {E2EIVerificationMessage as VerificationMessageEntity} from 'src/script/entity/message/E2EIVerificationMessage';
import {E2EIVerificationMessageType} from 'src/script/message/E2EIVerificationMessageType';

import {E2EIVerificationMessage} from './E2EIVerificationMessage';

import {withTheme} from '../../../../auth/util/test/TestUtil';

const createVerificationMessage = (partialVerificationMessage: Partial<VerificationMessageEntity>) => {
  const verificationMessage: Partial<VerificationMessageEntity> = {
    ...partialVerificationMessage,
  };
  return verificationMessage as VerificationMessageEntity;
};

describe('E2EIVerificationMessage', () => {
  describe('with verified message', () => {
    it('shows verified icon when message is verified', async () => {
      const message = createVerificationMessage({
        messageType: ko.observable<E2EIVerificationMessageType>(E2EIVerificationMessageType.VERIFIED),
      });

      const {getByTestId} = render(withTheme(<E2EIVerificationMessage message={message} />));

      const elementMessageVerification = getByTestId('element-message-verification');
      expect(elementMessageVerification.getAttribute('data-uie-value')).toEqual(E2EIVerificationMessageType.VERIFIED);
    });
  });

  // TODO: Add more test for another e2ei verification states
});
