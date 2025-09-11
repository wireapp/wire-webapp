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

export class InbucketClientE2E {
  private readonly axiosInstance: AxiosInstance;
  private readonly inbucketUsername;
  private readonly inbucketPassword;
  private readonly encodedCredentials;
  private readonly authHeader;

  constructor() {
    this.axiosInstance = axios.create({
      baseURL: process.env.INBUCKET_URL,
      withCredentials: true,
      headers: {
        'Content-Type': 'application/json',
      },
    });
    this.inbucketUsername = process.env.INBUCKET_USERNAME;
    this.inbucketPassword = process.env.INBUCKET_PASSWORD;
    this.encodedCredentials = Buffer.from(`${this.inbucketUsername}:${this.inbucketPassword}`).toString('base64');
    this.authHeader = `Basic ${this.encodedCredentials}`;
  }

  async getVerificationCode(email: string) {
    let verificationCode;

    let timeout = 0;
    while (!verificationCode && timeout < 100) {
      const response = await this.getLatestEmail(email);
      if (response.status === 200) {
        const message = await response.data;
        verificationCode = message.subject.slice(-6);
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

    return verificationCode as string;
  }

  async getAccountDeletionURL(email: string) {
    const deletionUrlRegex = 'https://[a-zA-Z_0-9.=-]+/d/\\?key=[a-zA-Z_0-9.\\-\\\\&_=]+';
    return this.getMatchingURLFromEmailBody(email, deletionUrlRegex);
  }

  async getAccountActivationURL(email: string) {
    const accountActivationRegex = 'https://[a-zA-Z_0-9.=-]+/verify/\\?key=[a-zA-Z_0-9.\\-\\\\&_=]+';
    return this.getMatchingURLFromEmailBody(email, accountActivationRegex);
  }

  async getResetPasswordURL(email: string) {
    const resetLinkRegex = 'https://[a-zA-Z_0-9.=-]+/reset/\\?key=[a-zA-Z_0-9.\\-\\\\&_=]+';
    return this.getMatchingURLFromEmailBody(email, resetLinkRegex);
  }

  async isTeamInvitationEmailReceived(inviteeEmail: string, inviterEmail: string) {
    const timeoutLimit = 30000;
    const delayBetweenAttempts = 500;
    const maxAttempts = timeoutLimit / delayBetweenAttempts;
    let attempt = 0;
    while (attempt < maxAttempts) {
      const response = await this.getLatestEmail(inviteeEmail);
      if (response.status === 200) {
        const message = response.data;
        if (message.body.text.includes(`${inviterEmail} has invited you to join a team on Wire.`)) {
          return true;
        }
      }
      await new Promise(resolve => setTimeout(resolve, delayBetweenAttempts));
      attempt++;
    }

    return false;
  }

  private async getMatchingURLFromEmailBody(email: string, regex: string) {
    let matchingUrl;

    let timeout = 0;
    while (!matchingUrl && timeout < 100) {
      const response = await this.getLatestEmail(email);
      if (response.status === 200) {
        const message = response.data;
        matchingUrl = message.body.text.match(regex)?.[0];
        if (matchingUrl !== undefined) {
          break;
        }
      }
      await new Promise(resolve => setTimeout(resolve, 500)); // Wait for 500 ms
      timeout++;
    }

    if (this.isValidURL(matchingUrl) === false) {
      throw new Error('Matching URL not found in the email body');
    }

    return matchingUrl;
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
