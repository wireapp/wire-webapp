/*
 * Wire
 * Copyright (C) 2023 Wire Swiss GmbH
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

import logdown from 'logdown';

import {util} from '@wireapp/core';

import {getDelayTime} from './delay';
import {DelayTimerStore} from './DelayTimerStorage';

const {TaskScheduler} = util;

interface CreateGracePeriodTimerParams {
  gracePeriodInMS: number;
  gracePeriodExpiredCallback: () => void;
  delayPeriodExpiredCallback: () => void;
}

class DelayTimerService {
  private static instance: DelayTimerService | null = null;
  private gracePeriodInMS: number;
  private gracePeriodExpiredCallback: () => void;
  private delayPeriodExpiredCallback: () => void;
  private readonly logger = logdown('@wireapp/core/DelayTimer');
  private delayPeriodTimerKey: string = 'E2EIdentity_DelayTimer';
  private gracePeriodTimerKey: string = 'E2EIdentity_GracePeriodTimer';

  private constructor({
    gracePeriodInMS,
    gracePeriodExpiredCallback,
    delayPeriodExpiredCallback,
  }: CreateGracePeriodTimerParams) {
    this.gracePeriodInMS = gracePeriodInMS;
    this.gracePeriodExpiredCallback = gracePeriodExpiredCallback;
    this.delayPeriodExpiredCallback = delayPeriodExpiredCallback;
    this.initialize();
  }

  /**
   * Get the singleton instance of GracePeriodTimer or create a new one
   * For the first time, params are required to create the instance
   * @param params The params to create the grace period timer
   * @returns The singleton instance of GracePeriodTimer
   */
  public static getInstance(params?: CreateGracePeriodTimerParams) {
    if (!DelayTimerService.instance) {
      if (!params) {
        throw new Error('DelayTimerService is not initialized. Please call getInstance with params.');
      }
      DelayTimerService.instance = new DelayTimerService(params);
    }
    return DelayTimerService.instance;
  }

  /**
   * @param CreateGracePeriodTimerParams The params to create the grace period timer
   */
  public updateParams({
    gracePeriodInMS,
    gracePeriodExpiredCallback,
    delayPeriodExpiredCallback,
  }: CreateGracePeriodTimerParams) {
    DelayTimerStore.clear.all();
    this.clearGracePeriodTimer();
    this.clearDelayPeriodTimer();
    this.gracePeriodInMS = gracePeriodInMS;
    this.gracePeriodExpiredCallback = gracePeriodExpiredCallback;
    this.delayPeriodExpiredCallback = delayPeriodExpiredCallback;
    this.initialize();
  }

  /**
   * Initialize the grace period timer and load saved data from local storage if available
   */
  public initialize() {
    if (this.gracePeriodInMS <= 0) {
      return this.exit('Grace period is 0. No delays are allowed.');
    }

    // Check if grace period has changed
    if (DelayTimerStore.get.gracePeriod() !== this.gracePeriodInMS) {
      // Check if grace period is less than the time elapsed since the last prompt
      if (this.gracePeriodInMS < this.getElapsedGracePeriod()) {
        return this.exit(
          'Grace period has changed and is less than the time elapsed since the last prompt. No more delays are allowed.',
        );
      }
      this.updateGracePeriod();
    }

    // Load saved data from local storage
    if (DelayTimerStore.get.firingDate()) {
      const currentTime = Date.now();
      if (DelayTimerStore.get.firingDate() <= currentTime) {
        return this.exit('Grace period is already over. No more delays are allowed.');
      }
    } else {
      const firingDate = Date.now() + this.gracePeriodInMS;
      DelayTimerStore.store.firingDate(firingDate);
      DelayTimerStore.store.gracePeriod(this.gracePeriodInMS);
    }

    // Start / restart the grace period timer
    this.startGracePeriod(DelayTimerStore.get.firingDate());

    // this will start the delay period timer if it was active before
    this.continueDelayPeriodTimer();
  }

  /**
   * Prompt the user to delay the enrolment
   */
  public delayPrompt() {
    if (this.isDelayTimerActive()) {
      return;
    }
    if (!this.isSnoozeTimeAvailable()) {
      return this.exit('No more delays are allowed.');
    }
    const delayTimeInMS = getDelayTime(this.gracePeriodInMS);
    if (delayTimeInMS <= 0) {
      return this.exit('Delay period is 0. No more delays are allowed.');
    }

    if (DelayTimerStore.get.firingDate() <= Date.now()) {
      return this.exit('Grace period is already over. No more delays are allowed.');
    }

    this.startDelayPeriod(Date.now() + delayTimeInMS);
  }

  /**
   * Update the grace period
   */
  private updateGracePeriod() {
    // Store the new grace period
    DelayTimerStore.store.gracePeriod(this.gracePeriodInMS);
    const elapsedGracePeriod = this.getElapsedGracePeriod();

    // Check if grace period is already over
    if (elapsedGracePeriod > this.gracePeriodInMS) {
      return this.exit('Grace period is already over. No more delays are allowed.');
    }

    // Update the remaining grace period
    this.gracePeriodInMS -= elapsedGracePeriod;
    const startTime = Date.now();
    // Calculate the new end time
    const firingDate = startTime + this.gracePeriodInMS;
    // Store the new end time
    DelayTimerStore.store.firingDate(firingDate);

    this.startGracePeriod(firingDate);
  }

  /**
   * Exit the function
   * @param exitMessage The exit message
   * @returns Calls the gracePeriodExpiredCallback
   */
  private exit(exitMessage: string) {
    this.logger.info(exitMessage);
    this.clearDelayPeriodTimer();
    this.clearGracePeriodTimer();
    DelayTimerStore.clear.all();
    return this.gracePeriodExpiredCallback();
  }

  /**
   * Start the grace period timer and store the grace period
   * @param gracePeriodInMS The grace period in ms
   */
  private startGracePeriod(firingDate: number) {
    this.clearGracePeriodTimer();

    const task = () => {
      return this.exit('Grace period is over. No more delays are allowed.');
    };

    if (TaskScheduler.hasActiveTask(this.gracePeriodTimerKey)) {
      TaskScheduler.continueTask({
        key: this.gracePeriodTimerKey,
        task,
      });
    } else {
      TaskScheduler.addTask({
        key: this.gracePeriodTimerKey,
        task,
        firingDate,
        persist: true,
      });
    }
  }

  /**
   * Start the delay period timer and store the delay time
   * @param delayTimeInMS The delay time in ms
   */
  private startDelayPeriod(firingDate?: number) {
    this.clearDelayPeriodTimer();

    const task = () => {
      this.logger.info('Delay time is over.');
      return this.delayPeriodExpiredCallback();
    };

    if (TaskScheduler.hasActiveTask(this.delayPeriodTimerKey)) {
      TaskScheduler.continueTask({
        key: this.delayPeriodTimerKey,
        task,
      });
    } else if (firingDate) {
      TaskScheduler.addTask({
        key: this.delayPeriodTimerKey,
        task,
        firingDate,
        persist: true,
      });
    }
  }

  /**
   * Clear the current grace period timer
   */
  private clearGracePeriodTimer() {
    TaskScheduler.cancelTask(this.gracePeriodTimerKey);
  }

  /**
   * Clear the current delay period timer
   */
  private clearDelayPeriodTimer() {
    TaskScheduler.cancelTask(this.delayPeriodTimerKey);
  }

  private continueDelayPeriodTimer() {
    this.startDelayPeriod();
  }

  /**
   * Get the time elapsed since the last prompt
   * @returns The time elapsed since the last prompt in ms
   */
  private getElapsedGracePeriod() {
    return DelayTimerStore.get.firingDate()
      ? Date.now() - (DelayTimerStore.get.firingDate() - this.gracePeriodInMS)
      : 0;
  }

  /**
   * Reset the instance
   */
  public resetInstance() {
    DelayTimerStore.clear.all();
    this.clearGracePeriodTimer();
    this.clearDelayPeriodTimer();
    DelayTimerService.instance = null;
  }

  public isDelayTimerActive() {
    return TaskScheduler.hasActiveTask(this.delayPeriodTimerKey);
  }

  public isSnoozeTimeAvailable() {
    const remainingTime = DelayTimerStore.get.firingDate() - Date.now();
    const delayTime = getDelayTime(remainingTime);
    return remainingTime - delayTime > 0;
  }
}

export {DelayTimerService};
