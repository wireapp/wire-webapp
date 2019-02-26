import {enableLogging} from 'src/script/util/LoggerUtil';

describe('enableLogging', () => {
  beforeEach(() => window.localStorage.clear());

  it('writes a specified logger namespace into the localStorage API', () => {
    const namespace = '@wireapp';

    enableLogging(`https://app.wire.com/auth/?enableLogging=${namespace}`);

    expect(localStorage.getItem('debug')).toBe(namespace);
  });

  it('removes an old namespace from the localStorage when there is no new namespace', () => {
    const namespace = '@wireapp';
    localStorage.setItem('debug', namespace);

    enableLogging('https://app.wire.com/auth/');

    expect(localStorage.getItem('debug')).toBe(null);
  });
});
