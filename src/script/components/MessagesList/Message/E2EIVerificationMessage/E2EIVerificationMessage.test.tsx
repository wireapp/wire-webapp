/*
 * Wire
 * Copyright (C) 2023 Wire Swiss GmbH
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

import {Conversation} from 'Repositories/entity/Conversation';
import {E2EIVerificationMessage as VerificationMessageEntity} from 'Repositories/entity/message/E2EIVerificationMessage';
import {User} from 'Repositories/entity/User';
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
  const conversation = new Conversation();

  describe('with verified message', () => {
    it('shows verified icon when message is verified', async () => {
      const message = createVerificationMessage({
        messageType: E2EIVerificationMessageType.VERIFIED,
      });

      const {getByTestId} = render(
        withTheme(<E2EIVerificationMessage message={message} conversation={conversation} />),
      );

      const elementMessageVerification = getByTestId('element-message-verification');
      expect(elementMessageVerification.getAttribute('data-uie-value')).toEqual(E2EIVerificationMessageType.VERIFIED);
    });
  });

  describe('with degraded message', () => {
    const user = new User('user1');

    it('show new unverified device added', async () => {
      const message = createVerificationMessage({
        messageType: E2EIVerificationMessageType.NEW_DEVICE,
        userIds: [user.qualifiedId],
      });

      const {getByTestId} = render(
        withTheme(<E2EIVerificationMessage message={message} conversation={conversation} />),
      );

      const elementMessageVerification = getByTestId('element-message-verification');
      expect(elementMessageVerification.getAttribute('data-uie-value')).toEqual(E2EIVerificationMessageType.NEW_DEVICE);
    });

    it('show new unverified user added', async () => {
      const message = createVerificationMessage({
        messageType: E2EIVerificationMessageType.NEW_MEMBER,
        userIds: [user.qualifiedId],
      });

      const {getByTestId} = render(
        withTheme(<E2EIVerificationMessage message={message} conversation={conversation} />),
      );

      const elementMessageVerification = getByTestId('element-message-verification');
      expect(elementMessageVerification.getAttribute('data-uie-value')).toEqual(E2EIVerificationMessageType.NEW_MEMBER);
    });

    it('show certificate expired', async () => {
      const message = createVerificationMessage({
        messageType: E2EIVerificationMessageType.EXPIRED,
        userIds: [user.qualifiedId],
      });

      const {getByTestId} = render(
        withTheme(<E2EIVerificationMessage message={message} conversation={conversation} />),
      );

      const elementMessageVerification = getByTestId('element-message-verification');
      expect(elementMessageVerification.getAttribute('data-uie-value')).toEqual(E2EIVerificationMessageType.EXPIRED);
    });

    it('show certificate revoked', async () => {
      const message = createVerificationMessage({
        messageType: E2EIVerificationMessageType.REVOKED,
        userIds: [user.qualifiedId],
      });

      const {getByTestId} = render(
        withTheme(<E2EIVerificationMessage message={message} conversation={conversation} />),
      );

      const elementMessageVerification = getByTestId('element-message-verification');
      expect(elementMessageVerification.getAttribute('data-uie-value')).toEqual(E2EIVerificationMessageType.REVOKED);
    });

    it('show certificate no longer verified', async () => {
      const message = createVerificationMessage({
        messageType: E2EIVerificationMessageType.NO_LONGER_VERIFIED,
        userIds: [user.qualifiedId],
      });

      const {getByTestId} = render(
        withTheme(<E2EIVerificationMessage message={message} conversation={conversation} />),
      );

      const elementMessageVerification = getByTestId('element-message-verification');
      expect(elementMessageVerification.getAttribute('data-uie-value')).toEqual(
        E2EIVerificationMessageType.NO_LONGER_VERIFIED,
      );
    });
  });
});
