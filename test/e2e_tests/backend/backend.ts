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

import axios, {AxiosInstance, AxiosResponse} from 'axios';

import {User} from './user';

const BACKEND_URL = process.env.BACKEND_URL;
const BASIC_AUTH = process.env.BASIC_AUTH;

let axiosInstance: AxiosInstance | null = null;

export async function createPersonalUser(user: User) {
  // 1. Register
  const registerResponse = await registerUser(user);
  const zuidCookie = extractCookieFromRegisterResponse(registerResponse);

  // 2. Get activation code via brig
  const activationCode = await getActivationCodeForEmail(user.email);

  // 3. Activate Account
  await activateAccount(user.email, activationCode);

  // 4. Request Access Token
  user.token = await requestAccessToken(zuidCookie);

  // 5. Set Unique Username (Handle)
  await setUniqueUsername(user.username, user.token);
}

export async function deleteUser(userPassword: string, token: string) {
  await getAxiosInstance().request({
    url: '/self',
    method: 'DELETE',
    headers: {
      Authorization: `Bearer ${token}`,
    },
    data: {
      password: userPassword,
    },
  });
}

function getAxiosInstance(): AxiosInstance {
  if (!axiosInstance) {
    axiosInstance = axios.create({
      baseURL: BACKEND_URL,
      withCredentials: true,
      headers: {
        'Content-Type': 'application/json',
      },
    });
  }
  return axiosInstance;
}

async function registerUser(user: User): Promise<AxiosResponse> {
  return await getAxiosInstance().post('register', {
    password: user.password,
    name: `${user.firstName} ${user.lastName}`,
    email: user.email,
  });
}

function extractCookieFromRegisterResponse(registerResponse: AxiosResponse): string {
  const setCookieHeader = registerResponse.headers['set-cookie'];

  // Find the zuid cookie string in setCookieHeader
  if (!setCookieHeader) {
    throw Error('Cookies were not found in register response');
  }
  const zuidCookie = setCookieHeader.find(cookieStr => cookieStr.startsWith('zuid='));
  if (!zuidCookie) {
    throw new Error('zuid cookie not found in register response');
  }
  return zuidCookie;
}

async function getActivationCodeForEmail(email: string): Promise<string> {
  const activationCodeResponse = await getAxiosInstance().get(`/i/users/activation-code`, {
    params: {email: email},
    headers: {
      Authorization: `Basic ${BASIC_AUTH}`,
    },
  });

  return activationCodeResponse.data.code;
}

async function activateAccount(email: string, code: string) {
  await getAxiosInstance().post('activate', {
    code,
    dryrun: false,
    email: email,
  });
}

async function requestAccessToken(zuidCookie: string): Promise<string> {
  const accessResponse = await getAxiosInstance().post(
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

  return accessResponse.data.access_token;
}

async function setUniqueUsername(username: string, token: string) {
  await getAxiosInstance().put(
    'self/handle',
    {handle: username},
    {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    },
  );
}
