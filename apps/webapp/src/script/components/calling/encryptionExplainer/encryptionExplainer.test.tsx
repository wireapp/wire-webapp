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

import {fireEvent, render, screen} from '@testing-library/react';

import {EncryptionExplainer} from './encryptionExplainer';

type ExplainerProps = Parameters<typeof EncryptionExplainer>[0];

const renderExplainer = (props: Partial<ExplainerProps> = {}): {onClose: jest.Mock} => {
  const onClose = jest.fn();
  render(
    <EncryptionExplainer
      id="explainer"
      title="Only people in this meeting can see and hear it"
      body="Wire's servers can't decrypt it."
      closeLabel="Close"
      linkLabel="How Wire encrypts calls"
      supportUrl="https://support.wire.test/encryption"
      onClose={onClose}
      {...props}
    />,
  );
  return {onClose};
};

describe('EncryptionExplainer', () => {
  it('is a region named by its title, with the body and the support link', () => {
    renderExplainer();

    expect(screen.getByRole('region', {name: 'Only people in this meeting can see and hear it'})).toBeInTheDocument();
    expect(screen.getByText("Wire's servers can't decrypt it.")).toBeInTheDocument();
    expect(screen.getByRole('link', {name: 'How Wire encrypts calls'})).toHaveAttribute(
      'href',
      'https://support.wire.test/encryption',
    );
  });

  it('hides the link when no support URL is configured', () => {
    renderExplainer({supportUrl: undefined});

    expect(screen.queryByRole('link')).toBeNull();
  });

  it('closes from its close button', () => {
    const {onClose} = renderExplainer();
    fireEvent.click(screen.getByRole('button', {name: 'Close'}));

    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
