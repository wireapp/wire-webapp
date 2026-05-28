import React from 'react';
import {render} from '@testing-library/react';
import {ProgressBar} from 'src/script/ai/ui/shared/ProgressBar';

describe('ProgressBar', () => {
  it('should render with initial progress', () => {
    const {container} = render(React.createElement(ProgressBar, {done: 5, total: 10}));
    const progressBar = container.querySelector('[role="progressbar"]');

    expect(progressBar).toBeInTheDocument();
    expect(progressBar).toHaveAttribute('aria-valuenow', '5');
    expect(progressBar).toHaveAttribute('aria-valuemax', '10');
  });

  it('should calculate progress percentage correctly', () => {
    const {container} = render(React.createElement(ProgressBar, {done: 3, total: 4}));
    const filledDiv = container.querySelector('[role="progressbar"] div');

    expect(filledDiv).toHaveStyle({width: '75%'});
  });

  it('should render 0% when total is 0', () => {
    const {container} = render(React.createElement(ProgressBar, {done: 0, total: 0}));
    const filledDiv = container.querySelector('[role="progressbar"] div');

    expect(filledDiv).toHaveStyle({width: '0%'});
  });

  it('should render 100% when done equals total', () => {
    const {container} = render(React.createElement(ProgressBar, {done: 10, total: 10}));
    const filledDiv = container.querySelector('[role="progressbar"] div');

    expect(filledDiv).toHaveStyle({width: '100%'});
  });

  it('should round the percentage', () => {
    const {container} = render(React.createElement(ProgressBar, {done: 1, total: 3}));
    const filledDiv = container.querySelector('[role="progressbar"] div');

    expect(filledDiv).toHaveStyle({width: '33%'});
  });

  it('should have correct accessibility attributes', () => {
    const {container} = render(React.createElement(ProgressBar, {done: 2, total: 5}));
    const progressBar = container.querySelector('[role="progressbar"]');

    expect(progressBar).toHaveAttribute('role', 'progressbar');
    expect(progressBar).toHaveAttribute('aria-valuemin', '0');
    expect(progressBar).toHaveAttribute('aria-valuenow', '2');
    expect(progressBar).toHaveAttribute('aria-valuemax', '5');
    expect(progressBar).toHaveAttribute('aria-label', '2 of 5 conversations processed');
  });

  it('should update when props change', () => {
    const {container, rerender} = render(React.createElement(ProgressBar, {done: 2, total: 10}));
    let filledDiv = container.querySelector('[role="progressbar"] div');
    expect(filledDiv).toHaveStyle({width: '20%'});

    rerender(React.createElement(ProgressBar, {done: 5, total: 10}));
    filledDiv = container.querySelector('[role="progressbar"] div');
    expect(filledDiv).toHaveStyle({width: '50%'});
  });
});
