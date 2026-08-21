export const colors = {
  brand: {
    100: '#DDEDE4',
    600: '#35745A',
    700: '#285A45',
  },
  canvas: '#FAF9F6',
  surface: '#FFFFFF',
  text: {
    primary: '#1D2520',
    secondary: '#58635C',
  },
  border: '#D8DED9',
  focus: '#246BCE',
  status: {
    ok: '#35745A',
    low: '#9A6700',
    out: '#B42318',
    outSurface: '#FFF1F0',
  },
} as const;

export const spacing = {
  1: 4,
  2: 8,
  3: 12,
  4: 16,
  5: 20,
  6: 24,
  8: 32,
  10: 40,
  12: 48,
} as const;

export const radii = {
  control: 8,
  card: 12,
} as const;
