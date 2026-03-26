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

import assert from 'node:assert';
import {ReactElement} from 'react';

import {render} from '@testing-library/react';

import {usePrimaryModalState} from 'Components/Modals/PrimaryModal';
import {createDeterministicWallClock, DeterministicWallClock} from 'src/script/clock/deterministicWallClock';
import {MainViewModel} from 'src/script/view_model/MainViewModel';
import {t} from 'Util/localizerUtil';
import {TIME_IN_MILLIS} from 'Util/timeUtil';

import {RootProvider} from '../../RootProvider';
import {ForceReloadModal} from './ForceReloadModal';

interface ForceReloadModalTestContextValue {
  readonly doesApplicationNeedForceReload: boolean;
  readonly reloadApplication: () => void;
  readonly wallClock?: DeterministicWallClock;
}

function isFeatureToggleDisabledForTest(): boolean {
  return false;
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
  const {
    doesApplicationNeedForceReload,
    reloadApplication,
    wallClock = createDeterministicWallClock({initialCurrentTimestampInMilliseconds: 1_111}),
  } = contextValue;

  return (
    <RootProvider
      value={{
        doesApplicationNeedForceReload,
        isFeatureToggleEnabled: isFeatureToggleDisabledForTest,
        mainViewModel: createMainViewModelForTest(),
        wallClock,
      }}
    >
      <ForceReloadModal reloadApplication={reloadApplication} />
    </RootProvider>
  );
}

const forceReloadDelayInMilliseconds = TIME_IN_MILLIS.SECOND * 60;

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
    const deterministicWallClock = createDeterministicWallClock({initialCurrentTimestampInMilliseconds: 0});
    const reloadApplication = jest.fn();
    const {rerender} = render(
      createForceReloadModalTestElement({
        doesApplicationNeedForceReload: false,
        reloadApplication,
        wallClock: deterministicWallClock,
      }),
    );

    rerender(
      createForceReloadModalTestElement({
        doesApplicationNeedForceReload: true,
        reloadApplication,
        wallClock: deterministicWallClock,
      }),
    );

    expect(usePrimaryModalState.getState().currentModalId).not.toBeNull();
    expect(usePrimaryModalState.getState().queue).toHaveLength(0);
  });

  it('does not open the modal repeatedly while force reload remains required', () => {
    const deterministicWallClock = createDeterministicWallClock({initialCurrentTimestampInMilliseconds: 0});
    const reloadApplication = jest.fn();
    const {rerender} = render(
      createForceReloadModalTestElement({
        doesApplicationNeedForceReload: true,
        reloadApplication,
        wallClock: deterministicWallClock,
      }),
    );

    rerender(
      createForceReloadModalTestElement({
        doesApplicationNeedForceReload: true,
        reloadApplication,
        wallClock: deterministicWallClock,
      }),
    );
    rerender(
      createForceReloadModalTestElement({
        doesApplicationNeedForceReload: true,
        reloadApplication,
        wallClock: deterministicWallClock,
      }),
    );

    expect(usePrimaryModalState.getState().queue).toHaveLength(0);
  });

  it('opens the modal again after force reload status returns to false and then true', () => {
    const deterministicWallClock = createDeterministicWallClock({initialCurrentTimestampInMilliseconds: 0});
    const reloadApplication = jest.fn();
    const {rerender} = render(
      createForceReloadModalTestElement({
        doesApplicationNeedForceReload: false,
        reloadApplication,
        wallClock: deterministicWallClock,
      }),
    );

    rerender(
      createForceReloadModalTestElement({
        doesApplicationNeedForceReload: true,
        reloadApplication,
        wallClock: deterministicWallClock,
      }),
    );
    rerender(
      createForceReloadModalTestElement({
        doesApplicationNeedForceReload: false,
        reloadApplication,
        wallClock: deterministicWallClock,
      }),
    );
    rerender(
      createForceReloadModalTestElement({
        doesApplicationNeedForceReload: true,
        reloadApplication,
        wallClock: deterministicWallClock,
      }),
    );

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

    assert(currentModalContent.primaryAction?.action);
    currentModalContent.primaryAction.action();

    expect(reloadApplication).toHaveBeenCalledTimes(1);
  });

  it('reloads automatically after 60 seconds when no user action is performed', () => {
    const deterministicWallClock = createDeterministicWallClock({initialCurrentTimestampInMilliseconds: 0});
    const reloadApplication = jest.fn();

    render(
      createForceReloadModalTestElement({
        doesApplicationNeedForceReload: true,
        reloadApplication,
        wallClock: deterministicWallClock,
      }),
    );

    deterministicWallClock.advanceByMilliseconds(forceReloadDelayInMilliseconds - 1);
    expect(reloadApplication).not.toHaveBeenCalled();

    deterministicWallClock.advanceByMilliseconds(1);
    expect(reloadApplication).toHaveBeenCalledTimes(1);

    deterministicWallClock.advanceByMilliseconds(forceReloadDelayInMilliseconds);
    expect(reloadApplication).toHaveBeenCalledTimes(1);
  });

  it('cancels automatic reload if force reload requirement is removed before timeout', () => {
    const deterministicWallClock = createDeterministicWallClock({initialCurrentTimestampInMilliseconds: 0});
    const reloadApplication = jest.fn();
    const {rerender} = render(
      createForceReloadModalTestElement({
        doesApplicationNeedForceReload: false,
        reloadApplication,
        wallClock: deterministicWallClock,
      }),
    );

    rerender(
      createForceReloadModalTestElement({
        doesApplicationNeedForceReload: true,
        reloadApplication,
        wallClock: deterministicWallClock,
      }),
    );
    rerender(
      createForceReloadModalTestElement({
        doesApplicationNeedForceReload: false,
        reloadApplication,
        wallClock: deterministicWallClock,
      }),
    );

    deterministicWallClock.advanceByMilliseconds(forceReloadDelayInMilliseconds);

    expect(reloadApplication).not.toHaveBeenCalled();
  });

  it('does not trigger reload twice if the user clicks reload before timeout', () => {
    const deterministicWallClock = createDeterministicWallClock({initialCurrentTimestampInMilliseconds: 0});
    const reloadApplication = jest.fn();

    render(
      createForceReloadModalTestElement({
        doesApplicationNeedForceReload: true,
        reloadApplication,
        wallClock: deterministicWallClock,
      }),
    );

    const {currentModalContent} = usePrimaryModalState.getState();

    assert(currentModalContent.primaryAction?.action);
    currentModalContent.primaryAction.action();
    deterministicWallClock.advanceByMilliseconds(forceReloadDelayInMilliseconds);

    expect(reloadApplication).toHaveBeenCalledTimes(1);
  });
});
