// Pembangkit token topik acak untuk panel Akses Topik.
// Alfabet sengaja tanpa karakter yang mudah tertukar: I, L, O, 0, dan 1.
export const TOPIC_TOKEN_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
export const TOPIC_TOKEN_LENGTH = 6;

export function generateTopicToken(length: number = TOPIC_TOKEN_LENGTH): string {
  const alphabet = TOPIC_TOKEN_ALPHABET;
  // Penolakan sampel (rejection sampling) agar distribusi seragam:
  // buang byte yang berada di sisa pembagian 256 terhadap panjang alfabet.
  const limit = Math.floor(256 / alphabet.length) * alphabet.length;
  let token = '';
  while (token.length < length) {
    const bytes = new Uint8Array(length - token.length);
    crypto.getRandomValues(bytes);
    for (const byte of bytes) {
      if (byte >= limit) continue;
      token += alphabet[byte % alphabet.length];
      if (token.length === length) break;
    }
  }
  return token;
}
