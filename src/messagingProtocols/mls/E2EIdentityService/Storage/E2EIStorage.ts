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

import {Encoder, Decoder} from 'bazinga64';

import {AuthData, AuthDataSchema, InitialData, InitialDataSchema, OrderData} from './E2EIStorage.schema';

import {LocalStorageStore} from '../../../../util/LocalStorageStore';

const HandleKey = 'Handle';
const AuthDataKey = 'AuthData';
const OderDataKey = 'OrderData';
const InitialDataKey = 'InitialData';

const storage = LocalStorageStore<string>('E2EIStorage');

const storeHandle = (handle: string) => storage.add(HandleKey, Encoder.toBase64(handle).asString);
const storeOrderData = (data: OrderData) => storage.add(OderDataKey, Encoder.toBase64(JSON.stringify(data)).asString);
const storeAuthData = (data: AuthData) => storage.add(AuthDataKey, Encoder.toBase64(JSON.stringify(data)).asString);
const storeInitialData = (data: InitialData) =>
  storage.add(InitialDataKey, Encoder.toBase64(JSON.stringify(data)).asString);

const hasHandle = () => storage.has(HandleKey);
const hasInitialData = () => storage.has(InitialDataKey);

const getAndVerifyHandle = () => {
  const handle = storage.get(HandleKey);
  if (!handle) {
    throw new Error('ACME: No handle found');
  }

  return Decoder.fromBase64(handle).asString;
};

const getAndVerifyAuthData = (): AuthData => {
  const data = storage.get(AuthDataKey);
  if (!data) {
    throw new Error('ACME: AuthData not found');
  }
  const decodedData = Decoder.fromBase64(data).asString;
  return AuthDataSchema.parse(JSON.parse(decodedData));
};

const getInitialData = (): InitialData => {
  const data = storage.get(InitialDataKey);
  if (!data) {
    throw new Error('ACME: InitialData not found');
  }
  const decodedData = Decoder.fromBase64(data).asString;
  return InitialDataSchema.parse(JSON.parse(decodedData));
};

const getAndVerifyOrderData = (): OrderData => {
  const data = storage.get(OderDataKey);
  if (!data) {
    throw new Error('ACME: OrderData not found');
  }
  const decodedData = Decoder.fromBase64(data).asString;
  return JSON.parse(decodedData);
};

const removeInitialData = () => {
  storage.remove(InitialDataKey);
};

const removeTemporaryData = () => {
  storage.remove(HandleKey);
  storage.remove(AuthDataKey);
  storage.remove(OderDataKey);
};

const removeAll = () => {
  removeTemporaryData();
  removeInitialData();
};

export const E2EIStorage = {
  store: {
    handle: storeHandle,
    authData: storeAuthData,
    orderData: storeOrderData,
    initialData: storeInitialData,
  },
  get: {
    initialData: getInitialData,
    handle: getAndVerifyHandle,
    authData: getAndVerifyAuthData,
    orderData: getAndVerifyOrderData,
  },
  has: {
    handle: hasHandle,
    initialData: hasInitialData,
  },
  remove: {
    initialData: removeInitialData,
    temporaryData: removeTemporaryData,
    all: removeAll,
  },
};
