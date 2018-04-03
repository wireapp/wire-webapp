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

import * as Environment from './Environment';
import mixpanel from 'mixpanel-browser';

const APP_TYPE = 'desktop';

const MIXPANEL_TOKEN = Environment.onEnvironment(
  '537da3b3bc07df1e420d07e2921a6f6f',
  '537da3b3bc07df1e420d07e2921a6f6f',
  'c7dcb15893f14932b1c31b5fb33ff669'
);

const setSuperProperty = (propertyName, value) => mixpanel.register({[propertyName]: value});

export const configureTracking = () => {
  mixpanel.init(MIXPANEL_TOKEN);
  // Exposing "mixpanel.get_distinct_id()" for test automation
  window.mixpanel = mixpanel;

  setSuperProperty(z.tracking.SuperProperty.APP, APP_TYPE);
  setSuperProperty(z.tracking.SuperProperty.APP_VERSION, z.util.Environment.version(false));
  if (z.util.Environment.desktop) {
    setSuperProperty(z.tracking.SuperProperty.WRAPPER_VERSION, z.util.Environment.version(true));
  }

  return mixpanel;
};

export default configureTracking;
