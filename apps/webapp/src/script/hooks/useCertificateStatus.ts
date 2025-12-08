/*
 * Wire
 * Copyright (C) 2024 Wire Swiss GmbH
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

import {useCallback, useEffect, useState} from 'react';

import {CredentialType} from '@wireapp/core/lib/messagingProtocols/mls';

import {TIME_IN_MILLIS} from 'Util/TimeUtil';

import {E2EIHandler, MLSStatuses, WireIdentity} from '../E2EIdentity';

const getCertificateStatus = (identity?: WireIdentity, isSelfWithinGracePeriod: boolean = false) => {
  if (!identity || identity.credentialType === CredentialType.Basic) {
    return MLSStatuses.NOT_ACTIVATED;
  }

  const certificate = identity.x509Identity?.certificate;
  const hasCertificate = !!certificate && Boolean(certificate.length);

  if (!hasCertificate) {
    return MLSStatuses.NOT_ACTIVATED;
  }

  if (identity.status === MLSStatuses.VALID && isSelfWithinGracePeriod) {
    return MLSStatuses.EXPIRES_SOON;
  }

  return identity.status;
};

export const useCertificateStatus = (
  identity?: WireIdentity,
  isCurrentDevice = false,
): [string | null, MLSStatuses] => {
  const [certificateStatus, setCertificateStatus] = useState<[string | null, MLSStatuses]>([
    null,
    MLSStatuses.NOT_ACTIVATED,
  ]);

  const refreshCertificateStatus = useCallback(async () => {
    const identityCertificate = identity?.x509Identity?.certificate;
    const certificate = !!identityCertificate && Boolean(identityCertificate.length) ? identityCertificate : null;

    const hasGracePeriodStarted = isCurrentDevice
      ? await E2EIHandler.getInstance().hasGracePeriodStartedForSelfClient()
      : false;
    const status = getCertificateStatus(identity, hasGracePeriodStarted);

    setCertificateStatus(prev => {
      if (prev[0] === certificate && prev[1] === status) {
        return prev;
      }

      return [certificate, status];
    });
  }, [identity, isCurrentDevice]);

  useEffect(() => {
    void refreshCertificateStatus();

    // Refresh the certificate status every second if the device is the current device
    if (isCurrentDevice) {
      const tid = setInterval(() => {
        void refreshCertificateStatus();
      }, TIME_IN_MILLIS.SECOND);

      return () => {
        clearTimeout(tid);
      };
    }

    return () => {};
  }, [refreshCertificateStatus, isCurrentDevice]);

  return certificateStatus;
};
