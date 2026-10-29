'use strict';
/* COMUNI-AI · Vanilla JS. Datos 100% locales (localStorage). */
const CONFIG = { AI_ENDPOINT: '' }; // Opcional: URL de tu backend de IA. Recibe {message} y devuelve {reply}.
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const store = {
  get(k, d) { try { const v = JSON.parse(localStorage.getItem(k)); return v ?? d; } catch { return d; } },
  set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} }
};
const S = {
  set: Object.assign({ contrast: false, size: 100, silent: false, voice: '' }, store.get('ca_set', {})),
  hist: [], user: store.get('ca_user', null), msg: '', lang: store.get('ca_lang', 'es')
};
const LANGS = { es: ['Español', 'es-ES'], en: ['Inglés', 'en-US'], fr: ['Francés', 'fr-FR'], pt: ['Portugués', 'pt-BR'], it: ['Italiano', 'it-IT'], de: ['Alemán', 'de-DE'] };

/* ---------- Navegación ---------- */
const TITLES = { board: 'Tablero', chat: 'Asistente IA', trans: 'Traductor', tts: 'Texto a voz', profile: 'Historial y perfil' };
function go(id) {
  $$('.screen').forEach(s => s.classList.toggle('active', s.id === id));
  $$('#nav button').forEach(b => b.classList.toggle('on', b.dataset.go === id));
  const slot = $(`#${id} [data-avatar]`);
  if (slot) slot.appendChild($('#avatar')); else $('#avatar').hidden = true;
  if (slot) $('#avatar').hidden = false;
  const home = id === 'home' || id === 'login';
  document.body.classList.toggle('is-home', home);
  $('#bar').hidden = home; $('#nav').hidden = home;
  $('#title').textContent = TITLES[id] || 'COMUNI-AI';
  $('#who').textContent = S.user ? '👤 ' + S.user.split('@')[0] : '👤 Invitado';
  if (id === 'profile') { renderHist(); $('#logout').textContent = S.user ? 'Cerrar sesión' : 'Salir y borrar mi historial'; }
  window.scrollTo(0, 0);
}
$$('[data-go]').forEach(b => b.onclick = () => go(b.dataset.go));

/* ---------- Avatar: labios SVG paramétricos ---------- */
const $id = id => document.getElementById(id);
const setA = (id, o) => { const e = $id(id); for (const k in o) e.setAttribute(k, o[k]); };
function drawMouth(o, r, t = 0) { // o: apertura 0..1 · r: -1 sonrisa ancha … +1 labios redondos
  const cx = 200, cy = 140, W = 150 - Math.max(r, 0) * 55 + Math.max(-r, 0) * 8, g = o * 60,
    xl = cx - W, xr = cx + W, iu = cy - g * .45, il = cy + g * .6, top = cy - 70 - g * .3, bot = cy + 82 + g * .85;
  const R = y => `C${xr - W * .2} ${y} ${cx + W * .55} ${y} ${cx} ${y}C${cx - W * .55} ${y} ${xl + W * .2} ${y} ${xl} ${cy}`;
  const L = y => `C${xl + W * .2} ${y} ${cx - W * .55} ${y} ${cx} ${y}C${cx + W * .55} ${y} ${xr - W * .2} ${y} ${xr} ${cy}`;
  const cav = `M${xl} ${cy}${L(iu)}${R(il)}Z`;
  setA('cav', { d: cav }); setA('clipP', { d: cav });
  setA('up', { d: `M${xl} ${cy}C${xl + W * .1} ${cy - 55 - g * .2} ${cx - W * .5} ${top + 4} ${cx - W * .14} ${top}Q${cx} ${top + 16} ${cx + W * .14} ${top}C${cx + W * .5} ${top + 4} ${xr - W * .1} ${cy - 55 - g * .2} ${xr} ${cy}${R(iu)}Z` });
  setA('lo', { d: `M${xl} ${cy}C${xl + W * .1} ${cy + 50 + g * .5} ${cx - W * .5} ${bot} ${cx} ${bot}C${cx + W * .5} ${bot} ${xr - W * .1} ${cy + 50 + g * .5} ${xr} ${cy}${R(il)}Z` });
  const gap = il - iu;
  setA('tU', { x: cx - W * .6, y: iu - 4, width: W * 1.2, height: gap * .5 + 10 });
  setA('tL', { x: cx - W * .5, y: il - gap * .28 - 8, width: W, height: 16 });
  setA('tg', { cx, cy: il - 3 - t * gap * .45, rx: W * .35, ry: Math.max(0, gap * .28) });
  setA('g1', { cx: cx - W * .36, cy: top + 24, transform: `rotate(-12 ${cx - W * .36} ${top + 24})` });
  setA('g2', { cx: cx + W * .32, cy: top + 30 });
  setA('g3', { cx: cx - W * .3, cy: bot - 24 }); setA('g4', { cx: cx + W * .05, cy: bot - 19 }); setA('g5', { cx: cx + W * .42, cy: bot - 32 });
}
const Mouth = { o: 0, r: 0, t: 0, to: 0, tr: 0, tt: 0 };
// Visemas: [apertura, redondez (-1 ancha … 1 redonda), lengua arriba]
const VOW = { a: [1, 0, 0], e: [.5, -.6, 0], i: [.22, -1, 0], o: [.7, .85, 0], u: [.32, 1, 0], y: [.22, -1, 0] };
const norm = c => (c || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
function viseme(ch) {
  const c = norm(ch);
  if (!c) return [.04, 0, 0];
  if (VOW[c]) return VOW[c];
  if ('mbp'.includes(c)) return [0, 0, 0];
  if ('fv'.includes(c)) return [.14, -.2, 0];
  if ('szc'.includes(c)) return [.12, -.8, 0];
  if ('ltdn'.includes(c)) return [.32, -.2, 1];
  if ('wq'.includes(c)) return [.3, .85, 0];
  if (/[\s.,;:!?¿¡]/.test(c)) return [.04, 0, 0];
  return [.28, -.1, 0];
}
// Coarticulación: la consonante anticipa la vocal siguiente (como una boca real)
function shape(text, i) {
  const n = norm(text[i]), v = viseme(text[i]), nx = norm(text[i + 1]);
  if (/[a-z]/.test(n) && !VOW[n] && !'mbpfv'.includes(n) && VOW[nx]) { const w = VOW[nx]; return [Math.max(v[0], w[0] * .6), w[1] * .6, v[2]]; }
  return v;
}
let lastVis = '';
function setVis(ch) { if (/\p{L}/u.test(ch || '')) { const v = ch.toUpperCase(); if (v !== lastVis) { lastVis = v; $('#vis').textContent = v; } } }

/* ---------- Motor de voz + sincronía labial + subtítulo en vivo ---------- */
const sp = { on: false, paused: false, text: '', base: 0, t0: 0, rate: .9, idx: 0, voice: false, words: [], cur: -1 };
let running = false;
function setCaption(text) {
  const cap = $('#caption'); cap.textContent = ''; sp.words = [];
  const re = /\S+/g; let m;
  while ((m = re.exec(text))) {
    const s = document.createElement('span'); s.className = 'w'; s.textContent = m[0];
    cap.append(s, ' '); sp.words.push({ s: m.index, e: m.index + m[0].length, el: s });
  }
  sp.cur = -1;
}
function hl(i) {
  const k = sp.words.findIndex(w => i >= w.s && i <= w.e);
  if (k === sp.cur) return; sp.cur = k;
  sp.words.forEach((w, n) => w.el.classList.toggle('on', n === k));
}
function loop(t) {
  if (sp.on && !sp.paused) {
    sp.idx = sp.base + (t - sp.t0) / 1000 * 11 * sp.rate;
    if (sp.got) sp.idx = Math.min(sp.idx, sp.wend);
    if (sp.idx >= sp.text.length) { sp.idx = sp.text.length - 1; if (!sp.voice) finish(); }
    if (sp.on) { hl(sp.idx); const k = Math.floor(sp.idx); [Mouth.to, Mouth.tr, Mouth.tt] = sp.vis[k] || [.04, 0, 0]; setVis(sp.text[k]); }
  } else { Mouth.to = 0; Mouth.tr = 0; Mouth.tt = 0; }
  Mouth.o += (Mouth.to - Mouth.o) * .3; Mouth.r += (Mouth.tr - Mouth.r) * .3; Mouth.t += (Mouth.tt - Mouth.t) * .3;
  drawMouth(Mouth.o, Mouth.r, Mouth.t);
  if (sp.on || Mouth.o > .01 || Math.abs(Mouth.r) > .01) requestAnimationFrame(loop);
  else { running = false; drawMouth(0, 0); }
}
const kick = () => { if (!running) { running = true; requestAnimationFrame(loop); } };
function finish() { lastVis = ''; $('#vis').textContent = ''; sp.on = false; sp.paused = false; hl(-1); kick(); }
function stop() { if ('speechSynthesis' in window) speechSynthesis.cancel(); finish(); }
const FEM = /female|mujer|m[oó]nica|paulina|helena|laura|sabina|luc[ií]a|elena|marisol|soledad|esperanza|carolina|valentina|camila|dalia|elvira|salome|samantha|karen|victoria|allison|ava|susan|zira|hazel|aria|jenny|michelle|emma|amy|joanna|kimberly|salli|ivy|kendra|nicole|am[eé]lie|alice|federica|elsa|katja|francisca|luciana|joana|raquel|google/i;
const MALE = /\bmale\b|jorge|diego|juan|pablo|raul|raúl|\balex\b|daniel|fred|david|mark|\bguy\b|ryan|\btom\b|george|james|matthew|brian|eric|enrique|carlos|miguel|andr[eé]s|antonio|thomas|luca|stefan/i;
const fscore = v => (MALE.test(v.name) ? -5 : 0) + (FEM.test(v.name) ? 4 : 0) + (/natural|neural|enhanced|premium/i.test(v.name) ? 1 : 0);
const isFem = v => fscore(v) >= 4;
function pickVoice(lang) {
  if (!('speechSynthesis' in window)) return null;
  const vs = speechSynthesis.getVoices(), p = lang.slice(0, 2), L = v => v.lang.replace('_', '-'),
    best = a => a.slice().sort((x, y) => fscore(y) - fscore(x))[0];
  return vs.find(v => v.name === S.set.voice && L(v).startsWith(p) && isFem(v)) || best(vs.filter(v => L(v) === lang)) || best(vs.filter(v => L(v).startsWith(p))) || null;
}
function _speak(text, o = {}) {
  text = (text || '').trim(); if (!text) return;
  if ('speechSynthesis' in window) speechSynthesis.cancel();
  const lang = o.lang || 'es-ES', rate = (o.rate || .85) * (S.slow ? .65 : 1);
  setCaption(text); if (!o.noHist) addHist(text);
  Object.assign(sp, { on: true, paused: false, text, base: 0, t0: performance.now(), rate, idx: 0, vis: buildVis(text, lang), got: false, wend: 0, voice: !S.set.silent && 'speechSynthesis' in window });
  if (sp.voice) {
    const u = new SpeechSynthesisUtterance(text);
    u.lang = lang; u.rate = rate; const v = pickVoice(lang); u.pitch = Math.min(2, (o.pitch || 1) * (v && isFem(v) ? 1 : 1.25)); // si no hay voz femenina, se agudiza
    if (v) u.voice = v;
    u.onstart = () => { sp.base = 0; sp.t0 = performance.now(); };
    u.onboundary = e => { if (e.charIndex != null) { sp.base = e.charIndex; sp.t0 = performance.now(); sp.got = true; const m = /\S+/.exec(text.slice(e.charIndex)); sp.wend = e.charIndex + (m ? m[0].length : 1); } };
    u.onend = u.onerror = () => finish();
    speechSynthesis.speak(u);
  }
  kick();
}
function pause() {
  if (!sp.on) return;
  if (!sp.paused) { sp.paused = true; sp.pt = performance.now(); if (sp.voice) speechSynthesis.pause(); }
  else { sp.paused = false; sp.t0 += performance.now() - sp.pt; if (sp.voice) speechSynthesis.resume(); kick(); }
}
$('#slow').onclick = e => { S.slow = !S.slow; const b = e.currentTarget; b.setAttribute('aria-pressed', S.slow); b.textContent = S.slow ? '🐢 Lento: activado' : '🐢 Modo lento para leer labios'; };

/* ---------- Historial ---------- */
function addHist(t) {
  S.hist = [t, ...S.hist.filter(x => x !== t)].slice(0, 30); saveHist();
}
function renderHist() {
  const ul = $('#hist'); ul.textContent = '';
  $('#histNote').textContent = S.user ? '✅ Tu historial se guarda en tu cuenta.' : '⚠️ Eres invitado: tu historial se borrará al salir.';
  S.hist.forEach((t, i) => {
    const li = document.createElement('li'), sp_ = document.createElement('span');
    sp_.textContent = t;
    const p = document.createElement('button'); p.textContent = '▶'; p.setAttribute('aria-label', 'Repetir: ' + t); p.onclick = () => { go('tts'); speak(t, { noHist: true }); };
    const d = document.createElement('button'); d.textContent = '✕'; d.setAttribute('aria-label', 'Borrar'); d.onclick = () => { S.hist.splice(i, 1); saveHist(); renderHist(); };
    li.append(sp_, p, d); ul.append(li);
  });
}
$('#histClear').onclick = () => { S.hist = []; saveHist(); renderHist(); };

/* ---------- Tablero ---------- */
const PICTOS = [['👋', 'Hola'], ['🙏', 'Gracias'], ['🆘', 'Necesito ayuda'], ['🍽️', 'Quiero comer'], ['💧', 'Tengo sed'], ['🚽', 'Necesito el baño'],
  ['✅', 'Sí'], ['❌', 'No'], ['🤕', 'Me duele'], ['😊', 'Estoy bien'], ['😢', 'Estoy triste'], ['😴', 'Quiero descansar']];
const SUG = { tengo: ['sed', 'hambre', 'dolor', 'frío', 'calor'], quiero: ['comer', 'agua', 'salir', 'descansar', 'llamar a mi familia'],
  necesito: ['ayuda', 'el baño', 'agua', 'un médico', 'descansar'], me: ['duele la cabeza', 'duele el estómago', 'siento mal', 'siento bien'],
  hola: ['¿Cómo estás?', 'Necesito ayuda', 'Gracias'], gracias: ['por favor', 'de nada', 'Adiós'], estoy: ['bien', 'cansado', 'con dolor', 'contento'] };
function sugs() {
  const w = S.msg.trim().toLowerCase().split(/\s+/).pop();
  if (SUG[w]) return SUG[w];
  const h = new Date().getHours();
  return [h < 12 ? 'Buenos días' : h < 19 ? 'Buenas tardes' : 'Buenas noches', 'Necesito ayuda', 'Quiero comer', 'Tengo sed', 'Gracias'];
}
function renderMsg() { $('#msg').textContent = S.msg; renderSugs(); }
function renderSugs() {
  const box = $('#sugs'); box.textContent = '';
  sugs().forEach(t => { const b = document.createElement('button'); b.className = 'chip-btn'; b.textContent = t; b.onclick = () => add(t); box.append(b); });
}
const add = t => { S.msg += (S.msg && !S.msg.endsWith(' ') ? ' ' : '') + t; renderMsg(); };
function buildPictos(box, fn) {
  PICTOS.forEach(([e, t], i) => { const b = document.createElement('button'); b.className = 'picto c' + (i % 6); b.setAttribute('aria-label', t);
    b.append(e); const s = document.createElement('span'); s.textContent = t.replace(/^(Necesito|Quiero|Tengo) /, ''); b.append(s); b.onclick = () => fn(t); box.append(b); });
}
buildPictos($('#pictos'), add);
$('#bSpeak').onclick = () => speak(S.msg);
$('#bClear').onclick = () => { S.msg = ''; renderMsg(); stop(); };
$('#bWord').onclick = () => { S.msg = S.msg.trimEnd().replace(/\S+$/, '').trimEnd(); renderMsg(); };
// Teclado virtual
['qwertyuiop', 'asdfghjklñ', 'zxcvbnm', 'áéíóúü'].forEach((row, i) => {
  const d = document.createElement('div');
  [...row].forEach(c => { const b = document.createElement('button'); b.textContent = c; b.onclick = () => { S.msg += c; renderMsg(); }; d.append(b); });
  if (i === 2) { const bs = document.createElement('button'); bs.textContent = '⌫'; bs.setAttribute('aria-label', 'Borrar letra'); bs.onclick = () => { S.msg = S.msg.slice(0, -1); renderMsg(); }; d.append(bs); }
  $('#kb').append(d);
});
{ const d = document.createElement('div');
  [['¿', '¿'], ['Espacio', ' '], ['?', '?'], ['.', '.']].forEach(([l, v]) => { const b = document.createElement('button'); b.textContent = l; if (l === 'Espacio') b.className = 'sp'; b.onclick = () => { S.msg += v; renderMsg(); }; d.append(b); });
  $('#kb').append(d); }
$('#kbToggle').onclick = e => { const k = $('#kb'); k.hidden = !k.hidden; e.currentTarget.setAttribute('aria-expanded', !k.hidden); };

/* ---------- Chat IA ---------- */
const RULES = [[/hola|buen[oa]s/i, '¡Hola! Me alegra verte. ¿En qué te puedo ayudar?'], [/ayuda|auxilio/i, 'Estoy aquí contigo. Si es una emergencia, avisa a una persona cercana ahora.'],
  [/com(er|ida)|hambre/i, 'Entiendo que tienes hambre. Voy a decirlo: quiero comer, por favor.'], [/agua|sed/i, 'Tienes sed. Pide agua tocando el pictograma de Agua.'],
  [/baño/i, 'Necesitas el baño. Te acompaño a avisar.'], [/dolor|duele/i, 'Siento que te duela. ¿Dónde te duele? Puedes escribirlo o elegir un pictograma.'],
  [/gracias/i, '¡De nada! Para eso estoy.'], [/triste|mal/i, 'Lamento que te sientas así. Estoy contigo. ¿Quieres hablar de ello?'], [/nombre|qui[eé]n eres/i, 'Soy COMUNI-AI, tu asistente para comunicarte.']];
async function aiReply(q) {
  if (CONFIG.AI_ENDPOINT) {
    try { const r = await fetch(CONFIG.AI_ENDPOINT, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ message: q }) });
      const j = await r.json(); if (j.reply) return j.reply; } catch {}
  }
  const hit = RULES.find(([re]) => re.test(q));
  return hit ? hit[1] : 'Te entendí: "' + q + '". ¿Quieres que lo diga en voz alta o necesitas algo más?';
}
function bubble(t, who) { const b = document.createElement('div'); b.className = 'bubble ' + who; b.textContent = t; const l = $('#chatlog'); l.append(b); l.scrollTop = l.scrollHeight; }
async function chatSend(t) {
  t = t.trim(); if (!t) return; bubble(t, 'me');
  const r = await aiReply(t); bubble(r, 'ai'); speak(r, { noHist: true });
}
buildPictos($('#chatPictos'), chatSend);
$('#chatForm').onsubmit = e => { e.preventDefault(); const i = $('#chatIn'); const v = i.value; i.value = ''; chatSend(v); };
bubble('¡Hola! Soy tu asistente. Escribe o toca un pictograma y te respondo con voz y labios.', 'ai');

/* ---------- Traductor ---------- */
['from', 'to'].forEach((id, n) => Object.entries(LANGS).forEach(([k, [name]]) => $id(id).add(new Option(name, k, false, k === (n ? 'en' : 'es')))));
const PB = { 'hola': { en: 'Hello', fr: 'Bonjour', pt: 'Olá', it: 'Ciao', de: 'Hallo' }, 'gracias': { en: 'Thank you', fr: 'Merci', pt: 'Obrigado', it: 'Grazie', de: 'Danke' },
  'necesito ayuda': { en: 'I need help', fr: "J'ai besoin d'aide", pt: 'Preciso de ajuda', it: 'Ho bisogno di aiuto', de: 'Ich brauche Hilfe' },
  'quiero comer': { en: 'I want to eat', fr: 'Je veux manger', pt: 'Quero comer', it: 'Voglio mangiare', de: 'Ich möchte essen' },
  'tengo sed': { en: "I'm thirsty", fr: "J'ai soif", pt: 'Tenho sede', it: 'Ho sete', de: 'Ich habe Durst' }, 'sí': { en: 'Yes', fr: 'Oui', pt: 'Sim', it: 'Sì', de: 'Ja' }, 'no': { en: 'No', fr: 'Non', pt: 'Não', it: 'No', de: 'Nein' } };
async function translate(text, from, to) {
  if (from === to) return text;
  if (from === 'es' && to === 'en') { const r = offEN(text); if (r) return r; } // frases del tablero: siempre exactas
  try { // 1) Google Translate (más preciso)
    const r = await fetch(`https://translate.googleapis.com/translate_a/single?client=gtx&sl=${from}&tl=${to}&dt=t&q=${encodeURIComponent(text.slice(0, 1500))}`);
    const j = await r.json(), o = j[0].map(x => x[0]).join('').trim(); if (o) return o;
  } catch {}
  try { // 2) MyMemory de respaldo
    const parts = text.match(/[^.!?\n]+[.!?]*/g) || [text], out = [];
    for (const p of parts) {
      if (!p.trim()) continue;
      const r = await fetch(`https://api.mymemory.translated.net/get?q=${encodeURIComponent(p.trim().slice(0, 450))}&langpair=${from}|${to}`);
      const j = await r.json(); if (j.responseStatus != 200) throw 0; out.push(dec(j.responseData.translatedText));
    }
    if (out.length) return out.join(' ');
  } catch {}
  const k = text.trim().toLowerCase().replace(/[.!¡¿?]/g, '');
  return from === 'es' && PB[k] ? PB[k][to] : null;
}
$('#swap').onclick = () => { const f = $('#from'), t = $('#to'); [f.value, t.value] = [t.value, f.value]; const o = $('#tOut').textContent; if (lastTr) { $('#tIn').value = lastTr; $('#tOut').textContent = ''; } };
let lastTr = '';
$('#tGo').onclick = async () => {
  const t = $('#tIn').value.trim(); if (!t) return; const out = $('#tOut'); out.textContent = 'Traduciendo…';
  const r = await translate(t, $('#from').value, $('#to').value);
  lastTr = r || ''; out.textContent = r || 'Sin conexión: solo puedo traducir frases básicas del tablero. Conéctate a internet e inténtalo otra vez.';
};
$('#tFromBoard').onclick = () => { $('#tIn').value = S.msg; };
$('#tSpeak').onclick = () => { if (lastTr) speak(lastTr, { lang: LANGS[$('#to').value][1] }); };

/* ---------- Texto a voz ---------- */
$('#ttsRate').oninput = e => $('#rateOut').textContent = e.target.value + '×';
$('#ttsPitch').oninput = e => $('#pitchOut').textContent = e.target.value;
$('#pPlay').onclick = () => speak($('#ttsIn').value, { rate: parseFloat($('#ttsRate').value), pitch: parseFloat($('#ttsPitch').value) });
$('#pPause').onclick = pause; $('#pStop').onclick = stop;

/* ---------- Ajustes ---------- */
function applySet() {
  document.body.classList.toggle('contrast', S.set.contrast);
  document.documentElement.style.fontSize = S.set.size + '%';
  $('#sContrast').checked = S.set.contrast; $('#sSilent').checked = S.set.silent; $('#sSize').value = S.set.size;
  store.set('ca_set', S.set);
}
$('#sContrast').onchange = e => { S.set.contrast = e.target.checked; applySet(); };
$('#sSilent').onchange = e => { S.set.silent = e.target.checked; applySet(); };
$('#sSize').oninput = e => { S.set.size = +e.target.value; applySet(); };
$('#sVoice').onchange = e => { S.set.voice = e.target.value; applySet(); };
function loadVoices() {
  if (!('speechSynthesis' in window)) return;
  const sel = $('#sVoice'); sel.textContent = ''; sel.add(new Option('Automática', ''));
  speechSynthesis.getVoices().filter(v => v.lang.startsWith('es') && isFem(v)).forEach(v => sel.add(new Option(v.name + ' (' + v.lang + ')', v.name, false, v.name === S.set.voice)));
}
if ('speechSynthesis' in window) { speechSynthesis.onvoiceschanged = loadVoices; loadVoices(); }

/* ---------- Acceso (invitado o cuenta local) ---------- */
let mode = 'login';
async function hash(s) {
  if (crypto?.subtle) { const b = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s)); return [...new Uint8Array(b)].map(x => x.toString(16).padStart(2, '0')).join(''); }
  return btoa(unescape(encodeURIComponent(s)));
}
const BTN = { login: 'Entrar', register: 'Crear mi cuenta', reset: 'Cambiar contraseña' };
function setMode(m) {
  mode = m; $$('.seg button').forEach(x => x.setAttribute('aria-selected', x.dataset.mode === m));
  $('#loginBtn').textContent = BTN[m]; $('#loginMsg').textContent = '';
  $('#uPass').placeholder = m === 'reset' ? 'Nueva contraseña' : 'Contraseña'; $('#forgot').hidden = m === 'reset';
  $('#secFld').hidden = m === 'login'; $('#uSecret').placeholder = m === 'reset' ? 'Tu palabra secreta' : 'Crea una palabra secreta';
}
$$('.seg button').forEach(b => b.onclick = () => setMode(b.dataset.mode));
$('#forgot').onclick = () => setMode('reset');
$('#eye').onclick = () => { const p = $('#uPass'); p.type = p.type === 'password' ? 'text' : 'password'; };
$('[data-guest]').onclick = () => { S.user = null; store.set('ca_user', null); wipe(); go('board'); };
$('#loginForm').onsubmit = async e => {
  e.preventDefault();
  const n = $('#uName').value.trim().toLowerCase(), p = $('#uPass').value, sc = norm($('#uSecret').value.trim()), msg = $('#loginMsg');
  if (!/^\S+@\S+\.\S+$/.test(n) || p.length < 4) { msg.textContent = 'Escribe un correo válido y una contraseña de 4+ caracteres.'; return; }
  if (mode !== 'login' && sc.length < 3) { msg.textContent = 'Escribe tu palabra secreta (3+ letras). Te servirá para recuperar tu contraseña.'; return; }
  const acc = store.get('ca_acc', {}), h = await hash(p), hs = await hash(sc), a = acc[n], ah = a && (a.h || a);
  if (mode === 'reset') {
    if (!a) { msg.textContent = 'No hay ninguna cuenta con ese correo en este teléfono.'; return; }
    if (a.s && a.s !== hs) { msg.textContent = 'La palabra secreta no coincide.'; return; }
    acc[n] = { h, s: hs }; store.set('ca_acc', acc); setMode('login'); msg.textContent = '✅ Contraseña cambiada. Ya puedes entrar con la nueva.'; $('#uPass').value = ''; return;
  }
  if (mode === 'register') { if (a) { msg.textContent = 'Ese correo ya tiene cuenta. Entra o recupera tu contraseña.'; return; } acc[n] = { h, s: hs }; store.set('ca_acc', acc); }
  else if (ah !== h) { msg.textContent = 'Correo o contraseña incorrectos. Si la olvidaste, toca "¿Olvidaste tu contraseña?".'; return; }
  S.user = n; store.set('ca_user', n); loadHist(); $('#uPass').value = ''; $('#uSecret').value = ''; go('board');
};
$('#logout').onclick = () => { stop(); S.user = null; store.set('ca_user', null); wipe(); go('home'); };

$('#openLogin').onclick = () => go('login');
$('#backHome').onclick = () => go('home');
try { localStorage.removeItem('ca_hist'); } catch {}
loadHist(); applySet(); renderMsg(); drawMouth(0, 0);
if (S.user) go('board'); else go('home');

/* ---------- Modo inglés ---------- */
const dec = s => { const t = document.createElement('textarea'); t.innerHTML = s; return t.value; };
const EN = { hola: 'Hello', gracias: 'Thank you', 'necesito ayuda': 'I need help', 'quiero comer': 'I want to eat', 'tengo sed': "I'm thirsty", 'tengo hambre': "I'm hungry",
  'tengo frio': "I'm cold", 'tengo calor': "I'm hot", 'tengo dolor': "I'm in pain", si: 'Yes', no: 'No', 'necesito el bano': 'I need the bathroom', 'me duele': 'It hurts',
  'estoy bien': "I'm fine", 'estoy triste': "I'm sad", 'estoy cansado': "I'm tired", 'estoy contento': "I'm happy", 'quiero descansar': 'I want to rest', 'buenos dias': 'Good morning',
  'buenas tardes': 'Good afternoon', 'buenas noches': 'Good night', 'por favor': 'Please', 'de nada': "You're welcome", adios: 'Goodbye', 'como estas': 'How are you',
  'me duele la cabeza': 'My head hurts', 'me duele el estomago': 'My stomach hurts', 'me siento mal': 'I feel bad', 'me siento bien': 'I feel good',
  comer: 'to eat', agua: 'water', salir: 'to go out', descansar: 'to rest', ayuda: 'help', 'el bano': 'the bathroom', 'un medico': 'a doctor', 'llamar a mi familia': 'to call my family' };
function offEN(t) {
  const k = norm(t).replace(/[.!¡¿?,]/g, '').trim(); if (EN[k]) return EN[k];
  const m = k.match(/^(quiero|necesito|tengo|estoy) (.+)$/); return m && EN[m[2]] ? { quiero: 'I want ', necesito: 'I need ', tengo: 'I have ', estoy: "I'm " }[m[1]] + EN[m[2]] : null;
}
// Letras → visemas con reglas del inglés (th, sh, ee, oo…)
function buildVis(t, lang) {
  const en = lang.startsWith('en'), out = [];
  for (let i = 0; i < t.length; i++) {
    const c = norm(t[i]), p = norm(t[i + 1]), d = c + p; let v = null, two = true;
    if (en) {
      if (d === 'th') v = [.24, -.2, 1];
      else if (['sh', 'ch', 'zh'].includes(d)) v = [.3, .75, 0];
      else if (['oo', 'ou', 'ew', 'ue'].includes(d)) v = [.3, .95, 0];
      else if (['ee', 'ea', 'ie'].includes(d)) v = [.2, -1, 0];
      else if (['ai', 'ay', 'ey'].includes(d)) v = [.5, -.6, 0];
      else if (['oa', 'oi', 'oy', 'ow'].includes(d)) v = [.7, .8, 0];
      else if (c === 'w') { v = [.3, .9, 0]; two = false; }
      else if (c === 'r') { v = [.3, .55, 0]; two = false; }
      else if (c === 'e' && i > 0 && !/[a-z]/.test(p) && /[a-z]/.test(norm(t[i - 1]))) { v = [.1, -.3, 0]; two = false; }
    }
    if (v) { out[i] = v; if (two) { out[i + 1] = v; i++; } } else out[i] = shape(t, i);
  }
  return out;
}
async function speak(text, o = {}) {
  text = (text || '').trim(); if (!text) return;
  if (S.lang === 'en' && !o.lang) {
    if (!o.noHist) { addHist(text); o = { ...o, noHist: true }; }
    if ('speechSynthesis' in window) { speechSynthesis.cancel(); speechSynthesis.speak(new SpeechSynthesisUtterance('')); }
    $('#caption').textContent = '🌐 Translating…';
    const t = await translate(text, 'es', 'en');
    if (!t) { $('#caption').textContent = 'Sin internet: solo traduzco frases básicas.'; return; }
    text = t; o = { ...o, lang: 'en-US' };
  }
  _speak(text, o);
}
function setLang(l) {
  S.lang = l; store.set('ca_lang', l);
  $('#langBtn').textContent = l === 'en' ? '🇬🇧 English' : '🇪🇸 Español';
  $('#caption').textContent = l === 'en' ? 'Escribe en español: lo diré en inglés 👄' : 'Toca Hablar y lee mis labios 👀';
}
$('#langBtn').onclick = () => setLang(S.lang === 'en' ? 'es' : 'en');
setLang(S.lang);

/* ---------- Historial por cuenta (invitado = solo memoria) ---------- */
function loadHist() { S.hist = S.user ? store.get('ca_hist_' + S.user, []) : []; }
function saveHist() { if (S.user) store.set('ca_hist_' + S.user, S.hist); }
function wipe() {
  S.hist = []; S.msg = ''; renderMsg(); $('#chatlog').textContent = '';
  bubble('¡Hola! Soy tu asistente. Escribe o toca un pictograma y te respondo con voz y labios.', 'ai');
  ['tIn', 'ttsIn', 'chatIn'].forEach(i => $id(i).value = ''); $('#tOut').textContent = 'La traducción aparecerá aquí.'; lastTr = '';
}
/* ---------- Teclado: se siente cada tecla (vibración + clic + letra grande) ---------- */
let AC; const pop = document.createElement('div'); pop.className = 'keypop'; pop.hidden = true; document.body.append(pop);
function tick() {
  try { AC = AC || new (window.AudioContext || window.webkitAudioContext)(); const o = AC.createOscillator(), g = AC.createGain();
    o.type = 'triangle'; o.frequency.value = 880; g.gain.setValueAtTime(.12, AC.currentTime); g.gain.exponentialRampToValueAtTime(.0001, AC.currentTime + .06);
    o.connect(g); g.connect(AC.destination); o.start(); o.stop(AC.currentTime + .06); } catch {}
}
let downKey = null;
function release() { if (downKey) downKey.classList.remove('down'); downKey = null; pop.hidden = true; }
$('#kb').addEventListener('pointerdown', e => {
  const b = e.target.closest('button'); if (!b) return; release(); downKey = b; b.classList.add('down');
  if (navigator.vibrate) navigator.vibrate(18); tick();
  const r = b.getBoundingClientRect(); pop.textContent = b.classList.contains('sp') ? '␣' : b.textContent;
  pop.style.left = Math.min(Math.max(r.left + r.width / 2, 40), innerWidth - 40) + 'px'; pop.style.top = r.top + 'px'; pop.hidden = false;
});
['pointerup', 'pointercancel', 'pointerleave'].forEach(t => $('#kb').addEventListener(t, release));
document.addEventListener('scroll', release, true);
