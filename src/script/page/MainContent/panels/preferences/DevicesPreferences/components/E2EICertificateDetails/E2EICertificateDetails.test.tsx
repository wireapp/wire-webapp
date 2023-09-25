/*
 * Wire
 * Copyright (C) 2022 Wire Swiss GmbH
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

import {MLSStatues} from 'Components/Badges';
import {withTheme} from 'src/script/auth/util/test/TestUtil';

import {E2EICertificateDetails} from './E2EICertificateDetails';

describe('E2ECertificateDetails', () => {
  const isMLSVerified = true;

  it('is e2e identity verified', async () => {
    const {getByTestId} = render(
      withTheme(<E2EICertificateDetails certificate="PEM Cert" isMLSVerified={isMLSVerified} />),
    );

    const E2EIdentityStatus = getByTestId('e2e-identity-status');
    expect(E2EIdentityStatus.getAttribute('data-uie-value')).toEqual('Valid');
  });

  it('is e2e identity not downloaded', async () => {
    const {getByTestId} = render(
      withTheme(<E2EICertificateDetails isMLSVerified={isMLSVerified} certificate="PEM Cert" />),
    );

    const E2EIdentityStatus = getByTestId('e2e-identity-status');
    expect(E2EIdentityStatus.getAttribute('data-uie-value')).toEqual(MLSStatues.NOT_DOWNLOADED);
  });

  it('is e2e identity expired', async () => {
    const {getByTestId} = render(
      withTheme(<E2EICertificateDetails isMLSVerified={isMLSVerified} certificate="PEM Cert" />),
    );

    const E2EIdentityStatus = getByTestId('e2e-identity-status');
    expect(E2EIdentityStatus.getAttribute('data-uie-value')).toEqual(MLSStatues.EXPIRED);
  });
});
