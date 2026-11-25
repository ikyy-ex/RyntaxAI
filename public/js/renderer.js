(function () {
  if (window.marked) {
    window.marked.setOptions({
      gfm: true,
      breaks: true
    });
  }

  function renderMarkdownSafe(targetEl, markdownText) {
    if (!targetEl) return;

    const rawHtml = window.marked
      ? window.marked.parse(markdownText || '')
      : escapeHtml(markdownText || '');

    const cleanHtml = window.DOMPurify
      ? window.DOMPurify.sanitize(rawHtml, {
          ADD_TAGS: ['math', 'semantics', 'mrow', 'mi', 'mo', 'mn', 'msup', 'msub', 'mfrac'],
          ADD_ATTR: ['class', 'style']
        })
      : rawHtml;

    targetEl.innerHTML = cleanHtml;

    // Enhance code blocks with syntax highlighting + copy button
    targetEl.querySelectorAll('pre code').forEach((codeEl) => {
      if (window.hljs) {
        window.hljs.highlightElement(codeEl);
      }

      const preEl = codeEl.parentElement;
      if (!preEl || preEl.parentElement?.classList.contains('code-block-wrapper')) return;

      const langClass = Array.from(codeEl.classList).find((c) => c.startsWith('language-'));
      const langName = langClass ? langClass.replace('language-', '') : 'code';

      const wrapper = document.createElement('div');
      wrapper.className = 'code-block-wrapper';

      const header = document.createElement('div');
      header.className = 'code-block-header';
      header.innerHTML = `<span>${escapeHtml(langName)}</span>`;

      const copyBtn = document.createElement('button');
      copyBtn.type = 'button';
      copyBtn.className = 'copy-code-btn';
      copyBtn.textContent = 'Salin Kode';
      copyBtn.addEventListener('click', () => {
        navigator.clipboard.writeText(codeEl.textContent || '');
        copyBtn.textContent = 'Tersalin!';
        setTimeout(() => {
          copyBtn.textContent = 'Salin Kode';
        }, 1800);
      });

      header.appendChild(copyBtn);
      preEl.parentNode.insertBefore(wrapper, preEl);
      wrapper.appendChild(header);
      wrapper.appendChild(preEl);
    });

    // Render KaTeX Math Formulas
    if (window.renderMathInElement) {
      window.renderMathInElement(targetEl, {
        delimiters: [
          { left: '$$', right: '$$', display: true },
          { left: '$', right: '$', display: false },
          { left: '\\(', right: '\\)', display: false },
          { left: '\\[', right: '\\]', display: true }
        ],
        throwOnError: false
      });
    }
  }

  function escapeHtml(str) {
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  window.RyntaxRenderer = {
    renderMarkdownSafe,
    escapeHtml
  };
})();
