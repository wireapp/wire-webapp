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

import {createActor, waitFor} from 'xstate';

import {createDeterministicWallClock} from '../../clock/deterministicWallClock';
import {appLockEventType, appLockStateName, createAppLockStateMachine} from './appLockStateMachine';

describe('appLockStateMachine', () => {
  describe('initial state resolution', () => {
    it('starts in unprotected when disabled and no passcode', () => {
      const wallClock = createDeterministicWallClock();
      const machine = createAppLockStateMachine({
        wallClock,
        isEnabled: false,
        isEnforced: false,
        hasPasscode: false,
        requiresPasscodeCreation: false,
      });

      const actor = createActor(machine);
      actor.start();

      expect(actor.getSnapshot().value).toBe(appLockStateName.unprotected);

      actor.stop();
    });

    it('starts in setup when passcode creation is required', () => {
      const wallClock = createDeterministicWallClock();
      const machine = createAppLockStateMachine({
        wallClock,
        isEnabled: true,
        isEnforced: false,
        hasPasscode: false,
        requiresPasscodeCreation: true,
      });

      const actor = createActor(machine);
      actor.start();

      expect(actor.getSnapshot().value).toBe(appLockStateName.setup);

      actor.stop();
    });

    it('starts in unlocked when enabled with passcode', () => {
      const wallClock = createDeterministicWallClock();
      const machine = createAppLockStateMachine({
        wallClock,
        isEnabled: true,
        isEnforced: false,
        hasPasscode: true,
        requiresPasscodeCreation: false,
      });

      const actor = createActor(machine);
      actor.start();

      expect(actor.getSnapshot().value).toBe(appLockStateName.unlocked);

      actor.stop();
    });

    it('starts in setup when enabled but no passcode', () => {
      const wallClock = createDeterministicWallClock();
      const machine = createAppLockStateMachine({
        wallClock,
        isEnabled: true,
        isEnforced: false,
        hasPasscode: false,
        requiresPasscodeCreation: false,
      });

      const actor = createActor(machine);
      actor.start();

      expect(actor.getSnapshot().value).toBe(appLockStateName.setup);

      actor.stop();
    });
  });

  describe('inactivity tracking with user activity', () => {
    it('locks after inactivity timeout when no user activity', async () => {
      const wallClock = createDeterministicWallClock({initialCurrentTimestampInMilliseconds: 0});
      const machine = createAppLockStateMachine({
        wallClock,
        isEnabled: true,
        isEnforced: false,
        hasPasscode: true,
        requiresPasscodeCreation: false,
        inactivityTimeoutMs: 60_000, // 1 minute
      });

      const actor = createActor(machine);
      actor.start();

      expect(actor.getSnapshot().value).toBe(appLockStateName.unlocked);

      // Advance time by 59 seconds - should still be unlocked
      wallClock.advanceByMilliseconds(59_000);
      expect(actor.getSnapshot().value).toBe(appLockStateName.unlocked);

      // Advance time by 1 more second to trigger timeout
      wallClock.advanceByMilliseconds(1_000);
      await waitFor(actor, state => state.matches(appLockStateName.locked));

      expect(actor.getSnapshot().value).toBe(appLockStateName.locked);

      actor.stop();
    });

    it('resets inactivity timer when user activity is detected', async () => {
      const wallClock = createDeterministicWallClock({initialCurrentTimestampInMilliseconds: 0});
      const machine = createAppLockStateMachine({
        wallClock,
        isEnabled: true,
        isEnforced: false,
        hasPasscode: true,
        requiresPasscodeCreation: false,
        inactivityTimeoutMs: 60_000, // 1 minute
      });

      const actor = createActor(machine);
      actor.start();

      expect(actor.getSnapshot().value).toBe(appLockStateName.unlocked);

      // Advance time by 50 seconds
      wallClock.advanceByMilliseconds(50_000);
      expect(actor.getSnapshot().value).toBe(appLockStateName.unlocked);

      // Send user activity event to reset the timer
      actor.send({type: appLockEventType.userActivity});

      // Advance time by another 50 seconds (total 100s, but timer was reset at 50s)
      wallClock.advanceByMilliseconds(50_000);
      expect(actor.getSnapshot().value).toBe(appLockStateName.unlocked);

      // Advance time by another 10 seconds (60s since last activity)
      wallClock.advanceByMilliseconds(10_000);
      await waitFor(actor, state => state.matches(appLockStateName.locked));

      expect(actor.getSnapshot().value).toBe(appLockStateName.locked);

      actor.stop();
    });

    it('continues to reset timer with ongoing user activity', async () => {
      const wallClock = createDeterministicWallClock({initialCurrentTimestampInMilliseconds: 0});
      const machine = createAppLockStateMachine({
        wallClock,
        isEnabled: true,
        isEnforced: false,
        hasPasscode: true,
        requiresPasscodeCreation: false,
        inactivityTimeoutMs: 60_000, // 1 minute
      });

      const actor = createActor(machine);
      actor.start();

      // Send activity every 30 seconds for 3 minutes
      for (let i = 0; i < 6; i++) {
        wallClock.advanceByMilliseconds(30_000);
        actor.send({type: appLockEventType.userActivity});
        expect(actor.getSnapshot().value).toBe(appLockStateName.unlocked);
      }

      // Now stop activity and wait for timeout
      wallClock.advanceByMilliseconds(60_000);
      await waitFor(actor, state => state.matches(appLockStateName.locked));

      expect(actor.getSnapshot().value).toBe(appLockStateName.locked);

      actor.stop();
    });
  });

  describe('state transitions', () => {
    it('transitions from unprotected to setup when enabled', () => {
      const wallClock = createDeterministicWallClock();
      const machine = createAppLockStateMachine({
        wallClock,
        isEnabled: false,
        isEnforced: false,
        hasPasscode: false,
        requiresPasscodeCreation: false,
      });

      const actor = createActor(machine);
      actor.start();

      expect(actor.getSnapshot().value).toBe(appLockStateName.unprotected);

      actor.send({type: appLockEventType.enable});

      expect(actor.getSnapshot().value).toBe(appLockStateName.setup);

      actor.stop();
    });

    it('transitions from setup to unlocked when passcode is confirmed', () => {
      const wallClock = createDeterministicWallClock();
      const machine = createAppLockStateMachine({
        wallClock,
        isEnabled: true,
        isEnforced: false,
        hasPasscode: false,
        requiresPasscodeCreation: false,
      });

      const actor = createActor(machine);
      actor.start();

      expect(actor.getSnapshot().value).toBe(appLockStateName.setup);

      actor.send({type: appLockEventType.passcodeConfirmed});

      expect(actor.getSnapshot().value).toBe(appLockStateName.unlocked);

      actor.stop();
    });

    it('transitions from locked to unlocked when unlock is successful', () => {
      const wallClock = createDeterministicWallClock();
      const machine = createAppLockStateMachine({
        wallClock,
        isEnabled: true,
        isEnforced: false,
        hasPasscode: true,
        requiresPasscodeCreation: false,
        inactivityTimeoutMs: 0, // Immediate lock for testing
      });

      const actor = createActor(machine);
      actor.start();

      // Advance time to trigger lock
      wallClock.advanceByMilliseconds(1);

      expect(actor.getSnapshot().value).toBe(appLockStateName.locked);

      actor.send({type: appLockEventType.unlockSuccess});

      expect(actor.getSnapshot().value).toBe(appLockStateName.unlocked);

      actor.stop();
    });

    it('transitions from locked to forgotPasscode', () => {
      const wallClock = createDeterministicWallClock();
      const machine = createAppLockStateMachine({
        wallClock,
        isEnabled: true,
        isEnforced: false,
        hasPasscode: true,
        requiresPasscodeCreation: false,
        inactivityTimeoutMs: 0,
      });

      const actor = createActor(machine);
      actor.start();

      wallClock.advanceByMilliseconds(1);
      expect(actor.getSnapshot().value).toBe(appLockStateName.locked);

      actor.send({type: appLockEventType.forgotPasscode});

      expect(actor.getSnapshot().value).toBe(appLockStateName.forgotPasscode);

      actor.stop();
    });

    it('transitions from forgotPasscode to wipeConfirm when logout with wipe', () => {
      const wallClock = createDeterministicWallClock();
      const machine = createAppLockStateMachine({
        wallClock,
        isEnabled: true,
        isEnforced: false,
        hasPasscode: true,
        requiresPasscodeCreation: false,
        inactivityTimeoutMs: 0,
      });

      const actor = createActor(machine);
      actor.start();

      wallClock.advanceByMilliseconds(1);
      actor.send({type: appLockEventType.forgotPasscode});

      expect(actor.getSnapshot().value).toBe(appLockStateName.forgotPasscode);

      actor.send({type: appLockEventType.logoutWithWipe});

      expect(actor.getSnapshot().value).toBe(appLockStateName.wipeConfirm);

      actor.stop();
    });
  });

  describe('context management', () => {
    it('sets isChangingPasscode when changing passcode from unlocked', () => {
      const wallClock = createDeterministicWallClock();
      const machine = createAppLockStateMachine({
        wallClock,
        isEnabled: true,
        isEnforced: false,
        hasPasscode: true,
        requiresPasscodeCreation: false,
      });

      const actor = createActor(machine);
      actor.start();

      expect(actor.getSnapshot().context.isChangingPasscode).toBe(false);

      actor.send({type: appLockEventType.changePasscode});

      expect(actor.getSnapshot().value).toBe(appLockStateName.setup);
      expect(actor.getSnapshot().context.isChangingPasscode).toBe(true);

      actor.stop();
    });

    it('updates isEnforced when lock is enforced', () => {
      const wallClock = createDeterministicWallClock();
      const machine = createAppLockStateMachine({
        wallClock,
        isEnabled: false,
        isEnforced: false,
        hasPasscode: false,
        requiresPasscodeCreation: false,
      });

      const actor = createActor(machine);
      actor.start();

      expect(actor.getSnapshot().context.isEnforced).toBe(false);

      actor.send({type: appLockEventType.lockEnforced});

      expect(actor.getSnapshot().context.isEnforced).toBe(true);

      actor.stop();
    });
  });

  describe('guards', () => {
    it('prevents disabling when enforced', () => {
      const wallClock = createDeterministicWallClock();
      const machine = createAppLockStateMachine({
        wallClock,
        isEnabled: true,
        isEnforced: true,
        hasPasscode: true,
        requiresPasscodeCreation: false,
      });

      const actor = createActor(machine);
      actor.start();

      expect(actor.getSnapshot().value).toBe(appLockStateName.unlocked);

      actor.send({type: appLockEventType.disable});

      // Should remain in unlocked because it's enforced
      expect(actor.getSnapshot().value).toBe(appLockStateName.unlocked);

      actor.stop();
    });

    it('allows disabling when not enforced', () => {
      const wallClock = createDeterministicWallClock();
      const machine = createAppLockStateMachine({
        wallClock,
        isEnabled: true,
        isEnforced: false,
        hasPasscode: true,
        requiresPasscodeCreation: false,
      });

      const actor = createActor(machine);
      actor.start();

      expect(actor.getSnapshot().value).toBe(appLockStateName.unlocked);

      actor.send({type: appLockEventType.disable});

      expect(actor.getSnapshot().value).toBe(appLockStateName.unprotected);

      actor.stop();
    });
  });
});
