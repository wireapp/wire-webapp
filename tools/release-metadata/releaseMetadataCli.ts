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
  createNextBetaTagName,
  createProductionTagName,
  createReleaseBranchName,
  extractReleaseIdentifierFromBranchName,
  resolveWebappBuildVersion,
  validateMaintenanceSource,
  validateMaintenanceTagName,
  validateProductionTagName,
} from './releaseMetadata.ts';

export type ReleaseMetadataCliDependencies = {
  readonly writeError: (message: string) => void;
  readonly writeOutput: (message: string) => void;
};

export type ReleaseMetadataCommand =
  | {
      readonly kind: 'release-identifier-from-branch';
      readonly releaseBranch: string;
    }
  | {
      readonly kind: 'release-branch';
      readonly releaseIdentifier: string;
    }
  | {
      readonly kind: 'next-beta-tag';
      readonly releaseIdentifier: string;
      readonly existingTagNames: readonly string[];
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
      readonly kind: 'production-tag';
      readonly releaseIdentifier: string;
    }
  | {
      readonly kind: 'validate-production-tag';
      readonly productionTag: string;
    }
  | {
      readonly kind: 'webapp-build-version';
      readonly buildReference: string;
      readonly fullCommitSha: string;
      readonly environmentName: string;
    };

function writeResult(
  result:
    | ReturnType<typeof extractReleaseIdentifierFromBranchName>
    | ReturnType<typeof createReleaseBranchName>
    | ReturnType<typeof createNextBetaTagName>
    | ReturnType<typeof createMaintenanceBranchName>
    | ReturnType<typeof createNextMaintenanceTagName>
    | ReturnType<typeof createProductionTagName>
    | ReturnType<typeof resolveWebappBuildVersion>
    | ReturnType<typeof validateMaintenanceSource>
    | ReturnType<typeof validateMaintenanceTagName>
    | ReturnType<typeof validateProductionTagName>,
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
  command: ReleaseMetadataCommand,
  dependencies: ReleaseMetadataCliDependencies,
): number {
  return match(command)
    .with({kind: 'release-identifier-from-branch'}, releaseIdentifierCommand => {
      return writeResult(extractReleaseIdentifierFromBranchName(releaseIdentifierCommand.releaseBranch), dependencies);
    })
    .with({kind: 'release-branch'}, releaseBranchCommand => {
      return writeResult(createReleaseBranchName(releaseBranchCommand.releaseIdentifier), dependencies);
    })
    .with({kind: 'next-beta-tag'}, nextBetaTagCommand => {
      return writeResult(
        createNextBetaTagName(nextBetaTagCommand.releaseIdentifier, nextBetaTagCommand.existingTagNames),
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
    .with({kind: 'production-tag'}, productionTagCommand => {
      return writeResult(createProductionTagName(productionTagCommand.releaseIdentifier), dependencies);
    })
    .with({kind: 'validate-production-tag'}, validateProductionTagCommand => {
      return writeResult(validateProductionTagName(validateProductionTagCommand.productionTag), dependencies);
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
