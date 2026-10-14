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

import {Result} from 'true-myth';
import type {NonEmptyString} from 'type-fest';

type NonZeroDecimalDigit = '1' | '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9';

// Retained for maintenance lines and immutable historical Production tags.
export type ReleaseIdentifier =
  NonEmptyString<`${number}${number}${number}${number}-${number}${number}-${number}${number}.${NonZeroDecimalDigit}${string}`>;
export type ProductionTagName = NonEmptyString<`${ReleaseIdentifier}-production`>;
export type MaintenanceLineKey = NonEmptyString<`${ReleaseIdentifier}-${string}`>;
export type MaintenanceBranchName = NonEmptyString<`maintenance/${MaintenanceLineKey}`>;
export type MaintenanceTagName = NonEmptyString<`${MaintenanceLineKey}-maintenance.${number}`>;
export type WebappBuildChannel = 'main' | 'development' | 'production';

const releaseDatePattern = String.raw`\d{4}-\d{2}-\d{2}`;
const releaseIdentifierPattern = String.raw`${releaseDatePattern}\.[1-9]\d*`;
const productionTagNamePattern = new RegExp(`^(${releaseIdentifierPattern})-production$`);
const maintenanceLineKeyPattern = new RegExp(String.raw`^${releaseIdentifierPattern}-[a-z0-9]+(?:-[a-z0-9]+)*$`);
const maintenanceBranchNamePattern = new RegExp(
  String.raw`^maintenance/${releaseIdentifierPattern}-[a-z0-9]+(?:-[a-z0-9]+)*$`,
);
const maintenanceTagNamePattern = new RegExp(
  String.raw`^${releaseIdentifierPattern}-[a-z0-9]+(?:-[a-z0-9]+)*-maintenance\.[1-9]\d*$`,
);
function escapeRegularExpression(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, String.raw`\$&`);
}

function isMaintenanceLineKey(value: string): value is MaintenanceLineKey {
  return maintenanceLineKeyPattern.test(value);
}

function isMaintenanceBranchName(value: string): value is MaintenanceBranchName {
  return maintenanceBranchNamePattern.test(value);
}

function isMaintenanceTagName(value: string): value is MaintenanceTagName {
  return maintenanceTagNamePattern.test(value);
}

export function validateProductionTagName(productionTagName: string): Result<ProductionTagName, Error> {
  const productionTagNameMatches = productionTagNamePattern.test(productionTagName);

  if (!productionTagNameMatches) {
    return Result.err(new Error(`Invalid production tag name: ${productionTagName}`));
  }

  return Result.ok(productionTagName as ProductionTagName);
}

export function validateMaintenanceLineKey(maintenanceLineKey: string): Result<MaintenanceLineKey, Error> {
  if (!isMaintenanceLineKey(maintenanceLineKey)) {
    return Result.err(new Error(`Invalid maintenance line key: ${maintenanceLineKey}`));
  }

  return Result.ok(maintenanceLineKey);
}

export function createMaintenanceBranchName(maintenanceLineKey: string): Result<MaintenanceBranchName, Error> {
  const maintenanceLineKeyResult = validateMaintenanceLineKey(maintenanceLineKey);

  if (maintenanceLineKeyResult.isErr) {
    return Result.err(maintenanceLineKeyResult.error);
  }

  return validateMaintenanceBranchName(`maintenance/${maintenanceLineKeyResult.value}`);
}

export function validateMaintenanceBranchName(maintenanceBranchName: string): Result<MaintenanceBranchName, Error> {
  if (!isMaintenanceBranchName(maintenanceBranchName)) {
    return Result.err(new Error(`Invalid maintenance branch name: ${maintenanceBranchName}`));
  }

  return Result.ok(maintenanceBranchName);
}

export function validateMaintenanceTagName(maintenanceTagName: string): Result<MaintenanceTagName, Error> {
  if (!isMaintenanceTagName(maintenanceTagName)) {
    return Result.err(new Error(`Invalid maintenance tag name: ${maintenanceTagName}`));
  }

  return Result.ok(maintenanceTagName);
}

export function createNextMaintenanceTagName(
  maintenanceLineKey: string,
  existingTagNames: readonly string[],
): Result<MaintenanceTagName, Error> {
  const maintenanceLineKeyResult = validateMaintenanceLineKey(maintenanceLineKey);

  if (maintenanceLineKeyResult.isErr) {
    return Result.err(maintenanceLineKeyResult.error);
  }

  const escapedMaintenanceLineKey = escapeRegularExpression(maintenanceLineKeyResult.value);
  const maintenanceTagPattern = new RegExp(String.raw`^${escapedMaintenanceLineKey}-maintenance\.([1-9]\d*)$`);
  const existingMaintenanceTagNumbers = existingTagNames.flatMap(existingTagName => {
    const existingTagNameMatch = maintenanceTagPattern.exec(existingTagName);

    if (existingTagNameMatch === null) {
      return [];
    }

    return [Number(existingTagNameMatch[1])];
  });
  const latestMaintenanceTagNumber =
    existingMaintenanceTagNumbers.length > 0 ? Math.max(...existingMaintenanceTagNumbers) : 0;
  const nextMaintenanceTagNumber = latestMaintenanceTagNumber + 1;

  return validateMaintenanceTagName(`${maintenanceLineKeyResult.value}-maintenance.${nextMaintenanceTagNumber}`);
}

export function validateMaintenanceSource(
  maintenanceLineKey: string,
  sourceProductionTag: string,
): Result<ProductionTagName, Error> {
  const maintenanceLineKeyResult = validateMaintenanceLineKey(maintenanceLineKey);

  if (maintenanceLineKeyResult.isErr) {
    return Result.err(maintenanceLineKeyResult.error);
  }

  const sourceProductionTagResult = validateProductionTagName(sourceProductionTag);

  if (sourceProductionTagResult.isErr) {
    return Result.err(sourceProductionTagResult.error);
  }

  const releaseIdentifierEndIndex = maintenanceLineKeyResult.value.indexOf(
    '-',
    maintenanceLineKeyResult.value.indexOf('.') + 1,
  );
  const releaseIdentifier = maintenanceLineKeyResult.value.slice(0, releaseIdentifierEndIndex);
  const expectedSourceProductionTag = `${releaseIdentifier}-production`;

  if (sourceProductionTagResult.value !== expectedSourceProductionTag) {
    return Result.err(
      new Error(
        `Source production tag ${sourceProductionTag} does not belong to maintenance line ${maintenanceLineKey}`,
      ),
    );
  }

  return Result.ok(sourceProductionTagResult.value);
}
