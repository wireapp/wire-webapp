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

import {act, fireEvent, render} from '@testing-library/react';

import {withTheme} from 'src/script/auth/util/test/testutil';

import {ModalComponent} from './modalcomponent';

const renderModal = ({
  isShown = true,
  container,
  onBgClick,
  onOpened,
  onClosed,
}: {
  isShown?: boolean;
  container?: Element | DocumentFragment;
  onBgClick?: () => void;
  onOpened?: () => void;
  onClosed?: () => void;
} = {}) => {
  return render(
    withTheme(
      <ModalComponent
        isShown={isShown}
        container={container}
        onBgClick={onBgClick}
        onOpened={onOpened}
        onClosed={onClosed}
      >
        <div>Modal content</div>
      </ModalComponent>,
    ),
  );
};

describe('ModalComponent', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('does not render when isShown is false', () => {
    const {queryByRole} = renderModal({isShown: false});

    expect(queryByRole('dialog')).toBeNull();
  });

  it('renders modal content when isShown is true', () => {
    const {getByRole, getByText} = renderModal();

    expect(getByRole('dialog')).toBeTruthy();
    expect(getByText('Modal content')).toBeTruthy();
  });

  it('renders into document.body by default', () => {
    renderModal();

    expect(document.body.querySelector('[role="dialog"]')).toBeTruthy();
  });

  it('renders into custom container', () => {
    const container = document.createElement('div');
    document.body.appendChild(container);

    renderModal({container});

    expect(container.querySelector('[role="dialog"]')).toBeTruthy();
  });

  it('calls onBgClick when overlay is clicked', () => {
    const onBgClick = jest.fn();
    const {getByRole} = renderModal({onBgClick});

    fireEvent.click(getByRole('dialog'));

    expect(onBgClick).toHaveBeenCalledTimes(1);
  });

  it('does not call onBgClick when modal content is clicked', () => {
    const onBgClick = jest.fn();
    const {getByText} = renderModal({onBgClick});

    fireEvent.click(getByText('Modal content'));

    expect(onBgClick).not.toHaveBeenCalled();
  });

  it('calls onOpened when modal is shown', () => {
    const onOpened = jest.fn();

    renderModal({onOpened});

    expect(onOpened).toHaveBeenCalledTimes(1);
  });

  it('calls onClosed after close delay', () => {
    jest.useFakeTimers();

    const onClosed = jest.fn();
    const {rerender} = render(
      withTheme(
        <ModalComponent isShown onClosed={onClosed}>
          <div>Modal content</div>
        </ModalComponent>,
      ),
    );

    rerender(
      withTheme(
        <ModalComponent isShown={false} onClosed={onClosed}>
          <div>Modal content</div>
        </ModalComponent>,
      ),
    );

    act(() => {
      jest.advanceTimersByTime(350);
    });

    expect(onClosed).toHaveBeenCalledTimes(1);

    jest.useRealTimers();
  });

  it('renders into a foreign document container', () => {
    const iframe = document.createElement('iframe');
    document.body.appendChild(iframe);

    const iframeDocument = iframe.contentDocument!;
    const iframeContainer = iframeDocument.createElement('div');
    iframeDocument.body.appendChild(iframeContainer);

    renderModal({container: iframeContainer});

    expect(iframeContainer.querySelector('[role="dialog"]')).toBeTruthy();
    expect(iframeDocument.body.textContent).toContain('Modal content');
  });

  it('adds Emotion modal styles to foreign document head', () => {
    const iframe = document.createElement('iframe');
    document.body.appendChild(iframe);

    const iframeDocument = iframe.contentDocument!;
    const iframeContainer = iframeDocument.createElement('div');
    iframeDocument.body.appendChild(iframeContainer);

    renderModal({container: iframeContainer});

    expect(iframeDocument.head.querySelector('style[data-emotion^="modal"]')).toBeTruthy();
  });

  it('does not add modal emotion cache styles to the main document when rendered in a foreign document', () => {
    const iframe = document.createElement('iframe');
    document.body.appendChild(iframe);

    const iframeDocument = iframe.contentDocument!;
    const iframeContainer = iframeDocument.createElement('div');
    iframeDocument.body.appendChild(iframeContainer);

    renderModal({container: iframeContainer});

    expect(iframeDocument.head.querySelector('style[data-emotion^="modal"]')).toBeTruthy();
    expect(document.head.querySelector('style[data-emotion^="modal"]')).toBeFalsy();
  });
});
