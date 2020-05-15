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

import type {APIClient} from '@wireapp/api-client';
import {amplify} from 'amplify';
import ko from 'knockout';
import {container} from 'tsyringe';
import {WebAppEvents} from '@wireapp/webapp-events';

import {Logger, getLogger} from 'Util/Logger';
import {PromiseQueue} from 'Util/PromiseQueue';
import {TIME_IN_MILLIS} from 'Util/TimeUtil';
import {isValidApiPath} from 'Util/ValidationUtil';
import {APIClientSingleton} from './APIClientSingleton';

/**
 * Settings for different backend environments
 */
interface Settings {
  restUrl: string;
  webSocketUrl: string;
}

export class BackendClient {
  private readonly apiClient: APIClient;
  private connectivityTimeout: number;
  private readonly connectivityQueue: PromiseQueue;
  private readonly logger: Logger;
  private readonly numberOfRequests: ko.Observable<number>;
  public restUrl: string;
  public webSocketUrl: string;

  static get CONFIG() {
    return {
      CONNECTIVITY_CHECK: {
        INITIAL_TIMEOUT: 0,
        RECHECK_TIMEOUT: TIME_IN_MILLIS.SECOND * 2,
        REQUEST_TIMEOUT: TIME_IN_MILLIS.SECOND * 0.5,
      },
      QUEUE_CHECK_TIMEOUT: TIME_IN_MILLIS.MINUTE,
    };
  }

  static get CONNECTIVITY_CHECK_TRIGGER() {
    return {
      ACCESS_TOKEN_REFRESH: 'BackendClient.CONNECTIVITY_CHECK_TRIGGER.ACCESS_TOKEN_REFRESH',
      ACCESS_TOKEN_RETRIEVAL: 'BackendClient.CONNECTIVITY_CHECK_TRIGGER.ACCESS_TOKEN_RETRIEVAL',
      APP_INIT_RELOAD: '.BackendClient.CONNECTIVITY_CHECK_TRIGGER.APP_INIT_RELOAD',
      CONNECTION_REGAINED: 'BackendClient.CONNECTIVITY_CHECK_TRIGGER.CONNECTION_REGAINED',
      LOGIN_REDIRECT: 'BackendClient.CONNECTIVITY_CHECK_TRIGGER.LOGIN_REDIRECT',
      REQUEST_FAILURE: 'BackendClient.CONNECTIVITY_CHECK_TRIGGER.REQUEST_FAILURE',
      UNKNOWN: 'BackendClient.CONNECTIVITY_CHECK_TRIGGER.UNKNOWN',
    };
  }

  constructor() {
    this.apiClient = container.resolve(APIClientSingleton).getClient();
    this.logger = getLogger('BackendClient');

    this.connectivityTimeout = undefined;
    this.connectivityQueue = new PromiseQueue({name: 'BackendClient.Connectivity'});

    this.numberOfRequests = ko.observable(0);
    this.numberOfRequests.subscribe(newValue => amplify.publish(WebAppEvents.TELEMETRY.BACKEND_REQUESTS, newValue));
  }

  setSettings(settings: Settings): void {
    this.restUrl = settings.restUrl;
    this.webSocketUrl = settings.webSocketUrl;
  }

  /**
   * Create a request URL.
   * @param path API endpoint path to be suffixed to REST API environment
   * @returns REST API endpoint URL
   */
  createUrl(path: string): string {
    isValidApiPath(path);
    return `${this.restUrl}${path}`;
  }

  /**
   * Request backend status.
   */
  async status(): Promise<void> {
    await this.apiClient.self.api.getSelf();
  }

  /**
   * Delay a function call until backend connectivity is guaranteed.
   * @param source Trigger that requested connectivity check
   * @returns Resolves once the connectivity is verified
   */
  async executeOnConnectivity(source: string = BackendClient.CONNECTIVITY_CHECK_TRIGGER.UNKNOWN): Promise<any> {
    this.logger.info(`Connectivity check requested by '${source}'`);
    const {INITIAL_TIMEOUT, RECHECK_TIMEOUT} = BackendClient.CONFIG.CONNECTIVITY_CHECK;

    const _resetQueue = () => {
      if (this.connectivityTimeout) {
        window.clearTimeout(this.connectivityTimeout);
        this.connectivityQueue.pause(false);
      }
      this.connectivityTimeout = undefined;
    };

    const _checkStatus = async () => {
      try {
        await this.status();
        this.logger.info('Connectivity verified');
        _resetQueue();
      } catch (error) {
        const {response, request} = error;
        const isNetworkError = !response && request && !Object.keys(request).length;
        if (isNetworkError) {
          this.logger.warn('Connectivity could not be verified... retrying');
          this.connectivityQueue.pause();
          this.connectivityTimeout = window.setTimeout(_checkStatus, RECHECK_TIMEOUT);
        } else {
          this.logger.info(`Connectivity verified by server error '${error.status}'`, error);
          _resetQueue();
        }
      }
    };

    this.connectivityQueue.pause();
    const queuedPromise = this.connectivityQueue.push(() => Promise.resolve());
    if (!this.connectivityTimeout) {
      this.connectivityTimeout = window.setTimeout(_checkStatus, INITIAL_TIMEOUT);
    }

    return queuedPromise;
  }
}
