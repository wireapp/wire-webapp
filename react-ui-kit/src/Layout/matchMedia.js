import {QUERY} from '../mediaQueries';

const transformName = name => name.replace(/^./, initial => `is${initial.toUpperCase()}`);

const mediaMatcher = Object.entries(QUERY).reduce(
  (matchKeys, [key, value]) => ({
    ...matchKeys,
    [transformName(key)]: () => window.matchMedia(`(${value})`).matches,
  }),
  {}
);

export {mediaMatcher};
