/*
 * Wire
 * Copyright (C) 2026 Wire Swiss GmbH
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
 */

const configurationDependencyKeyBySemanticProfile = {
  development: 'wire-web-config-default-staging',
  production: 'wire-web-config-default-master',
};

/**
 * @param {'development'|'production'} semanticProfile
 * @returns {string}
 */
function configurationDependencyKeyForSemanticProfile(semanticProfile) {
  if (!Object.hasOwn(configurationDependencyKeyBySemanticProfile, semanticProfile)) {
    throw new Error(
      `Unsupported WIRE_WEBAPP_CONFIGURATION "${semanticProfile}". Set it to "development" or "production".`,
    );
  }

  return configurationDependencyKeyBySemanticProfile[semanticProfile];
}

/**
 * @typedef {Object} ConfigurationSelectionInputs
 * @property {string|undefined} [forcedConfigUrl]
 * @property {string|undefined} [distribution]
 * @property {string|undefined} [webappConfiguration]
 * @property {string} currentTag
 */

/**
 * @typedef {Object} ConfigurationSelection
 * @property {string} semanticProfile
 * @property {string|undefined} configurationDependencyKey
 * @property {string|undefined} repositoryUrl
 * @property {string} selectionReason
 */

/**
 * Selects the configuration without reading process state or executing Git.
 *
 * @param {ConfigurationSelectionInputs} selectionInputs
 * @returns {ConfigurationSelection}
 */
function selectConfiguration(selectionInputs) {
  const {forcedConfigUrl, distribution, webappConfiguration, currentTag} = selectionInputs;

  if (forcedConfigUrl !== undefined && forcedConfigUrl !== '') {
    return {
      semanticProfile: 'forced',
      configurationDependencyKey: undefined,
      repositoryUrl: forcedConfigUrl,
      selectionReason: 'FORCED_CONFIG_URL is explicitly provided',
    };
  }

  if (distribution !== undefined && distribution !== '' && distribution !== 'wire') {
    return {
      semanticProfile: 'custom',
      configurationDependencyKey: `wire-web-config-default-${distribution}`,
      repositoryUrl: undefined,
      selectionReason: `DISTRIBUTION="${distribution}" selects a custom distribution`,
    };
  }

  if (webappConfiguration !== undefined && webappConfiguration !== '') {
    return {
      semanticProfile: webappConfiguration,
      configurationDependencyKey: configurationDependencyKeyForSemanticProfile(webappConfiguration),
      repositoryUrl: undefined,
      selectionReason: `WIRE_WEBAPP_CONFIGURATION="${webappConfiguration}" is explicitly provided`,
    };
  }

  if (currentTag.includes('staging') || currentTag.includes('production')) {
    return {
      semanticProfile: 'production',
      configurationDependencyKey: configurationDependencyKeyForSemanticProfile('production'),
      repositoryUrl: undefined,
      selectionReason: `legacy tag "${currentTag}" selects the Production profile`,
    };
  }

  return {
    semanticProfile: 'development',
    configurationDependencyKey: configurationDependencyKeyForSemanticProfile('development'),
    repositoryUrl: undefined,
    selectionReason: 'no explicit selector or relevant legacy tag; using the Development profile',
  };
}

module.exports = {
  configurationDependencyKeyForSemanticProfile,
  selectConfiguration,
};
