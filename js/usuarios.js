(function () {
  const MODULOS_LABELS = {
    enlaces:    { label: 'Enlaces',           icon: '🔗' },
    plantillas: { label: 'Plantillas',        icon: '📐' },
    mensajes:   { label: 'Mensajes',          icon: '💬' },
    codigo:     { label: 'Código',            icon: '💻' },
    correos:    { label: 'Correos',           icon: '✉️' },
    documentos: { label: 'Documentos/Videos', icon: '🎬' },
    diario:     { label: 'Diario',            icon: '📓' },
    iconos:     { label: 'Iconos',            icon: '⭐' },
  };
  const MODULOS = Object.keys(MODULOS_LABELS);

  // ---- Visibilidad menú admin ----
  const usuario = Sesion.usuario();
  if (usuario?.rol === 'admin') {
    document.body.classList.add('es-admin');
  }

  // ---- Exponer función para que app.js pueda renderizar esta sección ----
  window.renderSeccionUsuarios = async function () {
    const contenido = document.getElementById('contenido');
    document.getElementById('categoriasBar').innerHTML = '';
    contenido.innerHTML = '<div class="empty-state">Cargando usuarios...</div>';
    try {
      const usuarios = await apiFetch('/usuarios');
      contenido.innerHTML = `
        <div class="usuarios-wrap">
          ${tablaUsuariosHTML(usuarios)}
        </div>`;
      bindTablaEventos(usuarios);
    } catch (err) {
      contenido.innerHTML = `<div class="empty-state">Error: ${err.message}</div>`;
    }
  };

  function tablaUsuariosHTML(usuarios) {
    if (!usuarios.length) return '<div class="empty-state">No hay usuarios registrados.</div>';
    const filas = usuarios.map((u) => {
      const rolBadge = u.rol === 'admin'
        ? `<span class="badge badge-rol-admin">Admin</span>`
        : `<span class="badge badge-rol-editor">Editor</span>`;
      const estadoBadge = u.activo
        ? '<span class="badge" style="color:var(--success);border-color:var(--success)">Activo</span>'
        : '<span class="badge badge-inactivo">Inactivo</span>';

      const permisosMini = u.rol === 'admin'
        ? '<span class="chip-mini" style="color:var(--primary)">Acceso total</span>'
        : MODULOS.filter((m) => u.permisos?.[m]?.ver || u.permisos?.[m]?.editar)
            .map((m) => {
              const edita = u.permisos?.[m]?.editar;
              return `<span class="chip-mini ${edita ? 'edit' : ''}">${MODULOS_LABELS[m].icon} ${MODULOS_LABELS[m].label}${edita ? ' ✏️' : ''}</span>`;
            }).join('') || '<span class="chip-mini">Sin permisos</span>';

      return `
        <tr>
          <td><strong>${escU(u.nombre)}</strong><br><small style="color:var(--text-muted)">${escU(u.email)}</small></td>
          <td>${rolBadge}</td>
          <td>${estadoBadge}</td>
          <td><div class="permisos-mini">${permisosMini}</div></td>
          <td>
            <div class="td-actions">
              <button class="btn btn-secondary" style="font-size:12px;padding:6px 10px" data-accion="editar-usuario" data-id="${u._id}">✏️ Editar</button>
              <button class="btn" style="font-size:12px;padding:6px 10px;background:transparent;border:1px solid var(--danger);color:var(--danger)" data-accion="eliminar-usuario" data-id="${u._id}" ${u._id === usuario?._id ? 'disabled title="No puedes eliminarte a ti mismo"' : ''}>🗑️</button>
            </div>
          </td>
        </tr>`;
    }).join('');

    return `
      <table class="usuarios-tabla">
        <thead>
          <tr>
            <th>Usuario</th>
            <th>Rol</th>
            <th>Estado</th>
            <th>Permisos</th>
            <th style="text-align:right">Acciones</th>
          </tr>
        </thead>
        <tbody>${filas}</tbody>
      </table>`;
  }

  function bindTablaEventos(usuarios) {
    document.querySelectorAll('[data-accion="editar-usuario"]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const u = usuarios.find((x) => x._id === btn.dataset.id);
        if (u) abrirModalUsuario(u);
      });
    });
    document.querySelectorAll('[data-accion="eliminar-usuario"]').forEach((btn) => {
      btn.addEventListener('click', () => eliminarUsuario(btn.dataset.id));
    });
  }

  // ---- Modal ----
  const modalOverlay = document.getElementById('modalUsuario');
  const formUsuario  = document.getElementById('formUsuario');

  // Botón "+ Nuevo" del topbar cuando estamos en sección usuarios
  document.getElementById('btnNuevo').addEventListener('click', () => {
    if (document.getElementById('tituloModulo').textContent === 'Usuarios') {
      abrirModalUsuario(null);
    }
  });

  document.getElementById('btnCerrarModalUsuario').addEventListener('click', cerrarModal);
  document.getElementById('btnCancelarUsuario').addEventListener('click', cerrarModal);

  function cerrarModal() { modalOverlay.hidden = true; formUsuario.reset(); }

  function abrirModalUsuario(u) {
    document.getElementById('modalUsuarioTitulo').textContent = u ? 'Editar usuario' : 'Nuevo usuario';
    document.getElementById('usuarioId').value    = u ? u._id : '';
    document.getElementById('uNombre').value      = u ? u.nombre : '';
    document.getElementById('uEmail').value       = u ? u.email : '';
    document.getElementById('uPassword').value    = '';
    document.getElementById('uRol').value         = u ? u.rol : 'editor';
    document.getElementById('uActivo').checked    = u ? u.activo !== false : true;

    renderPermisosFilas(u);
    modalOverlay.hidden = false;
  }

  function renderPermisosFilas(u) {
    const contenedor = document.getElementById('permisosFilas');
    contenedor.innerHTML = MODULOS.map((m) => {
      const ver    = u?.permisos?.[m]?.ver    !== false;
      const editar = u?.permisos?.[m]?.editar === true;
      return `
        <div class="permiso-fila">
          <span>${MODULOS_LABELS[m].icon} ${MODULOS_LABELS[m].label}</span>
          <span><input type="checkbox" class="perm-ver"    data-modulo="${m}" ${ver    ? 'checked' : ''} /></span>
          <span><input type="checkbox" class="perm-editar" data-modulo="${m}" ${editar ? 'checked' : ''} /></span>
        </div>`;
    }).join('');

    // Si marca editar, forzar ver también
    contenedor.querySelectorAll('.perm-editar').forEach((chk) => {
      chk.addEventListener('change', () => {
        if (chk.checked) {
          contenedor.querySelector(`.perm-ver[data-modulo="${chk.dataset.modulo}"]`).checked = true;
        }
      });
    });
    contenedor.querySelectorAll('.perm-ver').forEach((chk) => {
      chk.addEventListener('change', () => {
        if (!chk.checked) {
          contenedor.querySelector(`.perm-editar[data-modulo="${chk.dataset.modulo}"]`).checked = false;
        }
      });
    });
  }

  function leerPermisos() {
    const permisos = {};
    MODULOS.forEach((m) => {
      const ver    = document.querySelector(`.perm-ver[data-modulo="${m}"]`)?.checked || false;
      const editar = document.querySelector(`.perm-editar[data-modulo="${m}"]`)?.checked || false;
      permisos[m] = { ver, editar };
    });
    return permisos;
  }

  formUsuario.addEventListener('submit', async (e) => {
    e.preventDefault();
    const id       = document.getElementById('usuarioId').value;
    const password = document.getElementById('uPassword').value;
    const payload  = {
      nombre:   document.getElementById('uNombre').value.trim(),
      email:    document.getElementById('uEmail').value.trim(),
      rol:      document.getElementById('uRol').value,
      activo:   document.getElementById('uActivo').checked,
      permisos: leerPermisos(),
    };
    if (password) payload.password = password;

    try {
      if (id) {
        await apiFetch(`/usuarios/${id}`, { method: 'PUT', body: JSON.stringify(payload) });
      } else {
        if (!password) { alert('La contraseña es requerida para nuevos usuarios'); return; }
        await apiFetch('/usuarios', { method: 'POST', body: JSON.stringify(payload) });
      }
      cerrarModal();
      window.renderSeccionUsuarios();
    } catch (err) {
      alert('Error: ' + err.message);
    }
  });

  async function eliminarUsuario(id) {
    if (!confirm('¿Eliminar este usuario? Esta acción no se puede deshacer.')) return;
    try {
      await apiFetch(`/usuarios/${id}`, { method: 'DELETE' });
      window.renderSeccionUsuarios();
    } catch (err) {
      alert('Error: ' + err.message);
    }
  }

  function escU(str = '') {
    return str.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  }
})();
