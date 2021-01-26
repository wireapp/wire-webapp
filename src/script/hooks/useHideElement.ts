import {useEffect} from 'react';

const hideControlsClass = 'hide-controls';

const useHideElement = (element: HTMLElement, timeout: number, skipClass?: string) => {
  useEffect(() => {
    if (!element) {
      return undefined;
    }

    let hideTimeout: number;
    let isMouseIn: boolean = false;

    const onMouseEnter = () => {
      isMouseIn = true;
      element.classList.remove(hideControlsClass);
    };

    const onMouseLeave = () => {
      isMouseIn = false;
      element.classList.add(hideControlsClass);
    };

    const startTimer = () => {
      hideTimeout = window.setTimeout(() => {
        element.classList.add(hideControlsClass);
      }, timeout);
    };

    const onMouseMove = ({target}: MouseEvent) => {
      if (!isMouseIn) {
        return;
      }

      window.clearTimeout(hideTimeout);
      element.classList.remove(hideControlsClass);

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
      element.classList.remove(hideControlsClass);
    };
  }, [element]);
};

export default useHideElement;
