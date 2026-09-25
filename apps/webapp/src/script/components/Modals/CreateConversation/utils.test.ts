import {getSharedDrivePermissionHint} from './utils';
import type {Translate} from './utils';

describe('getSharedDrivePermissionHint', () => {
  const translate = ((key: string) =>
    key === 'modalCreateConversationAdminHint' ? 'permission hint' : '') as Translate;

  it('does not return the hint while the viewer permission feature is disabled', () => {
    expect(getSharedDrivePermissionHint(translate, false)).toBeUndefined();
  });

  it('returns the translated hint when the viewer permission feature is enabled', () => {
    expect(getSharedDrivePermissionHint(translate, true)).toBe('permission hint');
  });
});
