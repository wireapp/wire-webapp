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

const {selectConfiguration} = require('../configuration-selection');

describe('selectConfiguration', () => {
  it('selects the legacy master dependency key for production', () => {
    const actualSelection = selectConfiguration({
      webappConfiguration: 'production',
      currentTag: '',
    });

    expect(actualSelection.semanticProfile).toBe('production');
    expect(actualSelection.configurationDependencyKey).toBe('wire-web-config-default-master');
  });

  it('selects the legacy staging dependency key for development', () => {
    const actualSelection = selectConfiguration({
      webappConfiguration: 'development',
      currentTag: '',
    });

    expect(actualSelection.semanticProfile).toBe('development');
    expect(actualSelection.configurationDependencyKey).toBe('wire-web-config-default-staging');
  });

  it('fails with an actionable error for unsupported explicit profiles', () => {
    expect(() => {
      selectConfiguration({
        webappConfiguration: 'staging',
        currentTag: '',
      });
    }).toThrow(new Error('Unsupported WIRE_WEBAPP_CONFIGURATION "staging". Set it to "development" or "production".'));
  });

  it('gives FORCED_CONFIG_URL the highest priority', () => {
    const actualSelection = selectConfiguration({
      forcedConfigUrl: 'https://example.test/forced-config.git#v1',
      distribution: 'custom',
      webappConfiguration: 'unsupported',
      currentTag: '2026-08-03-production',
    });

    expect(actualSelection.semanticProfile).toBe('forced');
    expect(actualSelection.configurationDependencyKey).toBeUndefined();
    expect(actualSelection.repositoryUrl).toBe('https://example.test/forced-config.git#v1');
  });

  it('retains the existing custom distribution dependency-key behavior', () => {
    const actualSelection = selectConfiguration({
      distribution: 'enterprise',
      webappConfiguration: 'production',
      currentTag: '',
    });

    expect(actualSelection.semanticProfile).toBe('custom');
    expect(actualSelection.configurationDependencyKey).toBe('wire-web-config-default-enterprise');
  });

  it('allows semantic profile selection when DISTRIBUTION is wire', () => {
    const actualSelection = selectConfiguration({
      distribution: 'wire',
      webappConfiguration: 'production',
      currentTag: '',
    });

    expect(actualSelection.semanticProfile).toBe('production');
    expect(actualSelection.configurationDependencyKey).toBe('wire-web-config-default-master');
  });

  it('retains the Production mapping for a legacy Production tag', () => {
    const actualSelection = selectConfiguration({
      currentTag: '2026-08-03-production',
    });

    expect(actualSelection.configurationDependencyKey).toBe('wire-web-config-default-master');
  });

  it('retains the Production mapping for a legacy staging tag', () => {
    const actualSelection = selectConfiguration({
      currentTag: '2026-08-03-staging',
    });

    expect(actualSelection.configurationDependencyKey).toBe('wire-web-config-default-master');
  });

  it('selects Development when no explicit profile or relevant tag exists', () => {
    const actualSelection = selectConfiguration({currentTag: 'main'});

    expect(actualSelection.semanticProfile).toBe('development');
    expect(actualSelection.configurationDependencyKey).toBe('wire-web-config-default-staging');
  });
});
