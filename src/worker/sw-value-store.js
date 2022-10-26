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

// Best effort to keep the service worker alive all the time
function keepAlive() {
  return new Promise(resolve => setTimeout(resolve, 1000)).then(keepAlive);
}

(global => {
  let storeValue = undefined;
  const actions = {
    get: () => {
      const cachedValue = storeValue;
      storeValue = undefined;
      return cachedValue;
    },
    save: value => {
      storeValue = value;
    },
  };

  global.addEventListener('activate', event => {
    event.waitUntil(self.clients.claim());
    keepAlive();
  });

  global.addEventListener('install', event => event.waitUntil(global.skipWaiting()));
  global.addEventListener('message', event => {
    const client = event.ports[0];
    if (!actions.hasOwnProperty(event.data.action)) {
      console.error(`Action '${event.data.action}' doesn't exist in value store service worker`);
      return;
    }
    const action = actions[event.data.action];
    const value = action(event.data.value);
    client.postMessage(value);
  });
})(self);
