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

import {Success} from './success';

import {initialRootState} from '../module/reducer';
import {mockStoreFactory} from '../util/test/mockstorefactory';
import {mountComponent} from '../util/test/testutil';
import * as trackingUtil from '../util/trackingutil';
import * as urlUtil from '../util/urlUtil';
import * as browserLocationModule from '../../navigation/browserlocation';

jest.mock('@wireapp/react-ui-kit/lib/Images/SuccessShield', () => ({
  SuccessShield: () => <div data-uie-name="success-shield" />,
}));

jest.mock('../component/accountregistrationlayout', () => ({
  AccountRegistrationLayout: ({children}: any) => <div data-uie-name="layout">{children}</div>,
}));

describe('Success', () => {
  let replaceLocationMock: jest.SpiedFunction<typeof browserLocationModule.replaceBrowserLocation>;

  beforeEach(() => {
    jest.spyOn(trackingUtil, 'trackTelemetryPageView').mockImplementation(jest.fn());
    jest.spyOn(trackingUtil, 'resetTelemetrySession').mockImplementation(jest.fn());
    jest.spyOn(urlUtil, 'pathWithParams').mockImplementation((url: string) => url);
    replaceLocationMock = jest
      .spyOn(browserLocationModule, 'replaceBrowserLocation')
      .mockImplementation(() => undefined);
  });

  afterEach(() => {
    replaceLocationMock.mockRestore();
    jest.clearAllMocks();
  });

  const renderComponent = (component: JSX.Element) => {
    return mountComponent(component, mockStoreFactory()(initialRootState));
  };

  it('renders all expected elements', () => {
    const {getByTestId, getByText} = renderComponent(<Success />);
    expect(getByTestId('success-shield')).toBeInTheDocument();
    expect(getByText('Great, your personal account is set up. Now you can connect with people.')).toBeInTheDocument();
    expect(getByText('What do you want to do next?')).toBeInTheDocument();
    expect(getByText('Download Wire')).toBeInTheDocument();
    expect(getByText('Open Wire for web')).toBeInTheDocument();
  });

  it('calls telemetry tracking and reset on mount', () => {
    renderComponent(<Success />);
    expect(trackingUtil.trackTelemetryPageView).toHaveBeenCalledWith(trackingUtil.PageView.ACCOUNT_COMPLETION_SCREEN_4);
    expect(trackingUtil.resetTelemetrySession).toHaveBeenCalled();
  });

  it('navigates to download url when download button is clicked', () => {
    const {getAllByText} = renderComponent(<Success />);
    const downloadButton = getAllByText('Download Wire')[0];
    fireEvent.click(downloadButton);
    expect(replaceLocationMock).toHaveBeenCalledWith('https://wire.com/app-download');
  });

  it('navigates to webapp url when open webapp button is clicked', () => {
    const {getAllByText} = renderComponent(<Success />);
    const openWebAppButton = getAllByText('Open Wire for web')[0];
    fireEvent.click(openWebAppButton);
    expect(replaceLocationMock).toHaveBeenCalledWith(urlUtil.pathWithParams(expect.anything()));
  });
});
