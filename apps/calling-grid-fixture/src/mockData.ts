export interface MockPerson {
  id: string;
  name: string;
  avatarUrl: string;
  screenshareUrl: string;
}

// Curated stable Unsplash photo IDs (portrait / desktop screenshots)
const UNSPLASH_PORTRAITS: {id: string; name: string}[] = [
  {id: 'photo-1535713875002-d1d0cf377fde', name: 'Alex'},
  {id: 'photo-1494790108377-be9c29b29330', name: 'Jordan'},
  {id: 'photo-1507003211169-0a1dd7228f2d', name: 'Sam'},
  {id: 'photo-1438761681033-6461ffad8d80', name: 'Riley'},
  {id: 'photo-1500648767791-00dcc994a43e', name: 'Quinn'},
  {id: 'photo-1534528741775-53994a69daeb', name: 'Morgan'},
  {id: 'photo-1527980965255-d3b416303d12', name: 'Taylor'},
  {id: 'photo-1544005313-94ddf0286df2', name: 'Casey'},
  {id: 'photo-1531746020798-e6953c6e8e04', name: 'Drew'},
  {id: 'photo-1552058544-f2b08422138a', name: 'Avery'},
  {id: 'photo-1519345182560-3f2917c472ef', name: 'Blake'},
  {id: 'photo-1560250097-0b93528c311a', name: 'Rowan'},
];

const UNSPLASH_SCREENS = [
  'photo-1461749280684-dccba630e2f6',
  'photo-1555066931-4365d14bab8c',
  'photo-1587620962725-abab7fe55159',
  'photo-1516321318423-f06f85e504b3',
];

function avatarUrl(photoId: string): string {
  return `https://images.unsplash.com/${photoId}?w=320&h=320&fit=crop&auto=format`;
}

function screenshareUrl(photoId: string): string {
  return `https://images.unsplash.com/${photoId}?w=1280&h=720&fit=crop&auto=format`;
}

export const MOCK_PEOPLE: MockPerson[] = UNSPLASH_PORTRAITS.map((p, i) => ({
  id: `mock-${p.id.split('-')[1]}`,
  name: p.name,
  avatarUrl: avatarUrl(p.id),
  screenshareUrl: screenshareUrl(UNSPLASH_SCREENS[i % UNSPLASH_SCREENS.length]),
}));
