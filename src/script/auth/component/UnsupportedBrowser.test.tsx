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

import {initialRootState} from '../module/reducer';
import {mockStoreFactory} from '../util/test/mockStoreFactory';
import UnsupportedBrowser from './UnsupportedBrowser';
import {TypeUtil} from '@wireapp/commons';
import {Config, Configuration} from '../../Config';
import {Runtime} from '@wireapp/commons';
import {mountComponentReact16} from '../util/test/TestUtil';

jest.mock('../util/SVGProvider');

const desktopMessageId = 'element-unsupported-desktop-only';
const generalMessageId = 'element-unsupported-general';

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

    const store = mockStoreFactory()({
      ...initialRootState,
      runtimeState: {
        hasCookieSupport: true,
        hasIndexedDbSupport: true,
        isSupportedBrowser: false,
      },
    });
    const {getByTestId} = mountComponentReact16(<UnsupportedBrowser />, store);

    expect(getByTestId(desktopMessageId)).not.toBe(null);
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

    const store = mockStoreFactory()({
      ...initialRootState,
      runtimeState: {
        hasCookieSupport: true,
        hasIndexedDbSupport: true,
        isSupportedBrowser: true,
      },
    });
    const props = {children: 'content'};
    const {queryByTestId, getByText} = mountComponentReact16(<UnsupportedBrowser {...props} />, store);

    expect(queryByTestId(desktopMessageId)).toBe(null);
    expect(getByText(expectedContent)).not.toBe(null);
  });

  it('shows general unsupported browser message', async () => {
    jest
      .spyOn<{getConfig: () => TypeUtil.RecursivePartial<Configuration>}, 'getConfig'>(Config, 'getConfig')
      .mockReturnValue({
        FEATURE: {
          ENABLE_ENFORCE_DESKTOP_APPLICATION_ONLY: false,
        },
      });

    const store = mockStoreFactory()({
      ...initialRootState,
      runtimeState: {
        hasCookieSupport: true,
        hasIndexedDbSupport: true,
        isSupportedBrowser: false,
      },
    });
    const {getByTestId} = mountComponentReact16(<UnsupportedBrowser />, store);

    expect(getByTestId(generalMessageId)).not.toBe(null);
  });
});
