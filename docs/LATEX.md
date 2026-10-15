# Panduan Penulisan LaTeX di RUAS

Dokumen ini menjelaskan cara menulis rumus matematika pada pertanyaan, pilihan jawaban, dan pembahasan soal di RUAS.

## Prinsip dasar

Tulis rumus di antara delimiter LaTeX. Teks di luar delimiter akan tampil sebagai teks biasa.

Untuk rumus pendek yang berada di dalam kalimat, gunakan delimiter inline:

```text
Nilai \(x\) yang memenuhi persamaan \(2x + 5 = 13\) adalah ....
```

Hasilnya akan tampil seperti: Nilai \(x\) yang memenuhi persamaan \(2x + 5 = 13\) adalah ....

Untuk rumus panjang atau rumus yang ingin ditampilkan sebagai satu persamaan, gunakan delimiter blok:

```text
\[
S_5 = \frac{5}{2}(15 + 35) = 125\text{ cm}
\]
```

> Gunakan delimiter blok untuk rumus panjang. Rumus akan ditampilkan pada baris tersendiri dan dapat digeser secara horizontal jika lebih lebar daripada layar.

## Delimiter yang didukung

| Jenis | Delimiter | Contoh |
|---|---|---|
| Inline | `\(...\)` | `\(x^2 + 1\)` |
| Inline alternatif | `$...$` | `$x^2 + 1$` |
| Blok | `\[...\]` | `\[x^2 + y^2 = z^2\]` |
| Blok alternatif | `$$...$$` | `$$x^2 + y^2 = z^2$$` |

Delimiter `\(...\)` dan `\[...\]` direkomendasikan karena lebih jelas ketika teks soal juga berisi tanda dolar.

## Contoh sintaks umum

### Pangkat dan indeks

```text
Pangkat: \(a^2\)
Indeks: \(a_1\)
Pangkat dan indeks: \(U_n = a + (n-1)b\)
```

### Pecahan

```text
\[
x = \frac{-b \pm \sqrt{b^2 - 4ac}}{2a}
\]
```

### Akar

```text
\(\sqrt{49} = 7\)
\(\sqrt[3]{27} = 3\)
```

### Operasi dan simbol

```text
\(a \times b\)
\(a \div b\)
\(a \leq b\)
\(a \neq b\)
\(\pm 5\)
```

### Persamaan panjang

```text
\[
\begin{aligned}
S_n &= \frac{n}{2}(2a + (n-1)b) \\
S_5 &= \frac{5}{2}(2(15) + 4(5)) \\
S_5 &= 125
\end{aligned}
\]
```

### Fungsi

```text
Fungsi eksponensial dapat ditulis sebagai
\[
f(t) = 500 \cdot 2^{3t}
\]
```

### Satuan dan teks di dalam rumus

Gunakan `\text{...}` untuk satuan atau keterangan yang harus tetap terbaca sebagai teks:

```text
\[
v = 20\text{ m/s}, \qquad A = 125\text{ cm}^2
\]
```

## LaTeX pada pilihan jawaban

Pilihan jawaban juga dapat berisi LaTeX. Contoh:

```json
{
  "key": "A",
  "text": "Nilai \\(x\\) adalah \\[x = 4\\]",
  "is_correct": true
}
```

Contoh penulisan yang lebih nyaman pada form admin:

```text
Nilai maksimum fungsi
\[
f(x) = -x^2 + 6x - 5
\]
adalah ....
```

Semua pilihan tetap disimpan sebagai teks. LaTeX dirender ketika pilihan ditampilkan pada halaman ujian.

## LaTeX pada pembahasan

Gunakan delimiter yang sama pada kolom pembahasan:

```text
Gunakan rumus jumlah barisan aritmetika.

\[
S_n = \frac{n}{2}(a + U_n)
\]

Dengan \(n=5\), \(a=15\), dan \(U_5=35\), diperoleh:

\[
S_5 = \frac{5}{2}(15 + 35) = 125
\]
```

## Tips agar tampilan rapi

1. Gunakan `\(...\)` untuk rumus pendek di tengah kalimat.
2. Gunakan `\[...\]` untuk rumus panjang, pecahan, matriks, atau beberapa baris persamaan.
3. Gunakan kurung kurawal untuk membatasi pangkat atau indeks lebih dari satu karakter, misalnya `x^{12}` dan `a_{n+1}`.
4. Gunakan `\text{...}` untuk satuan, misalnya `\text{cm}` atau `\text{sel}`.
5. Beri spasi dan baris baru di luar delimiter agar teks soal mudah dibaca saat diedit.
6. Gunakan preview yang tersedia di editor untuk memeriksa hasil rumus sebelum menyimpan soal.

## Sintaks lama yang masih didukung

RUAS masih mengenali beberapa penulisan lama tanpa delimiter:

```text
akar(100)
c^2
```

Namun, penulisan eksplisit lebih aman dan direkomendasikan:

```text
\(\sqrt{100}\)
\(c^2\)
```

## Kesalahan umum

### Delimiter tidak berpasangan

Salah:

```text
\(x^2 + 1
```

Benar:

```text
\(x^2 + 1\)
```

### Pangkat atau indeks lebih dari satu karakter

Salah:

```text
\(x^12\)
```

Benar:

```text
\(x^{12}\)
```

### Rumus panjang memakai delimiter inline

> Rumus inline yang sangat panjang dapat membuat baris melebar. Gunakan `\[...\]` atau `$$...$$` agar tampil sebagai blok persamaan.

### Backslash hilang saat membuat JSON

Jika soal ditulis dalam JSON, backslash harus di-escape menjadi `\\`:

```json
{
  "text": "Rumusnya adalah \\(x^2 + 1\\)"
}
```

Pada form admin biasa, tulis satu backslash seperti `\(` dan `\)`.
