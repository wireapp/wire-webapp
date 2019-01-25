/*
 * Wire
 * Copyright (C) 2018 Wire Swiss GmbH
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program. If not, see http://www.gnu.org/licenses/.
 *
 */

import dependenciesResolver from 'src/script/util/dependenciesResolver';

describe('dependenciesResolver', () => {
  it('throws if no dependency graph was provided', () => {
    class Test {}

    expect(() => dependenciesResolver.resolve(Test)).toThrow();
  });

  it('throws if the requested class has no dependency identifier', () => {
    class Test {}
    dependenciesResolver.init(new Map());

    expect(() => dependenciesResolver.resolve(Test)).toThrow();
  });

  it('injects a logger when building a dependency', done => {
    const identifier = Symbol('Test');
    class Test {
      static get identifier() {
        return identifier;
      }

      constructor(logger) {
        expect(logger.log).toBeDefined();
        done();
      }
    }

    spyOn(Test.prototype, 'constructor');

    dependenciesResolver.init(new Map());
    const instance = dependenciesResolver.resolve(Test);

    expect(instance).toBeDefined();
  });

  it('intantiate a class only once', () => {
    const identifier = Symbol('Test');
    class Test {
      static get identifier() {
        return identifier;
      }
    }

    dependenciesResolver.init(new Map());
    const firstInstance = dependenciesResolver.resolve(Test);
    const secondInstance = dependenciesResolver.resolve(Test);

    expect(firstInstance).toBe(secondInstance);
  });
});
