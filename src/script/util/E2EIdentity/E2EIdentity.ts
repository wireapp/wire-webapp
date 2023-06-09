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

import {container} from 'tsyringe';

import {PrimaryModal, removeCurrentModal} from 'Components/Modals/PrimaryModal';
import {Config} from 'src/script/Config';
import {Core} from 'src/script/service/CoreSingleton';
import {UserState} from 'src/script/user/UserState';
import {supportsMLS} from 'Util/util';

import {GracePeriodTimer} from './DelayTimer';
import {getModalOptions, ModalType} from './Modals';

export enum E2EIHandlerStep {
  INITIALIZE = 'initialize',
  ENROLL = 'enroll',
  SUCCESS = 'success',
  ERROR = 'error',
  SNOOZE = 'snooze',
}

interface E2EIHandlerParams {
  discoveryUrl: string;
  gracePeriodInMS: number;
}

class E2EIHandler {
  private static instance: E2EIHandler | null = null;
  private timer: GracePeriodTimer;
  private discoveryUrl: string;
  private gracePeriodInMS: number;
  private currentStep: E2EIHandlerStep | null = null;

  private constructor({discoveryUrl, gracePeriodInMS}: E2EIHandlerParams) {
    // ToDo: Do these values need to te able to be updated? Should we use a singleton with update fn?
    this.discoveryUrl = discoveryUrl;
    this.gracePeriodInMS = gracePeriodInMS;
    this.timer = GracePeriodTimer.getInstance({delayCallback: () => null, gpCallback: () => null, gracePeriodInMS});
  }

  /**
   * Get the singleton instance of GracePeriodTimer or create a new one
   * For the first time, params are required to create the instance
   * After that, params are optional and can be used to update the grace period timer
   * @param params The params to create the grace period timer
   * @returns The singleton instance of GracePeriodTimer
   */
  public static getInstance(params?: E2EIHandlerParams) {
    if (!E2EIHandler.instance) {
      if (!params) {
        throw new Error('GracePeriodTimer is not initialized. Please call getInstance with params.');
      }
      E2EIHandler.instance = new E2EIHandler(params);
    }
    return E2EIHandler.instance;
  }

  /**
   * Reset the instance
   */
  public static resetInstance() {
    E2EIHandler.instance = null;
  }

  /**
   * @param E2EIHandlerParams The params to create the grace period timer
   */
  public updateParams({gracePeriodInMS, discoveryUrl}: E2EIHandlerParams) {
    this.gracePeriodInMS = gracePeriodInMS;
    this.discoveryUrl = discoveryUrl;
    this.timer = GracePeriodTimer.getInstance({delayCallback: () => null, gpCallback: () => null, gracePeriodInMS});
    this.initialize();
  }

  public initialize(): void {
    if (this.isE2EIEnabled) {
      this.currentStep = E2EIHandlerStep.INITIALIZE;
      this.showE2EINotificationMessage();
    }
  }

  get isE2EIEnabled(): boolean {
    return supportsMLS() && Config.getConfig().FEATURE.ENABLE_E2EI;
  }

  private async enrollE2EI() {
    try {
      const userState = container.resolve(UserState);
      const core = container.resolve(Core);
      // Notify user about E2EI enrollment in progress
      this.currentStep = E2EIHandlerStep.ENROLL;
      this.showLoadingMessage();
      const success = await core.startE2EIEnrollment(
        this.discoveryUrl,
        userState.self().name(),
        userState.self().username(),
      );
      console.log('success', success);
      if (!success) {
        throw new Error('E2EI enrollment failed');
      }
      // Notify user about E2EI enrollment success
      removeCurrentModal();
      this.currentStep = E2EIHandlerStep.SUCCESS;
      this.showSuccessMessage();
    } catch (e) {
      removeCurrentModal();
      this.currentStep = E2EIHandlerStep.ERROR;
      this.showErrorMessage();
    }
  }

  private showLoadingMessage(): void {
    if (this.currentStep !== E2EIHandlerStep.ENROLL) {
      return;
    }

    const {modalOptions, modalType} = getModalOptions({
      type: ModalType.LOADING,
      hideClose: true,
    });
    PrimaryModal.show(modalType, modalOptions);
  }

  private showSuccessMessage(): void {
    if (this.currentStep !== E2EIHandlerStep.SUCCESS) {
      return;
    }

    const {modalOptions, modalType} = getModalOptions({
      type: ModalType.SUCCESS,
      hideSecondary: true,
      hideClose: false,
      primaryActionFn: () => null,
    });
    PrimaryModal.show(modalType, modalOptions);
  }

  private showErrorMessage(): void {
    if (this.currentStep !== E2EIHandlerStep.ERROR) {
      return;
    }

    const {modalOptions, modalType} = getModalOptions({
      type: ModalType.ERROR,
      hideClose: true,
      primaryActionFn: async () => {
        this.currentStep = E2EIHandlerStep.INITIALIZE;
        await this.enrollE2EI();
      },
      secondaryActionFn: () => {
        this.showE2EINotificationMessage();
      },
    });
    PrimaryModal.show(modalType, modalOptions);
  }

  private showE2EINotificationMessage(): void {
    if (this.currentStep === E2EIHandlerStep.INITIALIZE) {
      this.timer.updateParams({
        gracePeriodInMS: this.gracePeriodInMS,
        gpCallback: () => {
          this.showE2EINotificationMessage();
        },
        delayCallback: () => {
          this.showE2EINotificationMessage();
        },
      });
    }

    if (!this.timer.isDelayTimerActive()) {
      const {modalOptions, modalType} = getModalOptions({
        hideSecondary: !this.timer.isSnoozeTimeAvailable(),
        primaryActionFn: () => this.enrollE2EI(),
        secondaryActionFn: () => {
          this.timer.delayPrompt();
        },
        type: ModalType.ENROLL,
        hideClose: true,
      });
      PrimaryModal.show(modalType, modalOptions);
    }
  }
}

export {E2EIHandler};
