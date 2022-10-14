/*
 * Wire
 * Copyright (C) 2020 Wire Swiss GmbH
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

import React from 'react';

import {act, fireEvent, render, RenderResult} from '@testing-library/react';

type ComponentTypes<T> = React.FC<T> | React.ComponentClass<T>;

export class TestPage<T extends Record<string, any>> {
  private readonly driver: RenderResult;
  private readonly props?: T;
  private readonly component: ComponentTypes<T>;

  constructor(Component: ComponentTypes<T>, props?: T) {
    this.props = props;
    this.component = Component;
    this.driver = render(<Component {...(props as T)} />);
  }

  get renderResults() {
    return this.driver;
  }

  findByTestId = (selector: string) => this.driver.findByTestId(selector);
  get = (selector: string) => this.driver.container.querySelector(selector);
  getAll = (selector: string) => this.driver.container.querySelectorAll(selector);

  getProps = () => this.props;

  private readonly do = (action: Function) => {
    act(() => {
      action();
    });
    this.update();
  };
  click = (element: Element) => this.do(() => fireEvent.click(element));
  doubleClick = (element: Element) => this.do(() => fireEvent.dblClick(element));
  changeValue = (element: Element, value: any) => this.do(() => fireEvent.change(element, {target: {value}}));
  changeCheckboxValue = (element: Element, value: any) =>
    this.do(() => fireEvent.change(element, {target: {checked: value}}));
  changeFiles = (element: Element, files: File[]) => this.do(() => fireEvent.change(element, {target: {files}}));
  submit = (element: Element) => this.do(() => fireEvent.submit(element));
  mouseEnter = (element: Element) => this.do(() => fireEvent.mouseEnter(element));
  keyUp = (element: Element, key: string) => this.do(() => fireEvent.keyUp(element, {key}));
  keyDown = (element: Element, key: string) => this.do(() => fireEvent.keyDown(element, {key}));

  update = () => {};
  setProps = (props: T) => this.do(() => this.driver.rerender(<this.component {...props} />));
}
