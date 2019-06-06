/*
 * Wire
 * Copyright (C) 2018 Wire Swiss GmbH
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

/** @jsx jsx */
import {jsx} from '@emotion/core';
import React, {ReactFragment, useEffect, useState} from 'react';
import {QUERY, QueryKeys} from '../mediaQueries';
import {Omit} from '../util';

type Query = string | keyof QueryKeys;

export interface MatchMediaProps extends React.HTMLProps<ReactFragment> {
  not?: boolean;
  query: Query;
}

export const useMatchMedia = (query: Query) => {
  const matchMedia = window.matchMedia(`(${query})`);

  const [isMatching, setIsMatching] = useState(matchMedia.matches);

  const updateMatching = () => setIsMatching(matchMedia.matches);

  useEffect(() => {
    matchMedia.addListener(updateMatching);
    return () => matchMedia.removeListener(updateMatching);
  });

  return isMatching;
};

export const MatchMedia: React.FC<MatchMediaProps> = ({query, children, not}) => {
  const matchQuery = useMatchMedia(QUERY[query] || query);
  const isMatching = not ? !matchQuery : matchQuery;
  return <React.Fragment>{isMatching ? children : null}</React.Fragment>;
};

export interface NamedMatchMediaProps extends Omit<MatchMediaProps, 'query'> {}

export const IsDesktop = (props: NamedMatchMediaProps) => <MatchMedia query={QueryKeys.DESKTOP} {...props} />;
export const IsDesktopXL = (props: NamedMatchMediaProps) => <MatchMedia query={QueryKeys.DESKTOP_XL} {...props} />;
export const IsMobile = (props: NamedMatchMediaProps) => <MatchMedia query={QueryKeys.MOBILE} {...props} />;
export const IsMobileDown = (props: NamedMatchMediaProps) => <MatchMedia query={QueryKeys.MOBILE_DOWN} {...props} />;
export const IsMobileUp = (props: NamedMatchMediaProps) => <MatchMedia query={QueryKeys.MOBILE_UP} {...props} />;
export const IsTablet = (props: NamedMatchMediaProps) => <MatchMedia query={QueryKeys.TABLET} {...props} />;
export const IsTabletDown = (props: NamedMatchMediaProps) => <MatchMedia query={QueryKeys.TABLET_DOWN} {...props} />;
export const IsTabletUp = (props: NamedMatchMediaProps) => <MatchMedia query={QueryKeys.TABLET_UP} {...props} />;
