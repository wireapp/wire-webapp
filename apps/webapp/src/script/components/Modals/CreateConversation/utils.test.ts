import {translateForTest} from '../../../util/test/translateForTest';

import {getSharedDrivePermissionHint} from './utils';

describe('getSharedDrivePermissionHint', () => {
  it('returns the translated hint', () => {
    expect(getSharedDrivePermissionHint(translateForTest)).toBe('modalCreateConversationAdminHint');
  });
});
