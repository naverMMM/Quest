export const STORAGE_KEY = 'quest.hud.v1';
export const XP_PER_LEVEL = 100;
export const STARTERS = [
  { id: 'read', title: '이야기 속으로, 서른 쪽', detail: '책 30쪽을 읽고 마음에 남은 문장 하나를 기록해 보세요.', category: '지혜', xp: 35, gold: 15, done: false },
  { id: 'walk', title: '바람이 이끄는 산책', detail: '화면을 잠시 내려놓고 바깥에서 20분을 걸어 보세요.', category: '활력', xp: 30, gold: 12, done: false },
  { id: 'focus', title: '나만의 작은 몰입', detail: '미뤄 두었던 일 하나에 25분 동안 집중해 보세요.', category: '성장', xp: 40, gold: 18, done: false }
];
export function localDate(date = new Date()) {
  return [date.getFullYear(), String(date.getMonth() + 1).padStart(2, '0'), String(date.getDate()).padStart(2, '0')].join('-');
}
export function freshState(date = localDate()) {
  return { version: 1, date, xp: 0, gold: 0, completed: 0, quests: STARTERS.map(q => ({ ...q })), motion: true };
}
const count = x => Number.isSafeInteger(x) && x >= 0;
export function hydrate(raw, date = localDate()) {
  try {
    const s = JSON.parse(raw);
    if (!s || s.version !== 1 || !count(s.xp) || !count(s.gold) || !count(s.completed) ||
      typeof s.date !== 'string' || typeof s.motion !== 'boolean' || !Array.isArray(s.quests) || s.quests.length > 50 ||
      !s.quests.every(q => typeof q.id === 'string' && typeof q.title === 'string' && q.title.length <= 60 && typeof q.detail === 'string' && q.detail.length <= 300 && ['지혜', '활력', '성장'].includes(q.category) && count(q.xp) && q.xp <= 100 && count(q.gold) && q.gold <= 100 && typeof q.done === 'boolean') ||
      new Set(s.quests.map(q => q.id)).size !== s.quests.length) return freshState(date);
    return s.date === date ? s : { ...s, date, quests: STARTERS.map(q => ({ ...q })) };
  } catch { return freshState(date); }
}
export function completeQuest(state, id) {
  const q = state.quests.find(q => q.id === id);
  if (!q || q.done) return state;
  return { ...state, xp: state.xp + q.xp, gold: state.gold + q.gold, completed: state.completed + 1, quests: state.quests.map(q => q.id === id ? { ...q, done: true } : q) };
}
export function levelInfo(xp) { return { level: 1 + Math.floor(xp / XP_PER_LEVEL), progress: xp % XP_PER_LEVEL }; }
