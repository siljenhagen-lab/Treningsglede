/* Skjematiske strekfigurer for øvelser.
 * Hver figur har 1–2 "rammer" (start- og sluttposisjon) tegnet i et 100x100-rutenett
 * der gulvet ligger på y=92. Ledd: h=hode, s=skulder, p=hofte, e/w=albue/håndledd,
 * k/f=kne/fot. e2/w2/k2/f2 er lemmene på motsatt side (tegnes svakere),
 * s2/p2 brukes for figurer sett forfra.
 */
const Figures = (() => {
  const FLOOR = 92;
  const STAND = { h: [50, 13], s: [50, 24], p: [50, 52], k: [51, 72], f: [50, 92], e: [50, 38], w: [51, 52] };

  const plate = (x, y) => ({ t: 'plate', x, y });
  const db = (x, y) => ({ t: 'db', x, y });
  const kb = (x, y) => ({ t: 'kb', x, y });
  const handle = (x, y) => ({ t: 'handle', x, y });
  const line = (x1, y1, x2, y2, extra) => ({ t: 'line', x1, y1, x2, y2, ...extra });
  const rect = (x, y, w, h) => ({ t: 'rect', x, y, w, h });
  const bench = (x, y, w) => ({ t: 'bench', x, y, w });
  const circle = (x, y, r) => ({ t: 'circle', x, y, r });
  const shift = (pose, dy) => {
    const out = {};
    for (const [k, v] of Object.entries(pose)) out[k] = Array.isArray(v) ? [v[0], v[1] + dy] : v;
    return out;
  };

  const LIB = {
    squat: {
      label: 'Knebøy',
      frames: [
        { ...STAND, k: [52, 72], e: [40, 34], w: [47, 23], props: [plate(48, 23)] },
        { h: [55, 32], s: [50, 42], p: [36, 66], k: [60, 68], f: [52, 92], e: [40, 52], w: [49, 41], props: [plate(48, 41)] },
      ],
    },
    goblet: {
      label: 'Knebøy med manual/kettlebell',
      frames: [
        { ...STAND, k: [52, 72], e: [52, 40], w: [56, 30], props: [kb(58, 33)] },
        { h: [53, 32], s: [48, 42], p: [36, 66], k: [60, 68], f: [52, 92], e: [55, 56], w: [58, 46], props: [kb(60, 50)] },
      ],
    },
    deadlift: {
      label: 'Markløft',
      frames: [
        { h: [71, 44], s: [62, 50], p: [38, 62], k: [58, 70], f: [50, 92], e: [61, 66], w: [60, 82], props: [plate(60, 83)] },
        { ...STAND, w: [52, 52], props: [plate(52, 54)] },
      ],
    },
    hinge: {
      label: 'Rumensk markløft / hoftehengsel',
      frames: [
        { ...STAND, w: [52, 52], props: [plate(52, 54)] },
        { h: [78, 37], s: [68, 41], p: [42, 52], k: [46, 72], f: [48, 92], e: [68, 55], w: [68, 68], props: [plate(68, 69)] },
      ],
    },
    lunge: {
      label: 'Utfall',
      frames: [
        { ...STAND, props: [db(51, 54)] },
        { h: [46, 23], s: [46, 34], p: [46, 62], k: [66, 66], f: [64, 92], k2: [36, 82], f2: [20, 90], e: [46, 48], w: [47, 61], props: [db(47, 63)] },
      ],
    },
    stepup: {
      label: 'Step-up',
      frames: [
        { h: [49, 17], s: [48, 28], p: [46, 56], k: [64, 58], f: [64, 78], k2: [44, 74], f2: [42, 92], e: [48, 42], w: [48, 55], props: [rect(56, 78, 28, 14), db(48, 57)] },
        { h: [66, -1], s: [66, 10], p: [66, 38], k: [67, 58], f: [66, 78], e: [66, 24], w: [67, 37], props: [rect(56, 78, 28, 14), db(67, 39)] },
      ],
    },
    hipthrust: {
      label: 'Hip thrust',
      frames: [
        { h: [17, 55], s: [28, 58], p: [48, 78], k: [64, 66], f: [68, 92], e: [38, 72], w: [47, 73], props: [bench(6, 60, 26), plate(48, 72)] },
        { h: [17, 55], s: [28, 58], p: [54, 58], k: [70, 66], f: [68, 92], e: [42, 62], w: [53, 55], props: [bench(6, 60, 26), plate(54, 52)] },
      ],
    },
    bridge: {
      label: 'Seteløft (glute bridge)',
      frames: [
        { h: [12, 86], s: [22, 88], p: [48, 88], k: [64, 70], f: [74, 90], e: [34, 90], w: [46, 90] },
        { h: [12, 86], s: [22, 88], p: [48, 72], k: [66, 66], f: [74, 90], e: [34, 90], w: [46, 90] },
      ],
    },
    bench: {
      label: 'Benkpress',
      frames: [
        { h: [18, 55], s: [28, 58], p: [56, 58], k: [72, 66], f: [78, 92], e: [29, 45], w: [30, 32], props: [bench(12, 62, 60), plate(30, 32)] },
        { h: [18, 55], s: [28, 58], p: [56, 58], k: [72, 66], f: [78, 92], e: [38, 60], w: [33, 47], props: [bench(12, 62, 60), plate(33, 47)] },
      ],
    },
    pushup: {
      label: 'Armhevinger',
      frames: [
        { h: [16, 60], s: [26, 64], p: [52, 75], k: [70, 82], f: [88, 90], e: [26, 78], w: [26, 92] },
        { h: [17, 79], s: [28, 82], p: [56, 86], k: [72, 88], f: [88, 90], e: [38, 80], w: [27, 92] },
      ],
    },
    press: {
      label: 'Skulderpress',
      frames: [
        { ...STAND, e: [48, 36], w: [54, 26], props: [db(55, 24)] },
        { ...STAND, e: [52, 11], w: [53, -1], props: [db(53, -3)] },
      ],
    },
    row: {
      label: 'Foroverbøyd roing',
      frames: [
        { h: [76, 35], s: [66, 40], p: [40, 52], k: [48, 70], f: [46, 92], e: [66, 54], w: [66, 67], props: [plate(66, 68)] },
        { h: [76, 35], s: [66, 40], p: [40, 52], k: [48, 70], f: [46, 92], e: [54, 40], w: [60, 55], props: [plate(60, 56)] },
      ],
    },
    cablerow: {
      label: 'Sittende roing (kabel)',
      frames: [
        { h: [39, 35], s: [37, 46], p: [36, 74], k: [54, 60], f: [70, 74], e: [50, 50], w: [63, 51], props: [rect(18, 76, 40, 5), rect(90, 42, 8, 14), line(65, 51, 92, 49, { dash: true }), handle(65, 51)] },
        { h: [39, 35], s: [37, 46], p: [36, 74], k: [54, 60], f: [70, 74], e: [26, 54], w: [42, 52], props: [rect(18, 76, 40, 5), rect(90, 42, 8, 14), line(44, 52, 92, 49, { dash: true }), handle(44, 52)] },
      ],
    },
    pulldown: {
      label: 'Nedtrekk',
      frames: [
        { h: [42, 23], s: [42, 34], p: [42, 62], k: [60, 63], f: [61, 91], e: [44, 20], w: [46, 6], props: [rect(30, 64, 22, 6), line(41, 70, 41, 92), rect(50, 55, 14, 4), line(46, 6, 46, -8, { dash: true }), handle(46, 6)] },
        { h: [42, 23], s: [42, 34], p: [42, 62], k: [60, 63], f: [61, 91], e: [34, 46], w: [40, 30], props: [rect(30, 64, 22, 6), line(41, 70, 41, 92), rect(50, 55, 14, 4), line(40, 30, 46, -8, { dash: true }), handle(40, 30)] },
      ],
    },
    pullup: {
      label: 'Pull-up / chins',
      frames: [
        { h: [56, 18], s: [50, 24], p: [50, 52], k: [54, 70], f: [46, 86], e: [50, 11], w: [50, -2], props: [line(30, -2, 70, -2, { w: 3 })] },
        { h: [56, 3], s: [50, 14], p: [50, 42], k: [54, 60], f: [46, 76], e: [40, 10], w: [50, -2], props: [line(30, -2, 70, -2, { w: 3 })] },
      ],
    },
    curl: {
      label: 'Bicepscurl',
      frames: [
        { ...STAND, props: [db(51, 54)] },
        { ...STAND, w: [59, 28], props: [db(61, 27)] },
      ],
    },
    pushdown: {
      label: 'Triceps pushdown',
      frames: [
        { ...STAND, e: [49, 38], w: [61, 32], props: [rect(60, -8, 8, 6), line(62, 32, 64, -2, { dash: true }), handle(62, 32)] },
        { ...STAND, e: [49, 38], w: [54, 52], props: [rect(60, -8, 8, 6), line(55, 53, 64, -2, { dash: true }), handle(55, 53)] },
      ],
    },
    lateral: {
      label: 'Sidehev (forfra)',
      front: true,
      frames: [
        { h: [50, 13], s: [42, 26], s2: [58, 26], p: [45, 52], p2: [55, 52], k: [44, 72], f: [43, 92], k2: [56, 72], f2: [57, 92], e: [39, 39], w: [38, 52], e2: [61, 39], w2: [62, 52], props: [db(38, 54), db(62, 54)] },
        { h: [50, 13], s: [42, 26], s2: [58, 26], p: [45, 52], p2: [55, 52], k: [44, 72], f: [43, 92], k2: [56, 72], f2: [57, 92], e: [30, 27], w: [17, 28], e2: [70, 27], w2: [83, 28], props: [db(16, 28), db(84, 28)] },
      ],
    },
    abduction: {
      label: 'Sideløft bein / abduksjon (forfra)',
      front: true,
      frames: [
        { h: [50, 13], s: [42, 26], s2: [58, 26], p: [45, 52], p2: [55, 52], k: [44, 72], f: [43, 92], k2: [56, 72], f2: [57, 92], e: [39, 39], w: [40, 50], e2: [61, 39], w2: [60, 50] },
        { h: [48, 13], s: [40, 26], s2: [56, 26], p: [44, 52], p2: [54, 52], k: [44, 72], f: [43, 92], k2: [70, 66], f2: [86, 78], e: [37, 39], w: [38, 50], e2: [59, 39], w2: [58, 50] },
      ],
    },
    calf: {
      label: 'Tåhev',
      frames: [
        { ...shift({ ...STAND }, -6), props: [rect(36, 86, 28, 6), db(51, 48), line(50, 86, 58, 86, { body: true })] },
        { ...shift({ ...STAND }, -12), props: [rect(36, 86, 28, 6), db(51, 42), line(50, 80, 58, 86, { body: true })] },
      ],
    },
    legpress: {
      label: 'Beinpress',
      frames: [
        { h: [20, 47], s: [25, 58], p: [37, 80], k: [42, 57], f: [58, 62], e: [30, 72], w: [40, 82], props: [line(18, 46, 34, 84, { w: 5, eq: true }), line(50, 86, 92, 54, { dash: true }), line(52, 54, 64, 70, { w: 4, eq: true })] },
        { h: [20, 47], s: [25, 58], p: [37, 80], k: [52, 68], f: [68, 56], e: [30, 72], w: [40, 82], props: [line(18, 46, 34, 84, { w: 5, eq: true }), line(50, 86, 92, 54, { dash: true }), line(62, 48, 74, 64, { w: 4, eq: true })] },
      ],
    },
    legext: {
      label: 'Beinspark (leg extension)',
      frames: [
        { h: [38, 21], s: [36, 32], p: [36, 60], k: [56, 61], f: [58, 82], e: [40, 46], w: [48, 60], props: [rect(28, 62, 26, 5), line(28, 30, 28, 67, { w: 4, eq: true }), line(41, 67, 41, 92), circle(60, 80, 3)] },
        { h: [38, 21], s: [36, 32], p: [36, 60], k: [56, 61], f: [76, 57], e: [40, 46], w: [48, 60], props: [rect(28, 62, 26, 5), line(28, 30, 28, 67, { w: 4, eq: true }), line(41, 67, 41, 92), circle(77, 60, 3)] },
      ],
    },
    legcurl: {
      label: 'Liggende lårcurl',
      frames: [
        { h: [12, 56], s: [22, 60], p: [50, 60], k: [70, 60], f: [90, 60], e: [16, 66], w: [10, 66], props: [bench(8, 64, 70), circle(90, 56, 3)] },
        { h: [12, 56], s: [22, 60], p: [50, 60], k: [70, 60], f: [78, 42], e: [16, 66], w: [10, 66], props: [bench(8, 64, 70), circle(80, 40, 3)] },
      ],
    },
    swing: {
      label: 'Kettlebell swing',
      frames: [
        { h: [73, 34], s: [64, 40], p: [40, 54], k: [48, 72], f: [48, 92], e: [58, 54], w: [48, 64], props: [kb(46, 70)] },
        { ...STAND, e: [62, 28], w: [75, 28], props: [kb(80, 28)] },
      ],
    },
    plank: {
      label: 'Planke',
      frames: [
        { h: [18, 66], s: [28, 72], p: [54, 80], k: [71, 85], f: [88, 90], e: [28, 90], w: [42, 90] },
      ],
    },
    crunch: {
      label: 'Situps / crunch',
      frames: [
        { h: [15, 84], s: [26, 88], p: [54, 88], k: [68, 70], f: [82, 90], e: [24, 78], w: [16, 80] },
        { h: [25, 66], s: [32, 74], p: [54, 88], k: [68, 70], f: [82, 90], e: [34, 64], w: [26, 62] },
      ],
    },
    quadruped: {
      label: 'Firfotstående (bird dog)',
      frames: [
        { h: [16, 60], s: [26, 66], p: [58, 66], k: [58, 90], f: [78, 91], e: [26, 79], w: [26, 91] },
        { h: [15, 55], s: [26, 66], p: [58, 66], k: [76, 64], f: [96, 62], k2: [58, 90], f2: [78, 91], e: [13, 64], w: [0, 62], e2: [26, 79], w2: [26, 91] },
      ],
    },
    bike: {
      label: 'Sykkel / kondisjon',
      frames: [
        {
          h: [67, 17], s: [60, 26], p: [41, 44], k: [56, 52], f: [52, 74], k2: [52, 58], f2: [44, 84], e: [64, 38], w: [73, 38],
          props: [
            circle(24, 78, 13), circle(78, 78, 13),
            line(24, 78, 48, 78, { eq: true }), line(24, 78, 40, 50, { eq: true }), line(40, 48, 48, 78, { eq: true }),
            line(40, 50, 70, 46, { eq: true }), line(48, 78, 70, 46, { eq: true }), line(70, 46, 78, 78, { eq: true }),
            line(70, 46, 70, 38, { eq: true }), line(70, 38, 75, 38, { eq: true }), line(35, 46, 46, 46, { w: 4, eq: true }),
          ],
        },
      ],
    },
    stretch: {
      label: 'Tøying / mobilitet',
      front: true,
      frames: [
        { h: [50, 13], s: [42, 26], s2: [58, 26], p: [45, 52], p2: [55, 52], k: [43, 72], f: [41, 92], k2: [57, 72], f2: [59, 92], e: [38, 13], w: [44, 1], e2: [62, 13], w2: [56, 1] },
      ],
    },
    stand: {
      label: 'Generell (stående)',
      frames: [{ ...STAND }],
    },
  };

  // Nøkkelord (små bokstaver) -> figur. Første treff vinner, så de mest spesifikke står først.
  const GUESS = [
    [/rumensk|rdl|stiv ?bent|good ?morning|hoftehengsel|hip ?hinge/, 'hinge'],
    [/markløft|marklløft|deadlift|sumo/, 'deadlift'],
    [/goblet|kettlebell ?knebøy|kb ?knebøy/, 'goblet'],
    [/beinpress|leg ?press|benpress/, 'legpress'],
    [/knebøy|squat|kneb/, 'squat'],
    [/utfall|lunge|bulgarsk|split ?squat/, 'lunge'],
    [/step|oppstig|boks/, 'stepup'],
    [/hip ?thrust|hofteløft|hoftehev/, 'hipthrust'],
    [/seteløft|glute ?bridge|bekkenløft|bridge/, 'bridge'],
    [/benk|bench|brystpress|chest ?press/, 'bench'],
    [/armhev|push.?up|pushup/, 'pushup'],
    [/pushdown|triceps|tricep|french|dips/, 'pushdown'],
    [/sidehev|lateral|side ?raise/, 'lateral'],
    [/abduksjon|abduction|sideløft|clam|musling/, 'abduction'],
    [/skulderpress|militær|overhead|shoulder ?press|arnold|press over hodet/, 'press'],
    [/nedtrekk|pulldown|lat ?pull/, 'pulldown'],
    [/pull.?up|chins|pullup|hang/, 'pullup'],
    [/sittende roing|kabelroing|cable ?row|seated ?row|face ?pull/, 'cablerow'],
    [/roing|row/, 'row'],
    [/curl/, 'curl'],
    [/lårcurl|leg ?curl|hamstring ?curl|nordic/, 'legcurl'],
    [/beinspark|leg ?ext|kneekst/, 'legext'],
    [/tåhev|calf|legg/, 'calf'],
    [/swing|kettlebell/, 'swing'],
    [/planke|plank/, 'plank'],
    [/situp|sit-up|crunch|mage|russian/, 'crunch'],
    [/bird ?dog|firfot|donkey|kick ?back|fire ?hydrant/, 'quadruped'],
    [/sykkel|bike|spinning|rofrisk|romaskin|tredemølle|løp|gå|cardio|kondis|ellipse|crosstrainer/, 'bike'],
    [/tøy|stretch|mobilit|yoga/, 'stretch'],
  ];

  function guess(name) {
    const n = (name || '').toLowerCase();
    // lårcurl og leg curl må sjekkes før generell curl
    if (/lårcurl|leg ?curl|hamstring ?curl/.test(n)) return 'legcurl';
    for (const [re, key] of GUESS) if (re.test(n)) return key;
    return 'stand';
  }

  const pt = (a) => `${a[0]},${a[1]}`;
  const seg = (a, b, cls) => (a && b ? `<line class="${cls}" x1="${a[0]}" y1="${a[1]}" x2="${b[0]}" y2="${b[1]}"/>` : '');
  const mid = (a, b) => [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];

  function propSvg(pr) {
    switch (pr.t) {
      case 'plate':
        return `<circle class="fig-acc" cx="${pr.x}" cy="${pr.y}" r="9"/><circle class="fig-acc-fill" cx="${pr.x}" cy="${pr.y}" r="2.2"/>`;
      case 'db':
        return `<rect class="fig-acc-fill" x="${pr.x - 4.5}" y="${pr.y - 2.5}" width="9" height="5" rx="1.5"/>`;
      case 'kb':
        return `<circle class="fig-acc-fill" cx="${pr.x}" cy="${pr.y + 2}" r="4.5"/><path class="fig-acc" d="M${pr.x - 3},${pr.y - 1} Q${pr.x},${pr.y - 7} ${pr.x + 3},${pr.y - 1}"/>`;
      case 'handle':
        return `<circle class="fig-acc-fill" cx="${pr.x}" cy="${pr.y}" r="2.5"/>`;
      case 'rect':
        return `<rect class="fig-eq" x="${pr.x}" y="${pr.y}" width="${pr.w}" height="${pr.h}" rx="1.5"/>`;
      case 'bench':
        return `<rect class="fig-eq" x="${pr.x}" y="${pr.y}" width="${pr.w}" height="5" rx="1.5"/>` +
          `<line class="fig-eq-line" x1="${pr.x + 4}" y1="${pr.y + 5}" x2="${pr.x + 4}" y2="${FLOOR}"/>` +
          `<line class="fig-eq-line" x1="${pr.x + pr.w - 4}" y1="${pr.y + 5}" x2="${pr.x + pr.w - 4}" y2="${FLOOR}"/>`;
      case 'circle':
        return `<circle class="fig-eq-line" cx="${pr.x}" cy="${pr.y}" r="${pr.r}"/>`;
      case 'line': {
        const cls = pr.body ? 'fig-limb' : pr.eq ? 'fig-eq-line' : 'fig-cable';
        const style = pr.w ? ` style="stroke-width:${pr.w}"` : '';
        return `<line class="${cls}${pr.dash ? ' fig-dash' : ''}" x1="${pr.x1}" y1="${pr.y1}" x2="${pr.x2}" y2="${pr.y2}"${style}/>`;
      }
      default:
        return '';
    }
  }

  function frameSvg(f, front) {
    const props = (f.props || []).map(propSvg).join('');
    const farCls = front ? 'fig-limb' : 'fig-limb fig-far';
    const sR = f.s2 || f.s;
    const pR = f.p2 || f.p;
    const far =
      (f.e2 || f.w2 ? seg(sR, f.e2, farCls) + seg(f.e2, f.w2, farCls) : '') +
      (f.k2 || f.f2 ? seg(pR, f.k2, farCls) + seg(f.k2, f.f2, farCls) : '');
    const neck = f.s2 ? mid(f.s, f.s2) : f.s;
    const pelvis = f.p2 ? mid(f.p, f.p2) : f.p;
    let torso = seg(neck, pelvis, 'fig-limb fig-torso');
    if (f.s2) torso += seg(f.s, f.s2, 'fig-limb');
    if (f.p2) torso += seg(f.p, f.p2, 'fig-limb');
    torso += seg(neck, f.h, 'fig-limb');
    const near = seg(f.s, f.e, 'fig-limb') + seg(f.e, f.w, 'fig-limb') + seg(f.p, f.k, 'fig-limb') + seg(f.k, f.f, 'fig-limb');
    const head = `<circle class="fig-head" cx="${f.h[0]}" cy="${f.h[1]}" r="6"/>`;
    const floor = `<line class="fig-floor" x1="2" y1="${FLOOR + 1.5}" x2="98" y2="${FLOOR + 1.5}"/>`;
    return floor + props + far + torso + near + head;
  }

  function render(key, opts = {}) {
    const fig = LIB[key] || LIB.stand;
    const n = fig.frames.length;
    const gap = 14;
    // Én ramme sentreres i samme bredde som to, så alle figurer får lik skala
    const width = 2 * 100 + gap;
    const offset = n === 1 ? (100 + gap) / 2 : 0;
    let body = '';
    fig.frames.forEach((f, i) => {
      const x = offset + i * (100 + gap);
      body += `<g transform="translate(${x},0)">${frameSvg(f, fig.front)}</g>`;
      if (i < n - 1) {
        const ax = x + 100 + gap / 2;
        body += `<path class="fig-arrow" d="M${ax - 4},44 L${ax + 3},50 L${ax - 4},56"/>`;
      }
    });
    const title = opts.title ? `<title>${opts.title}</title>` : '';
    return `<svg class="figure ${opts.cls || ''}" viewBox="0 -10 ${width} 106" role="img" aria-label="${opts.title || fig.label}" preserveAspectRatio="xMidYMid meet">${title}${body}</svg>`;
  }

  // Bilde eller figur for en øvelse
  function forExercise(ex, opts = {}) {
    if (ex && ex.image) {
      return `<img class="figure figure-img ${opts.cls || ''}" src="${ex.image}" alt="${opts.title || ''}">`;
    }
    return render((ex && ex.figure) || guess(ex && ex.name), opts);
  }

  const CATEGORY = {
    squat: 'Bein', goblet: 'Bein', deadlift: 'Bein', hinge: 'Bein', lunge: 'Bein', stepup: 'Bein', legpress: 'Bein',
    legext: 'Bein', legcurl: 'Bein', calf: 'Bein', hipthrust: 'Rumpe', bridge: 'Rumpe', abduction: 'Rumpe', swing: 'Rumpe',
    bench: 'Bryst', pushup: 'Bryst', press: 'Skuldre', lateral: 'Skuldre', row: 'Rygg', cablerow: 'Rygg', pulldown: 'Rygg',
    pullup: 'Rygg', curl: 'Armer', pushdown: 'Armer', plank: 'Kjerne', crunch: 'Kjerne', quadruped: 'Kjerne',
    bike: 'Kondisjon', stretch: 'Mobilitet',
  };
  const categoryFor = (key) => CATEGORY[key] || 'Annet';

  const list = () => Object.entries(LIB).map(([key, v]) => ({ key, label: v.label }));

  return { render, forExercise, guess, categoryFor, list, LIB };
})();

if (typeof module !== 'undefined') module.exports = Figures;
