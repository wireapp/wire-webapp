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

import {InvoiceData, PaymentPlan} from './';
import {PaymentPlanID} from './PaymentPlan';

export enum PaymentStatus {
  ACTIVE = 'active',
  CANCELED = 'canceled',
  PAST_DUE = 'past_due',
  TRIALING = 'trialing',
  UNPAID = 'unpaid',
}

export interface PaymentCardData {
  brand: string;
  country: string;
  digits: string;
  expMonth: number;
  expYear: number;
  holder: string;
  zip: string;
}

export interface PaymentSuspension {
  created: number;
  graceEnding: number;
  invoice: string;
}

export interface PaymentData {
  bankTransfer: boolean;
  card: PaymentCardData;
  invoice: InvoiceData;
  plan: PaymentPlan;
  planId: PaymentPlanID;
  seats: number;
  status: PaymentStatus;
  suspend?: PaymentSuspension;
  trialEndsAt: number;
}
