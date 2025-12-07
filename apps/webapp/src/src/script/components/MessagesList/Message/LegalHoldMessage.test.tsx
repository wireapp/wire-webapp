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

import {LegalHoldMessage as LegalHoldMessageEntity} from 'Repositories/entity/message/LegalHoldMessage';

import {LegalHoldMessage} from './LegalHoldMessage';

const createLegalHoldMessage = (partialLegalHoldMessage: Partial<LegalHoldMessageEntity>) => {
  const legalHoldMessage: Partial<LegalHoldMessageEntity> = {
    isActivationMessage: false,
    ...partialLegalHoldMessage,
  };
  return legalHoldMessage as LegalHoldMessageEntity;
};

describe('LegalHoldMessage', () => {
  it('shows legal hold deactivated message', async () => {
    const message = createLegalHoldMessage({
      isActivationMessage: false,
    });
    const {queryByTestId} = render(<LegalHoldMessage message={message} />);

    expect(queryByTestId('status-legalhold-deactivated')).not.toBeNull();
    expect(queryByTestId('status-legalhold-activated')).toBeNull();
  });
  it('shows legal hold activated message', async () => {
    const message = createLegalHoldMessage({
      isActivationMessage: true,
    });
    const {queryByTestId} = render(<LegalHoldMessage message={message} />);

    expect(queryByTestId('status-legalhold-deactivated')).toBeNull();
    expect(queryByTestId('status-legalhold-activated')).not.toBeNull();
  });
});
