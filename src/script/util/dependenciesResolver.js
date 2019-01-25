/*
 * Wire
 * Copyright (C) 2019 Wire Swiss GmbH
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

import {memoize} from 'underscore';

let dependencyGraph;
const logger = new z.util.Logger('dependenciesResolver');

const resolver = {
  /**
   * Will set the dependencies graph that will be used to resolve dependencies when `resolve` method is called
   *
   * @param {Map} dependencies - The dependencies graph of the app
   * @returns {void}
   */
  init(dependencies) {
    dependencyGraph = dependencies;
  },

  /**
   * Will instantiate the given class.
   * Will only instantiate a class once.
   * If the instance already exists, will just return this instance
   *
   * @param {class} dependencyClass - The class to instantiate
   * @returns {OBject} instance - The instance of the class
   */
  resolve: memoize(dependencyClass => {
    if (!dependencyGraph) {
      logger.error('Failed to resolve dependency: no dependency graph set');
      throw new Error('Cannot resolve dependency');
    }
    const identifier = dependencyClass.identifier;
    if (!identifier) {
      logger.error(`Failed to resolve dependency: class ${dependencyClass} does not have an identifier`);
      throw new Error('Cannot resolve dependency');
    }
    const graph = dependencyGraph.get(identifier) || [];
    const dependencies = graph.map(resolver.resolve);
    const dependencyLogger = new z.util.Logger(identifier.toString(), z.config.LOGGER.OPTIONS);
    return new dependencyClass(...dependencies.concat(dependencyLogger));
  }),
};

export default resolver;
