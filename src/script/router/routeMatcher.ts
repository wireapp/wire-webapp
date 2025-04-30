/*
 * Wire
 * Copyright (C) 2024 Wire Swiss GmbH
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

type RouteParams = Record<string, string>;

type MatchResult = {
  match: boolean;
  params: RouteParams;
};

type SegmentType = 'static' | 'required-param' | 'optional-param' | 'wildcard';

type SegmentInfo = {
  type: SegmentType;
  value: string;
  paramName?: string;
};

/**
 * Matches a path against a route pattern and extracts parameters
 * @param path - The path to match (e.g. '/conversation/123')
 * @param pattern - The route pattern (e.g. '/conversation/:id')
 * @returns Object containing match result and extracted parameters
 */
export const matchRoute = ({path, pattern}: {path: string; pattern: string}): MatchResult => {
  const pathSegments = path.split('/').filter(Boolean);
  const patternSegments = pattern.split('/').filter(Boolean);

  if (pathSegments.length === 0 && patternSegments.length === 0) {
    return {match: true, params: {}};
  }

  if (patternSegments[0] === '*') {
    return {match: true, params: {'*': pathSegments.join('/')}};
  }

  return matchSegments({pathSegments, patternSegments});
};

const matchSegments = ({
  pathSegments,
  patternSegments,
}: {
  pathSegments: string[];
  patternSegments: string[];
}): MatchResult => {
  let pathIndex = 0;
  const params: RouteParams = {};

  for (let i = 0; i < patternSegments.length; i++) {
    const patternSegment = patternSegments[i];
    const nextSegment = patternSegments[i + 1];

    const result = matchSegment({
      segmentInfo: getSegmentInfo(patternSegment),
      pathSegment: pathSegments[pathIndex],
      pathIndex,
      params,
      remainingPath: pathSegments.slice(pathIndex).join('/'),
      nextSegment: nextSegment ? getSegmentInfo(nextSegment).value : undefined,
    });

    if (!result.matched) {
      return {match: false, params: {}};
    }

    Object.assign(params, result.params);
    pathIndex = result.nextPathIndex;
  }

  return {match: pathIndex >= pathSegments.length, params};
};

type MatchSegmentParams = {
  segmentInfo: SegmentInfo;
  pathSegment: string | undefined;
  pathIndex: number;
  params: RouteParams;
  remainingPath?: string;
  nextSegment?: string;
};

/**
 * Matches a single segment against a path segment and extracts parameters
 * @param segmentInfo - Information about the pattern segment type and value
 * @param pathSegment - The current path segment to match against
 * @param pathIndex - Current index in the path segments
 * @param params - Current accumulated parameters
 * @param remainingPath - Remaining path segments for wildcard matching
 * @param nextSegment - Next segment in the pattern for optional parameter matching
 */
const matchSegment = ({
  segmentInfo,
  pathSegment,
  pathIndex,
  params,
  remainingPath,
  nextSegment,
}: MatchSegmentParams): {matched: boolean; params: RouteParams; nextPathIndex: number} => {
  const baseResult = {matched: true, params, nextPathIndex: pathIndex + 1};

  switch (segmentInfo.type) {
    case 'wildcard':
      return {
        ...baseResult,
        params: {...params, '*': remainingPath || ''},
        nextPathIndex: Infinity,
      };

    case 'optional-param':
      if (!pathSegment) {
        return {...baseResult, nextPathIndex: pathIndex};
      }

      // Skip optional parameter if the next segment matches
      if (nextSegment && pathSegment === nextSegment) {
        return {...baseResult, nextPathIndex: pathIndex};
      }

      return {...baseResult, params: {...params, [segmentInfo.paramName!]: pathSegment}};

    case 'required-param':
      if (!pathSegment) {
        return {matched: false, params: {}, nextPathIndex: pathIndex};
      }
      return {...baseResult, params: {...params, [segmentInfo.paramName!]: pathSegment}};

    case 'static':
      if (!pathSegment || pathSegment !== segmentInfo.value) {
        return {matched: false, params: {}, nextPathIndex: pathIndex};
      }
      return baseResult;
  }
};

const getSegmentInfo = (segment: string): SegmentInfo => {
  if (segment === '*') {
    return {type: 'wildcard', value: segment};
  }
  if (segment.startsWith('(') && segment.endsWith(')')) {
    return {type: 'optional-param', value: segment, paramName: segment.slice(2, -1)};
  }
  if (segment.startsWith(':')) {
    return {type: 'required-param', value: segment, paramName: segment.slice(1)};
  }
  return {type: 'static', value: segment};
};
