/* Lagring i nettleseren (localStorage) + hjelpefunksjoner for data. */
const Store = (() => {
  const KEY = 'treningsglede:v1';
  const DRAFT_KEY = 'treningsglede:draft';
  const VERSION = 1;

  const empty = () => ({
    app: 'treningsglede',
    version: VERSION,
    exercises: [],
    programs: [],
    logs: [],
    weights: [],
    events: [],
    measurements: [],
    meta: { created: new Date().toISOString(), lastBackup: null },
  });

  function normalize(d) {
    const base = empty();
    const out = { ...base, ...(d || {}) };
    for (const k of ['exercises', 'programs', 'logs', 'weights', 'events', 'measurements']) {
      if (!Array.isArray(out[k])) out[k] = [];
    }
    out.meta = { ...base.meta, ...(d && d.meta) };
    out.version = VERSION;
    return out;
  }

  function load() {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) return normalize(JSON.parse(raw));
    } catch (e) {
      console.error('Kunne ikke lese lagrede data', e);
    }
    return empty();
  }

  let data = load();

  function save() {
    try {
      localStorage.setItem(KEY, JSON.stringify(data));
      return true;
    } catch (e) {
      console.error(e);
      alert('Kunne ikke lagre – lagringsplassen i nettleseren kan være full (store bilder tar mye plass). Ta en eksport under Admin og vurder å fjerne noen bilder.');
      return false;
    }
  }

  const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 8);

  const today = () => {
    const d = new Date();
    d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
    return d.toISOString().slice(0, 10);
  };

  const byDate = (a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0);

  function exercise(id) {
    return data.exercises.find((e) => e.id === id);
  }

  function findExerciseByName(name) {
    const n = Parser.normalizeName(name);
    if (!n) return null;
    return data.exercises.find((e) => Parser.normalizeName(e.name) === n) || null;
  }

  function addExercise(fields) {
    const ex = {
      id: uid(),
      name: '',
      category: 'Annet',
      muscles: '',
      equipment: '',
      figure: '',
      image: '',
      description: '',
      rating: 0,
      notes: '',
      source: '',
      created: new Date().toISOString(),
      ...fields,
    };
    if (!ex.figure) ex.figure = Figures.guess(ex.name);
    if (!fields.category) ex.category = Figures.categoryFor(ex.figure);
    data.exercises.push(ex);
    return ex;
  }

  /* Alle loggede sett for en øvelse, nyeste først */
  function historyFor(exId) {
    const rows = [];
    for (const log of data.logs) {
      for (const entry of log.entries || []) {
        if (entry.exerciseId === exId) rows.push({ log, entry });
      }
    }
    return rows.sort((a, b) => byDate(b.log, a.log));
  }

  const num = (v) => {
    const n = parseFloat(String(v ?? '').replace(',', '.'));
    return Number.isFinite(n) ? n : null;
  };

  // Epley-estimat av 1RM
  const est1RM = (kg, reps) => (kg && reps ? (reps === 1 ? kg : kg * (1 + reps / 30)) : null);

  function entryStats(entry) {
    let maxKg = null, volume = 0, best1RM = null, totalReps = 0;
    for (const s of entry.sets || []) {
      const kg = num(s.kg), reps = num(s.reps);
      if (reps) totalReps += reps;
      if (kg !== null && (maxKg === null || kg > maxKg)) maxKg = kg;
      if (kg && reps) {
        volume += kg * reps;
        const e = est1RM(kg, reps);
        if (best1RM === null || e > best1RM) best1RM = e;
      }
    }
    return { maxKg, volume, best1RM, totalReps };
  }

  function lastEntryFor(exId) {
    const h = historyFor(exId);
    return h.length ? h[0] : null;
  }

  function replaceAll(newData) {
    data = normalize(newData);
    save();
  }

  /* Slår sammen: legger til elementer med id-er som ikke finnes fra før */
  function merge(newData) {
    const incoming = normalize(newData);
    // Øvelser som er slått sammen tidligere skal ikke komme tilbake; referanser flyttes til den nye
    const merged = data.meta.mergedExercises || {};
    const redirect = (id) => {
      let m = merged[id], label = '', guard = 0;
      while (m && guard++ < 10) { label = label || m.label; id = m.to; m = merged[id]; }
      return { id, label };
    };
    incoming.exercises = incoming.exercises.filter((e) => e && !merged[e.id]);
    const fix = (obj) => {
      if (!merged[obj.exerciseId]) return;
      const r = redirect(obj.exerciseId);
      obj.exerciseId = r.id;
      obj.note = withNote(r.label, obj.note);
    };
    for (const p of incoming.programs) for (const it of (p && p.items) || []) fix(it);
    for (const l of incoming.logs) for (const e of (l && l.entries) || []) fix(e);
    const counts = {};
    for (const k of ['exercises', 'programs', 'logs', 'weights', 'events', 'measurements']) {
      const ids = new Set(data[k].map((x) => x.id));
      const add = incoming[k].filter((x) => x && x.id && !ids.has(x.id));
      data[k].push(...add);
      counts[k] = add.length;
    }
    save();
    return counts;
  }

  function validate(obj) {
    if (!obj || typeof obj !== 'object') return 'Filen inneholder ikke gyldige data.';
    const keys = ['exercises', 'programs', 'logs', 'weights', 'events', 'measurements'];
    if (!keys.some((k) => Array.isArray(obj[k]))) return 'Fant ingen Treningsglede-data i filen.';
    return null;
  }

  function exportJson() {
    return JSON.stringify({ ...data, exportedAt: new Date().toISOString() }, null, 2);
  }

  function markBackup() {
    data.meta.lastBackup = new Date().toISOString();
    save();
  }

  function clearAll() {
    data = empty();
    save();
    localStorage.removeItem(DRAFT_KEY);
  }

  function getDraft() {
    try {
      return JSON.parse(localStorage.getItem(DRAFT_KEY) || 'null');
    } catch {
      return null;
    }
  }
  function setDraft(d) {
    try {
      if (d) localStorage.setItem(DRAFT_KEY, JSON.stringify(d));
      else localStorage.removeItem(DRAFT_KEY);
    } catch (e) {
      console.error(e);
    }
  }

  /* Gjør "Nedtrekk bredt grep" om til "Bredt grep" når den slås inn i "Nedtrekk" */
  function variantLabel(oldName, targetName) {
    const o = oldName.trim(), t = targetName.trim();
    let rest = o.toLowerCase().startsWith(t.toLowerCase()) ? o.slice(t.length) : o;
    rest = rest.replace(/^[\s\-–,:/]+/, '').trim();
    return rest ? rest[0].toUpperCase() + rest.slice(1) : '';
  }
  const withNote = (label, note) => (label ? (note ? `${label} · ${note}` : label) : note || '');

  /* Slår øvelsene i sourceIds inn i targetId: historikk og programmer flyttes over,
   * og navnet på den gamle varianten (f.eks. grep) legges i notatet så det ikke går tapt. */
  function mergeExercises(targetId, sourceIds, opts = {}) {
    const target = exercise(targetId);
    const keepLabel = opts.keepLabel !== false;
    let moved = 0;
    for (const sid of sourceIds) {
      const src = exercise(sid);
      if (!src || sid === targetId) continue;
      const label = keepLabel ? variantLabel(src.name, target.name) : '';
      for (const log of data.logs) {
        for (const e of log.entries || []) {
          if (e.exerciseId === sid) { e.exerciseId = targetId; e.note = withNote(label, e.note); moved++; }
        }
      }
      for (const p of data.programs) {
        for (const it of p.items || []) {
          if (it.exerciseId === sid) { it.exerciseId = targetId; it.note = withNote(label, it.note); }
        }
      }
      const draft = getDraft();
      if (draft && (draft.entries || []).some((e) => e.exerciseId === sid)) {
        for (const e of draft.entries) if (e.exerciseId === sid) e.exerciseId = targetId;
        setDraft(draft);
      }
      target.rating = Math.max(target.rating || 0, src.rating || 0);
      for (const f of ['description', 'notes']) {
        if (src[f] && !(target[f] || '').includes(src[f])) target[f] = [target[f], src[f]].filter(Boolean).join('\n\n');
      }
      const sources = new Set([target.source, src.source].filter(Boolean).flatMap((s) => s.split(', ')));
      target.source = [...sources].join(', ');
      if (!target.image && src.image) target.image = src.image;
      data.exercises = data.exercises.filter((e) => e.id !== sid);
      // Husk sammenslåingen, så en senere import av en gammel fil ikke henter øvelsen tilbake
      data.meta.mergedExercises = { ...(data.meta.mergedExercises || {}), [sid]: { to: targetId, label } };
    }
    save();
    return moved;
  }

  function sizeKb() {
    try {
      return Math.round((localStorage.getItem(KEY) || '').length / 1024);
    } catch {
      return 0;
    }
  }

  return {
    get data() { return data; },
    save, uid, today, byDate, num, est1RM,
    exercise, findExerciseByName, addExercise, historyFor, lastEntryFor, entryStats,
    replaceAll, merge, mergeExercises, validate, exportJson, markBackup, clearAll,
    getDraft, setDraft, sizeKb,
  };
})();
