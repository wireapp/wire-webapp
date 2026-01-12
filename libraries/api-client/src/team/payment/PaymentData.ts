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

import {PaymentPlanID} from './PaymentPlan';

import {InvoiceData, PaymentPlan} from './';

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

export type Subscription = {
  application: object;
  application_fee_percent: object;
  automatic_tax: {enabled: boolean; liability: object};
  billing_cycle_anchor: number;
  billing_cycle_anchor_config: object;
  billing_thresholds: object;
  cancel_at: object;
  cancel_at_period_end: boolean;
  canceled_at: object;
  cancellation_details: {comment: object; feedback: object; reason: object};
  collection_method: string;
  created: number;
  currency: string;
  current_period_end: number;
  current_period_start: number;
  customer: string;
  days_until_due: object;
  default_payment_method: object;
  default_source: object;
  default_tax_rates: any[];
  description: object;
  discount: object;
  ended_at: object;
  id: string;
  items: {
    object: string;
    data: any[];
    has_more: boolean;
    url: string;
    request_params: object;
  };
  latest_invoice: {
    account_country: string;
    account_name: string;
    account_tax_ids: object;
    amount_due: number;
    amount_paid: number;
    amount_remaining: number;
    amount_shipping: number;
    application: object;
    application_fee_amount: object;
    attempt_count: number;
    attempted: boolean;
    auto_advance: boolean;
    automatic_tax: {enabled: boolean; liability: object; status: object};
    billing_reason: string;
    charge: object;
    collection_method: string;
    created: number;
    currency: string;
    custom_fields: object;
    customer: string;
    customer_address: {
      city: string;
      country: string;
      line1: string;
      line2: string;
      postal_code: string;
      state: string;
    };
    customer_email: string;
    customer_name: string;
    customer_phone: object;
    customer_shipping: object;
    customer_tax_exempt: string;
    customer_tax_ids: any[];
    default_payment_method: object;
    default_source: object;
    default_tax_rates: any[];
    deleted: object;
    description: object;
    discount: object;
    discounts: any[];
    due_date: object;
    effective_at: number;
    ending_balance: number;
    footer: object;
    from_invoice: object;
    hosted_invoice_url: string;
    id: string;
    invoice_pdf: string;
    issuer: {account: object; type: string};
    last_finalization_error: object;
    latest_revision: object;
    lines: {
      object: string;
      data: any[];
      has_more: boolean;
      url: string;
      request_params: object;
    };
    livemode: boolean;
    metadata: {};
    next_payment_attempt: object;
    number: string;
    object: string;
    on_behalf_of: object;
    paid: boolean;
    paid_out_of_band: boolean;
    payment_intent: {
      amount: number;
      amount_capturable: number;
      amount_details: {tip: {amount: object}};
      amount_received: number;
      application: object;
      application_fee_amount: object;
      automatic_payment_methods: object;
      canceled_at: object;
      cancellation_reason: object;
      capture_method: string;
      client_secret: string;
      confirmation_method: string;
      created: number;
      currency: string;
      customer: string;
      description: string;
      id: string;
      invoice: string;
      last_payment_error: object;
      latest_charge: object;
      livemode: boolean;
      metadata: {};
      next_action: {
        alipay_handle_redirect: object;
        boleto_display_details: object;
        card_await_notification: object;
        cashapp_handle_redirect_or_display_qr_code: object;
        display_bank_transfer_instructions: object;
        konbini_display_details: object;
        oxxo_display_details: object;
        paynow_display_qr_code: object;
        pix_display_qr_code: object;
        promptpay_display_qr_code: object;
        redirect_to_url: object;
        swish_handle_redirect_or_display_qr_code: object;
        type: string;
        use_stripe_sdk: {
          directory_server_encryption: {
            algorithm: string;
            certificate: string;
            directory_server_id: string;
            root_certificate_authorities: any[];
          };
          directory_server_name: string;
          merchant: string;
          one_click_authn: object;
          server_transaction_id: string;
          three_d_secure_2_source: string;
          three_ds_method_url: string;
          three_ds_optimizations: string;
          type: string;
        };
        verify_with_microdeposits: object;
        wechat_pay_display_qr_code: object;
        wechat_pay_redirect_to_android_app: object;
        wechat_pay_redirect_to_ios_app: object;
      };
      object: string;
      on_behalf_of: object;
      payment_method: string;
      payment_method_configuration_details: object;
      payment_method_options: {
        acss_debit: object;
        affirm: object;
        afterpay_clearpay: object;
        alipay: object;
        au_becs_debit: object;
        bacs_debit: object;
        bancontact: object;
        blik: object;
        boleto: object;
        card: {
          capture_method: object;
          installments: object;
          mandate_options: object;
          network: object;
          request_extended_authorization: object;
          request_incremental_authorization: object;
          request_multicapture: object;
          request_overcapture: object;
          request_three_d_secure: string;
          require_cvc_recollection: object;
          setup_future_usage: object;
          statement_descriptor_suffix_kana: object;
          statement_descriptor_suffix_kanji: object;
        };
        card_present: object;
        cashapp: object;
        customer_balance: object;
        eps: object;
        fpx: object;
        giropay: object;
        grabpay: object;
        ideal: object;
        interac_present: object;
        klarna: object;
        konbini: object;
        link: object;
        mobilepay: object;
        oxxo: object;
        p24: object;
        paynow: object;
        paypal: {
          capture_method: object;
          preferred_locale: object;
          reference: object;
          setup_future_usage: object;
        };
        pix: object;
        promptpay: object;
        revolut_pay: object;
        sepa_debit: {mandate_options: object; setup_future_usage: object};
        sofort: object;
        swish: object;
        us_bank_account: object;
        wechat_pay: object;
        zip: object;
      };
      payment_method_types: any[];
      processing: object;
      receipt_email: object;
      review: object;
      setup_future_usage: string;
      shipping: object;
      source: object;
      statement_descriptor: object;
      statement_descriptor_suffix: object;
      status: string;
      transfer_data: object;
      transfer_group: object;
    };
    payment_settings: {
      default_mandate: object;
      payment_method_options: object;
      payment_method_types: object;
    };
    period_end: number;
    period_start: number;
    post_payment_credit_notes_amount: number;
    pre_payment_credit_notes_amount: number;
    quote: object;
    receipt_number: object;
    rendering: object;
    rendering_options: object;
    shipping_cost: object;
    shipping_details: object;
    starting_balance: number;
    statement_descriptor: object;
    status: string;
    status_transitions: {
      finalized_at: number;
      marked_uncollectible_at: object;
      paid_at: object;
      voided_at: object;
    };
    subscription: string;
    subscription_details: {metadata: {teamId: string}};
    subscription_proration_date: object;
    subtotal: number;
    subtotal_excluding_tax: number;
    tax: number;
    test_clock: object;
    threshold_reason: object;
    total: number;
    total_discount_amounts: any[];
    total_excluding_tax: number;
    total_tax_amounts: any[];
    transfer_data: object;
    webhooks_delivered_at: object;
  };
  livemode: boolean;
  metadata: {teamId: string};
  next_pending_invoice_item_invoice: object;
  object: string;
  on_behalf_of: object;
  pause_collection: object;
  payment_settings: {
    payment_method_options: object;
    payment_method_types: object;
    save_default_payment_method: string;
  };
  pending_invoice_item_interval: object;
  pending_setup_intent: null | {status: string; client_secret: string};
  pending_update: object;
  schedule: object;
  start_date: number;
  status: string;
  test_clock: object;
  transfer_data: object;
  trial_end: object;
  trial_settings: {end_behavior: {missing_payment_method: string}};
  trial_start: object;
};
