/*
 * Wire
 * Copyright (C) 2025 Wire Swiss GmbH
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

import {isUndefined} from '@sindresorhus/is';
import {Page} from '@playwright/test';

import {MarketingConsentModal} from './webapp/modals/marketingConsent.modal';
import {SetUsernamePage} from './webapp/pages/setUsername.page';
import {CellsConversationFilesPage} from './webapp/cells/cellsConversationFiles.page';
import {CellsFileDetailViewModal} from './webapp/cells/cellsFileDetailView.modal';
import {ContactList} from './webapp/components/conversationList.component';
import {ConversationSidebar} from './webapp/components/conversationSidebar.component';
import {InputBarControls} from './webapp/components/inputBarControls.component';
import {AcknowledgeModal} from './webapp/modals/acknowledge.modal';
import {AppLockModal} from './webapp/modals/appLock.modal';
import {ConfirmModal} from './webapp/modals/confirm.modal';
import {ConfirmLogoutModal} from './webapp/modals/confirmLogout.modal';
import {DetailViewModal} from './webapp/modals/detailView.modal';
import {LeaveConversationModal} from './webapp/modals/leaveConversation.modal';
import {OptionModal} from './webapp/modals/option.modal';
import {PasswordModal} from './webapp/modals/password.modal';
import {PasswordAdvancedSecurityModal} from './webapp/modals/passwordAdvancedSecurity.modal';
import {UserProfileModal} from './webapp/modals/userProfile.modal';
import {AccountPage} from './webapp/pages/account.page';
import {AudioVideoSettingsPage} from './webapp/pages/audioVideoSettings.page';
import {CallingPage} from './webapp/pages/calling.page';
import {CollectionPage} from './webapp/pages/collection.page';
import {ConnectRequestPage} from './webapp/pages/connectRequest.page';
import {ConversationPage} from './webapp/pages/conversation.page';
import {ConversationDetailsPage} from './webapp/pages/conversationDetails.page';
import {ConversationListPage} from './webapp/pages/conversationList.page';
import {DeleteAccountPage} from './webapp/pages/deleteAccount.page';
import {DevicesPage} from './webapp/pages/devices.page';
import {EmailVerificationPage} from './webapp/pages/emailVerification.page';
import {FullScreenCallPage} from './webapp/pages/fullScreenCall.page';
import {GroupCreationPage} from './webapp/pages/groupCreation.page';
import {GuestOptionsPage} from './webapp/pages/guestOptions.page';
import {HistoryExportPage} from './webapp/pages/historyExport.page';
import {HistoryImportPage} from './webapp/pages/historyImport.page';
import {HistoryInfoPage} from './webapp/pages/infoHistory.page';
import {LoginPage} from './webapp/pages/login.page';
import {MeetingsPage} from './webapp/pages/meetings.page';
import {MessageDetailsPage} from './webapp/pages/messageDetails.page';
import {OptionsPage} from './webapp/pages/options.page';
import {OutgoingConnectionPage} from './webapp/pages/outgoingConnection.page';
import {ParticipantDetails} from './webapp/pages/participantDetails.page';
import {RegisterSuccessPage} from './webapp/pages/registerSuccess.page';
import {RegistrationPage} from './webapp/pages/registration.page';
import {RequestResetPasswordPage} from './webapp/pages/requestResetPassword.page';
import {ResetPasswordPage} from './webapp/pages/resetPassword.page';
import {SettingsPage} from './webapp/pages/settings.page';
import {SingleSignOnPage} from './webapp/pages/singleSignOn.page';
import {StartUIPage} from './webapp/pages/startUI.page';
import {WelcomePage} from './webapp/pages/welcome.page';
import {GuestLinkPasswordModal} from './webapp/modals/guestLinkPassword.modal';
import {ConversationJoinPage} from './webapp/pages/conversationJoin.page';
import {CreateConversationModal} from './webapp/modals/createConversation';
import {InviteModal} from './webapp/modals/invite.modal';
import {JoinGuestLinkPasswordModal} from './webapp/modals/joinGuestLinkPassword.modal';
import {WithoutTitle} from './webapp/modals/withoutTitle.modal';
import {AboutPage} from './webapp/pages/about.page';
import {DeviceDetailsPage} from './webapp/pages/deviceDetails.page';
import {ParticipantDeviceDetailsPage} from './webapp/pages/participantDeviceDetail.page';
import {ParticipantDevicesPage} from './webapp/pages/participantDevices.page';
import {NewDeviceModal} from './webapp/modals/newDevice.modal';
import {ReadReceiptModal} from './webapp/modals/readReceipt.modal';

import {
  applyStartupFeatureToggleOverridesToUrl,
  StartupFeatureToggleOverrides,
} from '../utils/startupFeatureToggleOverrides';

export const webAppPath = process.env.WEBAPP_URL ?? '';

export type WebAppNavigationOptions = {
  readonly baseUrl?: string;
  readonly startupFeatureToggles?: StartupFeatureToggleOverrides;
};

export class PageManager {
  private readonly cache = new Map<string, any>();

  constructor(public readonly page: Page) {}

  static from(page: Page): PageManager;
  static from(page: Promise<Page>): Promise<PageManager>;
  static from(page: Page | Promise<Page>): PageManager | Promise<PageManager> {
    return 'then' in page
      ? page.then(p => {
          return new PageManager(p);
        })
      : new PageManager(page);
  }

  openNewTab = async <T>(url?: string, handler?: (tab: PageManager) => Promise<T>): Promise<T> => {
    const newPage = await this.page.context().newPage();
    if (url) {
      await newPage.goto(url, {waitUntil: 'networkidle'});
    }
    const tabManager = new PageManager(newPage);
    try {
      return handler ? await handler(tabManager) : (tabManager as T);
    } finally {
      await newPage.close();
    }
  };

  private createNavigationUrl(path: string, options: WebAppNavigationOptions): string {
    const {baseUrl = webAppPath, startupFeatureToggles = {}} = options;
    const navigationUrl = new URL(path, baseUrl);
    return applyStartupFeatureToggleOverridesToUrl(navigationUrl, startupFeatureToggles).toString();
  }

  openMainPage = (options: WebAppNavigationOptions = {}) => {
    return this.page.goto(this.createNavigationUrl('/', options), {waitUntil: 'networkidle'});
  };

  openLoginPage = async (options: WebAppNavigationOptions = {}) => {
    await this.page.goto(this.createNavigationUrl('/auth/#/login', options));
  };

  openRegistrationPage = async (options: WebAppNavigationOptions = {}) => {
    await this.page.goto(this.createNavigationUrl('/auth/#/createaccount', options));
  };

  openSSOPage = async (options: WebAppNavigationOptions = {}) => {
    await this.page.goto(this.createNavigationUrl('/auth/#/sso', options), {waitUntil: 'commit', timeout: 120_000});
  };

  openUrl = (url: string) => {
    return this.page.goto(url, {waitUntil: 'networkidle'});
  };

  refreshPage = (options: {waitUntil?: 'load' | 'domcontentloaded' | 'networkidle'} = {waitUntil: 'networkidle'}) => {
    return this.page.reload(options);
  };

  waitForTimeout = (timeout: number) => {
    return this.page.waitForTimeout(timeout);
  };

  getContext = () => {
    return this.page.context();
  };

  waitForRequest = (url: string) => {
    return this.page.waitForRequest(url);
  };

  // Helper method to get or create a page or modal instance
  // This method uses a cache to avoid creating multiple instances of the same page/modal
  private getOrCreate<T>(key: string, factory: () => T): T {
    if (!this.cache.has(key)) {
      this.cache.set(key, factory());
    }
    const cachedPage = this.cache.get(key);
    if (isUndefined(cachedPage)) {
      throw new Error(`Page manager cache did not contain ${key}`);
    }

    return cachedPage;
  }

  // ───────────── WEBAPP ─────────────
  public webapp = {
    pages: {
      login: () => {
        return this.getOrCreate('webapp.pages.login', () => {
          return new LoginPage(this.page);
        });
      },
      singleSignOn: () => {
        return this.getOrCreate('webapp.pages.singleSignOn', () => {
          return new SingleSignOnPage(this.page);
        });
      },
      welcome: () => {
        return this.getOrCreate('webapp.pages.welcome', () => {
          return new WelcomePage(this.page);
        });
      },
      registration: () => {
        return this.getOrCreate('webapp.pages.registration', () => {
          return new RegistrationPage(this.page);
        });
      },
      sidebar: () => {
        return this.getOrCreate('webapp.pages.sidebar', () => {
          return new ConversationSidebar(this.page);
        });
      },
      startUI: () => {
        return this.getOrCreate('webapp.pages.startUI', () => {
          return new StartUIPage(this.page);
        });
      },
      account: () => {
        return this.getOrCreate('webapp.pages.account', () => {
          return new AccountPage(this.page);
        });
      },
      conversationList: () => {
        return this.getOrCreate('webapp.pages.conversationList', () => {
          return new ConversationListPage(this.page);
        });
      },
      conversationDetails: () => {
        return this.getOrCreate('webapp.pages.conversationDetails', () => {
          return new ConversationDetailsPage(this.page);
        });
      },
      conversation: () => {
        return this.getOrCreate('webapp.pages.conversation', () => {
          return new ConversationPage(this.page);
        });
      },
      collection: () => {
        return this.getOrCreate('webapp.pages.collection', () => {
          return new CollectionPage(this.page);
        });
      },
      cellsConversationFiles: () => {
        return this.getOrCreate('webapp.pages.cellsConversationFiles', () => {
          return new CellsConversationFilesPage(this.page);
        });
      },
      connectRequest: () => {
        return this.getOrCreate('webapp.pages.connectRequest', () => {
          return new ConnectRequestPage(this.page);
        });
      },
      calling: () => {
        return this.getOrCreate('webapp.pages.calling', () => {
          return new CallingPage(this.page);
        });
      },
      fullScreenCall: () => {
        return this.getOrCreate('webapp.pages.fullScreenCall', () => {
          return FullScreenCallPage(this.page);
        });
      },
      settings: () => {
        return this.getOrCreate('webapp.pages.settings', () => {
          return new SettingsPage(this.page);
        });
      },
      devices: () => {
        return this.getOrCreate('webapp.pages.devices', () => {
          return new DevicesPage(this.page);
        });
      },
      deviceDetails: () => {
        return this.getOrCreate('webapp.pages.deviceDetails', () => {
          return DeviceDetailsPage(this.page);
        });
      },
      participantDevices: () => {
        return this.getOrCreate('webapp.pages.participantDevices', () => {
          return ParticipantDevicesPage(this.page);
        });
      },
      participantDeviceDetails: () => {
        return this.getOrCreate('webapp.pages.participantDeviceDetails', () => {
          return ParticipantDeviceDetailsPage(this.page);
        });
      },
      options: () => {
        return this.getOrCreate('webapp.pages.options', () => {
          return new OptionsPage(this.page);
        });
      },
      audioVideoSettings: () => {
        return this.getOrCreate('webapp.pages.audioVideoSettings', () => {
          return new AudioVideoSettingsPage(this.page);
        });
      },
      about: () => {
        return this.getOrCreate('webapp.pages.about', () => {
          return new AboutPage(this.page);
        });
      },
      outgoingConnection: () => {
        return this.getOrCreate('webapp.pages.outgoingConnection', () => {
          return new OutgoingConnectionPage(this.page);
        });
      },
      guestOptions: () => {
        return this.getOrCreate('webapp.pages.guestOptions', () => {
          return GuestOptionsPage(this.page);
        });
      },
      deleteAccount: () => {
        return this.getOrCreate('webapp.pages.deleteAccount', () => {
          return new DeleteAccountPage(this.page);
        });
      },
      groupCreation: () => {
        return this.getOrCreate('webapp.pages.groupCreation', () => {
          return new GroupCreationPage(this.page);
        });
      },
      historyInfo: () => {
        return this.getOrCreate('webapp.pages.infoHostory', () => {
          return new HistoryInfoPage(this.page);
        });
      },
      historyExport: () => {
        return this.getOrCreate('webapp.pages.historyExport', () => {
          return new HistoryExportPage(this.page);
        });
      },
      historyImport: () => {
        return this.getOrCreate('webapp.pages.historyImport', () => {
          return new HistoryImportPage(this.page);
        });
      },
      meetings: () => {
        return this.getOrCreate('webapp.pages.meetings', () => {
          return new MeetingsPage(this.page);
        });
      },
      messageDetails: () => {
        return this.getOrCreate('webapp.pages.messageDetails', () => {
          return new MessageDetailsPage(this.page);
        });
      },
      participantDetails: () => {
        return this.getOrCreate('webapp.pages.participantsDetails', () => {
          return new ParticipantDetails(this.page);
        });
      },
      requestResetPassword: () => {
        return this.getOrCreate('webapp.pages.requestResetPassword', () => {
          return new RequestResetPasswordPage(this.page);
        });
      },
      resetPassword: () => {
        return this.getOrCreate('webapp.pages.resetPassword', () => {
          return new ResetPasswordPage(this.page);
        });
      },
      registerSuccess: () => {
        return this.getOrCreate('webapp.pages.registerSuccess', () => {
          return new RegisterSuccessPage(this.page);
        });
      },
      emailVerification: () => {
        return this.getOrCreate('webapp.pages.verification', () => {
          return new EmailVerificationPage(this.page);
        });
      },
      setUsername: () => {
        return this.getOrCreate('webapp.pages.setUsername', () => {
          return new SetUsernamePage(this.page);
        });
      },
      conversationJoin: () => {
        return this.getOrCreate('webapp.pages.conversationJoin', () => {
          return ConversationJoinPage(this.page);
        });
      },
    },
    modals: {
      appLock: () => {
        return this.getOrCreate('webapp.modals.appLock', () => {
          return new AppLockModal(this.page);
        });
      },
      userProfile: () => {
        return this.getOrCreate('webapp.modals.userProfile', () => {
          return new UserProfileModal(this.page);
        });
      },
      confirmLogout: () => {
        return this.getOrCreate('webapp.modals.confirmLogout', () => {
          return new ConfirmLogoutModal(this.page);
        });
      },
      leaveConversation: () => {
        return this.getOrCreate('webapp.modals.leaveConversation', () => {
          return new LeaveConversationModal(this.page);
        });
      },
      passwordAdvancedSecurity: () => {
        return this.getOrCreate('webapp.modals.passwordAdvancedSecurity', () => {
          return new PasswordAdvancedSecurityModal(this.page);
        });
      },
      detailViewModal: () => {
        return this.getOrCreate('webapp.modals.detailView', () => {
          return new DetailViewModal(this.page);
        });
      },
      marketingConsent: () => {
        return this.getOrCreate('webapp.modals.marketingConsent', () => {
          return new MarketingConsentModal(this.page);
        });
      },
      acknowledge: () => {
        return this.getOrCreate('webapp.modals.marketingConsent', () => {
          return new AcknowledgeModal(this.page);
        });
      },
      confirm: () => {
        return this.getOrCreate('webapp.modals.confirm', () => {
          return new ConfirmModal(this.page);
        });
      },
      password: () => {
        return this.getOrCreate('webapp.modals.password', () => {
          return new PasswordModal(this.page);
        });
      },
      cellsFileDetailView: () => {
        return this.getOrCreate('webapp.modals.cellsFileDetailView', () => {
          return new CellsFileDetailViewModal(this.page);
        });
      },
      optionModal: () => {
        return this.getOrCreate('webapp.modals.optionModal', () => {
          return new OptionModal(this.page);
        });
      },
      guestLinkPassword: () => {
        return this.getOrCreate('webapp.modals.guestLinkPassword', () => {
          return new GuestLinkPasswordModal(this.page);
        });
      },
      joinGuestLinkPassword: () => {
        return this.getOrCreate('webapp.modals.joinGuestLinkPassword', () => {
          return new JoinGuestLinkPasswordModal(this.page);
        });
      },
      createConversation: () => {
        return this.getOrCreate('webapp.modals.createConversation', () => {
          return CreateConversationModal(this.page);
        });
      },
      invite: () => {
        return this.getOrCreate('webapp.modals.invite', () => {
          return InviteModal(this.page);
        });
      },
      withoutTitle: () => {
        return this.getOrCreate('webapp.modals.withoutTitle', () => {
          return new WithoutTitle(this.page);
        });
      },
      newDevice: () => {
        return this.getOrCreate('webapp.modals.newDevice', () => {
          return new NewDeviceModal(this.page);
        });
      },
      readReceipt: () => {
        return this.getOrCreate('webapp.modals.readReceipt', () => {
          return new ReadReceiptModal(this.page);
        });
      },
    },
    components: {
      contactList: () => {
        return this.getOrCreate('webapp.components.ContactList', () => {
          return new ContactList(this.page);
        });
      },
      conversationSidebar: () => {
        return this.getOrCreate('webapp.components.conversationSidebar', () => {
          return new ConversationSidebar(this.page);
        });
      },
      inputBarControls: () => {
        return this.getOrCreate('webapp.components.inputBarControls', () => {
          return new InputBarControls(this.page);
        });
      },
      calling: () => {
        return this.getOrCreate('webapp.components.calling', () => {
          return new CallingPage(this.page);
        });
      },
    },
  } as const;
}
