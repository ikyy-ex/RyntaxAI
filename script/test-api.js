const BASE_URL = process.env.TEST_BASE_URL || 'http://localhost:3000';

async function runTests() {
  console.log(`Menguji server RYNTAX AI pada ${BASE_URL}...\n`);

  // 1. Uji Health & Dapatkan CSRF Cookie
  const healthRes = await fetch(`${BASE_URL}/api/health`);
  const health = await healthRes.json();
  const setCookie = healthRes.headers.get('set-cookie') || '';
  const csrfMatch = setCookie.match(/ryntax_csrf=([^;]+)/);
  const csrfToken = csrfMatch ? csrfMatch[1] : '';

  console.log('[1] Health Check:', health.status === 'ok' ? 'PASS' : 'FAIL', {
    geminiConfigured: health.geminiConfigured,
    databaseMode: health.databaseMode
  });

  // 2. Uji Proteksi CSRF
  const csrfRejectRes = await fetch(`${BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'test@example.com', password: 'password123' })
  });
  console.log('[2] Proteksi CSRF (tanpa token harus 403):', csrfRejectRes.status === 403 ? 'PASS' : 'FAIL');

  // 3. Uji Registrasi Akun & Hash Password
  const testEmail = `tester_${Date.now()}@ryntax.local`;
  const regRes = await fetch(`${BASE_URL}/api/auth/register`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Cookie': `ryntax_csrf=${csrfToken}`,
      'X-CSRF-Token': csrfToken
    },
    body: JSON.stringify({
      name: 'Ryntax Tester',
      email: testEmail,
      password: 'PasswordAman123'
    })
  });
  const regData = await regRes.json();
  console.log('[3] Registrasi & Isolasi Akun:', regRes.status === 201 && regData.authenticated ? 'PASS' : 'FAIL');

  // 4. Uji Koneksi Gemini API Nyata
  if (!health.geminiConfigured) {
    console.log('[4] Uji Gemini API: DILEWATI (GEMINI_API_KEY belum diisi di .env)');
  } else {
    const form = new FormData();
    form.append('prompt', 'Balas hanya dengan satu kata: AKTIF');
    form.append('model', 'gemini-2.5-flash');

    const aiRes = await fetch(`${BASE_URL}/api/ai/stream`, {
      method: 'POST',
      headers: {
        'Cookie': `ryntax_csrf=${csrfToken}`,
        'X-CSRF-Token': csrfToken
      },
      body: form
    });
    const streamOutput = await aiRes.text();
    const ok = aiRes.status === 200 && streamOutput.includes('event: done');
    console.log('[4] Koneksi & Streaming Gemini API:', ok ? 'PASS' : 'FAIL');
  }
}

runTests().catch((err) => {
  console.error('Pengujian gagal dijalankan (pastikan server berjalan di port 3000):', err.message);
  process.exit(1);
});
