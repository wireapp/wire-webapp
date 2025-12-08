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

import {fireEvent, render} from '@testing-library/react';

import {ContentMessage} from 'Repositories/entity/message/ContentMessage';
import {createUuid} from 'Util/uuid';

import {CollectionSection} from './CollectionSection';

const NUMBER_OF_ASSETS = 5;

const messages = new Array(NUMBER_OF_ASSETS).fill(null).map(() => new ContentMessage(createUuid()));

const getDefaultProps = (limit: number) => ({
  label: 'cool collection',
  limit,
  messages,
  onSelect: jest.fn(),
  uieName: 'cool-collection',
});

describe('CollectionSection', () => {
  it('does not show show all button when under or equal a limit', async () => {
    const props = getDefaultProps(NUMBER_OF_ASSETS + 1);
    const {queryByText, rerender} = render(
      <CollectionSection {...props}>
        <span />
      </CollectionSection>,
    );

    props.limit = NUMBER_OF_ASSETS;
    expect(queryByText('collectionShowAll')).toBeNull();

    rerender(
      <CollectionSection {...props}>
        <span />
      </CollectionSection>,
    );

    expect(queryByText('collectionShowAll')).toBeNull();
  });

  it('does show show all button when over a limit', async () => {
    const {getByText} = render(
      <CollectionSection {...getDefaultProps(NUMBER_OF_ASSETS - 1)}>
        <span />
      </CollectionSection>,
    );

    expect(getByText('collectionShowAll')).toBeDefined();
  });

  it('triggers onSelect callback on show all button click', async () => {
    const props = getDefaultProps(NUMBER_OF_ASSETS - 1);
    const {getByText} = render(
      <CollectionSection {...props}>
        <span />
      </CollectionSection>,
    );

    const button = getByText('collectionShowAll');
    fireEvent.click(button);

    expect(props.onSelect).toHaveBeenCalled();
  });
});
