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

import type {Outcome, State} from './types';

type OutcomePredicate<Tag extends string> = <Value extends {outcome: string}>(
  value: Value,
) => value is Value & Outcome<Tag>;

type StatePredicate<Tag extends string> = <Value extends {state: string}>(value: Value) => value is Value & State<Tag>;

export function isOutcome<Tag extends string>(...tags: Tag[]): OutcomePredicate<Tag> {
  return <Value extends {outcome: string}>(value: Value): value is Value & Outcome<Tag> => {
    return (tags as string[]).includes(value.outcome);
  };
}

export function isInState<Tag extends string>(...states: Tag[]): StatePredicate<Tag> {
  return <Value extends {state: string}>(value: Value): value is Value & State<Tag> => {
    return (states as string[]).includes(value.state);
  };
}
