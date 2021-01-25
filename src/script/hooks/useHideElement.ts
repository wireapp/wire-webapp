import {useEffect} from 'react';

const useHideElement = (element: HTMLElement, timeout: number, skipClass?: string) => {
  useEffect(() => {
    if (!element) {
      return undefined;
    }

    let hideTimeout: number;
    let isMouseIn: boolean = false;

    const onMouseEnter = () => {
      isMouseIn = true;
      element.classList.remove('hide-controls');
    };

    const onMouseLeave = () => {
      isMouseIn = false;
      element.classList.add('hide-controls');
    };

    const startTimer = () => {
      hideTimeout = window.setTimeout(() => {
        element.classList.add('hide-controls');
      }, timeout);
    };

    const onMouseMove = ({target}: MouseEvent) => {
      if (!isMouseIn) {
        return;
      }

      window.clearTimeout(hideTimeout);
      element.classList.remove('hide-controls');

      let node = target as Element;
      while (node && node !== element) {
        if (node.classList.contains(skipClass)) {
          return;
        }
        node = node.parentNode as Element;
      }
      startTimer();
    };

    element.addEventListener('mouseenter', onMouseEnter);
    element.addEventListener('mouseleave', onMouseLeave);
    element.addEventListener('mousemove', onMouseMove);

    startTimer();
    return () => {
      window.clearTimeout(hideTimeout);
      element.removeEventListener('mouseenter', onMouseEnter);
      element.removeEventListener('mouseleave', onMouseLeave);
      element.removeEventListener('mousemove', onMouseMove);
      element.classList.remove('hide-controls');
    };
  }, [element]);
};

export default useHideElement;
