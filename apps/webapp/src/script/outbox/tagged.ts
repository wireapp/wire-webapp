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

type Tagged = {outcome: string};
type Awaitable<Value> = Value | Promise<Value>;

export type OutcomePredicate<Tag extends string> = <Value extends Tagged>(
  value: Value,
) => value is Value & Outcome<Tag>;

export type StatePredicate<Tag extends string> = <Value extends {state: string}>(
  value: Value,
) => value is Value & State<Tag>;

export function isOutcome<Tag extends string>(...tags: Tag[]): OutcomePredicate<Tag> {
  return <Value extends Tagged>(value: Value): value is Value & Outcome<Tag> => {
    return (tags as string[]).includes(value.outcome);
  };
}

export function isInState<Tag extends string>(...states: Tag[]): StatePredicate<Tag> {
  return <Value extends {state: string}>(value: Value): value is Value & State<Tag> => {
    return (states as string[]).includes(value.state);
  };
}

type Failure<Value, Tag extends string> = Extract<Value, Outcome<Tag>>;
type Passed<Value, Tag extends string> = Exclude<Value, Outcome<Tag>>;
type Step<Input, Output extends Tagged> = (value: Input) => Awaitable<Output>;

export type Pipeline<Tag extends string> = {
  <A extends Tagged>(first: () => Awaitable<A>): Promise<A>;
  <A extends Tagged, B extends Tagged>(
    first: () => Awaitable<A>,
    second: Step<Passed<A, Tag>, B>,
  ): Promise<Failure<A, Tag> | B>;
  <A extends Tagged, B extends Tagged, C extends Tagged>(
    first: () => Awaitable<A>,
    second: Step<Passed<A, Tag>, B>,
    third: Step<Passed<B, Tag>, C>,
  ): Promise<Failure<A | B, Tag> | C>;
  <A extends Tagged, B extends Tagged, C extends Tagged, D extends Tagged>(
    first: () => Awaitable<A>,
    second: Step<Passed<A, Tag>, B>,
    third: Step<Passed<B, Tag>, C>,
    fourth: Step<Passed<C, Tag>, D>,
  ): Promise<Failure<A | B | C, Tag> | D>;
  <A extends Tagged, B extends Tagged, C extends Tagged, D extends Tagged, E extends Tagged>(
    first: () => Awaitable<A>,
    second: Step<Passed<A, Tag>, B>,
    third: Step<Passed<B, Tag>, C>,
    fourth: Step<Passed<C, Tag>, D>,
    fifth: Step<Passed<D, Tag>, E>,
  ): Promise<Failure<A | B | C | D, Tag> | E>;
};

/**
 * Runs the steps left to right, each with the outcome of the one before, and stops at the first outcome
 * `isFailure` accepts, which it answers. Otherwise it answers the outcome of the last step.
 */
export function pipe<Tag extends string>(isFailure: OutcomePredicate<Tag>): Pipeline<Tag> {
  return (async (first: () => Awaitable<Tagged>, ...rest: Step<Tagged, Tagged>[]) => {
    return rest.reduce<Promise<Tagged>>(async (previous, step) => {
      const value = await previous;
      return isFailure(value) ? value : step(value);
    }, Promise.resolve(first()));
  }) as Pipeline<Tag>;
}

/**
 * Runs the step for each item in order, and stops at the first outcome `isFailure` accepts, which it answers.
 * Otherwise it answers `done`.
 */
export function eachUntilFailure<Tag extends string>(isFailure: OutcomePredicate<Tag>) {
  return async <Item, Result extends Tagged, Done extends Tagged>(
    items: readonly Item[],
    step: (item: Item) => Awaitable<Result>,
    done: Done,
  ): Promise<Failure<Result, Tag> | Done> => {
    return items.reduce<Promise<Failure<Result, Tag> | Done>>(async (previous, item) => {
      const value = await previous;
      if (isFailure(value)) {
        return value;
      }
      const result = await step(item);
      return isFailure(result) ? (result as Failure<Result, Tag>) : done;
    }, Promise.resolve(done));
  };
}
