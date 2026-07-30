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

import {Maybe} from 'true-myth';
import {match} from 'ts-pattern';

import {execFile} from 'node:child_process';
import {appendFile} from 'node:fs/promises';
import {promisify} from 'node:util';

import {discoverPullRequests} from './releaseAppearanceCommandDiscovery.ts';
import {createGitHubRequestBehavior} from './releaseAppearanceCommandGitHub.ts';
import type {GitHubRequestBehavior} from './releaseAppearanceCommandGitHub.ts';
import {writeFailure, writeSummarySafely} from './releaseAppearanceCommandOutput.ts';
import {
  parseCommandLineArguments,
  processArgumentStartIndex,
  readCommandEnvironment,
} from './releaseAppearanceCommandParsing.ts';
import type {CommandEnvironment} from './releaseAppearanceCommandParsing.ts';
import {processPullRequests} from './releaseAppearanceCommandProcessing.ts';
import {commandFailureWithCause, errorMessage, redactSecret} from './releaseAppearanceCommandResult.ts';
import type {CommandResult} from './releaseAppearanceCommandResult.ts';
import {createEmptySummaryOptions, createPlanSummaryOptions, createSummary} from './releaseAppearanceCommandSummary.ts';
import {planBetaReleaseHistory, planProductionReleaseHistory} from './releaseHistory.ts';
import type {ExecuteGitCommand, ReleaseHistoryPlan} from './releaseHistory.ts';

export type ReleaseAppearanceCommandDependencies = {
  readonly executeGitCommand: ExecuteGitCommand;
  readonly githubRequests: GitHubRequestBehavior;
  readonly writeSummary: (summary: string) => Promise<void>;
  readonly writeOutput: (message: string) => Promise<void>;
};

export type ExecuteReleaseAppearanceCommandOptions = {
  readonly commandLineArguments: readonly string[];
  readonly environment: NodeJS.ProcessEnv;
  readonly dependencies: ReleaseAppearanceCommandDependencies;
};

export type ReleaseAppearanceCommandMainOptions = ExecuteReleaseAppearanceCommandOptions;

export type ReleaseAppearanceCommandResult = {
  readonly exitCode: number;
  readonly summary: string;
};

export type {
  CreateIssueCommentOptions,
  GitHubRequestBehavior,
  ListIssueCommentsOptions,
  ListPullRequestsForCommitOptions,
  UpdateIssueCommentOptions,
} from './releaseAppearanceCommandGitHub.ts';
export type {ReleaseAppearanceCommandStage} from './releaseAppearanceCommandParsing.ts';

async function executeGitCommand(commandArguments: readonly string[]): Promise<string> {
  const executeFile = promisify(execFile);
  const commandResult = await executeFile('git', commandArguments, {
    encoding: 'utf8',
  });

  return commandResult.stdout.toString();
}

type WriteRuntimeSummaryOptions = {
  readonly summaryPath: string;
  readonly summary: string;
};

async function writeRuntimeSummary(writeRuntimeSummaryOptions: WriteRuntimeSummaryOptions): Promise<void> {
  await appendFile(writeRuntimeSummaryOptions.summaryPath, `${writeRuntimeSummaryOptions.summary}\n`, 'utf8');
}

async function writeRuntimeOutput(message: string): Promise<void> {
  process.stderr.write(`${message}\n`);
}

function createRuntimeDependencies(commandEnvironment: CommandEnvironment): ReleaseAppearanceCommandDependencies {
  return {
    executeGitCommand,
    githubRequests: createGitHubRequestBehavior(commandEnvironment),
    writeSummary(summary: string): Promise<void> {
      return writeRuntimeSummary({summaryPath: commandEnvironment.githubStepSummary, summary});
    },
    writeOutput: writeRuntimeOutput,
  };
}

export async function executeReleaseAppearanceCommand(
  executeReleaseAppearanceCommandOptions: ExecuteReleaseAppearanceCommandOptions,
): Promise<ReleaseAppearanceCommandResult> {
  const {commandLineArguments, environment, dependencies} = executeReleaseAppearanceCommandOptions;
  const githubToken = Maybe.of(environment.GITHUB_TOKEN).unwrapOr('');
  const parsedCommandResult = parseCommandLineArguments(commandLineArguments);

  if (parsedCommandResult.isErr) {
    await writeFailure({
      writeOutput: dependencies.writeOutput,
      message: parsedCommandResult.error.message,
    });
    return {exitCode: 1, summary: ''};
  }

  const commandEnvironmentResult = readCommandEnvironment(environment);
  if (commandEnvironmentResult.isErr) {
    await writeFailure({
      writeOutput: dependencies.writeOutput,
      message: redactSecret(commandEnvironmentResult.error.message, githubToken),
    });
    return {exitCode: 1, summary: ''};
  }

  const parsedCommand = parsedCommandResult.value;
  let releaseHistoryPlanResult: CommandResult<ReleaseHistoryPlan>;
  try {
    releaseHistoryPlanResult = await match(parsedCommand)
      .with({stage: 'beta'}, betaCommand => {
        return planBetaReleaseHistory(dependencies.executeGitCommand, betaCommand.releaseTag);
      })
      .with({stage: 'production'}, productionCommand => {
        return planProductionReleaseHistory({
          executeGitCommand: dependencies.executeGitCommand,
          currentProductionTag: productionCommand.releaseTag,
          promotedBetaTag: productionCommand.promotedBetaTag,
          releaseCommit: productionCommand.releaseCommit,
        });
      })
      .exhaustive();
  } catch (error: unknown) {
    releaseHistoryPlanResult = commandFailureWithCause(
      `Unable to plan release history: ${redactSecret(errorMessage(error), githubToken)}`,
      error,
    );
  }

  let summaryOptions = createEmptySummaryOptions(parsedCommand);
  if (releaseHistoryPlanResult.isErr) {
    await writeFailure({
      writeOutput: dependencies.writeOutput,
      message: redactSecret(releaseHistoryPlanResult.error.message, githubToken),
    });
  } else {
    const planDetails = createPlanSummaryOptions(parsedCommand, releaseHistoryPlanResult.value);
    summaryOptions = {...summaryOptions, ...planDetails};

    if (releaseHistoryPlanResult.value.kind === 'bootstrap') {
      const summary = createSummary(summaryOptions);
      const summaryWasWritten = await writeSummarySafely({
        writeSummary: dependencies.writeSummary,
        summary,
        writeOutput: dependencies.writeOutput,
        githubToken,
      });
      return {exitCode: summaryWasWritten ? 0 : 1, summary};
    }

    const discoveryRanges = match(releaseHistoryPlanResult.value)
      .with({kind: 'beta'}, betaPlan => {
        return [{candidateTag: parsedCommand.releaseTag, commitRange: betaPlan.commitRange}];
      })
      .with({kind: 'production'}, productionPlan => {
        return productionPlan.candidateRanges;
      })
      .exhaustive();
    const discoveryResult = await discoverPullRequests({
      ranges: discoveryRanges,
      githubRequests: dependencies.githubRequests,
      githubToken,
    });

    for (const discoveryError of discoveryResult.errors) {
      await writeFailure({writeOutput: dependencies.writeOutput, message: discoveryError});
    }

    const processingResult = await processPullRequests({
      pullRequests: discoveryResult.pullRequests,
      stage: parsedCommand.stage,
      releaseTag: parsedCommand.releaseTag,
      githubRequests: dependencies.githubRequests,
      githubToken,
      writeOutput: dependencies.writeOutput,
    });

    summaryOptions = {
      ...summaryOptions,
      commitsInspected: discoveryResult.commitsInspected,
      pullRequestsDiscovered: discoveryResult.pullRequests,
      commitsWithoutPullRequests: discoveryResult.commitsWithoutPullRequests,
      commentsCreated: processingResult.commentsCreated,
      commentsUpdated: processingResult.commentsUpdated,
      commentsUnchanged: processingResult.commentsUnchanged,
      failedPullRequests: processingResult.failedPullRequests,
    };

    const summary = createSummary(summaryOptions);
    const summaryWasWritten = await writeSummarySafely({
      writeSummary: dependencies.writeSummary,
      summary,
      writeOutput: dependencies.writeOutput,
      githubToken,
    });
    const hasFailures = discoveryResult.errors.length > 0 || processingResult.failedPullRequests.length > 0;
    return {exitCode: summaryWasWritten && !hasFailures ? 0 : 1, summary};
  }

  const summary = createSummary(summaryOptions);
  await writeSummarySafely({
    writeSummary: dependencies.writeSummary,
    summary,
    writeOutput: dependencies.writeOutput,
    githubToken,
  });
  return {exitCode: 1, summary};
}

export async function main(mainOptions: ReleaseAppearanceCommandMainOptions): Promise<void> {
  const {environment, dependencies} = mainOptions;
  const githubToken = Maybe.of(environment.GITHUB_TOKEN).unwrapOr('');

  try {
    const commandResult = await executeReleaseAppearanceCommand(mainOptions);
    process.exitCode = commandResult.exitCode;
  } catch (error: unknown) {
    await writeFailure({
      writeOutput: dependencies.writeOutput,
      message: redactSecret(errorMessage(error), githubToken),
    });
    process.exitCode = 1;
  }
}

async function startReleaseAppearanceCommand(): Promise<void> {
  const commandEnvironmentResult = readCommandEnvironment(process.env);
  if (commandEnvironmentResult.isErr) {
    await writeRuntimeOutput(commandEnvironmentResult.error.message);
    process.exitCode = 1;
    return;
  }

  await main({
    commandLineArguments: process.argv.slice(processArgumentStartIndex),
    environment: process.env,
    dependencies: createRuntimeDependencies(commandEnvironmentResult.value),
  });
}

function isReleaseAppearanceCommandEntrypoint(): boolean {
  return Maybe.of(process.argv[1])
    .map(entrypointPath => {
      return /(?:^|[\\/])releaseAppearanceCommand\.ts$/.test(entrypointPath);
    })
    .unwrapOr(false);
}

if (isReleaseAppearanceCommandEntrypoint()) {
  void startReleaseAppearanceCommand();
}
