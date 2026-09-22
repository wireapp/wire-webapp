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

import {isArray, isError, isNonEmptyString, isPlainObject, isString} from '@sindresorhus/is';
import {match} from 'ts-pattern';

import {
  hasExpectedWireBuildsWebappFields,
  selectHelmChartVersion,
  validateProductionDistributionManifest,
} from './productionDistribution.ts';
import type {PublishedHelmChart, WireBuildsWebappFields} from './productionDistribution.ts';

export type ProductionDistributionCommandDependencies = {
  readonly readFile: (filePath: string) => string;
  readonly readStandardInput: () => string;
  readonly writeOutput: (message: string) => void;
};

type ValidateManifestCommand = {
  readonly kind: 'validate-manifest';
  readonly artifactMetadataPath: string;
  readonly manifestPath: string;
  readonly productionTag: string;
  readonly productionTagCommitSha: string;
  readonly expectedCommitSha: string | undefined;
  readonly sourceRunId: string;
};

type SelectHelmChartCommand = {
  readonly kind: 'select-helm-chart';
  readonly chartsPath: string;
  readonly imageTag: string;
};

type WireBuildsFieldsMatchCommand = {
  readonly kind: 'wire-builds-fields-match';
  readonly version: string;
  readonly repository: string;
  readonly applicationVersion: string;
  readonly commitUrl: string;
  readonly commit: string;
};

export type ProductionDistributionCommand =
  ValidateManifestCommand | SelectHelmChartCommand | WireBuildsFieldsMatchCommand;

function parseJson(jsonText: string): unknown {
  try {
    return JSON.parse(jsonText);
  } catch (error) {
    const errorMessage = isError(error) ? error.message : String(error);
    throw new Error(`Invalid JSON: ${errorMessage}`);
  }
}

function readWireBuildsFields(command: WireBuildsFieldsMatchCommand): WireBuildsWebappFields {
  return {
    version: command.version,
    repo: command.repository,
    appVersion: command.applicationVersion,
    commitUrl: command.commitUrl,
    commit: command.commit,
  };
}

function readPublishedHelmCharts(value: unknown): readonly PublishedHelmChart[] {
  if (!isArray(value)) {
    throw new Error('Published Helm chart search results must be an array.');
  }

  return value.map((publishedChart, chartIndex) => {
    if (!isPlainObject(publishedChart)) {
      throw new Error(`Published Helm chart at index ${chartIndex} must be an object.`);
    }

    if (!isNonEmptyString(publishedChart.version) || !isString(publishedChart.app_version)) {
      throw new Error(`Published Helm chart at index ${chartIndex} has invalid version metadata.`);
    }

    return {
      version: publishedChart.version,
      appVersion: publishedChart.app_version,
    };
  });
}

export function executeProductionDistributionCommand(
  command: ProductionDistributionCommand,
  dependencies: ProductionDistributionCommandDependencies,
): number {
  return match(command)
    .with({kind: 'validate-manifest'}, validateManifestCommand => {
      const validationResult = validateProductionDistributionManifest({
        artifactMetadata: parseJson(dependencies.readFile(validateManifestCommand.artifactMetadataPath)),
        manifest: parseJson(dependencies.readFile(validateManifestCommand.manifestPath)),
        productionTag: validateManifestCommand.productionTag,
        productionTagCommitSha: validateManifestCommand.productionTagCommitSha,
        expectedCommitSha: validateManifestCommand.expectedCommitSha,
        sourceRunId: validateManifestCommand.sourceRunId,
      });

      if (validationResult.isErr) {
        throw validationResult.error;
      }

      return 0;
    })
    .with({kind: 'select-helm-chart'}, selectHelmChartCommand => {
      const publishedCharts = readPublishedHelmCharts(
        parseJson(dependencies.readFile(selectHelmChartCommand.chartsPath)),
      );
      const selectionResult = selectHelmChartVersion(publishedCharts, selectHelmChartCommand.imageTag);

      if (selectionResult.isErr) {
        throw selectionResult.error;
      }

      if (selectionResult.value.kind === 'reuse') {
        dependencies.writeOutput(`reuse:${selectionResult.value.version}`);
      } else {
        dependencies.writeOutput('publish');
      }

      return 0;
    })
    .with({kind: 'wire-builds-fields-match'}, wireBuildsFieldsMatchCommand => {
      const fieldsMatch = hasExpectedWireBuildsWebappFields(
        parseJson(dependencies.readStandardInput()),
        readWireBuildsFields(wireBuildsFieldsMatchCommand),
      );

      return fieldsMatch ? 0 : 1;
    })
    .exhaustive();
}
