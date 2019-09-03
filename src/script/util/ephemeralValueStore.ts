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

import {Config} from '../auth/config';

/**
 * The value store util allows storing a single value across page navigation.
 * This value will never be stored on the disk, which makes it a good candidate for storing cryptographic key material.
 * There are no guarantees regarding the time the value will stay in memory. Should not be used as a reliable store.
 * Main use case is to pass on a value from a page to another page.
 */
let worker: ServiceWorker;

export async function get(): Promise<any> {
  const worker = await getWorker();
  return sendMessage(worker, {action: 'get'});
}

export async function save<T>(value: T): Promise<T> {
  const worker = await getWorker();
  return sendMessage(worker, {action: 'save', params: value});
}

async function getWorker(): Promise<ServiceWorker> {
  if (!navigator.serviceWorker || worker) {
    return worker;
  }

  const registration = await navigator.serviceWorker.register(`/worker/sw-value-store.js?${Config.VERSION}`);
  worker = registration.installing || registration.waiting || registration.active;
  return worker;
}

function sendMessage(worker: ServiceWorker | undefined, action: any): Promise<any> {
  if (!worker) {
    return Promise.resolve(undefined);
  }
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
