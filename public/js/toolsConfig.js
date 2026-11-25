window.RYNTAX_TOOLS = [
  {
    id: 'chat',
    title: 'AI Chat',
    description: 'Asisten percakapan cerdas multi-topik untuk tanya jawab, riset, dan brainstorming.',
    icon: '<path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>',
    fields: [
      { name: 'topic', label: 'Pertanyaan atau Topik Diskusi', type: 'textarea', placeholder: 'Tulis pertanyaan atau instruksi lengkap Anda...', required: true }
    ],
    buildPrompt: (v) => v.topic
  },
  {
    id: 'image-understanding',
    title: 'AI Image Understanding',
    description: 'Analisis gambar, ekstrak teks (OCR), baca diagram, atau identifikasi objek dari foto.',
    icon: '<rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/>',
    requireFileHint: true,
    fields: [
      {
        name: 'mode',
        label: 'Mode Analisis Gambar',
        type: 'select',
        options: ['Deskripsi Lengkap & Konteks', 'Ekstrak Seluruh Teks (OCR)', 'Analisis Kode / Diagram Teknis', 'Identifikasi Masalah & Solusi']
      },
      { name: 'question', label: 'Pertanyaan Tambahan tentang Gambar', type: 'textarea', placeholder: 'Contoh: Jelaskan isi tabel pada gambar ini dan rangkum poin pentingnya.' }
    ],
    buildPrompt: (v) => `Mode Analisis: ${v.mode}.\nInstruksi: ${v.question || 'Analisis gambar yang dilampirkan secara mendalam.'}`
  },
  {
    id: 'coding-assistant',
    title: 'AI Coding Assistant',
    description: 'Buat kode baru, perbaiki bug, optimasi performa, atau pahami kode lintas bahasa.',
    icon: '<polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/>',
    fields: [
      {
        name: 'action',
        label: 'Tugas Pemrograman',
        type: 'select',
        options: ['Buat Kode Baru', 'Perbaiki Bug / Error', 'Jelaskan Alur Kode', 'Refactor & Optimasi']
      },
      {
        name: 'lang',
        label: 'Bahasa Pemrograman',
        type: 'select',
        options: ['JavaScript / Node.js', 'Python', 'HTML / CSS', 'TypeScript', 'SQL', 'PHP', 'Java', 'C++']
      },
      { name: 'codeInput', label: 'Deskripsi Fitur atau Tempel Kode', type: 'textarea', placeholder: 'Tempel kode error atau jelaskan fitur yang ingin dibuat...', required: true }
    ],
    buildPrompt: (v) => `Tugas: ${v.action}\nBahasa: ${v.lang}\n\nDetail / Kode:\n${v.codeInput}`
  },
  {
    id: 'translator',
    title: 'AI Translator',
    description: 'Terjemahan akurat multi-bahasa dengan penyesuaian konteks dan gaya bahasa.',
    icon: '<path d="M5 8l6 6M4 14l6-6 2-3M2 5h12M7 2h1M22 22l-5-10-5 10M14 18h6"/>',
    fields: [
      {
        name: 'targetLang',
        label: 'Bahasa Tujuan',
        type: 'select',
        options: ['Bahasa Indonesia', 'English', '日本語 (Jepang)', 'العربية (Arab)', '한국어 (Korea)', 'Español', 'Français', 'Deutsch']
      },
      {
        name: 'tone',
        label: 'Gaya Bahasa',
        type: 'select',
        options: ['Natural & Akurat', 'Formal / Profesional', 'Santai / Sehari-hari', 'Akademik / Teknis']
      },
      { name: 'sourceText', label: 'Teks yang Akan Diterjemahkan', type: 'textarea', placeholder: 'Masukkan teks dalam bahasa apa pun...', required: true }
    ],
    buildPrompt: (v) => `Terjemahkan teks berikut ke dalam ${v.targetLang} dengan gaya bahasa ${v.tone}:\n\n${v.sourceText}`
  },
  {
    id: 'summarizer',
    title: 'AI Summarizer',
    description: 'Ringkas artikel panjang, catatan rapat, atau dokumen menjadi poin-poin inti.',
    icon: '<line x1="21" y1="10" x2="3" y2="10"/><line x1="21" y1="6" x2="3" y2="6"/><line x1="21" y1="14" x2="3" y2="14"/><line x1="14" y1="18" x2="3" y2="18"/>',
    fields: [
      {
        name: 'format',
        label: 'Format Ringkasan',
        type: 'select',
        options: ['Poin-Poin Utama (Bullet Points)', 'Ringkasan Eksekutif (1-2 Paragraf)', 'Kesimpulan & Action Items']
      },
      { name: 'text', label: 'Teks Sumber (atau lampirkan dokumen di bawah)', type: 'textarea', placeholder: 'Tempel teks panjang di sini...' }
    ],
    buildPrompt: (v) => `Buat ringkasan dalam format "${v.format}" dari materi berikut:\n\n${v.text || '(Gunakan dokumen yang dilampirkan)'}`
  },
  {
    id: 'writing-assistant',
    title: 'AI Writing Assistant',
    description: 'Tulis artikel, email profesional, esai, proposal, dan copywriting berkualitas tinggi.',
    icon: '<path d="M12 19l7-7 3 3-7 7-3-3z"/><path d="M18 13l-1.5-7.5L2 2l3.5 14.5L13 18l5-5z"/>',
    fields: [
      {
        name: 'docType',
        label: 'Jenis Tulisan',
        type: 'select',
        options: ['Artikel Blog / Edukasi', 'Email Profesional', 'Caption Media Sosial', 'Esai Akademik', 'Proposal Singkat']
      },
      {
        name: 'tone',
        label: 'Nada Tulisan',
        type: 'select',
        options: ['Profesional & Meyakinkan', 'Informatif & Ramah', 'Kreatif & Menarik', 'Tegas & Singkat']
      },
      { name: 'brief', label: 'Topik atau Poin Utama', type: 'textarea', placeholder: 'Jelaskan topik, tujuan, dan audiens tulisan Anda...', required: true }
    ],
    buildPrompt: (v) => `Buatkan ${v.docType} dengan nada "${v.tone}" berdasarkan brief berikut:\n\n${v.brief}`
  },
  {
    id: 'homework-assistant',
    title: 'AI Homework Assistant',
    description: 'Bimbingan belajar interaktif dan penjelasan materi sekolah/kuliah langkah demi langkah.',
    icon: '<path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/>',
    fields: [
      {
        name: 'subject',
        label: 'Mata Pelajaran',
        type: 'select',
        options: ['Umum', 'Fisika', 'Kimia', 'Biologi', 'Informatika', 'Ekonomi', 'Sejarah', 'Bahasa Indonesia / Inggris']
      },
      { name: 'question', label: 'Soal atau Materi yang Ingin Dipelajari', type: 'textarea', placeholder: 'Tulis soal atau unggah foto soal di bawah...', required: true }
    ],
    buildPrompt: (v) => `Mata Pelajaran: ${v.subject}.\nBantu jelaskan konsep dan langkah penyelesaian untuk pertanyaan berikut secara mudah dipahami:\n\n${v.question}`
  },
  {
    id: 'math-solver',
    title: 'AI Math Solver',
    description: 'Selesaikan soal aljabar, kalkulus, trigonometri, dan statistika lengkap dengan rumus LaTeX.',
    icon: '<line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>',
    fields: [
      { name: 'problem', label: 'Soal Matematika (Teks atau Unggah Foto Soal)', type: 'textarea', placeholder: 'Contoh: Hitung integral tentu dari $\\int_0^2 (3x^2 + 2x) dx$ lengkap dengan langkahnya.' }
    ],
    buildPrompt: (v) => `Selesaikan soal matematika berikut secara sistematis langkah demi langkah menggunakan rumus LaTeX:\n\n${v.problem || '(Lihat soal pada gambar yang dilampirkan)'}`
  },
  {
    id: 'document-analyzer',
    title: 'AI Document Analyzer',
    description: 'Unggah PDF, TXT, CSV, atau JSON untuk dianalisis, diekstrak datanya, dan ditanya jawab.',
    icon: '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/>',
    requireFileHint: true,
    fields: [
      {
        name: 'task',
        label: 'Jenis Analisis Dokumen',
        type: 'select',
        options: ['Ringkasan & Poin Kunci', 'Ekstrak Data / Tabel Penting', 'Audit Kelemahan & Saran', 'Tanya Jawab Spesifik']
      },
      { name: 'query', label: 'Pertanyaan Spesifik terhadap Dokumen', type: 'textarea', placeholder: 'Apa yang ingin Anda ketahui dari dokumen ini?' }
    ],
    buildPrompt: (v) => `Jenis Analisis: ${v.task}.\nInstruksi: ${v.query || 'Analisis seluruh isi dokumen yang dilampirkan secara terstruktur.'}`
  },
  {
    id: 'idea-generator',
    title: 'AI Idea Generator',
    description: 'Hasilkan ide bisnis, konten kreatif, proyek aplikasi, maupun inovasi riset yang terukur.',
    icon: '<path d="M9 18h6M10 22h4M12 2a7 7 0 0 0-4 12.7V17h8v-2.3A7 7 0 0 0 12 2z"/>',
    fields: [
      {
        name: 'category',
        label: 'Kategori Ide',
        type: 'select',
        options: ['Proyek Aplikasi / Web / AI', 'Bisnis & UMKM', 'Konten YouTube / TikTok / Reels', 'Karya Tulis / Riset']
      },
      { name: 'context', label: 'Minat, Target, atau Batasan', type: 'textarea', placeholder: 'Contoh: Ide konten edukasi pertanian modern untuk anak muda dengan modal minim.', required: true }
    ],
    buildPrompt: (v) => `Hasilkan 7 ide orisinal dan aplikatif untuk kategori "${v.category}" dengan konteks berikut:\n\n${v.context}`
  },
  {
    id: 'story-generator',
    title: 'AI Story Generator',
    description: 'Ciptakan cerita pendek, naskah drama, atau alur fiksi dengan karakter dan konflik kuat.',
    icon: '<polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>',
    fields: [
      {
        name: 'genre',
        label: 'Genre Cerita',
        type: 'select',
        options: ['Sci-Fi / Futuristik', 'Misteri & Detektif', 'Fantasi', 'Petualangan', 'Drama Inspiratif']
      },
      { name: 'premise', label: 'Premis, Tokoh, atau Latar Cerita', type: 'textarea', placeholder: 'Contoh: Seorang programmer di Bandung menemukan sinyal misterius dari satelit tua...', required: true }
    ],
    buildPrompt: (v) => `Tulis cerita fiksi bergenre "${v.genre}" yang menarik dan terstruktur berdasarkan premis berikut:\n\n${v.premise}`
  },
  {
    id: 'explain-anything',
    title: 'AI Explain Anything',
    description: 'Pahami konsep rumit dari sains, teknologi, hingga filsafat sesuai tingkat pemahaman Anda.',
    icon: '<circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/>',
    fields: [
      {
        name: 'level',
        label: 'Tingkat Penjelasan',
        type: 'select',
        options: ['Sangat Sederhana (Analogi Sehari-hari / ELI5)', 'Pelajar SMA', 'Mahasiswa / Umum Terdidik', 'Teknis & Mendalam']
      },
      { name: 'concept', label: 'Topik atau Konsep yang Ingin Dijelaskan', type: 'textarea', placeholder: 'Contoh: Bagaimana cara kerja Transformer pada Large Language Model?', required: true }
    ],
    buildPrompt: (v) => `Jelaskan topik "${v.concept}" dengan tingkat penjelasan "${v.level}". Sertakan contoh konkret agar mudah dipahami.`
  }
];
