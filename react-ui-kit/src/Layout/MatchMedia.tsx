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

import React, {ReactFragment, useEffect, useState} from 'react';
import {QUERY, QueryKeys} from '../mediaQueries';
import {Omit} from '../util';

type Query = string | keyof QueryKeys;

export interface MatchMediaProps extends React.HTMLProps<ReactFragment> {
  not?: boolean;
  query: Query;
}

const useMatchMedia = (query: Query) => {
  const matchMedia = window.matchMedia(`(${query})`);

  const [isMatching, setIsMatching] = useState(false);

  const updateMatching = () => setIsMatching(matchMedia.matches);

  useEffect(() => {
    matchMedia.addListener(updateMatching);
    return () => matchMedia.removeListener(updateMatching);
  });

  return isMatching;
};

const MatchMedia: React.FC<MatchMediaProps> = ({query, children, not}) => {
  const matchQuery = useMatchMedia(QUERY[query] || query);
  const isMatching = not ? !matchQuery : matchQuery;
  return <>{isMatching ? children : null}</>;
};

export interface NamedMatchMediaProps extends Omit<MatchMediaProps, 'query'> {}

const IsDesktop = (props: NamedMatchMediaProps) => <MatchMedia query={QueryKeys.DESKTOP} {...props} />;
const IsDesktopXL = (props: NamedMatchMediaProps) => <MatchMedia query={QueryKeys.DESKTOP_XL} {...props} />;
const IsMobile = (props: NamedMatchMediaProps) => <MatchMedia query={QueryKeys.MOBILE} {...props} />;
const IsMobileUp = (props: NamedMatchMediaProps) => <MatchMedia query={QueryKeys.MOBILE_UP} {...props} />;
const IsTablet = (props: NamedMatchMediaProps) => <MatchMedia query={QueryKeys.TABLET} {...props} />;
const IsTabletDown = (props: NamedMatchMediaProps) => <MatchMedia query={QueryKeys.TABLET_DOWN} {...props} />;
const IsTabletUp = (props: NamedMatchMediaProps) => <MatchMedia query={QueryKeys.TABLET_UP} {...props} />;

export {useMatchMedia, MatchMedia, IsDesktop, IsDesktopXL, IsMobile, IsMobileUp, IsTablet, IsTabletDown, IsTabletUp};
