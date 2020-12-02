import React, {useEffect} from 'react';

const useHideElement = (elementRef: React.MutableRefObject<HTMLElement>, timeout: number, skipClass?: string) => {
  const element = elementRef.current;
  useEffect(() => {
    let hide_timeout: number = undefined;
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
        element.classList.remove('hide-controls');
      };

      element.onmouseleave = () => {
        if (document.hasFocus()) {
          return element.classList.add('hide-controls');
        }
      };

      element.onmousemove = ({target}: MouseEvent) => {
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
      };

      startTimer();
    };

    effect();
    return () => {
      window.clearTimeout(hide_timeout);
    };
  }, [elementRef.current]);
};

export default useHideElement;
