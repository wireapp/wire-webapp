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

import {assign, createMachine, fromCallback, sendTo} from 'xstate';

import {WallClock} from '../../clock/wallClock';

const DEFAULT_INACTIVITY_TIMEOUT_MS = 60_000; // 1 minute

export const appLockEventType = Object.freeze({
  /** User enables "Lock with passcode" in preferences. */
  enable: 'ENABLE',
  /** User disables "Lock with passcode" in preferences. */
  disable: 'DISABLE',
  /** Team policy begins enforcing app lock. */
  lockEnforced: 'LOCK_ENFORCED',
  /** User successfully set or changed their passcode. */
  passcodeConfirmed: 'PASSCODE_CONFIRMED',
  /** User activity detected (injected from outside the machine). */
  userActivity: 'USER_ACTIVITY',
  /** Inactivity debounce timer fired — no user activity for inactivityTimeoutMs. */
  inactivityTimeout: 'INACTIVITY_TIMEOUT',
  /** User entered the correct passcode on the lock screen. */
  unlockSuccess: 'UNLOCK_SUCCESS',
  /** User clicked "Forgot passcode" on the lock screen. */
  forgotPasscode: 'FORGOT_PASSCODE',
  /** User navigates back to locked screen from forgotPasscode. */
  backToLocked: 'BACK_TO_LOCKED',
  /** User wants to change their passcode from preferences. */
  changePasscode: 'CHANGE_PASSCODE',
  /** User chooses "Logout + delete all data" from forgotPasscode screen. */
  logoutWithWipe: 'LOGOUT_WITH_WIPE',
  /** User chooses "Logout without deleting data" from forgotPasscode screen. */
  logoutWithoutWipe: 'LOGOUT_WITHOUT_WIPE',
  /** User confirms the data wipe from wipeConfirm screen. */
  confirmWipe: 'CONFIRM_WIPE',
  /** User cancels the data wipe from wipeConfirm screen. */
  cancelWipe: 'CANCEL_WIPE',
} as const);

export type AppLockMachineEvent = {
  [K in keyof typeof appLockEventType]: {type: (typeof appLockEventType)[K]};
}[keyof typeof appLockEventType];

export const appLockStateName = Object.freeze({
  /**
   * App lock is not active. No passcode is set and no policy enforces it.
   * Modal shown: none.
   */
  unprotected: 'unprotected',
  /**
   * User is creating or changing their passcode.
   * context.isChangingPasscode distinguishes a change from first-time setup.
   * Modal shown: passcode setup form.
   */
  setup: 'setup',
  /**
   * App is unlocked. The inactivity callback actor is running and tracking
   * time since last user activity. After inactivityTimeoutMs of no activity,
   * it fires INACTIVITY_TIMEOUT.
   * Modal shown: none (app is fully accessible).
   */
  unlocked: 'unlocked',
  /**
   * App is locked. Waiting for the correct passcode.
   * Modal shown: passcode entry.
   */
  locked: 'locked',
  /**
   * User tapped "Forgot passcode". Showing logout options.
   * Modal shown: forgot-passcode / logout options.
   */
  forgotPasscode: 'forgotPasscode',
  /**
   * User chose "Logout + delete all data". Waiting for final confirmation.
   * Modal shown: wipe confirmation.
   */
  wipeConfirm: 'wipeConfirm',
} as const);

export type AppLockStateName = (typeof appLockStateName)[keyof typeof appLockStateName];

export type AppLockMachineInput = {
  readonly wallClock: WallClock;
  readonly inactivityTimeoutMs?: number;
  readonly isEnabled: boolean;
  readonly isEnforced: boolean;
  readonly hasPasscode: boolean;
  readonly requiresPasscodeCreation: boolean;
};

type AppLockMachineContext = {
  readonly wallClock: WallClock;
  readonly inactivityTimeoutMs: number;
  readonly isEnforced: boolean;
  readonly isChangingPasscode: boolean;
};

type InactivityActorInput = {
  readonly wallClock: WallClock;
  readonly timeoutMs: number;
};

/**
 * Events that the inactivity timer actor can receive.
 */
type InactivityActorEvent =
  | {type: 'RESET_TIMER'} // Sent when user activity is detected
  | {type: typeof appLockEventType.inactivityTimeout}; // Not used as input, only sent to parent

/**
 * This callback actor manages an inactivity timer.
 * It starts a timer when created and resets it whenever it receives a RESET_TIMER event.
 * After timeout milliseconds of no RESET_TIMER events, it sends INACTIVITY_TIMEOUT to the parent machine.
 *
 * Note: This is NOT a debounce of activity events - it's a trailing-edge inactivity detector.
 * Every activity event resets the timer; we're measuring time since last activity, not rate-limiting events.
 */
const inactivityCallbackActor = fromCallback<InactivityActorEvent, InactivityActorInput>(
  ({sendBack, input, receive}) => {
    const {wallClock, timeoutMs} = input;
    let inactivityTimeoutId: ReturnType<typeof wallClock.setTimeout> | null = null;

    const resetInactivityTimer = () => {
      if (inactivityTimeoutId !== null) {
        wallClock.clearTimeout(inactivityTimeoutId);
      }
      inactivityTimeoutId = wallClock.setTimeout(() => {
        sendBack({type: appLockEventType.inactivityTimeout});
      }, timeoutMs);
    };

    // Start the initial inactivity timer
    resetInactivityTimer();

    // Listen for RESET_TIMER events from the parent machine
    receive(event => {
      if (event.type === 'RESET_TIMER') {
        resetInactivityTimer();
      }
    });

    // Cleanup on actor stop
    return () => {
      if (inactivityTimeoutId !== null) {
        wallClock.clearTimeout(inactivityTimeoutId);
      }
    };
  },
);

function resolveInitialState(input: AppLockMachineInput): AppLockStateName {
  if (input.requiresPasscodeCreation) {
    return appLockStateName.setup;
  }
  if (!input.isEnabled && !input.isEnforced) {
    return appLockStateName.unprotected;
  }
  if (input.hasPasscode) {
    return appLockStateName.unlocked;
  }
  return appLockStateName.setup;
}

export function createAppLockStateMachine(input: AppLockMachineInput) {
  return createMachine({
    id: 'appLock',

    types: {
      context: {} as AppLockMachineContext,
      events: {} as AppLockMachineEvent,
    },

    context: {
      wallClock: input.wallClock,
      inactivityTimeoutMs: input.inactivityTimeoutMs ?? DEFAULT_INACTIVITY_TIMEOUT_MS,
      isEnforced: input.isEnforced,
      isChangingPasscode: false,
    },

    initial: resolveInitialState(input),

    states: {
      [appLockStateName.unprotected]: {
        on: {
          [appLockEventType.enable]: {
            target: appLockStateName.setup,
          },
          [appLockEventType.lockEnforced]: {
            target: appLockStateName.setup,
            actions: assign({isEnforced: true}),
          },
        },
      },

      [appLockStateName.setup]: {
        on: {
          [appLockEventType.passcodeConfirmed]: {
            target: appLockStateName.unlocked,
            actions: assign({isChangingPasscode: false}),
          },
          [appLockEventType.disable]: {
            target: appLockStateName.unprotected,
            guard: ({context}) => !context.isEnforced && context.isChangingPasscode,
            actions: assign({isChangingPasscode: false}),
          },
        },
      },

      [appLockStateName.unlocked]: {
        invoke: {
          id: 'inactivityTimer',
          src: inactivityCallbackActor,
          input: ({context}: {context: AppLockMachineContext}) => ({
            wallClock: context.wallClock,
            timeoutMs: context.inactivityTimeoutMs,
          }),
        },
        on: {
          [appLockEventType.userActivity]: {
            actions: sendTo('inactivityTimer', {type: 'RESET_TIMER'}),
          },
          [appLockEventType.inactivityTimeout]: {
            target: appLockStateName.locked,
          },
          [appLockEventType.changePasscode]: {
            target: appLockStateName.setup,
            actions: assign({isChangingPasscode: true}),
          },
          [appLockEventType.disable]: {
            target: appLockStateName.unprotected,
            guard: ({context}) => !context.isEnforced,
          },
          [appLockEventType.lockEnforced]: {
            actions: assign({isEnforced: true}),
          },
        },
      },

      [appLockStateName.locked]: {
        on: {
          [appLockEventType.unlockSuccess]: {
            target: appLockStateName.unlocked,
          },
          [appLockEventType.forgotPasscode]: {
            target: appLockStateName.forgotPasscode,
          },
        },
      },

      [appLockStateName.forgotPasscode]: {
        on: {
          [appLockEventType.backToLocked]: {
            target: appLockStateName.locked,
          },
          [appLockEventType.logoutWithWipe]: {
            target: appLockStateName.wipeConfirm,
          },
          [appLockEventType.logoutWithoutWipe]: {
            target: appLockStateName.unprotected,
          },
        },
      },

      [appLockStateName.wipeConfirm]: {
        on: {
          [appLockEventType.confirmWipe]: {
            target: appLockStateName.unprotected,
          },
          [appLockEventType.cancelWipe]: {
            target: appLockStateName.forgotPasscode,
          },
        },
      },
    },
  });
}
