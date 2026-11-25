// Tujuan kembali setelah login utama: halaman yang memantul ke /auth
// (mis. /admin tanpa sesi) menyimpan tujuannya di sini, lalu AuthView
// mengembalikannya sesudah login berhasil. Pola yang sama dengan
// 'ruas_after_password_change', khusus untuk alur login biasa.
export const AUTH_RETURN_DESTINATION_KEY = 'ruas_after_login_redirect';

// Hanya path internal yang aman: diawali satu '/' (bukan '//' yang bisa
// menjadi URL protocol-relative ke domain lain) dan tanpa backslash.
export function isSafeInternalPath(path: unknown): path is string {
  return typeof path === 'string' && path.startsWith('/') && !path.startsWith('//') && !path.includes('\\');
}

export function saveAuthReturnDestination(path: string): void {
  if (!isSafeInternalPath(path) || path === '/auth') return;
  sessionStorage.setItem(AUTH_RETURN_DESTINATION_KEY, path);
}

// Membaca sekaligus menghapus tujuan tersimpan; nilai yang tidak aman
// dianggap tidak ada supaya tidak pernah menjadi open-redirect.
export function consumeAuthReturnDestination(): string | null {
  const value = sessionStorage.getItem(AUTH_RETURN_DESTINATION_KEY);
  sessionStorage.removeItem(AUTH_RETURN_DESTINATION_KEY);
  return isSafeInternalPath(value) ? value : null;
}
