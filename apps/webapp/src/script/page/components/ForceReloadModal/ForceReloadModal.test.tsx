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

import {ReactElement} from 'react';

import {render} from '@testing-library/react';

import {usePrimaryModalState} from 'Components/Modals/PrimaryModal';
import {createFakeWallClock} from 'src/script/clock/fakeWallClock';
import {MainViewModel} from 'src/script/view_model/MainViewModel';
import {t} from 'Util/LocalizerUtil';

import {RootProvider} from '../../RootProvider';
import {ForceReloadModal} from './ForceReloadModal';

interface ForceReloadModalTestContextValue {
  readonly doesApplicationNeedForceReload: boolean;
  readonly reloadApplication: () => void;
}

function createMainViewModelForTest(): MainViewModel {
  return {} as MainViewModel;
}

function resetPrimaryModalState(): void {
  usePrimaryModalState.setState({
    currentModalContent: {
      checkboxLabel: '',
      closeFn: () => undefined,
      currentType: '',
      inputPlaceholder: '',
      message: '',
      modalUie: '',
      onBgClick: () => undefined,
      primaryAction: null,
      secondaryAction: null,
      titleText: '',
    },
    currentModalId: null,
    errorMessage: null,
    queue: [],
  });
}

function createForceReloadModalTestElement(
  contextValue: ForceReloadModalTestContextValue,
): ReactElement {
  const {doesApplicationNeedForceReload, reloadApplication} = contextValue;

  return (
    <RootProvider
      value={{
        doesApplicationNeedForceReload,
        mainViewModel: createMainViewModelForTest(),
        wallClock: createFakeWallClock({initialCurrentTimestampInMilliseconds: 1_111}),
      }}
    >
      <ForceReloadModal reloadApplication={reloadApplication} />
    </RootProvider>
  );
}

describe('ForceReloadModal', () => {
  beforeEach(() => {
    resetPrimaryModalState();
  });

  it('does not open the modal while force reload is not required', () => {
    render(createForceReloadModalTestElement({doesApplicationNeedForceReload: false, reloadApplication: jest.fn()}));

    expect(usePrimaryModalState.getState().currentModalId).toBeNull();
    expect(usePrimaryModalState.getState().queue).toHaveLength(0);
  });

  it('opens the modal when force reload becomes required', () => {
    const reloadApplication = jest.fn();
    const {rerender} = render(createForceReloadModalTestElement({doesApplicationNeedForceReload: false, reloadApplication}));

    rerender(createForceReloadModalTestElement({doesApplicationNeedForceReload: true, reloadApplication}));

    expect(usePrimaryModalState.getState().currentModalId).not.toBeNull();
    expect(usePrimaryModalState.getState().queue).toHaveLength(0);
  });

  it('does not open the modal repeatedly while force reload remains required', () => {
    const reloadApplication = jest.fn();
    const {rerender} = render(createForceReloadModalTestElement({doesApplicationNeedForceReload: true, reloadApplication}));

    rerender(createForceReloadModalTestElement({doesApplicationNeedForceReload: true, reloadApplication}));
    rerender(createForceReloadModalTestElement({doesApplicationNeedForceReload: true, reloadApplication}));

    expect(usePrimaryModalState.getState().queue).toHaveLength(0);
  });

  it('opens the modal again after force reload status returns to false and then true', () => {
    const reloadApplication = jest.fn();
    const {rerender} = render(createForceReloadModalTestElement({doesApplicationNeedForceReload: false, reloadApplication}));

    rerender(createForceReloadModalTestElement({doesApplicationNeedForceReload: true, reloadApplication}));
    rerender(createForceReloadModalTestElement({doesApplicationNeedForceReload: false, reloadApplication}));
    rerender(createForceReloadModalTestElement({doesApplicationNeedForceReload: true, reloadApplication}));

    expect(usePrimaryModalState.getState().currentModalId).not.toBeNull();
    expect(usePrimaryModalState.getState().queue).toHaveLength(1);
  });

  it('configures a hard-blocking modal and wires the reload action', () => {
    const reloadApplication = jest.fn();

    render(createForceReloadModalTestElement({doesApplicationNeedForceReload: true, reloadApplication}));

    const {currentModalContent, currentModalId} = usePrimaryModalState.getState();
    const currentModalIdentifierBeforeBackgroundClick = currentModalId;

    expect(currentModalContent.hideCloseBtn).toBe(true);
    expect(currentModalContent.messageHtml).toBe(t('forceReloadModalMessage'));
    expect(currentModalContent.primaryAction?.text).toBe(t('forceReloadModalAction'));
    expect(currentModalContent.titleText).toBe(t('forceReloadModalTitle'));

    currentModalContent.onBgClick();
    expect(usePrimaryModalState.getState().currentModalId).toBe(currentModalIdentifierBeforeBackgroundClick);

    if (!currentModalContent.primaryAction?.action) {
      throw new Error('Primary reload action is missing');
    }

    currentModalContent.primaryAction.action();

    expect(reloadApplication).toHaveBeenCalledTimes(1);
  });
});
