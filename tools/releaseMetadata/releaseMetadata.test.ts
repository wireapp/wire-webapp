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
 *
 */

import assert from 'node:assert';

import {
  createMaintenanceBranchName,
  createNextMaintenanceTagName,
  validateMaintenanceBranchName,
  validateMaintenanceLineKey,
  validateMaintenanceSource,
  validateMaintenanceTagName,
  validateProductionTagName,
} from './releaseMetadata';
import {resolveWebappBuildVersion} from './webappProductionRelease';

describe('releaseMetadata', () => {
  it('validateProductionTagName() accepts a production tag name', () => {
    const productionTagName = '2026-06-19.1-production';

    const actualProductionTagName = validateProductionTagName(productionTagName);

    assert(actualProductionTagName.isOk === true);

    expect(actualProductionTagName.value).toBe(productionTagName);
  });

  it.each(['2026-07-27.1-airgap-a', '2026-07-27.1-airgap-hotfix'])(
    'validateMaintenanceLineKey() accepts valid maintenance line key "%s"',
    maintenanceLineKey => {
      const actualMaintenanceLineKey = validateMaintenanceLineKey(maintenanceLineKey);

      assert(actualMaintenanceLineKey.isOk);

      expect(actualMaintenanceLineKey.value).toBe(maintenanceLineKey);
    },
  );

  it.each([
    '2026-07-27.0-airgap-a',
    '2026-07-27-airgap-a',
    '2026-7-27.1-airgap-a',
    '2026-07-27.1',
    '2026-07-27.1-Airgap-a',
    '2026-07-27.1-airgap--a',
    '2026-07-27.1-airgap-',
    '2026-07-27.1-air_gap',
    '2026-07-27.1-airgap/a',
    '2026-07-27.1-airgap a',
  ])('validateMaintenanceLineKey() rejects malformed maintenance line key "%s"', invalidMaintenanceLineKey => {
    const actualMaintenanceLineKey = validateMaintenanceLineKey(invalidMaintenanceLineKey);

    assert(actualMaintenanceLineKey.isErr);

    expect(actualMaintenanceLineKey.error.message).toBe(`Invalid maintenance line key: ${invalidMaintenanceLineKey}`);
  });

  it('createMaintenanceBranchName() creates the maintenance branch name', () => {
    const maintenanceLineKey = '2026-07-27.1-airgap-a';

    const actualMaintenanceBranchName = createMaintenanceBranchName(maintenanceLineKey);

    assert(actualMaintenanceBranchName.isOk);

    expect(actualMaintenanceBranchName.value).toBe('maintenance/2026-07-27.1-airgap-a');
  });

  it('validateMaintenanceBranchName() accepts a generated maintenance branch name', () => {
    const maintenanceBranchName = 'maintenance/2026-07-27.1-airgap-a';

    const actualMaintenanceBranchName = validateMaintenanceBranchName(maintenanceBranchName);

    assert(actualMaintenanceBranchName.isOk);

    expect(actualMaintenanceBranchName.value).toBe(maintenanceBranchName);
  });

  it.each(['maintenance/2026-07-27.0-airgap-a', 'release/1.1.0', 'maintenance/2026-07-27.1-airgap--a'])(
    'validateMaintenanceBranchName() rejects invalid maintenance branch name "%s"',
    invalidMaintenanceBranchName => {
      const actualMaintenanceBranchName = validateMaintenanceBranchName(invalidMaintenanceBranchName);

      assert(actualMaintenanceBranchName.isErr);

      expect(actualMaintenanceBranchName.error.message).toBe(
        `Invalid maintenance branch name: ${invalidMaintenanceBranchName}`,
      );
    },
  );

  it.each(['2026-07-27.1-airgap-a-maintenance.1', '2026-07-27.1-airgap-a-hotfix-maintenance.10'])(
    'validateMaintenanceTagName() accepts a valid maintenance tag "%s"',
    maintenanceTagName => {
      const actualMaintenanceTagName = validateMaintenanceTagName(maintenanceTagName);

      assert(actualMaintenanceTagName.isOk);

      expect(actualMaintenanceTagName.value).toBe(maintenanceTagName);
    },
  );

  it.each([
    '2026-07-27.0-airgap-a-maintenance.1',
    '2026-07-27.1-airgap-a-maintenance.0',
    '2026-07-27.1-airgap-a-maintenance.x',
    '2026-07-27.1-Airgap-a-maintenance.1',
    '2026-07-27.1-airgap--a-maintenance.1',
    '2026-07-27.1-airgap-a-maintenance-1',
    '2026-07-27.1-airgap-a-maintenance.1/extra',
  ])('validateMaintenanceTagName() rejects invalid maintenance tag "%s"', invalidMaintenanceTagName => {
    const actualMaintenanceTagName = validateMaintenanceTagName(invalidMaintenanceTagName);

    assert(actualMaintenanceTagName.isErr);

    expect(actualMaintenanceTagName.error.message).toBe(`Invalid maintenance tag name: ${invalidMaintenanceTagName}`);
  });

  it('createNextMaintenanceTagName() starts at maintenance.1 with an empty history', () => {
    const actualNextMaintenanceTagName = createNextMaintenanceTagName('2026-07-27.1-airgap-a', []);

    assert(actualNextMaintenanceTagName.isOk);

    expect(actualNextMaintenanceTagName.value).toBe('2026-07-27.1-airgap-a-maintenance.1');
  });

  it('createNextMaintenanceTagName() increments maintenance.9 to maintenance.10', () => {
    const actualNextMaintenanceTagName = createNextMaintenanceTagName('2026-07-27.1-airgap-a', [
      '2026-07-27.1-airgap-a-maintenance.9',
    ]);

    assert(actualNextMaintenanceTagName.isOk);

    expect(actualNextMaintenanceTagName.value).toBe('2026-07-27.1-airgap-a-maintenance.10');
  });

  it('createNextMaintenanceTagName() ignores malformed and different-line maintenance tags', () => {
    const maintenanceLineKey = '2026-07-27.1-airgap-a';
    const existingTagNames = [
      '2026-07-27.1-airgap-ab-maintenance.99',
      '2026-07-27.1-airgap-a-maintenance.0',
      '2026-07-27.1-airgap-a-maintenance.01',
      '2026-07-27.1-airgap-a-maintenance.x',
      '2026-07-27.1-airgap-a-maintenance.2-extra',
      '2026-07-27.1-airgap-a-maintenance.2',
    ];

    const actualNextMaintenanceTagName = createNextMaintenanceTagName(maintenanceLineKey, existingTagNames);

    assert(actualNextMaintenanceTagName.isOk);

    expect(actualNextMaintenanceTagName.value).toBe('2026-07-27.1-airgap-a-maintenance.3');
  });

  it('createNextMaintenanceTagName() ignores unrelated tags', () => {
    const actualNextMaintenanceTagName = createNextMaintenanceTagName('2026-07-27.1-airgap-a', [
      '2026-07-27.1-airgap-b-maintenance.9',
      '2026-07-27.1-airgap-a-maintenance.2',
      '2026-07-27.1-production',
      'unrelated-tag',
    ]);

    assert(actualNextMaintenanceTagName.isOk);

    expect(actualNextMaintenanceTagName.value).toBe('2026-07-27.1-airgap-a-maintenance.3');
  });

  it('validateMaintenanceSource() accepts a matching Production tag', () => {
    const actualSourceProductionTag = validateMaintenanceSource('2026-07-27.1-airgap-a', '2026-07-27.1-production');

    assert(actualSourceProductionTag.isOk);

    expect(actualSourceProductionTag.value).toBe('2026-07-27.1-production');
  });

  it('validateMaintenanceSource() rejects a Production tag from a different release identifier', () => {
    const actualSourceProductionTag = validateMaintenanceSource('2026-07-27.1-airgap-a', '2026-07-28.1-production');

    assert(actualSourceProductionTag.isErr);

    expect(actualSourceProductionTag.error.message).toBe(
      'Source production tag 2026-07-28.1-production does not belong to maintenance line 2026-07-27.1-airgap-a',
    );
  });

  it('validateMaintenanceSource() rejects a legacy Production tag', () => {
    const actualSourceProductionTag = validateMaintenanceSource('2026-07-27.1-airgap-a', '2026-07-27-production.1');

    assert(actualSourceProductionTag.isErr);

    expect(actualSourceProductionTag.error.message).toBe('Invalid production tag name: 2026-07-27-production.1');
  });

  it.each(['2026-06-19.0-production', '2026-06-19-production.1', '2026-06-19.1-beta.1', 'release/1.1.0'])(
    'validateProductionTagName() rejects invalid production tag name "%s"',
    invalidProductionTagName => {
      const actualProductionTagName = validateProductionTagName(invalidProductionTagName);

      assert(actualProductionTagName.isErr === true);

      expect(actualProductionTagName.error.message).toBe(`Invalid production tag name: ${invalidProductionTagName}`);
    },
  );

  it.each([
    ['2026-06-19.1-production', '2026-06-19.1'],
    ['2026-10-06.1-production', '2026-10-06.1'],
    ['2026-06-19-production.1', '2026-06-19-production.1'],
  ])(
    'resolveWebappBuildVersion() preserves the version for production tag "%s"',
    (productionTagName, expectedVersion) => {
      const actualBuildVersion = resolveWebappBuildVersion(
        productionTagName,
        '025edc663787b3d2da366f21a5958013201e6cd4',
        'development',
      );

      assert(actualBuildVersion.isOk === true);

      expect(actualBuildVersion.value).toBe(expectedVersion);
    },
  );

  it.each([
    ['', 'main', 'main-025edc6'],
    ['', 'development', 'dev-025edc6'],
    ['2026-07-20-staging.1', 'development', 'dev-025edc6'],
  ])(
    'resolveWebappBuildVersion() resolves build reference "%s" on the %s channel to "%s"',
    (buildReferenceName, buildChannel, expectedVersion) => {
      const actualBuildVersion = resolveWebappBuildVersion(
        buildReferenceName,
        '025edc663787b3d2da366f21a5958013201e6cd4',
        buildChannel,
      );

      assert(actualBuildVersion.isOk === true);

      expect(actualBuildVersion.value).toBe(expectedVersion);
    },
  );

  it('resolveWebappBuildVersion() uses the explicit unknown fallback without a commit', () => {
    const actualBuildVersion = resolveWebappBuildVersion('', '', 'development');

    assert(actualBuildVersion.isOk === true);

    expect(actualBuildVersion.value).toBe('dev-unknown');
  });

  it('resolveWebappBuildVersion() rejects unknown non-empty tags', () => {
    const actualBuildVersion = resolveWebappBuildVersion('2026-06-19.1-production.unknown', '025edc6', 'development');

    assert(actualBuildVersion.isErr === true);

    expect(actualBuildVersion.error.message).toBe('Invalid production tag name: 2026-06-19.1-production.unknown');
  });

  it('resolveWebappBuildVersion() requires a production tag on the production channel', () => {
    const actualBuildVersion = resolveWebappBuildVersion('', '025edc663787b3d2da366f21a5958013201e6cd4', 'production');

    assert(actualBuildVersion.isErr === true);

    expect(actualBuildVersion.error.message).toBe('A production webapp build requires a production tag name');
  });

  it('resolveWebappBuildVersion() rejects a non-production tag on the production channel', () => {
    const actualBuildVersion = resolveWebappBuildVersion(
      '2026-07-20-staging.1',
      '025edc663787b3d2da366f21a5958013201e6cd4',
      'production',
    );

    assert(actualBuildVersion.isErr === true);

    expect(actualBuildVersion.error.message).toBe('Invalid production tag name: 2026-07-20-staging.1');
  });
});
