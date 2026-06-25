import {getByRole, render} from '@testing-library/react';
import {Preference} from 'Components/modals/createconversation/createconversationsteps/preference';
import {TeamState} from 'Repositories/team/teamstate';
import {CONVERSATION_PROTOCOL, FEATURE_STATUS} from '@wireapp/api-client/lib/team/feature/';
import ko from 'knockout';
import {container} from 'tsyringe';
import {translateForTest} from 'Util/test/translatefortest';

import {
  createRootContextValueForTest,
  createRootProviderWrapperForTest,
} from 'src/script/page/testSupport/rootcontexttestsupport';

type TeamStateDateSet = {
  isAppsEnabled: boolean;
  isMLSEnabled: boolean;
  defaultProtocol: CONVERSATION_PROTOCOL;
  expectedAppsEnabled: boolean;
};

describe('Preference', () => {
  const rootContextValue = createRootContextValueForTest({translate: translateForTest});
  const rootProviderWrapper = createRootProviderWrapperForTest(rootContextValue);

  beforeEach(() => {
    container.clearInstances();
  });

  it.each<TeamStateDateSet>([
    // PROTEUS
    {
      defaultProtocol: CONVERSATION_PROTOCOL.PROTEUS,
      isAppsEnabled: false,
      isMLSEnabled: false,
      expectedAppsEnabled: true,
    },

    // MLS
    {
      defaultProtocol: CONVERSATION_PROTOCOL.MLS,
      isAppsEnabled: false,
      isMLSEnabled: true,
      expectedAppsEnabled: false,
    },
    {
      defaultProtocol: CONVERSATION_PROTOCOL.MLS,
      isAppsEnabled: true,
      isMLSEnabled: true,
      expectedAppsEnabled: true,
    },
  ])(
    'should result in expectedAppsEnabled=$expectedAppsEnabled when { protocol: $defaultProtocol, appsEnabled: $isAppsEnabled, whitelisted: $hasWhitelistedServices, mlsEnabled: $isMLSEnabled }',
    ({isAppsEnabled, isMLSEnabled, defaultProtocol, expectedAppsEnabled}) => {
      // Arrange
      const mockTeamState: Partial<TeamState> = {
        isMLSEnabled: ko.pureComputed(() => isMLSEnabled),
        isAppsEnabled: ko.pureComputed(() => isAppsEnabled),
        teamFeatures: ko.observable({
          mls: {
            config: {
              defaultProtocol,
              supportedProtocols: [defaultProtocol],
              defaultCipherSuite: 1,
              allowedCipherSuites: [1],
              protocolToggleUsers: ['protocolToggleUsers'],
            },
            status: FEATURE_STATUS.ENABLED,
          },
        }),
      };

      container.registerInstance(TeamState, mockTeamState);

      // Act
      const {getByTestId} = render(<Preference />, {wrapper: rootProviderWrapper});

      // Assert
      const servicesToggleContainer = getByTestId('info-toggle-services');
      const servicesCheckbox = getByRole(servicesToggleContainer, 'checkbox');

      if (expectedAppsEnabled) {
        expect(servicesCheckbox).toBeEnabled();
        expect(servicesToggleContainer).not.toHaveTextContent('servicesNotEnabledNoteTitle');
      } else {
        expect(servicesCheckbox).toBeDisabled();
        expect(servicesToggleContainer).toHaveTextContent('servicesNotEnabledNoteTitle');
      }
    },
  );
});
