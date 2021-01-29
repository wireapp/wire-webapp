import {useEffect, useRef} from 'react';

const hideControlsClass = 'hide-controls';

const useHideElement = (timeout: number, skipClass?: string) => {
  const ref = useRef<HTMLDivElement>();

  useEffect(() => {
    if (!ref.current) {
      return undefined;
    }

    let hideTimeout: number;
    let isMouseIn: boolean = false;

    const onMouseEnter = () => {
      isMouseIn = true;
      ref.current.classList.remove(hideControlsClass);
    };

    const onMouseLeave = () => {
      isMouseIn = false;
      ref.current.classList.add(hideControlsClass);
    };

    const startTimer = () => {
      hideTimeout = window.setTimeout(() => {
        ref.current.classList.add(hideControlsClass);
      }, timeout);
    };

    const onMouseMove = ({target}: MouseEvent) => {
      if (!isMouseIn) {
        return;
      }

      window.clearTimeout(hideTimeout);
      ref.current.classList.remove(hideControlsClass);

      let node = target as Element;
      while (node && node !== ref.current) {
        if (node.classList.contains(skipClass)) {
          return;
        }
        node = node.parentNode as Element;
      }
      startTimer();
    };

    ref.current.addEventListener('mouseenter', onMouseEnter);
    ref.current.addEventListener('mouseleave', onMouseLeave);
    ref.current.addEventListener('mousemove', onMouseMove);

    startTimer();
    return () => {
      window.clearTimeout(hideTimeout);
      ref.current.removeEventListener('mouseenter', onMouseEnter);
      ref.current.removeEventListener('mouseleave', onMouseLeave);
      ref.current.removeEventListener('mousemove', onMouseMove);
      ref.current.classList.remove(hideControlsClass);
    };
  }, [ref.current]);

  return ref;
};

export default useHideElement;
