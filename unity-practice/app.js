(() => {
  "use strict";

  const CHAPTERS = window.CHAPTERS;
  const PROBLEMS = window.PROBLEMS;
  const STORAGE_KEY = "unity-practice-progress-v1";
  const BLANK_RE = /⟦(\d+)⟧/g;

  const $ = (id) => document.getElementById(id);
  const el = {
    sidebar: $("sidebar"), menuToggle: $("menuToggle"),
    progressText: $("progressText"), progressBar: $("progressBar"),
    chapterLabel: $("chapterLabel"), title: $("problemTitle"), goal: $("problemGoal"),
    lesson: $("problemLesson"), fileName: $("fileName"), code: $("code"),
    console: $("console"), scene: $("scene"),
    explain: $("explain"), explainBody: $("explainBody"),
    runBtn: $("runBtn"), hintBtn: $("hintBtn"), answerBtn: $("answerBtn"),
    resetBtn: $("resetBtn"), prevBtn: $("prevBtn"), nextBtn: $("nextBtn"),
  };

  // ───────── 進捗の保存（失敗しても動くように try/catch） ─────────
  function loadProgress() {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY)) || {}; } catch { return {}; }
  }
  function saveProgress() {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(progress)); } catch { /* 保存できなくても続行 */ }
  }
  const progress = loadProgress(); // { solved: {id: true}, last: index }
  progress.solved = progress.solved || {};

  let current = Math.min(progress.last || 0, PROBLEMS.length - 1);
  let hintStep = 0;
  let revealed = false; // 「答えを見る」を使った問題は ✓ を付けない

  // ───────── C# の簡易シンタックスハイライト ─────────
  const KEYWORDS = "using|public|private|protected|class|void|return|if|else|for|foreach|while|new|this|true|false|null|static|in";
  const TYPES = "int|float|double|string|bool|var|MonoBehaviour|GameObject|Transform|Vector3|Quaternion|Rigidbody|Rigidbody2D|Collision|Collider|Debug|Time|Input|KeyCode|ForceMode|List|Enemy|SerializeField";
  const TOKEN_RE = new RegExp(
    `(\\/\\/.*$|\\/\\*.*?\\*\\/)|("(?:[^"\\\\]|\\\\.)*")|\\b(${KEYWORDS})\\b|\\b(${TYPES})\\b|\\b(\\d+(?:\\.\\d+)?f?)\\b`,
    "gm"
  );
  const escapeHtml = (s) => s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

  function highlight(src) {
    let out = "", last = 0;
    src.replace(TOKEN_RE, (m, comment, str, kw, type, num, offset) => {
      out += escapeHtml(src.slice(last, offset));
      const cls = comment ? "c-comment" : str ? "c-string" : kw ? "c-kw" : type ? "c-type" : "c-num";
      out += `<span class="${cls}">${escapeHtml(m)}</span>`;
      last = offset + m.length;
      return m;
    });
    return out + escapeHtml(src.slice(last));
  }

  // ───────── 判定 ─────────
  const normalize = (s) => (s || "").replace(/\s+/g, "");
  const isCorrect = (blank, value) => blank.answers.some((a) => normalize(a) === normalize(value));

  function mistakeMessage(blank, value, index) {
    const m = blank.mistakes || {};
    const key = Object.keys(m).find((k) => normalize(k) === normalize(value));
    if (key !== undefined) return m[key];
    if (!normalize(value)) return `error CS1525: 空欄${index + 1} が未入力です`;
    return `error: 空欄${index + 1} の「${value}」では意図どおりに動きません`;
  }

  // ───────── 描画 ─────────
  function renderSidebar() {
    el.sidebar.innerHTML = "";
    CHAPTERS.forEach((ch) => {
      const h = document.createElement("h3");
      h.textContent = ch.title;
      el.sidebar.appendChild(h);
      const ul = document.createElement("ul");
      PROBLEMS.forEach((p, i) => {
        if (p.chapter !== ch.id) return;
        const li = document.createElement("li");
        const btn = document.createElement("button");
        btn.className = "nav-item" + (i === current ? " active" : "") + (progress.solved[p.id] ? " solved" : "");
        btn.innerHTML = `<span class="mark">${progress.solved[p.id] ? "✓" : i + 1}</span><span>${escapeHtml(p.title)}</span>`;
        btn.addEventListener("click", () => { go(i); document.body.classList.remove("menu-open"); });
        li.appendChild(btn);
        ul.appendChild(li);
      });
      el.sidebar.appendChild(ul);
    });

    const solvedCount = PROBLEMS.filter((p) => progress.solved[p.id]).length;
    el.progressText.textContent = `${solvedCount} / ${PROBLEMS.length}`;
    el.progressBar.style.width = `${(solvedCount / PROBLEMS.length) * 100}%`;
  }

  function renderCode(p) {
    // ⟦n⟧ で分割し、テキスト部分はハイライト、空欄部分は入力欄にする
    const parts = p.code.split(BLANK_RE);
    let html = "";
    parts.forEach((part, i) => {
      if (i % 2 === 0) { html += highlight(part); return; }
      const n = Number(part);
      const blank = p.blanks[n];
      const width = Math.max(4, ...blank.answers.map((a) => a.length)) + 1;
      if (blank.choices) {
        const opts = ['<option value="">選択…</option>']
          .concat(blank.choices.map((c) => `<option value="${escapeHtml(c)}">${escapeHtml(c)}</option>`))
          .join("");
        html += `<select class="blank" data-index="${n}" aria-label="空欄${n + 1}">${opts}</select>`;
      } else {
        html += `<input class="blank" data-index="${n}" style="width:${width}ch" autocomplete="off" autocapitalize="off" spellcheck="false" aria-label="空欄${n + 1}" placeholder="${n + 1}">`;
      }
    });
    el.code.innerHTML = html;

    el.code.querySelectorAll("input.blank").forEach((input) => {
      input.addEventListener("keydown", (e) => {
        if (e.key === "Enter") { e.preventDefault(); run(); }
      });
      input.addEventListener("input", () => input.classList.remove("ok", "ng"));
    });
    el.code.querySelectorAll("select.blank").forEach((s) => s.addEventListener("change", () => s.classList.remove("ok", "ng")));
  }

  function go(index) {
    current = (index + PROBLEMS.length) % PROBLEMS.length;
    progress.last = current;
    saveProgress();
    hintStep = 0;
    revealed = false;

    const p = PROBLEMS[current];
    const ch = CHAPTERS.find((c) => c.id === p.chapter);
    el.chapterLabel.textContent = `${ch.title} ─ 問題 ${current + 1}`;
    el.title.textContent = p.title;
    el.goal.textContent = p.goal;
    el.lesson.innerHTML = p.lesson;
    const cls = p.code.match(/class\s+(\w+)\s*:\s*MonoBehaviour/);
    el.fileName.textContent = cls ? `${cls[1]}.cs` : "Practice.cs";
    el.explain.hidden = true;
    renderCode(p);
    clearConsole();
    log("info", "▶ 実行 を押すと、コンパイルと再生をシミュレートします。");
    scene.play(p.chapter === "csharp" ? "none" : "idle");
    renderSidebar();
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  // ───────── Console ─────────
  function clearConsole() { el.console.innerHTML = ""; }
  function log(type, text) {
    const row = document.createElement("div");
    row.className = `log log-${type}`;
    const icon = { info: "ℹ", error: "⛔", warn: "⚠", ok: "✔", frame: "" }[type] ?? "";
    row.innerHTML = `<span class="log-icon">${icon}</span><span>${escapeHtml(text)}</span>`;
    el.console.appendChild(row);
    el.console.scrollTop = el.console.scrollHeight;
  }

  // ───────── 実行 ─────────
  function getInputs() { return [...el.code.querySelectorAll(".blank")]; }

  function run() {
    const p = PROBLEMS[current];
    clearConsole();
    log("info", "Compiling...");

    const errors = [];
    getInputs().forEach((input) => {
      const n = Number(input.dataset.index);
      const blank = p.blanks[n];
      const ok = isCorrect(blank, input.value);
      input.classList.toggle("ok", ok);
      input.classList.toggle("ng", !ok);
      if (!ok) errors.push(mistakeMessage(blank, input.value, n));
    });

    if (errors.length) {
      setTimeout(() => {
        errors.forEach((e) => log("error", `${el.fileName.textContent}: ${e}`));
        log("warn", `${errors.length} 箇所を修正してから、もう一度実行してください。`);
        scene.play("error");
      }, 200);
      return;
    }

    // 正解：コンソール出力を少しずつ流して「再生している」感じを出す
    log("ok", "Compile succeeded. ▶ Play");
    scene.play(p.scene);
    p.console.forEach((line, i) => {
      setTimeout(() => log(line.startsWith("--") ? "frame" : "info", line.replace(/^--\s*/, "")), 300 + i * 260);
    });
    setTimeout(() => {
      el.explainBody.innerHTML = p.explain;
      el.explain.hidden = false;
      if (!revealed && !progress.solved[p.id]) {
        progress.solved[p.id] = true;
        saveProgress();
        renderSidebar();
      }
    }, 300 + p.console.length * 260);
  }

  function showHint() {
    const p = PROBLEMS[current];
    // まだ正解していない空欄のヒントから順に出す
    const inputs = getInputs();
    const pending = inputs.filter((i) => !isCorrect(p.blanks[Number(i.dataset.index)], i.value));
    if (!pending.length) { log("ok", "すべての空欄が埋まっています。実行してみましょう。"); return; }
    const target = pending[hintStep % pending.length];
    hintStep++;
    const n = Number(target.dataset.index);
    log("warn", `ヒント（空欄${n + 1}）: ${p.blanks[n].hint}`);
    target.focus();
  }

  function showAnswer() {
    const p = PROBLEMS[current];
    getInputs().forEach((input) => {
      input.value = p.blanks[Number(input.dataset.index)].answers[0];
      input.classList.remove("ok", "ng");
    });
    log("warn", "答えを入力しました。実行して動きを確認しましょう（自力で解くと ✓ が付きます）。");
    revealed = true;
  }

  // ───────── Scene ビュー（2Dキャンバスでの疑似再生） ─────────
  const scene = (() => {
    const canvas = el.scene;
    const ctx = canvas.getContext("2d");
    let raf = 0;
    const css = (name) => getComputedStyle(document.documentElement).getPropertyValue(name).trim();

    function cube(x, y, size, angle = 0, color = css("--cube")) {
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(angle);
      ctx.fillStyle = color;
      ctx.fillRect(-size / 2, -size / 2, size, size);
      ctx.strokeStyle = "rgba(0,0,0,.35)";
      ctx.strokeRect(-size / 2, -size / 2, size, size);
      ctx.restore();
    }

    function background() {
      const w = canvas.width, h = canvas.height;
      ctx.fillStyle = css("--scene-bg");
      ctx.fillRect(0, 0, w, h);
      ctx.strokeStyle = css("--scene-grid");
      ctx.lineWidth = 1;
      for (let x = 0; x <= w; x += 30) { ctx.beginPath(); ctx.moveTo(x + 0.5, 0); ctx.lineTo(x + 0.5, h); ctx.stroke(); }
      for (let y = 0; y <= h; y += 30) { ctx.beginPath(); ctx.moveTo(0, y + 0.5); ctx.lineTo(w, y + 0.5); ctx.stroke(); }
      ctx.fillStyle = css("--ground");
      ctx.fillRect(0, h - 40, w, 40);
    }

    function label(text) {
      ctx.fillStyle = css("--scene-text");
      ctx.font = "13px system-ui, sans-serif";
      ctx.fillText(text, 10, 20);
    }

    const GROUND = () => canvas.height - 40 - 20;

    // 動きの定義: t は再生開始からの秒数。true を返すと停止
    const SCENES = {
      none(t) { background(); label("C#の基礎: Scene は使いません"); return true; },
      idle(t) { background(); cube(240, GROUND(), 40); label("Player"); return true; },
      error(t) {
        background(); cube(240, GROUND(), 40, 0, css("--error"));
        label("コンパイルエラー: 再生できません"); return true;
      },
      move(t) {
        background();
        const x = 40 + ((t * 80) % 420);
        cube(x, GROUND(), 40);
        label(`position.x = ${(t * 2).toFixed(2)}`);
        return t > 6;
      },
      rotate(t) {
        background();
        // Y軸回転を2Dで表現：幅を cos で変化させる
        const angle = (t * 90) % 360;
        const w = Math.max(4, Math.abs(Math.cos((angle * Math.PI) / 180)) * 40);
        ctx.fillStyle = css("--cube");
        ctx.fillRect(240 - w / 2, GROUND() - 20, w, 40);
        label(`rotation.y = ${angle.toFixed(0)}°`);
        return t > 8;
      },
      jump(t) {
        background();
        const cycle = t % 1.6;
        const y = cycle < 1 ? GROUND() - Math.sin(cycle * Math.PI) * 100 : GROUND();
        cube(240, y, 40);
        label(cycle < 1 ? "ジャンプ！" : "着地");
        return t > 4.8;
      },
      collide(t) {
        background();
        const px = Math.min(40 + t * 120, 200);
        const hit = px >= 200;
        cube(px, GROUND(), 40, 0, hit && Math.floor(t * 8) % 2 ? css("--error") : css("--cube"));
        cube(260, GROUND(), 40, 0, css("--enemy"));
        label(hit ? "ダメージ！" : "Player → Enemy");
        return t > 3.5;
      },
      coin(t) {
        background();
        const px = 40 + t * 120;
        cube(Math.min(px, 440), GROUND(), 40);
        if (px < 240) {
          ctx.fillStyle = css("--coin");
          ctx.beginPath(); ctx.arc(260, GROUND(), 14, 0, Math.PI * 2); ctx.fill();
        }
        label(px < 240 ? "Coin に向かって移動" : "スコア:1（Coin を Destroy）");
        return t > 3.5;
      },
      spawn(t) {
        background();
        cube(60, GROUND(), 40);
        const shots = Math.min(3, Math.floor(t / 0.8) + 1);
        for (let i = 0; i < shots; i++) {
          const bx = 90 + (t - i * 0.8) * 160;
          if (bx < 480) { ctx.fillStyle = css("--coin"); ctx.fillRect(bx, GROUND() - 4, 16, 8); }
        }
        label(`Bullet(Clone) × ${shots}`);
        return t > 4.5;
      },
      bullet(t) {
        background();
        cube(60, GROUND(), 40);
        if (t < 3) {
          ctx.fillStyle = css("--coin");
          ctx.fillRect(90 + t * 110, GROUND() - 4, 16, 8);
        }
        label(t < 3 ? `経過 ${t.toFixed(1)} 秒` : "3秒経過 → Destroy");
        return t > 3.6;
      },
    };

    function play(kind) {
      cancelAnimationFrame(raf);
      const fn = SCENES[kind] || SCENES.idle;
      const start = performance.now();
      const step = (now) => {
        const done = fn((now - start) / 1000);
        if (!done) raf = requestAnimationFrame(step);
      };
      raf = requestAnimationFrame(step);
    }

    return { play };
  })();

  // ───────── イベント ─────────
  el.runBtn.addEventListener("click", run);
  el.hintBtn.addEventListener("click", showHint);
  el.answerBtn.addEventListener("click", showAnswer);
  el.resetBtn.addEventListener("click", () => go(current));
  el.prevBtn.addEventListener("click", () => go(current - 1));
  el.nextBtn.addEventListener("click", () => go(current + 1));
  el.menuToggle.addEventListener("click", () => document.body.classList.toggle("menu-open"));
  document.addEventListener("keydown", (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key === "Enter") { e.preventDefault(); run(); }
  });

  go(current);
})();
