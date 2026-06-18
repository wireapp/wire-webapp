export interface MockPerson {
  id: string;
  name: string;
  avatarUrl: string;   // square crop for avatar circles (empty = gradient only)
  cameraUrl: string;   // landscape crop for camera-on full-tile view
  screenshareUrl: string;
}

// Stable Unsplash portrait photo IDs
const PORTRAIT_PHOTOS: {name: string; photoId: string}[] = [
  {name: 'Alex',    photoId: 'photo-1535713875002-d1d0cf377fde'},
  {name: 'Jordan',  photoId: 'photo-1494790108377-be9c29b29330'},
  {name: 'Sam',     photoId: 'photo-1507003211169-0a1dd7228f2d'},
  {name: 'Riley',   photoId: 'photo-1438761681033-6461ffad8d80'},
  {name: 'Quinn',   photoId: 'photo-1500648767791-00dcc994a43e'},
  {name: 'Morgan',  photoId: 'photo-1534528741775-53994a69daeb'},
  {name: 'Taylor',  photoId: 'photo-1527980965255-d3b416303d12'},
  {name: 'Casey',   photoId: 'photo-1544005313-94ddf0286df2'},
  {name: 'Drew',    photoId: 'photo-1531746020798-e6953c6e8e04'},
  {name: 'Avery',   photoId: 'photo-1552058544-f2b08422138a'},
  {name: 'Blake',   photoId: 'photo-1519345182560-3f2917c472ef'},
  {name: 'Rowan',   photoId: 'photo-1560250097-0b93528c311a'},
  {name: 'Jamie',   photoId: 'photo-1547425260-76bcadfb4f2c'},
  {name: 'Lee',     photoId: 'photo-1506794778202-cad84cf45f1d'},
  {name: 'Dylan',   photoId: 'photo-1554151228-14d9def656e4'},
  {name: 'Cameron', photoId: 'photo-1580489944761-15a19d654956'},
  {name: 'Peyton',  photoId: 'photo-1607746882042-944635dfe10e'},
  {name: 'Emery',   photoId: 'photo-1573496359142-b8d87734a5a2'},
  {name: 'Ash',     photoId: 'photo-1531427186611-ecfd6d936c79'},
  {name: 'Sage',    photoId: 'photo-1499952127939-9bbf5af6c51c'},
  {name: 'River',   photoId: 'photo-1508214751196-bcfd4ca60f91'},
  {name: 'Sunny',   photoId: 'photo-1517841905240-472988babdf9'},
  {name: 'Phoenix', photoId: 'photo-1463453091185-61582044d556'},
  {name: 'Kai',     photoId: 'photo-1519085360753-af0119f7cbe7'},
  {name: 'Shiloh',  photoId: 'photo-1487222477894-8943e31ef7b2'},
];

// Remaining 25 gradient-only (no photo — hue distinguishes them visually)
const GRADIENT_ONLY: string[] = [
  'Finley', 'Spencer', 'Remy', 'Jesse', 'Arlo',
  'Wren', 'Ellis', 'Reese', 'Kit', 'Lane',
  'Ezra', 'Zion', 'Lyric', 'Hadley', 'Frankie',
  'Nova', 'Rio', 'Crew', 'Sable', 'Fox',
  'Blaze', 'Cedar', 'Indigo', 'Onyx', 'Slate',
];

const UNSPLASH_SCREENS = [
  'photo-1461749280684-dccba630e2f6',
  'photo-1555066931-4365d14bab8c',
  'photo-1587620962725-abab7fe55159',
  'photo-1516321318423-f06f85e504b3',
];

function makeId(name: string, idx: number): string {
  return `mock-${idx}-${name.toLowerCase()}`;
}

export const MOCK_PEOPLE: MockPerson[] = [
  ...PORTRAIT_PHOTOS.map((p, i) => ({
    id: makeId(p.name, i),
    name: p.name,
    avatarUrl: `https://images.unsplash.com/${p.photoId}?w=320&h=320&fit=crop&auto=format`,
    cameraUrl: `https://images.unsplash.com/${p.photoId}?w=640&h=480&fit=crop&auto=format`,
    screenshareUrl: `https://images.unsplash.com/${UNSPLASH_SCREENS[i % UNSPLASH_SCREENS.length]}?w=1280&h=720&fit=crop&auto=format`,
  })),
  ...GRADIENT_ONLY.map((name, i) => ({
    id: makeId(name, PORTRAIT_PHOTOS.length + i),
    name,
    avatarUrl: '',
    cameraUrl: '',
    screenshareUrl: `https://images.unsplash.com/${UNSPLASH_SCREENS[i % UNSPLASH_SCREENS.length]}?w=1280&h=720&fit=crop&auto=format`,
  })),
];
