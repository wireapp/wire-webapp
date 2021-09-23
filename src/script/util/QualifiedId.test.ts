import {matchQualifiedIds} from './QualifiedId';

describe('QualifiedId util', () => {
  describe('matchQualifiedIds', () => {
    it.each([
      [
        {domain: null, id: '1', stuff: 'extra'},
        {domain: null, id: '1', property: 1},
      ],
      [
        {domain: 'wire.com', id: '1', other: 12},
        {domain: 'wire.com', id: '1'},
      ],
      [
        {domain: 'bella.wire.link', id: '1', prop: ''},
        {default: null, domain: 'bella.wire.link', id: '1'},
      ],
    ])('match entities that have similar ids (%s, %s)', (entity1, entity2) => {
      expect(matchQualifiedIds(entity1, entity2)).toBe(true);
    });

    it.each([
      [
        {domain: null, id: '1'},
        {domain: 'wire.com', id: '1'},
      ],
      [
        {domain: 'wire.com', id: '1'},
        {domain: 'wire.com', id: '2'},
      ],
      [
        {domain: 'bella.wire.link', id: '1'},
        {domain: null, id: '1'},
      ],
    ])('does not match entities that have different ids (%s, %s)', (entity1, entity2) => {
      expect(matchQualifiedIds(entity1, entity2)).toBe(false);
    });
  });
});
