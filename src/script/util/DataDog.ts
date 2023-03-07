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

export const initializeDataDog = (config: Configuration) => {
  const applicationId = config.dataDog?.applicationId;
  const clientToken = config.dataDog?.clientToken;

  if (!applicationId || !clientToken) {
    return;
  }

  import('@datadog/browser-rum').then(({datadogRum}) => {
    datadogRum.init({
      applicationId,
      clientToken,
      site: 'datadoghq.eu',
      service: 'web-internal',
      env: config.ENVIRONMENT,
      // Specify a version number to identify the deployed version of your application in Datadog
      // version: '1.0.0',
      sessionSampleRate: 100,
      sessionReplaySampleRate: 20,
      trackUserInteractions: true,
      trackResources: true,
      trackLongTasks: true,
      defaultPrivacyLevel: 'mask-user-input',
    });

    datadogRum.startSessionReplayRecording();
  });
};
