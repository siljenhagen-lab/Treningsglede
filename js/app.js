/* Treningsglede – visninger, navigasjon og handlinger. */
(() => {
  const CATEGORIES = ['Bein', 'Rumpe', 'Rygg', 'Bryst', 'Skuldre', 'Armer', 'Kjerne', 'Kondisjon', 'Mobilitet', 'Annet'];
  const EVENT_COLORS = [
    { key: 'gray', label: 'Grå', css: 'var(--event)' },
    { key: 'violet', label: 'Lilla', css: 'var(--event-violet)' },
    { key: 'green', label: 'Grønn', css: 'var(--event-green)' },
    { key: 'red', label: 'Rød', css: 'var(--event-red)' },
  ];
  const MEASURES = [
    { key: 'hip', label: 'Hofte', color: 'var(--series-1)' },
    { key: 'waist', label: 'Midje', color: 'var(--series-2)' },
    { key: 'thigh', label: 'Lår', color: 'var(--series-3)' },
    { key: 'arm', label: 'Overarm', color: 'var(--series-4)' },
  ];
  const RANGES = [
    { key: '1m', label: '1 mnd', days: 31 },
    { key: '3m', label: '3 mnd', days: 92 },
    { key: '6m', label: '6 mnd', days: 183 },
    { key: '1y', label: '1 år', days: 366 },
    { key: 'all', label: 'Alt', days: null },
  ];

  const view = document.getElementById('view');
  const D = () => Store.data;
  const ui = {
    exSearch: '', exCat: '', exSort: 'name',
    weightRange: '6m', measRange: 'all',
    measShow: { hip: true, waist: true, thigh: true, arm: true }, measEvents: true,
  };

  // ---------- hjelpere ----------
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const fmtDate = (iso) => {
    if (!iso) return '';
    const [y, m, d] = iso.slice(0, 10).split('-');
    return `${+d}.${+m}.${y}`;
  };
  const fmtNum = (v, dec = 1) => (v === null || v === undefined || !Number.isFinite(+v) ? '–' : (+v).toLocaleString('nb-NO', { maximumFractionDigits: dec }));
  const signed = (v, unit) => (v === null ? '–' : `${v > 0 ? '+' : v < 0 ? '−' : '±'}${fmtNum(Math.abs(v))} ${unit}`);
  const daysAgo = (n) => {
    const d = new Date(); d.setDate(d.getDate() - n);
    d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
    return d.toISOString().slice(0, 10);
  };
  const go = (hash) => { location.hash = hash; };
  const plannedText = (it) => {
    const parts = [];
    if (it.sets || it.reps) parts.push(`${it.sets || '?'} × ${it.reps || '?'}`);
    if (it.weight) parts.push(`${it.weight} kg`);
    if (it.rest) parts.push(`pause ${it.rest}`);
    return parts.join(' · ');
  };
  const setsText = (sets) => (sets || []).map((s) => (s.kg ? `${fmtNum(Store.num(s.kg))}×${s.reps || '?'}` : `${s.reps || '?'}`)).join(', ');
  const eventColor = (key) => (EVENT_COLORS.find((c) => c.key === key) || EVENT_COLORS[0]).css;

  function stars(value, opts = {}) {
    let out = `<span class="stars${opts.act ? ' stars-input' : ''}" ${opts.label ? `aria-label="${esc(opts.label)}"` : ''}>`;
    for (let i = 1; i <= 5; i++) {
      const on = i <= (value || 0);
      if (opts.act) {
        out += `<button type="button" class="star${on ? ' on' : ''}" data-act="${opts.act}" data-id="${esc(opts.id || '')}" data-value="${i}" aria-label="${i} av 5">★</button>`;
      } else {
        out += `<span class="star${on ? ' on' : ''}" aria-hidden="true">★</span>`;
      }
    }
    return out + '</span>';
  }

  function toast(msg) {
    const t = document.getElementById('toast');
    t.textContent = msg;
    t.hidden = false;
    clearTimeout(toast._t);
    toast._t = setTimeout(() => (t.hidden = true), 2600);
  }

  const dlg = document.getElementById('modal');
  function openModal(html, onReady) {
    dlg.innerHTML = `<div class="modal-inner">${html}</div>`;
    if (!dlg.open) dlg.showModal();
    if (onReady) onReady(dlg);
  }
  function closeModal() { if (dlg.open) dlg.close(); dlg.innerHTML = ''; }
  dlg.addEventListener('click', (e) => { if (e.target === dlg) closeModal(); });

  function download(filename, text, type = 'application/json') {
    const blob = new Blob([text], { type });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 500);
  }

  function resizeImage(file, max = 640) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      const url = URL.createObjectURL(file);
      img.onload = () => {
        const scale = Math.min(1, max / Math.max(img.width, img.height));
        const c = document.createElement('canvas');
        c.width = Math.round(img.width * scale);
        c.height = Math.round(img.height * scale);
        const ctx = c.getContext('2d');
        ctx.fillStyle = '#fff';
        ctx.fillRect(0, 0, c.width, c.height);
        ctx.drawImage(img, 0, 0, c.width, c.height);
        URL.revokeObjectURL(url);
        resolve(c.toDataURL('image/jpeg', 0.8));
      };
      img.onerror = reject;
      img.src = url;
    });
  }

  const usageCount = (exId) => D().logs.filter((l) => (l.entries || []).some((e) => e.exerciseId === exId)).length;
  const lastLogFor = (programId) => D().logs.filter((l) => l.programId === programId).sort((a, b) => Store.byDate(b, a))[0];

  // ---------- navigasjon ----------
  function route() {
    const parts = (location.hash.replace(/^#\/?/, '') || 'programmer').split('/');
    const [tab, id, sub] = parts;
    document.querySelectorAll('.tabs a').forEach((a) => {
      const t = a.dataset.tab;
      a.classList.toggle('active', t === tab || (t === 'programmer' && tab === 'okt'));
      a.setAttribute('aria-current', a.classList.contains('active') ? 'page' : 'false');
    });
    closeModal();
    window.scrollTo(0, 0);
    switch (tab) {
      case 'programmer':
        if (id === 'ny') return renderProgramEdit(null);
        if (id && sub === 'rediger') return renderProgramEdit(id);
        if (id) return renderProgram(id);
        return renderPrograms();
      case 'okt': return renderWorkout(id);
      case 'ovelser': return id ? renderExercise(id) : renderExercises();
      case 'vekt': return renderWeight();
      case 'mal': return renderMeasurements();
      case 'admin': return renderAdmin();
      default: return renderPrograms();
    }
  }
  window.addEventListener('hashchange', route);
  let resizeT;
  window.addEventListener('resize', () => {
    clearTimeout(resizeT);
    resizeT = setTimeout(() => document.querySelectorAll('[data-chart]').forEach((el) => drawChart(el.dataset.chart, el)), 200);
  });

  // ---------- handlinger (delegert) ----------
  const actions = {};
  document.addEventListener('click', (e) => {
    const el = e.target.closest('[data-act]');
    if (!el || !actions[el.dataset.act]) return;
    e.preventDefault();
    actions[el.dataset.act](el, e);
  });

  /* =====================================================================
   *  TRENINGSPROGRAMMER
   * ===================================================================== */
  function programCard(p) {
    const last = lastLogFor(p.id);
    const thumbs = (p.items || []).slice(0, 4).map((it) => Figures.forExercise(Store.exercise(it.exerciseId), { cls: 'thumb' })).join('');
    return `<a class="card program-card" href="#/programmer/${p.id}">
      <div class="thumbs">${thumbs || '<span class="muted">Ingen øvelser</span>'}</div>
      <div class="card-body">
        <h3>${esc(p.name)}</h3>
        <p class="muted small">${(p.items || []).length} øvelser${last ? ` · sist trent ${fmtDate(last.date)}` : ''}</p>
      </div>
    </a>`;
  }

  function renderPrograms() {
    const progs = [...D().programs].sort((a, b) => a.name.localeCompare(b.name, 'nb'));
    const groups = new Map();
    for (const p of progs) {
      const k = p.source || '';
      if (!groups.has(k)) groups.set(k, []);
      groups.get(k).push(p);
    }
    const keys = [...groups.keys()].sort((a, b) => (a === '' ? -1 : b === '' ? 1 : a.localeCompare(b, 'nb')));
    const draft = Store.getDraft();
    const draftProg = draft && draft.programId && D().programs.find((p) => p.id === draft.programId);

    view.innerHTML = `
      <header class="view-head">
        <h1>Treningsprogrammer</h1>
        <div class="actions">
          <button class="btn" data-act="import-pt">Importer fra PT</button>
          <a class="btn primary" href="#/programmer/ny">+ Nytt program</a>
        </div>
      </header>
      ${draft ? `<div class="banner">Du har en påbegynt økt${draftProg ? ` (${esc(draftProg.name)})` : ''} fra ${fmtDate(draft.date)}.
        <span class="actions"><a class="btn primary small" href="#/okt/${draft.programId || 'fri'}">Fortsett</a>
        <button class="btn small" data-act="discard-draft">Forkast</button></span></div>` : ''}
      <p><a class="btn" href="#/okt/fri">Start fri økt</a> <span class="muted small">– logg øvelser uten program</span></p>
      ${!progs.length ? `<div class="empty">
          <h2>Ingen programmer ennå</h2>
          <p>Start med å importere programmene fra dine tidligere PT-er. Lim inn teksten fra programmet, så lager appen både programmet og øvelsene i øvelsesbanken din.</p>
          <button class="btn primary" data-act="import-pt">Importer fra PT</button>
        </div>` : ''}
      ${keys.map((k) => `
        <section class="group">
          <h2>${k ? esc(k) : 'Mine programmer'}</h2>
          <div class="grid">${groups.get(k).map(programCard).join('')}</div>
        </section>`).join('')}
    `;
  }

  actions['discard-draft'] = () => {
    if (!confirm('Forkaste den påbegynte økten?')) return;
    Store.setDraft(null);
    route();
  };

  function renderProgram(id) {
    const p = D().programs.find((x) => x.id === id);
    if (!p) return notFound();
    const logs = D().logs.filter((l) => l.programId === id).sort((a, b) => Store.byDate(b, a));
    view.innerHTML = `
      <a class="back" href="#/programmer">‹ Programmer</a>
      <header class="view-head">
        <div>
          <h1>${esc(p.name)}</h1>
          ${p.source ? `<span class="tag">${esc(p.source)}</span>` : '<span class="tag">Eget program</span>'}
        </div>
        <div class="actions">
          <a class="btn primary" href="#/okt/${p.id}">Start økt</a>
          <a class="btn" href="#/programmer/${p.id}/rediger">Rediger</a>
          <button class="btn" data-act="dup-program" data-id="${p.id}">Kopier</button>
          <button class="btn danger" data-act="del-program" data-id="${p.id}">Slett</button>
        </div>
      </header>
      ${p.description ? `<p class="prewrap">${esc(p.description)}</p>` : ''}
      <ol class="item-list">
        ${(p.items || []).map((it) => {
          const ex = Store.exercise(it.exerciseId);
          return `<li class="item">
            <a href="#/ovelser/${it.exerciseId}" class="item-fig">${Figures.forExercise(ex, { cls: 'thumb-lg' })}</a>
            <div class="item-body">
              <h3><a href="#/ovelser/${it.exerciseId}">${esc(ex ? ex.name : 'Ukjent øvelse')}</a></h3>
              <p>${esc(plannedText(it)) || '<span class="muted">Ingen plan satt</span>'}</p>
              ${it.note ? `<p class="muted small">${esc(it.note)}</p>` : ''}
              ${ex && ex.rating ? stars(ex.rating) : ''}
            </div>
          </li>`;
        }).join('') || '<p class="muted">Programmet har ingen øvelser. Trykk «Rediger» for å legge til.</p>'}
      </ol>
      <section>
        <h2>Historikk</h2>
        ${logs.length ? `<ul class="log-list">${logs.map(logRow).join('')}</ul>` : '<p class="muted">Ingen økter logget for dette programmet ennå.</p>'}
      </section>`;
  }

  function logRow(l) {
    const scores = (l.entries || []).map((e) => e.score).filter(Boolean);
    const avg = scores.length ? scores.reduce((a, b) => a + b, 0) / scores.length : 0;
    return `<li class="log-row">
      <div><strong>${fmtDate(l.date)}</strong> <span class="muted small">${(l.entries || []).length} øvelser</span>
      ${l.note ? `<div class="muted small">${esc(l.note)}</div>` : ''}</div>
      <div class="log-right">${avg ? stars(Math.round(avg)) : ''}
      <button class="btn small" data-act="show-log" data-id="${l.id}">Vis</button></div>
    </li>`;
  }

  actions['show-log'] = (el) => {
    const l = D().logs.find((x) => x.id === el.dataset.id);
    if (!l) return;
    const prog = D().programs.find((p) => p.id === l.programId);
    openModal(`
      <h2>Økt ${fmtDate(l.date)}</h2>
      <p class="muted">${prog ? esc(prog.name) : 'Fri økt'}</p>
      ${l.note ? `<p class="prewrap">${esc(l.note)}</p>` : ''}
      <table class="table">
        <thead><tr><th>Øvelse</th><th>Sett (kg×reps)</th><th>Score</th></tr></thead>
        <tbody>${(l.entries || []).map((e) => {
          const ex = Store.exercise(e.exerciseId);
          return `<tr><td>${esc(ex ? ex.name : '?')}${e.note ? `<div class="muted small">${esc(e.note)}</div>` : ''}</td><td>${esc(setsText(e.sets))}</td><td>${e.score ? stars(e.score) : ''}</td></tr>`;
        }).join('')}</tbody>
      </table>
      <div class="modal-actions">
        <button class="btn danger" data-act="del-log" data-id="${l.id}">Slett økten</button>
        <button class="btn primary" data-act="close-modal">Lukk</button>
      </div>`);
  };

  actions['del-log'] = (el) => {
    if (!confirm('Slette denne økten permanent?')) return;
    D().logs = D().logs.filter((l) => l.id !== el.dataset.id);
    Store.save();
    closeModal();
    route();
  };
  actions['close-modal'] = closeModal;

  actions['dup-program'] = (el) => {
    const p = D().programs.find((x) => x.id === el.dataset.id);
    const copy = { ...JSON.parse(JSON.stringify(p)), id: Store.uid(), name: `${p.name} (kopi)`, source: '', created: new Date().toISOString() };
    D().programs.push(copy);
    Store.save();
    toast('Kopi laget under «Mine programmer»');
    go(`#/programmer/${copy.id}/rediger`);
  };

  actions['del-program'] = (el) => {
    const p = D().programs.find((x) => x.id === el.dataset.id);
    if (!confirm(`Slette programmet «${p.name}»? Øvelsene blir liggende i øvelsesbanken, og loggede økter beholdes.`)) return;
    D().programs = D().programs.filter((x) => x.id !== p.id);
    Store.save();
    go('#/programmer');
  };

  // ----- rediger program -----
  let editProg = null;

  function renderProgramEdit(id) {
    const existing = id && D().programs.find((x) => x.id === id);
    if (id && !existing) return notFound();
    editProg = existing ? JSON.parse(JSON.stringify(existing)) : { id: null, name: '', source: '', description: '', items: [] };
    const sources = [...new Set(D().programs.map((p) => p.source).filter(Boolean))];
    view.innerHTML = `
      <a class="back" href="${existing ? `#/programmer/${existing.id}` : '#/programmer'}">‹ Tilbake</a>
      <h1>${existing ? 'Rediger program' : 'Nytt program'}</h1>
      <form id="prog-form" class="form">
        <label>Navn <input name="name" required value="${esc(editProg.name)}" placeholder="F.eks. Helkropp A"></label>
        <label>Kilde / PT <input name="source" list="sources" value="${esc(editProg.source)}" placeholder="Tomt = eget program">
          <datalist id="sources">${sources.map((s) => `<option value="${esc(s)}">`).join('')}</datalist></label>
        <label>Beskrivelse <textarea name="description" rows="2">${esc(editProg.description)}</textarea></label>
        <h2>Øvelser</h2>
        <div id="prog-items"></div>
        <button type="button" class="btn" data-act="pick-exercises">+ Legg til fra øvelsesbanken</button>
        <div class="form-actions">
          <button type="submit" class="btn primary">Lagre program</button>
        </div>
      </form>`;
    renderProgItems();
    document.getElementById('prog-form').addEventListener('submit', (e) => {
      e.preventDefault();
      syncProgItems();
      const f = new FormData(e.target);
      editProg.name = f.get('name').trim();
      editProg.source = f.get('source').trim();
      editProg.description = f.get('description').trim();
      if (!editProg.name) return;
      if (editProg.id) {
        const i = D().programs.findIndex((p) => p.id === editProg.id);
        D().programs[i] = { ...D().programs[i], ...editProg };
      } else {
        editProg.id = Store.uid();
        editProg.created = new Date().toISOString();
        D().programs.push(editProg);
      }
      Store.save();
      toast('Program lagret');
      go(`#/programmer/${editProg.id}`);
    });
  }

  function renderProgItems() {
    const box = document.getElementById('prog-items');
    if (!box) return;
    box.innerHTML = editProg.items.length ? editProg.items.map((it, i) => {
      const ex = Store.exercise(it.exerciseId);
      return `<div class="edit-item" data-i="${i}">
        <div class="edit-item-head">
          ${Figures.forExercise(ex, { cls: 'thumb' })}
          <strong>${esc(ex ? ex.name : 'Ukjent')}</strong>
          <span class="actions">
            <button type="button" class="icon-btn" data-act="item-up" data-i="${i}" aria-label="Flytt opp">↑</button>
            <button type="button" class="icon-btn" data-act="item-down" data-i="${i}" aria-label="Flytt ned">↓</button>
            <button type="button" class="icon-btn" data-act="item-del" data-i="${i}" aria-label="Fjern">✕</button>
          </span>
        </div>
        <div class="edit-item-fields">
          <label>Sett <input data-f="sets" inputmode="numeric" value="${esc(it.sets)}"></label>
          <label>Reps <input data-f="reps" value="${esc(it.reps)}" placeholder="10 / 8-12 / 30 sek"></label>
          <label>Kg <input data-f="weight" inputmode="decimal" value="${esc(it.weight)}"></label>
          <label>Pause <input data-f="rest" value="${esc(it.rest)}" placeholder="90 sek"></label>
          <label class="wide">Notat <input data-f="note" value="${esc(it.note)}"></label>
        </div>
      </div>`;
    }).join('') : '<p class="muted">Ingen øvelser lagt til ennå.</p>';
  }

  function syncProgItems() {
    document.querySelectorAll('#prog-items .edit-item').forEach((row) => {
      const it = editProg.items[+row.dataset.i];
      row.querySelectorAll('[data-f]').forEach((inp) => (it[inp.dataset.f] = inp.value.trim()));
    });
  }

  const moveItem = (i, d) => {
    syncProgItems();
    const j = i + d;
    if (j < 0 || j >= editProg.items.length) return;
    [editProg.items[i], editProg.items[j]] = [editProg.items[j], editProg.items[i]];
    renderProgItems();
  };
  actions['item-up'] = (el) => moveItem(+el.dataset.i, -1);
  actions['item-down'] = (el) => moveItem(+el.dataset.i, 1);
  actions['item-del'] = (el) => { syncProgItems(); editProg.items.splice(+el.dataset.i, 1); renderProgItems(); };

  actions['pick-exercises'] = () => {
    syncProgItems();
    openPicker((ids) => {
      for (const id of ids) editProg.items.push({ exerciseId: id, sets: '3', reps: '10', weight: '', rest: '', note: '' });
      renderProgItems();
    });
  };

  /* Velg øvelser fra banken (flervalg) */
  function openPicker(onDone) {
    const chosen = new Set();
    const draw = (q = '') => {
      const n = q.trim().toLowerCase();
      const list = [...D().exercises]
        .filter((e) => !n || e.name.toLowerCase().includes(n) || (e.category || '').toLowerCase().includes(n))
        .sort((a, b) => a.name.localeCompare(b.name, 'nb'));
      document.getElementById('pick-list').innerHTML = list.map((e) => `
        <label class="pick-row"><input type="checkbox" value="${e.id}" ${chosen.has(e.id) ? 'checked' : ''}>
          ${Figures.forExercise(e, { cls: 'thumb' })}<span>${esc(e.name)} <span class="muted small">${esc(e.category || '')}</span></span></label>`).join('') +
        (n && !list.some((e) => e.name.toLowerCase() === n) ? `<button type="button" class="btn" id="pick-new">+ Opprett «${esc(q.trim())}»</button>` : '') +
        (!D().exercises.length && !n ? '<p class="muted">Øvelsesbanken er tom. Skriv et navn over for å opprette en øvelse.</p>' : '');
      const nb = document.getElementById('pick-new');
      if (nb) nb.onclick = () => {
        const ex = Store.addExercise({ name: q.trim() });
        Store.save();
        chosen.add(ex.id);
        document.getElementById('pick-q').value = '';
        draw('');
      };
    };
    openModal(`
      <h2>Velg øvelser</h2>
      <input id="pick-q" type="search" placeholder="Søk eller skriv navn på ny øvelse" autocomplete="off">
      <div id="pick-list" class="pick-list"></div>
      <div class="modal-actions">
        <button class="btn" data-act="close-modal">Avbryt</button>
        <button class="btn primary" id="pick-ok">Legg til</button>
      </div>`, () => {
      draw();
      const q = document.getElementById('pick-q');
      q.addEventListener('input', () => draw(q.value));
      document.getElementById('pick-list').addEventListener('change', (e) => {
        if (e.target.type === 'checkbox') e.target.checked ? chosen.add(e.target.value) : chosen.delete(e.target.value);
      });
      document.getElementById('pick-ok').onclick = () => { closeModal(); onDone([...chosen]); };
    });
  }

  // ----- import fra PT -----
  let importSections = [];
  actions['import-pt'] = () => {
    const sources = [...new Set(D().programs.map((p) => p.source).filter(Boolean))];
    openModal(`
      <h2>Importer program fra PT</h2>
      <p class="muted small">Lim inn programmet som tekst – én øvelse per linje. Appen kjenner igjen f.eks. <code>Knebøy 3x10 40kg</code>,
        <code>Rumensk markløft 3 sett 8-12 reps @ 30 kg, pause 90 sek</code> og <code>Planke 3 x 30 sek</code>.
        Linjer som <code>Dag 1:</code> eller <code># Overkropp</code> deler opp i flere programmer.
        Har du programmet som PDF, marker og kopier teksten derfra.</p>
      <form id="imp-form" class="form">
        <label>PT / kilde <input name="source" list="imp-sources" required placeholder="F.eks. PT Kari, vår 2024">
          <datalist id="imp-sources">${sources.map((s) => `<option value="${esc(s)}">`).join('')}</datalist></label>
        <label>Programnavn <input name="name" placeholder="F.eks. Styrke 3 dager"></label>
        <label>Programtekst <textarea name="text" rows="10" required placeholder="Dag 1 – Bein:\nKnebøy 3x10 40kg\nHip thrust 4x12 60kg\n\nDag 2 – Overkropp:\nNedtrekk 3x12 35kg"></textarea></label>
        <label class="file-label">…eller hent fra tekstfil <input type="file" id="imp-file" accept=".txt,.csv,.md,text/plain"></label>
        <div class="modal-actions">
          <button type="button" class="btn" data-act="close-modal">Avbryt</button>
          <button type="submit" class="btn primary">Tolk teksten</button>
        </div>
      </form>`, () => {
      document.getElementById('imp-file').addEventListener('change', async (e) => {
        const file = e.target.files[0];
        if (file) document.querySelector('#imp-form [name=text]').value = await file.text();
      });
      document.getElementById('imp-form').addEventListener('submit', (e) => {
        e.preventDefault();
        const f = new FormData(e.target);
        const sections = Parser.parse(f.get('text'));
        if (!sections.length) return alert('Fant ingen øvelser i teksten.');
        const base = f.get('name').trim() || f.get('source').trim();
        importSections = sections.map((s, i) => ({
          name: sections.length > 1 ? `${base} – ${s.title || `Del ${i + 1}`}` : (f.get('name').trim() || s.title || base),
          items: s.items,
        }));
        showImportPreview(f.get('source').trim());
      });
    });
  };

  function showImportPreview(source) {
    const figOpts = Figures.list().map((o) => `<option value="${o.key}">${esc(o.label)}</option>`).join('');
    openModal(`
      <h2>Sjekk importen</h2>
      <p class="muted small">Rett opp navn og tall før du lagrer. Øvelser som allerede finnes i banken (samme navn) blir gjenbrukt.</p>
      <form id="imp-prev" class="form">
        <input type="hidden" name="source" value="${esc(source)}">
        ${importSections.map((s, si) => `
          <fieldset class="imp-section" data-si="${si}">
            <label>Programnavn <input class="imp-name" value="${esc(s.name)}" required></label>
            ${s.items.map((it, ii) => {
              const match = Store.findExerciseByName(it.name);
              return `<div class="imp-row" data-ii="${ii}">
                <div class="imp-row-head">
                  <input class="imp-f grow" data-f="name" value="${esc(it.name)}" aria-label="Navn">
                  <span class="tag ${match ? 'ok' : ''}">${match ? 'Finnes' : 'Ny'}</span>
                  <button type="button" class="icon-btn imp-del" aria-label="Fjern">✕</button>
                </div>
                <div class="edit-item-fields">
                  <label>Sett <input class="imp-f" data-f="sets" value="${esc(it.sets)}"></label>
                  <label>Reps <input class="imp-f" data-f="reps" value="${esc(it.reps)}"></label>
                  <label>Kg <input class="imp-f" data-f="weight" value="${esc(it.weight)}"></label>
                  <label>Pause <input class="imp-f" data-f="rest" value="${esc(it.rest)}"></label>
                  <label class="wide">Notat <input class="imp-f" data-f="note" value="${esc(it.note)}"></label>
                  ${match ? '' : `<label class="wide">Tegning <select class="imp-f" data-f="figure">${figOpts.replace(`value="${Figures.guess(it.name)}"`, `value="${Figures.guess(it.name)}" selected`)}</select></label>`}
                </div>
              </div>`;
            }).join('')}
          </fieldset>`).join('')}
        <div class="modal-actions">
          <button type="button" class="btn" data-act="import-pt">Tilbake</button>
          <button type="submit" class="btn primary">Lagre ${importSections.length > 1 ? `${importSections.length} programmer` : 'programmet'}</button>
        </div>
      </form>`, () => {
      const form = document.getElementById('imp-prev');
      form.addEventListener('click', (e) => {
        if (e.target.classList.contains('imp-del')) e.target.closest('.imp-row').remove();
      });
      form.addEventListener('submit', (e) => {
        e.preventDefault();
        let created = 0, progs = 0;
        form.querySelectorAll('.imp-section').forEach((sec) => {
          const items = [];
          sec.querySelectorAll('.imp-row').forEach((row) => {
            const v = {};
            row.querySelectorAll('.imp-f').forEach((inp) => (v[inp.dataset.f] = inp.value.trim()));
            if (!v.name) return;
            let ex = Store.findExerciseByName(v.name);
            if (!ex) {
              ex = Store.addExercise({ name: v.name, figure: v.figure || Figures.guess(v.name), source });
              created++;
            }
            items.push({ exerciseId: ex.id, sets: v.sets, reps: v.reps, weight: v.weight, rest: v.rest, note: v.note });
          });
          if (!items.length) return;
          D().programs.push({ id: Store.uid(), name: sec.querySelector('.imp-name').value.trim() || source, source, description: '', items, created: new Date().toISOString() });
          progs++;
        });
        Store.save();
        closeModal();
        toast(`Importerte ${progs} program og ${created} nye øvelser`);
        route();
      });
    });
  }

  // ----- økt (logging) -----
  let draft = null;

  function newDraft(programId) {
    const p = programId !== 'fri' ? D().programs.find((x) => x.id === programId) : null;
    return {
      programId: p ? p.id : null,
      date: Store.today(),
      note: '',
      startedAt: new Date().toISOString(),
      entries: p ? (p.items || []).map((it) => makeEntry(it.exerciseId, it)) : [],
    };
  }

  function makeEntry(exerciseId, planned = {}) {
    const last = Store.lastEntryFor(exerciseId);
    const lastSets = last ? last.entry.sets || [] : [];
    const n = parseInt(planned.sets, 10) || lastSets.length || 3;
    const plannedReps = (String(planned.reps || '').match(/\d+/) || [''])[0];
    const sets = [];
    for (let i = 0; i < n; i++) {
      const ls = lastSets[i] || lastSets[lastSets.length - 1];
      sets.push({ kg: ls && ls.kg ? ls.kg : (planned.weight || '').split('-')[0], reps: ls && ls.reps ? ls.reps : plannedReps, done: false });
    }
    return { exerciseId, planned: { sets: planned.sets || '', reps: planned.reps || '', weight: planned.weight || '', rest: planned.rest || '', note: planned.note || '' }, sets, score: 0, note: '' };
  }

  function renderWorkout(programId) {
    const p = programId && programId !== 'fri' ? D().programs.find((x) => x.id === programId) : null;
    if (programId && programId !== 'fri' && !p) return notFound();
    const existing = Store.getDraft();
    const want = p ? p.id : null;
    if (existing && (existing.programId || null) === want) draft = existing;
    else {
      if (existing && !confirm('Du har en annen påbegynt økt. Vil du forkaste den og starte en ny?')) {
        return go(`#/okt/${existing.programId || 'fri'}`);
      }
      draft = newDraft(programId || 'fri');
      Store.setDraft(draft);
    }
    drawWorkout(p);
  }

  function drawWorkout(p) {
    view.innerHTML = `
      <a class="back" href="${p ? `#/programmer/${p.id}` : '#/programmer'}">‹ ${p ? esc(p.name) : 'Programmer'}</a>
      <header class="view-head">
        <h1>${p ? esc(p.name) : 'Fri økt'}</h1>
        <label class="inline">Dato <input type="date" id="w-date" value="${draft.date}"></label>
      </header>
      <p class="muted small">Huk av ✓ for settene du har gjort – bare avhukede sett lagres. Tallene er forhåndsutfylt fra forrige gang.</p>
      <div id="w-entries">${draft.entries.map(entryCard).join('')}</div>
      <button class="btn" data-act="w-add-ex">+ Legg til øvelse</button>
      <section class="form">
        <label>Notat for økten <textarea id="w-note" rows="2" placeholder="Dagsform, søvn, smerter …">${esc(draft.note)}</textarea></label>
        <div class="form-actions">
          <button class="btn" data-act="w-cancel">Avbryt økten</button>
          <button class="btn primary" data-act="w-save">Lagre økt</button>
        </div>
      </section>`;
    const persist = () => Store.setDraft(draft);
    view.querySelector('#w-date').addEventListener('change', (e) => { draft.date = e.target.value || Store.today(); persist(); });
    view.querySelector('#w-note').addEventListener('input', (e) => { draft.note = e.target.value; persist(); });
    view.querySelector('#w-entries').addEventListener('input', (e) => {
      const card = e.target.closest('[data-ei]');
      if (!card) return;
      const entry = draft.entries[+card.dataset.ei];
      if (e.target.dataset.set !== undefined) entry.sets[+e.target.dataset.set][e.target.dataset.f] = e.target.value;
      else if (e.target.dataset.f === 'note') entry.note = e.target.value;
      persist();
    });
  }

  function entryCard(entry, ei) {
    const ex = Store.exercise(entry.exerciseId);
    const last = Store.lastEntryFor(entry.exerciseId);
    return `<article class="card entry" data-ei="${ei}">
      <div class="entry-head">
        <a href="#/ovelser/${entry.exerciseId}" class="entry-fig">${Figures.forExercise(ex, { cls: 'thumb-lg' })}</a>
        <div>
          <h3>${esc(ex ? ex.name : 'Ukjent øvelse')}</h3>
          ${plannedText(entry.planned) ? `<p class="small">Plan: ${esc(plannedText(entry.planned))}</p>` : ''}
          ${entry.planned.note ? `<p class="muted small">${esc(entry.planned.note)}</p>` : ''}
          ${last ? `<p class="muted small">Forrige gang (${fmtDate(last.log.date)}): ${esc(setsText(last.entry.sets))}</p>` : ''}
        </div>
        <button class="icon-btn" data-act="w-del-ex" data-ei="${ei}" aria-label="Fjern øvelse">✕</button>
      </div>
      <table class="sets">
        <thead><tr><th>Sett</th><th>Kg</th><th>Reps</th><th>Gjort</th></tr></thead>
        <tbody>${entry.sets.map((s, si) => `
          <tr class="${s.done ? 'done' : ''}">
            <td>${si + 1}</td>
            <td><input data-set="${si}" data-f="kg" inputmode="decimal" value="${esc(s.kg)}" aria-label="Kg sett ${si + 1}"></td>
            <td><input data-set="${si}" data-f="reps" inputmode="numeric" value="${esc(s.reps)}" aria-label="Reps sett ${si + 1}"></td>
            <td><button class="check${s.done ? ' on' : ''}" data-act="w-done" data-ei="${ei}" data-si="${si}" aria-label="Sett ${si + 1} gjort" aria-pressed="${s.done}">✓</button></td>
          </tr>`).join('')}
        </tbody>
      </table>
      <div class="entry-foot">
        <span><button class="btn small" data-act="w-add-set" data-ei="${ei}">+ Sett</button>
        <button class="btn small" data-act="w-rem-set" data-ei="${ei}">− Sett</button></span>
        <span class="score">Score ${stars(entry.score, { act: 'w-score', id: String(ei), label: 'Score for øvelsen i dag' })}</span>
      </div>
      <input class="entry-note" data-f="note" value="${esc(entry.note)}" placeholder="Notat (f.eks. teknikk, tungt/lett)">
    </article>`;
  }

  const redrawEntry = (ei) => {
    const old = view.querySelector(`[data-ei="${ei}"].entry`);
    if (old) old.outerHTML = entryCard(draft.entries[ei], ei);
    Store.setDraft(draft);
  };
  actions['w-done'] = (el) => {
    const s = draft.entries[+el.dataset.ei].sets[+el.dataset.si];
    s.done = !s.done;
    redrawEntry(+el.dataset.ei);
  };
  actions['w-add-set'] = (el) => {
    const e = draft.entries[+el.dataset.ei];
    const prev = e.sets[e.sets.length - 1] || { kg: '', reps: '' };
    e.sets.push({ kg: prev.kg, reps: prev.reps, done: false });
    redrawEntry(+el.dataset.ei);
  };
  actions['w-rem-set'] = (el) => {
    const e = draft.entries[+el.dataset.ei];
    if (e.sets.length > 1) e.sets.pop();
    redrawEntry(+el.dataset.ei);
  };
  actions['w-score'] = (el) => {
    const e = draft.entries[+el.dataset.id];
    const v = +el.dataset.value;
    e.score = e.score === v ? 0 : v;
    redrawEntry(+el.dataset.id);
  };
  actions['w-del-ex'] = (el) => {
    draft.entries.splice(+el.dataset.ei, 1);
    Store.setDraft(draft);
    drawWorkout(D().programs.find((p) => p.id === draft.programId));
  };
  actions['w-add-ex'] = () => {
    openPicker((ids) => {
      for (const id of ids) draft.entries.push(makeEntry(id));
      Store.setDraft(draft);
      drawWorkout(D().programs.find((p) => p.id === draft.programId));
    });
  };
  actions['w-cancel'] = () => {
    if (!confirm('Avbryte økten? Det du har fylt inn blir ikke lagret.')) return;
    Store.setDraft(null);
    go(draft.programId ? `#/programmer/${draft.programId}` : '#/programmer');
  };
  actions['w-save'] = () => {
    const entries = draft.entries
      .map((e) => ({
        exerciseId: e.exerciseId,
        sets: e.sets.filter((s) => s.done).map((s) => ({ kg: String(s.kg).replace(',', '.').trim(), reps: String(s.reps).trim() })),
        score: e.score || 0,
        note: (e.note || '').trim(),
      }))
      .filter((e) => e.sets.length || e.score || e.note);
    if (!entries.length) return alert('Du har ikke huket av noen sett ennå. Trykk ✓ på settene du har gjort.');
    D().logs.push({ id: Store.uid(), date: draft.date, programId: draft.programId, note: draft.note.trim(), entries, created: new Date().toISOString() });
    Store.save();
    Store.setDraft(null);
    toast('Økten er lagret 💪');
    go(draft.programId ? `#/programmer/${draft.programId}` : '#/programmer');
  };

  /* =====================================================================
   *  ØVELSESBANK
   * ===================================================================== */
  function renderExercises() {
    view.innerHTML = `
      <header class="view-head">
        <h1>Øvelsesbank</h1>
        <div class="actions"><button class="btn primary" data-act="new-ex">+ Ny øvelse</button></div>
      </header>
      <div class="filters">
        <input type="search" id="ex-q" placeholder="Søk" value="${esc(ui.exSearch)}" aria-label="Søk i øvelser">
        <select id="ex-cat" aria-label="Kategori"><option value="">Alle kategorier</option>${CATEGORIES.map((c) => `<option ${c === ui.exCat ? 'selected' : ''}>${c}</option>`).join('')}</select>
        <select id="ex-sort" aria-label="Sortering">
          <option value="name" ${ui.exSort === 'name' ? 'selected' : ''}>Navn</option>
          <option value="rating" ${ui.exSort === 'rating' ? 'selected' : ''}>Score</option>
          <option value="used" ${ui.exSort === 'used' ? 'selected' : ''}>Mest brukt</option>
        </select>
      </div>
      <div id="ex-list" class="grid"></div>`;
    const draw = () => {
      const n = ui.exSearch.trim().toLowerCase();
      let list = D().exercises.filter((e) =>
        (!ui.exCat || e.category === ui.exCat) &&
        (!n || [e.name, e.muscles, e.equipment, e.source].some((v) => (v || '').toLowerCase().includes(n))));
      const used = new Map(list.map((e) => [e.id, usageCount(e.id)]));
      list.sort((a, b) =>
        ui.exSort === 'rating' ? (b.rating || 0) - (a.rating || 0) || a.name.localeCompare(b.name, 'nb')
          : ui.exSort === 'used' ? used.get(b.id) - used.get(a.id) || a.name.localeCompare(b.name, 'nb')
            : a.name.localeCompare(b.name, 'nb'));
      document.getElementById('ex-list').innerHTML = list.length ? list.map((e) => `
        <a class="card ex-card" href="#/ovelser/${e.id}">
          ${Figures.forExercise(e, { cls: 'card-fig' })}
          <div class="card-body">
            <h3>${esc(e.name)}</h3>
            <div class="row-between">${stars(e.rating)}<span class="muted small">${esc(e.category || '')}</span></div>
            <p class="muted small">${used.get(e.id) ? `${used.get(e.id)} økter` : 'Ikke trent ennå'}${e.source ? ` · ${esc(e.source)}` : ''}</p>
          </div>
        </a>`).join('') : `<div class="empty"><p>${D().exercises.length ? 'Ingen øvelser passer filteret.' : 'Øvelsesbanken er tom. Importer et PT-program under «Programmer», eller legg inn øvelser selv.'}</p></div>`;
    };
    draw();
    document.getElementById('ex-q').addEventListener('input', (e) => { ui.exSearch = e.target.value; draw(); });
    document.getElementById('ex-cat').addEventListener('change', (e) => { ui.exCat = e.target.value; draw(); });
    document.getElementById('ex-sort').addEventListener('change', (e) => { ui.exSort = e.target.value; draw(); });
  }

  function renderExercise(id) {
    const ex = Store.exercise(id);
    if (!ex) return notFound();
    const hist = Store.historyFor(id);
    const stats = hist.map((h) => ({ date: h.log.date, ...Store.entryStats(h.entry) }));
    const best = (k) => stats.reduce((m, s) => (s[k] !== null && (m === null || s[k] > m) ? s[k] : m), null);
    const inProgs = D().programs.filter((p) => (p.items || []).some((it) => it.exerciseId === id));
    const hasKg = stats.some((s) => s.maxKg);
    view.innerHTML = `
      <a class="back" href="#/ovelser">‹ Øvelsesbank</a>
      <header class="view-head">
        <div>
          <h1>${esc(ex.name)}</h1>
          <span class="tag">${esc(ex.category || 'Annet')}</span>${ex.source ? ` <span class="tag">${esc(ex.source)}</span>` : ''}
        </div>
        <div class="actions">
          <button class="btn" data-act="edit-ex" data-id="${ex.id}">Rediger</button>
          <button class="btn danger" data-act="del-ex" data-id="${ex.id}">Slett</button>
        </div>
      </header>
      <div class="ex-detail">
        <div class="ex-figure">${Figures.forExercise(ex, { cls: 'big', title: ex.name })}
          ${ex.image ? `<details><summary class="small">Vis skjematisk tegning</summary>${Figures.render(ex.figure || Figures.guess(ex.name), { cls: 'big' })}</details>` : ''}
        </div>
        <div class="ex-info">
          <div class="rating-row"><span>Min score</span> ${stars(ex.rating, { act: 'rate-ex', id: ex.id, label: 'Gi øvelsen score' })}</div>
          ${ex.muscles ? `<p><strong>Muskler:</strong> ${esc(ex.muscles)}</p>` : ''}
          ${ex.equipment ? `<p><strong>Utstyr:</strong> ${esc(ex.equipment)}</p>` : ''}
          ${ex.description ? `<h3>Utførelse</h3><p class="prewrap">${esc(ex.description)}</p>` : ''}
          ${ex.notes ? `<h3>Mine notater</h3><p class="prewrap">${esc(ex.notes)}</p>` : ''}
          ${inProgs.length ? `<p class="small"><strong>Brukes i:</strong> ${inProgs.map((p) => `<a href="#/programmer/${p.id}">${esc(p.name)}</a>`).join(', ')}</p>` : ''}
        </div>
      </div>
      <section>
        <h2>Mine stats</h2>
        <div class="tiles">
          <div class="tile"><span class="tile-label">Økter</span><span class="tile-value">${hist.length}</span></div>
          <div class="tile"><span class="tile-label">Beste vekt</span><span class="tile-value">${fmtNum(best('maxKg'))}<small> kg</small></span></div>
          <div class="tile"><span class="tile-label">Estimert 1RM</span><span class="tile-value">${fmtNum(best('best1RM'))}<small> kg</small></span></div>
          <div class="tile"><span class="tile-label">Sist trent</span><span class="tile-value small-val">${hist.length ? fmtDate(hist[0].log.date) : '–'}</span></div>
        </div>
        ${hasKg ? `<h3>Tyngste sett per økt</h3><div data-chart="ex:${ex.id}"></div>` : ''}
        <button class="btn" data-act="log-ex" data-id="${ex.id}">+ Logg denne øvelsen</button>
        ${hist.length ? `<table class="table">
          <thead><tr><th>Dato</th><th>Sett (kg×reps)</th><th>Score</th></tr></thead>
          <tbody>${hist.map((h) => `<tr><td>${fmtDate(h.log.date)}</td><td>${esc(setsText(h.entry.sets))}${h.entry.note ? `<div class="muted small">${esc(h.entry.note)}</div>` : ''}</td><td>${h.entry.score ? stars(h.entry.score) : ''}</td></tr>`).join('')}</tbody>
        </table>` : '<p class="muted">Ingen logger ennå.</p>'}
      </section>`;
    view.querySelectorAll('[data-chart]').forEach((el) => drawChart(el.dataset.chart, el));
  }

  actions['rate-ex'] = (el) => {
    const ex = Store.exercise(el.dataset.id);
    const v = +el.dataset.value;
    ex.rating = ex.rating === v ? 0 : v;
    Store.save();
    el.closest('.stars').outerHTML = stars(ex.rating, { act: 'rate-ex', id: ex.id, label: 'Gi øvelsen score' });
  };

  actions['log-ex'] = (el) => {
    const existing = Store.getDraft();
    if (existing && existing.programId === null) {
      existing.entries.push(makeEntry(el.dataset.id));
      Store.setDraft(existing);
    } else if (!existing) {
      const d = newDraft('fri');
      d.entries.push(makeEntry(el.dataset.id));
      Store.setDraft(d);
    } else {
      return alert('Du har en påbegynt programøkt. Fullfør eller forkast den først (under Programmer).');
    }
    go('#/okt/fri');
  };

  actions['new-ex'] = () => openExerciseForm(null);
  actions['edit-ex'] = (el) => openExerciseForm(el.dataset.id);
  actions['del-ex'] = (el) => {
    const ex = Store.exercise(el.dataset.id);
    const inProgs = D().programs.filter((p) => (p.items || []).some((it) => it.exerciseId === ex.id));
    const msg = inProgs.length
      ? `«${ex.name}» brukes i ${inProgs.length} program(mer) og blir fjernet derfra. Loggede økter beholdes. Slette?`
      : `Slette «${ex.name}»?`;
    if (!confirm(msg)) return;
    D().exercises = D().exercises.filter((e) => e.id !== ex.id);
    for (const p of D().programs) p.items = (p.items || []).filter((it) => it.exerciseId !== ex.id);
    Store.save();
    go('#/ovelser');
  };

  function openExerciseForm(id) {
    const ex = id ? Store.exercise(id) : null;
    const v = ex ? { ...ex } : { name: '', category: 'Annet', muscles: '', equipment: '', figure: '', image: '', description: '', notes: '', source: '', rating: 0 };
    const figOpts = (sel) => Figures.list().map((o) => `<option value="${o.key}" ${o.key === sel ? 'selected' : ''}>${esc(o.label)}</option>`).join('');
    openModal(`
      <h2>${ex ? 'Rediger øvelse' : 'Ny øvelse'}</h2>
      <form id="ex-form" class="form">
        <label>Navn <input name="name" required value="${esc(v.name)}"></label>
        <div class="two">
          <label>Kategori <select name="category">${CATEGORIES.map((c) => `<option ${c === v.category ? 'selected' : ''}>${c}</option>`).join('')}</select></label>
          <label>Utstyr <input name="equipment" value="${esc(v.equipment)}" placeholder="Stang, manualer …"></label>
        </div>
        <label>Muskler <input name="muscles" value="${esc(v.muscles)}" placeholder="F.eks. sete, baklår"></label>
        <label>Skjematisk tegning <select name="figure" id="ex-fig-sel">${figOpts(v.figure || Figures.guess(v.name))}</select></label>
        <div id="ex-fig-prev" class="fig-preview"></div>
        <div class="image-row">
          <label class="file-label">Eget bilde/skisse (valgfritt) <input type="file" id="ex-img" accept="image/*"></label>
          <button type="button" class="btn small" id="ex-img-del" ${v.image ? '' : 'hidden'}>Fjern bilde</button>
        </div>
        <label>Utførelse / tips <textarea name="description" rows="3">${esc(v.description)}</textarea></label>
        <label>Mine notater <textarea name="notes" rows="2">${esc(v.notes)}</textarea></label>
        <label>Kilde <input name="source" value="${esc(v.source)}" placeholder="F.eks. PT Kari"></label>
        <div class="modal-actions">
          <button type="button" class="btn" data-act="close-modal">Avbryt</button>
          <button type="submit" class="btn primary">Lagre</button>
        </div>
      </form>`, () => {
      const form = document.getElementById('ex-form');
      const sel = document.getElementById('ex-fig-sel');
      const prev = document.getElementById('ex-fig-prev');
      let image = v.image || '';
      let figTouched = !!ex;
      const drawPrev = () => {
        prev.innerHTML = (image ? `<img class="figure figure-img" src="${image}" alt="">` : '') + Figures.render(sel.value);
      };
      drawPrev();
      sel.addEventListener('change', () => { figTouched = true; drawPrev(); });
      const nameInp = form.elements.namedItem('name');
      nameInp.addEventListener('input', () => {
        if (!figTouched) { sel.value = Figures.guess(nameInp.value); drawPrev(); }
      });
      document.getElementById('ex-img').addEventListener('change', async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        try {
          image = await resizeImage(file);
          document.getElementById('ex-img-del').hidden = false;
          drawPrev();
        } catch { alert('Kunne ikke lese bildet.'); }
      });
      document.getElementById('ex-img-del').addEventListener('click', () => {
        image = '';
        document.getElementById('ex-img-del').hidden = true;
        drawPrev();
      });
      form.addEventListener('submit', (e) => {
        e.preventDefault();
        const f = Object.fromEntries(new FormData(form));
        const fields = {
          name: f.name.trim(), category: f.category, equipment: f.equipment.trim(), muscles: f.muscles.trim(),
          figure: f.figure, image, description: f.description.trim(), notes: f.notes.trim(), source: f.source.trim(),
        };
        if (!fields.name) return;
        const dup = Store.findExerciseByName(fields.name);
        if (dup && (!ex || dup.id !== ex.id) && !confirm(`Det finnes allerede en øvelse som heter «${dup.name}». Lagre likevel?`)) return;
        let target;
        if (ex) { Object.assign(ex, fields); target = ex; } else { target = Store.addExercise(fields); }
        if (!Store.save()) return;
        closeModal();
        if (location.hash === `#/ovelser/${target.id}`) route(); else go(`#/ovelser/${target.id}`);
      });
    });
  }

  /* =====================================================================
   *  VEKT
   * ===================================================================== */
  function rangeFrom(key) {
    const r = RANGES.find((x) => x.key === key);
    return r && r.days ? daysAgo(r.days) : null;
  }
  const rangeButtons = (current, act) => `<div class="seg" role="group" aria-label="Tidsperiode">${RANGES.map((r) =>
    `<button class="${r.key === current ? 'on' : ''}" data-act="${act}" data-value="${r.key}" aria-pressed="${r.key === current}">${r.label}</button>`).join('')}</div>`;

  function renderWeight() {
    const ws = [...D().weights].sort(Store.byDate);
    const last = ws[ws.length - 1];
    const first = ws[0];
    const ref30 = [...ws].reverse().find((w) => w.date <= daysAgo(30));
    const events = [...D().events].sort(Store.byDate);
    view.innerHTML = `
      <header class="view-head"><h1>Vekt</h1></header>
      <form id="w-form" class="inline-form">
        <label>Dato <input type="date" name="date" value="${Store.today()}" required></label>
        <label>Vekt (kg) <input name="kg" inputmode="decimal" required placeholder="${last ? fmtNum(last.kg) : '70,0'}"></label>
        <button class="btn primary">Lagre</button>
      </form>
      <div class="tiles">
        <div class="tile"><span class="tile-label">Nå</span><span class="tile-value">${last ? fmtNum(last.kg) : '–'}<small> kg</small></span></div>
        <div class="tile"><span class="tile-label">Siste 30 dager</span><span class="tile-value">${last && ref30 ? signed(last.kg - ref30.kg, 'kg') : '–'}</span></div>
        <div class="tile"><span class="tile-label">Siden start</span><span class="tile-value">${last && first && first !== last ? signed(last.kg - first.kg, 'kg') : '–'}</span></div>
      </div>
      ${rangeButtons(ui.weightRange, 'w-range')}
      <div data-chart="weight"></div>

      <section>
        <h2>Hendelser</h2>
        <p class="muted small">Markeres som loddrette linjer i grafen (f.eks. oppstart/slutt på medisin). Legg inn en sluttdato for å skravere hele perioden.</p>
        <form id="ev-form" class="inline-form">
          <label class="grow">Hendelse <input name="label" required placeholder="F.eks. Startet medisin X"></label>
          <label>Fra <input type="date" name="date" value="${Store.today()}" required></label>
          <label>Til (valgfritt) <input type="date" name="end"></label>
          <label>Farge <select name="color">${EVENT_COLORS.map((c) => `<option value="${c.key}">${c.label}</option>`).join('')}</select></label>
          <button class="btn primary">Legg til</button>
        </form>
        ${events.length ? `<ul class="plain-list">${events.map((e) => `
          <li><span class="ev-swatch" style="background:${eventColor(e.color)}"></span>
            <span class="grow"><strong>${esc(e.label)}</strong> <span class="muted small">${fmtDate(e.date)}${e.end ? ` – ${fmtDate(e.end)}` : ''}</span></span>
            <button class="btn small" data-act="ev-edit" data-id="${e.id}">Endre</button>
            <button class="icon-btn" data-act="ev-del" data-id="${e.id}" aria-label="Slett hendelse">✕</button></li>`).join('')}</ul>` : ''}
      </section>

      <details class="section">
        <summary><h2>Alle registreringer (${ws.length})</h2></summary>
        <table class="table">
          <thead><tr><th>Dato</th><th>Kg</th><th></th></tr></thead>
          <tbody>${[...ws].reverse().map((w) => `<tr><td>${fmtDate(w.date)}</td><td>${fmtNum(w.kg)}</td><td class="right"><button class="icon-btn" data-act="w-del" data-id="${w.id}" aria-label="Slett">✕</button></td></tr>`).join('')}</tbody>
        </table>
      </details>`;

    view.querySelector('#w-form').addEventListener('submit', (e) => {
      e.preventDefault();
      const f = new FormData(e.target);
      const kg = Store.num(f.get('kg'));
      if (kg === null || kg <= 0) return alert('Skriv inn en gyldig vekt.');
      const date = f.get('date');
      const same = D().weights.find((w) => w.date === date);
      if (same) same.kg = kg; else D().weights.push({ id: Store.uid(), date, kg });
      Store.save();
      toast(same ? 'Vekt oppdatert for datoen' : 'Vekt lagret');
      renderWeight();
    });
    view.querySelector('#ev-form').addEventListener('submit', (e) => {
      e.preventDefault();
      const f = Object.fromEntries(new FormData(e.target));
      if (f.end && f.end < f.date) return alert('Sluttdato kan ikke være før startdato.');
      D().events.push({ id: Store.uid(), label: f.label.trim(), date: f.date, end: f.end || '', color: f.color });
      Store.save();
      renderWeight();
    });
    view.querySelectorAll('[data-chart]').forEach((el) => drawChart(el.dataset.chart, el));
  }

  actions['w-range'] = (el) => { ui.weightRange = el.dataset.value; renderWeight(); };
  actions['w-del'] = (el) => {
    if (!confirm('Slette registreringen?')) return;
    D().weights = D().weights.filter((w) => w.id !== el.dataset.id);
    Store.save();
    renderWeight();
  };
  actions['ev-del'] = (el) => {
    if (!confirm('Slette hendelsen?')) return;
    D().events = D().events.filter((x) => x.id !== el.dataset.id);
    Store.save();
    route();
  };
  actions['ev-edit'] = (el) => {
    const ev = D().events.find((x) => x.id === el.dataset.id);
    openModal(`
      <h2>Endre hendelse</h2>
      <form id="ev-edit" class="form">
        <label>Hendelse <input name="label" required value="${esc(ev.label)}"></label>
        <div class="two">
          <label>Fra <input type="date" name="date" required value="${ev.date}"></label>
          <label>Til (valgfritt) <input type="date" name="end" value="${ev.end || ''}"></label>
        </div>
        <label>Farge <select name="color">${EVENT_COLORS.map((c) => `<option value="${c.key}" ${c.key === ev.color ? 'selected' : ''}>${c.label}</option>`).join('')}</select></label>
        <div class="modal-actions">
          <button type="button" class="btn" data-act="close-modal">Avbryt</button>
          <button class="btn primary">Lagre</button>
        </div>
      </form>`, () => {
      document.getElementById('ev-edit').addEventListener('submit', (e) => {
        e.preventDefault();
        const f = Object.fromEntries(new FormData(e.target));
        if (f.end && f.end < f.date) return alert('Sluttdato kan ikke være før startdato.');
        Object.assign(ev, { label: f.label.trim(), date: f.date, end: f.end || '', color: f.color });
        Store.save();
        route();
      });
    });
  };

  /* =====================================================================
   *  MÅL
   * ===================================================================== */
  function renderMeasurements() {
    const ms = [...D().measurements].sort(Store.byDate);
    const first = (k) => ms.find((m) => Number.isFinite(m[k]));
    const last = (k) => [...ms].reverse().find((m) => Number.isFinite(m[k]));
    view.innerHTML = `
      <header class="view-head"><h1>Mål</h1></header>
      <form id="m-form" class="inline-form">
        <label>Dato <input type="date" name="date" value="${Store.today()}" required></label>
        ${MEASURES.map((m) => `<label>${m.label} (cm) <input name="${m.key}" inputmode="decimal" placeholder="${last(m.key) ? fmtNum(last(m.key)[m.key]) : ''}"></label>`).join('')}
        <button class="btn primary">Lagre</button>
      </form>
      <div class="tiles">
        ${MEASURES.map((m) => {
          const a = first(m.key), b = last(m.key);
          return `<div class="tile"><span class="tile-label"><span class="ch-key" style="background:${m.color}"></span>${m.label}</span>
            <span class="tile-value">${b ? fmtNum(b[m.key]) : '–'}<small> cm</small></span>
            <span class="tile-sub muted small">${a && b && a !== b ? `${signed(b[m.key] - a[m.key], 'cm')} siden start` : ''}</span></div>`;
        }).join('')}
      </div>
      <div class="filters">
        ${rangeButtons(ui.measRange, 'm-range')}
        <div class="chips" role="group" aria-label="Vis mål">
          ${MEASURES.map((m) => `<label class="chip"><input type="checkbox" data-meas="${m.key}" ${ui.measShow[m.key] ? 'checked' : ''}><span class="ch-key" style="background:${m.color}"></span>${m.label}</label>`).join('')}
          <label class="chip"><input type="checkbox" id="m-events" ${ui.measEvents ? 'checked' : ''}>Hendelser</label>
        </div>
      </div>
      <div class="multiples">
        ${MEASURES.filter((m) => ui.measShow[m.key]).map((m) => `<div><h3 class="chart-title"><span class="ch-key" style="background:${m.color}"></span>${m.label}</h3><div data-chart="meas:${m.key}"></div></div>`).join('')}
      </div>
      <details class="section" ${ms.length && ms.length <= 12 ? 'open' : ''}>
        <summary><h2>Alle målinger (${ms.length})</h2></summary>
        <div class="table-wrap"><table class="table">
          <thead><tr><th>Dato</th>${MEASURES.map((m) => `<th>${m.label}</th>`).join('')}<th></th></tr></thead>
          <tbody>${[...ms].reverse().map((r) => `<tr><td>${fmtDate(r.date)}</td>${MEASURES.map((m) => `<td>${fmtNum(r[m.key])}</td>`).join('')}
            <td class="right"><button class="icon-btn" data-act="m-del" data-id="${r.id}" aria-label="Slett">✕</button></td></tr>`).join('')}</tbody>
        </table></div>
      </details>`;

    view.querySelector('#m-form').addEventListener('submit', (e) => {
      e.preventDefault();
      const f = new FormData(e.target);
      const vals = {};
      let any = false;
      for (const m of MEASURES) {
        const v = Store.num(f.get(m.key));
        if (v !== null) { vals[m.key] = v; any = true; }
      }
      if (!any) return alert('Fyll inn minst ett mål.');
      const date = f.get('date');
      const same = D().measurements.find((r) => r.date === date);
      if (same) Object.assign(same, vals); else D().measurements.push({ id: Store.uid(), date, ...vals });
      Store.save();
      toast(same ? 'Målingen for datoen er oppdatert' : 'Mål lagret');
      renderMeasurements();
    });
    view.querySelectorAll('[data-meas]').forEach((cb) => cb.addEventListener('change', () => {
      ui.measShow[cb.dataset.meas] = cb.checked;
      renderMeasurements();
    }));
    view.querySelector('#m-events').addEventListener('change', (e) => {
      ui.measEvents = e.target.checked;
      renderMeasurements();
    });
    view.querySelectorAll('[data-chart]').forEach((el) => drawChart(el.dataset.chart, el));
  }

  actions['m-range'] = (el) => { ui.measRange = el.dataset.value; renderMeasurements(); };
  actions['m-del'] = (el) => {
    if (!confirm('Slette målingen?')) return;
    D().measurements = D().measurements.filter((r) => r.id !== el.dataset.id);
    Store.save();
    renderMeasurements();
  };

  function chartEvents(from) {
    return D().events
      .filter((e) => !from || (e.end || e.date) >= from)
      .map((e) => ({ date: e.date, end: e.end, label: e.label, color: eventColor(e.color) }));
  }

  function drawChart(kind, el) {
    if (!el) return;
    if (kind === 'weight') {
      const from = rangeFrom(ui.weightRange);
      const pts = D().weights.filter((w) => !from || w.date >= from).map((w) => ({ date: w.date, value: w.kg }));
      Charts.line(el, { label: 'Vektutvikling', unit: 'kg', from: pts.length ? from : null, series: [{ name: 'Vekt', color: 'var(--series-1)', points: pts }], events: chartEvents(from) });
    } else if (kind.startsWith('meas:')) {
      // Ett lite diagram per mål: de ligger på svært ulike nivåer (overarm ~30 cm, hofte ~100 cm)
      const m = MEASURES.find((x) => x.key === kind.slice(5));
      const from = rangeFrom(ui.measRange);
      const rows = D().measurements.filter((r) => (!from || r.date >= from) && Number.isFinite(r[m.key]));
      Charts.line(el, {
        label: m.label, unit: 'cm', height: 190,
        series: [{ name: m.label, color: m.color, points: rows.map((r) => ({ date: r.date, value: r[m.key] })) }],
        events: ui.measEvents ? chartEvents(from) : [],
      });
    } else if (kind.startsWith('ex:')) {
      const id = kind.slice(3);
      const pts = Store.historyFor(id).map((h) => ({ date: h.log.date, value: Store.entryStats(h.entry).maxKg })).filter((p) => p.value !== null);
      Charts.line(el, { label: 'Tyngste sett', unit: 'kg', height: 200, series: [{ name: 'Tyngste sett', color: 'var(--series-1)', points: pts }] });
    }
  }

  /* =====================================================================
   *  ADMIN
   * ===================================================================== */
  function renderAdmin() {
    const d = D();
    const lb = d.meta.lastBackup;
    const daysSince = lb ? Math.floor((Date.now() - new Date(lb).getTime()) / 86400000) : null;
    const hasData = d.exercises.length || d.logs.length || d.weights.length || d.measurements.length;
    view.innerHTML = `
      <header class="view-head"><h1>Admin</h1></header>
      <section class="card pad">
        <h2>Sikkerhetskopi</h2>
        <p>${lb ? `Siste eksport: <strong>${fmtDate(lb.slice(0, 10))}</strong> (${daysSince === 0 ? 'i dag' : `for ${daysSince} dager siden`}).` : 'Du har ikke tatt noen sikkerhetskopi ennå.'}</p>
        ${hasData && (daysSince === null || daysSince > 14) ? '<p class="warn">Tips: Ta en ny sikkerhetskopi nå. Dataene ligger bare i denne nettleseren.</p>' : ''}
        <button class="btn primary" data-act="export">Last ned sikkerhetskopi (.json)</button>
        <button class="btn" data-act="export-csv">Eksporter vekt og mål (.csv)</button>
      </section>
      <section class="card pad">
        <h2>Importer</h2>
        <p class="muted small">Hent inn en sikkerhetskopi (.json) laget med denne appen – f.eks. for å flytte data til ny telefon.</p>
        <form id="imp-json" class="form">
          <input type="file" name="file" accept=".json,application/json" required>
          <fieldset class="radios">
            <label><input type="radio" name="mode" value="merge" checked> Slå sammen med det jeg har</label>
            <label><input type="radio" name="mode" value="replace"> Erstatt alt</label>
          </fieldset>
          <button class="btn primary">Importer</button>
        </form>
        <p class="small"><a href="#/programmer" data-act="import-pt">Importer et PT-program fra tekst →</a></p>
      </section>
      <section class="card pad">
        <h2>Oversikt</h2>
        <ul class="stats-list">
          <li><span>Øvelser</span><strong>${d.exercises.length}</strong></li>
          <li><span>Programmer</span><strong>${d.programs.length}</strong></li>
          <li><span>Loggede økter</span><strong>${d.logs.length}</strong></li>
          <li><span>Vektregistreringer</span><strong>${d.weights.length}</strong></li>
          <li><span>Hendelser</span><strong>${d.events.length}</strong></li>
          <li><span>Målinger</span><strong>${d.measurements.length}</strong></li>
          <li><span>Lagringsplass brukt</span><strong>${Store.sizeKb()} kB</strong></li>
        </ul>
      </section>
      <section class="card pad">
        <h2>Om lagring</h2>
        <p class="small">Alt lagres lokalt i nettleseren på denne enheten – ingenting sendes til noen server. Tømmer du nettleserdata eller bytter telefon, trenger du sikkerhetskopien. Legg gjerne appen til på hjemskjermen («Del» → «Legg til på Hjem-skjerm»).</p>
      </section>
      <section class="card pad danger-zone">
        <h2>Slett alle data</h2>
        <p class="small">Fjerner alt fra denne enheten. Kan ikke angres – ta en sikkerhetskopi først.</p>
        <button class="btn danger" data-act="clear-all">Slett alle data</button>
      </section>`;

    view.querySelector('#imp-json').addEventListener('submit', async (e) => {
      e.preventDefault();
      const f = new FormData(e.target);
      const file = f.get('file');
      let obj;
      try { obj = JSON.parse(await file.text()); } catch { return alert('Filen er ikke gyldig JSON.'); }
      const err = Store.validate(obj);
      if (err) return alert(err);
      if (f.get('mode') === 'replace') {
        if (!confirm('Erstatte ALLE nåværende data med innholdet i filen?')) return;
        Store.replaceAll(obj);
        toast('Data erstattet fra sikkerhetskopi');
      } else {
        const c = Store.merge(obj);
        const total = Object.values(c).reduce((a, b) => a + b, 0);
        toast(total ? `La til ${c.exercises} øvelser, ${c.programs} programmer, ${c.logs} økter, ${c.weights} vekt, ${c.measurements} mål, ${c.events} hendelser` : 'Ingenting nytt å legge til');
      }
      renderAdmin();
    });
  }

  actions['export'] = () => {
    download(`treningsglede-${Store.today()}.json`, Store.exportJson());
    Store.markBackup();
    toast('Sikkerhetskopi lastet ned');
    if (location.hash.startsWith('#/admin')) renderAdmin();
  };
  actions['export-csv'] = () => {
    const rows = [['type', 'dato', 'vekt_kg', ...MEASURES.map((m) => `${m.key}_cm`)]];
    for (const w of [...D().weights].sort(Store.byDate)) rows.push(['vekt', w.date, w.kg, '', '', '', '']);
    for (const r of [...D().measurements].sort(Store.byDate)) rows.push(['mal', r.date, '', ...MEASURES.map((m) => r[m.key] ?? '')]);
    for (const e of [...D().events].sort(Store.byDate)) rows.push([`hendelse: ${e.label.replace(/[;\n]/g, ' ')}`, e.date, e.end ? `til ${e.end}` : '', '', '', '', '']);
    download(`treningsglede-vekt-mal-${Store.today()}.csv`, '﻿' + rows.map((r) => r.join(';')).join('\n'), 'text/csv');
  };
  actions['clear-all'] = () => {
    const ans = prompt('Skriv SLETT for å fjerne alle data permanent.');
    if (ans !== 'SLETT') return;
    Store.clearAll();
    toast('Alle data er slettet');
    renderAdmin();
  };

  function notFound() {
    view.innerHTML = '<div class="empty"><h2>Fant ikke siden</h2><p><a href="#/programmer">Til programmer</a></p></div>';
  }

  route();

  if ('serviceWorker' in navigator && location.protocol.startsWith('http')) {
    navigator.serviceWorker.register('sw.js').catch(() => {});
  }
})();
