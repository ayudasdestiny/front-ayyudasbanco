(function () {
  Sesion.requerir();

  const MODULOS = {
    inicio:    { label: 'Inicio',             icon: '🏠' },
    enlaces:   { label: 'Enlaces',            icon: '🔗' },
    plantillas:{ label: 'Plantillas',         icon: '📐' },
    mensajes:  { label: 'Mensajes',           icon: '💬' },
    codigo:    { label: 'Código',             icon: '💻' },
    correos:   { label: 'Correos',            icon: '✉️' },
    documentos:{ label: 'Documentos y Videos',icon: '🎬' },
    diario:    { label: 'Diario',             icon: '📓' },
    iconos:    { label: 'Iconos',             icon: '⭐' },
    usuarios:  { label: 'Usuarios',           icon: '👥' },
  };

  const estado = {
    moduloActual: 'inicio',
    categoriaActual: 'Todos',
    items: [],
    categorias: [],
    busqueda: '',
  };

  // ---------- Elementos ----------
  const elContenido     = document.getElementById('contenido');
  const elTitulo        = document.getElementById('tituloModulo');
  const elCategoriasBar = document.getElementById('categoriasBar');
  const elBuscador      = document.getElementById('buscador');
  const elBtnNuevo      = document.getElementById('btnNuevo');
  const elUsuarioNombre = document.getElementById('usuarioNombre');

  let usuario = Sesion.usuario();

  // ---------- Refrescar usuario desde BD al cargar ----------
  // Garantiza que los permisos siempre estén actualizados
  async function refrescarUsuario() {
    try {
      const data = await apiFetch('/auth/me');
      if (data.usuario) {
        Sesion.guardar(Sesion.token(), data.usuario);
        usuario = data.usuario;
      }
    } catch (e) { /* si falla el token ya es inválido, Sesion.cerrar() se dispara solo */ }
  }

  // ---------- Helpers de permisos ----------
  // admin → todo
  // diario → siempre editable (contenido propio)
  // editor/visualizador → según permisos explícitos del módulo
  function puedeEditar(modulo) {
    if (!usuario) return false;
    if (usuario.rol === 'admin') return true;
    if (modulo === 'diario') return true;
    return usuario.permisos?.[modulo]?.editar === true;
  }

  function puedeVer(modulo) {
    if (!usuario) return false;
    if (usuario.rol === 'admin') return true;
    if (modulo === 'diario') return true;
    return usuario.permisos?.[modulo]?.ver !== false;
  }

  // ---------- Navegación lateral ----------
  document.querySelectorAll('.nav-item').forEach((btn) => {
    btn.addEventListener('click', () => irAModulo(btn.dataset.modulo));
  });

  function irAModulo(modulo) {
    estado.moduloActual = modulo;
    estado.categoriaActual = 'Todos';
    estado.busqueda = '';
    elBuscador.value = '';

    document.querySelectorAll('.nav-item').forEach((b) => b.classList.toggle('active', b.dataset.modulo === modulo));
    elTitulo.textContent = MODULOS[modulo].label;

    elBtnNuevo.hidden = modulo === 'inicio' || !puedeEditar(modulo);
    elContenido.classList.toggle('iconos-mode', modulo === 'iconos');

    if (modulo === 'inicio') {
      elContenido.classList.add('inicio-mode');
      renderInicio();
      elCategoriasBar.innerHTML = '';
    } else if (modulo === 'usuarios') {
      elContenido.classList.remove('inicio-mode');
      elCategoriasBar.innerHTML = '';
      if (typeof window.renderSeccionUsuarios === 'function') window.renderSeccionUsuarios();
    } else {
      elContenido.classList.remove('inicio-mode');
      cargarCategorias().then(cargarItems);
    }

    document.getElementById('sidebar').classList.remove('mobile-open');
  }

  // ---------- Colapsar / menú móvil ----------
  document.getElementById('btnColapsar').addEventListener('click', () => {
    document.getElementById('sidebar').classList.toggle('collapsed');
  });
  document.getElementById('btnMenuMovil').addEventListener('click', () => {
    document.getElementById('sidebar').classList.toggle('mobile-open');
  });
  document.getElementById('btnSalir').addEventListener('click', () => Sesion.cerrar());

  // ---------- Inicio ----------
  async function renderInicio() {
    elContenido.style.display = 'block';
    elContenido.innerHTML = `<div class="empty-state">Cargando...</div>`;
    try {
      const items = await apiFetch('/items/inicio');
      const recordatorios = items.filter((i) => i.categoria === 'recordatorio');
      const noticias      = items.filter((i) => i.categoria === 'noticia');
      const esAdmin       = usuario?.rol === 'admin';

      elContenido.innerHTML = `
        <div class="inicio-wrap">
          <div class="inicio-saludo">
            <span class="saludo-icon">👋</span>
            <div>
              <h2>Bienvenido${usuario ? ', ' + escapeHtml(usuario.nombre || usuario.email) : ''}</h2>
              <p>Panel de gestión · Ayudas Banco
                <span class="badge-rol">${rolLabel(usuario?.rol)}</span>
              </p>
            </div>
          </div>

          <div class="inicio-grid">
            <section class="inicio-seccion">
              <div class="inicio-seccion-header">
                <span class="inicio-seccion-icon">📌</span>
                <h3>Recordatorios</h3>
                ${esAdmin ? `<button class="btn btn-sm btn-outline" data-nuevo="recordatorio">+ Nuevo</button>` : ''}
              </div>
              <div class="inicio-lista">
                ${recordatorios.length
                  ? recordatorios.map((r) => tarjetaInicioHTML(r, esAdmin)).join('')
                  : '<p class="inicio-vacio">Sin recordatorios.</p>'}
              </div>
            </section>

            <section class="inicio-seccion">
              <div class="inicio-seccion-header">
                <span class="inicio-seccion-icon">📢</span>
                <h3>Noticias importantes</h3>
                ${esAdmin ? `<button class="btn btn-sm btn-outline" data-nuevo="noticia">+ Nueva</button>` : ''}
              </div>
              <div class="inicio-lista">
                ${noticias.length
                  ? noticias.map((n) => tarjetaInicioHTML(n, esAdmin)).join('')
                  : '<p class="inicio-vacio">Sin noticias.</p>'}
              </div>
            </section>
          </div>
        </div>`;

      if (esAdmin) {
        elContenido.querySelectorAll('[data-nuevo]').forEach((btn) => {
          btn.addEventListener('click', () => abrirModalInicio(null, btn.dataset.nuevo));
        });
        elContenido.querySelectorAll('[data-editar-inicio]').forEach((btn) => {
          const item = items.find((i) => i._id === btn.dataset.editarInicio);
          if (item) btn.addEventListener('click', () => abrirModalInicio(item, item.categoria));
        });
        elContenido.querySelectorAll('[data-borrar-inicio]').forEach((btn) => {
          btn.addEventListener('click', () => borrarItemInicio(btn.dataset.borrarInicio));
        });
      }
    } catch (err) {
      elContenido.innerHTML = `<div class="empty-state">Error: ${err.message}</div>`;
    }
  }

  function rolLabel(rol) {
    const map = { admin: '🔑 Admin', editor: '✏️ Editor', visualizador: '👁️ Visualizador' };
    return map[rol] || '';
  }

  function tarjetaInicioHTML(item, mostrarAcciones) {
    const tipo  = item.categoria;
    const fecha = new Date(item.updatedAt || item.createdAt).toLocaleDateString('es-CO', { day:'2-digit', month:'short', year:'numeric' });
    return `
      <div class="inicio-card ${tipo}-card">
        <div class="inicio-card-body">
          <p class="inicio-card-titulo">${escapeHtml(item.titulo)}</p>
          ${item.contenido ? `<p class="inicio-card-texto">${escapeHtml(item.contenido)}</p>` : ''}
          <span class="inicio-card-fecha">${fecha}</span>
        </div>
        ${mostrarAcciones ? `
        <div class="inicio-card-acciones">
          <button class="icon-action" data-editar-inicio="${item._id}" title="Editar">✏️</button>
          <button class="icon-action danger" data-borrar-inicio="${item._id}" title="Eliminar">🗑️</button>
        </div>` : ''}
      </div>`;
  }

  async function borrarItemInicio(id) {
    if (!confirm('¿Eliminar este elemento?')) return;
    try {
      await apiFetch(`/items/inicio/${id}`, { method: 'DELETE' });
      renderInicio();
    } catch (err) { alert('Error: ' + err.message); }
  }

  function abrirModalInicio(item, tipo) {
    document.getElementById('modalTitulo').textContent     = item
      ? `Editar ${tipo === 'noticia' ? 'noticia' : 'recordatorio'}`
      : `Nuevo ${tipo === 'noticia' ? 'noticia' : 'recordatorio'}`;
    document.getElementById('itemId').value                = item ? item._id : '';
    document.getElementById('campoTitulo').value           = item ? item.titulo : '';
    document.getElementById('campoCategoria').value        = tipo;
    document.getElementById('campoDescripcion').value      = '';
    document.getElementById('campoContenido').value        = item ? item.contenido || '' : '';
    document.getElementById('campoUrl').value              = '';
    document.getElementById('campoImagen').value           = '';
    document.getElementById('campoDestacado').checked      = false;
    document.getElementById('formItem').dataset.moduloOverride = 'inicio';
    document.getElementById('modalOverlay').hidden = false;
  }

  // ---------- Categorías ----------
  async function cargarCategorias() {
    try {
      estado.categorias = await apiFetch(`/items/${estado.moduloActual}/categorias`);
    } catch (err) {
      estado.categorias = [];
    }
    renderCategorias();
  }

  function renderCategorias() {
    const cats = ['Todos', ...estado.categorias];
    elCategoriasBar.innerHTML = cats
      .map((c) => `<button class="chip ${c === estado.categoriaActual ? 'active' : ''}" data-cat="${c}">${c}</button>`)
      .join('');
    elCategoriasBar.querySelectorAll('.chip').forEach((chip) => {
      chip.addEventListener('click', () => {
        estado.categoriaActual = chip.dataset.cat;
        renderCategorias();
        cargarItems();
      });
    });
  }

  // ---------- Buscador ----------
  let timerBusqueda;
  elBuscador.addEventListener('input', () => {
    clearTimeout(timerBusqueda);
    timerBusqueda = setTimeout(() => {
      estado.busqueda = elBuscador.value.trim();
      cargarItems();
    }, 300);
  });

  // ---------- Cargar y pintar items ----------
  async function cargarItems() {
    elContenido.innerHTML = `<div class="empty-state">Cargando...</div>`;
    try {
      const params = new URLSearchParams();
      if (estado.categoriaActual !== 'Todos') params.set('categoria', estado.categoriaActual);
      if (estado.busqueda) params.set('buscar', estado.busqueda);
      estado.items = await apiFetch(`/items/${estado.moduloActual}?${params.toString()}`);
      renderItems();
    } catch (err) {
      elContenido.innerHTML = `<div class="empty-state">Error al cargar: ${err.message}</div>`;
    }
  }

  function renderItems() {
    if (!estado.items.length) {
      elContenido.innerHTML = `<div class="empty-state">No hay registros aún${puedeEditar(estado.moduloActual) ? '. Crea el primero con "+ Nuevo"' : ''}.</div>`;
      return;
    }
    elContenido.innerHTML = estado.items.map(tarjetaHTML).join('');

    elContenido.querySelectorAll('[data-accion="editar"]').forEach((b) =>
      b.addEventListener('click', () => abrirModal(estado.items.find((i) => i._id === b.dataset.id)))
    );
    elContenido.querySelectorAll('[data-accion="eliminar"]').forEach((b) =>
      b.addEventListener('click', () => eliminarItem(b.dataset.id))
    );
    elContenido.querySelectorAll('[data-accion="ver"]').forEach((b) =>
      b.addEventListener('click', () => abrirPreview(estado.items.find((i) => i._id === b.dataset.id)))
    );
    elContenido.querySelectorAll('[data-accion="copiar"]').forEach((b) =>
      b.addEventListener('click', () => copiarContenido(b.dataset.id))
    );
  }

  function tarjetaHTML(item) {
    const esIcono  = estado.moduloActual === 'iconos';
    const editable = puedeEditar(estado.moduloActual);

    const img = item.imagenUrl
      ? esIcono
        ? `<div class="icono-wrap"><img src="${escapeAttr(item.imagenUrl)}" alt="" style="width:50px;height:50px;object-fit:contain;" /></div>`
        : `<img class="card-img" src="${escapeAttr(item.imagenUrl)}" alt="" />`
      : '';

    return `
      <article class="card">
        <div class="card-top">
          <h4 class="card-title">${escapeHtml(item.titulo)}</h4>
          ${item.destacado ? '<span class="badge star">★ Destacado</span>' : `<span class="badge">${escapeHtml(item.categoria || 'General')}</span>`}
        </div>
        ${img}
        <p class="card-desc">${escapeHtml(item.descripcion || '')}</p>
        <div class="card-actions">
          ${item.contenido ? `<button data-accion="ver" data-id="${item._id}">👁️ Ver</button>` : ''}
          ${item.contenido ? `<button data-accion="copiar" data-id="${item._id}">📋 Copiar</button>` : ''}
          ${item.url ? `<button onclick="window.open('${escapeAttr(item.url)}','_blank')">🔗 Abrir</button>` : ''}
          ${editable ? `<button data-accion="editar" data-id="${item._id}">✏️ Editar</button>` : ''}
          ${editable ? `<button class="danger" data-accion="eliminar" data-id="${item._id}">🗑️ Eliminar</button>` : ''}
        </div>
      </article>`;
  }

  async function eliminarItem(id) {
    if (!confirm('¿Eliminar este registro? Esta acción no se puede deshacer.')) return;
    try {
      await apiFetch(`/items/${estado.moduloActual}/${id}`, { method: 'DELETE' });
      await cargarCategorias();
      await cargarItems();
    } catch (err) {
      alert('Error al eliminar: ' + err.message);
    }
  }

  function copiarContenido(id) {
    const item = estado.items.find((i) => i._id === id);
    if (!item) return;
    navigator.clipboard.writeText(item.contenido || '').then(() => {
      const btn = elContenido.querySelector(`[data-accion="copiar"][data-id="${id}"]`);
      if (btn) { const t = btn.textContent; btn.textContent = '✅ Copiado'; setTimeout(() => (btn.textContent = t), 1200); }
    });
  }

  // ---------- Modal crear/editar ----------
  const modalOverlay = document.getElementById('modalOverlay');
  const formItem     = document.getElementById('formItem');

  elBtnNuevo.addEventListener('click', () => abrirModal(null));
  document.getElementById('btnCerrarModal').addEventListener('click', cerrarModal);
  document.getElementById('btnCancelarModal').addEventListener('click', cerrarModal);

  function abrirModal(item) {
    document.getElementById('modalTitulo').textContent     = item ? 'Editar registro' : 'Nuevo registro';
    document.getElementById('itemId').value                = item ? item._id : '';
    document.getElementById('campoTitulo').value           = item ? item.titulo : '';
    document.getElementById('campoCategoria').value        = item ? item.categoria || '' : '';
    document.getElementById('campoDescripcion').value      = item ? item.descripcion || '' : '';
    document.getElementById('campoContenido').value        = item ? item.contenido || '' : '';
    document.getElementById('campoUrl').value              = item ? item.url || '' : '';
    document.getElementById('campoImagen').value           = item ? item.imagenUrl || '' : '';
    document.getElementById('campoDestacado').checked      = item ? !!item.destacado : false;
    modalOverlay.hidden = false;
  }

  function cerrarModal() {
    modalOverlay.hidden = true;
    formItem.reset();
  }

  formItem.addEventListener('submit', async (e) => {
    e.preventDefault();
    const id            = document.getElementById('itemId').value;
    const moduloDestino = formItem.dataset.moduloOverride || estado.moduloActual;
    const payload = {
      titulo:      document.getElementById('campoTitulo').value.trim(),
      categoria:   document.getElementById('campoCategoria').value.trim() || 'General',
      descripcion: document.getElementById('campoDescripcion').value.trim(),
      contenido:   document.getElementById('campoContenido').value,
      url:         document.getElementById('campoUrl').value.trim(),
      imagenUrl:   document.getElementById('campoImagen').value.trim(),
      destacado:   document.getElementById('campoDestacado').checked,
    };
    try {
      if (id) {
        await apiFetch(`/items/${moduloDestino}/${id}`, { method: 'PUT', body: JSON.stringify(payload) });
      } else {
        await apiFetch(`/items/${moduloDestino}`, { method: 'POST', body: JSON.stringify(payload) });
      }
      delete formItem.dataset.moduloOverride;
      cerrarModal();
      if (moduloDestino === 'inicio') {
        renderInicio();
      } else {
        await cargarCategorias();
        await cargarItems();
      }
    } catch (err) {
      alert('Error al guardar: ' + err.message);
    }
  });

  // ---------- Modal vista previa ----------
  const previewOverlay = document.getElementById('previewOverlay');
  document.getElementById('btnCerrarPreview').addEventListener('click', () => (previewOverlay.hidden = true));

  function abrirPreview(item) {
    if (!item) return;
    document.getElementById('previewTitulo').textContent = item.titulo;
    document.getElementById('previewCodigo').textContent = item.contenido || '';
    const render = document.getElementById('previewRender');
    if (estado.moduloActual === 'codigo' || estado.moduloActual === 'plantillas') {
      render.innerHTML = item.contenido || '';
    } else {
      render.innerHTML = '';
    }
    previewOverlay.hidden = false;
  }

  // ---------- Utilidades ----------
  function escapeHtml(str = '') {
    return str.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  }
  function escapeAttr(str = '') { return escapeHtml(str); }

  // ---------- Inicializar ----------
  // Refrescar usuario primero, luego renderizar
  if (usuario) elUsuarioNombre.textContent = usuario.nombre || usuario.email;
  if (usuario?.rol === 'admin') document.body.classList.add('es-admin');

  refrescarUsuario().then(() => {
    if (usuario) elUsuarioNombre.textContent = usuario.nombre || usuario.email;
    if (usuario?.rol === 'admin') document.body.classList.add('es-admin');
    irAModulo('inicio');
  });
})();
