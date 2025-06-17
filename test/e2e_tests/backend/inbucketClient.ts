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

import axios, {AxiosInstance} from 'axios';

export class InbucketClient {
  private readonly axiosInstance: AxiosInstance;
  private readonly inbucketUsername = process.env.INBUCKET_USERNAME;
  private readonly inbucketPassword = process.env.INBUCKET_PASSWORD;
  private readonly authHeader: string = `Basic ${Buffer.from(`${this.inbucketUsername}:${this.inbucketPassword}`).toString('base64')}`;

  constructor() {
    this.axiosInstance = axios.create({
      baseURL: process.env.INBUCKET_URL,
      withCredentials: true,
      headers: {
        'Content-Type': 'application/json',
      },
    });
  }

  async getVerificationCode(email: string) {
    let verificationCode;

    let timeout = 0;
    while (!verificationCode && timeout < 100) {
      const response = await this.getLatestEmail(email);
      if (response.status === 200) {
        const message = await response.data;
        verificationCode = message.subject.substring(0, 6);
        if (verificationCode !== undefined) {
          break;
        }
      }
      await new Promise(resolve => setTimeout(resolve, 500)); // Wait for 500 ms
      timeout++;
    }

    if (verificationCode.length !== 6) {
      throw new Error('Correct verification code not found in the email subject');
    }

    return verificationCode;
  }

  async getAccountDeletionURL(email: string) {
    let accountDeletionURL;

    let timeout = 0;
    while (!accountDeletionURL && timeout < 100) {
      const response = await this.getLatestEmail(email);
      if (response.status === 200) {
        const regex = 'https://[a-zA-Z_0-9.=-]+/d/\\?key=[a-zA-Z_0-9.\\-\\\\&_=]+';
        const message = response.data;
        accountDeletionURL = message.body.text.match(regex)?.[0];
        if (accountDeletionURL !== undefined) {
          break;
        }
      }
      await new Promise(resolve => setTimeout(resolve, 500)); // Wait for 500 ms
      timeout++;
    }

    if (this.isValidURL(accountDeletionURL) === false) {
      throw new Error('Account deletion URL not found in the email body');
    }

    return accountDeletionURL;
  }

  private async getLatestEmail(email: string) {
    return await this.axiosInstance.get(`/api/v1/mailbox/${email}/latest`, {
      headers: {
        Authorization: this.authHeader,
      },
      validateStatus: () => true,
    });
  }

  private isValidURL(url: string): boolean {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  }
}
