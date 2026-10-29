import test from 'node:test';
import assert from 'node:assert/strict';
import { freshState, completeQuest, hydrate, levelInfo, localDate } from '../public/quest-state.js';

test('completing a quest rewards exactly once without mutating the input', () => {
  const before = freshState('2026-10-29');
  const after = completeQuest(before, 'read');
  assert.equal(before.xp, 0);
  assert.equal(before.quests[0].done, false);
  assert.equal(after.xp, 35);
  assert.equal(after.gold, 15);
  assert.equal(after.completed, 1);
  assert.equal(completeQuest(after, 'read'), after);
  assert.equal(completeQuest(after, 'missing'), after);
});
test('crossing a level boundary carries excess XP', () => {
  let s = freshState();
  for (const id of ['read', 'walk', 'focus']) s = completeQuest(s, id);
  assert.equal(s.xp, 105);
  assert.deepEqual(levelInfo(s.xp), { level: 2, progress: 5 });
  assert.deepEqual(levelInfo(900), { level: 10, progress: 0 });
});
test('same-day reload retains completion; next day renews quests but keeps accumulated rewards and motion preference', () => {
  const s = { ...completeQuest(freshState('2026-10-29'), 'read'), motion: false };
  assert.deepEqual(hydrate(JSON.stringify(s), '2026-10-29'), s);
  const next = hydrate(JSON.stringify(s), '2026-10-30');
  assert.equal(next.date, '2026-10-30');
  assert.equal(next.xp, 35);
  assert.equal(next.gold, 15);
  assert.equal(next.completed, 1);
  assert.equal(next.motion, false);
  assert.equal(next.quests.some(q => q.done), false);
});
test('invalid or corrupt storage safely starts fresh, including duplicate IDs and invalid reward types', () => {
  const date = '2026-10-29';
  const s = freshState(date);
  const invalid = ['bad json', 'null', JSON.stringify({ ...s, xp: -1 }), JSON.stringify({ ...s, quests: [s.quests[0], s.quests[0]] }), JSON.stringify({ ...s, quests: [{ ...s.quests[0], xp: '35' }] }), JSON.stringify({ ...s, quests: [{ ...s.quests[0], title: 'x'.repeat(61) }] })];
  for (const raw of invalid) assert.deepEqual(hydrate(raw, date), s);
});
test('reporting date uses local calendar components', () => {
  assert.equal(localDate(new Date(2026, 0, 3, 23, 59)), '2026-01-03');
});
