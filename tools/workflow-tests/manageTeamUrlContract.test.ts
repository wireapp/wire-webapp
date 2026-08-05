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

import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';

import {isArray, isPlainObject, isUndefined} from '@sindresorhus/is';
import {load} from 'js-yaml';

import {readRequiredEnvironmentVariable} from '../../apps/webapp/test/e2e_tests/environment/readRequiredEnvironmentVariable';

type WorkflowMapping = Record<string, unknown>;
type WorkflowTrigger = 'workflow_call' | 'workflow_dispatch';

const workflowsDirectory = resolve(__dirname, '../../.github/workflows');

function readWorkflowMapping(value: unknown, description: string): WorkflowMapping {
  if (isPlainObject(value) === false) {
    throw new Error(`Expected ${description} to be a YAML mapping.`);
  }

  return value;
}

function readWorkflow(workflowFileName: string): WorkflowMapping {
  const workflowPath = resolve(workflowsDirectory, workflowFileName);

  return readWorkflowMapping(load(readFileSync(workflowPath, 'utf8')), workflowFileName);
}

function readWorkflowSection(
  workflow: WorkflowMapping,
  trigger: WorkflowTrigger,
  workflowFileName: string,
): WorkflowMapping {
  const triggers = readWorkflowMapping(workflow.on, `${workflowFileName} on`);

  return readWorkflowMapping(triggers[trigger], `${workflowFileName} ${trigger}`);
}

function readWorkflowInput(workflowFileName: string, trigger: WorkflowTrigger, inputName: string): WorkflowMapping {
  const workflow = readWorkflow(workflowFileName);
  const triggerSection = readWorkflowSection(workflow, trigger, workflowFileName);
  const inputs = readWorkflowMapping(triggerSection.inputs, `${workflowFileName} ${trigger}.inputs`);

  return readWorkflowMapping(inputs[inputName], `${workflowFileName} ${trigger}.inputs.${inputName}`);
}

function readReusableWorkflowJobInputs(workflowFileName: string, jobName: string): WorkflowMapping {
  const workflow = readWorkflow(workflowFileName);
  const jobs = readWorkflowMapping(workflow.jobs, `${workflowFileName} jobs`);
  const job = readWorkflowMapping(jobs[jobName], `${workflowFileName} jobs.${jobName}`);

  return readWorkflowMapping(job.with, `${workflowFileName} jobs.${jobName}.with`);
}

function readWorkflowStepEnvironment(workflowFileName: string, jobName: string, stepName: string): WorkflowMapping {
  const workflow = readWorkflow(workflowFileName);
  const jobs = readWorkflowMapping(workflow.jobs, `${workflowFileName} jobs`);
  const job = readWorkflowMapping(jobs[jobName], `${workflowFileName} jobs.${jobName}`);
  const steps = job.steps;

  if (isArray(steps) === false) {
    throw new Error(`Expected ${workflowFileName} jobs.${jobName}.steps to be a YAML sequence.`);
  }

  const matchingStep = steps.find((step): boolean => {
    return isPlainObject(step) && step.name === stepName;
  });
  if (isUndefined(matchingStep)) {
    throw new Error(`Could not find step ${stepName} in ${workflowFileName} jobs.${jobName}.`);
  }

  return readWorkflowMapping(matchingStep.env, `${workflowFileName} jobs.${jobName} step ${stepName}.env`);
}

describe('manage-team URL workflow contract', (): void => {
  it.each([
    ['e2e-tests.yml', 'workflow_dispatch'],
    ['e2e-tests.yml', 'workflow_call'],
    ['precommit-slot-run.yml', 'workflow_call'],
    ['e2e-tests-nightly.yml', 'workflow_dispatch'],
  ] as const)('requires the expected URL for %s %s calls', (workflowFileName, trigger) => {
    const input = readWorkflowInput(workflowFileName, trigger, 'expectedManageTeamUrl');

    expect(input).toMatchObject({
      required: true,
      type: 'string',
    });
  });

  test('passes the explicit URL to the Playwright test job', (): void => {
    const environment = readWorkflowStepEnvironment('e2e-tests.yml', 'test', 'Run tests');

    expect(environment).toMatchObject({
      EXPECTED_MANAGE_TEAM_URL: '${{ inputs.expectedManageTeamUrl }}',
    });
  });

  it.each([
    ['precommit-slot-run.yml', 'e2e_tests', '${{ inputs.expectedManageTeamUrl }}'],
    ['release-webapp.yml', 'run_e2e', 'https://teams.wire.com/login/'],
    ['precommit-e2e-tests.yml', 'deploy_and_run_e2e', 'https://wire-teams-staging.zinfra.io/login/'],
    ['e2e-tests-nightly.yml', 'e2e_tests', '${{ inputs.expectedManageTeamUrl }}'],
  ] as const)('passes the expected URL from %s job %s', (workflowFileName, jobName, expectedManageTeamUrl) => {
    const e2eInputs = readReusableWorkflowJobInputs(workflowFileName, jobName);

    expect(e2eInputs.expectedManageTeamUrl).toBe(expectedManageTeamUrl);
  });

  test('removes the staging hostname regular expression from the Account Settings test', () => {
    const accountSettingsSpec = readFileSync(
      resolve(__dirname, '../../apps/webapp/test/e2e_tests/specs/AccountSettings/accountSettings.spec.ts'),
      'utf8',
    );

    expect(accountSettingsSpec).not.toContain('wire-teams-.+\\.zinfra');
    expect(accountSettingsSpec).toContain("readRequiredEnvironmentVariable('EXPECTED_MANAGE_TEAM_URL')");
    expect(accountSettingsSpec).toContain('expect(actualManageTeamUrl).toBe(expectedManageTeamUrl)');
  });

  test('reports a missing expected URL with an actionable error', () => {
    const previousValue = process.env.EXPECTED_MANAGE_TEAM_URL;
    delete process.env.EXPECTED_MANAGE_TEAM_URL;

    try {
      expect(() => {
        return readRequiredEnvironmentVariable('EXPECTED_MANAGE_TEAM_URL');
      }).toThrow(new Error('Missing required environment variable: EXPECTED_MANAGE_TEAM_URL'));
    } finally {
      if (isUndefined(previousValue)) {
        delete process.env.EXPECTED_MANAGE_TEAM_URL;
      } else {
        process.env.EXPECTED_MANAGE_TEAM_URL = previousValue;
      }
    }
  });
});
