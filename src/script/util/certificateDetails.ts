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

import {MLSStatuses} from 'Components/VerificationBadge';

// TODO: Will be changed when I get information how much hours before we need to display this status.
const EXPIRATION_HOURS = 4;

const checkExpirationDate = (notAfter: Date) => {
  const endDate = new Date(notAfter);
  const currentDate = new Date();
  const dateBeforeEnd = new Date(notAfter);
  dateBeforeEnd.setHours(endDate.getHours() - EXPIRATION_HOURS);

  return currentDate > dateBeforeEnd;
};

export const getCertificateState = (certificate?: string) => {
  if (!certificate) {
    return MLSStatuses.NOT_DOWNLOADED;
  }
  const currentDate = new Date();
  const parsedCertificate = new x509.X509Certificate(certificate);
  const isValid = currentDate > parsedCertificate.notBefore && currentDate < parsedCertificate.notAfter;
  const isExpireSoon = isValid && !!parsedCertificate?.notAfter && checkExpirationDate(parsedCertificate.notAfter);

  if (isValid && !isExpireSoon) {
    return MLSStatuses.VALID;
  }

  if (isValid && isExpireSoon) {
    return MLSStatuses.EXPIRES_SOON;
  }

  return MLSStatuses.EXPIRED;
};
