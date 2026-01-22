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

import {act, fireEvent, render} from '@testing-library/react';

import {WarningsContainer} from './WarningsContainer';

import {Warnings} from '.';

describe('WarningsContainer', () => {
  it('does not render when no warning is in the queue', async () => {
    const {container} = render(<WarningsContainer onRefresh={jest.fn()} />);

    expect(container.firstChild).toBeFalsy();
  });

  it('correctly renders warning of type request_camera', async () => {
    const {getByTestId} = render(<WarningsContainer onRefresh={jest.fn()} />);
    act(() => {
      Warnings.showWarning(Warnings.TYPE.REQUEST_CAMERA);
    });
    const WarningElement = getByTestId('request-camera');
    expect(WarningElement).toBeTruthy();
  });

  it('correctly renders warning of type denied_camera', () => {
    const {getByTestId} = render(<WarningsContainer onRefresh={jest.fn()} />);
    act(() => {
      Warnings.showWarning(Warnings.TYPE.DENIED_CAMERA);
    });
    const WarningElement = getByTestId('denied-camera');
    expect(WarningElement).toBeTruthy();
  });

  it('correctly renders warning of type request_microphone', () => {
    const {getByTestId} = render(<WarningsContainer onRefresh={jest.fn()} />);
    act(() => {
      Warnings.showWarning(Warnings.TYPE.REQUEST_MICROPHONE);
    });
    const WarningElement = getByTestId('request-microphone');
    expect(WarningElement).toBeTruthy();
  });

  it('correctly renders warning of type denied_microphone', () => {
    const {getByTestId} = render(<WarningsContainer onRefresh={jest.fn()} />);
    act(() => {
      Warnings.showWarning(Warnings.TYPE.DENIED_MICROPHONE);
    });
    const WarningElement = getByTestId('denied-microphone');
    expect(WarningElement).toBeTruthy();
  });

  it('correctly renders warning of type request_screen', () => {
    const {getByTestId} = render(<WarningsContainer onRefresh={jest.fn()} />);
    act(() => {
      Warnings.showWarning(Warnings.TYPE.REQUEST_SCREEN);
    });
    const WarningElement = getByTestId('request-screen');
    expect(WarningElement).toBeTruthy();
  });

  it('correctly renders warning of type denied_screen', () => {
    const {getByTestId} = render(<WarningsContainer onRefresh={jest.fn()} />);
    act(() => {
      Warnings.showWarning(Warnings.TYPE.DENIED_SCREEN);
    });
    const WarningElement = getByTestId('denied-screen');
    expect(WarningElement).toBeTruthy();
  });

  it('correctly renders warning of type not_found_camera', () => {
    const {getByTestId} = render(<WarningsContainer onRefresh={jest.fn()} />);
    act(() => {
      Warnings.showWarning(Warnings.TYPE.NOT_FOUND_CAMERA);
    });
    const WarningElement = getByTestId('not-found-camera');
    expect(WarningElement).toBeTruthy();
  });

  it('correctly renders warning of type not_found_microphone', () => {
    const {getByTestId} = render(<WarningsContainer onRefresh={jest.fn()} />);
    act(() => {
      Warnings.showWarning(Warnings.TYPE.NOT_FOUND_MICROPHONE);
    });
    const WarningElement = getByTestId('not-found-microphone');
    expect(WarningElement).toBeTruthy();
  });

  it('correctly renders warning of type request_notification', () => {
    const {getByTestId} = render(<WarningsContainer onRefresh={jest.fn()} />);
    act(() => {
      Warnings.showWarning(Warnings.TYPE.REQUEST_NOTIFICATION);
    });
    const WarningElement = getByTestId('request-notification');
    expect(WarningElement).toBeTruthy();
  });

  it('correctly renders warning of type unsupported_incoming_call', () => {
    const {getByTestId} = render(<WarningsContainer onRefresh={jest.fn()} />);
    act(() => {
      Warnings.showWarning(Warnings.TYPE.UNSUPPORTED_INCOMING_CALL);
    });
    const WarningElement = getByTestId('unsupported-incoming-call');
    expect(WarningElement).toBeTruthy();
  });

  it('correctly renders warning of type unsupported_outgoing_call', () => {
    const {getByTestId} = render(<WarningsContainer onRefresh={jest.fn()} />);
    act(() => {
      Warnings.showWarning(Warnings.TYPE.UNSUPPORTED_OUTGOING_CALL);
    });
    const WarningElement = getByTestId('unsupported-outgoing-call');
    expect(WarningElement).toBeTruthy();
  });

  it('correctly renders warning of type connectivity_reconnect', () => {
    const {getByTestId} = render(<WarningsContainer onRefresh={jest.fn()} />);
    act(() => {
      Warnings.showWarning(Warnings.TYPE.CONNECTIVITY_RECONNECT);
    });
    const WarningElement = getByTestId('connectivity-reconnect');
    expect(WarningElement).toBeTruthy();
  });

  it('correctly renders warning of type call_quality_poor', () => {
    const {getByTestId} = render(<WarningsContainer onRefresh={jest.fn()} />);
    act(() => {
      Warnings.showWarning(Warnings.TYPE.CALL_QUALITY_POOR);
    });
    const WarningElement = getByTestId('call-quality-poor');
    expect(WarningElement).toBeTruthy();
  });

  it('correctly renders warning of type connectivity_recovery', () => {
    const {getByTestId} = render(<WarningsContainer onRefresh={jest.fn()} />);
    act(() => {
      Warnings.showWarning(Warnings.TYPE.CONNECTIVITY_RECOVERY);
    });
    const WarningElement = getByTestId('connectivity-recovery');
    expect(WarningElement).toBeTruthy();
  });

  it('correctly renders warning of type no_internet', () => {
    const {getByTestId} = render(<WarningsContainer onRefresh={jest.fn()} />);
    act(() => {
      Warnings.showWarning(Warnings.TYPE.NO_INTERNET);
    });
    const WarningElement = getByTestId('no-internet');
    expect(WarningElement).toBeTruthy();
  });

  it('correctly renders warning of type lifecycle_update', () => {
    const refresh = jest.fn();
    const {getByTestId} = render(<WarningsContainer onRefresh={refresh} />);
    act(() => {
      Warnings.showWarning(Warnings.TYPE.LIFECYCLE_UPDATE);
    });
    const WarningElement = getByTestId('lifecycle-update');
    expect(WarningElement).toBeTruthy();
    fireEvent.click(getByTestId('do-update'));
    expect(refresh).toHaveBeenCalled();
  });
});
