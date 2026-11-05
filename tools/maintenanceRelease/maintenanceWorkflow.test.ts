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
import {readFileSync} from 'node:fs';
import path from 'node:path';

import {isArray, isPlainObject} from '@sindresorhus/is';
import {load} from 'js-yaml';

function findWorkflowStep(steps: readonly unknown[], expectedStepId: string): Record<string, unknown> | undefined {
  for (const workflowStep of steps) {
    if (isPlainObject(workflowStep) && workflowStep.id === expectedStepId) {
      return workflowStep;
    }
  }

  return undefined;
}

describe('maintenance distribution workflow boundaries', () => {
  it('supports artifact-only distribution and validates optional customer metadata before publishing', () => {
    const releaseWorkflowPath = path.join(process.cwd(), '.github/workflows/release-maintenance-webapp.yml');
    const releaseWorkflowDocument = load(readFileSync(releaseWorkflowPath, 'utf8'));
    assert(isPlainObject(releaseWorkflowDocument));
    assert(isPlainObject(releaseWorkflowDocument.on));
    assert(isPlainObject(releaseWorkflowDocument.on.workflow_dispatch));
    assert(isPlainObject(releaseWorkflowDocument.on.workflow_dispatch.inputs));
    assert(isPlainObject(releaseWorkflowDocument.on.workflow_dispatch.inputs.wire_builds_branch));
    expect(releaseWorkflowDocument.on.workflow_dispatch.inputs.wire_builds_branch.required).toBe(false);

    assert(isPlainObject(releaseWorkflowDocument.jobs));
    const validationJob = releaseWorkflowDocument.jobs.validate_request;
    assert(isPlainObject(validationJob));
    assert(isArray(validationJob.steps));
    const wireBuildsCheckout = findWorkflowStep(validationJob.steps, 'checkout_wire_builds_for_validation');
    const wireBuildsMetadataValidation = findWorkflowStep(validationJob.steps, 'validate_wire_builds_metadata');
    assert(wireBuildsCheckout !== undefined);
    assert(wireBuildsMetadataValidation !== undefined);
    expect(wireBuildsCheckout.if).toBe("${{ inputs.wire_builds_branch != '' }}");
    expect(wireBuildsMetadataValidation.if).toBe("${{ inputs.wire_builds_branch != '' }}");

    const publisherWorkflowPath = path.join(process.cwd(), '.github/workflows/publish-maintenance-distribution.yml');
    const publisherWorkflowDocument = load(readFileSync(publisherWorkflowPath, 'utf8'));
    assert(isPlainObject(publisherWorkflowDocument));
    assert(isPlainObject(publisherWorkflowDocument.on));
    assert(isPlainObject(publisherWorkflowDocument.on.workflow_call));
    assert(isPlainObject(publisherWorkflowDocument.on.workflow_call.inputs));
    assert(isPlainObject(publisherWorkflowDocument.on.workflow_call.inputs.wire_builds_branch));
    expect(publisherWorkflowDocument.on.workflow_call.inputs.wire_builds_branch.required).toBe(false);

    assert(isPlainObject(publisherWorkflowDocument.jobs));
    const publicationJob = publisherWorkflowDocument.jobs.publish_distribution;
    assert(isPlainObject(publicationJob));
    assert(isArray(publicationJob.steps));
    const publicationSteps = publicationJob.steps;
    const validateWireBuildsBranch = findWorkflowStep(publicationSteps, 'validate_wire_builds_branch');
    const checkoutWireBuilds = findWorkflowStep(publicationSteps, 'checkout_wire_builds');
    const validateWireBuildsMetadata = findWorkflowStep(publicationSteps, 'validate_wire_builds_metadata');
    const publishDocker = findWorkflowStep(publicationSteps, 'publish_docker');
    const updateWireBuilds = findWorkflowStep(publicationSteps, 'update_wire_builds');
    const distributionSummary = findWorkflowStep(publicationSteps, 'distribution_summary');
    assert(validateWireBuildsBranch !== undefined);
    assert(checkoutWireBuilds !== undefined);
    assert(validateWireBuildsMetadata !== undefined);
    assert(publishDocker !== undefined);
    assert(updateWireBuilds !== undefined);
    assert(distributionSummary !== undefined);
    expect(validateWireBuildsBranch.if).toBe("${{ inputs.wire_builds_branch != '' }}");
    expect(checkoutWireBuilds.if).toBe("${{ inputs.wire_builds_branch != '' }}");
    expect(validateWireBuildsMetadata.if).toBe("${{ inputs.wire_builds_branch != '' }}");
    expect(publicationSteps.indexOf(validateWireBuildsBranch)).toBeLessThan(
      publicationSteps.indexOf(checkoutWireBuilds),
    );
    expect(publicationSteps.indexOf(checkoutWireBuilds)).toBeLessThan(
      publicationSteps.indexOf(validateWireBuildsMetadata),
    );
    expect(publicationSteps.indexOf(validateWireBuildsMetadata)).toBeLessThan(publicationSteps.indexOf(publishDocker));
    expect(updateWireBuilds.if).toBe("${{ inputs.wire_builds_branch != '' }}");
    expect(distributionSummary.run).toContain('if [[ -z "${WIRE_BUILDS_BRANCH}" ]]');
    expect(distributionSummary.run).toContain('wire-builds update: skipped (no branch selected)');

    const repairWorkflowPath = path.join(process.cwd(), '.github/workflows/repair-maintenance-distribution.yml');
    const repairWorkflowDocument = load(readFileSync(repairWorkflowPath, 'utf8'));
    assert(isPlainObject(repairWorkflowDocument));
    assert(isPlainObject(repairWorkflowDocument.on));
    assert(isPlainObject(repairWorkflowDocument.on.workflow_dispatch));
    assert(isPlainObject(repairWorkflowDocument.on.workflow_dispatch.inputs));
    assert(isPlainObject(repairWorkflowDocument.on.workflow_dispatch.inputs.wire_builds_branch));
    expect(repairWorkflowDocument.on.workflow_dispatch.inputs.wire_builds_branch.required).toBe(false);
    assert(isPlainObject(repairWorkflowDocument.jobs));
    const recoveryPublisher = repairWorkflowDocument.jobs.publish_distribution;
    assert(isPlainObject(recoveryPublisher));
    assert(isPlainObject(recoveryPublisher.with));
    expect(recoveryPublisher.with.wire_builds_branch).toBe('${{ needs.validate_recovery.outputs.wire_builds_branch }}');
  });

  it('waits for maintenance validation and immutable tagging before publication', () => {
    const workflowFilePath = path.join(process.cwd(), '.github/workflows/release-maintenance-webapp.yml');
    const workflowDocument = load(readFileSync(workflowFilePath, 'utf8'));

    assert(isPlainObject(workflowDocument));
    assert(isPlainObject(workflowDocument.jobs));

    const maintenanceJobs = workflowDocument.jobs;
    const tagCreationJob = maintenanceJobs.create_maintenance_tag;
    const publicationJob = maintenanceJobs.publish_distribution;
    assert(isPlainObject(tagCreationJob));
    assert(isPlainObject(publicationJob));
    assert(isArray(tagCreationJob.needs));
    assert(isArray(publicationJob.needs));

    expect(tagCreationJob.needs).toContain('validate_maintenance');
    expect(publicationJob.needs).toContain('validate_maintenance');
    expect(publicationJob.needs).toContain('create_maintenance_tag');
    expect(publicationJob.uses).toBe('./.github/workflows/publish-maintenance-distribution.yml');
  });

  it('builds through the exact maintenance source entry point and fails clearly when it is absent', () => {
    const workflowFilePath = path.join(process.cwd(), '.github/workflows/release-maintenance-webapp.yml');
    const workflowDocument = load(readFileSync(workflowFilePath, 'utf8'));

    assert(isPlainObject(workflowDocument));
    assert(isPlainObject(workflowDocument.jobs));
    const maintenanceJobs = workflowDocument.jobs;
    const buildJob = maintenanceJobs.build_maintenance_artifact;
    assert(isPlainObject(buildJob));
    assert(isArray(buildJob.steps));

    const sourceScriptCheck = findWorkflowStep(buildJob.steps, 'check_source_build_script');
    const maintenanceBuildStep = findWorkflowStep(buildJob.steps, 'build_application');
    assert(sourceScriptCheck !== undefined);
    assert(maintenanceBuildStep !== undefined);
    const sourceScriptCheckIndex = buildJob.steps.indexOf(sourceScriptCheck);
    const maintenanceBuildStepIndex = buildJob.steps.indexOf(maintenanceBuildStep);

    expect(sourceScriptCheckIndex).toBeLessThan(maintenanceBuildStepIndex);
    expect(sourceScriptCheck['working-directory']).toBe('maintenance-source');
    expect(sourceScriptCheck.run).toContain('if [[ ! -f tools/maintenance/build.sh ]]');
    expect(sourceScriptCheck.run).toContain('Backport the source-era build script with the reviewed maintenance fix.');
    expect(maintenanceBuildStep['working-directory']).toBe('maintenance-source');
    expect(maintenanceBuildStep.run).toBe('./tools/maintenance/build.sh');
    assert(isPlainObject(maintenanceBuildStep.env));
    expect(maintenanceBuildStep.env.WIRE_WEBAPP_BUILD_VERSION).toBe(
      '${{ needs.select_maintenance_tag.outputs.candidate_tag }}',
    );
    expect(maintenanceBuildStep.env.WIRE_WEBAPP_BUILD_COMMIT).toBe(
      '${{ needs.prepare_maintenance_branch.outputs.maintenance_commit_sha }}',
    );
  });

  it('keeps the main source build entry point on the npm and Just process', () => {
    const buildScriptPath = path.join(process.cwd(), 'tools/maintenance/build.sh');
    const maintenanceBuildScript = readFileSync(buildScriptPath, 'utf8');

    expect(maintenanceBuildScript).toContain('npm clean-install');
    expect(maintenanceBuildScript).toContain('npx just setup');
    expect(maintenanceBuildScript).toContain('npx just package-server-public');
    expect(maintenanceBuildScript).not.toContain('./bin/yarn');
    expect(maintenanceBuildScript).not.toContain('nx run');
  });

  it('uses the same serialized distribution workflow for safe recovery', () => {
    const recoveryWorkflowFilePath = path.join(process.cwd(), '.github/workflows/repair-maintenance-distribution.yml');
    const workflowDocument = load(readFileSync(recoveryWorkflowFilePath, 'utf8'));

    assert(isPlainObject(workflowDocument));
    assert(isPlainObject(workflowDocument.jobs));
    const recoveryJobs = workflowDocument.jobs;
    const publicationJob = recoveryJobs.publish_distribution;
    assert(isPlainObject(publicationJob));
    expect(publicationJob.uses).toBe('./.github/workflows/publish-maintenance-distribution.yml');
  });

  it('serializes maintenance and regular publication through the shared distribution lock', () => {
    const publisherWorkflowFilePath = path.join(
      process.cwd(),
      '.github/workflows/publish-maintenance-distribution.yml',
    );
    const workflowDocument = load(readFileSync(publisherWorkflowFilePath, 'utf8'));

    assert(isPlainObject(workflowDocument));
    assert(isPlainObject(workflowDocument.jobs));
    const publisherJobs = workflowDocument.jobs;
    const publicationJob = publisherJobs.publish_distribution;
    assert(isPlainObject(publicationJob));
    assert(isPlainObject(publicationJob.concurrency));

    expect(publicationJob.concurrency.group).toBe('publish-webapp-distribution');
    expect(publicationJob.concurrency['cancel-in-progress']).toBe(false);
  });

  it('validates the recorded artifact before retry-safe distribution and selects production Docker config', () => {
    const publisherWorkflowFilePath = path.join(
      process.cwd(),
      '.github/workflows/publish-maintenance-distribution.yml',
    );
    const workflowDocument = load(readFileSync(publisherWorkflowFilePath, 'utf8'));

    assert(isPlainObject(workflowDocument));
    assert(isPlainObject(workflowDocument.jobs));
    const publisherJobs = workflowDocument.jobs;
    const publicationJob = publisherJobs.publish_distribution;
    assert(isPlainObject(publicationJob));
    assert(isArray(publicationJob.steps));

    const publicationSteps = publicationJob.steps;
    const stepIds = publicationSteps.map((workflowStep: unknown) => {
      assert(isPlainObject(workflowStep));

      return workflowStep.id;
    });
    const identityValidationIndex = stepIds.indexOf('validate_identity');
    const dockerPublicationIndex = stepIds.indexOf('publish_docker');
    const helmPublicationIndex = stepIds.indexOf('publish_helm');
    const wireBuildsUpdateIndex = stepIds.indexOf('update_wire_builds');

    expect(identityValidationIndex).toBeGreaterThanOrEqual(0);
    expect(identityValidationIndex).toBeLessThan(dockerPublicationIndex);
    expect(identityValidationIndex).toBeLessThan(helmPublicationIndex);
    expect(identityValidationIndex).toBeLessThan(wireBuildsUpdateIndex);

    const dockerPublicationStep = findWorkflowStep(publicationSteps, 'publish_docker');
    assert(dockerPublicationStep !== undefined);
    assert(isPlainObject(dockerPublicationStep.env));

    expect(dockerPublicationStep.env.PRODUCTION_TAG).toBe('${{ inputs.maintenance_tag }}');
    expect(dockerPublicationStep.env.WIRE_WEBAPP_RELEASE_COMMIT_SHA).toBe(
      '${{ steps.validate_identity.outputs.maintenance_tag_commit_sha }}',
    );
    expect(dockerPublicationStep['working-directory']).toBe('${{ runner.temp }}');

    const distributionSummaryStep = findWorkflowStep(publicationSteps, 'distribution_summary');
    assert(distributionSummaryStep !== undefined);
    assert(isPlainObject(distributionSummaryStep.env));
    expect(distributionSummaryStep.env.MAINTENANCE_COMMIT_SHA).toBe(
      '${{ steps.validate_identity.outputs.maintenance_tag_commit_sha }}',
    );
    expect(distributionSummaryStep.env.DISTRIBUTION_ARTIFACT_NAME).toBe('${{ inputs.distribution_artifact_name }}');
    expect(distributionSummaryStep.run).toContain('Validated distribution artifact: ${DISTRIBUTION_ARTIFACT_NAME}');
  });

  it('keeps the maintenance lifecycle isolated from hosted Production and main or dev publication', () => {
    const workflowFilePath = path.join(process.cwd(), '.github/workflows/release-maintenance-webapp.yml');
    const workflowDocument = load(readFileSync(workflowFilePath, 'utf8'));

    assert(isPlainObject(workflowDocument));
    assert(isPlainObject(workflowDocument.jobs));

    const maintenanceJobs = workflowDocument.jobs;
    expect(maintenanceJobs).not.toHaveProperty('deploy_to_beta');
    expect(maintenanceJobs).not.toHaveProperty('deploy_to_production');
    expect(maintenanceJobs).not.toHaveProperty('publish_main');
    expect(maintenanceJobs).not.toHaveProperty('publish_dev');
  });
});
