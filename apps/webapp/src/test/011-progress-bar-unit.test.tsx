import {render} from '@testing-library/react';
import {ProgressBar} from '../script/ai/ui/shared/ProgressBar';

describe('ProgressBar', () => {
  it('should render with correct percentage when progress is partial', () => {
    const {container} = render(<ProgressBar done={5} total={10} />);
    const progressDiv = container.querySelector('[role="progressbar"]');
    const filledDiv = container.querySelector('[role="progressbar"] > div');

    expect(progressDiv).toBeInTheDocument();
    expect(filledDiv).toHaveStyle({width: '50%'});
  });

  it('should render at 0% when done is 0', () => {
    const {container} = render(<ProgressBar done={0} total={10} />);
    const filledDiv = container.querySelector('[role="progressbar"] > div');

    expect(filledDiv).toHaveStyle({width: '0%'});
  });

  it('should render at 100% when done equals total', () => {
    const {container} = render(<ProgressBar done={10} total={10} />);
    const filledDiv = container.querySelector('[role="progressbar"] > div');

    expect(filledDiv).toHaveStyle({width: '100%'});
  });

  it('should guard against division by zero when total is 0', () => {
    const {container} = render(<ProgressBar done={0} total={0} />);
    const filledDiv = container.querySelector('[role="progressbar"] > div');

    expect(filledDiv).toHaveStyle({width: '0%'});
  });

  it('should set correct aria attributes', () => {
    const {container} = render(<ProgressBar done={3} total={10} />);
    const progressDiv = container.querySelector('[role="progressbar"]');

    expect(progressDiv).toHaveAttribute('aria-valuenow', '3');
    expect(progressDiv).toHaveAttribute('aria-valuemin', '0');
    expect(progressDiv).toHaveAttribute('aria-valuemax', '10');
    expect(progressDiv).toHaveAttribute('aria-label', '3 of 10 conversations processed');
  });

  it('should round percentage to nearest integer', () => {
    const {container} = render(<ProgressBar done={1} total={3} />);
    const filledDiv = container.querySelector('[role="progressbar"] > div');

    // 1/3 = 0.333... which rounds to 33%
    expect(filledDiv).toHaveStyle({width: '33%'});
  });

  it('should apply correct styling to progress container', () => {
    const {container} = render(<ProgressBar done={5} total={10} />);
    const progressDiv = container.querySelector('[role="progressbar"]');

    expect(progressDiv).toHaveStyle({
      width: '100%',
      height: '6px',
      backgroundColor: '#e5e7eb',
      borderRadius: '3px',
    });
  });

  it('should apply correct styling to progress fill', () => {
    const {container} = render(<ProgressBar done={5} total={10} />);
    const filledDiv = container.querySelector('[role="progressbar"] > div');

    expect(filledDiv).toHaveStyle({
      height: '100%',
      backgroundColor: '#3b82f6',
      borderRadius: '3px',
      transition: 'width 0.3s ease',
    });
  });
});
