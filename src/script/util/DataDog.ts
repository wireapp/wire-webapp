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

export async function initializeDataDog(config: Configuration, user: {id?: string; domain: string}) {
  if (isDataDogInitialized) {
    return;
  }

  isDataDogInitialized = true;

  const applicationId = config.dataDog?.applicationId;
  const clientToken = config.dataDog?.clientToken;

  if (!applicationId || !clientToken) {
    return;
  }

  const {domain, id: userId} = user ?? {};

  const replacer = (_match: string, p1: string) => `${p1}***`;
  const truncateDomain = (value: string) => `${value.substring(0, 3)}***`;
  const replaceAllStrings = (string: string) => string.replaceAll(uuidRegex, replacer);
  const replaceDomains = (string: string) => (domain ? string.replaceAll(domain, truncateDomain(domain)) : string);
  const removeColors = (string: string) =>
    string.replaceAll(/%c/g, '').replaceAll(/color:[^;]+; font-weight:[^;]+; /g, '');
  const removeTimestamp = (string: string) => string.replaceAll(/\[\d+-\d+-\d+ \d+:\d+:\d+\] /g, '');

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
    trackResources: true,
    trackLongTasks: true,
    defaultPrivacyLevel: 'mask',
  });

  const {datadogLogs} = await import('@datadog/browser-logs');

  datadogLogs.init({
    clientToken,
    site: 'datadoghq.eu',
    service: 'web-internal',
    env: config.ENVIRONMENT,
    version: config.VERSION,
    forwardErrorsToLogs: true,
    forwardConsoleLogs: ['info', 'warn', 'error'], // For now those logs should be fine, we need to investigate if we need another logs in the future
    sessionSampleRate: 100,
    beforeSend: log => {
      if (log.message.match(/@wireapp\/webapp\/avs/)) {
        return false;
      }
      log.view.url = '/';
      log.message = replaceDomains(replaceAllStrings(removeTimestamp(removeColors(log.message))));
      return undefined;
    },
  });

  if (userId) {
    const id = userId.substring(0, 8);
    datadogRum.setUser({id});
    datadogLogs.setUser({id});
  }
}
