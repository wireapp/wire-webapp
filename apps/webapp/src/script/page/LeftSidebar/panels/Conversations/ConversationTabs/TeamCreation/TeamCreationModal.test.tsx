/*
 * Wire
 * Copyright (C) 2024 Wire Swiss GmbH
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

import {render, fireEvent, waitFor} from '@testing-library/react';
import en from 'I18n/en-US.json';
import {withTheme} from 'src/script/auth/util/test/TestUtil';
import {setStrings} from 'Util/LocalizerUtil';

import {TeamCreationModal} from './TeamCreationModal';
import {useTeamCreationModal} from './useTeamCreationModal';

jest.mock('Repositories/team/TeamService');

const testIdentifiers = {
  doContinue: 'do-continue',
  doGoBack: 'do-go-back',
  enterTeamName: 'enter-team-name',
  doAcceptMigration: 'do-accept-migration',
  doAcceptTerms: 'do-accept-terms',
  doCreateTeam: 'do-create-team',
  doClose: 'do-close',
  enterPassword: 'enter-password',
};

describe('TeamCreationModal', () => {
  const onCloseMock = jest.fn();
  const onSuccessMock = jest.fn();
  const userName = 'testUser';
  setStrings({en});

  const renderTeamCreationModal = () => {
    useTeamCreationModal.setState({isModalOpen: true});
    return render(withTheme(<TeamCreationModal onClose={onCloseMock} onSuccess={onSuccessMock} userName={userName} />));
  };

  beforeEach(() => {
    onCloseMock.mockClear();
    onSuccessMock.mockClear();
  });

  const getStepString = (currentStep: number) => `Step ${currentStep} of 4`;

  it('renders the introduction step initially', () => {
    const {getByText} = renderTeamCreationModal();
    expect(getByText(getStepString(1))).toBeTruthy();
  });

  it('navigates to the form step when clicking continue', () => {
    const {getByTestId, getByText} = renderTeamCreationModal();
    fireEvent.click(getByTestId(testIdentifiers.doContinue));
    expect(getByText(getStepString(2))).toBeTruthy();
  });

  it('navigates back to the introduction step', () => {
    const {getByTestId, getByText} = renderTeamCreationModal();

    fireEvent.click(getByTestId(testIdentifiers.doContinue));
    expect(getByText(getStepString(2))).toBeTruthy();

    fireEvent.click(getByTestId(testIdentifiers.doGoBack));
    expect(getByText(getStepString(1))).toBeTruthy();
  });

  it('navigates to confirm page after providing team name', () => {
    const {getByTestId, getByText} = renderTeamCreationModal();

    expect(getByText(getStepString(1))).toBeTruthy();
    fireEvent.click(getByTestId(testIdentifiers.doContinue));

    expect(getByText(getStepString(2))).toBeTruthy();
    fireEvent.change(getByTestId(testIdentifiers.enterTeamName), {target: {value: 'New Team'}});
    fireEvent.click(getByTestId(testIdentifiers.doContinue));

    expect(getByText(getStepString(3))).toBeTruthy();
  });

  it('calls onSuccess when closed from last page (success)', async () => {
    const {getByTestId, getByText} = renderTeamCreationModal();

    expect(getByText(getStepString(1))).toBeTruthy();
    fireEvent.click(getByTestId(testIdentifiers.doContinue));

    expect(getByText(getStepString(2))).toBeTruthy();
    fireEvent.change(getByTestId(testIdentifiers.enterTeamName), {target: {value: 'New Team'}});
    fireEvent.click(getByTestId(testIdentifiers.doContinue));

    expect(getByText(getStepString(3))).toBeTruthy();
    fireEvent.click(getByTestId(testIdentifiers.doAcceptTerms));
    fireEvent.click(getByTestId(testIdentifiers.doAcceptMigration));

    fireEvent.click(getByTestId(testIdentifiers.doCreateTeam));

    await waitFor(() => {
      expect(getByText(getStepString(4))).toBeTruthy();
    });

    fireEvent.click(getByTestId(testIdentifiers.doClose));
    expect(onSuccessMock).toHaveBeenCalled();
  });

  it('calls onClose when closing from any other step', () => {
    const {getByTestId} = renderTeamCreationModal();

    fireEvent.click(getByTestId(testIdentifiers.doClose));
    expect(onCloseMock).toHaveBeenCalled();
  });

  it('disables Continue button for empty or whitespace-only team names', () => {
    const {getByTestId} = renderTeamCreationModal();

    fireEvent.click(getByTestId(testIdentifiers.doContinue));

    const continueButton = getByTestId(testIdentifiers.doContinue);
    const teamNameInput = getByTestId(testIdentifiers.enterTeamName);

    expect(continueButton).toBeDisabled();

    fireEvent.change(teamNameInput, {target: {value: '   '}});
    expect(continueButton).toBeDisabled();

    fireEvent.change(teamNameInput, {target: {value: ''}});
    expect(continueButton).toBeDisabled();

    fireEvent.change(teamNameInput, {target: {value: 'Valid Team'}});
    expect(continueButton).not.toBeDisabled();
  });
});
