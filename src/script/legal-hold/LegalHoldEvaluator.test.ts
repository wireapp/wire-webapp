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

import {GenericMessage, LegalHoldStatus, Text} from '@wireapp/protocol-messaging';

import {createRandomUuid} from 'Util/util';

import {CryptographyMapper} from '../cryptography/CryptographyMapper';
import {GENERIC_MESSAGE_TYPE} from '../cryptography/GenericMessageType';
import {ClientEvent} from '../event/Client';
import {StatusType} from '../message/StatusType';
import {EventRecord} from '../storage';
import * as LegalHoldEvaluator from './LegalHoldEvaluator';

describe('LegalHoldEvaluator', () => {
  describe('hasMessageLegalHoldFlag', () => {
    let cryptographyMapper: CryptographyMapper;

    beforeEach(() => {
      cryptographyMapper = new CryptographyMapper();
    });

    it('knows when a message has legal hold enabled', async () => {
      const legalHoldFlagOn = new GenericMessage({
        [GENERIC_MESSAGE_TYPE.TEXT]: Text.create({
          content: 'TEST',
          expectsReadConfirmation: false,
          legalHoldStatus: LegalHoldStatus.ENABLED,
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
        type: ClientEvent.CONVERSATION.MESSAGE_ADD,
      };

      const mappedEvent = await cryptographyMapper.mapGenericMessage(legalHoldFlagOn, event as EventRecord);

      expect(LegalHoldEvaluator.hasMessageLegalHoldFlag(mappedEvent)).toBe(true);
    });

    it('knows when a message has legal hold disabled', async () => {
      const legalHoldFlagOff = new GenericMessage({
        [GENERIC_MESSAGE_TYPE.TEXT]: Text.create({
          content: 'TEST',
          expectsReadConfirmation: false,
          legalHoldStatus: LegalHoldStatus.DISABLED,
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
        type: ClientEvent.CONVERSATION.MESSAGE_ADD,
      };

      const mappedEvent = await cryptographyMapper.mapGenericMessage(legalHoldFlagOff, event as EventRecord);

      expect(LegalHoldEvaluator.hasMessageLegalHoldFlag(mappedEvent)).toBe(true);
    });

    it('knows when a message is missing a legal hold flag', async () => {
      const legalHoldFlagMissing = new GenericMessage({
        [GENERIC_MESSAGE_TYPE.TEXT]: Text.create({
          content: 'TEST',
          expectsReadConfirmation: false,
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
        type: ClientEvent.CONVERSATION.MESSAGE_ADD,
      };

      const mappedEvent = await cryptographyMapper.mapGenericMessage(legalHoldFlagMissing, event as EventRecord);

      expect(LegalHoldEvaluator.hasMessageLegalHoldFlag(mappedEvent)).toBe(false);
    });
  });

  describe('renderLegalHoldMessage', () => {
    it('returns true when there is a state mismatch between message flag and conversation flag', () => {
      const enabledOnMessage = {
        data: {
          legal_hold_status: LegalHoldStatus.ENABLED,
        },
      };

      const disabledOnMessage = {
        data: {
          legal_hold_status: LegalHoldStatus.DISABLED,
        },
      };

      const mappedEvent: LegalHoldEvaluator.MappedEvent = {
        conversation: createRandomUuid(),
        from: createRandomUuid(),
        id: createRandomUuid(),
        status: StatusType.SENDING,
        time: new Date().toISOString(),
        type: ClientEvent.CONVERSATION.MESSAGE_ADD,
      };

      expect(
        LegalHoldEvaluator.renderLegalHoldMessage({...mappedEvent, ...enabledOnMessage}, LegalHoldStatus.ENABLED),
      ).toBe(false);

      expect(
        LegalHoldEvaluator.renderLegalHoldMessage({...mappedEvent, ...enabledOnMessage}, LegalHoldStatus.DISABLED),
      ).toBe(true);

      expect(
        LegalHoldEvaluator.renderLegalHoldMessage({...mappedEvent, ...disabledOnMessage}, LegalHoldStatus.ENABLED),
      ).toBe(true);

      expect(
        LegalHoldEvaluator.renderLegalHoldMessage({...mappedEvent, ...disabledOnMessage}, LegalHoldStatus.DISABLED),
      ).toBe(false);
    });
  });
});
