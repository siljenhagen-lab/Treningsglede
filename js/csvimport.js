/* Import av vektdata fra CSV – f.eks. eksport fra Libra, eller en enkel fil med dato og vekt.
 *
 * Libra-format:
 *   #Version: 6
 *   #Units: kg
 *   #date;weight;weight trend;body fat;body fat trend;muscle mass;muscle mass trend;log
 *   2019-05-11T09:28:00.000Z;96.1;96.1;;;;;Ny vekt!!!
 */
const WeightCsv = (() => {
  const LB = 0.45359237;
  const EVENT_RE = /(oppstart|start|slutt|stopp|avslutt|vaksine|\bdose\b|\bkur\b|medisin)/i;
  const MEASURE_KEYS = { midje: 'waist', hofte: 'hip', lår: 'thigh', laar: 'thigh', overarm: 'arm' };

  const num = (s) => {
    const n = parseFloat(String(s ?? '').trim().replace(',', '.'));
    return Number.isFinite(n) ? n : null;
  };
  const pad = (n) => String(n).padStart(2, '0');

  /* Gir lokal dato (YYYY-MM-DD) og tidspunkt i ms */
  function parseDate(raw) {
    const s = String(raw || '').trim();
    let m = s.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (m) return { date: s, ts: new Date(+m[1], +m[2] - 1, +m[3]).getTime() };
    m = s.match(/^(\d{1,2})[./](\d{1,2})[./](\d{4})(?:\s+(\d{1,2}):(\d{2}))?/);
    if (m) {
      const d = new Date(+m[3], +m[2] - 1, +m[1], +(m[4] || 0), +(m[5] || 0));
      return { date: `${m[3]}-${pad(m[2])}-${pad(m[1])}`, ts: d.getTime() };
    }
    // ISO med klokkeslett – kutt til millisekunder så alle nettlesere forstår den
    const iso = s.replace(/(\.\d{3})\d+/, '$1').replace(' ', 'T');
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return null;
    return { date: `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`, ts: d.getTime() };
  }

  function detectDelimiter(line) {
    const counts = [';', '\t', ','].map((d) => [d, line.split(d).length - 1]);
    counts.sort((a, b) => b[1] - a[1]);
    return counts[0][1] ? counts[0][0] : ';';
  }

  function parse(text) {
    const lines = String(text || '').replace(/^﻿/, '').split(/\r?\n/);
    let unit = 'kg', header = null, delim = null;
    const rows = [];
    let skipped = 0;
    for (const raw of lines) {
      const line = raw.trim();
      if (!line) continue;
      if (line.startsWith('#')) {
        const u = line.match(/^#\s*units?\s*:\s*(\w+)/i);
        if (u) unit = u[1].toLowerCase();
        else if (/date|dato/i.test(line) && /weight|vekt/i.test(line)) {
          delim = detectDelimiter(line);
          header = line.replace(/^#\s*/, '').split(delim).map((h) => h.trim().toLowerCase());
        }
        continue;
      }
      if (!delim) delim = detectDelimiter(line);
      const cells = line.split(delim);
      if (!header && !parseDate(cells[0])) {
        header = cells.map((h) => h.trim().toLowerCase().replace(/^"|"$/g, ''));
        continue;
      }
      const h = header || [];
      const find = (re, fallback) => {
        const i = h.findIndex((x) => re.test(x));
        return i >= 0 ? i : fallback;
      };
      const di = find(/^(date|dato|time|tid|timestamp|tidspunkt)/, 0);
      const wi = find(/^(weight|vekt|kg)(\s*\((kg|lb)\))?$/, 1);
      const ni = find(/^(log|note|notat|notes|comment|kommentar)/, -1);
      const d = parseDate((cells[di] || '').replace(/^"|"$/g, ''));
      let kg = num((cells[wi] || '').replace(/^"|"$/g, ''));
      if (!d || kg === null || kg <= 0) { skipped++; continue; }
      if (unit.startsWith('lb')) kg = Math.round(kg * LB * 10) / 10;
      // Notatet er siste kolonne og kan selv inneholde skilletegn
      const note = ni >= 0 ? cells.slice(ni).join(delim).trim().replace(/^"|"$/g, '') : '';
      rows.push({ ...d, kg, note });
    }
    rows.sort((a, b) => a.ts - b.ts);
    return { rows, unit, skipped };
  }

  /* Én verdi per dag. mode: 'first' (morgenvekt), 'last' eller 'avg' */
  function byDay(rows, mode = 'first') {
    const days = new Map();
    for (const r of rows) {
      if (!days.has(r.date)) days.set(r.date, []);
      days.get(r.date).push(r);
    }
    return [...days.entries()].map(([date, list]) => {
      const kg = mode === 'last' ? list[list.length - 1].kg
        : mode === 'avg' ? Math.round((list.reduce((a, r) => a + r.kg, 0) / list.length) * 10) / 10
          : list[0].kg;
      const notes = [...new Set(list.map((r) => r.note).filter(Boolean))];
      return { date, kg, note: notes.join(' · '), count: list.length };
    });
  }

  function suggestEvents(days) {
    return days.filter((d) => d.note && EVENT_RE.test(d.note)).map((d) => {
      const sentence = d.note.split(/(?<=[.!?])\s+(?=[A-ZÆØÅ])| · /).find((s) => EVENT_RE.test(s)) || d.note;
      return { date: d.date, label: sentence.replace(/[.!]+$/, '').trim() };
    });
  }

  /* Finner kroppsmål i notater: «Midje 103 … Hofte 130» og «Måling=102,134,77» */
  function findMeasurements(days) {
    const out = [];
    for (const d of days) {
      if (!d.note) continue;
      const named = {};
      for (const m of d.note.matchAll(/(midje|hofte|lår|laar|overarm)\s*[:=]?\s*(\d+(?:[.,]\d+)?)/gi)) {
        named[MEASURE_KEYS[m[1].toLowerCase()]] = num(m[2]);
      }
      const list = d.note.match(/måling\s*=\s*(\d+(?:\.\d+)?(?:\s*,\s*\d+(?:\.\d+)?)+)/i);
      const values = list ? list[1].split(',').map(num) : [];
      if (Object.keys(named).length || values.length) out.push({ date: d.date, named, values, text: d.note });
    }
    return out;
  }

  return { parse, byDay, suggestEvents, findMeasurements, parseDate };
})();

if (typeof module !== 'undefined') module.exports = WeightCsv;
