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

import {match} from 'ts-pattern';

import {
  createMaintenanceBranchName,
  createNextMaintenanceTagName,
  validateMaintenanceSource,
  validateMaintenanceTagName,
  validateProductionTagName,
} from './releaseMetadata.ts';
import {resolveWebappBuildVersion, validateWebAppProductionTagName} from './webappProductionRelease.ts';
import {
  createNextBetaWebAppTagName,
  parseStableWebAppTagName,
  validateBetaWebAppTagVersion,
} from './webappReleaseIdentity.ts';
import {validateWebAppVersion} from './webappVersion.ts';

export type ReleaseMetadataCliDependencies = {
  readonly writeError: (message: string) => void;
  readonly writeOutput: (message: string) => void;
};

export type ReleaseMetadataCommand =
  | {
      readonly kind: 'next-beta-tag';
      readonly version: string;
      readonly existingTagNames: readonly string[];
    }
  | {
      readonly kind: 'validate-webapp-beta-tag';
      readonly betaTag: string;
      readonly releaseVersion: string;
    }
  | {
      readonly kind: 'maintenance-branch';
      readonly maintenanceLineKey: string;
    }
  | {
      readonly kind: 'validate-maintenance-tag';
      readonly maintenanceTag: string;
    }
  | {
      readonly kind: 'next-maintenance-tag';
      readonly maintenanceLineKey: string;
      readonly existingTagNames: readonly string[];
    }
  | {
      readonly kind: 'validate-maintenance-source';
      readonly maintenanceLineKey: string;
      readonly sourceProductionTag: string;
    }
  | {
      readonly kind: 'validate-production-tag';
      readonly productionTag: string;
    }
  | {
      readonly kind: 'validate-webapp-production-tag';
      readonly productionTag: string;
    }
  | {
      readonly kind: 'validate-stable-webapp-tag';
      readonly stableTagName: string;
    }
  | {
      readonly kind: 'webapp-build-version';
      readonly buildReference: string;
      readonly fullCommitSha: string;
      readonly environmentName: string;
    };

function writeResult(
  result:
    | ReturnType<typeof createNextBetaWebAppTagName>
    | ReturnType<typeof validateBetaWebAppTagVersion>
    | ReturnType<typeof validateWebAppVersion>
    | ReturnType<typeof createMaintenanceBranchName>
    | ReturnType<typeof createNextMaintenanceTagName>
    | ReturnType<typeof resolveWebappBuildVersion>
    | ReturnType<typeof validateMaintenanceSource>
    | ReturnType<typeof validateMaintenanceTagName>
    | ReturnType<typeof validateProductionTagName>
    | ReturnType<typeof validateWebAppProductionTagName>
    | ReturnType<typeof parseStableWebAppTagName>,
  dependencies: ReleaseMetadataCliDependencies,
): number {
  if (result.isErr) {
    dependencies.writeError(result.error.message);
    return 1;
  }

  dependencies.writeOutput(result.value);
  return 0;
}

export function executeReleaseMetadataCommand(
  options: ReleaseMetadataCommand,
  dependencies: ReleaseMetadataCliDependencies,
): number {
  return match(options)
    .with({kind: 'next-beta-tag'}, nextBetaTagCommand => {
      const versionResult = validateWebAppVersion(nextBetaTagCommand.version);
      if (versionResult.isErr) {
        return writeResult(versionResult, dependencies);
      }

      return writeResult(
        createNextBetaWebAppTagName(versionResult.value, nextBetaTagCommand.existingTagNames),
        dependencies,
      );
    })
    .with({kind: 'validate-webapp-beta-tag'}, betaTagCommand => {
      return writeResult(
        validateBetaWebAppTagVersion({tagName: betaTagCommand.betaTag, expectedVersion: betaTagCommand.releaseVersion}),
        dependencies,
      );
    })
    .with({kind: 'maintenance-branch'}, maintenanceBranchCommand => {
      return writeResult(createMaintenanceBranchName(maintenanceBranchCommand.maintenanceLineKey), dependencies);
    })
    .with({kind: 'validate-maintenance-tag'}, validateMaintenanceTagCommand => {
      return writeResult(validateMaintenanceTagName(validateMaintenanceTagCommand.maintenanceTag), dependencies);
    })
    .with({kind: 'next-maintenance-tag'}, nextMaintenanceTagCommand => {
      return writeResult(
        createNextMaintenanceTagName(
          nextMaintenanceTagCommand.maintenanceLineKey,
          nextMaintenanceTagCommand.existingTagNames,
        ),
        dependencies,
      );
    })
    .with({kind: 'validate-maintenance-source'}, validateMaintenanceSourceCommand => {
      return writeResult(
        validateMaintenanceSource(
          validateMaintenanceSourceCommand.maintenanceLineKey,
          validateMaintenanceSourceCommand.sourceProductionTag,
        ),
        dependencies,
      );
    })
    .with({kind: 'validate-production-tag'}, validateProductionTagCommand => {
      return writeResult(validateProductionTagName(validateProductionTagCommand.productionTag), dependencies);
    })
    .with({kind: 'validate-webapp-production-tag'}, validateWebAppProductionTagCommand => {
      return writeResult(
        validateWebAppProductionTagName(validateWebAppProductionTagCommand.productionTag),
        dependencies,
      );
    })
    .with({kind: 'validate-stable-webapp-tag'}, validateStableWebAppTagCommand => {
      return writeResult(parseStableWebAppTagName(validateStableWebAppTagCommand.stableTagName), dependencies);
    })
    .with({kind: 'webapp-build-version'}, webappBuildVersionCommand => {
      return writeResult(
        resolveWebappBuildVersion(
          webappBuildVersionCommand.buildReference,
          webappBuildVersionCommand.fullCommitSha,
          webappBuildVersionCommand.environmentName,
        ),
        dependencies,
      );
    })
    .exhaustive();
}
