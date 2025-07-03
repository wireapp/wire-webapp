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

import {Page} from '@playwright/test';

import {AccountPage} from './account.page';
import {AppLockModal} from './appLock.modal';
import {BlockWarningModal} from './blockWarning.modal';
import {ConversationPage} from './conversation.page';
import {ConversationListPage} from './conversationList.page';
import {ConversationSidebar} from './conversationSidebar.page';
import {DataShareConsentModal} from './dataShareConsent.modal';
import {DeleteAccountModal} from './deleteAccount.modal';
import {DeleteAccountPage} from './deleteAccount.page';
import {EmailVerificationPage} from './emailVerification.page';
import {GroupCreationPage} from './groupCreation.page';
import {LoginPage} from './login.page';
import {MarketingConsentModal} from './marketingConsent.modal';
import {OutgoingConnectionPage} from './outgoingConnection.page';
import {RegisterSuccessPage} from './registerSuccess.page';
import {RegistrationPage} from './registration.page';
import {SetUsernamePage} from './setUsername.page';
import {SingleSignOnPage} from './singleSignOn.page';
import {StartUIPage} from './startUI.page';
import {TeamLoginPage} from './teamLogin.page';
import {TeamsPage} from './teams.page';
import {TeamSignUpPage} from './teamSignUp.page';
import {UserProfileModal} from './userProfile.modal';
import {WelcomePage} from './welcome.page';

const webAppPath = process.env.WEBAPP_URL ?? '';
const teamManagementPath = process.env.TEAM_MANAGEMENT_URL ?? '';

export class PageManager {
  constructor(private readonly page: Page) {}

  static from(page: Page): PageManager {
    return new PageManager(page);
  }

  async openNewTab<T>(url?: string, handler?: (tab: PageManager) => Promise<T>): Promise<T> {
    const newPage = await this.page.context().newPage();
    if (url) {
      await newPage.goto(url);
    }
    const tabManager = new PageManager(newPage);

    try {
      return handler ? await handler(tabManager) : (tabManager as T);
    } finally {
      await newPage.close();
    }
  }

  public openMainPage() {
    return this.page.goto(webAppPath, {
      waitUntil: 'networkidle',
    });
  }

  public openTeamManagementPage() {
    return this.page.goto(teamManagementPath, {
      waitUntil: 'networkidle',
    });
  }

  public refreshPage() {
    return this.page.reload({
      waitUntil: 'networkidle',
    });
  }

  private _singleSignOnPage!: SingleSignOnPage;
  get singleSignOnPage(): SingleSignOnPage {
    if (!this._singleSignOnPage) {
      this._singleSignOnPage = new SingleSignOnPage(this.page);
    }
    return this._singleSignOnPage;
  }

  private _loginPage!: LoginPage;
  get loginPage(): LoginPage {
    if (!this._loginPage) {
      this._loginPage = new LoginPage(this.page);
    }
    return this._loginPage;
  }

  private _dataShareConsentModal!: DataShareConsentModal;
  get dataShareConsentModal(): DataShareConsentModal {
    if (!this._dataShareConsentModal) {
      this._dataShareConsentModal = new DataShareConsentModal(this.page);
    }
    return this._dataShareConsentModal;
  }

  private _conversationSidebar!: ConversationSidebar;
  get conversationSidebar(): ConversationSidebar {
    if (!this._conversationSidebar) {
      this._conversationSidebar = new ConversationSidebar(this.page);
    }
    return this._conversationSidebar;
  }

  private _appLockModal!: AppLockModal;
  get appLockModal(): AppLockModal {
    if (!this._appLockModal) {
      this._appLockModal = new AppLockModal(this.page);
    }
    return this._appLockModal;
  }

  private _conversationListPage!: ConversationListPage;
  get conversationListPage(): ConversationListPage {
    if (!this._conversationListPage) {
      this._conversationListPage = new ConversationListPage(this.page);
    }
    return this._conversationListPage;
  }

  private _accountPage!: AccountPage;
  get accountPage(): AccountPage {
    if (!this._accountPage) {
      this._accountPage = new AccountPage(this.page);
    }
    return this._accountPage;
  }

  private _welcomePage!: WelcomePage;
  get welcomePage(): WelcomePage {
    if (!this._welcomePage) {
      this._welcomePage = new WelcomePage(this.page);
    }
    return this._welcomePage;
  }

  private _registrationPage!: RegistrationPage;
  get registrationPage(): RegistrationPage {
    if (!this._registrationPage) {
      this._registrationPage = new RegistrationPage(this.page);
    }
    return this._registrationPage;
  }

  private _verificationPage!: EmailVerificationPage;
  get verificationPage(): EmailVerificationPage {
    if (!this._verificationPage) {
      this._verificationPage = new EmailVerificationPage(this.page);
    }
    return this._verificationPage;
  }

  private _marketingConsentModal!: MarketingConsentModal;
  get marketingConsentModal(): MarketingConsentModal {
    if (!this._marketingConsentModal) {
      this._marketingConsentModal = new MarketingConsentModal(this.page);
    }
    return this._marketingConsentModal;
  }

  private _setUsernamePage!: SetUsernamePage;
  get setUsernamePage(): SetUsernamePage {
    if (!this._setUsernamePage) {
      this._setUsernamePage = new SetUsernamePage(this.page);
    }
    return this._setUsernamePage;
  }

  private _startUIPage!: StartUIPage;
  get startUIPage(): StartUIPage {
    if (!this._startUIPage) {
      this._startUIPage = new StartUIPage(this.page);
    }
    return this._startUIPage;
  }

  private _userProfileModal!: UserProfileModal;
  get userProfileModal(): UserProfileModal {
    if (!this._userProfileModal) {
      this._userProfileModal = new UserProfileModal(this.page);
    }
    return this._userProfileModal;
  }

  private _outgoingConnectionPage!: OutgoingConnectionPage;
  get outgoingConnectionPage(): OutgoingConnectionPage {
    if (!this._outgoingConnectionPage) {
      this._outgoingConnectionPage = new OutgoingConnectionPage(this.page);
    }
    return this._outgoingConnectionPage;
  }

  private _blockWarningModal!: BlockWarningModal;
  get blockWarningModal(): BlockWarningModal {
    if (!this._blockWarningModal) {
      this._blockWarningModal = new BlockWarningModal(this.page);
    }
    return this._blockWarningModal;
  }

  private _deleteAccountModal!: DeleteAccountModal;
  get deleteAccountModal(): DeleteAccountModal {
    if (!this._deleteAccountModal) {
      this._deleteAccountModal = new DeleteAccountModal(this.page);
    }
    return this._deleteAccountModal;
  }

  private _emailVerificationPage!: EmailVerificationPage;
  get emailVerificationPage(): EmailVerificationPage {
    if (!this._emailVerificationPage) {
      this._emailVerificationPage = new EmailVerificationPage(this.page);
    }
    return this._emailVerificationPage;
  }

  private _conversationPage!: ConversationPage;
  get conversationPage(): ConversationPage {
    if (!this._conversationPage) {
      this._conversationPage = new ConversationPage(this.page);
    }
    return this._conversationPage;
  }

  private _deleteAccountPage!: DeleteAccountPage;
  get deleteAccountPage(): DeleteAccountPage {
    if (!this._deleteAccountPage) {
      this._deleteAccountPage = new DeleteAccountPage(this.page);
    }
    return this._deleteAccountPage;
  }

  private _groupCreationPage!: GroupCreationPage;
  get groupCreationPage(): GroupCreationPage {
    if (!this._groupCreationPage) {
      this._groupCreationPage = new GroupCreationPage(this.page);
    }
    return this._groupCreationPage;
  }

  private _teamLoginPage!: TeamLoginPage;
  get teamLoginPage(): TeamLoginPage {
    if (!this._teamLoginPage) {
      this._teamLoginPage = new TeamLoginPage(this.page);
    }
    return this._teamLoginPage;
  }

  private _teamsPage!: TeamsPage;
  get teamsPage(): TeamsPage {
    if (!this._teamsPage) {
      this._teamsPage = new TeamsPage(this.page);
    }
    return this._teamsPage;
  }

  private _registerSuccessPage!: RegisterSuccessPage;
  get registerSuccessPage(): RegisterSuccessPage {
    if (!this._registerSuccessPage) {
      this._registerSuccessPage = new RegisterSuccessPage(this.page);
    }
    return this._registerSuccessPage;
  }

  private _teamSignUpPage!: TeamSignUpPage;
  get teamSignUpPage(): TeamSignUpPage {
    if (!this._teamSignUpPage) {
      this._teamSignUpPage = new TeamSignUpPage(this.page);
    }
    return this._teamSignUpPage;
  }
}
