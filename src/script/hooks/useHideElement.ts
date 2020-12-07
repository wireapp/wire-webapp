import {useEffect} from 'react';
import {throttle} from 'Util/util';

const useHideElement = (element: HTMLElement, timeout: number, skipClass?: string) => {
  useEffect(() => {
    console.info('element', element);
    let hide_timeout: number = undefined;
    let isMouseIn: boolean = false;

    const effect = () => {
      if (!element) {
        return;
      }

      const startTimer = () => {
        hide_timeout = window.setTimeout(() => {
          element.classList.add('hide-controls');
        }, timeout);
      };

      element.onmouseenter = () => {
        isMouseIn = true;
        element.classList.remove('hide-controls');
      };

      element.onmouseleave = () => {
        isMouseIn = false;
        if (document.hasFocus()) {
          return element.classList.add('hide-controls');
        }
      };

      element.onmousemove = throttle(({target}: MouseEvent) => {
        if (!isMouseIn) {
          return;
        }
        window.clearTimeout(hide_timeout);
        element.classList.remove('hide-controls');

        let node = target as Element;
        while (node && node !== element) {
          if (node.classList.contains(skipClass)) {
            return;
          }
          node = node.parentNode as Element;
        }
        startTimer();
      }, 500);

      startTimer();
    };

    effect();
    return () => {
      window.clearTimeout(hide_timeout);
    };
  }, [element]);
};

export default useHideElement;
