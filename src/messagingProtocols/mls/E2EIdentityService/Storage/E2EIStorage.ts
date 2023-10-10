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

import {AuthData, AuthDataSchema, InitialData, InitialDataSchema, OrderData} from './E2EIStorage.schema';

import {LocalStorageStore} from '../../../../util/LocalStorageStore';

const HandleKey = 'Handle';
const AuthDataKey = 'AuthData';
const OderDataKey = 'OrderData';
const InitialDataKey = 'InitialData';
const CertificateDataKey = 'CertificateData';

const storage = LocalStorageStore<string>('E2EIStorage');

const storeHandle = (handle: string) => storage.add(HandleKey, window.btoa(handle));
const storeOrderData = (data: OrderData) => storage.add(OderDataKey, window.btoa(JSON.stringify(data)));
const storeAuthData = (data: AuthData) => storage.add(AuthDataKey, window.btoa(JSON.stringify(data)));
const storeInitialData = (data: InitialData) => storage.add(InitialDataKey, window.btoa(JSON.stringify(data)));
const storeCertificate = (data: string) => storage.add(CertificateDataKey, window.btoa(data));

const hasHandle = () => storage.has(HandleKey);
const hasInitialData = () => storage.has(InitialDataKey);
const hasCertificateData = () => storage.has(CertificateDataKey);

const getAndVerifyHandle = () => {
  const handle = storage.get(HandleKey);
  if (!handle) {
    throw new Error('ACME: No handle found');
  }
  storage.remove(HandleKey);
  const atob = window.atob(handle);
  return atob;
};

const getAndVerifyAuthData = (): AuthData => {
  const data = storage.get(AuthDataKey);
  if (!data) {
    throw new Error('ACME: AuthData not found');
  }
  storage.remove(AuthDataKey);
  const atob = window.atob(data);
  return AuthDataSchema.parse(JSON.parse(atob));
};

const getInitialData = (): InitialData => {
  const data = storage.get(InitialDataKey);
  if (!data) {
    throw new Error('ACME: InitialData not found');
  }
  storage.remove(InitialDataKey);
  const atob = window.atob(data);
  return InitialDataSchema.parse(JSON.parse(atob));
};

const getAndVerifyOrderData = (): OrderData => {
  const data = storage.get(OderDataKey);
  if (!data) {
    throw new Error('ACME: OrderData not found');
  }
  storage.remove(OderDataKey);
  const atob = window.atob(data);
  return JSON.parse(atob);
};

const getCertificateData = (): string => {
  const data = storage.get(CertificateDataKey);
  if (!data) {
    throw new Error('ACME: CertificateData not found');
  }
  const atob = window.atob(data);
  return atob;
};

const removeTemporaryData = () => {
  storage.remove(HandleKey);
  storage.remove(AuthDataKey);
  storage.remove(OderDataKey);
  storage.remove(InitialDataKey);
};

const removeCertificateData = () => {
  storage.remove(CertificateDataKey);
};

const removeAll = () => {
  removeTemporaryData();
  removeCertificateData();
};

export const E2EIStorage = {
  store: {
    handle: storeHandle,
    authData: storeAuthData,
    orderData: storeOrderData,
    initialData: storeInitialData,
    certificate: storeCertificate,
  },
  get: {
    initialData: getInitialData,
    certificateData: getCertificateData,
    handle: getAndVerifyHandle,
    authData: getAndVerifyAuthData,
    orderData: getAndVerifyOrderData,
  },
  has: {
    handle: hasHandle,
    initialData: hasInitialData,
    certificateData: hasCertificateData,
  },
  remove: {
    temporaryData: removeTemporaryData,
    certificateData: removeCertificateData,
    all: removeAll,
  },
};
