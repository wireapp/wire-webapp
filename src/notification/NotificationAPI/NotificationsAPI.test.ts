/*
 * Wire
 * Copyright (C) 2022 Wire Swiss GmbH
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

import {AxiosError, AxiosResponse} from 'axios';
import {
  notificationAPI,
  client,
  mockedResultData,
  mockedNotificationId,
  getAllNotificationsResult,
} from './NotificationsAPI.mocks';

describe('NotificationAPI', () => {
  describe('constructor', () => {
    it('can be constructed', () => {
      expect(notificationAPI).toBeDefined();
    });
  });

  describe('"getAllNotifications"', () => {
    it('returns a list of notifications', async () => {
      jest.spyOn(client, 'sendJSON').mockImplementationOnce(() =>
        Promise.resolve<AxiosResponse>({
          status: 200,
          data: {...mockedResultData},
        } as AxiosResponse),
      );
      const result = await getAllNotificationsResult();
      expect(result).toBeDefined();
      expect(result.notifications).toBeDefined();
      expect(result.notifications.length).toBe(mockedResultData.notifications.length);
      expect(result.missedNotification).not.toBe(mockedNotificationId);
    });
    it('should not return notifications with status code != 200 and empty response', async () => {
      const ErrorResponse: AxiosError = {
        isAxiosError: true,
        response: {
          status: 404,
          data: {},
        } as AxiosResponse,
      } as AxiosError;
      jest.spyOn(client, 'sendJSON').mockImplementationOnce(() => Promise.reject<AxiosResponse>(ErrorResponse));
      const result = await getAllNotificationsResult();
      expect(result).toBeDefined();
      expect(result.notifications.length).toBe(0);
      expect(result.missedNotification).not.toBe(mockedNotificationId);
    });
    it('should return missed notifications for status code != 200 and notifications response', async () => {
      const ErrorResponse: AxiosError = {
        isAxiosError: true,
        response: {
          status: 404,
          data: {...mockedResultData},
        } as AxiosResponse,
      } as AxiosError;
      jest.spyOn(client, 'sendJSON').mockImplementationOnce(() => Promise.reject<AxiosResponse>(ErrorResponse));
      const result = await getAllNotificationsResult();
      expect(result).toBeDefined();
      expect(result.notifications.length).toBe(mockedResultData.notifications.length);
      expect(result.missedNotification).toBe(mockedNotificationId);
    });
  });
});
