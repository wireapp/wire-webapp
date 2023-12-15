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

import {TimeInMillis} from '@wireapp/commons/lib/util/TimeUtil';
import {User} from 'oidc-client-ts';
import {container} from 'tsyringe';

import {TypedEventEmitter} from '@wireapp/commons';

import {PrimaryModal, removeCurrentModal} from 'Components/Modals/PrimaryModal';
import {Core} from 'src/script/service/CoreSingleton';
import {UserState} from 'src/script/user/UserState';
import {getCertificateDetails} from 'Util/certificateDetails';
import {getLogger} from 'Util/Logger';
import {TIME_IN_MILLIS} from 'Util/TimeUtil';
import {removeUrlParameters} from 'Util/UrlUtil';
import {supportsMLS} from 'Util/util';

import {DelayTimerService} from './DelayTimer/DelayTimer';
import {hasActiveCertificate, isE2EIEnabled} from './E2EIdentityVerification';
import {getModalOptions, ModalType} from './Modals';
import {OIDCService} from './OIDCService';
import {OIDCServiceStore} from './OIDCService/OIDCServiceStorage';

import {Config} from '../Config';

export enum E2EIHandlerStep {
  UNINITIALIZED = 'uninitialized',
  INITIALIZED = 'initialized',
  ENROLL = 'enroll',
  SUCCESS = 'success',
  ERROR = 'error',
  SNOOZE = 'snooze',
}

interface E2EIHandlerParams {
  discoveryUrl: string;
  gracePeriodInSeconds: number;
}

type Events = {enrollmentSuccessful: void};

type EnrollmentConfig = {
  timer: DelayTimerService;
  discoveryUrl: string;
  gracePeriodInMs: number;
};

const gracePeriodMS = 7 * TimeInMillis.DAY; //GP
const historyTimeMS = 28 * TimeInMillis.DAY; //HT
export class E2EIHandler extends TypedEventEmitter<Events> {
  private logger = getLogger('E2EIHandler');
  private static instance: E2EIHandler | null = null;
  private readonly core = container.resolve(Core);
  private readonly userState = container.resolve(UserState);
  private config?: EnrollmentConfig;
  private currentStep: E2EIHandlerStep | null = E2EIHandlerStep.UNINITIALIZED;
  private oidcService: OIDCService | null = null;

  private get coreE2EIService() {
    const e2eiService = this.core.service?.e2eIdentity;

    if (!e2eiService) {
      throw new Error('E2EI Service not available');
    }

    return e2eiService;
  }

  /**
   * Get the singleton instance of GracePeriodTimer or create a new one
   * For the first time, params are required to create the instance
   * After that, params are optional and can be used to update the grace period timer
   * @param params The params to create the grace period timer
   * @returns The singleton instance of GracePeriodTimer
   */
  public static getInstance() {
    E2EIHandler.instance = E2EIHandler.instance ?? new E2EIHandler();
    return E2EIHandler.instance;
  }

  /**
   * Reset the instance
   */
  public static resetInstance() {
    E2EIHandler.instance = null;
  }

  public initialize({discoveryUrl, gracePeriodInSeconds}: E2EIHandlerParams) {
    if (!isE2EIEnabled()) {
      return this;
    }
    const gracePeriodInMs = gracePeriodInSeconds * TIME_IN_MILLIS.SECOND;
    this.config = {
      discoveryUrl,
      gracePeriodInMs,
      timer: DelayTimerService.getInstance({
        gracePeriodInMS: gracePeriodInMs,
        gracePeriodExpiredCallback: () => null,
        delayPeriodExpiredCallback: () => null,
      }),
    };
    if (!hasActiveCertificate()) {
      this.showE2EINotificationMessage();
    } else {
      const certificate = this.getCurrentDeviceCertificateData();

      if (!certificate) {
        return this;
      }

      const {isValid, timeRemainingMS, certificateCreationTime} = getCertificateDetails(certificate);

      // CC will soon return valid/expired/revoked
      if (!isValid) {
        return this;
      }

      const renewalTimeMS = this.calculateRenewalTime(timeRemainingMS, historyTimeMS, gracePeriodMS);
      const renewalPromptTime = new Date(certificateCreationTime + renewalTimeMS).getTime();
      const currentTime = new Date().getTime();

      if (currentTime >= renewalPromptTime) {
        void this.renewCertificate();
      }
    }
    return this;
  }

  /**
   * Renew the certificate without user action
   */
  private async renewCertificate(): Promise<void> {
    this.oidcService = new OIDCService();
    try {
      // Use the oidc service to get the user data via silent authentication (refresh token)
      const userData = await this.oidcService.handleSilentAuthentication();

      if (!userData) {
        throw new Error('Received no user data from OIDC service');
      }
      // renew without user action
      await this.enroll(true, userData);
    } catch (error) {
      this.logger.error('Silent authentication with refresh token failed', error);

      // If the silent authentication fails, clear the oidc service progress/data and renew manually
      await this.cleanUp();
      this.showE2EINotificationMessage(ModalType.CERTIFICATE_RENEWAL);
    }
  }

  /**
   * Calculates the date when the E2EI certificate renewal should be prompted.
   *
   * @param {number} timeRemainingMS - Certificate validity period in days (VP).
   * @param {number} historyTime - Maximum time messages are stored in days (HT).
   * @param {number} gracePeriod - Time to activate certificate in days (GP).
   * @returns {Date} - The date to start prompting for certificate renewal.
   */
  private calculateRenewalTime(timeRemainingMS: number, historyTimeMS: number, gracePeriodMS: number) {
    // Calculate a random time between 0 and 1 days
    const randomTimeInMS = Math.random() * TimeInMillis.DAY; // Up to 24 hours in milliseconds

    // Calculate the total days to subtract
    const totalDaysToSubtract = historyTimeMS + gracePeriodMS + randomTimeInMS;

    // Calculate the renewal date
    const renewalDate = timeRemainingMS - totalDaysToSubtract;

    return renewalDate;
  }

  get isE2EIEnabled(): boolean {
    return supportsMLS() && Config.getConfig().FEATURE.ENABLE_E2EI;
  }

  private async storeRedirectTargetAndRedirect(targetURL: string): Promise<void> {
    // store the target url in the persistent oidc service store, since the oidc service will be destroyed after the redirect
    OIDCServiceStore.store.targetURL(targetURL);
    this.oidcService = new OIDCService();
    await this.oidcService.authenticate();
  }

  /**
   * Used to clean the state/storage after a failed run
   */
  private async cleanUp() {
    // Remove the url parameters of the failed enrolment
    removeUrlParameters();
    // Clear the oidc service progress
    this.oidcService = new OIDCService();
    await this.oidcService.clearProgress();
    // Clear the e2e identity progress
    this.coreE2EIService.clearAllProgress();
    // Clear the oidc service store refresh token
    OIDCServiceStore.clear.refreshToken();
  }

  private getE2EIdentityService() {
    return container.resolve(Core).service?.e2eIdentity;
  }

  private getCurrentDeviceCertificateData() {
    if (!hasActiveCertificate()) {
      return undefined;
    }

    return this.getE2EIdentityService()?.getCertificateData();
  }

  public async enroll(refreshActiveCertificate = false, userData?: User) {
    if (!this.config) {
      throw new Error('Trying to enroll for E2EI without initializing the E2EIHandler');
    }
    try {
      // Notify user about E2EI enrolment in progress
      this.currentStep = E2EIHandlerStep.ENROLL;
      this.showLoadingMessage();
      let oAuthIdToken: string | undefined;

      if (!userData) {
        // If the enrolment is in progress, we need to get the id token from the oidc service, since oauth should have already been completed
        if (this.coreE2EIService.isEnrollmentInProgress()) {
          // The redirect-url which is needed inside the OIDCService is stored in the OIDCServiceStore previously
          this.oidcService = new OIDCService();
          const userData = await this.oidcService.handleAuthentication();
          if (!userData) {
            throw new Error('Received no user data from OIDC service');
          }
          oAuthIdToken = userData?.id_token;
        }
      } else {
        oAuthIdToken = userData?.id_token;
      }

      const displayName = this.userState.self()?.name();
      const handle = this.userState.self()?.username();
      // If the user has no username or handle, we cannot enroll
      if (!displayName || !handle) {
        throw new Error('Username or handle not found');
      }
      // console.log('enrollE2EI call');
      const data = await this.core.enrollE2EI({
        discoveryUrl: this.config.discoveryUrl,
        displayName,
        handle,
        oAuthIdToken,
      });

      // console.log('enrollE2EI data', data);
      // If the data is false or we dont get the ACMEChallenge, enrolment failed
      if (!data) {
        throw new Error('E2EI enrolment failed');
      }

      // Check if the data is a boolean, if not, we need to handle the oauth redirect
      if (typeof data !== 'boolean') {
        // console.log('storeRedirectTargetAndRedirect');
        await this.storeRedirectTargetAndRedirect(data.target);
      }

      // console.log('before setTimeout');
      // Notify user about E2EI enrolment success
      // This setTimeout is needed because there was a timing with the success modal and the loading modal
      setTimeout(() => {
        removeCurrentModal();
      }, 0);

      // console.log('after setTimeout');
      this.currentStep = E2EIHandlerStep.SUCCESS;
      this.showSuccessMessage();
      // Remove the url parameters after enrolment
      removeUrlParameters();
    } catch (error) {
      this.logger.error('E2EI enrollment failed', error);

      this.currentStep = E2EIHandlerStep.ERROR;

      setTimeout(() => {
        removeCurrentModal();
      }, 0);
      console.error('E2EI enrolment failed', error);
      await this.showErrorMessage();
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

    // console.log('showSuccessMessage');
    const {modalOptions, modalType} = getModalOptions({
      type: ModalType.SUCCESS,
      hideSecondary: true,
      hideClose: false,
    });
    PrimaryModal.show(modalType, modalOptions);
  }

  private async showErrorMessage(): Promise<void> {
    if (this.currentStep !== E2EIHandlerStep.ERROR) {
      return;
    }

    // Remove the url parameters of the failed enrolment
    removeUrlParameters();
    // Clear the oidc service progress
    await this.oidcService?.clearProgress();
    // Clear the e2e identity progress
    this.coreE2EIService.clearAllProgress();

    const {modalOptions, modalType} = getModalOptions({
      type: ModalType.ERROR,
      hideClose: true,
      primaryActionFn: () => {
        this.currentStep = E2EIHandlerStep.INITIALIZED;
        void this.enroll();
      },
      secondaryActionFn: () => {
        this.showE2EINotificationMessage();
      },
    });

    PrimaryModal.show(modalType, modalOptions);
  }

  private shouldShowNotification(): boolean {
    // If the user has already snoozed the notification, don't show it again until the snooze period has expired
    if (this.currentStep !== E2EIHandlerStep.UNINITIALIZED && this.currentStep !== E2EIHandlerStep.SNOOZE) {
      return false;
    }
    return true;
  }

  private initializeEnrollmentTimer(): void {
    // Only initialize the timer when the it is uninitialized
    if (this.currentStep === E2EIHandlerStep.UNINITIALIZED) {
      this.config?.timer.updateParams({
        gracePeriodInMS: this.config.gracePeriodInMs,
        gracePeriodExpiredCallback: () => {
          this.showE2EINotificationMessage();
        },
        delayPeriodExpiredCallback: () => {
          this.showE2EINotificationMessage();
        },
      });
      this.currentStep = E2EIHandlerStep.INITIALIZED;
    }
  }

  private showModal(modalType: ModalType = ModalType.ENROLL): void {
    // Check if config is defined and timer is available
    const isSnoozeTimeAvailable = this.config?.timer.isSnoozeTimeAvailable() ?? false;

    // Show the modal with the provided modal type
    const {modalOptions, modalType: determinedModalType} = getModalOptions({
      hideSecondary: !isSnoozeTimeAvailable,
      primaryActionFn: () => this.enroll(),
      secondaryActionFn: () => {
        this.currentStep = E2EIHandlerStep.SNOOZE;
        this.config?.timer.delayPrompt();
      },
      type: modalType,
      hideClose: true,
    });
    PrimaryModal.show(determinedModalType, modalOptions);
  }

  public showE2EINotificationMessage(modalType: ModalType = ModalType.ENROLL): void {
    // If the user has already started enrolment, don't show the notification. Instead, show the loading modal
    // This will occur after the redirect from the oauth provider
    if (this.coreE2EIService.isEnrollmentInProgress()) {
      void this.enroll();
      return;
    }

    // Early return if we shouldn't show the notification
    if (!this.shouldShowNotification()) {
      return;
    }

    this.initializeEnrollmentTimer();

    // If the timer is not active, show the notification modal
    if (this.config && !this.config.timer.isDelayTimerActive()) {
      this.showModal(modalType);
    }
  }
}
