import {getCurrentFolderName} from './getCurrentFolderName';

describe('getCurrentFolderName', () => {
  it('returns the last folder from a nested path', () => {
    expect(getCurrentFolderName('Parent/Current folder')).toBe('Current folder');
  });

  it('returns nothing for the drive root', () => {
    expect(getCurrentFolderName('')).toBe('');
  });

  it('returns nothing for the recycle bin path', () => {
    expect(getCurrentFolderName('recycle_bin')).toBe('');
  });
});
