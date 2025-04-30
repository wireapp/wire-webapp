import {test, expect} from '@playwright/test';
import {getCredentials} from './utils/credentialsReader';

// This test is only needed to test the integration with 1Password
// It can be removed later
test('read secret from 1Password', async () => {
  const secretId = 'KEYCLOAK_PASSWORD';
  const field = 'password';
  const secret = getCredentials(secretId, field);

  console.log('Retrieved secret from 1Password:', secret);
  expect(secret).toBeTruthy();
});
