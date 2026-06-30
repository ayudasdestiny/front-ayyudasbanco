(function () {
  if (Sesion.token()) {
    window.location.href = 'dashboard.html';
    return;
  }

  const form = document.getElementById('formLogin');
  const errorEl = document.getElementById('errorLogin');

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    errorEl.hidden = true;
    const email = document.getElementById('email').value.trim();
    const password = document.getElementById('password').value;

    try {
      const data = await apiFetch('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      });
      Sesion.guardar(data.token, data.usuario);
      window.location.href = 'dashboard.html';
    } catch (err) {
      errorEl.textContent = err.message || 'No fue posible iniciar sesión';
      errorEl.hidden = false;
    }
  });
})();
