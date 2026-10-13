export const colors = {
  gridBackground: '#111',
  tileBackground: '#34373D',
  tileBackgroundHover: '#3d4046',
  activeSpeaker: '#0667C8',
  label: '#fff',
  labelBackground: '#000',
  mutedIcon: '#C20013',
  mutedBadgeBackground: '#fff',
} as const;

export const avatarGradient = (hue: number): string =>
  `linear-gradient(135deg, hsl(${hue} 55% 56%), hsl(${(hue + 28) % 360} 58% 40%))`;

export const initialsFromName = (name: string): string =>
  name
    .split(' ')
    .map(word => word[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
