import { getSetting, setSetting } from '../db.js';
import {
  SETTING_KEYS, WARDROBE_ITEMS, WARDROBE_SLOTS, emptyWardrobe, esc, owlStage, sanitizeWardrobe, wardrobeStats, wardrobeUnlocked
} from './logic.js';
import { dailySnapshot, wearClass } from './daily-owl.js';

let previewId = null;

export async function renderWardrobe(root, { today, dateOf, streak }) {
  const snap = await dailySnapshot(today, dateOf);
  const stats = wardrobeStats(snap.agg, streak);
  const unlocked = wardrobeUnlocked(stats);
  const unlockedIds = unlocked.map(item => item.id);
  const saved = sanitizeWardrobe(await getSetting(SETTING_KEYS.wardrobe, emptyWardrobe()), unlockedIds);
  const preview = WARDROBE_ITEMS.find(item => item.id === previewId) || null;
  const shown = { ...saved };
  if (preview && unlockedIds.includes(preview.id)) shown[preview.slot] = preview.id;
  const stage = owlStage(stats.minutes);
  const visual = stage.image
    ? `<img src="${esc(stage.image)}" alt="${esc(stage.name)}">`
    : '<div class="owl-egg" role="img" aria-label="알"><span></span></div>';
  const groups = WARDROBE_SLOTS.map(([slot, label]) => {
    const items = WARDROBE_ITEMS.filter(item => item.slot === slot).map(item => {
      const owned = unlockedIds.includes(item.id);
      const on = saved[slot] === item.id;
      return `<button type="button" class="wardrobe-item ${owned ? '' : 'is-locked'} ${previewId === item.id ? 'is-preview' : ''} ${on ? 'is-on' : ''}" data-v190="wardrobe-preview" data-id="${esc(item.id)}" ${owned ? '' : 'disabled'}>
        <strong>${esc(item.name)}</strong>
        <small>${owned ? esc(item.detail) : `잠김 · ${esc(item.detail)}`}</small>
      </button>`;
    }).join('');
    const clear = saved[slot] ? `<button type="button" class="btn btn-ghost btn-small" data-v190="wardrobe-clear" data-slot="${slot}">${label} 해제</button>` : '';
    return `<section class="card"><div class="card-head"><div><h3>${label}</h3><p>${saved[slot] ? '착용 중' : '비어 있음'}</p></div>${clear}</div><div class="wardrobe-grid">${items}</div></section>`;
  }).join('');
  root.innerHTML = `${heading('부엉이 옷장', '도감과 영구 성장은 그대로 두고, 해제한 장식만 겹쳐 보여 줍니다. 장식은 기존 부엉이 그림 위의 모양입니다.')}
    <div class="grid grid-2 section-gap">
      <article class="card">
        <div class="card-head"><div><h3>착용 미리보기</h3><p>${preview ? esc(preview.name) : '저장된 착용 상태'}</p></div><span class="pill">${esc(stage.name)}</span></div>
        <div class="wardrobe-stage" data-daily="${esc(snap.appearance.id)}"><div class="owl-wear ${esc(wearClass(shown))}">${visual}</div></div>
        <p class="subtle">오늘 상태 ${esc(snap.appearance.label)} · 누적 ${stats.minutes.toLocaleString('ko-KR')}분 · 연속 ${stats.streak}일 · Lv.${stats.level}</p>
        ${preview && unlockedIds.includes(preview.id) ? `<button type="button" class="btn btn-primary" data-v190="wardrobe-equip" data-id="${esc(preview.id)}">착용하기</button>` : '<p class="subtle">잠긴 항목은 조건을 채우기 전에는 선택할 수 없습니다.</p>'}
      </article>
      <article class="card">
        <div class="card-head"><div><h3>해제 조건</h3><p>공부 기록, 연속 기록, 레벨, 성장 단계에서 계산합니다.</p></div></div>
        <div class="status-row"><span>보유</span><strong>${unlocked.length} / ${WARDROBE_ITEMS.length}</strong></div>
        <p class="subtle">이미지를 따로 만들지 않은 장식은 색과 도형으로만 표시합니다. 대표 부엉이 설정과 도감 획득 기록은 바꾸지 않습니다.</p>
      </article>
    </div>
    <div class="wardrobe-groups section-gap">${groups}</div>`;
}

export async function handleWardrobe(action, button, { today, dateOf, streak, toast }) {
  if (!action.startsWith('wardrobe-')) return false;
  const snap = await dailySnapshot(today, dateOf);
  const stats = wardrobeStats(snap.agg, streak);
  const unlockedIds = wardrobeUnlocked(stats).map(item => item.id);
  const saved = sanitizeWardrobe(await getSetting(SETTING_KEYS.wardrobe, emptyWardrobe()), unlockedIds);
  if (action === 'wardrobe-preview') {
    previewId = button.dataset.id || null;
    return true;
  }
  if (action === 'wardrobe-equip') {
    const item = WARDROBE_ITEMS.find(entry => entry.id === button.dataset.id);
    if (!item || !unlockedIds.includes(item.id)) throw new Error('아직 해제되지 않은 장식입니다.');
    saved[item.slot] = item.id;
    await setSetting(SETTING_KEYS.wardrobe, saved);
    previewId = item.id;
    toast(`${item.name}을 착용했습니다.`);
    return true;
  }
  if (action === 'wardrobe-clear') {
    const slot = button.dataset.slot;
    if (Object.prototype.hasOwnProperty.call(saved, slot)) saved[slot] = null;
    await setSetting(SETTING_KEYS.wardrobe, saved);
    toast('장식을 벗겼습니다.');
    return true;
  }
  return false;
}

function heading(title, subtitle) {
  return `<div class="page-heading"><div><p class="eyebrow">2028 STUDY ARCHIVE</p><h1>${title}</h1><p>${subtitle}</p></div></div>`;
}
