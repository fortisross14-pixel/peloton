// Map ISO-style 3-letter country codes used in our app to flag emoji.
// Flags are built from regional indicator unicode codepoints.

const FLAG_BY_CODE: Record<string, string> = {
  BEL: '🇧🇪',
  FRA: '🇫🇷',
  ITA: '🇮🇹',
  ESP: '🇪🇸',
  NED: '🇳🇱',
  GER: '🇩🇪',
  GBR: '🇬🇧',
  COL: '🇨🇴',
  SUI: '🇨🇭',
  DEN: '🇩🇰',
  NOR: '🇳🇴',
  AUS: '🇦🇺',
  SLO: '🇸🇮',
  POR: '🇵🇹',
  AUT: '🇦🇹',
  USA: '🇺🇸',
  CAN: '🇨🇦',
  POL: '🇵🇱',
  KAZ: '🇰🇿',
  IRL: '🇮🇪',
};

export function flagFor(nationality: string | undefined): string {
  if (!nationality) return '';
  return FLAG_BY_CODE[nationality] ?? '';
}
