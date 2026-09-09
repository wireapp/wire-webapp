/*
 * Wire
 * Copyright (C) 2022 Wire Swiss GmbH
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

import {act, cleanup, fireEvent, render} from '@testing-library/react';

import en from 'I18n/en-US.json';
import {reactTranslationRenderingFeatureToggleName} from 'src/script/featureToggles/startupFeatureToggleNames';
import {setStrings, translate} from 'Util/localizerUtil';
import {translateForTest} from 'Util/test/translateForTest';
import {
  createRootContextValueForTest,
  createRootProviderWrapperForTest,
} from 'src/script/page/testSupport/rootContextTestSupport';

import {WarningsContainer} from './WarningsContainer';
import {useWarningsState} from './WarningsState';

import {Warnings} from '.';

const rootProviderWrapper = createRootProviderWrapperForTest(
  createRootContextValueForTest({translate: translateForTest}),
);
const legacyTranslationRootProviderWrapper = createRootProviderWrapperForTest(
  createRootContextValueForTest({translate}),
);
const reactTranslationRenderingRootProviderWrapper = createRootProviderWrapperForTest(
  createRootContextValueForTest({
    isFeatureToggleEnabled(featureName) {
      return featureName === reactTranslationRenderingFeatureToggleName;
    },
    translate,
  }),
);

type TranslationTestFunction = () => void | Promise<void>;
type IsolatedTranslationTestFunction = () => Promise<void>;

function withTranslationStrings(
  strings: typeof en,
  testFunction: TranslationTestFunction,
): IsolatedTranslationTestFunction {
  return async function runTranslationTest(): Promise<void> {
    setStrings({en: strings});

    try {
      await testFunction();
    } finally {
      setStrings({en});
    }
  };
}

describe('WarningsContainer', () => {
  beforeEach(() => {
    useWarningsState.setState({name: '', warnings: []});
  });

  afterEach(() => {
    cleanup();
    act(() => {
      useWarningsState.setState({name: '', warnings: []});
    });
    jest.restoreAllMocks();
  });

  it('does not render when no warning is in the queue', async () => {
    const {container} = render(<WarningsContainer onRefresh={jest.fn()} />, {wrapper: rootProviderWrapper});

    expect(container.firstChild).toBeFalsy();
  });

  it('correctly renders warning of type request_camera', async () => {
    const {getByTestId} = render(<WarningsContainer onRefresh={jest.fn()} />, {wrapper: rootProviderWrapper});
    act(() => {
      Warnings.showWarning(Warnings.TYPE.REQUEST_CAMERA);
    });
    const WarningElement = getByTestId('request-camera');
    expect(WarningElement).toBeTruthy();
  });

  it('correctly renders warning of type denied_camera', () => {
    const {getByTestId} = render(<WarningsContainer onRefresh={jest.fn()} />, {wrapper: rootProviderWrapper});
    act(() => {
      Warnings.showWarning(Warnings.TYPE.DENIED_CAMERA);
    });
    const WarningElement = getByTestId('denied-camera');
    expect(WarningElement).toBeTruthy();
  });

  it('correctly renders warning of type request_microphone', () => {
    const {getByTestId} = render(<WarningsContainer onRefresh={jest.fn()} />, {wrapper: rootProviderWrapper});
    act(() => {
      Warnings.showWarning(Warnings.TYPE.REQUEST_MICROPHONE);
    });
    const WarningElement = getByTestId('request-microphone');
    expect(WarningElement).toBeTruthy();
  });

  it('correctly renders warning of type denied_microphone', () => {
    const {getByTestId} = render(<WarningsContainer onRefresh={jest.fn()} />, {wrapper: rootProviderWrapper});
    act(() => {
      Warnings.showWarning(Warnings.TYPE.DENIED_MICROPHONE);
    });
    const WarningElement = getByTestId('denied-microphone');
    expect(WarningElement).toBeTruthy();
  });

  it('correctly renders warning of type request_screen', () => {
    const {getByTestId} = render(<WarningsContainer onRefresh={jest.fn()} />, {wrapper: rootProviderWrapper});
    act(() => {
      Warnings.showWarning(Warnings.TYPE.REQUEST_SCREEN);
    });
    const WarningElement = getByTestId('request-screen');
    expect(WarningElement).toBeTruthy();
  });

  it('correctly renders warning of type denied_screen', () => {
    const {getByTestId} = render(<WarningsContainer onRefresh={jest.fn()} />, {wrapper: rootProviderWrapper});
    act(() => {
      Warnings.showWarning(Warnings.TYPE.DENIED_SCREEN);
    });
    const WarningElement = getByTestId('denied-screen');
    expect(WarningElement).toBeTruthy();
  });

  it('correctly renders warning of type not_found_camera', () => {
    const {getByTestId} = render(<WarningsContainer onRefresh={jest.fn()} />, {wrapper: rootProviderWrapper});
    act(() => {
      Warnings.showWarning(Warnings.TYPE.NOT_FOUND_CAMERA);
    });
    const WarningElement = getByTestId('not-found-camera');
    expect(WarningElement).toBeTruthy();
  });

  it('correctly renders warning of type not_found_microphone', () => {
    const {getByTestId} = render(<WarningsContainer onRefresh={jest.fn()} />, {wrapper: rootProviderWrapper});
    act(() => {
      Warnings.showWarning(Warnings.TYPE.NOT_FOUND_MICROPHONE);
    });
    const WarningElement = getByTestId('not-found-microphone');
    expect(WarningElement).toBeTruthy();
  });

  it('correctly renders warning of type request_notification', () => {
    const {getByTestId} = render(<WarningsContainer onRefresh={jest.fn()} />, {wrapper: rootProviderWrapper});
    act(() => {
      Warnings.showWarning(Warnings.TYPE.REQUEST_NOTIFICATION);
    });
    const WarningElement = getByTestId('request-notification');
    expect(WarningElement).toBeTruthy();
  });

  it(
    'keeps legacy permission request rendering when React translation rendering is disabled',
    withTranslationStrings(en, () => {
      const {container} = render(<WarningsContainer onRefresh={jest.fn()} />, {
        wrapper: legacyTranslationRootProviderWrapper,
      });
      act(() => {
        Warnings.showWarning(Warnings.TYPE.REQUEST_CAMERA);
      });

      expect(container.querySelector('.warning-bar-message')).toHaveTextContent('Allow access to camera');
      expect(container.querySelector('.icon-camera')).toBeTruthy();
    }),
  );

  it(
    'renders the camera permission request icon as a React node',
    withTranslationStrings(en, () => {
      const {container} = render(<WarningsContainer onRefresh={jest.fn()} />, {
        wrapper: reactTranslationRenderingRootProviderWrapper,
      });
      act(() => {
        Warnings.showWarning(Warnings.TYPE.REQUEST_CAMERA);
      });

      expect(container.querySelector('.warning-bar-message')).toHaveTextContent('Allow access to camera');
      expect(container.querySelector('.icon-camera')).toBeTruthy();
    }),
  );

  it(
    'renders exactly one microphone permission request icon as a React node',
    withTranslationStrings(en, () => {
      const {container} = render(<WarningsContainer onRefresh={jest.fn()} />, {
        wrapper: reactTranslationRenderingRootProviderWrapper,
      });
      act(() => {
        Warnings.showWarning(Warnings.TYPE.REQUEST_MICROPHONE);
      });

      expect(container.querySelector('.warning-bar-message')).toHaveTextContent('Allow access to microphone');
      expect(container.querySelectorAll('.warning-bar-icon')).toHaveLength(1);
    }),
  );

  it(
    'renders the screen and notification permission request icons as React nodes',
    withTranslationStrings(en, () => {
      const {container: screenContainer} = render(<WarningsContainer onRefresh={jest.fn()} />, {
        wrapper: reactTranslationRenderingRootProviderWrapper,
      });
      act(() => {
        Warnings.showWarning(Warnings.TYPE.REQUEST_SCREEN);
      });

      expect(screenContainer.querySelector('.warning-bar-message')).toHaveTextContent('Allow access to screen');
      expect(screenContainer.querySelector('.icon-screensharing')).toBeTruthy();

      cleanup();
      act(() => {
        Warnings.hideWarning();
      });

      const {container: notificationContainer} = render(<WarningsContainer onRefresh={jest.fn()} />, {
        wrapper: reactTranslationRenderingRootProviderWrapper,
      });
      act(() => {
        Warnings.showWarning(Warnings.TYPE.REQUEST_NOTIFICATION);
      });

      expect(notificationContainer.querySelector('.warning-bar-message')).toHaveTextContent('Allow notifications');
      expect(notificationContainer.querySelector('.icon-envelope')).toBeTruthy();
    }),
  );

  it(
    'follows a translated permission icon marker moved after the text',
    withTranslationStrings(
      {
        ...en,
        warningPermissionRequestCamera: 'Allow access to camera [icon]',
      },
      () => {
        const {container} = render(<WarningsContainer onRefresh={jest.fn()} />, {
          wrapper: reactTranslationRenderingRootProviderWrapper,
        });
        act(() => {
          Warnings.showWarning(Warnings.TYPE.REQUEST_CAMERA);
        });

        const warningMessage = container.querySelector('.warning-bar-message');
        expect(warningMessage).toHaveTextContent('Allow access to camera');
        expect(warningMessage?.querySelector('.icon-camera')).toBeTruthy();
      },
    ),
  );

  it(
    'keeps unsupported permission translation markup as text',
    withTranslationStrings(
      {
        ...en,
        warningPermissionRequestCamera: '<img src="example">[icon] Allow access to camera',
      },
      () => {
        const {container} = render(<WarningsContainer onRefresh={jest.fn()} />, {
          wrapper: reactTranslationRenderingRootProviderWrapper,
        });
        act(() => {
          Warnings.showWarning(Warnings.TYPE.REQUEST_CAMERA);
        });

        const warningMessage = container.querySelector('.warning-bar-message');
        expect(warningMessage).toHaveTextContent('<img src="example"> Allow access to camera');
        expect(warningMessage?.querySelector('img')).toBeNull();
        expect(warningMessage?.querySelector('.icon-camera')).toBeTruthy();
      },
    ),
  );

  it('correctly renders warning of type unsupported_incoming_call', () => {
    const {getByTestId} = render(<WarningsContainer onRefresh={jest.fn()} />, {wrapper: rootProviderWrapper});
    act(() => {
      Warnings.showWarning(Warnings.TYPE.UNSUPPORTED_INCOMING_CALL);
    });
    const WarningElement = getByTestId('unsupported-incoming-call');
    expect(WarningElement).toBeTruthy();
  });

  it('correctly renders warning of type unsupported_outgoing_call', () => {
    const {getByTestId} = render(<WarningsContainer onRefresh={jest.fn()} />, {wrapper: rootProviderWrapper});
    act(() => {
      Warnings.showWarning(Warnings.TYPE.UNSUPPORTED_OUTGOING_CALL);
    });
    const WarningElement = getByTestId('unsupported-outgoing-call');
    expect(WarningElement).toBeTruthy();
  });

  it('correctly renders warning of type connectivity_reconnect', () => {
    const {getByTestId} = render(<WarningsContainer onRefresh={jest.fn()} />, {wrapper: rootProviderWrapper});
    act(() => {
      Warnings.showWarning(Warnings.TYPE.CONNECTIVITY_RECONNECT);
    });
    expect(getByTestId('connectivity-reconnect')).toBeTruthy();
    expect(getByTestId('status-loading')).toBeTruthy();
  });

  it('correctly renders warning of type call_quality_poor', () => {
    const {getByTestId} = render(<WarningsContainer onRefresh={jest.fn()} />, {wrapper: rootProviderWrapper});
    act(() => {
      Warnings.showWarning(Warnings.TYPE.CALL_QUALITY_POOR);
    });
    const WarningElement = getByTestId('call-quality-poor');
    expect(WarningElement).toBeTruthy();
  });

  it('correctly renders warning of type connectivity_recovery', () => {
    const {getByTestId} = render(<WarningsContainer onRefresh={jest.fn()} />, {wrapper: rootProviderWrapper});
    act(() => {
      Warnings.showWarning(Warnings.TYPE.CONNECTIVITY_RECOVERY);
    });
    const WarningElement = getByTestId('connectivity-recovery');
    expect(WarningElement).toBeTruthy();
  });

  it('correctly renders warning of type no_internet', () => {
    const {getByTestId} = render(<WarningsContainer onRefresh={jest.fn()} />, {wrapper: rootProviderWrapper});
    act(() => {
      Warnings.showWarning(Warnings.TYPE.NO_INTERNET);
    });
    const WarningElement = getByTestId('no-internet');
    expect(WarningElement).toBeTruthy();
  });

  it('correctly renders warning of type lifecycle_update', () => {
    const refresh = jest.fn();
    const {getByTestId} = render(<WarningsContainer onRefresh={refresh} />, {wrapper: rootProviderWrapper});
    act(() => {
      Warnings.showWarning(Warnings.TYPE.LIFECYCLE_UPDATE);
    });
    const WarningElement = getByTestId('lifecycle-update');
    expect(WarningElement).toBeTruthy();
    fireEvent.click(getByTestId('do-update'));
    expect(refresh).toHaveBeenCalled();
  });
});
