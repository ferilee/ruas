<template>
  <div class="support-page">
    <section class="support-hero">
      <span class="eyebrow">RUAS · RUANG ASESMEN</span>
      <h1>Dukung RUAS tetap <em>gratis</em> untuk semua guru.</h1>
      <p class="support-lede">
        RUAS dibuat agar guru dan sekolah bisa menyiapkan asesmen yang bermakna tanpa
        terbebani biaya. Dukungan Anda menjaga ruang ini tetap hidup dan tetap gratis
        untuk semua.
      </p>
      <p class="support-tagline">“Satu ruang tenang untuk menyiapkan asesmen yang bermakna.”</p>
      <div class="support-actions">
        <a class="support-primary" href="https://teer.id/ruangasesmen" target="_blank" rel="noopener noreferrer">
          <span aria-hidden="true">♥</span> Dukung via Trakteer <span aria-hidden="true">→</span>
        </a>
        <router-link class="support-secondary" to="/tentang">Kenali RUAS dulu <span aria-hidden="true">→</span></router-link>
      </div>
      <p class="support-micro">Patungan sukarela lewat Trakteer — bisa dengan QRIS, e-wallet, atau transfer bank.</p>
    </section>

    <section class="support-section" aria-labelledby="why-support-title">
      <div class="section-heading">
        <span class="eyebrow">PEGANGAN RUAS</span>
        <h2 id="why-support-title">Kenapa ada patungan?</h2>
      </div>
      <div class="support-copy">
        <p>
          Di balik layar, RUAS berjalan dengan biaya nyata: <strong>domain</strong> agar
          alamatnya tetap bisa diakses, <strong>hosting</strong> agar aplikasi selalu
          menyala, dan <strong>token AI</strong> untuk fitur-fitur cerdasnya. Selama ini
          biaya itu ditanggung sendiri oleh pengembangnya.
        </p>
        <p>Patungan ini dibuka supaya RUAS bisa terus berjalan dan berkembang dengan tiga pegangan yang tidak berubah.</p>
      </div>
      <ul class="principles">
        <li v-for="principle in principles" :key="principle.title">
          <span class="principle-icon" aria-hidden="true">{{ principle.icon }}</span>
          <div><h3>{{ principle.title }}</h3><p>{{ principle.description }}</p></div>
        </li>
      </ul>
    </section>

    <section class="support-section" aria-labelledby="cost-title">
      <div class="section-heading">
        <span class="eyebrow">TRANSPARANSI OPERASIONAL</span>
        <h2 id="cost-title">Biaya yang ditanggung.</h2>
      </div>
      <p class="section-intro">Berikut rancangan anggaran operasional RUAS. Pilih tampilan per bulan atau per tahun untuk melihat kebutuhannya.</p>
      <div class="cost-card">
        <div class="period-toggle" role="group" aria-label="Periode biaya">
          <button type="button" :aria-pressed="period === 'month'" @click="period = 'month'">Per bulan</button>
          <button type="button" :aria-pressed="period === 'year'" @click="period = 'year'">Per tahun</button>
        </div>
        <div class="cost-table-wrap">
          <table class="costs">
            <thead><tr><th scope="col">Kebutuhan</th><th scope="col" class="amount">Biaya</th></tr></thead>
            <tbody>
              <tr v-for="item in costs" :key="item.name" :class="item.kind">
                <td>{{ item.name }}<span class="note">{{ item.note }}</span></td>
                <td class="amount">{{ item[period] }}</td>
              </tr>
            </tbody>
          </table>
        </div>
        <div class="goal-note">Target patungan di Trakteer dipasang <strong>Rp300.000 per bulan</strong> — sedikit di atas total kebutuhan sebagai ruang napas agar RUAS tidak berhenti di tengah jalan.</div>
        <p class="fineprint">Rancangan anggaran berdasarkan harga pasar per Oktober 2026 dan akan diperbarui bila ada perubahan biaya.</p>
      </div>
    </section>

    <section class="support-section" aria-labelledby="how-title">
      <div class="section-heading"><span class="eyebrow">LANGKAHNYA SEDERHANA</span><h2 id="how-title">Cara mendukung.</h2></div>
      <ol class="steps">
        <li v-for="(step, index) in steps" :key="step.title">
          <span class="step-number">0{{ index + 1 }}</span>
          <div><h3>{{ step.title }}</h3><p v-html="step.description"></p></div>
        </li>
      </ol>
      <a class="support-primary" href="https://teer.id/ruangasesmen" target="_blank" rel="noopener noreferrer">Traktir Cendol untuk RUAS <span aria-hidden="true">→</span></a>
    </section>

    <section class="support-section" aria-labelledby="supporters-title">
      <div class="section-heading"><span class="eyebrow">TERIMA KASIH</span><h2 id="supporters-title">Para pendukung.</h2></div>
      <p class="section-intro">Setiap pendukung yang berkenan akan dicantumkan namanya di sini sebagai tanda terima kasih, bukan sebagai pemilik hak istimewa apa pun.</p>
      <div class="supporters-empty"><strong>Jadilah yang pertama.</strong><p>Daftar pendukung masih kosong. Nama Anda bisa menjadi yang pertama tertulis di ruang ini.</p></div>
    </section>

    <section class="support-closing">
      <p>RUAS dibangun oleh seorang guru, untuk guru-guru lainnya. Setiap dukungan — besar atau kecil — adalah bahan bakar agar ruang ini tetap tenang, rapi, dan terbuka untuk siapa saja yang ingin menyiapkan asesmen yang bermakna.</p>
      <p class="support-sign">Terima kasih sudah menjadi bagian dari ruang ini. — Pengembang RUAS</p>
    </section>

    <footer class="support-footer">
      <span>RUAS · Ruang Asesmen</span>
      <router-link to="/tentang">Tentang RUAS</router-link>
      <a href="https://teer.id/ruangasesmen" target="_blank" rel="noopener noreferrer">teer.id/ruangasesmen</a>
    </footer>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';

type Period = 'month' | 'year';
type Cost = { name: string; note: string; month: string; year: string; kind?: 'subtotal' | 'total' };

const period = ref<Period>('month');

const principles = [
  { icon: '♡', title: 'Sukarela, bukan harga', description: 'Ini bukan langganan dan bukan tiket masuk. Beri seikhlasnya, kapan pun berkenan — atau tidak sama sekali, juga tidak apa-apa.' },
  { icon: '✓', title: 'Tidak ada fitur yang dikunci', description: 'Yang belum bisa ikut patungan tetap memakai RUAS seperti biasa, dengan fitur yang sama lengkapnya. Gratis artinya gratis untuk semua.' },
  { icon: '◌', title: 'Terbuka soal biaya', description: 'Rincian kebutuhan RUAS ditampilkan apa adanya di halaman ini, supaya setiap rupiah yang masuk jelas peruntukannya.' },
];

const costs: Cost[] = [
  { name: 'Domain', note: 'Alamat resmi RUAS agar tetap bisa diakses', month: 'Rp10 rb', year: 'Rp100 rb' },
  { name: 'Hosting (VPS)', note: 'Server 2 vCPU / 4 GB RAM tempat RUAS berjalan', month: 'Rp125 rb', year: 'Rp1,5 jt' },
  { name: 'Token AI', note: 'Fitur cerdas RUAS — naik-turun mengikuti pemakaian', month: 'Rp100 rb', year: 'Rp1,2 jt' },
  { name: 'Backup & penyimpanan', note: 'Cadangan data di luar server utama', month: 'Rp15 rb', year: 'Rp180 rb' },
  { name: 'SSL & email', note: 'Sertifikat keamanan dan kuota layanan gratis', month: 'Rp0', year: 'Rp0' },
  { name: 'Subtotal', note: '', month: 'Rp250 rb', year: 'Rp3 jt', kind: 'subtotal' },
  { name: 'Cadangan tak terduga', note: '±10% untuk lonjakan token atau kenaikan harga', month: 'Rp25 rb', year: 'Rp300 rb' },
  { name: 'Total kebutuhan', note: '', month: '±Rp275 rb', year: '±Rp3,3 jt', kind: 'total' },
];

const steps = [
  { title: 'Klik tombol dukung', description: 'Tombol di halaman ini mengarah ke halaman Trakteer resmi RUAS di <strong>teer.id/ruangasesmen</strong>.' },
  { title: 'Isi seikhlasnya', description: 'Dukungan dihitung per satuan “Cendol”. Satu Cendol pun berarti — sebesar harga segelas cendol, Anda sudah ikut menjaga RUAS tetap menyala.' },
  { title: 'Selesai — RUAS tetap gratis', description: 'Tidak ada imbalan fitur dan tidak ada kewajiban berulang. Cukup terima kasih yang sebesar-besarnya dari kami.' },
];
</script>

<style scoped>
:global(.support-shell .landing-header) { border-bottom-color: rgba(35, 48, 75, .12); background: rgba(246, 243, 236, .88); }
:global(.support-shell .landing-header .app-logo) { color: #182842; }
:global(.support-shell .landing-header .brand-mark) { border-color: rgba(255, 255, 255, .9); background: #fffdf8; box-shadow: 0 8px 20px rgba(83, 68, 45, .12); }
:global(.support-shell .landing-header .brand-mark svg) { stroke: #5b3cc4; }
:global(.support-shell .landing-header .brand-copy small), :global(.support-shell .landing-header .landing-link), :global(.support-shell .landing-header .support-link), :global(.support-shell .landing-header .admin-link) { color: #746f85; }
:global(.support-shell .landing-header .landing-link) { border-color: rgba(91, 60, 196, .18); background: rgba(255, 255, 255, .56); }
:global(.support-shell .landing-header .landing-link:hover), :global(.support-shell .landing-header .support-link:hover), :global(.support-shell .landing-header .admin-link:hover) { color: #5b3cc4; }
.support-page { width: min(100% - 48px, 980px); margin: 0 auto; padding: 62px 0 28px; color: #243047; }
.support-hero { padding: 32px 0 48px; }
.eyebrow { color: #6c4ec4; font-size: .68rem; font-weight: 800; letter-spacing: .16em; }
h1, h2 { color: #19233b; letter-spacing: -.045em; line-height: 1.08; }
h1 { max-width: 760px; margin-top: 18px; font-size: clamp(2.7rem, 6vw, 4.8rem); font-weight: 800; }
h1 em { color: #6c4ec4; font-style: normal; }
.support-lede { max-width: 700px; margin-top: 25px; color: #687184; font-size: 1rem; line-height: 1.85; }
.support-tagline { margin-top: 16px; color: #7d7e8a; font-family: Georgia, serif; font-size: 1rem; font-style: italic; }
.support-actions { display: flex; flex-wrap: wrap; gap: 12px; margin-top: 30px; }
.support-primary, .support-secondary { display: inline-flex; min-height: 47px; align-items: center; justify-content: center; gap: 11px; padding: 0 19px; border-radius: 12px; font-size: .78rem; font-weight: 800; text-decoration: none; transition: transform .18s ease, box-shadow .18s ease, border-color .18s ease; }
.support-primary { color: #fff; background: #5b3cc4; box-shadow: 0 12px 24px rgba(91, 60, 196, .2); }.support-primary:hover { transform: translateY(-2px); background: #4b2fae; box-shadow: 0 14px 28px rgba(91, 60, 196, .25); }
.support-secondary { border: 1px solid rgba(91, 60, 196, .24); color: #5b3cc4; background: rgba(255, 255, 255, .6); }.support-secondary:hover { transform: translateY(-2px); border-color: #8d76d7; }
.support-micro { margin-top: 14px; color: #85899a; font-size: .7rem; }
.support-section { padding: 78px 0; border-top: 1px solid rgba(71, 70, 76, .16); }.section-heading h2 { margin-top: 13px; font-size: clamp(1.9rem, 3.5vw, 2.8rem); }.support-copy { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 34px; margin-top: 26px; }.support-section p { color: #697184; font-size: .86rem; line-height: 1.8; }.support-section strong { color: #29344c; }
.principles { display: grid; gap: 12px; margin-top: 28px; padding: 0; list-style: none; }.principles li { display: flex; gap: 15px; padding: 18px 20px; border: 1px solid rgba(255, 255, 255, .9); border-radius: 16px; background: rgba(255, 255, 255, .62); box-shadow: 7px 10px 22px rgba(91, 79, 66, .05); }.principle-icon { display: grid; width: 32px; height: 32px; flex: 0 0 auto; place-items: center; border-radius: 10px; color: #fff; background: #6c4ec4; font-weight: 800; }.principles h3, .steps h3 { color: #29344c; font-size: .9rem; }.principles p { margin-top: 4px; font-size: .76rem; }
.section-intro { max-width: 720px; margin-top: 22px; }.cost-card { margin-top: 28px; padding: 18px 24px 23px; border: 1px solid rgba(255, 255, 255, .9); border-radius: 20px; background: rgba(255, 255, 255, .62); box-shadow: 12px 18px 32px rgba(91, 79, 66, .07); }.period-toggle { display: inline-flex; gap: 3px; padding: 4px; border-radius: 999px; background: #eee9fb; }.period-toggle button { padding: 8px 17px; border: 0; border-radius: 999px; color: #85899a; background: transparent; cursor: pointer; font: inherit; font-size: .72rem; font-weight: 800; }.period-toggle button[aria-pressed='true'] { color: #29344c; background: #fff; box-shadow: 0 2px 8px rgba(30, 42, 68, .1); }.cost-table-wrap { overflow-x: auto; }.costs { width: 100%; min-width: 540px; margin-top: 13px; border-collapse: collapse; }.costs th, .costs td { padding: 13px 4px; border-bottom: 1px solid #e3e0e8; text-align: left; vertical-align: top; }.costs th { color: #85899a; font-size: .62rem; letter-spacing: .1em; text-transform: uppercase; }.costs .amount { text-align: right; white-space: nowrap; }.costs td { color: #435069; font-size: .78rem; }.costs .note { display: block; margin-top: 2px; color: #85899a; font-size: .66rem; }.costs tr.subtotal td, .costs tr.total td { color: #29344c; font-weight: 800; }.costs tr.total td { padding-top: 17px; border-bottom: 0; font-size: .95rem; }.costs tr.total .amount { color: #5b3cc4; }.goal-note { margin-top: 18px; padding: 14px 17px; border-radius: 12px; color: #4f3e82; background: #eee9fb; font-size: .76rem; line-height: 1.7; }.goal-note strong { color: #4f3e82; }.fineprint { margin-top: 13px; color: #85899a !important; font-size: .68rem !important; }
.steps { display: grid; gap: 12px; margin: 27px 0 28px; padding: 0; list-style: none; }.steps li { display: flex; gap: 16px; padding: 17px 20px; border: 1px solid rgba(255, 255, 255, .9); border-radius: 16px; background: rgba(255, 255, 255, .62); }.step-number { display: grid; width: 34px; height: 34px; flex: 0 0 auto; place-items: center; border-radius: 50%; color: #5b3cc4; background: #eee9fb; font-size: .7rem; font-weight: 800; }.steps p { margin-top: 4px; font-size: .76rem; }.supporters-empty { margin-top: 27px; padding: 31px 24px; border: 1.5px dashed #cfc7e7; border-radius: 17px; text-align: center; background: rgba(255, 255, 255, .34); }.supporters-empty strong { display: block; color: #29344c; font-family: Georgia, serif; font-size: 1.05rem; }.supporters-empty p { margin-top: 5px; font-size: .76rem; }
.support-closing { margin: 0 0 62px; padding: 31px 29px; border-radius: 21px; background: #2b2742; box-shadow: 16px 20px 40px rgba(52, 44, 74, .16); }.support-closing p { color: #d6d1e6; font-size: .82rem; line-height: 1.8; }.support-closing .support-sign { margin-top: 14px; color: #f1eff8; font-family: Georgia, serif; font-size: .95rem; font-style: italic; }
.support-footer { display: flex; flex-wrap: wrap; justify-content: space-between; gap: 8px 22px; padding: 22px 0 34px; border-top: 1px solid rgba(71, 70, 76, .16); color: #7d7e87; font-size: .7rem; }.support-footer a { color: #596275; font-weight: 700; text-decoration: none; }.support-footer a:hover { color: #5b3cc4; }
@media (max-width: 700px) { .support-page { width: min(100% - 32px, 980px); padding-top: 37px; }.support-hero { padding-bottom: 39px; }.support-copy { grid-template-columns: 1fr; gap: 0; }.support-section { padding: 60px 0; }.cost-card { padding: 16px; }.support-closing { margin-bottom: 42px; padding: 26px 22px; } }
@media (max-width: 520px) { .support-actions { align-items: stretch; flex-direction: column; }.support-primary, .support-secondary { width: 100%; }.support-footer { flex-direction: column; }.support-hero h1 { font-size: 2.65rem; }.principles li, .steps li { padding: 16px; } }
</style>
