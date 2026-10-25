/* Enkle SVG-linjegrafer med hendelsesmarkører og hover-/trykk-verktøytips. */
const Charts = (() => {
  const DAY = 86400000;
  const MONTHS = ['jan', 'feb', 'mar', 'apr', 'mai', 'jun', 'jul', 'aug', 'sep', 'okt', 'nov', 'des'];

  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const toMs = (iso) => new Date(iso + 'T12:00:00').getTime();
  const fmtDate = (ms) => {
    const d = new Date(ms);
    return `${d.getDate()}. ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
  };
  const fmtNum = (v) => (Math.round(v * 10) / 10).toLocaleString('nb-NO');

  function niceTicks(min, max, count = 5) {
    if (min === max) { min -= 1; max += 1; }
    const span = max - min;
    const raw = span / count;
    const mag = Math.pow(10, Math.floor(Math.log10(raw)));
    const step = [1, 2, 2.5, 5, 10].map((m) => m * mag).find((s) => span / s <= count) || 10 * mag;
    const lo = Math.floor(min / step) * step;
    const hi = Math.ceil(max / step) * step;
    const ticks = [];
    for (let v = lo; v <= hi + step / 2; v += step) ticks.push(Math.round(v * 1000) / 1000);
    return ticks;
  }

  function timeTicks(min, max, maxTicks) {
    const span = max - min;
    const ticks = [];
    if (span <= 21 * DAY) {
      const step = Math.max(1, Math.ceil(span / DAY / maxTicks));
      const d = new Date(min); d.setHours(12, 0, 0, 0);
      for (let t = d.getTime(); t <= max; t += step * DAY) ticks.push({ t, label: `${new Date(t).getDate()}.${new Date(t).getMonth() + 1}` });
      return ticks;
    }
    const months = span / (30 * DAY);
    const stepM = [1, 2, 3, 6, 12, 24].find((s) => months / s <= maxTicks) || 36;
    const d = new Date(min); d.setDate(1); d.setHours(12, 0, 0, 0);
    d.setMonth(Math.ceil(d.getMonth() / stepM) * stepM);
    if (d.getTime() < min) d.setMonth(d.getMonth() + stepM);
    while (d.getTime() <= max) {
      const label = stepM >= 12 || d.getMonth() === 0 ? `${MONTHS[d.getMonth()]} ${String(d.getFullYear()).slice(2)}` : MONTHS[d.getMonth()];
      ticks.push({ t: d.getTime(), label });
      d.setMonth(d.getMonth() + stepM);
    }
    return ticks;
  }

  /*
   * opts: {
   *   series: [{ name, color, points: [{ date: 'YYYY-MM-DD', value }] }],
   *   events: [{ date, end?, label, color? }],
   *   unit: 'kg', height: 260, from?: 'YYYY-MM-DD'
   * }
   */
  function line(container, opts) {
    const series = opts.series.map((s) => ({
      ...s,
      pts: s.points.filter((p) => Number.isFinite(p.value)).map((p) => ({ t: toMs(p.date), v: p.value })).sort((a, b) => a.t - b.t),
    })).filter((s) => s.pts.length);

    container.innerHTML = '';
    container.classList.add('chart');
    if (!series.length) {
      container.innerHTML = '<p class="muted chart-empty">Ingen data å vise ennå.</p>';
      return;
    }

    const width = Math.max(280, container.clientWidth || 600);
    const height = opts.height || 260;
    const m = { top: 28, right: 16, bottom: 28, left: 42 };
    const iw = width - m.left - m.right;
    const ih = height - m.top - m.bottom;

    const allPts = series.flatMap((s) => s.pts);
    let tMin = Math.min(...allPts.map((p) => p.t));
    let tMax = Math.max(...allPts.map((p) => p.t));
    if (opts.from) tMin = Math.min(tMin, toMs(opts.from));
    if (tMax - tMin < 7 * DAY) { tMin -= 3.5 * DAY; tMax += 3.5 * DAY; }
    const vals = allPts.map((p) => p.v);
    let vMin = Math.min(...vals), vMax = Math.max(...vals);
    const pad = Math.max((vMax - vMin) * 0.1, 0.5);
    const yt = niceTicks(vMin - pad, vMax + pad, 5);
    vMin = yt[0]; vMax = yt[yt.length - 1];

    const x = (t) => m.left + ((t - tMin) / (tMax - tMin)) * iw;
    const y = (v) => m.top + (1 - (v - vMin) / (vMax - vMin)) * ih;

    let svg = `<svg viewBox="0 0 ${width} ${height}" width="100%" height="${height}" class="chart-svg" role="img" aria-label="${esc(opts.label || 'Graf')}">`;

    // Rutenett + y-akse
    for (const v of yt) {
      svg += `<line class="ch-grid" x1="${m.left}" x2="${width - m.right}" y1="${y(v)}" y2="${y(v)}"/>`;
      svg += `<text class="ch-tick" x="${m.left - 6}" y="${y(v) + 4}" text-anchor="end">${fmtNum(v)}</text>`;
    }
    for (const tk of timeTicks(tMin, tMax, Math.max(2, Math.floor(iw / 70)))) {
      svg += `<text class="ch-tick" x="${x(tk.t)}" y="${height - 8}" text-anchor="middle">${esc(tk.label)}</text>`;
    }

    // Hendelser: perioder som skraverte bånd, start/slutt som loddrette linjer
    const evs = (opts.events || []).map((e) => ({ ...e, t0: toMs(e.date), t1: e.end ? toMs(e.end) : null }));
    let labelRow = 0;
    for (const e of evs.sort((a, b) => a.t0 - b.t0)) {
      const color = e.color || 'var(--event)';
      const inRange = (t) => t >= tMin && t <= tMax;
      if (e.t1) {
        const a = Math.max(tMin, e.t0), b = Math.min(tMax, e.t1);
        if (b > a) svg += `<rect class="ch-band" x="${x(a)}" y="${m.top}" width="${x(b) - x(a)}" height="${ih}" style="fill:${color}"/>`;
      }
      if (inRange(e.t0)) {
        svg += `<line class="ch-event" x1="${x(e.t0)}" x2="${x(e.t0)}" y1="${m.top}" y2="${m.top + ih}" style="stroke:${color}"/>`;
        const lx = x(e.t0);
        const anchor = lx > width - 90 ? 'end' : 'start';
        svg += `<text class="ch-event-label" x="${lx + (anchor === 'start' ? 4 : -4)}" y="${m.top - 14 + (labelRow % 2) * 11}" text-anchor="${anchor}">${esc(e.label)}</text>`;
        labelRow++;
      }
      if (e.t1 && inRange(e.t1)) {
        svg += `<line class="ch-event ch-event-end" x1="${x(e.t1)}" x2="${x(e.t1)}" y1="${m.top}" y2="${m.top + ih}" style="stroke:${color}"/>`;
      }
    }

    // Linjer og punkter
    for (const s of series) {
      const d = s.pts.map((p, i) => `${i ? 'L' : 'M'}${x(p.t).toFixed(1)},${y(p.v).toFixed(1)}`).join('');
      svg += `<path class="ch-line" d="${d}" style="stroke:${s.color}"/>`;
      if (s.pts.length <= 24) {
        for (const p of s.pts) svg += `<circle class="ch-dot" cx="${x(p.t)}" cy="${y(p.v)}" r="3.5" style="fill:${s.color}"/>`;
      }
      // Direkte etikett på siste punkt når det er flere serier
      if (series.length > 1 && series.length <= 4) {
        const last = s.pts[s.pts.length - 1];
        svg += `<text class="ch-direct" x="${Math.min(x(last.t) + 6, width - m.right)}" y="${y(last.v) - 6}" text-anchor="${x(last.t) > width - 70 ? 'end' : 'start'}">${esc(s.short || s.name)}</text>`;
      }
    }

    svg += `<line class="ch-cross" x1="0" x2="0" y1="${m.top}" y2="${m.top + ih}" style="display:none"/>`;
    svg += `<g class="ch-hover-dots"></g>`;
    svg += `<rect class="ch-hit" x="${m.left}" y="${m.top}" width="${iw}" height="${ih}" fill="transparent"/>`;
    svg += '</svg>';
    container.insertAdjacentHTML('beforeend', svg);

    // Hover / trykk
    const svgEl = container.querySelector('svg');
    const cross = svgEl.querySelector('.ch-cross');
    const dotsG = svgEl.querySelector('.ch-hover-dots');
    const tip = document.createElement('div');
    tip.className = 'ch-tip';
    tip.hidden = true;
    container.appendChild(tip);

    const times = [...new Set(allPts.map((p) => p.t))].sort((a, b) => a - b);
    const show = (clientX) => {
      const r = svgEl.getBoundingClientRect();
      const px = ((clientX - r.left) / r.width) * width;
      let best = times[0];
      for (const t of times) if (Math.abs(x(t) - px) < Math.abs(x(best) - px)) best = t;
      const cx = x(best);
      cross.setAttribute('x1', cx); cross.setAttribute('x2', cx); cross.style.display = '';
      dotsG.innerHTML = '';
      tip.innerHTML = '';
      const head = document.createElement('div');
      head.className = 'ch-tip-date';
      head.textContent = fmtDate(best);
      tip.appendChild(head);
      for (const s of series) {
        const p = s.pts.find((q) => q.t === best);
        if (!p) continue;
        dotsG.insertAdjacentHTML('beforeend', `<circle class="ch-dot-hover" cx="${cx}" cy="${y(p.v)}" r="5" style="fill:${s.color}"/>`);
        const row = document.createElement('div');
        row.className = 'ch-tip-row';
        const key = document.createElement('span');
        key.className = 'ch-key'; key.style.background = s.color;
        const val = document.createElement('strong');
        val.textContent = `${fmtNum(p.v)} ${opts.unit || ''}`;
        const name = document.createElement('span');
        name.className = 'muted'; name.textContent = series.length > 1 ? s.name : '';
        row.append(key, val, name);
        tip.appendChild(row);
      }
      for (const e of evs) {
        if (best >= e.t0 && (e.t1 ? best <= e.t1 : Math.abs(best - e.t0) < DAY)) {
          const row = document.createElement('div');
          row.className = 'ch-tip-event';
          row.textContent = '▏' + e.label;
          tip.appendChild(row);
        }
      }
      tip.hidden = false;
      const left = (cx / width) * r.width;
      tip.style.left = `${Math.min(Math.max(left, 70), r.width - 70)}px`;
    };
    const hide = () => { cross.style.display = 'none'; dotsG.innerHTML = ''; tip.hidden = true; };
    const hit = svgEl.querySelector('.ch-hit');
    hit.addEventListener('pointermove', (ev) => show(ev.clientX));
    hit.addEventListener('pointerdown', (ev) => show(ev.clientX));
    hit.addEventListener('pointerleave', (ev) => { if (ev.pointerType === 'mouse') hide(); });
  }

  return { line, fmtDate, toMs };
})();
