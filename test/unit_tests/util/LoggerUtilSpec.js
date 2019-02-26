import {enableLogging} from 'src/script/util/LoggerUtil';

describe('enableLogging', () => {
  beforeEach(() => window.localStorage.clear());

  it('writes a specified logger namespace into the localStorage API', () => {
    const namespace = '@wireapp';
    const mockedURL = {
      searchParams: {
        get: () => namespace,
      },
    };

    enableLogging(mockedURL);

    expect(localStorage.getItem('debug')).toBe(namespace);
  });

  it('removes an old namespace from the localStorage when there is no new namespace', () => {
    const namespace = '@wireapp';
    const mockedURL = {
      searchParams: {
        get: () => undefined,
      },
    };
    localStorage.setItem('debug', namespace);

    enableLogging(mockedURL);

    expect(localStorage.getItem('debug')).toBe(null);
  });
});
