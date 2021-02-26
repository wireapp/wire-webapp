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
import VerificationMessage, {VerificationMessageProps} from './VerificationMessage';
import {VerificationMessage as VerificationMessageEntity} from 'src/script/entity/message/VerificationMessage';
import {VerificationMessageType} from 'src/script/message/VerificationMessageType';

class VerificationMessagePage extends TestPage<VerificationMessageProps> {
  constructor(props?: VerificationMessageProps) {
    super(VerificationMessage, props);
  }

  getVerificationMessage = (verificationMessageType?: VerificationMessageType) =>
    this.get(
      `[data-uie-name="element-message-verification"]${
        verificationMessageType ? `[data-uie-value="${verificationMessageType}"]` : ''
      }`,
    );
  getVerifiedIcon = () => this.get('svg[data-uie-name="user-device-verified"]');
  getNotVerifiedIcon = () => this.get('svg[data-uie-name="user-device-not-verified"]');
}

const createVerificationMessage = (partialVerificationMessage: Partial<VerificationMessageEntity>) => {
  const verificationMessage: Partial<VerificationMessageEntity> = {
    isSelfClient: ko.pureComputed(() => false),
    unsafeSenderName: ko.pureComputed(() => 'senderName'),
    userEntities: ko.observableArray([]),
    userIds: ko.observableArray([]),
    verificationMessageType: ko.observable(undefined),
    ...partialVerificationMessage,
  };
  return verificationMessage as VerificationMessageEntity;
};

describe('VerificationMessage', () => {
  describe('with verified message', () => {
    it('shows verified icon when message is verified', async () => {
      const verificationMessagePage = new VerificationMessagePage({
        message: createVerificationMessage({
          verificationMessageType: ko.observable(VerificationMessageType.VERIFIED),
        }),
      });

      expect(verificationMessagePage.getVerificationMessage(VerificationMessageType.VERIFIED).exists()).toBe(true);
      expect(verificationMessagePage.getVerifiedIcon().exists()).toBe(true);
    });

    it('shows unverified icon when message is not verified', async () => {
      const verificationMessagePage = new VerificationMessagePage({
        message: createVerificationMessage({}),
      });

      expect(verificationMessagePage.getVerificationMessage().exists()).toBe(true);
      expect(verificationMessagePage.getNotVerifiedIcon().exists()).toBe(true);
    });
  });

  describe('with unverified message', () => {
    it('shows unverified message', async () => {
      const verificationMessagePage = new VerificationMessagePage({
        message: createVerificationMessage({
          verificationMessageType: ko.observable(VerificationMessageType.UNVERIFIED),
        }),
      });

      expect(verificationMessagePage.getVerificationMessage(VerificationMessageType.UNVERIFIED).exists()).toBe(true);
      expect(verificationMessagePage.getVerifiedIcon().exists()).toBe(false);
      expect(verificationMessagePage.getNotVerifiedIcon().exists()).toBe(true);
    });
  });

  describe('with new device message', () => {
    it('shows new device message', async () => {
      const verificationMessagePage = new VerificationMessagePage({
        message: createVerificationMessage({
          verificationMessageType: ko.observable(VerificationMessageType.NEW_DEVICE),
        }),
      });

      expect(verificationMessagePage.getVerificationMessage(VerificationMessageType.NEW_DEVICE).exists()).toBe(true);
      expect(verificationMessagePage.getVerifiedIcon().exists()).toBe(false);
      expect(verificationMessagePage.getNotVerifiedIcon().exists()).toBe(true);
    });
  });

  describe('with new member message', () => {
    it('shows new member message', async () => {
      const verificationMessagePage = new VerificationMessagePage({
        message: createVerificationMessage({
          verificationMessageType: ko.observable(VerificationMessageType.NEW_MEMBER),
        }),
      });

      expect(verificationMessagePage.getVerificationMessage(VerificationMessageType.NEW_MEMBER).exists()).toBe(true);
      expect(verificationMessagePage.getVerifiedIcon().exists()).toBe(false);
      expect(verificationMessagePage.getNotVerifiedIcon().exists()).toBe(true);
    });
  });
});
