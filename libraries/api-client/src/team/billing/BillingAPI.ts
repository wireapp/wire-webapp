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

export class BillingAPI {
  public static readonly DEFAULT_INVOICES_CHUNK_SIZE = 10;
  constructor(private readonly client: HttpClient) {}

  public static readonly URL = {
    BILLING: 'billing',
    CURRENCIES: 'currencies',
    INFO: 'info',
    CARD: 'card',
    COUPON: 'coupon',
    INVOICES: 'invoices',
    PLAN: 'plan',
    LIST: 'list',
    TEAMS: '/teams',
    TEAM: 'team',
    UPCOMING: 'upcoming',
  };

  public async getBillingTeam(teamId: string): Promise<BillingTeamData> {
    const config: AxiosRequestConfig = {
      method: 'get',
      url: `${BillingAPI.URL.TEAMS}/${teamId}/${BillingAPI.URL.BILLING}/${BillingAPI.URL.TEAM}`,
    };

    const response = await this.client.sendJSON<BillingTeamData>(config);
    return response.data;
  }

  public async putBillingInfo(teamId: string, billingInfo: BillingData): Promise<BillingData> {
    const config: AxiosRequestConfig = {
      data: billingInfo,
      method: 'put',
      url: `${BillingAPI.URL.TEAMS}/${teamId}/${BillingAPI.URL.BILLING}/${BillingAPI.URL.INFO}`,
    };

    const response = await this.client.sendJSON<BillingData>(config);
    return response.data;
  }

  public async getBillingInfo(teamId: string): Promise<BillingData> {
    const config: AxiosRequestConfig = {
      method: 'get',
      url: `${BillingAPI.URL.TEAMS}/${teamId}/${BillingAPI.URL.BILLING}/${BillingAPI.URL.INFO}`,
    };

    const response = await this.client.sendJSON<BillingData>(config);
    return response.data;
  }

  public async putCard(teamId: string, stripeToken: string): Promise<CardData> {
    const config: AxiosRequestConfig = {
      data: {
        stripeToken,
      },
      method: 'put',
      url: `${BillingAPI.URL.TEAMS}/${teamId}/${BillingAPI.URL.BILLING}/${BillingAPI.URL.CARD}`,
    };

    const response = await this.client.sendJSON<CardData>(config);
    return response.data;
  }

  public async getCard(teamId: string): Promise<CardData> {
    const config: AxiosRequestConfig = {
      method: 'get',
      url: `${BillingAPI.URL.TEAMS}/${teamId}/${BillingAPI.URL.BILLING}/${BillingAPI.URL.CARD}`,
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
      url: `${BillingAPI.URL.TEAMS}/${teamId}/${BillingAPI.URL.BILLING}/${BillingAPI.URL.COUPON}`,
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
      url: `${BillingAPI.URL.TEAMS}/${teamId}/${BillingAPI.URL.BILLING}/${BillingAPI.URL.COUPON}`,
    };

    await this.client.sendJSON(config);
  }

  public async getCurrentPlan(teamId: string): Promise<PlanData> {
    const config: AxiosRequestConfig = {
      method: 'get',
      url: `${BillingAPI.URL.TEAMS}/${teamId}/${BillingAPI.URL.BILLING}/${BillingAPI.URL.PLAN}`,
    };

    const response = await this.client.sendJSON<PlanData>(config);
    return response.data;
  }

  public async putPlan(teamId: string, planId: string): Promise<PlanData> {
    const config: AxiosRequestConfig = {
      data: {planId},
      method: 'put',
      url: `${BillingAPI.URL.TEAMS}/${teamId}/${BillingAPI.URL.BILLING}/${BillingAPI.URL.PLAN}`,
    };

    const response = await this.client.sendJSON<PlanData>(config);
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
      url: `${BillingAPI.URL.TEAMS}/${teamId}/${BillingAPI.URL.BILLING}/${BillingAPI.URL.PLAN}/${BillingAPI.URL.LIST}`,
    };

    const response = await this.client.sendJSON<PlanData[]>(config);
    return response.data;
  }

  public async getSupportedCurrencies(teamId: string): Promise<SupportedCurrency[]> {
    const config: AxiosRequestConfig = {
      method: 'get',
      url: `${BillingAPI.URL.TEAMS}/${teamId}/${BillingAPI.URL.BILLING}/${BillingAPI.URL.CURRENCIES}`,
    };

    const response = await this.client.sendJSON<SupportedCurrency[]>(config);
    return response.data;
  }

  public async getUpcomingInvoice(teamId: string): Promise<InvoiceUpcomingData> {
    const config: AxiosRequestConfig = {
      method: 'get',
      url: `${BillingAPI.URL.TEAMS}/${teamId}/${BillingAPI.URL.BILLING}/${BillingAPI.URL.INVOICES}/${BillingAPI.URL.UPCOMING}`,
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
      url: `${BillingAPI.URL.TEAMS}/${teamId}/${BillingAPI.URL.BILLING}/${BillingAPI.URL.INVOICES}`,
    };

    const response = await this.client.sendJSON<InvoiceListData>(config);
    return response.data;
  }
}
