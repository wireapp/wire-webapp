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

import {useEffect} from 'react';

import {useKoSubscribableChildren} from 'Util/ComponentUtil';
import {getLogger} from 'Util/Logger';

import {configureE2EI} from './Features/E2EIdentity';

import {TeamState} from '../../../../team/TeamState';

const logger = getLogger('FeatureConfigChangeHandler');

type Props = {
  teamState: TeamState;
};

export function FeatureConfigChangeHandler({teamState}: Props): null {
  const {teamFeatures: config} = useKoSubscribableChildren(teamState, ['teamFeatures']);

  useEffect(() => {
    if (config) {
      // initialize feature handlers
      configureE2EI(logger, config);
    }
  }, [config]);

  return null;
}
