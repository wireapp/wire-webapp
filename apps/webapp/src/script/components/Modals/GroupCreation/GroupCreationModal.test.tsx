import {CONVERSATION_PROTOCOL, FEATURE_STATUS} from "@wireapp/api-client/lib/team";
import {TeamState} from "Repositories/team/TeamState";
import ko from "knockout";
import {container} from "tsyringe";
import {GroupCreationModal} from "Components/Modals/GroupCreation/GroupCreationModal";
import {act, getByRole} from "@testing-library/react";
import {UserState} from "Repositories/user/UserState";
import {User} from "Repositories/entity/User";
import {ConversationRepository} from "Repositories/conversation/ConversationRepository";
import {SearchRepository} from "Repositories/search/SearchRepository";
import {TeamRepository} from "Repositories/team/TeamRepository";
import {RootContext} from "../../../page/RootProvider";
import {amplify} from "amplify";
import {WebAppEvents} from "@wireapp/webapp-events";
import {mountComponent} from "../../../auth/util/test/TestUtil";
import {mockStoreFactory} from "../../../auth/util/test/mockStoreFactory";
import {initialRootState} from "../../../auth/module/reducer";
import {t} from "Util/localizerUtil";

type TeamStateDateSet = {
  isAppsEnabled: boolean;
  hasWhitelistedServices: boolean;
  isMLSEnabled: boolean;
  defaultProtocol: CONVERSATION_PROTOCOL;
  expectedAppsEnabled: boolean;
};

describe('GroupCreationModal', () => {
  it.each<TeamStateDateSet>([
    // PROTEUS
    {
      defaultProtocol: CONVERSATION_PROTOCOL.PROTEUS,
      isAppsEnabled: false,
      hasWhitelistedServices: true,
      isMLSEnabled: false,
      expectedAppsEnabled: true
    },
    {
      defaultProtocol: CONVERSATION_PROTOCOL.PROTEUS,
      isAppsEnabled: false,
      hasWhitelistedServices: false,
      isMLSEnabled: false,
      expectedAppsEnabled: false
    },

    // MLS
    {
      defaultProtocol: CONVERSATION_PROTOCOL.MLS,
      isAppsEnabled: false,
      hasWhitelistedServices: true,
      isMLSEnabled: true,
      expectedAppsEnabled: false
    },
    {
      defaultProtocol: CONVERSATION_PROTOCOL.MLS,
      isAppsEnabled: true,
      hasWhitelistedServices: false,
      isMLSEnabled: true,
      expectedAppsEnabled: true
    },
  ])(
    'should result in expectedAppsEnabled=$expectedAppsEnabled when { protocol: $defaultProtocol, appsEnabled: $isAppsEnabled, whitelisted: $hasWhitelistedServices, mlsEnabled: $isMLSEnabled }',
    ({isAppsEnabled, hasWhitelistedServices, isMLSEnabled, defaultProtocol, expectedAppsEnabled}) => {
      // Arrange
      const mockUser = new User('user-id', 'test-domain.wire.com');

      const mockUserState: UserState = {
        self: ko.observable(mockUser),
        users: ko.observableArray<User>([]),
        connectedUsers: ko.pureComputed(() => [] as User[]),
        connectRequests: ko.pureComputed(() => [] as User[]),
      };

      const mockTeamState: Partial<TeamState> = {
        isMLSEnabled: ko.pureComputed(() => isMLSEnabled),
        isAppsEnabled: ko.pureComputed(() => isAppsEnabled),
        hasWhitelistedServices: ko.observable(hasWhitelistedServices),
        isTeam: ko.pureComputed(() => true),
        teamFeatures: ko.observable({
          mls: {
            config: {
              defaultProtocol,
              supportedProtocols: [defaultProtocol],
              defaultCipherSuite: 1,
              allowedCipherSuites: [1],
              protocolToggleUsers: ['protocolToggleUsers']
            },
            status: FEATURE_STATUS.ENABLED
          },
        }),
      };

      container.clearInstances();
      container.registerInstance(UserState, mockUserState as any);

      const mockRootContext = {
        mainViewModel: {
          content: {
            repositories: {
              conversation: {} as ConversationRepository,
              search: {} as SearchRepository,
              team: {} as TeamRepository,
            }
          }
        }
      };

      // Act
      const {getByTestId} = mountComponent(
        <RootContext.Provider value={mockRootContext as any}>
          <GroupCreationModal userState={mockUserState} teamState={mockTeamState as TeamState}/>
        </RootContext.Provider>,
        mockStoreFactory()({
          ...initialRootState,
          authState: {
            account: {
              email: '',
              name: '',
              password: '',
            },
          },
        }),
      );

      act(() => {
        amplify.publish(WebAppEvents.CONVERSATION.CREATE_GROUP, "test-event", null);
      });

      // Assert
      const servicesToggleContainer = getByTestId('info-toggle-services');
      const servicesCheckbox = getByRole(servicesToggleContainer, 'checkbox');

      if(expectedAppsEnabled) {
        expect(servicesCheckbox).toBeEnabled();
        expect(servicesToggleContainer).not.toHaveTextContent(t('servicesNotEnabledNoteTitle'));
      } else {
        expect(servicesCheckbox).toBeDisabled();
        expect(servicesToggleContainer).toHaveTextContent(t('servicesNotEnabledNoteTitle'));
      }
    });
});
