import { STORAGE_KEY, XP_PER_LEVEL, freshState, hydrate, completeQuest, levelInfo, localDate } from './quest-state.js';

const $ = id => document.getElementById(id);
let storageAvailable = true;
let state;
try { state = hydrate(localStorage.getItem(STORAGE_KEY)); } catch { state = freshState(); storageAvailable = false; }
let filter = 'all';
let toastTimer;
let returnFocus;
const panel = $('panel');
const icons = { '지혜': 'book', '활력': 'leaf', '성장': 'sword' };
const escape = text => String(text).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const icon = name => `<svg aria-hidden="true"><use href="#i-${name}"/></svg>`;

function notify(message) {
  clearTimeout(toastTimer);
  $('toast').textContent = message;
  $('toast').classList.add('show');
  toastTimer = setTimeout(() => $('toast').classList.remove('show'), 4200);
}
function persist() {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); }
  catch { storageAvailable = false; notify('저장 공간을 사용할 수 없어 이번 화면에서만 기록됩니다.'); }
}
function rollover() {
  if (state.date !== localDate()) { state = hydrate(JSON.stringify(state)); persist(); render(); }
}
function render() {
  const { level, progress } = levelInfo(state.xp);
  $('level').textContent = level;
  $('player-title').textContent = level >= 10 ? '별을 따라 걷는 자' : '새벽을 걷는 자';
  $('xp-text').textContent = `${progress} / ${XP_PER_LEVEL}`;
  $('xp-bar').setAttribute('aria-valuenow', progress);
  $('xp-bar').firstElementChild.style.width = `${progress}%`;
  $('gold').textContent = state.gold.toLocaleString();
  $('completion').textContent = `${state.quests.filter(q => q.done).length} / ${state.quests.length} 완료`;
  document.body.classList.toggle('motion-off', !state.motion);
  const quests = state.quests.filter(q => filter === 'all' || (filter === 'done' ? q.done : !q.done));
  $('quest-list').innerHTML = quests.length ? quests.map(q => `<article class="quest-row ${q.done ? 'done' : ''}"><span class="quest-emblem">${icon(icons[q.category])}</span><button class="quest-copy" data-detail="${escape(q.id)}" aria-label="${escape(q.title)} 상세 보기"><b>${escape(q.title)}</b><small><span>${q.category}</span><span>+${q.xp} EXP</span><span>${q.gold} GOLD</span></small></button><button class="complete-quest" data-complete="${escape(q.id)}" aria-label="${escape(q.title)} ${q.done ? '완료됨' : '완료하기'}" ${q.done ? 'disabled' : ''}>${icon('check')}</button></article>`).join('') : '<p class="empty">아직 이곳에 기록된 모험이 없습니다.</p>';
}
function finish(id) {
  rollover();
  const before = state;
  const q = state.quests.find(q => q.id === id);
  state = completeQuest(state, id);
  if (state === before) return;
  const oldLevel = levelInfo(before.xp).level;
  const newLevel = levelInfo(state.xp).level;
  persist(); render();
  notify(newLevel > oldLevel ? `LEVEL UP · Lv.${newLevel} — 새로운 한 걸음을 내디뎠어요!` : `모험 완료 · +${q.xp} EXP · +${q.gold} GOLD`);
  const portrait = document.querySelector('.portrait');
  portrait.classList.remove('reward-flash');
  requestAnimationFrame(() => portrait.classList.add('reward-flash'));
  // Re-rendering removes the pressed button; move focus to a stable, useful target.
  const next = [...document.querySelectorAll('[data-complete]:not(:disabled)')][0];
  (next || $('add-quest')).focus({ preventScroll: true });
}
function openPanel(title, html) {
  if (!panel.open) returnFocus = document.activeElement;
  $('panel-title').textContent = title;
  $('panel-content').innerHTML = html;
  if (!panel.open) panel.showModal();
}
function openDetail(id) {
  const q = state.quests.find(q => q.id === id);
  if (!q) return;
  openPanel(q.title, `<p>${escape(q.detail)}</p><div class="rewards"><span>${q.category} 퀘스트</span><span>+${q.xp} EXP · ${q.gold} GOLD</span></div>${q.done ? '<p>이 모험은 이미 완료했습니다. 잘 해냈어요.</p>' : `<button class="primary" id="finish-detail">모험을 완료했어요 ${icon('check')}</button>`}`);
  $('finish-detail')?.addEventListener('click', () => { panel.close(); finish(id); });
}
function openSection(name) {
  rollover();
  const info = levelInfo(state.xp);
  if (name === 'profile') openPanel('나의 모험가', `<div class="profile-crest">✧</div><p style="text-align:center">모험가 · 여행자<br>「${info.level >= 10 ? '별을 따라 걷는 자' : '새벽을 걷는 자'}」</p><div class="stats"><div><strong>${info.level}</strong><small>레벨</small></div><div><strong>${state.xp}</strong><small>누적 경험치</small></div><div><strong>${state.completed}</strong><small>완료한 모험</small></div></div><p>작은 실천이 쌓여 모험가가 성장합니다. 경험치 100마다 한 레벨씩 오르고, 레벨 10에 새로운 칭호가 열립니다.</p>`);
  if (name === 'bag') openPanel('모험가의 가방', `<div class="profile-crest">${icon('bag')}</div><div class="stats"><div><strong>${state.gold}</strong><small>보유 골드</small></div><div><strong>${state.completed}</strong><small>모험의 기록</small></div><div><strong>1</strong><small>여행자의 수첩</small></div></div><p>골드는 퀘스트를 완료하면 얻는 게임 포인트입니다. 현재 프로토타입에는 상점이나 결제 기능이 없습니다.</p><h3>여행자의 수첩</h3><p>오늘의 모험과 누적 성장을 이 브라우저에 기록합니다.</p>`);
  if (name === 'achievements') {
    const achievements = [ ['첫걸음의 증표', '첫 번째 퀘스트 완료', state.completed >= 1], ['하루를 채운 모험가', '오늘의 퀘스트 3개 이상 완료', state.quests.filter(q => q.done).length >= 3], ['별을 따라 걷는 자', '레벨 10 달성 · 칭호 해금', info.level >= 10] ];
    openPanel('모험의 업적', achievements.map(([title, description, unlocked]) => `<div class="achievement ${unlocked ? '' : 'locked'}">${icon(unlocked ? 'star' : 'compass')}<div><b>${title}</b><small>${description} · ${unlocked ? '달성' : '미달성'}</small></div></div>`).join('') + '<p>하루 퀘스트 업적은 오늘의 수행 상태를 보여줍니다.</p>');
  }
  if (name === 'map') openPanel('아르덴의 숲', '<div class="map-art" role="img" aria-label="강과 돌다리, 성채가 있는 아르덴의 숲 일러스트"><span>✦</span></div><p>당신의 모험이 시작되는 작은 안식처입니다. 지도는 세계관을 위한 일러스트이며 실제 위치를 추적하지 않습니다.</p>');
  if (name === 'settings') {
    openPanel('모험 환경 설정', `<label class="toggle-label">배경 입자 · 화면 움직임<input id="motion" type="checkbox" ${state.motion ? 'checked' : ''}></label><p>기기의 ‘동작 줄이기’ 설정이 켜져 있으면 애니메이션은 자동으로 꺼집니다.</p><h3>기록과 저장</h3><p>${storageAvailable ? '기록은 현재 브라우저에 저장됩니다.' : '저장 공간을 사용할 수 없어 이번 화면에서만 기록됩니다.'} 매일 기본 퀘스트가 새로 열리고, 누적 경험치와 골드는 유지됩니다. 직접 만든 퀘스트도 다음 날에는 초기화됩니다. 계정 간 동기화는 제공하지 않습니다.</p><button class="danger" id="reset">모든 모험 기록 초기화</button>`);
    $('motion').addEventListener('change', e => { state = { ...state, motion: e.target.checked }; persist(); render(); });
    $('reset').addEventListener('click', () => {
      openPanel('처음부터 다시 시작할까요?', '<p>경험치, 골드와 직접 만든 퀘스트를 포함한 모든 기록이 지워집니다.</p><div class="rewards"><button class="subtle" id="cancel-reset">돌아가기</button><button class="danger" id="confirm-reset">기록을 지우고 시작</button></div>');
      $('cancel-reset').addEventListener('click', () => openSection('settings'));
      $('confirm-reset').addEventListener('click', () => { state = freshState(); persist(); render(); panel.close(); notify('새로운 모험의 첫 페이지를 열었습니다.'); });
    });
  }
}
function openCreate() {
  rollover();
  if (state.quests.length >= 50) { notify('하루 퀘스트는 최대 50개까지 기록할 수 있습니다.'); return; }
  openPanel('나만의 퀘스트 쓰기', '<form id="create-form"><label>오늘의 작은 목표<input name="title" required maxlength="60" placeholder="예: 잠들기 전 10분 독서" autocomplete="off"></label><label>모험의 갈래<select name="category"><option>지혜</option><option>활력</option><option>성장</option></select></label><label>나에게 남기는 안내<textarea name="detail" maxlength="300" placeholder="무엇을, 얼마나 해볼까요?"></textarea></label><p>완료 보상 · 25 EXP + 10 GOLD</p><button class="primary" type="submit">모험 기록에 추가하기</button></form>');
  $('create-form').addEventListener('submit', e => {
    e.preventDefault();
    rollover();
    if (state.quests.length >= 50) { notify('하루 퀘스트는 최대 50개까지 기록할 수 있습니다.'); return; }
    const data = new FormData(e.target);
    const title = String(data.get('title')).trim();
    if (!title) { e.target.elements.title.setCustomValidity('목표를 한 글자 이상 적어 주세요.'); e.target.elements.title.reportValidity(); return; }
    state = { ...state, quests: [...state.quests, { id: typeof crypto.randomUUID === 'function' ? crypto.randomUUID() : Array.from(crypto.getRandomValues(new Uint32Array(4)), n => n.toString(16)).join('-'), title, detail: String(data.get('detail')).trim() || '오늘의 작은 목표를 실천해 보세요.', category: String(data.get('category')), xp: 25, gold: 10, done: false }] };
    persist(); setFilter('all'); panel.close(); notify('새로운 퀘스트를 모험 기록에 추가했습니다.');
  });
  $('create-form').elements.title.addEventListener('input', e => e.target.setCustomValidity(''));
  $('create-form').elements.title.focus();
}
function setFilter(value) {
  filter = value;
  document.querySelectorAll('[data-filter]').forEach(b => b.setAttribute('aria-pressed', b.dataset.filter === value));
  render();
}
document.querySelectorAll('[data-filter]').forEach(button => button.addEventListener('click', () => { rollover(); setFilter(button.dataset.filter); }));
document.querySelectorAll('[data-panel]').forEach(button => button.addEventListener('click', () => openSection(button.dataset.panel)));
$('quest-list').addEventListener('click', e => {
  const detail = e.target.closest('[data-detail]');
  const complete = e.target.closest('[data-complete]');
  rollover();
  if (detail) openDetail(detail.dataset.detail);
  if (complete) finish(complete.dataset.complete);
});
$('close-panel').addEventListener('click', () => panel.close());
panel.addEventListener('click', e => { if (e.target === panel) { const r = panel.getBoundingClientRect(); if (e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom) panel.close(); } });
panel.addEventListener('close', () => { if (returnFocus?.isConnected) returnFocus.focus({ preventScroll: true }); });
$('add-quest').addEventListener('click', openCreate);
$('home').addEventListener('click', () => { rollover(); setFilter('all'); $('main').focus({ preventScroll: true }); $('main').scrollIntoView({ block: 'start' }); });
function tick() { $('clock').textContent = new Intl.DateTimeFormat('ko-KR', { hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).format(new Date()); rollover(); }
setInterval(tick, 30000);
document.addEventListener('visibilitychange', () => { if (!document.hidden) tick(); });
// Another tab may have written a newer record; display it instead of silently overwriting it.
window.addEventListener('storage', e => { if (e.key === STORAGE_KEY) { state = hydrate(e.newValue); render(); if (panel.open) panel.close(); notify('다른 창에서 바뀐 모험 기록을 불러왔습니다.'); } });
render(); tick();
if (!storageAvailable) notify('저장 공간을 사용할 수 없어 이번 화면에서만 기록됩니다.');
