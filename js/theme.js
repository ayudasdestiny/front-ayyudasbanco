(function () {
  function aplicarTema(tema) {
    document.documentElement.setAttribute('data-theme', tema);
    document.querySelectorAll('#btnTema').forEach((b) => (b.textContent = tema === 'dark' ? '☀️' : '🌙'));
    localStorage.setItem('ab_tema', tema);
  }

  const guardado = localStorage.getItem('ab_tema') ||
    (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
  aplicarTema(guardado);

  document.addEventListener('click', (e) => {
    if (e.target && e.target.id === 'btnTema') {
      const actual = document.documentElement.getAttribute('data-theme');
      aplicarTema(actual === 'dark' ? 'light' : 'dark');
    }
  });
})();
