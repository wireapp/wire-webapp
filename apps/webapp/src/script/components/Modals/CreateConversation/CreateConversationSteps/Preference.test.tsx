import {getByRole, render} from '@testing-library/react';
import {Preference} from 'Components/Modals/CreateConversation/CreateConversationSteps/Preference';
import {container} from 'tsyringe';
import {TeamState} from 'Repositories/team/TeamState';
import ko from 'knockout';
import {CONVERSATION_PROTOCOL, FEATURE_STATUS} from '@wireapp/api-client/lib/team/feature/';

type TeamStateDateSet = {
  isAppsEnabled: boolean;
  hasWhitelistedServices: boolean;
  isMLSEnabled: boolean;
  defaultProtocol: CONVERSATION_PROTOCOL;
  expectedAppsEnabled: boolean;
};

describe('Preference', () => {
  beforeEach(() => {
    container.clearInstances();
  });

  it.each<TeamStateDateSet>([
    // PROTEUS
    {
      defaultProtocol: CONVERSATION_PROTOCOL.PROTEUS,
      isAppsEnabled: false,
      hasWhitelistedServices: true,
      isMLSEnabled: false,
      expectedAppsEnabled: true,
    },
    {
      defaultProtocol: CONVERSATION_PROTOCOL.PROTEUS,
      isAppsEnabled: false,
      hasWhitelistedServices: false,
      isMLSEnabled: false,
      expectedAppsEnabled: false,
    },

    // MLS
    {
      defaultProtocol: CONVERSATION_PROTOCOL.MLS,
      isAppsEnabled: false,
      hasWhitelistedServices: true,
      isMLSEnabled: true,
      expectedAppsEnabled: false,
    },
    {
      defaultProtocol: CONVERSATION_PROTOCOL.MLS,
      isAppsEnabled: true,
      hasWhitelistedServices: false,
      isMLSEnabled: true,
      expectedAppsEnabled: true,
    },
  ])(
    'should result in expectedAppsEnabled=$expectedAppsEnabled when { protocol: $defaultProtocol, appsEnabled: $isAppsEnabled, whitelisted: $hasWhitelistedServices, mlsEnabled: $isMLSEnabled }',
    ({isAppsEnabled, hasWhitelistedServices, isMLSEnabled, defaultProtocol, expectedAppsEnabled}) => {
      // Arrange
      const mockTeamState: Partial<TeamState> = {
        isMLSEnabled: ko.pureComputed(() => isMLSEnabled),
        isAppsEnabled: ko.pureComputed(() => isAppsEnabled),
        hasWhitelistedServices: ko.observable(hasWhitelistedServices),
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
      const {getByTestId} = render(<Preference />);

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
