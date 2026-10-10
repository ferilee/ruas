# Template impor pengguna

Template siap pakai tersedia di:

- [pengguna.csv](templates/pengguna.csv)
- [pengguna.json](templates/pengguna.json)

Keduanya dapat diunduh langsung dari panel **Pengguna → Import pengguna** di `/admin`.

## Format CSV

Header CSV yang didukung:

```csv
username,password,display_name,role,active,class_id,subject_id
```

Contoh satu baris data:

```csv
P130100231,PasswordSementara123!,Budi Santoso,participant,true,2,
```

## Format JSON

JSON dapat berupa array langsung atau objek dengan properti `users`. Format yang disarankan:

```json
{
  "users": [
    {
      "username": "P130100231",
      "password": "PasswordSementara123!",
      "display_name": "Budi Santoso",
      "role": "participant",
      "active": true,
      "class_id": 2,
      "subject_id": null
    }
  ]
}
```

## Keterangan field

| Field | Wajib | Keterangan |
| --- | --- | --- |
| `username` | Ya | Identitas login. Karakter yang diizinkan: huruf, angka, `.`, `_`, `@`, `+`, dan `-`. |
| `password` | Ya | Password awal akun. Password akan di-hash oleh server setelah impor. |
| `display_name` | Ya | Nama yang tampil di aplikasi. |
| `role` | Tidak | `participant` untuk siswa, `editor` untuk pengelola, atau `admin` untuk administrator. Default: `participant`. |
| `active` | Tidak | `true` atau `false`. Default: aktif. |
| `class_id` | Tidak | ID kelas yang sudah ada di database. Kosongkan atau gunakan `null` untuk menetapkan kemudian. |
| `subject_id` | Tidak | ID mata pelajaran yang sudah ada di database. Kosongkan atau gunakan `null` untuk menetapkan kemudian. |

Mode **Tambah baru** melewati username yang sudah ada. Mode **Tambah atau perbarui** memperbarui akun dengan username yang sama.

Password pada file impor adalah password awal. Simpan file secara privat dan hapus setelah impor selesai jika tidak lagi diperlukan.
