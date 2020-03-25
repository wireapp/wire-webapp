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

import {Config} from '../Config';

/**
 * The value store util allows storing a single value across page navigation.
 * This value will never be stored on the disk, which makes it a good candidate for storing cryptographic key material.
 * There are no guarantees regarding the time the value will stay in memory. Should not be used as a reliable store.
 * Main use case is to pass on a value from a page to another page.
 */
let worker: ServiceWorker;

enum ValueStoreActionType {
  GET = 'get',
  SAVE = 'save',
}

interface ValueStoreAction {
  action: ValueStoreActionType;
  value?: string;
}

/**
 * Returns the ephemeral value and deletes it directly after so it can be only retrieved once.
 */
export async function getEphemeralValue(): Promise<any> {
  const worker = await getWorker();
  return sendMessage(worker, {action: ValueStoreActionType.GET});
}

export async function saveRandomEncryptionKey(): Promise<string> {
  const secretKey = new Uint32Array(64);
  window.crypto.getRandomValues(secretKey);
  const hexKey: string[] = [];
  for (const x of secretKey) {
    hexKey.push(`00${x.toString(16)}`.slice(-2));
  }
  const encryptionKey = hexKey.join('');
  await saveEphemeralValue(encryptionKey);
  return encryptionKey;
}

export async function saveEphemeralValue(value: string): Promise<string> {
  const worker = await getWorker();
  return sendMessage(worker, {action: ValueStoreActionType.SAVE, value});
}

async function getWorker(): Promise<ServiceWorker> {
  const registration = await navigator.serviceWorker.register(
    `/worker/sw-value-store.js?${Config.getConfig().VERSION}`,
  );
  worker = registration.installing || registration.waiting || registration.active;
  return worker;
}

function sendMessage(worker: ServiceWorker, action: ValueStoreAction): Promise<string> {
  const messageChannel = new MessageChannel();
  return new Promise((resolve, reject) => {
    messageChannel.port1.onmessage = event => {
      resolve(event.data);
    };
    try {
      worker.postMessage(action, [messageChannel.port2]);
    } catch (error) {
      reject(error);
    }
  });
}
