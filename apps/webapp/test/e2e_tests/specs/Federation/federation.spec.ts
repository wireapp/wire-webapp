import {ApiManagerE2E} from 'test/e2e_tests/backend/apiManager.e2e';
import {User} from 'test/e2e_tests/data/user';
import {PageManager} from 'test/e2e_tests/pageManager';
import {createUser, test, withLogin} from 'test/e2e_tests/test.fixtures';
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
    normalUser = await createUser(api);
    federatedUser = await createUser(federationApiManager);
  });

  test.afterEach(async ({api}) => {
    await api.deletePersonalUser(normalUser);
    await federationApiManager.deletePersonalUser(federatedUser);
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
  });
});
