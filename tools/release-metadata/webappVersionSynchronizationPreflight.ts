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

import {Result, Unit} from 'true-myth';
import {match, P} from 'ts-pattern';

import type {
  SemVerWebAppVersionSynchronizationInspection,
  WebAppVersionSynchronizationInspection,
} from './webappVersionSynchronization.ts';

export type WebAppVersionSynchronizationPreflightDecision =
  | {
      readonly state: 'allowed';
      readonly inspection: WebAppVersionSynchronizationInspection;
    }
  | {
      readonly state: 'blocked';
      readonly inspection: WebAppVersionSynchronizationInspection;
      readonly diagnostic: string;
    };

export type SemVerWebAppVersionSynchronizationPreflightDecision =
  | {
      readonly state: 'allowed';
      readonly inspection: SemVerWebAppVersionSynchronizationInspection;
    }
  | {
      readonly state: 'blocked';
      readonly inspection: SemVerWebAppVersionSynchronizationInspection;
      readonly diagnostic: string;
    };

function createBlockingDiagnostic(inspection: WebAppVersionSynchronizationInspection): string {
  return match(inspection)
    .with({kind: 'closed-without-merge'}, closedSynchronization => {
      return `Merge or resolve WebApp version synchronization pull request #${closedSynchronization.pullRequestNumber} for ${closedSynchronization.releaseIdentifier} before starting another Production release: ${closedSynchronization.pullRequestUrl}`;
    })
    .with({kind: 'blocked-by-previous-unresolved'}, blockedSynchronization => {
      return `Merge or resolve the previous WebApp version synchronization pull request #${blockedSynchronization.pullRequestNumber} for ${blockedSynchronization.blockingReleaseIdentifier} before starting another Production release: ${blockedSynchronization.pullRequestUrl}`;
    })
    .with({kind: 'conflict'}, conflictingSynchronization => {
      return `WebApp version synchronization history is conflicting for ${conflictingSynchronization.releaseIdentifier}: ${conflictingSynchronization.reason}`;
    })
    .otherwise(() => {
      return 'WebApp version synchronization preflight is blocked by an unknown state';
    });
}

export function decideWebAppVersionSynchronizationPreflight(
  inspection: WebAppVersionSynchronizationInspection,
): WebAppVersionSynchronizationPreflightDecision {
  return match(inspection)
    .returnType<WebAppVersionSynchronizationPreflightDecision>()
    .with({kind: P.union('available', 'matching-open', 'matching-merged')}, allowedInspection => {
      return {
        state: 'allowed',
        inspection: allowedInspection,
      };
    })
    .otherwise(blockedInspection => {
      return {
        state: 'blocked',
        inspection: blockedInspection,
        diagnostic: createBlockingDiagnostic(blockedInspection),
      };
    });
}

export function validateWebAppVersionSynchronizationPreflight(
  inspection: WebAppVersionSynchronizationInspection,
): Result<Unit, Error> {
  return match(decideWebAppVersionSynchronizationPreflight(inspection))
    .with({state: 'allowed'}, () => {
      return Result.ok();
    })
    .with({state: 'blocked'}, blockedDecision => {
      return Result.err(new Error(blockedDecision.diagnostic));
    })
    .exhaustive();
}

export function decideSemVerWebAppVersionSynchronizationPreflight(
  inspection: SemVerWebAppVersionSynchronizationInspection,
): SemVerWebAppVersionSynchronizationPreflightDecision {
  return match(inspection)
    .with({kind: P.union('available', 'matching-open', 'matching-merged')}, allowedInspection => {
      return {state: 'allowed' as const, inspection: allowedInspection};
    })
    .with({kind: 'closed-without-merge'}, closedInspection => {
      return {
        state: 'blocked' as const,
        inspection: closedInspection,
        diagnostic: `Merge or resolve WebApp version synchronization pull request #${closedInspection.pullRequestNumber} for ${closedInspection.productionTagName}: ${closedInspection.pullRequestUrl}`,
      };
    })
    .with({kind: 'blocked-by-previous-unresolved'}, blockedInspection => {
      return {
        state: 'blocked' as const,
        inspection: blockedInspection,
        diagnostic: `Merge or resolve the previous WebApp version synchronization pull request #${blockedInspection.pullRequestNumber} for ${blockedInspection.blockingProductionTagName}: ${blockedInspection.pullRequestUrl}`,
      };
    })
    .with({kind: 'conflict'}, conflictingInspection => {
      return {
        state: 'blocked' as const,
        inspection: conflictingInspection,
        diagnostic: `WebApp version synchronization history is conflicting for ${conflictingInspection.productionTagName}: ${conflictingInspection.reason}`,
      };
    })
    .exhaustive();
}

export function validateSemVerWebAppVersionSynchronizationPreflight(
  inspection: SemVerWebAppVersionSynchronizationInspection,
): Result<Unit, Error> {
  const decision = decideSemVerWebAppVersionSynchronizationPreflight(inspection);

  return match(decision)
    .with({state: 'allowed'}, () => {
      return Result.ok();
    })
    .with({state: 'blocked'}, blockedDecision => {
      return Result.err(new Error(blockedDecision.diagnostic));
    })
    .exhaustive();
}
