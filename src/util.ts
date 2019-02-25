export const noop = () => {};

export const inlineSVG = (svg: string) => `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;

export const filterProps: (props: Object, propsToFilter: string[]) => Object = (props, propsToFilter) => {
  return Object.entries(props).reduce<Object>(
    (accumulator, [key, value]) => (!propsToFilter.includes(key) ? {...accumulator, [key]: value} : accumulator),
    {}
  );
};
