import {translateForTest} from 'Util/test/translateForTest';

import {getSharedDrivePermissionHint} from './utils';

describe('getSharedDrivePermissionHint', () => {
  it('does not return the hint while the viewer permission feature is disabled', () => {
    expect(getSharedDrivePermissionHint(translateForTest, false)).toBeUndefined();
  });

  it('returns the translated hint when the viewer permission feature is enabled', () => {
    expect(getSharedDrivePermissionHint(translateForTest, true)).toBe('modalCreateConversationAdminHint');
  });
});
