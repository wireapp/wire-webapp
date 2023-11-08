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

import * as x509 from '@peculiar/x509';
import {render} from '@testing-library/react';

import {MLSStatuses} from 'Components/VerificationBadges';
import {withTheme} from 'src/script/auth/util/test/TestUtil';

import {E2EICertificateDetails} from './E2EICertificateDetails';

const certificateGenerator = async (notBefore: Date, notAfter: Date) => {
  const alg = {
    name: 'RSASSA-PKCS1-v1_5',
    hash: 'SHA-256',
    publicExponent: new Uint8Array([1, 0, 1]),
    modulusLength: 2048,
  };
  const keys = await crypto.subtle.generateKey(alg, false, ['sign', 'verify']);
  const cert = await x509.X509CertificateGenerator.createSelfSigned({
    serialNumber: '01',
    name: 'CN=Test',
    notBefore,
    notAfter,
    signingAlgorithm: alg,
    keys,
    extensions: [
      new x509.BasicConstraintsExtension(true, 2, true),
      new x509.ExtendedKeyUsageExtension(['1.2.3.4.5.6.7', '2.3.4.5.6.7.8'], true),
      new x509.KeyUsagesExtension(x509.KeyUsageFlags.keyCertSign | x509.KeyUsageFlags.cRLSign, true),
      await x509.SubjectKeyIdentifierExtension.create(keys.publicKey),
    ],
  });

  return cert.toString('pem');
};

describe('E2EICertificateDetails', () => {
  const isMLSVerified = true;
  const currentDate = new Date();

  it('is e2ei identity verified', async () => {
    const yesterday = new Date(currentDate.getTime() - 86400000);
    const followingDay = new Date(currentDate.getTime() + 86400000 * 2);

    const generatedCertificate = await certificateGenerator(yesterday, followingDay);

    const {getByTestId} = render(
      withTheme(<E2EICertificateDetails certificate={generatedCertificate} isMLSVerified={isMLSVerified} />),
    );

    const E2EIdentityStatus = getByTestId('e2ei-identity-status');
    expect(E2EIdentityStatus.getAttribute('data-uie-value')).toEqual(MLSStatuses.VALID);
  });

  it('is e2ei identity not downloaded', async () => {
    const {getByTestId} = render(withTheme(<E2EICertificateDetails isMLSVerified={isMLSVerified} />));

    const E2EIdentityStatus = getByTestId('e2ei-identity-status');
    expect(E2EIdentityStatus.getAttribute('data-uie-value')).toEqual(MLSStatuses.NOT_DOWNLOADED);
  });

  it('is e2ei identity expired', async () => {
    const yesterday = new Date(currentDate.getTime() - 86400000);
    const followingDay = new Date(currentDate.getTime() - 86400000 / 2);

    const generatedCertificate = await certificateGenerator(yesterday, followingDay);

    const {getByTestId} = render(
      withTheme(<E2EICertificateDetails isMLSVerified={isMLSVerified} certificate={generatedCertificate} />),
    );

    const E2EIdentityStatus = getByTestId('e2ei-identity-status');
    expect(E2EIdentityStatus.getAttribute('data-uie-value')).toEqual(MLSStatuses.EXPIRED);
  });
});
