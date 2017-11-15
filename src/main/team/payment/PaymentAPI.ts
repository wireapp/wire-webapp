//
// Wire
// Copyright (C) 2017 Wire Swiss GmbH
//
// This program is free software: you can redistribute it and/or modify
// it under the terms of the GNU General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.
//
// This program is distributed in the hope that it will be useful,
// but WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
// GNU General Public License for more details.
//
// You should have received a copy of the GNU General Public License
// along with this program. If not, see http://www.gnu.org/licenses/.
//

/*
 * Wire
 * Copyright (C) 2017 Wire Swiss GmbH
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

import {AxiosPromise, AxiosRequestConfig, AxiosResponse} from 'axios';

import {PaymentData, PaymentDataUpdate, PaymentStripeCharge, PaymentStripeInvoice, PaymentStripePlan} from '.';
import {HttpClient} from '../../http';

export default class TeamAPI {
  constructor(private client: HttpClient) {}

  static get URL() {
    return {
      BILLING: 'billing',
      CHARGES: 'charges',
      INVOICES: 'invoices',
      PLANS: 'plans',
      TEAMS: '/teams',
    };
  }

  public putPaymentData(teamId: string, paymentData: PaymentDataUpdate): AxiosPromise {
    const config: AxiosRequestConfig = {
      data: paymentData,
      method: 'put',
      url: `${TeamAPI.URL.TEAMS}/${teamId}/${TeamAPI.URL.BILLING}`,
    };

    return this.client.sendJSON(config).then((response: AxiosResponse) => response.data);
  }

  public getPaymentData(teamId: string): Promise<PaymentData> {
    const config: AxiosRequestConfig = {
      method: 'get',
      url: `${TeamAPI.URL.TEAMS}/${teamId}/${TeamAPI.URL.BILLING}`,
    };

    return this.client.sendJSON(config).then((response: AxiosResponse) => response.data);
  }

  public getPlans(teamId: string): Promise<PaymentStripePlan[]> {
    const config: AxiosRequestConfig = {
      method: 'get',
      url: `${TeamAPI.URL.TEAMS}/${teamId}/${TeamAPI.URL.BILLING}/${TeamAPI.URL.PLANS}`,
    };

    return this.client.sendJSON(config).then((response: AxiosResponse) => response.data.data);
  }

  public getCharges(teamId: string): Promise<PaymentStripeCharge[]> {
    const config: AxiosRequestConfig = {
      method: 'get',
      url: `${TeamAPI.URL.TEAMS}/${teamId}/${TeamAPI.URL.BILLING}/${TeamAPI.URL.CHARGES}`,
    };

    return this.client.sendJSON(config).then((response: AxiosResponse) => response.data.data);
  }

  public getInvoices(teamId: string): Promise<PaymentStripeInvoice[]> {
    const config: AxiosRequestConfig = {
      method: 'get',
      url: `${TeamAPI.URL.TEAMS}/${teamId}/${TeamAPI.URL.BILLING}/${TeamAPI.URL.INVOICES}`,
    };

    return this.client.sendJSON(config).then((response: AxiosResponse) => response.data.data);
  }
}
