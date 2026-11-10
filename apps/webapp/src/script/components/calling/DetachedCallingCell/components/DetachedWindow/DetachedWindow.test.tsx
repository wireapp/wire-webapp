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

import {render, screen} from '@testing-library/react';
import {FunctionComponent} from 'react';

import {minimizeSelfViewFeatureToggleName} from '../../../../../featureToggles/startupFeatureToggleNames';
import {
  createRootContextValueForTest,
  createRootProviderWrapperForTest,
} from '../../../../../page/testSupport/rootContextTestSupport';
import {useApplicationContext} from '../../../../../page/rootProvider';
import {CallState} from '../../../../../repositories/calling/CallState';
import {translateForTest} from '../../../../../util/test/translateForTest';

jest.mock('../../../../../../style/default.less', () => {
  return {};
});

import {DetachedWindow} from './DetachedWindow';

const FeatureToggleReadout: FunctionComponent = () => {
  const {isFeatureToggleEnabled} = useApplicationContext();
  return (
    <span data-uie-name="self-view-feature-toggle">
      {String(isFeatureToggleEnabled(minimizeSelfViewFeatureToggleName))}
    </span>
  );
};

describe('DetachedWindow', () => {
  it('preserves the application feature-toggle context in its popup portal', () => {
    const callState = new CallState();
    callState.detachedWindow(window);
    const rootProviderWrapper = createRootProviderWrapperForTest(
      createRootContextValueForTest({
        translate: translateForTest,
        isFeatureToggleEnabled: featureName => {
          return featureName === minimizeSelfViewFeatureToggleName;
        },
      }),
    );

    render(
      <DetachedWindow callState={callState}>
        <FeatureToggleReadout />
      </DetachedWindow>,
      {wrapper: rootProviderWrapper},
    );

    expect(screen.getByTestId('self-view-feature-toggle')).toHaveTextContent('true');
  });
});
