/*
 * Wire
 * Copyright (C) 2022 Wire Swiss GmbH
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

// eslint-disable-next-line import/order
import 'core-js/full/reflect';

// eslint-disable-next-line import/order
import {createRoot} from 'react-dom/client';

import {enableLogging} from 'Util/LoggerUtil';
import {exposeWrapperGlobals} from 'Util/wrapper';

import {Root} from '../auth/page/Root';
import {Config} from '../Config';

document.addEventListener('DOMContentLoaded', async () => {
  const config = Config.getConfig();

  enableLogging(config.FEATURE.ENABLE_DEBUG);
  exposeWrapperGlobals();

  const appContainer = document.getElementById('wire-app');

  if (!appContainer) {
    throw new Error('container for application does not exist in the DOM');
  }

  createRoot(appContainer).render(<Root />);
});
