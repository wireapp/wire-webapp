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

import type {ReactNode} from 'react';

import {createRoot, type Root} from 'react-dom/client';

import type {CoreCryptoSupport} from './coreCryptoSupport';
import {CoreCryptoSupportContext} from './coreCryptoSupportContext';

/** Provide detected capabilities for both successful application startup and the upgrade UI. */
export function renderWithCoreCryptoSupport(
  container: HTMLElement,
  support: CoreCryptoSupport,
  children: ReactNode,
): Root {
  const root = createRoot(container);
  root.render(<CoreCryptoSupportContext.Provider value={support}>{children}</CoreCryptoSupportContext.Provider>);
  return root;
}
