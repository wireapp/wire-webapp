/*
 * Wire
 * Copyright (C) 2026 Wire Swiss GmbH
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

import {loadAuthenticatedSelfUser} from './loadAuthenticatedSelfUser';

describe('authenticated startup identity notification', () => {
  it('notifies with the retrieved qualified ID before subsequent initialization can continue', async () => {
    const selfUser = {qualifiedId: {domain: 'example.com', id: 'self-user'}, name: 'Self user'};
    const retrieval = Promise.withResolvers<typeof selfUser>();
    const notification = Promise.withResolvers<void>();
    const notificationStarted = Promise.withResolvers<void>();
    const onAuthenticatedAccount = jest.fn(() => {
      notificationStarted.resolve();

      return notification.promise;
    });
    const loading = loadAuthenticatedSelfUser({
      getSelf() {
        return retrieval.promise;
      },
      onAuthenticatedAccount,
    });
    expect(onAuthenticatedAccount).not.toHaveBeenCalled();
    retrieval.resolve(selfUser);
    await notificationStarted.promise;
    expect(onAuthenticatedAccount).toHaveBeenCalledWith(selfUser.qualifiedId);
    let continuedInitialization = false;
    async function continueInitialization(): Promise<void> {
      await loading;
      continuedInitialization = true;
    }
    const initializing = continueInitialization();
    expect(continuedInitialization).toBe(false);
    notification.resolve();
    await initializing;
    expect(continuedInitialization).toBe(true);
    expect(await loading).toBe(selfUser);
    expect(onAuthenticatedAccount).toHaveBeenCalledTimes(1);
  });

  it.each(['throw', 'reject'] as const)(
    'preserves successful authentication when the observer fails by %s',
    async failure => {
      const selfUser = {qualifiedId: {domain: 'example.com', id: 'self-user'}};
      const actualUser = await loadAuthenticatedSelfUser({
        async getSelf() {
          return selfUser;
        },
        onAuthenticatedAccount() {
          if (failure === 'throw') {
            throw new Error('Observer failed');
          }

          return Promise.reject(new Error('Observer rejected'));
        },
      });

      expect(actualUser).toBe(selfUser);
    },
  );

  it('preserves authentication failures without notifying an identity', async () => {
    const failure = new Error('Authentication failed');
    const onAuthenticatedAccount = jest.fn();

    await expect(
      loadAuthenticatedSelfUser({
        async getSelf(): Promise<never> {
          throw failure;
        },
        onAuthenticatedAccount,
      }),
    ).rejects.toBe(failure);
    expect(onAuthenticatedAccount).not.toHaveBeenCalled();
  });
});
