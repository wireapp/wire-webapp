/*
 * Wire
 * Copyright (C) 2018 Wire Swiss GmbH
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

import rs = require('jsrsasign');

import * as crypto from 'crypto';

import {KNOWN_PINS} from './pinningData';

export interface PinningResult {
  certificate?: ElectronCertificate;
  decoding?: boolean;
  errorMessage?: string;
  fingerprintCheck?: boolean;
  verifiedIssuerRootCerts?: boolean;
  verifiedPublicKeyInfo?: boolean;
}

export interface ElectronCertificate {
  data: string;
  fingerprint?: string;
  issuer?: CertificatePrincipal;
  issuerCert?: ElectronCertificate;
  issuerName?: string;
  serialNumber?: string;
  subject?: CertificatePrincipal;
  subjectName?: string;
  validExpiry?: number;
  validStart?: number;
}

interface CertificatePrincipal {
  commonName: string;
  country: string;
  locality: string;
  organizations: string[];
  organizationUnits: string[];
  state: string;
}

export function buildCert(buffer: Buffer): string {
  return `-----BEGIN CERTIFICATE-----\n${buffer.toString('base64')}\n-----END CERTIFICATE-----`;
}

export function getFingerprint(derCert: Buffer): string {
  const derBinary = derCert.toString('binary');
  const hexDerFileContents = rs.rstrtohex(derBinary);
  const pemString = rs.KJUR.asn1.ASN1Util.getPEMStringFromHex(hexDerFileContents, 'CERTIFICATE');
  const publicKey = rs.X509.getPublicKeyInfoPropOfCertPEM(pemString);
  const publicKeyBytes = Buffer.from(publicKey.keyhex, 'hex').toString('binary');
  return crypto.createHash('sha256').update(publicKeyBytes).digest('base64');
}

export function hostnameShouldBePinned(hostname: string): boolean {
  return KNOWN_PINS.some(pin => pin.url.test(hostname.toLowerCase().trim()));
}

export function verifyPinning(hostname: string, remoteCertificate?: ElectronCertificate): PinningResult {
  if (!remoteCertificate) {
    return {
      errorMessage: 'No certificate provided by Electron.',
    };
  }

  if (!remoteCertificate.issuerCert) {
    return {
      errorMessage: 'No issuer certificate in certificate.',
    };
  }

  const {data: certData, issuerCert} = remoteCertificate;

  function getRemoteIssuerCertData(remoteIssuerCert: ElectronCertificate = issuerCert): ElectronCertificate {
    return remoteIssuerCert.issuerCert ? getRemoteIssuerCertData(remoteIssuerCert.issuerCert) : remoteIssuerCert;
  }

  let remoteIssuerCertHex: string;
  let remotePublicKey: rs.PublicKeyInfoPropOfCertPEMResult;
  let remotePublicKeyBytes: string;
  let remotePublicKeyFingerprint: string;

  const errorMessages: string[] = [];

  try {
    remoteIssuerCertHex = rs.pemtohex(getRemoteIssuerCertData().data);
    remotePublicKey = rs.X509.getPublicKeyInfoPropOfCertPEM(certData);
    remotePublicKeyBytes = Buffer.from(remotePublicKey.keyhex, 'hex').toString('binary');
    remotePublicKeyFingerprint = crypto.createHash('sha256').update(remotePublicKeyBytes).digest('base64');
  } catch (error) {
    return {
      decoding: false,
      errorMessage: (error as Error).message,
    };
  }

  const result: PinningResult = {};

  for (const knownPin of KNOWN_PINS) {
    const {url, publicKeyInfo: localPublicKeyInfo = [], issuerRootCerts: knownIssuerRootCerts = []} = knownPin;

    if (url.test(hostname.toLowerCase().trim())) {
      if (knownIssuerRootCerts.length > 0) {
        result.verifiedIssuerRootCerts = knownIssuerRootCerts.some(
          knownRootCert => remoteIssuerCertHex === rs.pemtohex(knownRootCert),
        );
        if (!result.verifiedIssuerRootCerts) {
          const knownCertsCombined = knownIssuerRootCerts.join(', ').replace(/[\r\n]/g, '');
          const errorMessage = `Issuer root certificates: none of "${knownCertsCombined}" could be verified against "${
            getRemoteIssuerCertData().data
          }.`;
          errorMessages.push(errorMessage);
        }
      }

      result.verifiedPublicKeyInfo = localPublicKeyInfo
        .reduce((arr: boolean[], localPubKey) => {
          const {
            algorithmID: localAlgorithmID,
            algorithmParam: localAlgorithmParam,
            fingerprints: localFingerprints,
          } = localPubKey;

          const fingerprintCheck =
            localFingerprints.length > 0 &&
            localFingerprints.some(knownFingerprint => knownFingerprint === remotePublicKeyFingerprint);
          const algorithmIDCheck = localAlgorithmID === remotePublicKey.algoid;
          const algorithmParamCheck = localAlgorithmParam === remotePublicKey.algparam;

          if (!fingerprintCheck) {
            const fingerprintsCombined = localFingerprints.join(', ');
            const errorMessage = `Public key fingerprints: "${remotePublicKeyFingerprint}" could not be verified with any of the known fingerprints "${fingerprintsCombined}".`;
            errorMessages.push(errorMessage);
          }

          if (!algorithmIDCheck) {
            const algorithmID = remotePublicKey.algoid;
            const errorMessage = `Algorithm ID: "${algorithmID}" could not be verified with the known ID "${localAlgorithmID}".`;
            errorMessages.push(errorMessage);
          }

          if (!algorithmParamCheck) {
            const algorithmParam = remotePublicKey.algparam;
            const errorMessage = `Algorithm parameter: "${algorithmParam}" could not be verified with the known parameter "${localAlgorithmParam}".`;
            errorMessages.push(errorMessage);
          }

          arr.push(fingerprintCheck, algorithmIDCheck, algorithmParamCheck);

          return arr;
        }, [])
        .every(value => Boolean(value));

      break;
    }
  }

  if (errorMessages.length > 0) {
    result.errorMessage = errorMessages.join('\n');
    result.certificate = remoteCertificate;
  }

  return result;
}
