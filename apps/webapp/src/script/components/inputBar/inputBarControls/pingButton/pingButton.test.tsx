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

import {act, fireEvent, render} from '@testing-library/react';

import {pendingOfflineMessagesFeatureToggleName} from '../../../../featureToggles/startupFeatureToggleNames';
import {
  createRootContextValueForTest,
  createRootProviderWrapperForTest,
} from '../../../../page/testSupport/rootContextTestSupport';
import {setStrings, translate} from '../../../../util/localizerUtil';
import {useWarningsState} from '../../../../view_model/WarningsContainer/WarningsState';
import {TYPE} from '../../../../view_model/WarningsContainer/WarningsTypes';
import en from '../../../../../i18n/en-US.json';

import {PingButton} from './pingButton';

const createWrapper = (isOutboxEnabled: boolean): ReturnType<typeof createRootProviderWrapperForTest> => {
  return createRootProviderWrapperForTest(
    createRootContextValueForTest({
      translate,
      isFeatureToggleEnabled: featureName => {
        return isOutboxEnabled && featureName === pendingOfflineMessagesFeatureToggleName;
      },
    }),
  );
};

describe('PingButton', () => {
  beforeEach(() => {
    setStrings({en});
    useWarningsState.setState({name: '', warnings: []});
  });

  afterEach(() => {
    act(() => {
      useWarningsState.setState({name: '', warnings: []});
    });
  });

  it('is enabled online and sends the ping on click', () => {
    const onClick = jest.fn();
    const {getByRole} = render(<PingButton isDisabled={false} onClick={onClick} />, {wrapper: createWrapper(true)});

    const button = getByRole('button', {name: 'Ping'});
    fireEvent.click(button);

    expect(button).not.toHaveAttribute('aria-disabled');
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('stays focusable offline, explains why and ignores clicks', () => {
    act(() => {
      useWarningsState.setState({warnings: [TYPE.NO_INTERNET]});
    });
    const onClick = jest.fn();
    const {getByRole} = render(<PingButton isDisabled={false} onClick={onClick} />, {wrapper: createWrapper(true)});

    const button = getByRole('button', {name: 'Ping, not available offline'});
    button.focus();
    fireEvent.click(button);

    expect(button).toHaveAttribute('aria-disabled', 'true');
    expect(button).not.toBeDisabled();
    expect(button).toHaveFocus();
    expect(button).toHaveAttribute('title', 'Ping, not available offline');
    expect(onClick).not.toHaveBeenCalled();
  });

  it('is enabled again when back online', () => {
    act(() => {
      useWarningsState.setState({warnings: [TYPE.NO_INTERNET]});
    });
    const {getByRole} = render(<PingButton isDisabled={false} onClick={jest.fn()} />, {wrapper: createWrapper(true)});

    act(() => {
      useWarningsState.setState({warnings: []});
    });

    expect(getByRole('button', {name: 'Ping'})).not.toHaveAttribute('aria-disabled');
  });

  it('does not change offline when the outbox is off', () => {
    act(() => {
      useWarningsState.setState({warnings: [TYPE.NO_INTERNET]});
    });
    const onClick = jest.fn();
    const {getByRole} = render(<PingButton isDisabled={false} onClick={onClick} />, {wrapper: createWrapper(false)});

    const button = getByRole('button', {name: 'Ping'});
    fireEvent.click(button);

    expect(button).not.toHaveAttribute('aria-disabled');
    expect(onClick).toHaveBeenCalledTimes(1);
  });
});
