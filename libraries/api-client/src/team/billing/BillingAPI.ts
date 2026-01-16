/*
 * Wire
 * Copyright (C) 2021 Wire Swiss GmbH
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

import {BillingData} from './BillingInfo';
import {BillingTeamData} from './BillingTeamData';
import {CardData} from './CardData';
import {InvoiceListData} from './InvoiceListData';
import {Coupon, InvoiceUpcomingData} from './InvoiceUpcomingData';
import {PlanData, PlanInterval} from './PlanData';
import {SupportedCurrency} from './SupportedCurrency';

import {HttpClient} from '../../http';
import {Subscription} from '../payment';

export class BillingAPI {
  public static readonly DEFAULT_INVOICES_CHUNK_SIZE = 10;
  constructor(private readonly client: HttpClient) {}

  public async getBilling(teamId: string): Promise<any> {
    const config: AxiosRequestConfig = {
      method: 'get',
      url: `/teams/${teamId}/billing/checkout`,
    };

    const response = await this.client.sendJSON<any>(config);
    return response.data;
  }

  public async getBillingEmbedded(teamId: string, planId: string): Promise<any> {
    const config: AxiosRequestConfig = {
      method: 'POST',
      url: `/teams/${teamId}/billing/checkout/embedded`,
      data: {
        planId,
      },
    };

    const response = await this.client.sendJSON<any>(config);
    return response.data;
  }

  public async getBillingEmbeddedSetup(teamId: string, currency: string): Promise<any> {
    const config: AxiosRequestConfig = {
      method: 'POST',
      url: `/teams/${teamId}/billing/checkout/embedded/setup`,
      data: {
        currency,
      },
    };

    const response = await this.client.sendJSON<any>(config);
    return response.data;
  }

  public async getBillingTeam(teamId: string): Promise<BillingTeamData> {
    const config: AxiosRequestConfig = {
      method: 'get',
      url: `/teams/${teamId}/billing/team`,
    };

    const response = await this.client.sendJSON<BillingTeamData>(config);
    return response.data;
  }

  public async putBillingInfo(teamId: string, billingInfo: BillingData): Promise<BillingData> {
    const config: AxiosRequestConfig = {
      data: billingInfo,
      method: 'put',
      url: `/teams/${teamId}/billing/info`,
    };

    const response = await this.client.sendJSON<BillingData>(config);
    return response.data;
  }

  public async getBillingInfo(teamId: string): Promise<BillingData> {
    const config: AxiosRequestConfig = {
      method: 'get',
      url: `/teams/${teamId}/billing/info`,
    };

    const response = await this.client.sendJSON<BillingData>(config);
    return response.data;
  }

  public async putCard(teamId: string, paymentMethodId: string): Promise<CardData> {
    const config: AxiosRequestConfig = {
      data: {
        paymentMethod: paymentMethodId,
      },
      method: 'put',
      url: `/teams/${teamId}/billing/card`,
    };

    const response = await this.client.sendJSON<CardData>(config);
    return response.data;
  }

  public async deleteCard(teamId: string): Promise<CardData> {
    const config: AxiosRequestConfig = {
      method: 'delete',
      url: `/teams/${teamId}/billing/card`,
    };

    const response = await this.client.sendJSON<CardData>(config);
    return response.data;
  }

  public async getCard(teamId: string): Promise<CardData> {
    const config: AxiosRequestConfig = {
      method: 'get',
      url: `/teams/${teamId}/billing/card`,
    };

    const response = await this.client.sendJSON<CardData>(config);
    return response.data;
  }

  public async postCoupon(teamId: string, coupon: string): Promise<Coupon> {
    const config: AxiosRequestConfig = {
      data: {
        coupon,
      },
      method: 'post',
      url: `/teams/${teamId}/billing/coupon`,
    };

    const response = await this.client.sendJSON<Coupon>(config);
    return response.data;
  }

  public async deleteCoupon(teamId: string, coupon: string): Promise<void> {
    const config: AxiosRequestConfig = {
      data: {
        coupon,
      },
      method: 'delete',
      url: `/teams/${teamId}/billing/coupon`,
    };

    await this.client.sendJSON(config);
  }

  public async getCurrentPlan(teamId: string): Promise<PlanData> {
    const config: AxiosRequestConfig = {
      method: 'get',
      url: `/teams/${teamId}/billing/plan`,
    };

    const response = await this.client.sendJSON<PlanData>(config);
    return response.data;
  }

  public async subscribe(teamId: string, planId: string) {
    const config: AxiosRequestConfig = {
      data: {planId},
      method: 'put',
      url: `/teams/${teamId}/billing/subscription`,
    };

    const response = await this.client.sendJSON<Subscription>(config);
    return response.data;
  }

  public async getCurrentSubscription(teamId: string, planId: string) {
    const config: AxiosRequestConfig = {
      data: {planId},
      method: 'GET',
      url: `/teams/${teamId}/billing/subscription`,
    };

    const response = await this.client.sendJSON<Subscription>(config);
    return response.data;
  }

  public async putPlan(teamId: string, planId: string): Promise<PlanData> {
    const config: AxiosRequestConfig = {
      data: {planId},
      method: 'put',
      url: `/teams/${teamId}/billing/plan`,
    };

    const response = await this.client.sendJSON<PlanData>(config);
    return response.data;
  }

  public async getPlans(
    teamId: string,
    filter: {
      currency?: SupportedCurrency;
      interval?: PlanInterval;
    },
  ): Promise<PlanData[]> {
    const config: AxiosRequestConfig = {
      params: filter,
      method: 'get',
      url: `/teams/${teamId}/billing/plan/list`,
    };

    const response = await this.client.sendJSON<PlanData[]>(config);
    return response.data;
  }

  public async getAvailablePlans(
    teamId: string,
    filter: {
      currency?: SupportedCurrency;
      interval?: PlanInterval;
    },
  ): Promise<PlanData[]> {
    const config: AxiosRequestConfig = {
      params: filter,
      method: 'get',
      url: `/teams/${teamId}/billing/plan/available`,
    };

    const response = await this.client.sendJSON<PlanData[]>(config);
    return response.data;
  }

  public async getSupportedCurrencies(teamId: string): Promise<SupportedCurrency[]> {
    const config: AxiosRequestConfig = {
      method: 'get',
      url: `/teams/${teamId}/billing/currencies`,
    };

    const response = await this.client.sendJSON<SupportedCurrency[]>(config);
    return response.data;
  }

  public async getUpcomingInvoice(teamId: string): Promise<InvoiceUpcomingData> {
    const config: AxiosRequestConfig = {
      method: 'get',
      url: `/teams/${teamId}/billing/invoices/upcoming`,
    };

    const response = await this.client.sendJSON<InvoiceUpcomingData>(config);
    return response.data;
  }

  public async getInvoices(
    teamId: string,
    limit: number = BillingAPI.DEFAULT_INVOICES_CHUNK_SIZE,
    startAfterInvoiceId?: string,
  ): Promise<InvoiceListData> {
    const config: AxiosRequestConfig = {
      method: 'get',
      params: {
        size: limit,
        start: startAfterInvoiceId,
      },
      url: `/teams/${teamId}/billing/invoices`,
    };

    const response = await this.client.sendJSON<InvoiceListData>(config);
    return response.data;
  }

  public async getPortalUrl(teamId: string): Promise<any> {
    const config: AxiosRequestConfig = {
      method: 'get',
      url: `/teams/${teamId}/billing/checkout/portal`,
    };

    const response = await this.client.sendJSON<any>(config);
    return response.data;
  }
}
