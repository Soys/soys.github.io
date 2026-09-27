// ==UserScript==
// @name         AcFun 动态侧栏
// @namespace    https://www.acfun.cn/
// @version      1.4.1
// @description  在 AcFun 页面查看动态广场说说和自己的动态，并提醒新动态
// @match        https://www.acfun.cn/*
// @match        https://member.acfun.cn/*
// @match        https://live.acfun.cn/*
// @run-at       document-idle
// @grant        GM_xmlhttpRequest
// @connect      api.acfunchina.com
// @connect      m.acfun.cn
// @connect      id.app.acfun.cn
// ==/UserScript==

(() => {
  'use strict';

  const API_BASE = 'https://api.acfunchina.com';
  const SQUARE_API = `${API_BASE}/rest/app/feed/feedSquareV3`;
  const FOLLOW_API = `${API_BASE}/rest/app/feed/followFeedV2`;
  const PROFILE_API = `${API_BASE}/rest/app/feed/profile`;
  const MOMENT_DETAIL_API = 'https://m.acfun.cn/rest/mobile-direct/moment/detail';
  const POLL_MS = 90_000;
  const SEEN_KEY = 'acfun-moment-sidebar-seen-v2';
  const SETTINGS_KEY = 'acfun-moment-sidebar-settings-v1';
  const ROOT_ID = 'acfun-moment-sidebar';
  if (window.top !== window.self || document.getElementById(ROOT_ID)) return;

  const seen = readSeen();
  const settings = readSettings();
  const state = { items: [], mode: 'square', open: false, loading: false, firstSuccess: { square: false, follow: false, mine: false }, requestId: 0, userId: null, drag: null };
  const detailCache = new Map();
  const root = document.createElement('div');
  root.id = ROOT_ID;
  root.classList.toggle('dock-left', settings.dock === 'left');
  root.innerHTML = `
    <button class="ams-tab" type="button" aria-label="展开 AcFun 动态" title="AcFun 动态"><span>动态</span><i></i></button>
    <aside class="ams-panel" aria-label="AcFun 动态" aria-hidden="true">
      <header class="ams-header">
        <div class="ams-heading"><strong>动态广场</strong><small>看看大家在聊什么？</small></div>
        <div class="ams-actions">
          <button class="ams-refresh" type="button" aria-label="刷新动态" title="刷新">↻</button>
          <button class="ams-settings-toggle" type="button" aria-label="设置" title="设置">⚙</button>
        </div>
      </header>
      <nav class="ams-tabs" aria-label="动态来源">
        <button type="button" data-mode="square" class="active">动态广场</button>
        <button type="button" data-mode="follow">关注人动态</button>
        <button type="button" data-mode="mine" hidden>我的动态</button>
      </nav>
      <main class="ams-list"><div class="ams-status">少女祈祷中…</div></main>
    </aside>`;
  const settingsDialog = document.createElement('div');
  settingsDialog.className = 'ams-settings-dialog';
  settingsDialog.hidden = true;
  settingsDialog.innerHTML = `<section class="ams-settings-window" role="dialog" aria-modal="true" aria-label="动态侧栏设置">
    <header><strong>动态侧栏设置</strong><button type="button" class="ams-settings-close" aria-label="关闭">×</button></header>
    <label>面板透明度 <input class="ams-opacity" type="range" min="30" max="100" value="${settings.opacity}"><span class="ams-opacity-value">${settings.opacity}%</span></label>
    <label class="ams-check"><input class="ams-enable-mine" type="checkbox" ${settings.enableMine ? 'checked' : ''}>显示「我的动态」</label>
    <fieldset><legend>黑名单用户的显示方式</legend><label class="ams-check"><input type="radio" name="ams-block-style" value="hide" ${settings.blockStyle === 'hide' ? 'checked' : ''}>隐藏内容</label><label class="ams-check"><input type="radio" name="ams-block-style" value="mask" ${settings.blockStyle === 'mask' ? 'checked' : ''}>显示屏蔽提示</label><label class="ams-check"><input type="radio" name="ams-block-style" value="mask-link" ${settings.blockStyle === 'mask-link' ? 'checked' : ''}>显示屏蔽提示但可跳转</label></fieldset>
    <label class="ams-blacklist-label">黑名单 UID（每行一个，也支持逗号分隔）<textarea class="ams-blacklist" rows="6" spellcheck="false"></textarea></label>
    <div class="ams-import"><label class="ams-file-label">导入 TXT<input class="ams-file" type="file" accept=".txt,text/plain"></label><input class="ams-remote-url" type="url" placeholder="https://example.com/blacklist.txt"><button type="button" class="ams-read-remote">读取远程</button></div>
    <small class="ams-settings-note">远程文本需允许跨域读取；保存 URL 后会每 15 分钟同步一次。</small>
    <div class="ams-settings-footer"><span class="ams-settings-status"></span><button class="ams-save-settings" type="button">保存设置</button></div>
  </section>`;
  const style = document.createElement('style');
  style.textContent = `
    #${ROOT_ID}{--ams-red:#fd4c5d;--ams-opacity:${settings.opacity / 100};position:fixed;z-index:2147483000;width:45px;height:48px;right:${Number(settings.right)||0}px;top:${Number(settings.top)||Math.round(innerHeight*.34)}px;font:14px/1.5 -apple-system,BlinkMacSystemFont,"Segoe UI","PingFang SC","Microsoft YaHei",sans-serif;color:#292d35}
    #${ROOT_ID},#${ROOT_ID} *{box-sizing:border-box}#${ROOT_ID} button{font:inherit;cursor:pointer}
    #${ROOT_ID} .ams-tab{position:absolute;right:0;top:0;width:45px;height:48px;border:0;border-radius:12px 0 0 12px;background:var(--ams-red);color:#fff;box-shadow:0 4px 16px #21253235;font-weight:700;font-size:14px;letter-spacing:1px;transition:transform .22s}
    #${ROOT_ID} .ams-tab:hover{transform:translateX(-3px)}#${ROOT_ID} .ams-tab i{display:none;position:absolute;right:5px;top:5px;width:9px;height:9px;border-radius:50%;background:#fff;border:1px solid var(--ams-red);box-shadow:0 0 0 1px white}#${ROOT_ID}.has-new .ams-tab i{display:block}
    #${ROOT_ID} .ams-panel{position:absolute;right:0;left:auto;top:-10px;width:370px;height:min(650px,78vh);min-height:320px;display:flex;flex-direction:column;background:rgba(255,255,255,var(--ams-opacity));backdrop-filter:blur(10px);border:1px solid #e8ebef;border-radius:16px 0 0 16px;box-shadow:0 12px 42px #20263526;transform:translateX(calc(100% + 8px));visibility:hidden;opacity:0;transition:transform .24s ease,opacity .2s ease,visibility .24s;overflow:hidden}
    #${ROOT_ID}.is-open .ams-panel{transform:translateX(0);visibility:visible;opacity:1}#${ROOT_ID}.is-open .ams-tab{transform:translateX(-370px)}
    #${ROOT_ID}.dock-left .ams-tab{border-radius:0 12px 12px 0}#${ROOT_ID}.dock-left .ams-panel{left:45px;right:auto;border-radius:0 16px 16px 0;transform:translateX(calc(-100% - 8px))}#${ROOT_ID}.dock-left.is-open .ams-panel{transform:translateX(0)}#${ROOT_ID}.dock-left.is-open .ams-tab{transform:translateX(0)}#${ROOT_ID}.dock-left:not(.is-open) .ams-tab:hover{transform:translateX(3px)}
    #${ROOT_ID} .ams-header{display:flex;justify-content:space-between;align-items:center;padding:13px 16px 10px;border-bottom:1px solid #edf0f3}#${ROOT_ID} .ams-header strong{font-size:17px}#${ROOT_ID} .ams-header small{display:block;margin-top:2px;color:#9298a4;font-size:12px}
    #${ROOT_ID} .ams-actions{display:flex;gap:7px}#${ROOT_ID} .ams-actions button{width:30px;height:30px;padding:0;border:0;border-radius:9px;background:#f4f5f7;color:#59606b;font-size:19px;line-height:1}#${ROOT_ID} .ams-actions button:hover{background:#eceef1}
    #${ROOT_ID} .ams-tabs{display:flex;gap:6px;padding:10px 14px 8px;border-bottom:1px solid #edf0f3}#${ROOT_ID} .ams-tabs button{padding:6px 11px;border:0;border-radius:8px;background:transparent;color:#737985;font-size:13px}#${ROOT_ID} .ams-tabs button.active{background:#fff0f1;color:var(--ams-red);font-weight:600}
    .ams-settings-dialog{position:fixed;inset:0;z-index:2147483001;display:grid;place-items:center;background:#10131a70;font:14px/1.5 -apple-system,BlinkMacSystemFont,"Segoe UI","PingFang SC","Microsoft YaHei",sans-serif;color:#292d35}.ams-settings-dialog[hidden]{display:none}.ams-settings-window{width:min(480px,calc(100vw - 28px));max-height:88vh;overflow-x:hidden;overflow-y:auto;padding:16px;background:#fff;border-radius:14px;box-shadow:0 16px 54px #0004}.ams-settings-window,.ams-settings-window *{box-sizing:border-box;min-width:0}.ams-settings-window>header{display:flex;justify-content:space-between;align-items:center;margin-bottom:14px}.ams-settings-window>header strong{font-size:17px}.ams-settings-window button{flex:0 0 auto;border:0;border-radius:7px;padding:7px 10px;background:#f0f1f3;color:#424751;cursor:pointer}.ams-settings-close{font-size:20px!important;padding:2px 9px!important}.ams-settings-window>label{display:flex;align-items:center;gap:9px;margin:12px 0}.ams-settings-window .ams-opacity{width:160px}.ams-settings-window .ams-check{display:flex;align-items:center;gap:7px;margin:6px 0}.ams-settings-window fieldset{border:1px solid #e7e8eb;border-radius:8px;margin:12px 0;padding:5px 12px}.ams-settings-window legend,.ams-settings-note{font-size:12px;color:#7e8490}.ams-blacklist-label{display:block!important}.ams-blacklist{display:block;width:100%;margin-top:5px;padding:8px;border:1px solid #ddd;border-radius:7px;font:12px/1.5 monospace;resize:vertical}.ams-import{display:flex;gap:7px;align-items:center;margin-top:9px}.ams-file-label{display:inline-flex;align-items:center;white-space:nowrap;padding:7px 10px;background:#f0f1f3;border-radius:7px;cursor:pointer}.ams-file{display:none}.ams-remote-url{width:0;flex:1;padding:8px;border:1px solid #ddd;border-radius:7px}.ams-settings-note{display:block;margin-top:8px}.ams-settings-footer{display:flex;justify-content:space-between;align-items:center;gap:8px;margin-top:14px}.ams-save-settings{background:#fd4c5d!important;color:#fff!important}.ams-settings-status{overflow-wrap:anywhere;font-size:12px;color:#737985}
    #${ROOT_ID} .ams-list{flex:1;overflow:auto;padding:0 14px}#${ROOT_ID} .ams-status{padding:34px 12px;text-align:center;color:#9298a4}#${ROOT_ID} .ams-status.error{color:#cb4652}
    #${ROOT_ID} .ams-item{padding:14px 2px;border-bottom:1px solid #edf0f3}#${ROOT_ID} .ams-user-row{display:flex;align-items:center;gap:8px;margin-bottom:8px}#${ROOT_ID} .ams-user{display:inline-flex;align-items:center;gap:8px;min-width:0;text-decoration:none;color:inherit}#${ROOT_ID} .ams-avatar{width:30px;height:30px;border-radius:50%;object-fit:cover;background:#f1f2f4}#${ROOT_ID} .ams-name{font-weight:600;font-size:13px}#${ROOT_ID} .ams-time{margin-left:auto;color:#a0a5ad;font-size:11px;white-space:nowrap}
    #${ROOT_ID} .ams-text{font-size:13px;white-space:pre-wrap;overflow-wrap:anywhere;line-height:1.65}#${ROOT_ID} .ams-moment-link{display:block;color:inherit;text-decoration:none}#${ROOT_ID} .ams-moment-link:hover{color:var(--ams-red)}#${ROOT_ID} .ams-images{display:grid;grid-template-columns:repeat(3,1fr);gap:4px;margin-top:9px}#${ROOT_ID} .ams-images img{width:100%;aspect-ratio:1;object-fit:cover;border-radius:6px;background:#f2f3f5}
    #${ROOT_ID} .ams-repost{margin-top:8px;padding:8px 10px;border-radius:7px;background:#f6f7f8;color:#737985;font-size:12px;white-space:pre-wrap;overflow-wrap:anywhere}#${ROOT_ID} .ams-detail{color:#a0a5ad;font-size:12px;margin-top:7px}
    #${ROOT_ID} footer{padding:11px 16px;border-top:1px solid #edf0f3;text-align:center;font-size:12px}#${ROOT_ID} footer a{color:#727985;text-decoration:none}#${ROOT_ID} footer a:hover{color:var(--ams-red)}
    #${ROOT_ID} .ams-blocked .ams-avatar{display:grid;place-items:center;background:#eceef1;color:#9a9faa;font-size:20px}#${ROOT_ID} .ams-blocked .ams-text{color:#777}#${ROOT_ID} .ams-blocked a.ams-moment-link{cursor:pointer}
    @media(max-width:520px){#${ROOT_ID} .ams-panel{width:min(370px,calc(100vw - 45px))}#${ROOT_ID}.is-open .ams-tab{transform:translateX(calc(-1 * min(370px,calc(100vw - 45px))))}#${ROOT_ID}.dock-left.is-open .ams-tab{transform:translateX(0)}}
  `;
    document.documentElement.append(style, root, settingsDialog);
  const tab = root.querySelector('.ams-tab');
  const panel = root.querySelector('.ams-panel');
  const list = root.querySelector('.ams-list');
  const title = root.querySelector('.ams-heading strong');
  const subtitle = root.querySelector('.ams-header small');
  tab.addEventListener('click', () => { if (state.suppressClick) { state.suppressClick = false; return; } setOpen(!state.open); });
  tab.addEventListener('pointerdown', event => {
    if (event.button !== 0) return;
    state.drag = { x: event.clientX, y: event.clientY, right: parseFloat(root.style.right) || Number(settings.right) || 0, top: parseFloat(root.style.top) || Number(settings.top) || Math.round(innerHeight*.34), moved: false };
    tab.setPointerCapture(event.pointerId);
  });
  tab.addEventListener('pointermove', event => {
    if (!state.drag) return;
    const dx = event.clientX - state.drag.x, dy = event.clientY - state.drag.y;
    if (!state.drag.moved && Math.abs(dx) + Math.abs(dy) < 6) return;
    state.drag.moved = true;
    root.style.right = `${Math.max(-370, Math.min(innerWidth + 325, state.drag.right - dx))}px`;
    root.style.top = `${Math.max(8, Math.min(innerHeight - 58, state.drag.top + dy))}px`;
  });
  tab.addEventListener('pointerup', () => {
    if (!state.drag) return;
    if (state.drag.moved) {
      state.suppressClick = true;
      const currentRight = parseFloat(root.style.right) || 0;
      const rootCenter = innerWidth - currentRight - 22.5;
      const nearestEdge = rootCenter < innerWidth / 2 ? 'left' : 'right';
      root.classList.toggle('dock-left', nearestEdge === 'left');
      root.style.right = nearestEdge === 'right' ? '0px' : `${Math.max(0, innerWidth - 45)}px`;
      settings.dock = nearestEdge;
      settings.right = parseFloat(root.style.right) || 0;
      settings.top = parseFloat(root.style.top);
      localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
    }
    state.drag = null;
  });
  root.querySelector('.ams-refresh').addEventListener('click', () => refresh(true));
  root.querySelector('.ams-settings-toggle').addEventListener('click', openSettings);
  settingsDialog.querySelector('.ams-settings-close').addEventListener('click', closeSettings);
  settingsDialog.addEventListener('click', event => { if (event.target === settingsDialog) closeSettings(); });
  settingsDialog.querySelector('.ams-opacity').addEventListener('input', event => {
    const value = Number(event.target.value);
    root.style.setProperty('--ams-opacity', String(value / 100));
    settingsDialog.querySelector('.ams-opacity-value').textContent = `${value}%`;
  });
  settingsDialog.querySelector('.ams-file').addEventListener('change', async event => {
    const file = event.target.files?.[0]; if (!file) return;
    settingsDialog.querySelector('.ams-blacklist').value = mergeUidText(settingsDialog.querySelector('.ams-blacklist').value, await file.text());
    settingsDialog.querySelector('.ams-settings-status').textContent = `已读取 ${file.name}`;
    event.target.value = '';
  });
  settingsDialog.querySelector('.ams-read-remote').addEventListener('click', async () => {
    const url = settingsDialog.querySelector('.ams-remote-url').value.trim();
    if (!/^https:\/\//i.test(url)) { settingsDialog.querySelector('.ams-settings-status').textContent = '请输入 HTTPS 文本链接'; return; }
    try { const response = await fetch(url, { mode: 'cors', cache: 'no-store' }); if (!response.ok) throw new Error(`HTTP ${response.status}`); settingsDialog.querySelector('.ams-blacklist').value = mergeUidText(settingsDialog.querySelector('.ams-blacklist').value, await response.text()); settingsDialog.querySelector('.ams-settings-status').textContent = '远程黑名单已导入'; }
    catch (error) { settingsDialog.querySelector('.ams-settings-status').textContent = `读取失败：${error.message}（请确认服务器允许跨域）`; }
  });
  settingsDialog.querySelector('.ams-save-settings').addEventListener('click', () => {
    Object.assign(settings, {
      blacklist: parseUids(settingsDialog.querySelector('.ams-blacklist').value),
      opacity: Number(settingsDialog.querySelector('.ams-opacity').value),
      enableMine: settingsDialog.querySelector('.ams-enable-mine').checked,
      blockStyle: settingsDialog.querySelector('[name="ams-block-style"]:checked').value,
      remoteUrl: settingsDialog.querySelector('.ams-remote-url').value.trim(),
      right: Number(root.style.right.replace('px','')) || 0,
      top: Number(root.style.top.replace('px','')) || Math.round(innerHeight*.34)
    });
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
    root.style.setProperty('--ams-opacity', String(settings.opacity / 100));
    root.querySelector('[data-mode="mine"]').hidden = !settings.enableMine;
    render();
    settingsDialog.querySelector('.ams-settings-status').textContent = '已保存';
    if (settings.remoteUrl) syncRemoteBlacklist();
  });
  root.querySelector('[data-mode="mine"]').hidden = !settings.enableMine;
  settingsDialog.querySelector('.ams-blacklist').value = settings.blacklist.join('\n');
  settingsDialog.querySelector('.ams-remote-url').value = settings.remoteUrl || '';
  root.querySelectorAll('.ams-tabs button').forEach(button => button.addEventListener('click', () => {
    const nextMode = button.dataset.mode;
    if (nextMode === state.mode) return;
    state.mode = nextMode;
    state.items = [];
    button.parentElement.querySelectorAll('button').forEach(item => item.classList.toggle('active', item === button));
    updateHeading();
    render({ text: '少女祈祷中…' });
    refresh(true);
  }));

  function readSeen() {
    try { return JSON.parse(localStorage.getItem(SEEN_KEY) || '{"square":[],"mine":[]}'); }
    catch { return { square: [], mine: [] }; }
  }
  function seenSet(mode = state.mode) { return new Set(seen[mode] || []); }
  function saveSeen(mode, items) {
    seen[mode] = [...new Set([...(seen[mode] || []), ...items.map(key).filter(Boolean)])].slice(-500);
    localStorage.setItem(SEEN_KEY, JSON.stringify(seen));
  }
  function readSettings() {
    try {
      const value = JSON.parse(localStorage.getItem(SETTINGS_KEY) || '{}');
      return { opacity: Math.min(100, Math.max(30, Number(value.opacity) || 100)), blacklist: Array.isArray(value.blacklist) ? value.blacklist.map(String) : [], enableMine: Boolean(value.enableMine), blockStyle: ['mask', 'mask-link'].includes(value.blockStyle) ? value.blockStyle : 'hide', remoteUrl: value.remoteUrl || '', right: Number(value.right) || 0, top: Number(value.top) || Math.round(innerHeight*.34), dock: value.dock === 'left' || (!value.dock && Number(value.right) > innerWidth / 2) ? 'left' : 'right' };
    } catch { return { opacity: 100, blacklist: [], enableMine: false, blockStyle: 'hide', remoteUrl: '', right: 0, top: Math.round(innerHeight*.34), dock: 'right' }; }
  }
  function parseUids(text) { return [...new Set(String(text).split(/[\s,，;；]+/).map(value => value.trim()).filter(value => /^\d+$/.test(value)))]; }
  function mergeUidText(a, b) { return [...new Set([...parseUids(a), ...parseUids(b)])].join('\n'); }
  function openSettings() {
    settingsDialog.querySelector('.ams-opacity').value = settings.opacity;
    settingsDialog.querySelector('.ams-opacity-value').textContent = `${settings.opacity}%`;
    settingsDialog.querySelector('.ams-enable-mine').checked = settings.enableMine;
    settingsDialog.querySelector(`[name="ams-block-style"][value="${settings.blockStyle}"]`).checked = true;
    settingsDialog.querySelector('.ams-blacklist').value = settings.blacklist.join('\n');
    settingsDialog.querySelector('.ams-remote-url').value = settings.remoteUrl || '';
    settingsDialog.querySelector('.ams-settings-status').textContent = '';
    settingsDialog.hidden = false;
  }
  function closeSettings() { settingsDialog.hidden = true; }
  async function syncRemoteBlacklist() {
    if (!settings.remoteUrl || !/^https:\/\//i.test(settings.remoteUrl)) return;
    try {
      const response = await fetch(settings.remoteUrl, { mode: 'cors', cache: 'no-store' });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const remote = parseUids(await response.text());
      if (JSON.stringify(remote) !== JSON.stringify(settings.blacklist)) {
        settings.blacklist = remote;
        localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
        if (!settingsDialog.hidden) settingsDialog.querySelector('.ams-blacklist').value = remote.join('\n');
        render();
      }
    } catch (error) { console.warn('[AcFun 动态侧栏] 远程黑名单同步失败', error); }
  }
  function key(item) { return String(item.moment?.momentId || item.resourceId || item.id || ''); }
  function isBlocked(item) { return settings.blacklist.includes(String(item.user?.userId || item.authorId || '')); }
  function setOpen(open) {
    state.open = open;
    root.classList.toggle('is-open', open);
    panel.setAttribute('aria-hidden', String(!open));
    tab.setAttribute('aria-label', open ? '收起 AcFun 动态' : '展开 AcFun 动态');
    if (open) {
      root.classList.remove('has-new');
      if (!state.items.length) refresh(true);
      else { saveSeen(state.mode, state.items); render(); }
    }
  }
  function updateHeading() {
    title.textContent = state.mode === 'mine' ? '我的动态' : state.mode === 'follow' ? '关注人动态' : '动态广场';
    subtitle.textContent = state.mode === 'mine' ? '你发布的说说与转发' : state.mode === 'follow' ? '关注的人发布的动态' : '看看大家在聊什么？';
  }
  function gmRequest(url, options = {}) {
    return new Promise((resolve, reject) => GM_xmlhttpRequest({
      method: options.method || 'GET', url, headers: options.headers, data: options.data,
      withCredentials: Boolean(options.withCredentials), timeout: 20000,
      onload: resolve, onerror: () => reject(new Error('网络请求失败；请检查 Tampermonkey 的跨域权限')),
      ontimeout: () => reject(new Error('请求超时'))
    }));
  }
  async function getCurrentUserId() {
    if (state.userId) return state.userId;
    const response = await fetch('/rest/pc-direct/user/personalInfo', { method: 'POST', credentials: 'include', cache: 'no-store' });
    if (!response.ok) throw new Error(`读取当前账号失败（${response.status}）`);
    const data = await response.json();
    state.userId = String(data.info?.userId || data.userId || '');
    if (!state.userId) throw new Error('未能读取当前账号 UID，请确认已登录 AcFun');
    return state.userId;
  }
  function queryUrl(endpoint, values) {
    const query = new URLSearchParams({ ...values, _: String(Date.now()) });
    return `${endpoint}?${query}`;
  }
  async function feedUrl(mode) {
    const common = { pcursor: '0', count: '20', product: 'ACFUN_APP', sys_name: 'android', appMode: '0' };
    if (mode === 'mine') {
      const userId = await getCurrentUserId();
      return queryUrl(PROFILE_API, { ...common, userId, type: '2' });
    }
    if (mode === 'follow') return queryUrl(FOLLOW_API, common);
    return queryUrl(SQUARE_API, common);
  }
  function parseFeed(text) {
    const data = JSON.parse(text);
    const feed = data.feedList || data.data?.feedList || data.data?.feed;
    if (!Array.isArray(feed)) throw new Error(data.error_msg || data.errorMessage || '动态接口返回格式不符合预期');
    return feed.filter(item => Number(item.resourceType) === 10 && item.moment?.momentId);
  }
  async function loadDetails(items) {
    const targets = items.filter(item => !detailCache.has(key(item)));
    let next = 0;
    async function worker() {
      while (next < targets.length) {
        const item = targets[next++];
        try {
          const response = await gmRequest(`https://m.acfun.cn/rest/mobile-direct/moment/detail?momentId=${encodeURIComponent(key(item))}`, { withCredentials: true });
          if (response.status >= 200 && response.status < 300) {
            const data = JSON.parse(response.responseText);
            detailCache.set(key(item), data.moment?.text || data.data?.moment?.text || item.moment?.text || '');
          }
        } catch { /* feed data still includes a summary */ }
      }
    }
    await Promise.all(Array.from({ length: Math.min(4, targets.length) }, worker));
  }
  function safeHttps(url) { return typeof url === 'string' && /^https:\/\//i.test(url) ? url : ''; }
  function momentUrl(item) { return `https://www.acfun.cn/moment/am${encodeURIComponent(key(item))}`; }
  function renderItem(item) {
    const moment = item.moment || {};
    const user = item.user || {};
    const blocked = isBlocked(item);
    const blockedLink = blocked && settings.blockStyle === 'mask-link';
    const article = document.createElement('article'); article.className = `ams-item${blocked ? ' ams-blocked' : ''}`;
    const userRow = document.createElement('div'); userRow.className = 'ams-user-row';
    const userLink = document.createElement(blocked ? 'div' : 'a'); userLink.className = 'ams-user';
    if (!blocked) { userLink.href = `https://www.acfun.cn/u/${encodeURIComponent(user.userId || item.authorId || '')}`; userLink.target = '_blank'; userLink.rel = 'noopener noreferrer'; }
    let avatar;
    if (blocked) { avatar = document.createElement('span'); avatar.className = 'ams-avatar'; avatar.textContent = '×'; }
    else { avatar = document.createElement('img'); avatar.className = 'ams-avatar'; avatar.alt = ''; avatar.loading = 'lazy'; avatar.src = safeHttps(user.userHead || user.headUrl); }
    const name = document.createElement('span'); name.className = 'ams-name'; name.textContent = blocked ? '黑名单用户' : user.userName || user.name || 'AcFun 用户';
    userLink.append(avatar, name);
    const time = document.createElement('span'); time.className = 'ams-time'; time.textContent = item.time || '';
    userRow.append(userLink, time); article.append(userRow);

    const momentLink = document.createElement(blocked && !blockedLink ? 'div' : 'a'); momentLink.className = 'ams-moment-link';
    if (!blocked || blockedLink) { momentLink.href = momentUrl(item); momentLink.target = '_blank'; momentLink.rel = 'noopener noreferrer'; }
    const text = document.createElement('div'); text.className = 'ams-text'; text.textContent = blocked ? `黑名单用户，内容已屏蔽。${blockedLink ? '查看屏蔽内容请点击。' : ''}` : detailCache.get(key(item)) || moment.text || '（动态内容暂时无法读取）';
    momentLink.append(text);
    const images = !blocked && Array.isArray(moment.imgs) ? moment.imgs.slice(0, 6) : [];
    const imageUrls = images.map(image => safeHttps(typeof image === 'string' ? image : image?.url)).filter(Boolean);
    if (imageUrls.length) {
      const gallery = document.createElement('div'); gallery.className = 'ams-images';
      for (const src of imageUrls) { const image = document.createElement('img'); image.loading = 'lazy'; image.alt = '动态图片'; image.src = src; gallery.append(image); }
      momentLink.append(gallery);
    }
    const repost = blocked ? null : item.repostSource;
    if (repost) {
      const box = document.createElement('div'); box.className = 'ams-repost';
      const repostText = repost.moment?.text || repost.detail?.title || repost.articleTitle || repost.title || '';
      box.textContent = `转发内容${repostText ? `：${repostText}` : '（原内容）'}`;
      momentLink.append(box);
    }
    article.append(momentLink);
    const counts = [];
    counts.push(`评论 ${Number(item.commentCount) || 0}`);
    counts.push(`喜欢 ${Number(item.likeCount) || 0}`);
    counts.push(`转发 ${Number(item.shareCount) || 0}`);
    { const meta = document.createElement('div'); meta.className = 'ams-detail'; meta.textContent = counts.join('　'); article.append(meta); }
    return article;
  }
  function render(message) {
    list.replaceChildren();
    if (message) { const status = document.createElement('div'); status.className = `ams-status${message.error ? ' error' : ''}`; status.textContent = message.text; list.append(status); return; }
    const items = state.items.filter(item => !isBlocked(item) || settings.blockStyle !== 'hide');
    if (!items.length) { list.innerHTML = '<div class="ams-status">暂时没有说说动态</div>'; return; }
    for (const item of items) list.append(renderItem(item));
  }
  async function refresh(force = false) {
    if (state.loading && !force) return;
    const requestId = ++state.requestId;
    state.loading = true;
    if (state.open) render({ text: '少女祈祷中…' });
    try {
      const url = await feedUrl(state.mode);
      const response = await gmRequest(url, { headers: { acPlatform: 'ANDROID_PHONE', appVersion: '6.43.0.513', 'Cache-Control': 'no-cache', Pragma: 'no-cache' } });
      if (requestId !== state.requestId) return;
      if (response.status !== 200) throw new Error(`动态接口返回 ${response.status}`);
      const incoming = parseFeed(response.responseText);
      const prior = seenSet(state.mode);
      const fresh = incoming.filter(item => !prior.has(key(item)) && !isBlocked(item));
      state.items = incoming;
      if (!state.firstSuccess[state.mode]) {
        state.firstSuccess[state.mode] = true;
        saveSeen(state.mode, incoming);
      } else if (state.open) {
        saveSeen(state.mode, incoming);
        root.classList.remove('has-new');
      } else if (fresh.length) {
        root.classList.add('has-new');
      }
      if (state.open) {
        await loadDetails(incoming);
        if (requestId === state.requestId) render();
      }
    } catch (error) {
      if (requestId === state.requestId && state.open) render({ text: `获取失败：${error.message}`, error: true });
      console.warn('[AcFun 动态侧栏]', error);
    } finally {
      if (requestId === state.requestId) state.loading = false;
    }
  }

  refresh(true);
  window.setInterval(() => { if (state.mode !== 'mine') refresh(false); }, POLL_MS);
  window.setInterval(syncRemoteBlacklist, 15 * 60_000);
})();
