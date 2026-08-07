import {isError} from '@sindresorhus/is';
import {Maybe, Result, task} from 'true-myth';
import type {Task} from 'true-myth';

import {executePreviewNextBetaCommand} from './previewNextBetaCommand.ts';
import type {
  ExecutePreviewNextBetaCommandOptions,
  PreviewNextBetaCommandDependencies,
} from './previewNextBetaCommand.ts';
import type {GitHubClient, IssueCommentRecord, PullRequestRecord} from './githubClient.ts';
import type {
  ExecuteGitCommand,
  NextBetaPreviewHistoryPlan,
  PlanNextBetaPreviewHistoryOptions,
} from './releaseHistory.ts';

const targetMainCommit = 'a'.repeat(40);
const latestBetaCommit = 'b'.repeat(40);
const mergeBaseCommit = 'c'.repeat(40);
const firstMainCommit = 'd'.repeat(40);
const secondMainCommit = 'e'.repeat(40);
const thirdMainCommit = 'f'.repeat(40);
const latestBetaTag = '2026-07-27.1-beta.1';
const githubToken = 'github-token';

const commandEnvironment: NodeJS.ProcessEnv = {
  GITHUB_API_URL: 'https://api.github.com',
  GITHUB_REPOSITORY: 'wireapp/wire-webapp',
  GITHUB_STEP_SUMMARY: '/tmp/preview-next-beta-summary.md',
  GITHUB_TOKEN: githubToken,
};

type FakeGitHubClientOptions = {
  readonly pullRequestsByCommit?: ReadonlyMap<string, readonly PullRequestRecord[]>;
  readonly failureMessageByCommit?: ReadonlyMap<string, string>;
  readonly rejectedMessageByCommit?: ReadonlyMap<string, string>;
};

type FakeGitHubClientState = {
  readonly listedCommits: string[];
};

type FakeGitHubClientFixture = {
  readonly githubClient: GitHubClient;
  readonly state: FakeGitHubClientState;
};

type FakeHistoryPlannerState = {
  calls: number;
  readonly targetMainCommits: string[];
};

type FakeHistoryPlannerFixture = {
  readonly planNextBetaPreviewHistory: (
    options: PlanNextBetaPreviewHistoryOptions,
  ) => Task<NextBetaPreviewHistoryPlan, Error>;
  readonly state: FakeHistoryPlannerState;
};

type CommandWriterState = {
  readonly failureMessages: string[];
  readonly informationMessages: string[];
  readonly summaryMessages: string[];
};

type CommandRun = {
  readonly result: Awaited<ReturnType<typeof executePreviewNextBetaCommand>>;
  readonly historyPlannerState: FakeHistoryPlannerState;
  readonly writerState: CommandWriterState;
};

type CreatePullRequestOptions = {
  readonly number: number;
  readonly baseBranch?: string;
  readonly merged?: boolean;
  readonly title?: string;
};

type RunCommandOptions = {
  readonly targetMainCommit: string;
  readonly executeGitCommand: ExecuteGitCommand;
  readonly githubClient: GitHubClient;
  readonly historyPlanResult?: Result<NextBetaPreviewHistoryPlan, Error>;
  readonly informationFailureMessage?: string;
  readonly summaryFailureMessage?: string;
};

const previewHistoryPlan: NextBetaPreviewHistoryPlan = {
  kind: 'preview',
  latestBetaReleaseTag: {
    tagName: latestBetaTag,
    commit: latestBetaCommit,
    taggerTimestamp: 1785171600n,
  },
  targetMainCommit,
  mergeBase: mergeBaseCommit,
  commits: [firstMainCommit, secondMainCommit, thirdMainCommit],
};

function createPullRequest(createPullRequestOptions: CreatePullRequestOptions): PullRequestRecord {
  const {number, baseBranch = 'main', merged = true, title = `Pull request #${number}`} = createPullRequestOptions;

  return {
    number,
    title,
    baseBranch,
    mergedAt: merged ? Maybe.just('2026-07-28T00:00:00Z') : Maybe.nothing<string>(),
  };
}

function createFakeGitCommand(): ExecuteGitCommand {
  return async function executeFakeGitCommand(): Promise<string> {
    return '';
  };
}

function createFakeGitHubClient(fakeGitHubClientOptions: FakeGitHubClientOptions = {}): FakeGitHubClientFixture {
  const state: FakeGitHubClientState = {
    listedCommits: [],
  };

  return {
    state,
    githubClient: {
      async listPullRequestsForCommit(options): Promise<Result<readonly PullRequestRecord[], Error>> {
        state.listedCommits.push(options.commitSha);
        const rejectedMessage = Maybe.of(fakeGitHubClientOptions.rejectedMessageByCommit?.get(options.commitSha));
        if (rejectedMessage.isJust) {
          throw new Error(rejectedMessage.value);
        }

        const failureMessage = Maybe.of(fakeGitHubClientOptions.failureMessageByCommit?.get(options.commitSha));
        if (failureMessage.isJust) {
          return Result.err(new Error(failureMessage.value));
        }

        return Result.ok(fakeGitHubClientOptions.pullRequestsByCommit?.get(options.commitSha) ?? []);
      },
      async listIssueComments(): Promise<Result<readonly IssueCommentRecord[], Error>> {
        throw new Error('Preview attempted to list issue comments');
      },
      async createIssueComment(): Promise<Result<IssueCommentRecord, Error>> {
        throw new Error('Preview attempted to create an issue comment');
      },
      async updateIssueComment(): Promise<Result<IssueCommentRecord, Error>> {
        throw new Error('Preview attempted to update an issue comment');
      },
    },
  };
}

function createFakeHistoryPlanner(
  historyPlanResult: Result<NextBetaPreviewHistoryPlan, Error>,
): FakeHistoryPlannerFixture {
  const state: FakeHistoryPlannerState = {
    calls: 0,
    targetMainCommits: [],
  };

  function planNextBetaPreviewHistory(
    options: PlanNextBetaPreviewHistoryOptions,
  ): Task<NextBetaPreviewHistoryPlan, Error> {
    state.calls += 1;
    state.targetMainCommits.push(options.targetMainCommit);

    return task.tryOrElse(
      (error: unknown): Error => {
        return isError(error) ? error : new Error('Fake history planner failed');
      },
      async (): Promise<NextBetaPreviewHistoryPlan> => {
        if (historyPlanResult.isErr) {
          throw historyPlanResult.error;
        }

        return historyPlanResult.value;
      },
    );
  }

  return {planNextBetaPreviewHistory, state};
}

async function runCommand(runCommandOptions: RunCommandOptions): Promise<CommandRun> {
  const {
    targetMainCommit,
    executeGitCommand,
    githubClient,
    historyPlanResult = Result.ok(previewHistoryPlan),
    informationFailureMessage,
    summaryFailureMessage,
  } = runCommandOptions;
  const historyPlannerFixture = createFakeHistoryPlanner(historyPlanResult);
  const writerState: CommandWriterState = {
    failureMessages: [],
    informationMessages: [],
    summaryMessages: [],
  };
  const dependencies: PreviewNextBetaCommandDependencies = {
    executeGitCommand,
    githubClient,
    planNextBetaPreviewHistory: historyPlannerFixture.planNextBetaPreviewHistory,
    async writeFailure(message): Promise<void> {
      writerState.failureMessages.push(message);
    },
    async writeInformation(message): Promise<void> {
      writerState.informationMessages.push(message);
      if (Maybe.of(informationFailureMessage).isJust) {
        throw new Error(informationFailureMessage);
      }
    },
    async writeSummary(summary): Promise<void> {
      writerState.summaryMessages.push(summary);
      if (Maybe.of(summaryFailureMessage).isJust) {
        throw new Error(summaryFailureMessage);
      }
    },
  };
  const options: ExecutePreviewNextBetaCommandOptions = {
    targetMainCommit,
    environment: commandEnvironment,
    dependencies,
  };
  const result = await executePreviewNextBetaCommand(options);

  return {result, historyPlannerState: historyPlannerFixture.state, writerState};
}

describe('executePreviewNextBetaCommand', () => {
  test('delegates history planning with the exact target commit', async () => {
    const githubClientFixture = createFakeGitHubClient();

    const commandRun = await runCommand({
      targetMainCommit,
      executeGitCommand: createFakeGitCommand(),
      githubClient: githubClientFixture.githubClient,
    });

    expect(commandRun.historyPlannerState.calls).toBe(1);
    expect(commandRun.historyPlannerState.targetMainCommits).toEqual([targetMainCommit]);
    expect(githubClientFixture.state.listedCommits).toEqual([firstMainCommit, secondMainCommit, thirdMainCommit]);
  });

  test('does not discover pull requests when history is unavailable', async () => {
    const githubClientFixture = createFakeGitHubClient();
    const unavailableHistory: NextBetaPreviewHistoryPlan = {
      kind: 'unavailable',
      targetMainCommit,
    };

    const commandRun = await runCommand({
      targetMainCommit,
      executeGitCommand: createFakeGitCommand(),
      githubClient: githubClientFixture.githubClient,
      historyPlanResult: Result.ok(unavailableHistory),
    });

    expect(commandRun.result.exitCode).toBe(0);
    expect(githubClientFixture.state.listedCommits).toEqual([]);
    expect(commandRun.result.summary).toContain(
      'The preview is unavailable because no new-format Beta tag exists yet.',
    );
  });

  test('does not discover pull requests when history planning fails', async () => {
    const githubClientFixture = createFakeGitHubClient();

    const commandRun = await runCommand({
      targetMainCommit,
      executeGitCommand: createFakeGitCommand(),
      githubClient: githubClientFixture.githubClient,
      historyPlanResult: Result.err(new Error(`GitHub token ${githubToken} history failure`)),
    });

    expect(commandRun.result.exitCode).toBe(1);
    expect(githubClientFixture.state.listedCommits).toEqual([]);
    expect(commandRun.result.summary).not.toContain(githubToken);
    expect(commandRun.result.summary).toContain('[REDACTED]');
  });

  test('discovers merged main pull requests, ignores release branches, deduplicates, and records gaps', async () => {
    const githubClientFixture = createFakeGitHubClient({
      pullRequestsByCommit: new Map([
        [
          firstMainCommit,
          [
            createPullRequest({number: 22052, title: 'Add next Beta change preview [WPB-26469]'}),
            createPullRequest({number: 22040, baseBranch: 'release/2026-07-27'}),
            createPullRequest({number: 22041, merged: false}),
          ],
        ],
        [secondMainCommit, [createPullRequest({number: 22052, title: 'A duplicate title that must be ignored'})]],
        [thirdMainCommit, [createPullRequest({number: 22051, baseBranch: 'release/2026-07-27'})]],
      ]),
    });

    const commandRun = await runCommand({
      targetMainCommit,
      executeGitCommand: createFakeGitCommand(),
      githubClient: githubClientFixture.githubClient,
    });

    expect(commandRun.result.exitCode).toBe(0);
    expect(githubClientFixture.state.listedCommits).toEqual([firstMainCommit, secondMainCommit, thirdMainCommit]);
    expect(commandRun.result.summary).toContain(`Latest Beta tag: \`${latestBetaTag}\``);
    expect(commandRun.result.summary).toContain(`Latest Beta commit: \`${latestBetaCommit}\``);
    expect(commandRun.result.summary).toContain(`Current main commit: \`${targetMainCommit}\``);
    expect(commandRun.result.summary).toContain(`Merge base: \`${mergeBaseCommit}\``);
    expect(commandRun.result.summary).toContain('Merged pull requests waiting for Beta: 1');
    expect(commandRun.result.summary).toContain(
      '- [#22052](https://github.com/wireapp/wire-webapp/pull/22052) Add next Beta change preview \\[WPB-26469\\]',
    );
    expect(commandRun.result.summary).not.toContain('A duplicate title that must be ignored');
    expect(commandRun.result.summary).toContain(`- \`${thirdMainCommit}\``);
    expect(commandRun.result.summary).toContain('This is an advisory preview. These changes are on main');
    expect(commandRun.writerState.informationMessages[0]).toContain('Merged pull requests waiting for Beta: 1');
    expect(commandRun.writerState.informationMessages[0]).not.toContain('Add next Beta change preview');
  });

  test('sorts multiple merged main pull requests numerically', async () => {
    const githubClientFixture = createFakeGitHubClient({
      pullRequestsByCommit: new Map([
        [
          firstMainCommit,
          [
            createPullRequest({number: 22056, title: 'Add next Beta change preview [WPB-26469]'}),
            createPullRequest({number: 22050, title: 'Add first-appearance release comments [WPB-26469]'}),
          ],
        ],
        [
          secondMainCommit,
          [createPullRequest({number: 22052, title: 'Add release appearance comment dry run [WPB-26469]'})],
        ],
      ]),
    });

    const commandRun = await runCommand({
      targetMainCommit,
      executeGitCommand: createFakeGitCommand(),
      githubClient: githubClientFixture.githubClient,
      historyPlanResult: Result.ok({...previewHistoryPlan, commits: [firstMainCommit, secondMainCommit]}),
    });

    expect(commandRun.result.exitCode).toBe(0);
    expect(commandRun.result.summary.indexOf('#22050')).toBeLessThan(commandRun.result.summary.indexOf('#22052'));
    expect(commandRun.result.summary.indexOf('#22052')).toBeLessThan(commandRun.result.summary.indexOf('#22056'));
  });

  test('normalizes and escapes hostile pull request titles into one safe list item', async () => {
    const githubClientFixture = createFakeGitHubClient({
      pullRequestsByCommit: new Map([
        [
          firstMainCommit,
          [
            createPullRequest({
              number: 22060,
              title:
                '  Fix [preview] *output*\nfor <Beta>\t_with_ `code`\\path ~draft~\n- forged list\n# forged heading  ',
            }),
          ],
        ],
      ]),
    });

    const commandRun = await runCommand({
      targetMainCommit,
      executeGitCommand: createFakeGitCommand(),
      githubClient: githubClientFixture.githubClient,
      historyPlanResult: Result.ok({...previewHistoryPlan, commits: [firstMainCommit]}),
    });

    const expectedHostilePullRequestLine =
      '- [#22060](https://github.com/wireapp/wire-webapp/pull/22060) Fix \\[preview\\] \\*output\\* for \\<Beta\\> \\_with\\_ \\`code\\`\\\\path \\~draft\\~ - forged list # forged heading';
    expect(commandRun.result.summary).toContain(expectedHostilePullRequestLine);
    expect(commandRun.result.summary).not.toContain('\n- forged list');
    expect(commandRun.result.summary).not.toContain('\n# forged heading');
  });

  test('continues after a discovery failure, returns non-zero, and sanitizes the failure', async () => {
    const failedCommit = firstMainCommit;
    const githubClientFixture = createFakeGitHubClient({
      failureMessageByCommit: new Map([[failedCommit, `GitHub token ${githubToken} leaked`]]),
      pullRequestsByCommit: new Map([[secondMainCommit, [createPullRequest({number: 22050})]]]),
    });

    const commandRun = await runCommand({
      targetMainCommit,
      executeGitCommand: createFakeGitCommand(),
      githubClient: githubClientFixture.githubClient,
      historyPlanResult: Result.ok({
        ...previewHistoryPlan,
        commits: [failedCommit, secondMainCommit],
      }),
    });

    expect(commandRun.result.exitCode).toBe(1);
    expect(githubClientFixture.state.listedCommits).toEqual([failedCommit, secondMainCommit]);
    expect(commandRun.result.summary).not.toContain(githubToken);
    expect(commandRun.result.summary).toContain('[REDACTED]');
    expect(commandRun.result.summary).not.toContain('stack trace');
    expect(commandRun.result.summary).toContain('#22050');
  });

  test('continues after a rejected GitHub discovery request', async () => {
    const failedCommit = firstMainCommit;
    const githubClientFixture = createFakeGitHubClient({
      rejectedMessageByCommit: new Map([[failedCommit, `token ${githubToken} rejected`]]),
      pullRequestsByCommit: new Map([[secondMainCommit, [createPullRequest({number: 22050})]]]),
    });

    const commandRun = await runCommand({
      targetMainCommit,
      executeGitCommand: createFakeGitCommand(),
      githubClient: githubClientFixture.githubClient,
      historyPlanResult: Result.ok({
        ...previewHistoryPlan,
        commits: [failedCommit, secondMainCommit],
      }),
    });

    expect(commandRun.result.exitCode).toBe(1);
    expect(githubClientFixture.state.listedCommits).toEqual([failedCommit, secondMainCommit]);
    expect(commandRun.result.summary).not.toContain(githubToken);
    expect(commandRun.result.summary).toContain('[REDACTED]');
    expect(commandRun.result.summary).toContain('#22050');
  });

  test('returns success with a clear no-change result without GitHub requests', async () => {
    const githubClientFixture = createFakeGitHubClient();

    const commandRun = await runCommand({
      targetMainCommit,
      executeGitCommand: createFakeGitCommand(),
      githubClient: githubClientFixture.githubClient,
      historyPlanResult: Result.ok({...previewHistoryPlan, commits: []}),
    });

    expect(commandRun.result.exitCode).toBe(0);
    expect(githubClientFixture.state.listedCommits).toEqual([]);
    expect(commandRun.result.summary).toContain('Commits not present in Beta: 0');
    expect(commandRun.result.summary).toContain('No merged pull requests are currently waiting for the next Beta.');
    expect(commandRun.writerState.informationMessages[0]).toContain('Commits not present in Beta: 0');
  });

  test('reports sanitized informational-output failure without repeating processing', async () => {
    const githubClientFixture = createFakeGitHubClient({
      pullRequestsByCommit: new Map([[firstMainCommit, [createPullRequest({number: 22050})]]]),
    });

    const commandRun = await runCommand({
      targetMainCommit,
      executeGitCommand: createFakeGitCommand(),
      githubClient: githubClientFixture.githubClient,
      informationFailureMessage: `token ${githubToken} in information writer`,
    });

    expect(commandRun.result.exitCode).toBe(1);
    expect(commandRun.historyPlannerState.calls).toBe(1);
    expect(githubClientFixture.state.listedCommits).toEqual([firstMainCommit, secondMainCommit, thirdMainCommit]);
    expect(commandRun.writerState.summaryMessages).toHaveLength(1);
    expect(commandRun.writerState.informationMessages).toHaveLength(1);
    expect(commandRun.writerState.failureMessages).toHaveLength(1);
    expect(commandRun.writerState.failureMessages[0]).not.toContain(githubToken);
    expect(commandRun.writerState.failureMessages[0]).toContain('[REDACTED]');
    expect(commandRun.result.summary).toContain('#22050');
  });

  test('reports sanitized summary-output failure without repeating processing', async () => {
    const githubClientFixture = createFakeGitHubClient();

    const commandRun = await runCommand({
      targetMainCommit,
      executeGitCommand: createFakeGitCommand(),
      githubClient: githubClientFixture.githubClient,
      summaryFailureMessage: `token ${githubToken} in summary writer`,
    });

    expect(commandRun.result.exitCode).toBe(1);
    expect(commandRun.historyPlannerState.calls).toBe(1);
    expect(githubClientFixture.state.listedCommits).toEqual([firstMainCommit, secondMainCommit, thirdMainCommit]);
    expect(commandRun.writerState.summaryMessages).toHaveLength(1);
    expect(commandRun.writerState.informationMessages).toHaveLength(1);
    expect(commandRun.writerState.failureMessages).toHaveLength(1);
    expect(commandRun.writerState.failureMessages[0]).not.toContain(githubToken);
    expect(commandRun.writerState.failureMessages[0]).toContain('[REDACTED]');
    expect(commandRun.result.summary).toContain('Unable to write GitHub Actions summary');
  });

  test('reports both writer failures once and keeps secrets redacted', async () => {
    const githubClientFixture = createFakeGitHubClient();

    const commandRun = await runCommand({
      targetMainCommit,
      executeGitCommand: createFakeGitCommand(),
      githubClient: githubClientFixture.githubClient,
      informationFailureMessage: `token ${githubToken} in information writer`,
      summaryFailureMessage: `token ${githubToken} in summary writer`,
    });

    expect(commandRun.result.exitCode).toBe(1);
    expect(commandRun.historyPlannerState.calls).toBe(1);
    expect(githubClientFixture.state.listedCommits).toEqual([firstMainCommit, secondMainCommit, thirdMainCommit]);
    expect(commandRun.writerState.summaryMessages).toHaveLength(1);
    expect(commandRun.writerState.informationMessages).toHaveLength(1);
    expect(commandRun.writerState.failureMessages).toHaveLength(2);
    expect(commandRun.writerState.failureMessages.join('\n')).not.toContain(githubToken);
    expect(commandRun.result.summary).not.toContain(githubToken);
  });

  test('returns non-zero when the history planner fails', async () => {
    const githubClientFixture = createFakeGitHubClient();
    const commandRun = await runCommand({
      targetMainCommit,
      executeGitCommand: createFakeGitCommand(),
      githubClient: githubClientFixture.githubClient,
      historyPlanResult: Result.err(new Error('target commit does not exist')),
    });

    expect(commandRun.result.exitCode).toBe(1);
    expect(commandRun.result.summary).toContain('Git history: target commit does not exist');
    expect(githubClientFixture.state.listedCommits).toEqual([]);
  });
});
