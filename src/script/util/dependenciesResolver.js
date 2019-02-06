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
let loggerConfig;
const logger = new z.util.Logger('dependenciesResolver');

const resolver = {
  /**
   * Will set the dependencies graph that will be used to resolve dependencies when `resolve` method is called
   *
   * @param {Map} dependencies - The dependencies graph of the app
   * @param {Object} loggerConf - Configuration for the logger that will be passed to dependencies
   * @returns {void}
   */
  init(dependencies, loggerConf) {
    dependencyGraph = dependencies;
    loggerConfig = loggerConf;
  },

  /**
   * Will instantiate the given class.
   * Will only instantiate a class once.
   * If the instance already exists, will just return this instance
   *
   * @param {class} dependencyClass - The class to instantiate
   * @returns {Object} instance - The instance of the class
   */
  resolve: memoize(dependencyClass => {
    if (!dependencyGraph) {
      logger.error('Failed to resolve dependency: no dependency graph set');
      throw new Error('Cannot resolve dependency');
    }
    const config = dependencyGraph.get(dependencyClass);
    if (!config) {
      throw new Error(`No dependencies configuration for class: ${dependencyClass}`);
    }
    const dependencies = config.dependencies.map(resolver.resolve);
    const dependencyLogger = new z.util.Logger(config.name, loggerConfig);
    return new dependencyClass(...dependencies.concat(dependencyLogger));
  }),
};

export default resolver;
