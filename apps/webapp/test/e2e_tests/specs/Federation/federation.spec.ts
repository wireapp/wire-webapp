import {ApiManagerE2E} from 'test/e2e_tests/backend/apiManager.e2e';
import {User} from 'test/e2e_tests/data/user';
import {createUser, test} from 'test/e2e_tests/test.fixtures';

test.describe('Federation', () => {
  const federationApiManager = new ApiManagerE2E({
    backendUrl: process.env.FEDERATION_BACKEND_URL!,
    basicAuth: process.env.FEDERATION_BASIC_AUTH!,
  });

  let federatedUser: User;

  test.beforeEach(async () => {
    federatedUser = await createUser(federationApiManager);
  });

  test.afterEach(async () => {
    await federationApiManager.deletePersonalUser(federatedUser);
  });

  test('I want to start a 1:1 call with a federated User', {tag: ['@TC-3208', '@regression']}, async ({}) => {});
});
