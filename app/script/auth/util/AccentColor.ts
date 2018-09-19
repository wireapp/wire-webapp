import * as RandomUtil from './randomUtil';

export const STRONG_BLUE = {
  color: '#2391d3',
  id: 1,
  name: 'StrongBlue',
};

export const STRONG_LIME_GREEN = {
  color: '#00c800',
  id: 2,
  name: 'StrongLimeGreen',
};

export const VIVID_RED = {
  color: '#fb0807',
  id: 4,
  name: 'VividRed',
};

export const BRIGHT_ORANGE = {
  color: '#ff8900',
  id: 5,
  name: 'BrightOrange',
};

export const SOFT_PINK = {
  color: '#fe5ebd',
  id: 6,
  name: 'SoftPink',
};

export const VIOLET = {
  color: '#9c00fe',
  id: 7,
  name: 'Violet',
};

export const ACCENT_COLORS = [STRONG_BLUE, STRONG_LIME_GREEN, VIVID_RED, BRIGHT_ORANGE, SOFT_PINK, VIOLET];

export function random() {
  return RandomUtil.randomArrayElement(ACCENT_COLORS);
}
