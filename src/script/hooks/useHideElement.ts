import {useEffect, useRef} from 'react';

const hideControlsClass = 'hide-controls';

const useHideElement = (timeout: number, skipClass?: string) => {
  const ref = useRef<HTMLDivElement>();

  useEffect(() => {
    if (!ref.current) {
      return undefined;
    }

    let hideTimeout: number;

    const hideElement = () => ref.current.classList.add(hideControlsClass);

    const startTimer = () => {
      hideTimeout = window.setTimeout(hideElement, timeout);
    };

    const onMouseMove = ({target}: MouseEvent) => {
      window.clearTimeout(hideTimeout);
      ref.current.classList.remove(hideControlsClass);

      if (skipClass) {
        const closest = (target as Element).closest(`.${skipClass}`);
        if (ref.current.contains(closest)) {
          return;
        }
      }

      startTimer();
    };

    ref.current.addEventListener('mouseleave', hideElement);
    ref.current.addEventListener('mousemove', onMouseMove);

    startTimer();
    return () => {
      window.clearTimeout(hideTimeout);
      ref.current.removeEventListener('mouseleave', hideElement);
      ref.current.removeEventListener('mousemove', onMouseMove);
      ref.current.classList.remove(hideControlsClass);
    };
  }, [ref.current]);

  return ref;
};

export default useHideElement;
