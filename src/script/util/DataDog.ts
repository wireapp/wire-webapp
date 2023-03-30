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

import {Configuration} from '../Config';

const uuidRegex = /([a-z\d]{8})-([a-z\d]{4})-([a-z\d]{4})-([a-z\d]{4})-([a-z\d]{12})/gim;

let isDataDogInitialized = false;

export async function initializeDataDog(config: Configuration, domain?: string) {
  if (isDataDogInitialized) {
    return;
  }

  isDataDogInitialized = true;

  const applicationId = config.dataDog?.applicationId;
  const clientToken = config.dataDog?.clientToken;

  if (!applicationId || !clientToken) {
    return;
  }

  const replacer = (_match: string, p1: string) => `${p1}***`;
  const truncateDomain = (value: string) => `${value.substring(0, 3)}***`;
  const replaceAllStrings = (string: string) => string.replaceAll(uuidRegex, replacer);
  const replaceDomains = (string: string) => (domain ? string.replaceAll(domain, truncateDomain(domain)) : string);

  const {datadogRum} = await import('@datadog/browser-rum');

  datadogRum.init({
    applicationId,
    clientToken,
    site: 'datadoghq.eu',
    service: 'web-internal',
    env: config.ENVIRONMENT,
    // Specify a version number to identify the deployed version of your application in Datadog
    version: config.VERSION,
    sessionSampleRate: 100,
    sessionReplaySampleRate: 20,
    silentMultipleInit: true,
    trackUserInteractions: true,
    trackInteractions: true,
    trackResources: true,
    trackLongTasks: true,
    defaultPrivacyLevel: 'mask-user-input',
  });

  const {datadogLogs} = await import('@datadog/browser-logs');

  datadogLogs.init({
    clientToken,
    site: 'datadoghq.eu',
    service: 'web-internal',
    env: config.ENVIRONMENT,
    forwardErrorsToLogs: true,
    forwardConsoleLogs: ['info', 'warn', 'error'], // For now those logs should be fine, we need to investigate if we need another logs in the future
    sessionSampleRate: 100,
    silentMultipleInit: true,
    beforeSend: log => {
      log.view.url = '/';
      log.message = replaceDomains(replaceAllStrings(log.message));
    },
  });
}
