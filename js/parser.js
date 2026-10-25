/* Tolker treningsprogram limt inn som tekst (f.eks. kopiert fra PT-appen, e-post eller PDF).
 *
 * Eksempel:
 *   Dag 1 – Bein:
 *   Knebøy 3x10 40kg
 *   Rumensk markløft 3 x 8-12 @ 30 kg, pause 90 sek
 *   Planke 3 x 30 sek
 *
 * Linjer som slutter med ":" eller starter med "Dag", "Økt", "Uke", "Program" eller "#"
 * blir overskrifter og starter en ny del (et eget program).
 */
const Parser = (() => {
  const HEADER_RE = /^(#+\s*|(dag|økt|okt|day|uke|week|program|del|runde|oppvarming|hoveddel|avslutning)\b)/i;

  function normalizeName(name) {
    return (name || '')
      .toLowerCase()
      .replace(/[^a-z0-9æøåäöéü]+/g, '');
  }

  function cleanName(s) {
    return s
      .replace(/^[\s\-–—•*·>]+/, '')
      .replace(/^\d+\s*[.)]\s*/, '')
      .replace(/[\s\-–—:,;|@(]+$/, '')
      .replace(/\(\s*\)/g, '')
      .replace(/\s{2,}/g, ' ')
      .trim();
  }

  function parseLine(raw) {
    let s = raw.replace(/\t/g, ' ').trim();
    const item = { name: '', sets: '', reps: '', weight: '', rest: '', note: '' };
    let firstIdx = Infinity;
    const take = (re, fn) => {
      const m = s.match(re);
      if (!m) return;
      firstIdx = Math.min(firstIdx, m.index);
      fn(m);
      s = s.slice(0, m.index) + ' '.repeat(m[0].length) + s.slice(m.index + m[0].length);
    };

    // Fjern nummerering først så "1." ikke tolkes som sett
    s = s.replace(/^\s*\d+\s*[.)]\s+/, (m) => ' '.repeat(m.length));

    take(/pause\s*:?\s*(\d+(?:[.,]\d+)?\s*(?:sek|sec|s|min|m)\b\.?)/i, (m) => (item.rest = m[1].replace(/\s+/g, ' ').trim()));
    take(/(\d+)\s*[x×*]\s*(\d+(?:\s*[-–]\s*\d+)?)(\s*(?:sek|sec|s|min)\b\.?)?(\s*(?:reps?|rep\.?|repetisjoner|ganger))?/i, (m) => {
      item.sets = m[1];
      item.reps = m[2].replace(/\s+/g, '').replace('–', '-') + (m[3] ? ' ' + m[3].trim().replace(/^sec$/i, 'sek') : '');
    });
    if (!item.sets) take(/(\d+)\s*(?:sett|sets?|serier|runder)\b/i, (m) => (item.sets = m[1]));
    if (!item.reps) take(/(\d+(?:\s*[-–]\s*\d+)?)\s*(?:reps?|rep\.?|repetisjoner|ganger|repetitions)\b/i, (m) => (item.reps = m[1].replace(/\s+/g, '').replace('–', '-')));
    if (!item.reps) take(/(\d+)\s*(sek|sec|min)\b\.?/i, (m) => (item.reps = `${m[1]} ${m[2].toLowerCase() === 'sec' ? 'sek' : m[2].toLowerCase()}`));
    take(/@?\s*(\d+(?:[.,]\d+)?(?:\s*[-–]\s*\d+(?:[.,]\d+)?)?)\s*kg\b/i, (m) => (item.weight = m[1].replace(/\s+/g, '').replace(',', '.').replace('–', '-')));

    const cut = firstIdx === Infinity ? s.length : firstIdx;
    item.name = cleanName(s.slice(0, cut));
    item.note = cleanName(
      s.slice(cut)
        .replace(/[@]/g, ' ')
        .replace(/(^|\s)(á|à|a|av|med|x|og)(?=\s|,|$)/gi, ' ')
        .replace(/\(([^)]*)\)/g, '$1')
        .replace(/(\s*[,;]\s*)+/g, ', ')
    ).replace(/^[,;\-–\s]+/, '');
    if (!item.name && item.note) {
      item.name = item.note;
      item.note = '';
    }
    return item;
  }

  function isHeader(line, parsed) {
    const t = line.trim();
    if (/^#/.test(t)) return true;
    if (/:$/.test(t) && !parsed.sets && !parsed.reps) return true;
    if (HEADER_RE.test(t) && !parsed.sets && !parsed.reps && t.length < 60) return true;
    return false;
  }

  function parse(text) {
    const sections = [];
    let current = null;
    for (const raw of (text || '').split(/\r?\n/)) {
      if (!raw.trim()) continue;
      const parsed = parseLine(raw);
      if (isHeader(raw, parsed)) {
        current = { title: cleanName(raw.replace(/^#+/, '').replace(/:\s*$/, '')), items: [] };
        sections.push(current);
        continue;
      }
      if (!parsed.name) continue;
      if (!current) {
        current = { title: '', items: [] };
        sections.push(current);
      }
      current.items.push(parsed);
    }
    return sections.filter((s) => s.items.length);
  }

  return { parse, parseLine, normalizeName };
})();

if (typeof module !== 'undefined') module.exports = Parser;
