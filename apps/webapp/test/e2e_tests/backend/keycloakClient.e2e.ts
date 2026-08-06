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
import {User} from '../data/user';

export class KeycloakClientE2E {
  private readonly axiosInstance: AxiosInstance;
  private readonly keycloakUsername: string;
  private readonly keycloakPassword: string;
  private readonly keycloakRealm = 'master';
  private readonly backendUrl = process.env.BACKEND_URL;
  public clientId: string | undefined;

  constructor() {
    this.axiosInstance = axios.create({
      baseURL: process.env.KEYCLOAK_URL,
      withCredentials: true,
      headers: {
        'Content-Type': 'application/json',
      },
    });
    this.keycloakUsername = process.env.KEYCLOAK_USERNAME || '';
    this.keycloakPassword = process.env.KEYCLOAK_PASSWORD || '';
  }

  async getMetaData() {
    const response = await this.axiosInstance.get(`realms/${this.keycloakRealm}/protocol/saml/descriptor`);
    return response.data;
  }

  async createSamlClient(user: User) {
    if (!this.backendUrl) {
      throw new Error('BACKEND_URL is not defined');
    }

    const finalizeUrl = `${this.backendUrl}sso/finalize-login/${user.teamId}`;

    const response = await this.axiosInstance.post(
      `admin/realms/${this.keycloakRealm}/clients`,
      {
        clientId: finalizeUrl,
        enabled: true,
        adminUrl: '',
        baseUrl: '',
        rootUrl: '',
        name: '',
        description: '',
        redirectUris: [finalizeUrl],
        webOrigins: [this.backendUrl.replace(/\/$/, '')],
        protocol: 'saml',
        attributes: {
          'display.on.consent.screen': 'false',
          'saml.encrypt': 'false',
          saml_assertion_consumer_url_post: finalizeUrl,
          'saml.client.signature': 'false',
          'saml.artifact.binding': 'false',
          'saml.assertion.signature': 'true',
          'saml.onetimeuse.condition': 'false',
          'saml.server.signature.keyinfo.ext': 'false',
          'saml.server.signature.keyinfo.xmlSigKeyInfoKeyNameTransformer': 'NONE',
        },
      },
      {
        headers: {
          Authorization: `Bearer ${await this.authorize()}`,
          'Content-Type': 'application/json',
        },
      },
    );

    return response.headers['location'].split('/').pop();
  }

  async createUser(user: User) {
    const response = await this.axiosInstance.post(
      `admin/realms/${this.keycloakRealm}/users`,
      {
        username: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        emailVerified: true,
        enabled: true,
        credentials: [{type: 'password', value: user.password, temporary: false}],
      },
      {
        headers: {
          Authorization: `Bearer ${await this.authorize()}`,
          'Content-Type': 'application/json',
        },
      },
    );

    return response.headers['location'].split('/').pop();
  }

  async cleanUp(clientId?: string, userIds?: string[]) {
    if (clientId) {
      await this.deleteSamlClient(clientId);
    }
    if (userIds) {
      for (const userId of userIds) {
        await this.deleteUser(userId);
      }
    }
  }

  private async authorize(): Promise<string> {
    const response = await this.axiosInstance.post(
      `realms/${this.keycloakRealm}/protocol/openid-connect/token`,
      new URLSearchParams({
        client_id: 'admin-cli',
        username: this.keycloakUsername,
        password: this.keycloakPassword,
        grant_type: 'password',
      }),
      {headers: {'Content-Type': 'application/x-www-form-urlencoded'}},
    );

    return response.data.access_token;
  }

  private async deleteSamlClient(clientId: string) {
    await this.axiosInstance.delete(`admin/realms/${this.keycloakRealm}/clients/${clientId}`, {
      headers: {
        Authorization: `Bearer ${await this.authorize()}`,
        'Content-Type': 'application/json',
      },
    });
  }

  private async deleteUser(userId: string) {
    await this.axiosInstance.delete(`admin/realms/${this.keycloakRealm}/users/${userId}`, {
      headers: {
        Authorization: `Bearer ${await this.authorize()}`,
        'Content-Type': 'application/json',
      },
    });
  }
}
