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

import {useState} from 'react';

import {Meta, StoryObj} from '@storybook/react';
import {noop} from 'noop-esm';

import {Pagination} from './pagination';

import {COLOR} from '../../identity/colors';
import {Small} from '../../typography';

const meta: Meta<typeof Pagination> = {
  component: Pagination,
  title: 'navigation/pagination',
  decorators: [
    Story => {
      return (
        <div style={{padding: '24px', maxWidth: '600px', margin: '0 auto'}}>
          <Story />
        </div>
      );
    },
  ],
};

export default meta;
type Story = StoryObj<typeof Pagination>;

export const Default: Story = {
  args: {
    currentPage: 0,
    numberOfPages: 5,
    goPage: noop,
  },
};

export const CustomNavigation: Story = {
  args: {
    currentPage: 0,
    numberOfPages: 5,
    goPage: noop,
    previousPageComponent: () => {
      return 'Previous';
    },
    nextPageComponent: () => {
      return 'Next';
    },
  },
};

export const WithManyPages: Story = {
  args: {
    currentPage: 4,
    numberOfPages: 20,
    goPage: noop,
  },
};

export const Interactive = () => {
  const [currentPage, setCurrentPage] = useState(0);
  const paginatedList = [
    [1, 2],
    [3, 4],
    [5, 6],
    [7, 8],
    [9, 10],
    [11, 12],
    [13, 14],
    [15, 16],
    [17, 18],
  ];

  return (
    <div>
      <div style={{marginBottom: '24px'}}>
        {paginatedList[currentPage].map(item => {
          return (
            <Small key={item} center bold block style={{border: `1px solid ${COLOR.GRAY}`, margin: 10, padding: '8px'}}>
              {`Item ${item}`}
            </Small>
          );
        })}
      </div>
      <Pagination
        currentPage={currentPage}
        goPage={setCurrentPage}
        nextPageComponent={() => {
          return 'Next';
        }}
        numberOfPages={paginatedList.length}
        previousPageComponent={() => {
          return 'Previous';
        }}
      />
    </div>
  );
};

export const CustomStyling = () => {
  const [currentPage, setCurrentPage] = useState(0);

  return (
    <Pagination
      currentPage={currentPage}
      goPage={setCurrentPage}
      numberOfPages={5}
      previousPageComponent={() => {
        return <div style={{color: COLOR.BLUE, fontWeight: 'bold'}}>{'←'}</div>;
      }}
      nextPageComponent={() => {
        return <div style={{color: COLOR.BLUE, fontWeight: 'bold'}}>{'→'}</div>;
      }}
      style={{
        backgroundColor: COLOR.GRAY_LIGHTEN_92,
        borderRadius: '8px',
        padding: '16px',
      }}
    />
  );
};

export const FirstPage = () => {
  const [currentPage, setCurrentPage] = useState(0);
  return (
    <Pagination
      currentPage={currentPage}
      goPage={setCurrentPage}
      numberOfPages={5}
      previousPageComponent={() => {
        return 'Previous';
      }}
      nextPageComponent={() => {
        return 'Next';
      }}
    />
  );
};

export const LastPage = () => {
  const [currentPage, setCurrentPage] = useState(4);
  return (
    <Pagination
      currentPage={currentPage}
      goPage={setCurrentPage}
      numberOfPages={5}
      previousPageComponent={() => {
        return 'Previous';
      }}
      nextPageComponent={() => {
        return 'Next';
      }}
    />
  );
};

export const MiddlePage = () => {
  const [currentPage, setCurrentPage] = useState(5);
  return (
    <Pagination
      currentPage={currentPage}
      goPage={setCurrentPage}
      numberOfPages={10}
      previousPageComponent={() => {
        return 'Previous';
      }}
      nextPageComponent={() => {
        return 'Next';
      }}
    />
  );
};
