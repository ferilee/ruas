// Jembatan sesi serah-terima SIMAK -> RUAS (Hub Murid Tahap 2).
// Rute penukaran di backend mengalihkan peramban ke halaman tujuan dengan
// token sesi RUAS pada fragmen URL ("#simak-sesi=<token>"). Fragmen tidak
// pernah dikirim ke server. Fungsi ini — dipanggil paling awal saat
// aplikasi dimuat, sebelum router memeriksa sesi — memindahkan token itu
// ke sessionStorage (kunci yang sama dengan login biasa) lalu membersihkan
// fragmen dari bilah alamat.

export const SESSION_BRIDGE_FRAGMENT_KEY = 'simak-sesi';
export const AUTH_TOKEN_STORAGE_KEY = 'auth_token';

export function extractBridgeSessionToken(hash: string): string | null {
  if (!hash || !hash.startsWith('#')) return null;
  const params = new URLSearchParams(hash.slice(1));
  const token = params.get(SESSION_BRIDGE_FRAGMENT_KEY);
  return token && token.trim().length > 0 ? token : null;
}

export function consumeSessionBridge(): boolean {
  const token = extractBridgeSessionToken(window.location.hash);
  if (!token) return false;

  sessionStorage.setItem(AUTH_TOKEN_STORAGE_KEY, token);

  const url = new URL(window.location.href);
  url.hash = '';
  window.history.replaceState(null, '', url.toString());
  return true;
}
