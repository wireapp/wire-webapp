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

import * as nodeFileSystem from 'node:fs';

import is from '@sindresorhus/is';

import {
  hasExpectedWireBuildsWebappFields,
  selectHelmChartVersion,
  validateProductionDistributionManifest,
} from './productionDistribution';
import type {PublishedHelmChart, WireBuildsWebappFields} from './productionDistribution';

type CommandLineOptions = ReadonlyMap<string, string>;

function parseCommandLineOptions(commandLineArguments: readonly string[]): CommandLineOptions {
  const optionValues = new Map<string, string>();

  for (let argumentIndex = 0; argumentIndex < commandLineArguments.length; argumentIndex += 2) {
    const optionName = commandLineArguments[argumentIndex];
    const optionValue = commandLineArguments[argumentIndex + 1];

    if (!is.nonEmptyString(optionName) || !optionName.startsWith('--') || !is.nonEmptyString(optionValue)) {
      throw new Error('Options must be supplied as non-empty --name value pairs.');
    }

    optionValues.set(optionName.slice(2), optionValue);
  }

  return optionValues;
}

function getRequiredOption(optionValues: CommandLineOptions, optionName: string): string {
  const optionValue = optionValues.get(optionName);

  if (!is.nonEmptyString(optionValue)) {
    throw new Error(`Missing required option: --${optionName}`);
  }

  return optionValue;
}

function parseJson(jsonText: string): unknown {
  try {
    return JSON.parse(jsonText);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    throw new Error(`Invalid JSON: ${errorMessage}`);
  }
}

function readJsonFile(filePath: string): unknown {
  return parseJson(nodeFileSystem.readFileSync(filePath, 'utf8'));
}

function readJsonFromStandardInput(): unknown {
  return parseJson(nodeFileSystem.readFileSync(0, 'utf8'));
}

function readWireBuildsFields(optionValues: CommandLineOptions): WireBuildsWebappFields {
  return {
    version: getRequiredOption(optionValues, 'version'),
    repo: getRequiredOption(optionValues, 'repo'),
    appVersion: getRequiredOption(optionValues, 'app-version'),
    commitUrl: getRequiredOption(optionValues, 'commit-url'),
    commit: getRequiredOption(optionValues, 'commit'),
  };
}

function readPublishedHelmCharts(value: unknown): readonly PublishedHelmChart[] {
  if (!is.array(value)) {
    throw new Error('Published Helm chart search results must be an array.');
  }

  return value.map((publishedChart, chartIndex) => {
    if (!is.plainObject(publishedChart)) {
      throw new Error(`Published Helm chart at index ${chartIndex} must be an object.`);
    }

    if (!is.nonEmptyString(publishedChart.version) || !is.string(publishedChart.app_version)) {
      throw new Error(`Published Helm chart at index ${chartIndex} has invalid version metadata.`);
    }

    return {
      version: publishedChart.version,
      appVersion: publishedChart.app_version,
    };
  });
}

function runCommand(commandName: string, optionValues: CommandLineOptions): void {
  switch (commandName) {
    case 'validate-manifest': {
      const expectedCommitSha = optionValues.get('expected-commit-sha');
      const validationResult = validateProductionDistributionManifest({
        manifest: readJsonFile(getRequiredOption(optionValues, 'manifest-path')),
        productionTag: getRequiredOption(optionValues, 'production-tag'),
        productionTagCommitSha: getRequiredOption(optionValues, 'production-tag-commit-sha'),
        expectedCommitSha,
        sourceRunId: getRequiredOption(optionValues, 'source-run-id'),
      });

      if (validationResult.isErr) {
        throw validationResult.error;
      }

      return;
    }

    case 'select-helm-chart': {
      const publishedCharts = readPublishedHelmCharts(readJsonFile(getRequiredOption(optionValues, 'charts-path')));
      const selectionResult = selectHelmChartVersion(publishedCharts, getRequiredOption(optionValues, 'image-tag'));

      if (selectionResult.isErr) {
        throw selectionResult.error;
      }

      if (selectionResult.value.kind === 'reuse') {
        console.log(`reuse:${selectionResult.value.version}`);
      } else {
        console.log('publish');
      }

      return;
    }

    case 'wire-builds-fields-match': {
      const fieldsMatch = hasExpectedWireBuildsWebappFields(
        readJsonFromStandardInput(),
        readWireBuildsFields(optionValues),
      );

      if (!fieldsMatch) {
        process.exitCode = 1;
      }

      return;
    }

    default:
      throw new Error(`Unknown production distribution command: ${commandName}`);
  }
}

function main(): void {
  try {
    const commandName = process.argv[2];

    if (!is.nonEmptyString(commandName)) {
      throw new Error('A production distribution command is required.');
    }

    runCommand(commandName, parseCommandLineOptions(process.argv.slice(3)));
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(errorMessage);
    process.exitCode = 1;
  }
}

if (process.argv[1]?.endsWith('productionDistributionCli.ts')) {
  main();
}
