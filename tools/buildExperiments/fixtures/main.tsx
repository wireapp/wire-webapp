/*
 * Wire
 * Copyright (C) 2026 Wire Swiss GmbH
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

import type {ReactElement} from 'react';

import {css} from '@emotion/react';

import {StringUtil} from '@wireapp/commons';

import {ExperimentComponent} from 'Components/ExperimentComponent';

import {ExperimentService} from './ExperimentService';
import {loadLocaleMessages} from './loadLocaleMessages';
import {getRuntimeProbeMessage} from './runtimeProbe.js';

export function renderApplicationMessage(languageCode: string): ReactElement {
  const localeMessages = loadLocaleMessages(languageCode);
  const serviceMessage = new ExperimentService('Wire').getMessage();
  const dynamicFeatureNames = ['Promise', 'Array'].flatMap(featureName => {
    return [featureName];
  });

  void import('./lazyPanel');

  return (
    <main css={css({display: 'grid', gap: 12})}>
      <ExperimentComponent
        label={StringUtil.capitalize(`${localeMessages.greeting} ${getRuntimeProbeMessage(serviceMessage)}`)}
      />
      <output>
        {
          Object.fromEntries(
            dynamicFeatureNames.map(featureName => {
              return [featureName, true];
            }),
          ).Promise
        }
      </output>
    </main>
  );
}
