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

import {NotificationAPI} from './NotificationAPI';

import {AccessTokenStore} from '../../auth';
import {HttpClient} from '../../http';

const domain = 'https://test.zinfra.io';
const testConfig = {urls: {rest: domain, ws: '', name: 'test'}};
const mockedAccessTokenStore: Partial<AccessTokenStore> = {
  accessTokenData: {
    access_token:
      'iJCRCjc8oROO-dkrkqCXOade997oa8Jhbz6awMUQPBQo80VenWqp_oNvfY6AnU5BxEsd' +
      'DPOBfBP-uz_b0gAKBQ==.v=1.k=1.d=1498600993.t=a.l=.u=aaf9a833-ef30-4c2' +
      '2-86a0-9adc8a15b3b4.c=15037015562284012115',
    expires_in: 900,
    token_type: 'Bearer',
    user: 'aaf9a833-ef30-4c22-86a0-9adc8a15b3b4',
  },
};
const mockedClientId = 'test-client-id';
const mockedNotificationId = 'test-notification-id';
const mockedResultData = {
  has_more: false,
  notifications: [
    {
      id: '649b75ed-3a72-11ed-8001-222b177be93e',
      payload: [
        {
          conversation: '79930ec2-a09e-4b4a-a83c-dc7e4be1a829',
          data: {
            qualified_user_ids: [{domain, id: '9b77306d-e761-4276-b5c7-e5dc2c4d8067'}],
            user_ids: ['9b77306d-e761-4276-b5c7-e5dc2c4d8067'],
          },
          from: '9b77306d-e761-4276-b5c7-e5dc2c4d8067',
          qualified_conversation: {domain, id: '79930ec2-a09e-4b4a-a83c-dc7e4be1a829'},
          qualified_from: {domain, id: '9b77306d-e761-4276-b5c7-e5dc2c4d8067'},
          time: '2022-09-22T12:30:50.693Z',
          type: 'conversation.member-leave',
        },
      ],
    },
    {
      id: '725549ca-3a72-11ed-8001-222b177be93e',
      payload: [
        {
          conversation: 'a8dbcf9f-c275-4100-8f95-a8c00e43ca7c',
          data: {
            qualified_user_ids: [{domain, id: '9b77306d-e761-4276-b5c7-e5dc2c4d8067'}],
            user_ids: ['9b77306d-e761-4276-b5c7-e5dc2c4d8067'],
          },
          from: '9b77306d-e761-4276-b5c7-e5dc2c4d8067',
          qualified_conversation: {domain, id: 'a8dbcf9f-c275-4100-8f95-a8c00e43ca7c'},
          qualified_from: {domain, id: '9b77306d-e761-4276-b5c7-e5dc2c4d8067'},
          time: '2022-09-22T12:31:13.721Z',
          type: 'conversation.member-leave',
        },
      ],
    },
  ],
  time: '2022-10-18T08:34:45Z',
};

const client = new HttpClient(testConfig, mockedAccessTokenStore as AccessTokenStore);

const notificationAPI = new NotificationAPI(client);

const getAllNotificationsResult = () => notificationAPI.getAllNotifications(mockedClientId, mockedNotificationId);

export {client, notificationAPI, getAllNotificationsResult, mockedResultData, mockedNotificationId};
