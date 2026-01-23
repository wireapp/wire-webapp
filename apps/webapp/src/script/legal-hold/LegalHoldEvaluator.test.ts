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

import {GenericMessageType} from '@wireapp/core/lib/conversation';

import {GenericMessage, LegalHoldStatus, Text} from '@wireapp/protocol-messaging';

import {CryptographyMapper} from 'Repositories/cryptography/CryptographyMapper';
import {createMessageAddEvent} from 'test/helper/EventGenerator';
import {createUuid} from 'Util/uuid';

import * as LegalHoldEvaluator from './LegalHoldEvaluator';

describe('LegalHoldEvaluator', () => {
  describe('hasMessageLegalHoldFlag', () => {
    let cryptographyMapper: CryptographyMapper;

    beforeEach(() => {
      cryptographyMapper = new CryptographyMapper();
    });

    it('knows when a message has legal hold enabled', async () => {
      const legalHoldFlagOn = new GenericMessage({
        [GenericMessageType.TEXT]: Text.create({
          content: 'TEST',
          expectsReadConfirmation: false,
          legalHoldStatus: LegalHoldStatus.ENABLED,
        }),
        messageId: createUuid(),
      });

      const event = createMessageAddEvent();

      const mappedEvent = await cryptographyMapper.mapGenericMessage(legalHoldFlagOn, event);

      expect(LegalHoldEvaluator.hasMessageLegalHoldFlag(mappedEvent)).toBe(true);
    });

    it('knows when a message has legal hold disabled', async () => {
      const legalHoldFlagOff = new GenericMessage({
        [GenericMessageType.TEXT]: Text.create({
          content: 'TEST',
          expectsReadConfirmation: false,
          legalHoldStatus: LegalHoldStatus.DISABLED,
        }),
        messageId: createUuid(),
      });

      const event = createMessageAddEvent();

      const mappedEvent = await cryptographyMapper.mapGenericMessage(legalHoldFlagOff, event);

      expect(LegalHoldEvaluator.hasMessageLegalHoldFlag(mappedEvent)).toBe(true);
    });

    it('knows when a message is missing a legal hold flag', async () => {
      const legalHoldFlagMissing = new GenericMessage({
        [GenericMessageType.TEXT]: Text.create({
          content: 'TEST',
          expectsReadConfirmation: false,
        }),
        messageId: createUuid(),
      });

      const event = createMessageAddEvent();

      const mappedEvent = await cryptographyMapper.mapGenericMessage(legalHoldFlagMissing, event);

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

      const mappedEvent = createMessageAddEvent();

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
