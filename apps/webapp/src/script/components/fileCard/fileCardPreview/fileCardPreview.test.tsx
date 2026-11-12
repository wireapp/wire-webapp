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
import userEvent from '@testing-library/user-event';

import {FileCard} from '../fileCard';

describe('FileCard.Preview', () => {
  it('runs the caller action through an accessible native button', async () => {
    const onClick = jest.fn();
    render(<FileCard.Preview src="preview.png" aria-label="Download report.pdf" onClick={onClick} />);

    await userEvent.click(screen.getByRole('button', {name: 'Download report.pdf'}));

    expect(onClick).toHaveBeenCalledTimes(1);
    expect(screen.getByRole('presentation')).toHaveAttribute('src', 'preview.png');
  });

  it('supports keyboard activation without forcing dialog behavior', async () => {
    const onClick = jest.fn();
    render(<FileCard.Preview src="preview.png" aria-label="Download report.pdf" onClick={onClick} />);

    await userEvent.tab();
    await userEvent.keyboard('{Enter}');

    expect(onClick).toHaveBeenCalledTimes(1);
    expect(screen.getByRole('button')).not.toHaveAttribute('aria-haspopup');
  });

  it('preserves dialog metadata and disabled state supplied by the caller', async () => {
    const onClick = jest.fn();
    render(
      <FileCard.Preview
        src="preview.png"
        aria-label="Open report.pdf"
        onClick={onClick}
        aria-controls="pdf-dialog"
        aria-haspopup="dialog"
        aria-expanded={false}
        disabled
      />,
    );

    const button = screen.getByRole('button', {name: 'Open report.pdf'});
    await userEvent.click(button);

    expect(button).toBeDisabled();
    expect(button).toHaveAttribute('aria-controls', 'pdf-dialog');
    expect(button).toHaveAttribute('aria-haspopup', 'dialog');
    expect(button).toHaveAttribute('aria-expanded', 'false');
    expect(onClick).not.toHaveBeenCalled();
  });

  it('allows the caller to control image visibility and provide a loading overlay', () => {
    const onImageLoad = jest.fn();
    const {rerender} = render(
      <FileCard.Preview src="preview.png" aria-label="Open report.pdf" imageVisible={false} onImageLoad={onImageLoad}>
        <span role="status">Loading preview</span>
      </FileCard.Preview>,
    );

    const image = screen.getByRole('presentation', {hidden: true});
    expect(image).not.toBeVisible();
    expect(screen.getByRole('status')).toHaveTextContent('Loading preview');
    fireEvent.load(image);
    expect(onImageLoad).toHaveBeenCalledTimes(1);

    rerender(<FileCard.Preview src="preview.png" aria-label="Open report.pdf" />);
    expect(screen.getByRole('presentation')).toBeVisible();
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });

  it('reports image errors without choosing a feature-specific fallback', () => {
    const onImageError = jest.fn();
    render(<FileCard.Preview src="broken.png" aria-label="Download report.pdf" onImageError={onImageError} />);

    fireEvent.error(screen.getByRole('presentation'));

    expect(onImageError).toHaveBeenCalledTimes(1);
    expect(screen.getByRole('button', {name: 'Download report.pdf'})).toBeInTheDocument();
  });
});
