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

import TestPage from 'Util/test/TestPage';
import {LegalHoldMessage as LegalHoldMessageEntity} from 'src/script/entity/message/LegalHoldMessage';
import LegalHoldMessage, {LegalHoldMessageProps} from './LegalHoldMessage';

class LegalHoldMessagePage extends TestPage<LegalHoldMessageProps> {
  constructor(props?: LegalHoldMessageProps) {
    super(LegalHoldMessage, props);
  }

  getLegalHoldActivatedMessage = () => this.get('[data-uie-name="status-legalhold-activated"]');
  getLegalHoldDeactivatedMessage = () => this.get('[data-uie-name="status-legalhold-deactivated"]');
}

const createLegalHoldMessage = (partialLegalHoldMessage: Partial<LegalHoldMessageEntity>) => {
  const legalHoldMessage: Partial<LegalHoldMessageEntity> = {
    isActivationMessage: false,
    ...partialLegalHoldMessage,
  };
  return legalHoldMessage as LegalHoldMessageEntity;
};

describe('LegalHoldMessage', () => {
  it('shows legal hold deactivated message', async () => {
    const legalHoldMessagePage = new LegalHoldMessagePage({
      message: createLegalHoldMessage({
        isActivationMessage: false,
      }),
    });

    expect(legalHoldMessagePage.getLegalHoldDeactivatedMessage().exists()).toBe(true);
    expect(legalHoldMessagePage.getLegalHoldActivatedMessage().exists()).toBe(false);
  });
  it('shows legal hold activated message', async () => {
    const legalHoldMessagePage = new LegalHoldMessagePage({
      message: createLegalHoldMessage({
        isActivationMessage: true,
      }),
    });

    expect(legalHoldMessagePage.getLegalHoldActivatedMessage().exists()).toBe(true);
    expect(legalHoldMessagePage.getLegalHoldDeactivatedMessage().exists()).toBe(false);
  });
});
