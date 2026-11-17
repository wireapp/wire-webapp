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

import {act, screen, within} from '@testing-library/react';

import type {CoreCryptoSupport} from './coreCryptoSupport';
import {startWithCoreCryptoSupport} from './startWithCoreCryptoSupport';

import type {Translate} from '../util/localizerUtil';

const dependencies = {
  detectSupport: jest.fn<Promise<CoreCryptoSupport>, []>(),
  isDesktopApp: () => {
    return false;
  },
  initializeLocale: jest.fn(),
  translate: ((key: string) => {
    return key;
  }) as Translate,
};

describe('startWithCoreCryptoSupport', () => {
  afterEach(() => {
    document.body.replaceChildren();
    jest.clearAllMocks();
  });

  it('imports and starts the application only after support is confirmed', async () => {
    const probe = Promise.withResolvers<CoreCryptoSupport>();
    dependencies.detectSupport.mockReturnValue(probe.promise);
    const start = jest.fn(async () => {
      return undefined;
    });
    const starting = startWithCoreCryptoSupport('wire-app', start, dependencies);
    expect(start).not.toHaveBeenCalled();
    probe.resolve({missingFeatures: []});
    await starting;
    expect(start).toHaveBeenCalledTimes(1);
  });

  it.each(['wire-app', 'main'])(
    'replaces the initial loader in %s without importing the application',
    async containerId => {
      dependencies.detectSupport.mockResolvedValue({missingFeatures: ['JS Promise Integration']});
      const container = document.createElement('main');
      container.id = containerId;
      container.textContent = 'Initial loader';
      document.body.append(container);
      const start = jest.fn(async () => {
        throw new Error('CoreCrypto must not be imported');
      });
      await act(async () => {
        await startWithCoreCryptoSupport(containerId, start, dependencies);
      });
      expect(start).not.toHaveBeenCalled();
      expect(screen.queryByText('Initial loader')).not.toBeInTheDocument();
      const dialog = screen.getByRole('dialog', {name: 'coreCryptoUpgradeTitle'});
      expect(within(dialog).getByText('coreCryptoUpgradeBrowserMessage')).toBeInTheDocument();
      expect(within(dialog).getByRole('button', {name: 'coreCryptoUpgradeReload'})).toHaveFocus();
    },
  );

  it('gives Desktop users update and restart instructions', async () => {
    dependencies.detectSupport.mockResolvedValue({missingFeatures: ['JS Promise Integration']});
    const container = document.createElement('main');
    container.id = 'main';
    document.body.append(container);
    await act(async () => {
      await startWithCoreCryptoSupport('main', jest.fn(), {
        ...dependencies,
        isDesktopApp: () => {
          return true;
        },
      });
    });
    expect(screen.getByText('coreCryptoUpgradeDesktopMessage')).toBeInTheDocument();
  });
});
