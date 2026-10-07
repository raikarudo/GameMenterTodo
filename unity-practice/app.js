(() => {
  "use strict";

  const COURSES = window.COURSES;
  const LESSONS = window.LESSONS;
  const STORAGE_KEY = "unity-practice-v2";
  const SLOT_RE = /⟦(\w+)⟧/g;

  const STEPS = [
    { label: "動かす", guide: "まずはコードをコピーして動かしてみよう。意味はまだわからなくて大丈夫。Unity なら C# スクリプトを作って貼り付け、キューブにアタッチして再生する。ここでは ▶ 実行 で同じ動きを確認できる。" },
    { label: "壊して試す", guide: "色の付いた部分を書き換えて、わざと壊してみよう。実行する前に「どうなるか」を予想してから押すのがコツ。" },
    { label: "言葉にする", guide: "動かして壊してみた結果から、このコードが何をしていたのかを日本語で説明してみよう。" },
    { label: "解説", guide: "最後に、なぜそう動いたのかを確認しよう。さっき自分で説明した内容と比べてみよう。" },
  ];

  const $ = (id) => document.getElementById(id);
  const el = Object.fromEntries([
    "sidebar", "menuToggle", "progressText", "progressBar", "courseLabel", "lessonTitle", "lessonGoal",
    "steps", "stepGuide", "playArea", "envArea", "fileName", "code", "runBtn", "copyBtn", "resetBtn",
    "nextStepBtn", "experiments", "expCount", "expList", "console", "scene", "verbalArea", "verbalText",
    "verbalCheckBtn", "verbalResult", "noteInput", "noteCopyBtn", "toExplainBtn", "explainArea",
    "explainBody", "nextLessonBtn",
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
  const TYPES = "MonoBehaviour|GameObject|Transform|Vector3|Quaternion|Rigidbody|Collision|Collider|Debug|Time|Input|KeyCode|IEnumerator|WaitForSeconds|Coroutine|Renderer|Awaitable|SerializeField|PlayerMove|GameManager";
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
      btn.innerHTML = `<span class="step-no">${k + 1}</span>${st.label}`;
      btn.title = locked ? "前のステップを終えると開きます" : "";
      btn.addEventListener("click", () => goStep(k));
      li.appendChild(btn);
      el.steps.appendChild(li);
    });
    el.stepGuide.textContent = STEPS[step].guide;
  }

  // ───────── コード表示 ─────────
  function renderCode() {
    const l = lesson(), s = state();
    const editable = step === 1;
    const parts = l.code.split(SLOT_RE);
    let html = "";
    parts.forEach((part, i) => {
      if (i % 2 === 0) { html += highlight(part); return; }
      const slot = l.slots[part];
      if (!editable) {
        html += `<span class="slot-static">${highlight(String(slot.default))}</span>`;
        return;
      }
      const val = s.values[part];
      if (slot.type === "number") {
        html += `<input class="slot" id="slot-${part}" data-slot="${part}" value="${esc(val)}" inputmode="decimal" autocomplete="off" spellcheck="false" style="width:${Math.max(3, String(val).length + 1)}ch" aria-label="${part} の値">`;
      } else {
        const opts = slot.options.map((o) => {
          const v = optValue(o);
          return `<option value="${esc(v)}"${String(v) === String(val) ? " selected" : ""}>${esc(optLabel(o) || "（消す）")}</option>`;
        }).join("");
        html += `<select class="slot" id="slot-${part}" data-slot="${part}" aria-label="${part} を選ぶ">${opts}</select>`;
      }
    });
    el.code.innerHTML = html;

    el.code.querySelectorAll(".slot").forEach((input) => {
      const name = input.dataset.slot;
      const changed = () => input.classList.toggle("changed", String(input.value) !== String(l.slots[name].default));
      changed();
      input.addEventListener(input.tagName === "SELECT" ? "change" : "input", () => {
        s.values[name] = input.value;
        if (input.tagName === "INPUT") input.style.width = `${Math.max(3, input.value.length + 1)}ch`;
        changed();
        save();
      });
      if (input.tagName === "INPUT") input.addEventListener("keydown", (e) => { if (e.key === "Enter") { e.preventDefault(); run(); } });
    });
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
      el.nextStepBtn.textContent = "次へ：壊して試す →";
      el.nextStepBtn.hidden = s.unlocked < 1;
    } else if (step === 1) {
      el.nextStepBtn.textContent = "次へ：言葉にする →";
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
    el.runBtn.textContent = step === 0 ? "▶ そのまま実行" : "▶ 書き換えて実行";
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

    log("Compiling...", "info");
    const result = errors.length ? { errors } : l.simulate(values, env, G);
    if (step === 1) checkExperiments(values, env);
    if (result.errors) {
      timers.push(setTimeout(() => {
        result.errors.forEach((e) => log(e, "error"));
        log("エラーがあると再生できない。直してからもう一度実行しよう", "warn");
        scene.error();
      }, 200));
      return;
    }

    log("Compile succeeded. ▶ Play", "ok");
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
    const orig = btn.textContent;
    try {
      await navigator.clipboard.writeText(text);
      btn.textContent = "コピーしました";
    } catch {
      btn.textContent = "コピーできませんでした（手動で選択してください）";
    }
    setTimeout(() => { btn.textContent = orig; }, 1500);
  }

  // ───────── Scene 描画ヘルパー（lessons.js の simulate から使う） ─────────
  const canvas = el.scene;
  const ctx = canvas.getContext("2d");
  const W = canvas.width, H = canvas.height, U = 36, GROUND = H - 36;
  const cssVar = (name) => getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  const sx = (x) => W / 2 + x * U;
  const sy = (y) => GROUND - y * U;

  const G = {
    css: cssVar,
    fmt(n, d = 2) {
      if (!Number.isFinite(n)) return String(n);
      if (Math.abs(n) >= 10000) return n.toExponential(1);
      return (Object.is(n, -0) ? 0 : n).toFixed(d);
    },
    wrapX: (x) => (((x + 6.5) % 13) + 13) % 13 - 6.5,
    wrapY: (y) => ((y % 4.5) + 4.5) % 4.5,
    bg() {
      ctx.fillStyle = cssVar("--scene-bg");
      ctx.fillRect(0, 0, W, H);
      ctx.strokeStyle = cssVar("--scene-grid");
      ctx.lineWidth = 1;
      for (let x = W / 2 % U; x <= W; x += U) { ctx.beginPath(); ctx.moveTo(x + 0.5, 0); ctx.lineTo(x + 0.5, GROUND); ctx.stroke(); }
      for (let y = GROUND; y >= 0; y -= U) { ctx.beginPath(); ctx.moveTo(0, y + 0.5); ctx.lineTo(W, y + 0.5); ctx.stroke(); }
      ctx.fillStyle = cssVar("--ground");
      ctx.fillRect(0, GROUND, W, H - GROUND);
    },
    cube(x, y, o = {}) {
      const size = (o.size || 1) * U;
      ctx.save();
      ctx.translate(sx(x), sy(y) - size / 2);
      ctx.rotate(o.angle || 0);
      ctx.scale(o.scaleX || 1, o.scaleY || 1);
      ctx.fillStyle = o.color || cssVar("--cube");
      ctx.fillRect(-size / 2, -size / 2, size, size);
      if (o.shade) { ctx.fillStyle = "rgba(0,0,0,.25)"; ctx.fillRect(-size / 2, -size / 2, size, size); }
      ctx.lineWidth = 1.5;
      ctx.strokeStyle = cssVar("--cube-edge");
      ctx.strokeRect(-size / 2, -size / 2, size, size);
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
    bullet(x, y) {
      ctx.fillStyle = cssVar("--coin");
      ctx.fillRect(sx(x) - 7, sy(y) - 3, 14, 6);
    },
    key(name, pressed) {
      const w = 70, h = 26, x = W - w - 10, y = 10;
      ctx.fillStyle = pressed ? cssVar("--accent") : cssVar("--key-bg");
      ctx.fillRect(x, y + (pressed ? 2 : 0), w, h);
      ctx.strokeStyle = cssVar("--scene-text");
      ctx.globalAlpha = 0.5;
      ctx.strokeRect(x + 0.5, y + 0.5 + (pressed ? 2 : 0), w, h);
      ctx.globalAlpha = 1;
      ctx.fillStyle = pressed ? "#fff" : cssVar("--scene-text");
      ctx.font = "12px ui-monospace, Consolas, monospace";
      ctx.textAlign = "center";
      ctx.fillText(name, x + w / 2, y + 17 + (pressed ? 2 : 0));
      ctx.textAlign = "start";
    },
    label(text) {
      ctx.fillStyle = cssVar("--scene-text");
      ctx.font = "13px ui-monospace, Consolas, monospace";
      ctx.fillText(text, 10, 22);
    },
    caption(text) {
      ctx.fillStyle = cssVar("--scene-text");
      ctx.font = "12px system-ui, sans-serif";
      ctx.textAlign = "end";
      ctx.fillText(text, W - 10, 22);
      ctx.textAlign = "start";
    },
    bigText(text) {
      ctx.fillStyle = cssVar("--scene-text");
      ctx.font = "bold 44px system-ui, sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(text, W / 2, 96);
      ctx.textAlign = "start";
    },
    inspector(title, rows) {
      const w = 170, x = W - w - 10, y = 10, h = 26 + Math.max(1, rows.length) * 22;
      ctx.fillStyle = cssVar("--inspector-bg");
      ctx.fillRect(x, y, w, h);
      ctx.fillStyle = cssVar("--scene-text");
      ctx.font = "bold 11px system-ui, sans-serif";
      ctx.fillText("Inspector  " + title, x + 8, y + 17);
      ctx.font = "12px system-ui, sans-serif";
      if (!rows.length) {
        ctx.globalAlpha = 0.6;
        ctx.fillText("（表示される項目なし）", x + 8, y + 40);
        ctx.globalAlpha = 1;
      }
      rows.forEach(([k, v], i) => {
        ctx.fillText(k, x + 8, y + 40 + i * 22);
        ctx.strokeStyle = cssVar("--scene-text");
        ctx.globalAlpha = 0.5;
        ctx.strokeRect(x + 80.5, y + 27.5 + i * 22, 80, 18);
        ctx.globalAlpha = 1;
        ctx.fillText(v, x + 86, y + 41 + i * 22);
      });
    },
    overlay(title, sub) {
      ctx.fillStyle = "rgba(40,40,40,.72)";
      ctx.fillRect(0, 0, W, H);
      ctx.fillStyle = "#fff";
      ctx.textAlign = "center";
      ctx.font = "bold 22px system-ui, sans-serif";
      ctx.fillText(title, W / 2, H / 2 - 6);
      ctx.font = "12px system-ui, sans-serif";
      ctx.fillText(sub, W / 2, H / 2 + 20);
      ctx.textAlign = "start";
    },
  };

  const scene = (() => {
    let raf = 0;
    const reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    return {
      stop() { cancelAnimationFrame(raf); },
      idle() { this.stop(); G.bg(); G.cube(0, 0); },
      error() { this.stop(); G.bg(); G.cube(0, 0, { color: cssVar("--error") }); G.label("コンパイルエラー：再生できません"); },
      play(result) {
        this.stop();
        if (reduce) { result.draw(result.duration); return; }
        const start = performance.now();
        const frame = (now) => {
          const t = Math.min(result.duration, (now - start) / 1000);
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
  el.menuToggle.addEventListener("click", () => document.body.classList.toggle("menu-open"));
  document.addEventListener("keydown", (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key === "Enter" && step <= 1) { e.preventDefault(); run(); }
  });

  goLesson(current);
})();
