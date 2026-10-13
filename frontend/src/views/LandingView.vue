<template>
  <div class="landing-page">
    <section class="landing-hero">
      <div class="hero-copy">
        <span class="eyebrow">PLATFORM ASESMEN SEKOLAH</span>
        <h1>Asesmen sekolah yang lebih terarah, rapi, dan mudah dipantau.</h1>
        <p>Ruang Asesmen membantu sekolah mengelola soal, jadwal, peserta, dan hasil ujian dalam satu ruang digital.</p>
        <div class="hero-actions">
          <router-link to="/auth" class="landing-primary">Masuk ke Ruang Asesmen <span>→</span></router-link>
          <a href="#layanan" class="landing-secondary">Lihat layanan</a>
        </div>
        <div class="hero-proof"><span>✓</span> Dirancang untuk kebutuhan asesmen sekolah</div>
      </div>

      <div class="hero-preview" aria-label="Pratinjau Ruang Asesmen">
        <div class="preview-top"><span class="preview-dot"></span><span>RUAS Admin</span><span class="preview-status">● Aktif</span></div>
        <div class="preview-title"><span>Ringkasan asesmen</span><strong>Pantau hasil dengan lebih mudah.</strong></div>
        <div class="preview-stats"><div><strong>12</strong><small>Topik aktif</small></div><div><strong>86%</strong><small>Rata-rata</small></div></div>
        <div class="preview-chart"><span v-for="height in [38, 54, 46, 72, 62, 84, 76]" :key="height" :style="{ height: `${height}%` }"></span></div>
        <div class="preview-row"><span><i></i> Asesmen Matematika</span><b>Sedang berlangsung</b></div>
        <div class="preview-row"><span><i class="violet"></i> Laporan kelas XI</span><b class="soft">Siap ditinjau</b></div>
      </div>
    </section>

    <section class="landing-section intro-section">
      <div class="section-heading"><span class="eyebrow">SATU RUANG UNTUK ASESMEN</span><h2>Semua kebutuhan pengelolaan ujian sekolah dalam satu alur.</h2></div>
      <p>RUAS menyederhanakan pekerjaan guru dan admin agar waktu dapat digunakan untuk mendampingi proses belajar siswa.</p>
    </section>

    <section class="landing-section feature-section" aria-labelledby="feature-title">
      <div class="section-heading"><span class="eyebrow">FITUR UTAMA</span><h2 id="feature-title">Dibangun untuk pekerjaan asesmen sehari-hari.</h2></div>
      <div class="feature-grid">
        <article v-for="feature in features" :key="feature.title" class="feature-card"><span class="feature-icon">{{ feature.icon }}</span><h3>{{ feature.title }}</h3><p>{{ feature.description }}</p></article>
      </div>
    </section>

    <section class="landing-section flow-section" aria-labelledby="flow-title">
      <div class="section-heading"><span class="eyebrow">ALUR KERJA</span><h2 id="flow-title">Mulai dari pengaturan hingga laporan.</h2></div>
      <div class="flow-grid"><article v-for="(step, index) in steps" :key="step.title" class="flow-step"><span class="step-number">0{{ index + 1 }}</span><h3>{{ step.title }}</h3><p>{{ step.description }}</p></article></div>
    </section>

    <section id="layanan" class="landing-section service-section" aria-labelledby="service-title">
      <div class="service-copy"><span class="eyebrow">LAYANAN PENGEMBANGAN</span><h2 id="service-title">Butuh aplikasi asesmen yang sesuai dengan sekolah Anda?</h2><p>Saya membantu sekolah dan lembaga pendidikan membangun aplikasi serupa RUAS dengan alur, identitas visual, dan kebutuhan pengelolaan yang dapat disesuaikan.</p><a href="https://rakitapp.ferilee.gurumuda.eu.org/" class="landing-primary" target="_blank" rel="noopener noreferrer">Diskusikan kebutuhan Anda <span>→</span></a></div>
      <div class="service-points"><div v-for="point in servicePoints" :key="point"><span>✓</span>{{ point }}</div></div>
    </section>

    <section id="kontak" class="landing-cta"><div><span class="eyebrow">RUANG UNTUK BERTUMBUH</span><h2>Mulai membangun pengalaman asesmen yang lebih baik.</h2></div><router-link to="/auth" class="landing-secondary light">Kembali ke aplikasi</router-link></section>
    <footer class="landing-footer"><span>RUAS · Ruang Asesmen</span><span>Belajar, berlatih, berkembang.</span></footer>
  </div>
</template>

<script setup lang="ts">
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
.landing-page { overflow: hidden; color: #183461; background: linear-gradient(145deg, #f5f8ff 0%, #e8f0ff 52%, #d9e7ff 100%); }
.landing-hero, .landing-section, .landing-cta, .landing-footer { width: min(100% - 40px, 1120px); margin: 0 auto; }
.landing-hero { display: grid; min-height: 610px; grid-template-columns: minmax(0, 1fr) minmax(360px, .8fr); align-items: center; gap: 70px; padding: 70px 0 90px; }
.hero-copy { position: relative; z-index: 1; }
.eyebrow { color: #3477d5; font-size: .68rem; font-weight: 800; letter-spacing: .16em; }
.hero-copy h1 { max-width: 640px; margin-top: 16px; color: #10265e; font-size: clamp(2.45rem, 5vw, 4.5rem); font-weight: 850; letter-spacing: -.06em; line-height: 1.02; }
.hero-copy p { max-width: 560px; margin-top: 22px; color: #5d7398; font-size: 1.05rem; line-height: 1.75; }
.hero-actions { display: flex; align-items: center; flex-wrap: wrap; gap: 14px; margin-top: 32px; }
.landing-primary, .landing-secondary { display: inline-flex; min-height: 46px; align-items: center; justify-content: center; gap: 15px; padding: 0 19px; border-radius: 13px; font-size: .82rem; font-weight: 800; text-decoration: none; transition: transform .18s ease, box-shadow .18s ease; }
.landing-primary { color: #fff; background: linear-gradient(110deg, #238bff, #1649dc); box-shadow: 0 12px 24px rgba(35, 100, 214, .25); }
.landing-secondary { border: 1px solid rgba(68, 121, 201, .3); color: #2461ba; background: rgba(255, 255, 255, .55); }
.landing-primary:hover, .landing-secondary:hover { transform: translateY(-2px); box-shadow: 0 12px 24px rgba(52, 103, 191, .17); }
.hero-proof { margin-top: 22px; color: #6680aa; font-size: .75rem; }.hero-proof span { display: inline-grid; width: 20px; height: 20px; margin-right: 7px; place-items: center; border-radius: 50%; color: #1f8c61; background: #dff8eb; font-weight: 800; }
.hero-preview { position: relative; padding: 24px; border: 1px solid rgba(255, 255, 255, .9); border-radius: 27px; background: rgba(255, 255, 255, .57); box-shadow: 18px 24px 46px rgba(91, 126, 190, .17), inset 4px 4px 14px rgba(255, 255, 255, .78); transform: rotate(2deg); }.hero-preview::before { position: absolute; width: 190px; height: 190px; top: -110px; right: -80px; border: 1px solid rgba(255, 255, 255, .7); border-radius: 50%; content: ''; }
.preview-top, .preview-row, .preview-stats { display: flex; align-items: center; justify-content: space-between; }.preview-top { color: #4f70a0; font-size: .7rem; font-weight: 800; letter-spacing: .08em; }.preview-dot { width: 11px; height: 11px; margin-right: 7px; border-radius: 50%; background: #287ce7; box-shadow: 0 0 0 5px #d9eaff; }.preview-status { margin-left: auto; color: #25845c; font-size: .65rem; letter-spacing: 0; }.preview-title { display: flex; margin-top: 38px; flex-direction: column; gap: 5px; }.preview-title span { color: #6680aa; font-size: .7rem; }.preview-title strong { color: #15346e; font-size: 1.2rem; }.preview-stats { gap: 12px; margin-top: 22px; }.preview-stats div { display: flex; width: 50%; padding: 14px; flex-direction: column; border-radius: 14px; background: rgba(232, 241, 255, .76); }.preview-stats strong { color: #1767cc; font-size: 1.35rem; }.preview-stats small { color: #7890b3; font-size: .65rem; }.preview-chart { display: flex; height: 115px; align-items: end; gap: 10px; margin-top: 28px; padding: 10px 12px 0; border-bottom: 1px solid #d6e3f5; }.preview-chart span { width: 100%; border-radius: 8px 8px 0 0; background: linear-gradient(#4da5ff, #2265da); }.preview-row { margin-top: 14px; color: #45668f; font-size: .68rem; }.preview-row i { display: inline-block; width: 8px; height: 8px; margin-right: 7px; border-radius: 50%; background: #2c9d6d; }.preview-row i.violet { background: #8065e8; }.preview-row b { color: #28815e; font-size: .62rem; }.preview-row b.soft { color: #8065d2; }
.landing-section { padding: 84px 0; }.intro-section { display: grid; grid-template-columns: minmax(0, .85fr) minmax(0, 1fr); gap: 80px; border-top: 1px solid rgba(255, 255, 255, .8); }.section-heading h2, .service-copy h2, .landing-cta h2 { margin-top: 13px; color: #10265e; font-size: clamp(1.7rem, 3vw, 2.65rem); letter-spacing: -.04em; line-height: 1.12; }.intro-section > p { padding-top: 28px; color: #647b9f; font-size: 1rem; line-height: 1.8; }.feature-section, .flow-section { border-top: 1px solid rgba(255, 255, 255, .8); }.feature-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 15px; margin-top: 34px; }.feature-card { padding: 22px; border: 1px solid rgba(255, 255, 255, .9); border-radius: 19px; background: rgba(255, 255, 255, .51); box-shadow: 7px 10px 20px rgba(117, 148, 204, .09); }.feature-icon { display: grid; width: 38px; height: 38px; place-items: center; border-radius: 12px; color: #fff; background: linear-gradient(145deg, #318cf0, #2458cb); font-weight: 800; }.feature-card h3, .flow-step h3 { margin-top: 18px; color: #244978; font-size: .95rem; }.feature-card p, .flow-step p { margin-top: 7px; color: #7086a7; font-size: .76rem; line-height: 1.65; }.flow-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 18px; margin-top: 34px; }.flow-step { position: relative; padding: 19px 0; border-top: 2px solid #9cc6fa; }.step-number { color: #287ce7; font-size: .7rem; font-weight: 800; letter-spacing: .1em; }.service-section { display: grid; grid-template-columns: minmax(0, 1fr) minmax(260px, .72fr); gap: 70px; align-items: center; margin-bottom: 84px; padding: 54px; border-radius: 28px; background: linear-gradient(120deg, #1f64c4, #258de5); box-shadow: 16px 20px 38px rgba(48, 102, 186, .22); }.service-copy .eyebrow, .landing-cta .eyebrow { color: #b8d8ff; }.service-copy h2 { color: #fff; }.service-copy p { max-width: 580px; margin: 18px 0 25px; color: #d8eaff; font-size: .88rem; line-height: 1.7; }.service-copy .landing-primary { color: #2164bd; background: #fff; box-shadow: none; }.service-points { display: grid; gap: 13px; }.service-points div { display: flex; align-items: center; gap: 10px; color: #eef6ff; font-size: .78rem; }.service-points span { display: inline-grid; width: 23px; height: 23px; place-items: center; border-radius: 50%; color: #fff; background: rgba(255, 255, 255, .2); }.landing-cta { display: flex; align-items: center; justify-content: space-between; gap: 20px; padding: 45px 0; border-top: 1px solid rgba(255, 255, 255, .8); }.landing-cta h2 { max-width: 620px; }.landing-secondary.light { border-color: rgba(255, 255, 255, .35); color: #fff; background: rgba(255, 255, 255, .13); white-space: nowrap; }.landing-footer { display: flex; justify-content: space-between; padding: 22px 0 34px; color: #7188a9; font-size: .7rem; }
@media (max-width: 820px) { .landing-hero { grid-template-columns: 1fr; gap: 50px; padding-top: 58px; }.hero-preview { width: min(100%, 500px); justify-self: center; }.feature-grid { grid-template-columns: repeat(2, 1fr); }.flow-grid { grid-template-columns: repeat(2, 1fr); }.service-section { grid-template-columns: 1fr; gap: 28px; padding: 35px; } }
@media (max-width: 560px) { .landing-hero, .landing-section, .landing-cta, .landing-footer { width: min(100% - 32px, 1120px); }.landing-header { padding-right: 16px; padding-left: 16px; }.landing-header .header-actions { gap: 5px; }.landing-header .landing-link { display: none; }.hero-copy h1 { font-size: 2.55rem; }.hero-copy p { font-size: .9rem; }.hero-preview { padding: 18px; transform: none; }.intro-section, .service-section { grid-template-columns: 1fr; gap: 20px; }.landing-section { padding: 58px 0; }.feature-grid, .flow-grid { grid-template-columns: 1fr; }.service-section { margin-bottom: 58px; padding: 26px 21px; border-radius: 22px; }.landing-cta { align-items: flex-start; flex-direction: column; padding: 34px 0; }.landing-footer { flex-direction: column; gap: 6px; } }
</style>
