(() => {
  "use strict";

  const COURSES = window.COURSES;
  const LESSONS = window.LESSONS;
  const STORAGE_KEY = "unity-practice-v2";
  const SLOT_RE = /⟦(\w+)⟧/g;

  const STEPS = [
    { label: "動かす", guide: "まずはコードをコピーして動かしてみよう。意味はまだわからなくて大丈夫。Unity なら C# スクリプトを作って貼り付け、キューブにアタッチして再生する。ここでは ▶ 実行 で同じ動きを確認できる。" },
    { label: "壊して試す", short: "壊す", guide: "色の付いた部分を書き換えて、わざと壊してみよう。実行する前に「どうなるか」を予想してから押すのがコツ。" },
    { label: "言葉にする", short: "言葉に", guide: "動かして壊してみた結果から、このコードが何をしていたのかを日本語で説明してみよう。" },
    { label: "解説", guide: "最後に、なぜそう動いたのかを確認しよう。さっき自分で説明した内容と比べてみよう。" },
  ];

  const $ = (id) => document.getElementById(id);
  const el = Object.fromEntries([
    "sidebar", "menuToggle", "progressText", "progressBar", "courseLabel", "lessonTitle", "lessonGoal",
    "steps", "stepGuide", "playArea", "envArea", "fileName", "code", "runBtn", "copyBtn", "resetBtn",
    "nextStepBtn", "experiments", "expCount", "expList", "console", "scene", "verbalArea", "verbalText",
    "verbalCheckBtn", "verbalResult", "noteInput", "noteCopyBtn", "toExplainBtn", "explainArea",
    "explainBody", "nextLessonBtn", "tabCode", "tabResult", "resultDot", "slotPanel",
  ].map((id) => [id, $(id)]));

  // ───────── 保存（使えない環境でも動くように try/catch） ─────────
  function load() {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY)) || {}; } catch { return {}; }
  }
  function save() {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(store)); } catch { /* 保存できなくても続行 */ }
  }
  const store = load();
  store.lessons = store.lessons || {};

  const optValue = (o) => (typeof o === "object" ? o.value : o);
  const optLabel = (o) => (typeof o === "object" ? o.label : String(o));
  const defaults = (obj) => Object.fromEntries(Object.entries(obj || {}).map(([k, s]) => [k, s.default]));
  const envDefaults = (lesson) => Object.fromEntries((lesson.env || []).map((e) => [e.name, e.default]));

  function stateOf(lesson) {
    const s = store.lessons[lesson.id] || (store.lessons[lesson.id] = {});
    s.unlocked = s.unlocked || 0; // 開放済みの最大ステップ (0〜3)
    s.values = { ...defaults(lesson.slots), ...(s.values || {}) };
    s.env = { ...envDefaults(lesson), ...(s.env || {}) };
    s.exp = s.exp || [];
    s.note = s.note || "";
    return s;
  }

  let current = Math.min(store.last || 0, LESSONS.length - 1);
  let step = 0;
  const lesson = () => LESSONS[current];
  const state = () => stateOf(lesson());

  // ───────── C# の簡易シンタックスハイライト ─────────
  const KEYWORDS = "using|public|private|protected|class|void|return|if|else|for|foreach|while|new|this|true|false|null|static|in|async|await|yield|int|float|bool|string|var";
  const TYPES = "MonoBehaviour|GameObject|Transform|Vector3|Quaternion|Rigidbody|Collision|Collider|Debug|Time|Input|KeyCode|IEnumerator|WaitForSeconds|Coroutine|Renderer|Awaitable|SerializeField|TextMeshProUGUI|SceneManager|AsyncOperation|UnityWebRequest|WaitForSecondsRealtime|WaitUntil|Mathf|Slider|ForceMode";
  const TOKEN_RE = new RegExp(
    `(\\/\\/.*$)|("(?:[^"\\\\]|\\\\.)*")|\\b(${KEYWORDS})\\b|\\b(${TYPES})\\b|\\b(\\d+(?:\\.\\d+)?f?)\\b`,
    "gm"
  );
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  function highlight(src) {
    let out = "", last = 0;
    src.replace(TOKEN_RE, (m, comment, str, kw, type, num, offset) => {
      out += esc(src.slice(last, offset));
      const cls = comment ? "c-comment" : str ? "c-string" : kw ? "c-kw" : type ? "c-type" : "c-num";
      out += `<span class="${cls}">${esc(m)}</span>`;
      last = offset + m.length;
      return m;
    });
    return out + esc(src.slice(last));
  }

  const codeWith = (values) => lesson().code.replace(SLOT_RE, (_, name) => String(values[name]));

  // ───────── サイドバー・進捗 ─────────
  function renderSidebar() {
    el.sidebar.innerHTML = "";
    COURSES.forEach((course) => {
      const h = document.createElement("div");
      h.className = "course";
      h.innerHTML = `<h3>${esc(course.title)}</h3><p>${esc(course.desc)}</p>`;
      el.sidebar.appendChild(h);
      const ul = document.createElement("ul");
      LESSONS.forEach((l, i) => {
        if (l.course !== course.id) return;
        const s = stateOf(l);
        const done = s.unlocked >= 3;
        const li = document.createElement("li");
        const btn = document.createElement("button");
        btn.className = "nav-item" + (i === current ? " active" : "") + (done ? " solved" : "");
        const dots = STEPS.map((_, k) => `<i class="${k < s.unlocked || done ? "on" : ""}"></i>`).join("");
        btn.innerHTML = `<span class="mark">${done ? "✓" : i + 1}</span><span class="nav-title">${esc(l.title)}</span><span class="dots" aria-hidden="true">${dots}</span>`;
        btn.addEventListener("click", () => { goLesson(i); document.body.classList.remove("menu-open"); });
        li.appendChild(btn);
        ul.appendChild(li);
      });
      el.sidebar.appendChild(ul);
    });
    const doneCount = LESSONS.filter((l) => stateOf(l).unlocked >= 3).length;
    el.progressText.textContent = `${doneCount} / ${LESSONS.length}`;
    el.progressBar.style.width = `${(doneCount / LESSONS.length) * 100}%`;
  }

  function renderSteps() {
    const s = state();
    el.steps.innerHTML = "";
    STEPS.forEach((st, k) => {
      const li = document.createElement("li");
      const btn = document.createElement("button");
      const locked = k > s.unlocked;
      btn.className = "step" + (k === step ? " current" : "") + (k < s.unlocked || (k === 3 && s.unlocked >= 3) ? " done" : "");
      btn.disabled = locked;
      btn.innerHTML = `<span class="step-no">${k + 1}</span><span class="full">${st.label}</span><span class="short">${st.short || st.label}</span>`;
      btn.title = locked ? "前のステップを終えると開きます" : "";
      btn.addEventListener("click", () => goStep(k));
      li.appendChild(btn);
      el.steps.appendChild(li);
    });
    el.stepGuide.textContent = (lesson().guides || {})[step] || STEPS[step].guide;
  }

  // ───────── コード表示 ─────────
  // スマホではインデントを半分にし、書き換え欄はコードの下の「書き換えパネル」に大きく並べる
  const mq = window.matchMedia("(max-width: 820px)");
  const isMobile = () => mq.matches;
  const BADGES = "①②③④⑤⑥⑦⑧⑨";
  const slotText = (slot, val) => {
    if (slot.type === "number") return String(val);
    const o = slot.options.find((x) => String(optValue(x)) === String(val));
    return optValue(o) === "" ? optLabel(o) : String(val);
  };

  function renderCode() {
    const l = lesson(), s = state();
    const editable = step === 1;
    const mobile = isMobile();
    const src = mobile ? l.code.replace(/^((?: {4})+)/gm, (m) => " ".repeat(m.length / 2)) : l.code;
    const parts = src.split(SLOT_RE);
    const order = [];
    let html = "";
    parts.forEach((part, i) => {
      if (i % 2 === 0) { html += highlight(part); return; }
      const slot = l.slots[part];
      if (!order.includes(part)) order.push(part);
      if (!editable) {
        html += `<span class="slot-static">${highlight(String(slot.default))}</span>`;
        return;
      }
      const val = s.values[part];
      const changed = String(val) !== String(slot.default) ? " changed" : "";
      if (mobile) {
        html += `<button type="button" class="slot-chip${changed}" data-slot="${part}"><span class="badge">${BADGES[order.indexOf(part)]}</span>${esc(slotText(slot, val))}</button>`;
      } else if (slot.type === "number") {
        html += `<input class="slot${changed}" id="slot-${part}" data-slot="${part}" value="${esc(val)}" inputmode="decimal" autocomplete="off" spellcheck="false" style="width:${Math.max(3, String(val).length + 1)}ch" aria-label="${esc(slot.label || part)}">`;
      } else {
        html += `<select class="slot${changed}" id="slot-${part}" data-slot="${part}" aria-label="${esc(slot.label || part)}">${slotOptions(slot, val)}</select>`;
      }
    });
    el.code.innerHTML = html;

    // 書き換えパネル（スマホのみ）
    el.slotPanel.hidden = !(editable && mobile);
    if (editable && mobile) {
      el.slotPanel.innerHTML = `<h3>書き換える場所</h3>` + order.map((name, i) => {
        const slot = l.slots[name], val = s.values[name];
        const control = slot.type === "number"
          ? `<input class="slot-field" id="slot-${name}" data-slot="${name}" value="${esc(val)}" inputmode="decimal" autocomplete="off">`
          : `<select class="slot-field" id="slot-${name}" data-slot="${name}">${slotOptions(slot, val)}</select>`;
        return `<label class="slot-row"><span class="slot-name"><span class="badge">${BADGES[i]}</span>${esc(slot.label || name)}</span>${control}</label>`;
      }).join("");
    } else {
      el.slotPanel.innerHTML = "";
    }

    const controls = [...el.code.querySelectorAll("input.slot, select.slot"), ...el.slotPanel.querySelectorAll(".slot-field")];
    controls.forEach((input) => {
      const name = input.dataset.slot;
      input.addEventListener(input.tagName === "SELECT" ? "change" : "input", () => {
        s.values[name] = input.value;
        save();
        const changed = String(input.value) !== String(l.slots[name].default);
        input.classList.toggle("changed", changed);
        if (input.classList.contains("slot") && input.tagName === "INPUT") input.style.width = `${Math.max(3, input.value.length + 1)}ch`;
        el.code.querySelectorAll(`.slot-chip[data-slot="${name}"]`).forEach((chip) => {
          chip.classList.toggle("changed", changed);
          chip.lastChild.textContent = slotText(l.slots[name], input.value);
        });
      });
      if (input.tagName === "INPUT") input.addEventListener("keydown", (e) => { if (e.key === "Enter") { e.preventDefault(); run(); } });
    });
    el.code.querySelectorAll(".slot-chip").forEach((chip) => chip.addEventListener("click", () => {
      const field = el.slotPanel.querySelector(`#slot-${chip.dataset.slot}`);
      if (!field) return;
      field.scrollIntoView({ behavior: "smooth", block: "center" });
      field.focus({ preventScroll: true });
    }));
  }

  function slotOptions(slot, val) {
    return slot.options.map((o) => {
      const v = optValue(o);
      return `<option value="${esc(v)}"${String(v) === String(val) ? " selected" : ""}>${esc(optLabel(o) || "（消す）")}</option>`;
    }).join("");
  }

  function setTab(tab) {
    document.body.classList.toggle("tab-result", tab === "result");
    el.tabCode.classList.toggle("active", tab === "code");
    el.tabResult.classList.toggle("active", tab === "result");
    el.tabCode.setAttribute("aria-selected", String(tab === "code"));
    el.tabResult.setAttribute("aria-selected", String(tab === "result"));
    if (tab === "result") el.resultDot.hidden = true;
    if (isMobile()) window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function renderEnv() {
    const l = lesson(), s = state();
    const show = step === 1 && l.env && l.env.length;
    el.envArea.hidden = !show;
    if (!show) return;
    el.envArea.innerHTML = `<span class="env-title">コードの外の条件</span>` + l.env.map((e) => {
      const opts = e.options.map((o) => `<option value="${esc(optValue(o))}"${String(optValue(o)) === String(s.env[e.name]) ? " selected" : ""}>${esc(optLabel(o))}</option>`).join("");
      return `<label class="env-item">${esc(e.label)}<select id="env-${e.name}" data-env="${e.name}">${opts}</select></label>`;
    }).join("");
    el.envArea.querySelectorAll("select").forEach((sel) => sel.addEventListener("change", () => {
      s.env[sel.dataset.env] = sel.value;
      save();
    }));
  }

  function renderExperiments() {
    const l = lesson(), s = state();
    el.experiments.hidden = step !== 1;
    if (step !== 1) return;
    el.expList.innerHTML = l.experiments.map((x, i) =>
      `<li class="${s.exp[i] ? "done" : ""}"><span class="check">${s.exp[i] ? "✓" : ""}</span><span>${esc(x.text)}</span></li>`
    ).join("");
    el.expCount.textContent = `${s.exp.filter(Boolean).length} / ${l.experiments.length}`;
  }

  // ───────── 言葉にする ─────────
  function renderVerbal() {
    const l = lesson(), s = state();
    const parts = l.verbalize.text.split(/⟦(\d+)⟧/);
    el.verbalText.innerHTML = parts.map((p, i) => {
      if (i % 2 === 0) return esc(p);
      const b = l.verbalize.blanks[Number(p)];
      const saved = (s.verbal || [])[Number(p)] || "";
      const opts = ['<option value="">選ぶ…</option>']
        .concat(b.choices.map((c) => `<option value="${esc(c)}"${c === saved ? " selected" : ""}>${esc(c)}</option>`)).join("");
      return `<select class="vblank" id="vblank-${p}" data-index="${p}" aria-label="空欄${Number(p) + 1}">${opts}</select>`;
    }).join("");
    el.verbalText.querySelectorAll("select").forEach((sel) => sel.addEventListener("change", () => {
      s.verbal = s.verbal || [];
      s.verbal[Number(sel.dataset.index)] = sel.value;
      sel.classList.remove("ok", "ng");
      save();
    }));
    el.noteInput.value = s.note;
    el.verbalResult.textContent = s.unlocked >= 3 ? "正解済み" : "";
    el.verbalResult.className = "verbal-result" + (s.unlocked >= 3 ? " ok" : "");
    el.toExplainBtn.hidden = s.unlocked < 3;
  }

  function checkVerbal() {
    const l = lesson(), s = state();
    let allOk = true;
    el.verbalText.querySelectorAll("select").forEach((sel) => {
      const ok = l.verbalize.blanks[Number(sel.dataset.index)].answers.includes(sel.value);
      sel.classList.toggle("ok", ok);
      sel.classList.toggle("ng", !ok);
      if (!ok) allOk = false;
    });
    if (allOk) {
      el.verbalResult.textContent = "正解！ 解説で答え合わせをしよう";
      el.verbalResult.className = "verbal-result ok";
      unlock(3);
      el.toExplainBtn.hidden = false;
    } else {
      el.verbalResult.textContent = "赤い所を見直そう。迷ったら「壊して試す」に戻って確かめてみよう";
      el.verbalResult.className = "verbal-result ng";
    }
  }

  // ───────── 画面切り替え ─────────
  function unlock(k) {
    const s = state();
    if (s.unlocked < k) {
      s.unlocked = k;
      save();
      renderSteps();
      renderSidebar();
    }
    updateNextButton();
  }

  function updateNextButton() {
    const s = state();
    if (step === 0) {
      el.nextStepBtn.innerHTML = '<span class="full">次へ：壊して試す</span><span class="short">次へ</span> →';
      el.nextStepBtn.hidden = s.unlocked < 1;
    } else if (step === 1) {
      el.nextStepBtn.innerHTML = '<span class="full">次へ：言葉にする</span><span class="short">次へ</span> →';
      el.nextStepBtn.hidden = s.unlocked < 2;
    } else {
      el.nextStepBtn.hidden = true;
    }
  }

  function goStep(k) {
    step = k;
    const l = lesson();
    el.playArea.hidden = step > 1;
    el.verbalArea.hidden = step !== 2;
    el.explainArea.hidden = step !== 3;
    el.resetBtn.hidden = step !== 1;
    el.copyBtn.hidden = l.copyable === false;
    el.runBtn.innerHTML = step === 0 ? '▶ <span class="full">そのまま</span>実行' : '▶ <span class="full">書き換えて</span>実行';
    document.body.classList.toggle("in-play", step <= 1);
    setTab("code");
    if (step <= 1) {
      renderCode();
      renderEnv();
      renderExperiments();
      stopRun();
      clearConsole();
      log(step === 0 ? "▶ 実行 を押すと、Unity で再生したときの動きを再現します。" : "書き換えたら ▶ 実行。何が変わったかを Console と Scene で確かめよう。", "info");
      scene.idle();
    }
    if (step === 2) renderVerbal();
    if (step === 3) el.explainBody.innerHTML = l.explain;
    el.nextLessonBtn.textContent = current < LESSONS.length - 1 ? "次のレッスンへ →" : "最初のレッスンに戻る";
    renderSteps();
    updateNextButton();
  }

  function goLesson(i) {
    current = (i + LESSONS.length) % LESSONS.length;
    store.last = current;
    save();
    const l = lesson(), s = state();
    const course = COURSES.find((c) => c.id === l.course);
    el.courseLabel.textContent = course.title;
    el.lessonTitle.textContent = l.title;
    el.lessonGoal.textContent = l.goal;
    el.fileName.textContent = l.fileName;
    renderSidebar();
    goStep(s.unlocked >= 3 ? 3 : Math.min(s.unlocked, 2));
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  // ───────── Console ─────────
  let timers = [];
  function stopRun() { timers.forEach(clearTimeout); timers = []; scene.stop(); }
  function clearConsole() { el.console.innerHTML = ""; }
  function log(text, type = "info") {
    const row = document.createElement("div");
    row.className = `log log-${type}`;
    const icon = { info: "ℹ", error: "⛔", warn: "⚠", ok: "✔", frame: "·" }[type] || "";
    row.innerHTML = `<span class="log-icon">${icon}</span><span>${esc(text)}</span>`;
    el.console.appendChild(row);
    el.console.scrollTop = el.console.scrollHeight;
    if (isMobile() && !document.body.classList.contains("tab-result") && type !== "info") el.resultDot.hidden = false;
  }

  // ───────── 実行 ─────────
  function run() {
    const l = lesson(), s = state();
    stopRun();
    clearConsole();
    const raw = step === 0 ? defaults(l.slots) : s.values;
    const env = step === 0 ? envDefaults(l) : s.env;

    // number スロットを数値に変換。読めなければコンパイルエラー
    const values = {}, errors = [];
    Object.entries(l.slots).forEach(([name, slot]) => {
      if (slot.type === "number") {
        const n = Number(String(raw[name]).trim());
        if (String(raw[name]).trim() === "" || !Number.isFinite(n)) errors.push(`${l.fileName}: error CS1525: 「${raw[name]}」は数値として読めません`);
        values[name] = n;
      } else {
        values[name] = raw[name];
      }
    });

    if (isMobile()) setTab("result");
    else el.resultDot.hidden = true;
    log("Compiling...", "info");
    const result = errors.length ? { errors } : l.simulate(values, env, G);
    if (result.errors) {
      timers.push(setTimeout(() => {
        result.errors.forEach((e) => log(e, "error"));
        log("エラーがあると再生できない。直してからもう一度実行しよう", "warn");
        scene.error();
        if (step === 1) checkExperiments(values, env);
      }, 200));
      return;
    }

    log("Compile succeeded. ▶ Play", "ok");
    if (step === 1) checkExperiments(values, env);
    scene.play(result);
    result.logs.forEach(([t, text, type]) => timers.push(setTimeout(() => log(text, type || "info"), 150 + t * 1000)));

    if (step === 0) timers.push(setTimeout(() => unlock(1), 600));
  }

  // 壊して試すお題の達成判定（コンパイルエラーになる壊し方も「試した」に数える）
  function checkExperiments(values, env) {
    const l = lesson(), s = state();
    let newly = 0;
    l.experiments.forEach((x, i) => {
      if (!s.exp[i] && x.done(values, env)) { s.exp[i] = true; newly++; }
    });
    if (newly) {
      save();
      renderExperiments();
      log(`お題を ${newly} 個クリア。何が変わったか、言葉にできそう？`, "ok");
    }
    if (s.exp.filter(Boolean).length >= 1) unlock(2);
  }

  async function copyText(text, btn) {
    const orig = btn.innerHTML;
    try {
      await navigator.clipboard.writeText(text);
      btn.textContent = "コピーしました";
    } catch {
      btn.textContent = "コピーできませんでした";
    }
    setTimeout(() => { btn.innerHTML = orig; }, 1500);
  }

  // ───────── Scene 描画ヘルパー（lessons.js の simulate から使う） ─────────
  // 横から見たゲーム画面。1ユニット = U px、y = 0 が地面。G.camera(x) で画面をスクロールできる
  const canvas = el.scene;
  const ctx = canvas.getContext("2d");
  const W = canvas.width, H = canvas.height, U = 36, GROUND = H - 34;
  const cssVar = (name) => getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  let camX = 0;
  const sx = (x) => W / 2 + (x - camX) * U;
  const sy = (y) => GROUND - y * U;
  const font = (size, weight = "") => `${weight} ${size}px system-ui, -apple-system, "Hiragino Sans", "Noto Sans JP", sans-serif`;
  const mono = (size) => `${size}px ui-monospace, Consolas, monospace`;
  function text(str, x, y, { size = 12, weight = "", color = cssVar("--scene-text"), align = "start", m = false } = {}) {
    ctx.fillStyle = color;
    ctx.font = m ? mono(size) : font(size, weight);
    ctx.textAlign = align;
    ctx.fillText(str, x, y);
    ctx.textAlign = "start";
  }
  function box(x, y, w, h, fill) {
    ctx.fillStyle = fill;
    ctx.fillRect(x, y, w, h);
  }

  const G = {
    css: cssVar,
    fmt(n, d = 2) {
      if (!Number.isFinite(n)) return String(n);
      if (Math.abs(n) >= 10000) return n.toExponential(1);
      return (Object.is(n, -0) ? 0 : n).toFixed(d);
    },
    wrapX: (x) => (((x + 6.5) % 13) + 13) % 13 - 6.5,
    camera(x) { camX = x; },
    begin() { camX = 0; },
    bg() {
      box(0, 0, W, H, cssVar("--scene-bg"));
      ctx.strokeStyle = cssVar("--scene-grid");
      ctx.lineWidth = 1;
      const off = ((W / 2 - camX * U) % U + U) % U;
      for (let x = off; x <= W; x += U) { ctx.beginPath(); ctx.moveTo(x + 0.5, 0); ctx.lineTo(x + 0.5, GROUND); ctx.stroke(); }
      for (let y = GROUND; y >= 0; y -= U) { ctx.beginPath(); ctx.moveTo(0, y + 0.5); ctx.lineTo(W, y + 0.5); ctx.stroke(); }
      box(0, GROUND, W, H - GROUND, cssVar("--ground"));
      // 地面の目盛り（スクロールしていることが分かるように）
      const first = Math.ceil((camX - 8) / 2) * 2;
      for (let wx = first; wx <= camX + 8; wx += 2) {
        box(sx(wx) - 1, GROUND, 2, 6, cssVar("--ground-mark"));
      }
    },
    cube(x, y, o = {}) {
      const size = (o.size || 1) * U;
      ctx.save();
      ctx.translate(sx(x), sy(y) - size / 2);
      ctx.globalAlpha = o.alpha ?? 1;
      ctx.fillStyle = o.color || cssVar("--cube");
      ctx.fillRect(-size / 2, -size / 2, size, size);
      ctx.lineWidth = 1.5;
      ctx.strokeStyle = cssVar("--cube-edge");
      ctx.strokeRect(-size / 2, -size / 2, size, size);
      ctx.restore();
    },
    player(x, y, o = {}) {
      if (o.visible === false) { G.ghost(x, y); return; }
      G.cube(x, y, { color: o.color || cssVar("--player") });
      const dir = o.dir || 1;
      box(sx(x) + dir * 5 - 3, sy(y) - U + 10, 5, 7, "#1b1f24");
      box(sx(x) + dir * 12 - 3, sy(y) - U + 10, 5, 7, "#1b1f24");
    },
    enemy(x, y, o = {}) {
      G.cube(x, y, { color: cssVar("--enemy"), size: o.size || 0.9 });
      const s = (o.size || 0.9) * U;
      box(sx(x) - 9, sy(y) - s + 9, 6, 4, "#1b1f24");
      box(sx(x) + 3, sy(y) - s + 9, 6, 4, "#1b1f24");
    },
    coin(x, y, o = {}) {
      ctx.save();
      ctx.globalAlpha = o.alpha ?? 1;
      ctx.fillStyle = cssVar("--coin");
      ctx.beginPath();
      ctx.ellipse(sx(x), sy(y) - U / 2, 9, 12, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = cssVar("--coin-edge");
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.restore();
    },
    // ステージの外（何もない空間）を暗く塗る
    voidOutside(left, right) {
      const l = sx(left), r = sx(right);
      if (l > 0) box(0, 0, l, H, cssVar("--void"));
      if (r < W) box(r, 0, W - r, H, cssVar("--void"));
    },
    // Game ビューのガイドのように、画面中央の Dead Zone を破線で示す
    deadZone(width) {
      const w = width * U;
      ctx.save();
      ctx.setLineDash([5, 4]);
      ctx.strokeStyle = cssVar("--accent");
      ctx.lineWidth = 1.5;
      ctx.strokeRect(W / 2 - w / 2 + 0.5, 30.5, Math.max(1, w), GROUND - 40);
      ctx.restore();
    },
    ghost(x, y) {
      ctx.save();
      ctx.setLineDash([4, 4]);
      ctx.strokeStyle = cssVar("--scene-text");
      ctx.globalAlpha = 0.45;
      ctx.strokeRect(sx(x) - U / 2, sy(y) - U, U, U);
      ctx.restore();
    },
    keys(list) {
      // list: [[名前, 押しているか], ...] を右上に並べる
      let x = W - 10;
      [...list].reverse().forEach(([name, on]) => {
        const w = Math.max(30, name.length * 8 + 16), h = 24;
        x -= w;
        const y = 10 + (on ? 2 : 0);
        box(x, y, w, h, on ? cssVar("--accent") : cssVar("--key-bg"));
        ctx.strokeStyle = cssVar("--scene-text");
        ctx.globalAlpha = 0.4;
        ctx.strokeRect(x + 0.5, y + 0.5, w, h);
        ctx.globalAlpha = 1;
        text(name, x + w / 2, y + 16, { size: 12, color: on ? "#fff" : cssVar("--scene-text"), align: "center", m: true });
        x -= 6;
      });
    },
    label(str) { text(str, 10, H - 10, { size: 12, color: cssVar("--ground-text"), m: true }); },
    caption(str) { text(str, W - 10, H - 10, { size: 11, color: cssVar("--ground-text"), align: "end" }); },
    ui(str) { text(str, 12, 28, { size: 17, weight: "bold" }); },
    hearts(n, max) {
      for (let i = 0; i < max; i++) text(i < n ? "♥" : "♡", 12 + i * 20, 52, { size: 18, color: cssVar("--enemy") });
    },
    bigText(str, sub) {
      text(str, W / 2, 92, { size: 40, weight: "bold", align: "center" });
      if (sub) text(sub, W / 2, 118, { size: 13, align: "center" });
    },
    panel(title, lines = [], o = {}) {
      const w = o.w || 260, h = 54 + lines.length * 20, x = (W - w) / 2, y = Math.max(8, (GROUND - h) / 2);
      box(0, 0, W, H, "rgba(0,0,0,.35)");
      box(x, y, w, h, cssVar("--panel-bg"));
      text(title, W / 2, y + 30, { size: 18, weight: "bold", align: "center", color: o.color || cssVar("--scene-text") });
      lines.forEach((l, i) => text(l, W / 2, y + 54 + i * 20, { size: 13, align: "center" }));
    },
    progress(ratio, label) {
      const w = 260, x = (W - w) / 2, y = 120;
      box(x, y, w, 14, cssVar("--key-bg"));
      box(x, y, w * Math.max(0, Math.min(1, ratio)), 14, cssVar("--accent"));
      if (label) text(label, W / 2, y - 10, { size: 13, align: "center" });
    },
    spinner(t, x = W / 2, y = 120) {
      ctx.save();
      ctx.strokeStyle = cssVar("--accent");
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.arc(x, y, 14, t * 6, t * 6 + Math.PI * 1.4);
      ctx.stroke();
      ctx.restore();
    },
    overlay(title, sub) {
      box(0, 0, W, H, "rgba(40,40,40,.75)");
      text(title, W / 2, H / 2 - 6, { size: 22, weight: "bold", color: "#fff", align: "center" });
      text(sub, W / 2, H / 2 + 20, { size: 12, color: "#fff", align: "center" });
    },
  };

  const scene = (() => {
    let raf = 0;
    const reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    return {
      stop() { cancelAnimationFrame(raf); },
      idle() { this.stop(); G.begin(); G.bg(); G.player(0, 0); },
      error() { this.stop(); G.begin(); G.bg(); G.player(0, 0, { color: cssVar("--error") }); G.label("コンパイルエラー：再生できません"); },
      play(result) {
        this.stop();
        if (reduce) { G.begin(); result.draw(result.duration); return; }
        const start = performance.now();
        const frame = (now) => {
          const t = Math.min(result.duration, (now - start) / 1000);
          G.begin();
          result.draw(t);
          if (t < result.duration) raf = requestAnimationFrame(frame);
        };
        raf = requestAnimationFrame(frame);
      },
    };
  })();

  // ───────── イベント ─────────
  el.runBtn.addEventListener("click", run);
  el.copyBtn.addEventListener("click", () => copyText(codeWith(step === 0 ? defaults(lesson().slots) : state().values), el.copyBtn));
  el.resetBtn.addEventListener("click", () => {
    const s = state();
    s.values = defaults(lesson().slots);
    s.env = envDefaults(lesson());
    save();
    goStep(1);
  });
  el.nextStepBtn.addEventListener("click", () => goStep(step + 1));
  el.verbalCheckBtn.addEventListener("click", checkVerbal);
  el.noteInput.addEventListener("input", () => { state().note = el.noteInput.value; save(); });
  el.noteCopyBtn.addEventListener("click", () => copyText(`【${lesson().title}】\n${el.noteInput.value}`, el.noteCopyBtn));
  el.toExplainBtn.addEventListener("click", () => goStep(3));
  el.nextLessonBtn.addEventListener("click", () => goLesson(current + 1));
  el.tabCode.addEventListener("click", () => setTab("code"));
  el.tabResult.addEventListener("click", () => setTab("result"));
  mq.addEventListener("change", () => { if (step <= 1) renderCode(); });
  el.menuToggle.addEventListener("click", () => document.body.classList.toggle("menu-open"));
  document.addEventListener("keydown", (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key === "Enter" && step <= 1) { e.preventDefault(); run(); }
  });

  goLesson(current);
})();
