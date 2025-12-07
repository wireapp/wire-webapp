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
import {VerificationMessage as VerificationMessageEntity} from 'Repositories/entity/message/VerificationMessage';
import {User} from 'Repositories/entity/User';
import {VerificationMessageType} from 'src/script/message/VerificationMessageType';

import {QualifiedUserId} from '@wireapp/protocol-messaging';

import {VerificationMessage} from './VerificationMessage';

const createVerificationMessage = (partialVerificationMessage: Partial<VerificationMessageEntity>) => {
  const verificationMessage: Partial<VerificationMessageEntity> = {
    isSelfClient: ko.pureComputed(() => false),
    unsafeSenderName: ko.pureComputed(() => 'senderName'),
    userEntities: ko.observableArray([] as User[]),
    userIds: ko.observableArray([] as QualifiedUserId[]),
    ...partialVerificationMessage,
  };
  return verificationMessage as VerificationMessageEntity;
};

describe('VerificationMessage', () => {
  describe('with verified message', () => {
    it('shows verified icon when message is verified', async () => {
      const message = createVerificationMessage({
        verificationMessageType: ko.observable<VerificationMessageType>(VerificationMessageType.VERIFIED),
      });

      const {queryByTestId, getByTestId} = render(<VerificationMessage message={message} />);

      const elementMessageVerification = getByTestId('element-message-verification');
      expect(elementMessageVerification.getAttribute('data-uie-value')).toEqual(VerificationMessageType.VERIFIED);
      expect(queryByTestId('user-device-verified')).not.toBeNull();
    });

    it('shows unverified icon when message is not verified', async () => {
      const message = createVerificationMessage({});

      const {queryByTestId} = render(<VerificationMessage message={message} />);

      expect(queryByTestId('element-message-verification')).not.toBeNull();
      expect(queryByTestId('user-device-not-verified')).not.toBeNull();
    });
  });

  describe('with unverified message', () => {
    it('shows unverified message', async () => {
      const message = createVerificationMessage({
        verificationMessageType: ko.observable<VerificationMessageType>(VerificationMessageType.UNVERIFIED),
      });

      const {queryByTestId, getByTestId} = render(<VerificationMessage message={message} />);

      const elementMessageVerification = getByTestId('element-message-verification');
      expect(elementMessageVerification.getAttribute('data-uie-value')).toEqual(VerificationMessageType.UNVERIFIED);

      expect(queryByTestId('user-device-verified')).toBeNull();
      expect(queryByTestId('user-device-not-verified')).not.toBeNull();
    });
  });

  describe('with new device message', () => {
    it('shows new device message', async () => {
      const message = createVerificationMessage({
        verificationMessageType: ko.observable<VerificationMessageType>(VerificationMessageType.NEW_DEVICE),
      });

      const {queryByTestId, getByTestId} = render(<VerificationMessage message={message} />);

      const elementMessageVerification = getByTestId('element-message-verification');
      expect(elementMessageVerification.getAttribute('data-uie-value')).toEqual(VerificationMessageType.NEW_DEVICE);

      expect(queryByTestId('user-device-verified')).toBeNull();
      expect(queryByTestId('user-device-not-verified')).not.toBeNull();
    });
  });

  describe('with new member message', () => {
    it('shows new member message', async () => {
      const message = createVerificationMessage({
        verificationMessageType: ko.observable<VerificationMessageType>(VerificationMessageType.NEW_MEMBER),
      });

      const {queryByTestId, getByTestId} = render(<VerificationMessage message={message} />);

      const elementMessageVerification = getByTestId('element-message-verification');
      expect(elementMessageVerification.getAttribute('data-uie-value')).toEqual(VerificationMessageType.NEW_MEMBER);

      expect(queryByTestId('user-device-verified')).toBeNull();
      expect(queryByTestId('user-device-not-verified')).not.toBeNull();
    });
  });
});
