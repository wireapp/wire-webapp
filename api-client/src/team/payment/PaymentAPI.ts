/*
 * Wire
 * Copyright (C) 2018 Wire Swiss GmbH
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

import {AxiosRequestConfig} from 'axios';

import {HttpClient} from '../../http/';

import {
  PaymentBillingData,
  PaymentData,
  PaymentDataUpdate,
  PaymentPlan,
  PaymentStripeCharge,
  PaymentStripeInvoices,
  PaymentStripePlan,
} from './';

export class PaymentAPI {
  public static readonly DEFAULT_INVOICES_CHUNK_SIZE = 10;
  constructor(private readonly client: HttpClient) {}

  public static readonly URL = {
    BILLING: 'billing',
    CHARGES: 'charges',
    CURRENCIES: 'currencies',
    INFO: 'info',
    INVOICES: 'invoices',
    PLAN: 'plan',
    PLANS: 'plans',
    TEAMS: '/teams',
  };

  /**
   * @deprecated Use BillingAPI
   */
  public async putPaymentData(teamId: string, paymentData: PaymentDataUpdate): Promise<PaymentData> {
    const config: AxiosRequestConfig = {
      data: paymentData,
      method: 'put',
      url: `${PaymentAPI.URL.TEAMS}/${teamId}/${PaymentAPI.URL.BILLING}`,
    };

    const response = await this.client.sendJSON<PaymentData>(config);
    return response.data;
  }

  /**
   * @deprecated Use BillingAPI
   */
  public async getPaymentData(teamId: string): Promise<PaymentData> {
    const config: AxiosRequestConfig = {
      method: 'get',
      url: `${PaymentAPI.URL.TEAMS}/${teamId}/${PaymentAPI.URL.BILLING}`,
    };

    const response = await this.client.sendJSON<PaymentData>(config);
    return response.data;
  }

  /**
   * @deprecated Use BillingAPI
   */
  public async deletePaymentData(teamId: string, paymentData: Partial<PaymentDataUpdate>): Promise<PaymentData> {
    const config: AxiosRequestConfig = {
      data: paymentData,
      method: 'delete',
      url: `${PaymentAPI.URL.TEAMS}/${teamId}/${PaymentAPI.URL.BILLING}`,
    };

    const response = await this.client.sendJSON<PaymentData>(config);
    return response.data;
  }

  /**
   * @deprecated Use BillingAPI
   */
  public async putPaymentBilling(teamId: string, billingInfo: PaymentBillingData): Promise<PaymentBillingData> {
    const config: AxiosRequestConfig = {
      data: billingInfo,
      method: 'put',
      url: `${PaymentAPI.URL.TEAMS}/${teamId}/${PaymentAPI.URL.BILLING}/${PaymentAPI.URL.INFO}`,
    };

    const response = await this.client.sendJSON<PaymentBillingData>(config);
    return response.data;
  }

  /**
   * @deprecated Use BillingAPI
   */
  public async getPaymentBilling(teamId: string): Promise<PaymentBillingData> {
    const config: AxiosRequestConfig = {
      method: 'get',
      url: `${PaymentAPI.URL.TEAMS}/${teamId}/${PaymentAPI.URL.BILLING}/${PaymentAPI.URL.INFO}`,
    };

    const response = await this.client.sendJSON<PaymentBillingData>(config);
    return response.data;
  }

  /**
   * @deprecated Use BillingAPI
   */
  public async putPaymentPlan(teamId: string, plan: PaymentPlan): Promise<void> {
    const config: AxiosRequestConfig = {
      data: plan,
      method: 'put',
      url: `${PaymentAPI.URL.TEAMS}/${teamId}/${PaymentAPI.URL.BILLING}/${PaymentAPI.URL.PLAN}/${plan.id}`,
    };

    await this.client.sendJSON(config);
  }

  /**
   * @deprecated Use BillingAPI
   */
  public async getPlans(teamId: string): Promise<PaymentStripePlan[]> {
    const config: AxiosRequestConfig = {
      method: 'get',
      url: `${PaymentAPI.URL.TEAMS}/${teamId}/${PaymentAPI.URL.BILLING}/${PaymentAPI.URL.PLANS}`,
    };

    const response = await this.client.sendJSON<PaymentStripePlan[]>(config);
    return response.data;
  }

  /**
   * @deprecated
   */
  public async getCharges(teamId: string): Promise<PaymentStripeCharge[]> {
    const config: AxiosRequestConfig = {
      method: 'get',
      url: `${PaymentAPI.URL.TEAMS}/${teamId}/${PaymentAPI.URL.BILLING}/${PaymentAPI.URL.CHARGES}`,
    };

    const response = await this.client.sendJSON<PaymentStripeCharge[]>(config);
    return response.data;
  }

  /**
   * @deprecated Use BillingAPI
   */
  public async getInvoices(
    teamId: string,
    limit: number = PaymentAPI.DEFAULT_INVOICES_CHUNK_SIZE,
    startAfterInvoiceId?: string,
  ): Promise<PaymentStripeInvoices> {
    const config: AxiosRequestConfig = {
      method: 'get',
      params: {
        size: limit,
        start: startAfterInvoiceId,
      },
      url: `${PaymentAPI.URL.TEAMS}/${teamId}/${PaymentAPI.URL.BILLING}/${PaymentAPI.URL.INVOICES}`,
    };

    const response = await this.client.sendJSON<PaymentStripeInvoices>(config);
    return response.data;
  }

  /**
   * @deprecated Use BillingAPI
   */
  public async getSupportedCurrencies(teamId: string): Promise<string[]> {
    const config: AxiosRequestConfig = {
      method: 'get',
      url: `${PaymentAPI.URL.TEAMS}/${teamId}/${PaymentAPI.URL.BILLING}/${PaymentAPI.URL.CURRENCIES}`,
    };

    const response = await this.client.sendJSON<string[]>(config);
    return response.data;
  }
}
