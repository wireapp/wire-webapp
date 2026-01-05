/*
 * Wire
 * Copyright (C) 2025 Wire Swiss GmbH
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

import {fireEvent} from '@testing-library/react';

import {Success} from './Success';

import {initialRootState} from '../module/reducer';
import {mockStoreFactory} from '../util/test/mockStoreFactory';
import {mountComponent} from '../util/test/TestUtil';
import * as trackingUtil from '../util/trackingUtil';
import * as urlUtil from '../util/urlUtil';

jest.mock('Util/LocalizerUtil', () => ({
  t: (key: string) => key,
  setStrings: jest.fn(),
}));

jest.mock('@wireapp/react-ui-kit/lib/Images/SuccessShield', () => ({
  SuccessShield: () => <div data-uie-name="success-shield" />,
}));

jest.mock('../component/AccountRegistrationLayout', () => ({
  AccountRegistrationLayout: ({children}: any) => <div data-uie-name="layout">{children}</div>,
}));

describe('Success', () => {
  beforeEach(() => {
    jest.spyOn(trackingUtil, 'trackTelemetryPageView').mockImplementation(jest.fn());
    jest.spyOn(trackingUtil, 'resetTelemetrySession').mockImplementation(jest.fn());
    jest.spyOn(urlUtil, 'pathWithParams').mockImplementation((url: string) => url);

    Object.defineProperty(window, 'location', {
      writable: true,
      value: {
        ...window.location,
        replace: jest.fn(),
      },
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  const renderComponent = (component: JSX.Element) => {
    return mountComponent(component, mockStoreFactory()(initialRootState));
  };

  it('renders all expected elements', () => {
    const {getByTestId, getByText} = renderComponent(<Success />);
    expect(getByTestId('success-shield')).toBeInTheDocument();
    expect(getByText('success.header')).toBeInTheDocument();
    expect(getByText('success.subheader')).toBeInTheDocument();
    expect(getByText('success.downloadButton')).toBeInTheDocument();
    expect(getByText('success.openWebAppText')).toBeInTheDocument();
  });

  it('calls telemetry tracking and reset on mount', () => {
    renderComponent(<Success />);
    expect(trackingUtil.trackTelemetryPageView).toHaveBeenCalledWith(trackingUtil.PageView.ACCOUNT_COMPLETION_SCREEN_4);
    expect(trackingUtil.resetTelemetrySession).toHaveBeenCalled();
  });

  it('navigates to download url when download button is clicked', () => {
    const {getAllByText} = renderComponent(<Success />);
    const downloadButton = getAllByText('success.downloadButton')[0];
    fireEvent.click(downloadButton);
    expect(window.location.replace).toHaveBeenCalledWith('https://get.wire.com');
  });

  it('navigates to webapp url when open webapp button is clicked', () => {
    const {getAllByText} = renderComponent(<Success />);
    const openWebAppButton = getAllByText('success.openWebAppText')[0];
    fireEvent.click(openWebAppButton);
    expect(window.location.replace).toHaveBeenCalledWith(urlUtil.pathWithParams(expect.anything()));
  });
});
