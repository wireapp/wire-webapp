/*
 * Wire
 * Copyright (C) 2023 Wire Swiss GmbH
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

import {FederationCrossSignedCertificatesResponseSchema, LocalCertificateRootResponseSchema} from './schema';

/**
 * Fetches the certificates that a Wire deployment publishes next to its ACME server.
 *
 * The ACME protocol itself is implemented by CoreCrypto (through the PKI environment hooks), so
 * only the deployment specific certificate endpoints are left here.
 */
export class AcmeService {
  private readonly axiosInstance: AxiosInstance = axios.create();
  private readonly url = {
    ROOTS: '/roots.pem',
    FEDERATION: '/federation',
  } as const;

  constructor(private readonly discoveryUrl: string) {}

  private get acmeBaseUrl(): string {
    const {origin} = new URL(this.discoveryUrl);
    return origin;
  }

  public async getLocalCertificateRoot(): Promise<string> {
    const {data} = await this.axiosInstance.get(`${this.acmeBaseUrl}${this.url.ROOTS}`);
    return LocalCertificateRootResponseSchema.parse(data);
  }

  public async getFederationCrossSignedCertificates(): Promise<string[]> {
    const {data} = await this.axiosInstance.get(`${this.acmeBaseUrl}${this.url.FEDERATION}`);
    const federationCrossSignedCertificates = FederationCrossSignedCertificatesResponseSchema.parse(data);
    return federationCrossSignedCertificates.crts;
  }
}
