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

import {Locator, Page} from '@playwright/test';

export class TeamSignUpPage {
  readonly page: Page;

  readonly emailInput: Locator;
  readonly profileNameInput: Locator;
  readonly teamNameInput: Locator;
  readonly passwordInput: Locator;
  readonly confirmPasswordInput: Locator;
  readonly submitAccountButton: Locator;
  readonly submitEmailButton: Locator;
  readonly currentStep: Locator;
  readonly companySizeDropdown: Locator;
  readonly reasonDropdown: Locator;
  readonly industryDropdown: Locator;
  readonly focusDropdown: Locator;
  readonly roleDropdown: Locator;
  readonly continueButton: Locator;
  readonly inviteEmailInput: Locator;
  readonly goToTeamSettingsButton: Locator;
  readonly termsCheckbox: Locator;
  readonly privacyPolicyCheckbox: Locator;

  constructor(page: Page) {
    this.page = page;
    this.emailInput = page.locator('[data-uie-name="enter-email"]');
    this.profileNameInput = page.locator('[data-uie-name="enter-display-name"]');
    this.teamNameInput = page.locator('[data-uie-name="enter-team-name"]');
    this.passwordInput = page.locator('[data-uie-name="enter-password"]');
    this.confirmPasswordInput = page.locator('[data-uie-name="enter-password-confirmation"]');
    this.submitAccountButton = page.locator('[data-uie-name="do-submit-account"]');
    this.submitEmailButton = page.locator('[data-uie-name="do-submit-email"]');
    this.currentStep = page.locator('[data-uie-name="element-current"]');
    this.companySizeDropdown = page.locator('[data-uie-name="select-company-size"]');
    this.reasonDropdown = page.locator('[data-uie-name="select-reason"]');
    this.industryDropdown = page.locator('[data-uie-name="select-company-industry"]');
    this.focusDropdown = page.locator('[data-uie-name="select-company-focus"]');
    this.roleDropdown = page.locator('[data-uie-name="select-company-role"]');
    this.continueButton = page.locator('button[type="submit"]');
    this.inviteEmailInput = page.locator('[name="email"]');
    this.goToTeamSettingsButton = page.locator('[data-uie-name="do-go-to-team-management"]');
    this.termsCheckbox = page.locator('[data-uie-name="do-accept-terms"]');
    this.privacyPolicyCheckbox = page.locator('[data-uie-name="do-accept-privacy-policy"]');
  }

  async inputEmail(email: string) {
    await this.emailInput.fill(email);
  }

  async inputProfileName(name: string) {
    await this.profileNameInput.fill(name);
  }

  async inputTeamName(name: string) {
    await this.teamNameInput.fill(name);
  }

  async inputPassword(password: string) {
    await this.passwordInput.fill(password);
  }

  async inputConfirmPassword(password: string) {
    await this.confirmPasswordInput.fill(password);
  }

  async clickContinueButton() {
    await this.continueButton.click();
  }

  async isContinueButtonEnabled() {
    return await this.continueButton.isEnabled();
  }

  async getCurrentStep() {
    return (await this.currentStep.textContent()) ?? '';
  }

  async isCurrentStepEquals(value: string) {
    let currentStepValue;
    const intervalBetweenAttempts = 500; // milliseconds
    const timeOut = 10000; // milliseconds
    const maxAttempts = timeOut / intervalBetweenAttempts;
    let attempt = 0;
    while (currentStepValue !== value && attempt < maxAttempts) {
      currentStepValue = await this.currentStep.textContent();
      if (currentStepValue === value) {
        break;
      }
      await new Promise(resolve => setTimeout(resolve, intervalBetweenAttempts));
      attempt++;
    }
    return currentStepValue === value;
  }

  async selectCompanySize(size: string) {
    await this.companySizeDropdown.click();
    const option = this.getCompanySizeOption(size);
    await option.click();
  }

  async selectReason(reason: string) {
    await this.reasonDropdown.click();
    const option = this.getReasonOption(reason);
    await option.click();
  }

  async selectIndustry(industry: string) {
    await this.industryDropdown.click();
    const option = this.getIndustryOption(industry);
    await option.click();
  }

  async selectFocus(focus: string) {
    await this.focusDropdown.click();
    const option = this.getFocusOption(focus);
    await option.click();
  }

  async selectRole(role: string) {
    await this.roleDropdown.click();
    const option = this.getRoleOption(role);
    await option.click();
  }

  async toggleTermsCheckbox() {
    await this.termsCheckbox.dispatchEvent('click');
  }

  async togglePrivacyPolicyCheckbox() {
    await this.privacyPolicyCheckbox.dispatchEvent('click');
  }

  async inputInviteEmail(email: string, index: number = 0) {
    const inviteEmailInputs = await this.inviteEmailInput.all();

    if (inviteEmailInputs.length === 0) {
      throw new Error('No invite email input found.');
    }

    if (index < 0 || index >= inviteEmailInputs.length) {
      throw new Error(`Index ${index} is out of bounds for invite email inputs.`);
    }
    await inviteEmailInputs[index].fill(email);
  }

  async clickGoToTeamSettingsButton() {
    await this.goToTeamSettingsButton.click();
  }

  async isPageHeaderTitleEquals(value: string) {
    const header = this.page.locator(`//h1[text()="${value}"]`);
    return (await header.textContent()) ?? '';
  }

  private getCompanySizeOption(size: string): Locator {
    return this.page.locator(`[data-uie-name="option-select-company-size"][data-uie-value="${size}"]`);
  }

  private getReasonOption(reason: string): Locator {
    return this.page.locator(`[data-uie-name="option-select-reason"][data-uie-value="${reason}"]`);
  }

  private getIndustryOption(industry: string): Locator {
    return this.page.locator(`[data-uie-name="option-select-company-industry"][data-uie-value="${industry}"]`);
  }

  private getFocusOption(focus: string): Locator {
    return this.page.locator(`[data-uie-name="option-select-company-focus"][data-uie-value="${focus}"]`);
  }

  private getRoleOption(role: string): Locator {
    return this.page.locator(`[data-uie-name="option-select-company-role"][data-uie-value="${role}"]`);
  }
}
