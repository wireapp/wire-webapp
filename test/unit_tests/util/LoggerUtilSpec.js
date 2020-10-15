import {enableLogging} from 'src/script/util/LoggerUtil';

describe('enableLogging', () => {
  beforeEach(() => window.localStorage.clear());

  it('writes a specified logger namespace into the localStorage API', () => {
    const namespace = '@wireapp';

    enableLogging(false, `?enableLogging=${namespace}`);

    expect(localStorage.getItem('debug')).toBe(namespace);

    enableLogging(true, `?enableLogging=${namespace}`);

    expect(localStorage.getItem('debug')).toBe(namespace);
  });

  it('removes an old namespace from the localStorage when there is no new namespace', () => {
    const namespace = '@wireapp';
    localStorage.setItem('debug', namespace);

    enableLogging(false, '');

    expect(localStorage.getItem('debug')).toBe(null);
  });

  it('enable the webapp logs if dev mode is enabled', () => {
    const namespace = '@wireapp';
    localStorage.setItem('debug', namespace);

    enableLogging(true, '');

    expect(localStorage.getItem('debug')).toBe('@wireapp/webapp*');
  });
});
