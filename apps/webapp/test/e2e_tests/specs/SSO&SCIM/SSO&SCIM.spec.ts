import {test} from 'test/e2e_tests/test.fixtures';

test.describe('SSO & SCIM', () => {
  test(
    'I want to register a new account with SSO (green path)',
    {tag: ['@TC-1735', '@regression']},
    async ({createTeam}) => {
      const team = await createTeam('SSO Team', {features: {sso: true}});
      const owner = team.owner;
    },
  );
});
