/*
 * Wire
 * Copyright (C) 2019 Wire Swiss GmbH
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

import {GenericMessage, Knock, LegalHoldStatus} from '@wireapp/protocol-messaging';
import {createRandomUuid} from 'Util/util';
import {CryptographyMapper} from '../cryptography/CryptographyMapper';
import {GENERIC_MESSAGE_TYPE} from '../cryptography/GenericMessageType';
import {PROTO_MESSAGE_TYPE} from '../cryptography/ProtoMessageType';
import * as LegalHoldEvaluator from './LegalHoldEvaluator';

describe('LegalHoldEvaluator', () => {
  describe('hasMessageLegalHoldFlag', () => {
    let cryptographyMapper: CryptographyMapper;

    beforeEach(() => {
      cryptographyMapper = new CryptographyMapper();
    });

    it('knows when a message has a legal hold flag', async () => {
      const legalHoldFlagOn = new GenericMessage({
        [GENERIC_MESSAGE_TYPE.KNOCK]: new Knock({
          [PROTO_MESSAGE_TYPE.LEGAL_HOLD_STATUS]: LegalHoldStatus.ENABLED,
          hotKnock: false,
        }),
        messageId: createRandomUuid(),
      });

      const legalHoldFlagOff = new GenericMessage({
        [GENERIC_MESSAGE_TYPE.KNOCK]: new Knock({
          [PROTO_MESSAGE_TYPE.LEGAL_HOLD_STATUS]: LegalHoldStatus.DISABLED,
          hotKnock: false,
        }),
        messageId: createRandomUuid(),
      });

      const legalHoldFlagMissing = new GenericMessage({
        [GENERIC_MESSAGE_TYPE.KNOCK]: new Knock({
          hotKnock: false,
        }),
        messageId: createRandomUuid(),
      });

      const event: Object = {
        conversation: createRandomUuid(),
        data: {
          recipient: 'd4c1a1838944deb1',
          sender: '494fd7d7613e0358',
          text: 'something-secure',
        },
        from: createRandomUuid(),
        time: new Date().toISOString(),
        type: 'conversation.otr-message-add',
      };

      let actual = await cryptographyMapper.mapGenericMessage(legalHoldFlagOn, event);
      expect(LegalHoldEvaluator.hasMessageLegalHoldFlag(actual)).toBe(true);

      actual = await cryptographyMapper.mapGenericMessage(legalHoldFlagOff, event);
      expect(LegalHoldEvaluator.hasMessageLegalHoldFlag(actual)).toBe(true);

      actual = await cryptographyMapper.mapGenericMessage(legalHoldFlagMissing, event);
      expect(LegalHoldEvaluator.hasMessageLegalHoldFlag(actual)).toBe(false);
    });
  });
});
