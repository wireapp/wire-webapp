/*
 * Wire
 * Copyright (C) 2021 Wire Swiss GmbH
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

import {ReactWrapper} from 'enzyme';
import {initialRootState, RootState, Api} from '../module/reducer';
import {mockStoreFactory} from '../util/test/mockStoreFactory';
import {mountComponent} from '../util/test/TestUtil';
import UnsupportedBrowser, {UnsupportedBrowserProps} from './UnsupportedBrowser';
import {TypeUtil} from '@wireapp/commons';
import {MockStoreEnhanced} from 'redux-mock-store';
import {ThunkDispatch} from 'redux-thunk';
import {AnyAction} from 'redux';
import {History} from 'history';
import {Config, Configuration} from '../../Config';
import {Runtime} from '@wireapp/commons';

jest.mock('../util/SVGProvider');

class UnsupportedBrowserPage {
  private readonly driver: ReactWrapper;

  constructor(
    store: MockStoreEnhanced<TypeUtil.RecursivePartial<RootState>, ThunkDispatch<RootState, Api, AnyAction>>,
    props?: UnsupportedBrowserProps,
    history?: History<any>,
  ) {
    this.driver = mountComponent(<UnsupportedBrowser {...props} />, store, history);
  }

  getOnlyDesktopMessage = () => this.driver.find('[data-uie-name="element-unsupported-desktop-only"]');
  getGeneralUnsupprtedMessage = () => this.driver.find('[data-uie-name="element-unsupported-general"]');
  getText = () => this.driver.text();

  update = () => this.driver.update();
}

describe('UnsupportedBrowser', () => {
  // @SF.Channel @TSFI.UserInterface @S1
  it('shows desktop usage only error in browser when ENABLE_ENFORCE_DESKTOP_APPLICATION_ONLY is true', async () => {
    jest.spyOn(Runtime, 'isDesktopApp').mockReturnValue(false);
    jest
      .spyOn<{getConfig: () => TypeUtil.RecursivePartial<Configuration>}, 'getConfig'>(Config, 'getConfig')
      .mockReturnValue({
        FEATURE: {
          ENABLE_ENFORCE_DESKTOP_APPLICATION_ONLY: true,
        },
      });

    const unsupportedPage = new UnsupportedBrowserPage(
      mockStoreFactory()({
        ...initialRootState,
        runtimeState: {
          hasCookieSupport: true,
          hasIndexedDbSupport: true,
          isSupportedBrowser: false,
        },
      }),
    );

    expect(unsupportedPage.getOnlyDesktopMessage().exists()).toBe(true);
  });

  it('renders content in desktop application when ENABLE_ENFORCE_DESKTOP_APPLICATION_ONLY is true', async () => {
    jest.spyOn(Runtime, 'isDesktopApp').mockReturnValue(true);
    jest
      .spyOn<{getConfig: () => TypeUtil.RecursivePartial<Configuration>}, 'getConfig'>(Config, 'getConfig')
      .mockReturnValue({
        FEATURE: {
          ENABLE_ENFORCE_DESKTOP_APPLICATION_ONLY: true,
        },
      });

    const expectedContent = 'content';

    const unsupportedPage = new UnsupportedBrowserPage(
      mockStoreFactory()({
        ...initialRootState,
        runtimeState: {
          hasCookieSupport: true,
          hasIndexedDbSupport: true,
          isSupportedBrowser: true,
        },
      }),
      {children: 'content'},
    );

    expect(unsupportedPage.getOnlyDesktopMessage().exists()).toBe(false);
    expect(unsupportedPage.getText()).toContain(expectedContent);
  });

  it('shows general unsupported browser message', async () => {
    jest
      .spyOn<{getConfig: () => TypeUtil.RecursivePartial<Configuration>}, 'getConfig'>(Config, 'getConfig')
      .mockReturnValue({
        FEATURE: {
          ENABLE_ENFORCE_DESKTOP_APPLICATION_ONLY: false,
        },
      });

    const unsupportedPage = new UnsupportedBrowserPage(
      mockStoreFactory()({
        ...initialRootState,
        runtimeState: {
          hasCookieSupport: true,
          hasIndexedDbSupport: true,
          isSupportedBrowser: false,
        },
      }),
    );

    expect(unsupportedPage.getGeneralUnsupprtedMessage().exists()).toBe(true);
  });
});
