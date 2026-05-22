/*
 * Wire
 * Copyright (C) 2019 Wire Swiss GmbH
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

import {queryByRole, render} from '@testing-library/react';
import {ServicesOptions} from './servicesOptions';
import {TeamState} from 'Repositories/team/TeamState';
import ko from 'knockout';
import {Conversation} from 'Repositories/entity/Conversation';
import {
  createRootContextValueForTest,
  createRootProviderWrapperForTest,
} from 'src/script/page/testSupport/rootContextTestSupport';
import {CONVERSATION_PROTOCOL} from '@wireapp/api-client/lib/team';

type TestData = {
  protocol: CONVERSATION_PROTOCOL;
  isAppsEnabled: boolean;
  isServicesRoom: boolean;
  isGuestAndServicesRoom: boolean;
  expectedToggleToBeVisible: boolean;
};

const rootContextValue = createRootContextValueForTest({});
const rootProviderWrapper = createRootProviderWrapperForTest(rootContextValue);

describe('serviceOptions', () => {
  it.each<TestData>([
    // PROTEUS
    {
      protocol: CONVERSATION_PROTOCOL.PROTEUS,
      isAppsEnabled: false,
      isServicesRoom: true,
      isGuestAndServicesRoom: false,
      expectedToggleToBeVisible: true,
    },
    {
      protocol: CONVERSATION_PROTOCOL.PROTEUS,
      isAppsEnabled: false,
      isServicesRoom: false,
      isGuestAndServicesRoom: true,
      expectedToggleToBeVisible: true,
    },
    {
      protocol: CONVERSATION_PROTOCOL.PROTEUS,
      isAppsEnabled: false,
      isServicesRoom: false,
      isGuestAndServicesRoom: false,
      expectedToggleToBeVisible: true,
    },
    {
      protocol: CONVERSATION_PROTOCOL.PROTEUS,
      isAppsEnabled: false,
      isServicesRoom: true,
      isGuestAndServicesRoom: false,
      expectedToggleToBeVisible: true,
    },
    // MLS
    {
      protocol: CONVERSATION_PROTOCOL.MLS,
      isAppsEnabled: false,
      isServicesRoom: false,
      isGuestAndServicesRoom: false,
      expectedToggleToBeVisible: false,
    },
    {
      protocol: CONVERSATION_PROTOCOL.MLS,
      isAppsEnabled: false,
      isServicesRoom: true,
      isGuestAndServicesRoom: false,
      expectedToggleToBeVisible: true,
    },
    {
      protocol: CONVERSATION_PROTOCOL.MLS,
      isAppsEnabled: true,
      isServicesRoom: false,
      isGuestAndServicesRoom: false,
      expectedToggleToBeVisible: true,
    },
    {
      protocol: CONVERSATION_PROTOCOL.MLS,
      isAppsEnabled: true,
      isServicesRoom: true,
      isGuestAndServicesRoom: false,
      expectedToggleToBeVisible: true,
    },
  ])(
    'should make toggle visibility $expectedToggleToBeVisible',
    ({protocol, isAppsEnabled, isServicesRoom, isGuestAndServicesRoom, expectedToggleToBeVisible}) => {
      // Arrange
      const mockTeamState: Partial<TeamState> = {
        isAppsEnabled: ko.pureComputed(() => isAppsEnabled),
      };

      const mockConversation: Partial<Conversation> = {
        protocol,
        isServicesRoom: ko.pureComputed(() => isServicesRoom),
        isGuestAndServicesRoom: ko.pureComputed(() => isGuestAndServicesRoom),
      };

      // Act
      const {container} = render(
        <ServicesOptions
          activeConversation={mockConversation as Conversation}
          toggleAccessState={jest.fn()}
          teamState={mockTeamState as TeamState}
        />,
        {wrapper: rootProviderWrapper},
      );

      // Assert
      if (expectedToggleToBeVisible) {
        expect(container).not.toHaveTextContent('servicesNotEnabledNoteTitle');
        expect(queryByRole(container, 'checkbox')).toBeInTheDocument();
      } else {
        expect(container).toHaveTextContent('servicesNotEnabledNoteTitle');
        expect(queryByRole(container, 'checkbox')).not.toBeInTheDocument();
      }
    },
  );
});
