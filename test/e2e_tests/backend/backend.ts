/*
 * Wire
 * Copyright (C) 2025 Wire Swiss GmbH
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

import axios from 'axios';

import {ClientUser} from './clientUser';

import {getCredentials} from '../utils/credentialsReader';

const onePasswordItemName = 'BackendConnection staging-with-webapp-master';

const BASE_URL = getCredentials(onePasswordItemName, 'backendUrl');

export async function createPersonalUserViaBackdoor(user: ClientUser) {
  const axiosInstance = axios.create({
    baseURL: BASE_URL,
    withCredentials: true,
    headers: {
      'Content-Type': 'application/json',
    },
  });

  // 1. Register
  const registerPayload = {
    password: user.password,
    name: user.fullName,
    email: user.email,
  };

  const registerResponse = await axiosInstance.post('register', registerPayload);
  const setCookieHeader = registerResponse.headers['set-cookie'];

  // Find the zuid cookie string in setCookieHeader
  if (!setCookieHeader) {
    throw Error('Cookies were not provided in register response');
  }
  const zuidCookie = setCookieHeader.find(cookieStr => cookieStr.startsWith('zuid='));
  if (!zuidCookie) {
    throw new Error('zuid cookie not found in register response');
  }

  // 2. Get activation code
  const stagingBasicAuth = getCredentials(onePasswordItemName, 'basicAuth');
  const basicAuthHeader = `Basic ${stagingBasicAuth}`;

  const activationCodeResponse = await axiosInstance.get(`/i/users/activation-code`, {
    params: {email: user.email},
    headers: {
      Authorization: basicAuthHeader,
    },
  });

  const activationCodeData = activationCodeResponse.data;
  const code = activationCodeData.code;

  // 3. Activate Account
  const activatePayload = {
    code,
    dryrun: false,
    email: user.email,
  };

  await axiosInstance.post('activate', activatePayload);

  // 4. Request Access Token
  const accessResponse = await axiosInstance.post(
    'access',
    {
      withCredentials: true,
    },
    {
      headers: {
        Cookie: zuidCookie,
      },
    },
  );

  const accessData = accessResponse.data;
  const token = accessData.access_token;

  // Setting Access Token in Client User
  user.token = token;

  // 5. Set Unique Username (Handle)
  const handlePayload = {
    handle: user.username,
  };

  await axiosInstance.put('self/handle', handlePayload, {
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });
}

export async function deleteUser(user: ClientUser) {
  const axiosInstance = axios.create({
    baseURL: BASE_URL,
    withCredentials: true,
    headers: {
      'Content-Type': 'application/json',
    },
  });

  const deletePayload = {
    password: user.password,
  };

  const deleteResponse = await axiosInstance.request({
    url: '/self',
    method: 'DELETE',
    headers: {
      Authorization: `Bearer ${user.token}`,
    },
    data: deletePayload,
  });

  if (deleteResponse.status != 200) {
    throw new Error(`Couldn't delete user ${user.token}`);
  }
}
