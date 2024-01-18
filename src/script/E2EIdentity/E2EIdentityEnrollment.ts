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
import {amplify} from 'amplify';
import {User} from 'oidc-client-ts';
import {container} from 'tsyringe';

import {TypedEventEmitter} from '@wireapp/commons';
import {WebAppEvents} from '@wireapp/webapp-events';

import {PrimaryModal, removeCurrentModal} from 'Components/Modals/PrimaryModal';
import {Core} from 'src/script/service/CoreSingleton';
import {UserState} from 'src/script/user/UserState';
import {getCertificateDetails} from 'Util/certificateDetails';
import {getLogger} from 'Util/Logger';
import {formatDelayTime, TIME_IN_MILLIS} from 'Util/TimeUtil';
import {removeUrlParameters} from 'Util/UrlUtil';
import {supportsMLS} from 'Util/util';

import {getDelayTime, shouldEnableSoftLock} from './DelayTimer/delay';
import {DelayTimerService} from './DelayTimer/DelayTimer';
import {
  hasActiveCertificate,
  isE2EIEnabled,
  getActiveWireIdentity,
  MLSStatuses,
  WireIdentity,
} from './E2EIdentityVerification';
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

type Events = {
  identityUpdated: {enrollmentConfig: EnrollmentConfig; identity?: WireIdentity};
};

export type EnrollmentConfig = {
  timer: DelayTimerService;
  discoveryUrl: string;
  gracePeriodInMs: number;
};

const historyTimeMS = 28 * TimeInMillis.DAY; //HT
export class E2EIHandler extends TypedEventEmitter<Events> {
  private logger = getLogger('E2EIHandler');
  private static instance: E2EIHandler | null = null;
  private readonly core = container.resolve(Core);
  private readonly userState = container.resolve(UserState);
  private config?: EnrollmentConfig;
  private currentStep: E2EIHandlerStep | null = E2EIHandlerStep.UNINITIALIZED;
  private oidcService?: OIDCService;

  private get coreE2EIService() {
    const e2eiService = this.core.service?.e2eIdentity;

    if (!e2eiService) {
      throw new Error('E2EI Service not available');
    }

    return e2eiService;
  }

  private createOIDCService() {
    const key = this.core.key;
    if (!key) {
      throw new Error('encryption key not set');
    }
    return new OIDCService(key);
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
    if (isE2EIEnabled()) {
      const gracePeriodInMs = gracePeriodInSeconds * TIME_IN_MILLIS.SECOND;
      this.config = {
        discoveryUrl,
        gracePeriodInMs,
        timer: new DelayTimerService({
          gracePeriodInMS: gracePeriodInMs,
          gracePeriodExpiredCallback: () => null,
          delayPeriodExpiredCallback: () => null,
        }),
      };
    }
    return this;
  }

  public async attemptEnrollment(): Promise<void> {
    const hasCertificate = await hasActiveCertificate();
    if (hasCertificate) {
      // If the client already has a certificate, we don't need to start the enrollment
      return;
    }
    return this.showE2EINotificationMessage(ModalType.ENROLL);
  }

  public async attemptRenewal(): Promise<void> {
    const identity = await getActiveWireIdentity();

    if (!identity?.certificate) {
      return;
    }

    const {timeRemainingMS, certificateCreationTime} = getCertificateDetails(identity.certificate);

    if (!this.shouldRefresh(identity)) {
      return;
    }

    // Check if an enrollment is already in progress
    if (this.coreE2EIService.isEnrollmentInProgress()) {
      return this.enroll();
    }

    const renewalTimeMS = this.calculateRenewalTime(timeRemainingMS, historyTimeMS, this.config!.gracePeriodInMs);
    const renewalPromptTime = new Date(certificateCreationTime + renewalTimeMS).getTime();
    const currentTime = new Date().getTime();

    // Check if it's time to renew the certificate
    if (currentTime >= renewalPromptTime) {
      await this.renewCertificate();
      this.emit('identityUpdated', {enrollmentConfig: this.config!, identity});
    }
  }

  private shouldRefresh(identity: WireIdentity) {
    const deviceIdentityStatus = identity.status;
    switch (deviceIdentityStatus) {
      case MLSStatuses.REVOKED:
        return false;
      default:
        return true;
    }
  }

  /**
   * Renew the certificate without user action
   */
  private async renewCertificate(): Promise<void> {
    this.oidcService = this.createOIDCService();
    try {
      // Use the oidc service to get the user data via silent authentication (refresh token)
      const userData = await this.oidcService.handleSilentAuthentication();

      if (!userData) {
        throw new Error('Received no user data from OIDC service');
      }
      // renew without user action
      await this.enroll(userData);
    } catch (error) {
      this.logger.error('Silent authentication with refresh token failed', error);

      // If the silent authentication fails, clear the oidc service progress/data and renew manually
      await this.cleanUp(true);
      this.showE2EINotificationMessage(ModalType.CERTIFICATE_RENEWAL);
    }
  }

  /**
   * Calculates the date when the E2EI certificate renewal should be prompted.
   *
   * @param timeRemainingMS - Certificate validity period in days (VP).
   * @param historyTime - Maximum time messages are stored in days (HT).
   * @param gracePeriod - Time to activate certificate in days (GP).
   * @returns The date to start prompting for certificate renewal.
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
    this.oidcService = this.createOIDCService();
    await this.oidcService.authenticate();
  }

  /**
   * Used to clean the state/storage after a failed run
   */
  private async cleanUp(includeOidcServiceUserData: boolean) {
    // Remove the url parameters of the failed enrolment
    removeUrlParameters();
    // Clear the oidc service progress
    this.oidcService = this.createOIDCService();
    await this.oidcService.clearProgress(includeOidcServiceUserData);
    // Clear the e2e identity progress
    this.coreE2EIService.clearAllProgress();
  }

  public async enroll(userData?: User) {
    if (!this.config) {
      throw new Error('Trying to enroll for E2EI without initializing the E2EIHandler');
    }
    try {
      // Notify user about E2EI enrolment in progress
      this.currentStep = E2EIHandlerStep.ENROLL;
      const isCertificateRenewal = await hasActiveCertificate();
      this.showLoadingMessage();

      if (!userData) {
        // If the enrolment is in progress, we need to get the id token from the oidc service, since oauth should have already been completed
        if (this.coreE2EIService.isEnrollmentInProgress()) {
          // The redirect-url which is needed inside the OIDCService is stored in the OIDCServiceStore previously
          this.oidcService = this.createOIDCService();
          userData = await this.oidcService.handleAuthentication();
          if (!userData) {
            throw new Error('Received no user data from OIDC service');
          }
        }
      }
      const oAuthIdToken = userData?.id_token;

      const displayName = this.userState.self()?.name();
      const handle = this.userState.self()?.username();
      // If the user has no username or handle, we cannot enroll
      if (!displayName || !handle) {
        throw new Error('Username or handle not found');
      }
      const data = await this.core.enrollE2EI({
        discoveryUrl: this.config.discoveryUrl,
        displayName,
        handle,
        oAuthIdToken,
      });
      // If the data is false or we dont get the ACMEChallenge, enrolment failed
      if (!data) {
        throw new Error('E2EI enrolment failed');
      }

      // Check if the data is a boolean, if not, we need to handle the oauth redirect
      if (typeof data !== 'boolean') {
        await this.storeRedirectTargetAndRedirect(data.target);
      }

      // Notify user about E2EI enrolment success
      // This setTimeout is needed because there was a timing with the success modal and the loading modal
      setTimeout(removeCurrentModal, 0);

      this.currentStep = E2EIHandlerStep.SUCCESS;
      // clear the oidc service progress/data and successful enrolment
      await this.cleanUp(false);

      await this.showSuccessMessage(isCertificateRenewal);
      this.emit('identityUpdated', {enrollmentConfig: this.config!});
    } catch (error) {
      this.currentStep = E2EIHandlerStep.ERROR;

      setTimeout(removeCurrentModal, 0);
      await this.showErrorMessage();
    }
  }

  private showLoadingMessage(isCertificateRenewal = false): void {
    if (this.currentStep !== E2EIHandlerStep.ENROLL) {
      return;
    }

    const {modalOptions, modalType} = getModalOptions({
      type: ModalType.LOADING,
      hideClose: true,
      extraParams: {
        isRenewal: isCertificateRenewal,
      },
    });
    PrimaryModal.show(modalType, modalOptions);
  }

  private async showSuccessMessage(isCertificateRenewal = false) {
    if (this.currentStep !== E2EIHandlerStep.SUCCESS) {
      return;
    }

    return new Promise<void>(resolve => {
      const {modalOptions, modalType} = getModalOptions({
        type: ModalType.SUCCESS,
        hideClose: false,
        extraParams: {
          isRenewal: isCertificateRenewal,
        },
        primaryActionFn: resolve,
        secondaryActionFn: () => {
          amplify.publish(WebAppEvents.PREFERENCES.MANAGE_DEVICES);
          resolve();
        },
      });
      PrimaryModal.show(modalType, modalOptions);
    });
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

    const isSoftLockEnabled = await shouldEnableSoftLock(this.config!);

    return new Promise<void>(resolve => {
      const {modalOptions, modalType} = getModalOptions({
        type: ModalType.ERROR,
        hideClose: true,
        hideSecondary: isSoftLockEnabled,
        primaryActionFn: async () => {
          this.currentStep = E2EIHandlerStep.INITIALIZED;
          await this.enroll();
          resolve();
        },
        secondaryActionFn: async () => {
          await this.showE2EINotificationMessage(ModalType.ENROLL);
          resolve();
        },
      });

      PrimaryModal.show(modalType, modalOptions);
    });
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
          this.showE2EINotificationMessage(ModalType.ENROLL);
        },
        delayPeriodExpiredCallback: () => {
          this.showE2EINotificationMessage(ModalType.ENROLL);
        },
      });
      this.currentStep = E2EIHandlerStep.INITIALIZED;
    }
  }

  private async showEnrollmentModal(modalType: ModalType.ENROLL | ModalType.CERTIFICATE_RENEWAL): Promise<void> {
    // Show the modal with the provided modal type
    const disableSnooze = await shouldEnableSoftLock(this.config!);
    return new Promise<void>(resolve => {
      const {modalOptions, modalType: determinedModalType} = getModalOptions({
        hideSecondary: disableSnooze,
        primaryActionFn: async () => {
          await this.enroll();
          resolve();
        },
        secondaryActionFn: () => {
          this.currentStep = E2EIHandlerStep.SNOOZE;
          this.config?.timer.delayPrompt();
          this.showSnoozeModal();
          resolve();
        },
        type: modalType,
        hideClose: true,
      });
      PrimaryModal.show(determinedModalType, modalOptions);
    });
  }

  private showSnoozeModal() {
    // Show the modal with the provided modal type
    const {modalOptions, modalType: determinedModalType} = getModalOptions({
      type: ModalType.SNOOZE_REMINDER,
      hideClose: true,
      extraParams: {
        delayTime: formatDelayTime(getDelayTime(this.config!.gracePeriodInMs)),
      },
    });
    PrimaryModal.show(determinedModalType, modalOptions);
  }

  public async showE2EINotificationMessage(
    modalType: ModalType.CERTIFICATE_RENEWAL | ModalType.ENROLL,
    disableSnooze: boolean = false,
  ): Promise<void> {
    // If the user has already started enrolment, don't show the notification. Instead, show the loading modal
    // This will occur after the redirect from the oauth provider
    if (this.coreE2EIService.isEnrollmentInProgress()) {
      return this.enroll();
    }

    // Early return if we shouldn't show the notification
    if (!this.shouldShowNotification()) {
      return;
    }

    this.initializeEnrollmentTimer();

    // If the timer is not active, show the notification modal
    if (this.config && !this.config.timer.isDelayTimerActive()) {
      return this.showEnrollmentModal(modalType);
    }
  }
}
