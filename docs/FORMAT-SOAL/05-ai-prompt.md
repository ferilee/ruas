# Tips Generate Soal dengan AI

## Single Choice

```
Buatkan 5 soal ujian sekolah tipe single_choice tentang Aljabar (Matematika)
dalam format JSON array. Setiap soal punya:
- topic_slug: "aljabar"
- type: "single_choice"  
- difficulty: campur easy/medium/hard
- question_text: isi soal
- explanation_text: pembahasan singkat
- options: 4 opsi (A-D), satu is_correct: true, lainnya false

Langsung format JSON saja, tanpa penjelasan lain.
```

## Multiple Response

```
Buatkan 3 soal ujian sekolah tipe multiple_response tentang Penalaran Umum.
Setiap soal punya 4 opsi, 2-3 di antaranya benar.
Output dalam format JSON array questions.
```
