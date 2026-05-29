import {ApiManagerE2E} from 'test/e2e_tests/backend/apiManager.e2e';
import {User} from 'test/e2e_tests/data/user';
import {PageManager} from 'test/e2e_tests/pageManager';
import {test, withLogin, expect, createTeam} from 'test/e2e_tests/test.fixtures';
import {sendConnectionRequest} from 'test/e2e_tests/utils/userActions';

test.describe('Federation', () => {
  const federationBaseUrl = process.env.FEDERATION_WEBAPP_URL!;
  const federationApiManager = new ApiManagerE2E({
    backendUrl: process.env.FEDERATION_BACKEND_URL!,
    basicAuth: process.env.FEDERATION_BASIC_AUTH!,
  });

  let normalUser: User;
  let federatedUser: User;

  test.beforeEach(async ({api}) => {
    normalUser = (await createTeam(api, 'Normal Team')).owner;
    federatedUser = (await createTeam(federationApiManager, 'Federated Team')).owner;
  });

  test.afterEach(async ({api}) => {
    await api.team.deleteTeam(normalUser, normalUser.teamId);
    await federationApiManager.team.deleteTeam(federatedUser, federatedUser.teamId);
  });

  test('I want to start a 1:1 call with a federated User', {tag: ['@TC-3208', '@regression']}, async ({createPage}) => {
    const [normalUserPage, federatedUserPage] = await Promise.all([
      createPage(withLogin(normalUser)),
      createPage(withLogin(federatedUser, {baseUrl: federationBaseUrl})),
    ]);
    await sendConnectionRequest(normalUserPage, federatedUser);

    const {pages: normalUserPages} = PageManager.from(normalUserPage).webapp;
    const {pages: federatedUserPages} = PageManager.from(federatedUserPage).webapp;

    await federatedUserPages.conversationList().openPendingConnectionRequest();
    await federatedUserPages.connectRequest().clickConnectButton();

    await normalUserPages.conversationList().getConversation(federatedUser.fullName, {protocol: 'mls'}).open();
    await federatedUserPages.conversationList().getConversation(normalUser.fullName, {protocol: 'mls'}).open();

    await normalUserPages.conversation().callButton.click();
    await federatedUserPages.calling().acceptCallButton.click();

    await normalUserPages.calling().toggleVideoButton.click();
    await federatedUserPages.calling().toggleVideoButton.click();

    const normalUserCall = await normalUserPages.calling().maximizeCell();
    const federatedUserCall = await federatedUserPages.calling().maximizeCell();

    await expect(normalUserCall.getCallingParticipant(federatedUser.fullName).muteIcon).not.toBeVisible();
    await expect(normalUserCall.getGridTile(federatedUser.fullName).videoElement).toBeVisible();

    await expect(federatedUserCall.getCallingParticipant(normalUser.fullName).muteIcon).not.toBeVisible();
    await expect(federatedUserCall.getGridTile(normalUser.fullName).videoElement).toBeVisible();
  });
});
