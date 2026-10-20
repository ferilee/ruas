<template>
  <div class="landing-page">
    <section class="landing-hero">
      <div class="hero-copy">
        <span class="eyebrow">RUAS · RUANG ASESMEN</span>
        <h1>Satu ruang tenang untuk menyiapkan asesmen yang bermakna.</h1>
        <p>RUAS membantu Admin, Guru, dan Siswa menjalani seluruh proses asesmen dengan alur yang jelas—dari menyiapkan soal hingga membaca hasilnya.</p>
        <div class="hero-actions">
          <router-link to="/auth" class="landing-primary">Masuk ke RUAS <span>→</span></router-link>
          <router-link to="/ajukan-guru" class="landing-secondary">Saya Guru, ingin mendaftar <span>→</span></router-link>
          <router-link to="/auth?demo=1" class="landing-text-link">Coba demo</router-link>
        </div>
        <div class="hero-meta"><span><b>01</b> Rapi</span><span><b>02</b> Terarah</span><span><b>03</b> Terpantau</span></div>
      </div>

      <div class="hero-preview" aria-label="Pratinjau Ruang Asesmen">
        <div class="preview-top"><span class="preview-dot"></span><span>RUAS · DASHBOARD</span><span class="preview-status">● Live aktif</span></div>
        <div class="preview-title"><span>Ringkasan kelas XI TKJ</span><strong>Belajar lebih terpantau.</strong></div>
        <div class="preview-stats"><div><strong>12</strong><small>Topik aktif</small></div><div><strong>86%</strong><small>Rata-rata skor</small></div></div>
        <div class="preview-chart"><span v-for="height in [38, 54, 46, 72, 62, 84, 76]" :key="height" :style="{ height: `${height}%` }"></span></div>
        <div class="preview-row"><span><i></i> Asesmen Matematika</span><b>Sedang berlangsung</b></div>
        <div class="preview-row"><span><i class="violet"></i> Laporan kelas XI</span><b class="soft">Siap ditinjau</b></div>
        <div class="preview-note"><span>✓</span> 18 siswa menyelesaikan asesmen</div>
      </div>
    </section>

    <section class="landing-section intro-section">
      <div class="section-heading"><span class="eyebrow">SATU RUANG UNTUK ASESMEN</span><h2>Persiapan yang rapi membuat proses belajar lebih berarti.</h2></div>
      <p>Mulai dari struktur kelas, bank soal, token, jadwal, sampai laporan hasil. Setiap bagian memiliki tempatnya sendiri dan tetap terhubung dalam satu pengalaman yang mudah dipahami.</p>
    </section>

    <section class="landing-section feature-section" aria-labelledby="feature-title">
      <div class="section-heading"><span class="eyebrow">FITUR UTAMA</span><h2 id="feature-title">Dibangun untuk pekerjaan asesmen sehari-hari.</h2></div>
      <div class="feature-grid">
        <article v-for="feature in features" :key="feature.title" class="feature-card"><span class="feature-icon">{{ feature.icon }}</span><h3>{{ feature.title }}</h3><p>{{ feature.description }}</p></article>
      </div>
    </section>

    <section class="landing-section audience-section" aria-labelledby="audience-title">
      <div class="section-heading"><span class="eyebrow">UNTUK SETIAP PERAN</span><h2 id="audience-title">Satu platform, tiga pengalaman yang saling melengkapi.</h2></div>
      <div class="audience-grid">
        <article class="audience-card audience-admin"><span class="audience-number">01</span><h3>Admin</h3><p>Menata struktur sekolah, pengguna, akses Guru, dan keseluruhan asesmen.</p><router-link to="/admin">Kelola ruang →</router-link></article>
        <article class="audience-card audience-teacher"><span class="audience-number">02</span><h3>Guru</h3><p>Membuat topik dan soal, mengatur ujian, lalu membaca perkembangan siswa.</p><router-link to="/ajukan-guru">Mulai sebagai Guru →</router-link></article>
        <article class="audience-card audience-student"><span class="audience-number">03</span><h3>Siswa</h3><p>Mengerjakan asesmen dengan alur yang jelas dan meninjau hasil sesuai kebijakan.</p><router-link to="/auth">Masuk sebagai Siswa →</router-link></article>
      </div>
    </section>

    <section v-if="testimonials.length" class="landing-section testimonial-section" aria-labelledby="testimonial-title">
      <div class="section-heading"><span class="eyebrow">CERITA DARI RUANG KERJA</span><h2 id="testimonial-title">Pengalaman guru menggunakan RUAS.</h2></div>
      <div class="testimonial-grid">
        <article v-for="testimonial in testimonials" :key="testimonial.id" class="testimonial-card">
          <span class="testimonial-mark" aria-hidden="true">“</span>
          <p>{{ testimonial.message }}</p>
          <footer><strong>{{ testimonial.display_name }}</strong><span>{{ testimonial.role_label }}</span></footer>
        </article>
      </div>
    </section>

    <section class="landing-section flow-section" aria-labelledby="flow-title">
      <div class="section-heading"><span class="eyebrow">ALUR KERJA</span><h2 id="flow-title">Mulai dari pengaturan hingga laporan.</h2></div>
      <div class="flow-grid"><article v-for="(step, index) in steps" :key="step.title" class="flow-step"><span class="step-number">0{{ index + 1 }}</span><h3>{{ step.title }}</h3><p>{{ step.description }}</p></article></div>
    </section>

    <section id="layanan" class="landing-section service-section" aria-labelledby="service-title">
      <div class="service-copy"><span class="eyebrow">LAYANAN PENGEMBANGAN</span><h2 id="service-title">Bangun ruang asesmen yang sesuai dengan cara kerja sekolah Anda.</h2><p>Saya membantu sekolah dan lembaga pendidikan membangun aplikasi dengan alur, identitas visual, dan kebutuhan pengelolaan yang dapat disesuaikan.</p><a href="https://rakitapp.ferilee.gurumuda.eu.org/" class="landing-primary" target="_blank" rel="noopener noreferrer">Diskusikan kebutuhan Anda <span>→</span></a></div>
      <div class="service-points"><div v-for="point in servicePoints" :key="point"><span>✓</span>{{ point }}</div></div>
    </section>

    <section id="kontak" class="landing-cta"><div><span class="eyebrow">RUANG UNTUK BERTUMBUH</span><h2>Siap membuat asesmen terasa lebih terarah?</h2></div><router-link to="/auth" class="landing-secondary light">Masuk ke aplikasi →</router-link></section>
    <footer class="landing-footer"><span>RUAS · Ruang Asesmen</span><span>Belajar, berlatih, berkembang dengan terarah.</span></footer>
    <button class="scroll-progress" :class="{ 'at-bottom': atBottom }" type="button" :style="atBottom ? undefined : { background: `conic-gradient(#2d82df ${scrollProgress}%, rgba(255, 255, 255, .45) 0)` }" :aria-label="atBottom ? 'Kembali ke atas' : `Posisi halaman ${scrollProgress}%`" @click="handleScrollAction">
      <span v-if="!atBottom">{{ scrollProgress }}%</span>
      <span v-else aria-hidden="true">↑</span>
    </button>
  </div>
</template>

<script setup lang="ts">
import { onMounted, onUnmounted, ref } from 'vue';
import { fetchPublicTestimonials } from '@/api/client';
import type { PublicTestimonial } from '@/types';

const scrollProgress = ref(0);
const atBottom = ref(false);
const testimonials = ref<PublicTestimonial[]>([]);

function updateScrollProgress() {
  const documentHeight = document.documentElement.scrollHeight - window.innerHeight;
  const progress = documentHeight <= 0 ? 100 : Math.round((window.scrollY / documentHeight) * 100);
  scrollProgress.value = Math.min(100, Math.max(0, progress));
  atBottom.value = scrollProgress.value >= 100;
}

function handleScrollAction() {
  if (atBottom.value) window.scrollTo({ top: 0, behavior: 'smooth' });
}

onMounted(() => {
  updateScrollProgress();
  void fetchPublicTestimonials().then((items) => { testimonials.value = items; }).catch(() => undefined);
  window.addEventListener('scroll', updateScrollProgress, { passive: true });
  window.addEventListener('resize', updateScrollProgress);
});

onUnmounted(() => {
  window.removeEventListener('scroll', updateScrollProgress);
  window.removeEventListener('resize', updateScrollProgress);
});

const features = [
  { icon: '▦', title: 'Kurikulum terstruktur', description: 'Kelola kelas, jenis asesmen, mata pelajaran, dan topik dengan rapi.' },
  { icon: '?', title: 'Bank soal fleksibel', description: 'Buat, impor, acak, dan atur pembahasan soal sesuai kebutuhan.' },
  { icon: '◷', title: 'Jadwal per topik', description: 'Tentukan kapan setiap topik dapat dikerjakan oleh peserta.' },
  { icon: '▤', title: 'Laporan bermakna', description: 'Lihat hasil, analisis per soal, statistik kelas, dan ekspor laporan.' },
  { icon: '⌁', title: 'Perlindungan ujian', description: 'Catat aktivitas perpindahan tab, fullscreen, dan kejadian lain.' },
  { icon: '◎', title: 'Siap di berbagai perangkat', description: 'Tampilan responsif untuk komputer, tablet, dan perangkat iOS.' },
];

const steps = [
  { title: 'Atur struktur', description: 'Admin menyiapkan kelas, peserta, mata pelajaran, dan topik.' },
  { title: 'Siapkan asesmen', description: 'Soal, token, jadwal, durasi, dan aturan ujian dikonfigurasi.' },
  { title: 'Siswa mengerjakan', description: 'Peserta mengikuti asesmen dengan alur yang jelas dan aman.' },
  { title: 'Tinjau hasil', description: 'Guru membaca laporan dan menentukan tindak lanjut pembelajaran.' },
];

const servicePoints = ['Alur aplikasi sesuai kebutuhan sekolah', 'Dashboard admin dan laporan hasil', 'Dukungan pengembangan bertahap', 'Identitas visual yang dapat disesuaikan'];
</script>

<style scoped>
:global(.landing-header) {
  max-width: 1180px;
  margin: 0 auto;
  padding: 18px 28px;
  border-bottom-color: rgba(35, 48, 75, .12);
  background: rgba(246, 243, 236, .88);
}
:global(.landing-header .app-logo) { color: #182842; }
:global(.landing-header .brand-mark) { border-color: rgba(255, 255, 255, .9); background: #fffdf8; box-shadow: 0 8px 20px rgba(83, 68, 45, .12); }
:global(.landing-header .brand-mark svg) { stroke: #5b3cc4; }
:global(.landing-header .brand-copy small), :global(.landing-header .landing-link), :global(.landing-header .admin-link) { color: #746f85; }
:global(.landing-header .landing-link) { border-color: rgba(91, 60, 196, .18); background: rgba(255, 255, 255, .56); }
:global(.landing-header .landing-link:hover), :global(.landing-header .admin-link:hover) { color: #5b3cc4; }

.landing-page { overflow: hidden; color: #243047; background: #f6f3ec; }
.landing-hero, .landing-section, .landing-cta, .landing-footer { width: min(100% - 48px, 1160px); margin: 0 auto; }
.landing-hero { display: grid; min-height: 650px; grid-template-columns: minmax(0, 1.02fr) minmax(360px, .78fr); align-items: center; gap: 84px; padding: 82px 0 105px; }
.hero-copy { position: relative; z-index: 1; }
.eyebrow { color: #6c4ec4; font-size: .68rem; font-weight: 800; letter-spacing: .16em; }
.hero-copy h1 { max-width: 670px; margin-top: 17px; color: #19233b; font-size: clamp(2.7rem, 5.2vw, 5rem); font-weight: 800; letter-spacing: -.065em; line-height: .98; }
.hero-copy p { max-width: 570px; margin-top: 24px; color: #687184; font-size: 1rem; line-height: 1.8; }
.hero-actions { display: flex; align-items: center; flex-wrap: wrap; gap: 12px 16px; margin-top: 31px; }
.landing-primary, .landing-secondary, .landing-text-link { display: inline-flex; min-height: 47px; align-items: center; justify-content: center; gap: 13px; padding: 0 19px; border-radius: 12px; font-size: .79rem; font-weight: 800; text-decoration: none; transition: transform .18s ease, box-shadow .18s ease, border-color .18s ease; }
.landing-primary { color: #fff; background: #5b3cc4; box-shadow: 0 12px 24px rgba(91, 60, 196, .22); }
.landing-secondary { border: 1px solid rgba(91, 60, 196, .24); color: #5b3cc4; background: rgba(255, 255, 255, .6); }
.landing-text-link { min-height: auto; padding: 8px 0; color: #697286; }
.landing-primary:hover, .landing-secondary:hover { transform: translateY(-2px); box-shadow: 0 12px 24px rgba(74, 58, 126, .14); }
.landing-text-link:hover { color: #5b3cc4; }
.hero-meta { display: flex; flex-wrap: wrap; gap: 21px; margin-top: 31px; color: #848696; font-size: .72rem; }
.hero-meta span { display: inline-flex; align-items: center; gap: 7px; }
.hero-meta b { color: #5b3cc4; font-size: .64rem; letter-spacing: .08em; }
.hero-preview { position: relative; padding: 26px; border: 1px solid rgba(255, 255, 255, .95); border-radius: 28px; background: rgba(255, 255, 255, .7); box-shadow: 20px 26px 55px rgba(91, 79, 66, .14), inset 3px 3px 15px rgba(255, 255, 255, .9); transform: rotate(2deg); }
.hero-preview::before { position: absolute; width: 210px; height: 210px; top: -116px; right: -82px; border: 1px solid rgba(91, 60, 196, .12); border-radius: 50%; content: ''; }
.hero-preview::after { position: absolute; width: 110px; height: 110px; bottom: -55px; left: -42px; border-radius: 50%; background: #d9cfff; content: ''; opacity: .55; }
.preview-top, .preview-row, .preview-stats { display: flex; align-items: center; justify-content: space-between; }
.preview-top { position: relative; z-index: 1; color: #6e7180; font-size: .68rem; font-weight: 800; letter-spacing: .08em; }
.preview-dot { width: 11px; height: 11px; margin-right: 7px; border-radius: 50%; background: #6d4bd1; box-shadow: 0 0 0 5px #e7e0ff; }
.preview-status { margin-left: auto; color: #25835f; font-size: .62rem; letter-spacing: 0; }
.preview-title { display: flex; margin-top: 39px; flex-direction: column; gap: 6px; }
.preview-title span { color: #8a8993; font-size: .7rem; }
.preview-title strong { color: #252d43; font-size: 1.2rem; }
.preview-stats { gap: 12px; margin-top: 22px; }
.preview-stats div { display: flex; width: 50%; padding: 14px; flex-direction: column; border-radius: 14px; background: #f1edff; }
.preview-stats div:last-child { background: #e9f5ed; }
.preview-stats strong { color: #5b3cc4; font-size: 1.35rem; }
.preview-stats div:last-child strong { color: #2b8a61; }
.preview-stats small { color: #777c8d; font-size: .64rem; }
.preview-chart { display: flex; height: 115px; align-items: end; gap: 10px; margin-top: 28px; padding: 10px 12px 0; border-bottom: 1px solid #e8e4e8; }
.preview-chart span { width: 100%; border-radius: 8px 8px 0 0; background: linear-gradient(#a28ae7, #5b3cc4); }
.preview-row { position: relative; z-index: 1; margin-top: 14px; color: #596275; font-size: .68rem; }
.preview-row i { display: inline-block; width: 8px; height: 8px; margin-right: 7px; border-radius: 50%; background: #2c9d6d; }
.preview-row i.violet { background: #8065e8; }
.preview-row b { color: #28815e; font-size: .62rem; }.preview-row b.soft { color: #8065d2; }
.preview-note { position: relative; z-index: 1; margin-top: 19px; padding-top: 13px; border-top: 1px solid #e8e4e8; color: #6a7282; font-size: .67rem; }.preview-note span { display: inline-grid; width: 17px; height: 17px; margin-right: 5px; place-items: center; border-radius: 50%; color: #fff; background: #34a273; font-size: .58rem; }

.landing-section { padding: 92px 0; }
.intro-section { display: grid; grid-template-columns: minmax(0, .85fr) minmax(0, 1fr); gap: 90px; border-top: 1px solid rgba(71, 70, 76, .16); }
.section-heading h2, .service-copy h2, .landing-cta h2 { margin-top: 13px; color: #19233b; font-size: clamp(1.8rem, 3vw, 2.8rem); letter-spacing: -.045em; line-height: 1.1; }
.intro-section > p { padding-top: 28px; color: #697184; font-size: 1rem; line-height: 1.85; }
.feature-section, .audience-section, .flow-section { border-top: 1px solid rgba(71, 70, 76, .16); }
.feature-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 15px; margin-top: 36px; }
.feature-card { padding: 23px; border: 1px solid rgba(255, 255, 255, .92); border-radius: 18px; background: rgba(255, 255, 255, .57); box-shadow: 7px 10px 22px rgba(91, 79, 66, .06); }
.feature-card:hover, .audience-card:hover { transform: translateY(-3px); box-shadow: 10px 16px 30px rgba(91, 79, 66, .1); }
.feature-icon { display: grid; width: 39px; height: 39px; place-items: center; border-radius: 12px; color: #fff; background: #5b3cc4; font-weight: 800; }
.feature-card h3, .flow-step h3, .audience-card h3 { margin-top: 18px; color: #29344c; font-size: .95rem; }.feature-card p, .flow-step p, .audience-card p { margin-top: 7px; color: #747b8c; font-size: .76rem; line-height: 1.7; }
.audience-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 14px; margin-top: 36px; }
.audience-card { min-height: 218px; padding: 25px; border-radius: 18px; transition: transform .18s ease, box-shadow .18s ease; }.audience-admin { background: #e9e2ff; }.audience-teacher { background: #e7f4ed; }.audience-student { background: #e5effb; }.audience-number { color: rgba(36, 41, 61, .55); font-size: .68rem; font-weight: 800; letter-spacing: .12em; }.audience-card a { display: inline-flex; margin-top: 23px; color: #4f35aa; font-size: .73rem; font-weight: 800; text-decoration: none; }.audience-teacher a { color: #237c5e; }.audience-student a { color: #2861a8; }
.testimonial-section { border-top: 1px solid rgba(71, 70, 76, .16); }.testimonial-grid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 14px; margin-top: 36px; }.testimonial-card { position: relative; min-height: 190px; padding: 25px; border: 1px solid rgba(255, 255, 255, .92); border-radius: 18px; background: rgba(255, 255, 255, .57); box-shadow: 7px 10px 22px rgba(91, 79, 66, .06); }.testimonial-mark { display: block; color: #a28ae7; font-size: 2.5rem; font-weight: 800; line-height: .7; }.testimonial-card p { margin-top: 12px; color: #596275; font-size: .82rem; line-height: 1.7; }.testimonial-card footer { display: flex; margin-top: 20px; flex-direction: column; gap: 3px; }.testimonial-card footer strong { color: #29344c; font-size: .78rem; }.testimonial-card footer span { color: #848696; font-size: .68rem; }
.flow-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 19px; margin-top: 36px; }.flow-step { position: relative; padding: 20px 0; border-top: 2px solid #a994e7; }.step-number { color: #6c4ec4; font-size: .7rem; font-weight: 800; letter-spacing: .1em; }
.service-section { display: grid; grid-template-columns: minmax(0, 1fr) minmax(260px, .72fr); gap: 70px; align-items: center; margin-bottom: 92px; padding: 56px; border-radius: 27px; background: #2b2742; box-shadow: 16px 20px 40px rgba(52, 44, 74, .18); }.service-copy .eyebrow { color: #c3b6f4; }.service-copy h2 { color: #fff; }.service-copy p { max-width: 580px; margin: 18px 0 25px; color: #d6d1e6; font-size: .88rem; line-height: 1.75; }.service-copy .landing-primary { color: #2b2742; background: #fff; box-shadow: none; }.service-points { display: grid; gap: 13px; }.service-points div { display: flex; align-items: center; gap: 10px; color: #f1eff8; font-size: .78rem; }.service-points span { display: inline-grid; width: 23px; height: 23px; place-items: center; border-radius: 50%; color: #fff; background: rgba(177, 157, 237, .38); }
.landing-cta { display: flex; align-items: center; justify-content: space-between; gap: 20px; padding: 47px 0; border-top: 1px solid rgba(71, 70, 76, .16); }.landing-cta .eyebrow { color: #6c4ec4; }.landing-cta h2 { max-width: 650px; }.landing-secondary.light { border-color: rgba(91, 60, 196, .24); color: #5b3cc4; background: rgba(255, 255, 255, .6); white-space: nowrap; }.landing-footer { display: flex; justify-content: space-between; padding: 22px 0 34px; color: #7d7e87; font-size: .7rem; }
.scroll-progress { position: fixed; z-index: 10; right: 24px; bottom: 24px; display: grid; width: 52px; height: 52px; place-items: center; border: 1px solid rgba(255, 255, 255, .8); border-radius: 50%; color: #fff; background: conic-gradient(#5b3cc4 0%, rgba(255, 255, 255, .5) 0); box-shadow: 0 8px 18px rgba(72, 54, 130, .2); font: inherit; font-size: .78rem; font-weight: 700; cursor: default; transition: transform .18s ease, background .18s ease; }.scroll-progress::before { position: absolute; z-index: -1; width: 43px; height: 43px; border-radius: 50%; background: #6b4bd1; content: ''; }.scroll-progress.at-bottom { color: #fff; background: linear-gradient(145deg, #8166df, #5233b7); cursor: pointer; font-size: 1.3rem; }.scroll-progress.at-bottom::before { display: none; }.scroll-progress.at-bottom:hover { transform: translateY(-3px); }
@media (max-width: 820px) { .landing-hero { grid-template-columns: 1fr; gap: 50px; padding-top: 58px; }.hero-preview { width: min(100%, 510px); justify-self: center; }.feature-grid, .audience-grid, .testimonial-grid { grid-template-columns: repeat(2, 1fr); }.flow-grid { grid-template-columns: repeat(2, 1fr); }.service-section { grid-template-columns: 1fr; gap: 28px; padding: 38px; } }
@media (max-width: 560px) { .landing-hero, .landing-section, .landing-cta, .landing-footer { width: min(100% - 32px, 1160px); }.hero-copy h1 { font-size: 2.7rem; }.hero-copy p { font-size: .9rem; }.hero-preview { padding: 19px; transform: none; }.intro-section, .service-section { grid-template-columns: 1fr; gap: 20px; }.landing-section { padding: 62px 0; }.feature-grid, .audience-grid, .testimonial-grid, .flow-grid { grid-template-columns: 1fr; }.service-section { margin-bottom: 62px; padding: 28px 22px; border-radius: 22px; }.landing-cta { align-items: flex-start; flex-direction: column; padding: 37px 0; }.landing-footer { flex-direction: column; gap: 7px; }.hero-meta { gap: 13px; }.hero-actions { align-items: stretch; flex-direction: column; }.landing-primary, .landing-secondary { width: 100%; }.landing-text-link { align-self: flex-start; }.landing-header { padding-right: 16px; padding-left: 16px; }.landing-header .header-actions { gap: 5px; }.landing-header .landing-link { display: none; } .landing-header .admin-link { padding: 8px; } .scroll-progress { right: 14px; bottom: 16px; width: 48px; height: 48px; } }
</style>
