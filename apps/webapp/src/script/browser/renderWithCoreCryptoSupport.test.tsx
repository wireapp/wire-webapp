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

import {act, screen, within} from '@testing-library/react';
import type {Root} from 'react-dom/client';

import type {CoreCryptoSupport} from './coreCryptoSupport';
import {useCoreCryptoSupport} from './coreCryptoSupportContext';
import {CoreCryptoUpgradeModal} from './coreCryptoUpgradeModal';
import {renderWithCoreCryptoSupport} from './renderWithCoreCryptoSupport';
import {startWithCoreCryptoSupport} from './startWithCoreCryptoSupport';

import type {Translate} from '../util/localizerUtil';

const translate = ((key: string) => {
  return key;
}) as Translate;
const roots: Root[] = [];

function createContainer(id: string): HTMLElement {
  const container = document.createElement('main');
  container.id = id;
  container.textContent = 'Initial loader';
  document.body.append(container);
  return container;
}

describe('renderWithCoreCryptoSupport', () => {
  afterEach(() => {
    act(() => {
      for (const root of roots.splice(0)) {
        root.unmount();
      }
    });
    document.body.replaceChildren();
  });

  it('provides detected capabilities to the application on successful startup', async () => {
    const support: CoreCryptoSupport = {missingFeatures: []};
    const observeSupport = jest.fn();
    function Application(): ReactElement {
      observeSupport(useCoreCryptoSupport());
      return <div>Application started</div>;
    }
    await act(async () => {
      await startWithCoreCryptoSupport({
        detectSupport: async () => {
          return support;
        },
        start: async detected => {
          roots.push(renderWithCoreCryptoSupport(createContainer('wire-app'), detected, <Application />));
        },
        showUnsupported: async () => {
          throw new Error('Unexpected upgrade UI');
        },
      });
    });
    expect(screen.getByText('Application started')).toBeInTheDocument();
    expect(observeSupport).toHaveBeenCalledWith(support);
  });

  it.each(['wire-app', 'main'])('provides capabilities to the upgrade UI and replaces the %s loader', async id => {
    const support: CoreCryptoSupport = {missingFeatures: ['JS Promise Integration']};
    const start = jest.fn(async () => {
      throw new Error('CoreCrypto must not be imported');
    });
    const container = createContainer(id);
    await act(async () => {
      await startWithCoreCryptoSupport({
        detectSupport: async () => {
          return support;
        },
        start,
        showUnsupported: async detected => {
          roots.push(
            renderWithCoreCryptoSupport(
              container,
              detected,
              <CoreCryptoUpgradeModal isDesktopApp={false} translate={translate} />,
            ),
          );
        },
      });
    });
    expect(start).not.toHaveBeenCalled();
    expect(screen.queryByText('Initial loader')).not.toBeInTheDocument();
    const dialog = screen.getByRole('dialog', {name: 'coreCryptoUpgradeBrowserTitle'});
    expect(within(dialog).getByText('coreCryptoUpgradeBrowserMessage')).toBeInTheDocument();
    expect(within(dialog).getByRole('button', {name: 'coreCryptoUpgradeReload'})).toHaveFocus();
  });

  it('keeps Desktop upgrade instructions available before application startup', () => {
    act(() => {
      roots.push(
        renderWithCoreCryptoSupport(
          createContainer('main'),
          {missingFeatures: ['JS Promise Integration']},
          <CoreCryptoUpgradeModal isDesktopApp translate={translate} />,
        ),
      );
    });
    expect(screen.getByText('coreCryptoUpgradeDesktopMessage')).toBeInTheDocument();
  });
});
