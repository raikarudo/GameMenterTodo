// レッスンデータ
//
// 1レッスン = 体験（コピペして動かす）→ 壊して試す（スクラップ＆ビルド）→ 言葉にする → 解説（原理）
// 題材はコース1を通して「横スクロールのコイン集めアクション」を1本作る流れにそろえている。
// 壊す対象には、コードだけでなく Inspector の設定漏れなど、初学者が実際につまずくものを入れる。
//
// code     : ⟦name⟧ が書き換え可能な場所（slots[name]）
// slots    : { label, type: "choice", options: [...], default } / { label, type: "number", default }
//            choice の option は文字列か { value, label }。value "" は「消す」
// env      : コードの外の条件（Inspector の設定、通信状態など）。壊して試すステップで変えられる
// simulate : (v, env, G) => { duration, draw(t), logs: [[秒, 文字列, 種類?]], errors? }
//            v は slots の現在値（number は数値に変換済み）、G は app.js の描画ヘルパー
//            errors を返すとコンパイルエラー扱い。実行時エラーは logs に "error" で出す
// experiments : 壊して試すお題。done(v, env) が true の状態で実行すると達成
// verbalize   : 言葉にするステップの日本語穴埋め（⟦n⟧ が blanks[n]）

const FPS = 60;
const REMOVE = (label = "（消す）") => ({ value: "", label });
const opt = (value, label) => ({ value, label });

// 入力の台本: [[開始秒, 終了秒, キー名], ...]
const held = (script, key, t) => script.some(([a, b, k]) => k === key && t >= a && t < b);
const down = (script, key, t, dt) => held(script, key, t) && !held(script, key, t - dt);
// 毎フレーム出るエラーは Console の Collapse 表示のように回数をまとめる
const repeated = (t, msg, n) => [t, n > 1 ? `${msg}  （×${n}）` : msg, "error"];

window.COURSES = [
  { id: "basic", title: "コース1　ゲームを1本作る", desc: "横スクロールのコイン集めアクションを、動かして・壊して・言葉にしながら作る" },
  { id: "async", title: "コース2　「待つ」処理", desc: "1人でゲームを完成させた人向け。演出・ロード・通信など、時間のかかる処理の書き方" },
];

window.LESSONS = [
  // ───────────────────────── コース1 ─────────────────────────
  {
    id: "move",
    course: "basic",
    title: "左右キーで動かす",
    goal: "← → キーでプレイヤーが左右に動く",
    fileName: "PlayerMove.cs",
    code: `using UnityEngine;

public class PlayerMove : MonoBehaviour
{
    [SerializeField] float speed = 5f;

    void Update()
    {
        float h = Input.⟦get⟧("⟦axis⟧");
        this.transform.position += new Vector3(h, 0, 0) * speed⟦dt⟧;
    }
}`,
    slots: {
      get: { label: "入力の読み方", type: "choice", options: ["GetAxis", "GetAxisRaw"], default: "GetAxis" },
      axis: { label: "入力軸の名前", type: "choice", options: ["Horizontal", "Vertical", "Horizonta"], default: "Horizontal" },
      dt: { label: "Time.deltaTime", type: "choice", options: [" * Time.deltaTime", REMOVE()], default: " * Time.deltaTime" },
    },
    env: [
      { name: "fps", label: "PCの性能", options: [opt(30, "遅いPC 30fps"), opt(60, "普通 60fps"), opt(144, "速いPC 144fps")], default: 60 },
      { name: "input", label: "Player Settings の Active Input Handling", options: [opt("both", "Both"), opt("new", "Input System Package (New)")], default: "both" },
    ],
    simulate(v, env, G) {
      const fps = Number(env.fps), dt = 1 / fps, dur = 4.5;
      const keys = [[0.3, 1.8, "→"], [2.4, 3.4, "←"]];
      const logs = [];
      let error = null;
      if (env.input === "new") error = "InvalidOperationException: You are trying to read Input using the UnityEngine.Input class, but you have switched active Input handling to Input System package in Player Settings.";
      else if (v.axis === "Horizonta") error = "ArgumentException: Input Axis Horizonta is not setup.";
      let x = -4, h = 0;
      const xs = [], hs = [];
      for (let f = 0; f <= dur * fps; f++) {
        const t = f * dt;
        const target = v.axis === "Horizontal" ? (held(keys, "→", t) ? 1 : 0) - (held(keys, "←", t) ? 1 : 0) : 0;
        if (v.get === "GetAxisRaw") h = target;
        else if (target !== 0) {
          if (h !== 0 && Math.sign(h) !== target) h = 0; // 逆向きに入れたら 0 から（Snap）
          h = Math.max(-1, Math.min(1, h + target * 3 * dt));
        } else {
          h = Math.abs(h) <= 3 * dt ? 0 : h - Math.sign(h) * 3 * dt;
        }
        if (!error) x += h * 5 * (v.dt ? dt : 1);
        xs.push(x);
        hs.push(error ? 0 : h);
      }
      const at = (t) => Math.min(xs.length - 1, Math.floor(t * fps));
      if (error) logs.push(repeated(0.05, error, Math.round(dur * fps)));
      else {
        logs.push([1.8, `→ を離した瞬間  h = ${G.fmt(hs[at(1.8)])}  x = ${G.fmt(xs[at(1.8)])}`]);
        logs.push([2.1, `離して0.3秒後  h = ${G.fmt(hs[at(2.1)])}  x = ${G.fmt(xs[at(2.1)])}`]);
        logs.push([4.4, `最後  position.x = ${G.fmt(xs[at(4.4)])}`]);
        if (v.axis === "Vertical") logs.push([1, "上下キーは押していないので、h はずっと 0", "warn"]);
      }
      return {
        duration: dur,
        draw(t) {
          const i = at(t);
          G.bg();
          G.player(G.wrapX(xs[i]), 0, { dir: hs[i] < 0 ? -1 : 1 });
          G.keys([["←", held(keys, "←", t)], ["→", held(keys, "→", t)]]);
          G.label(`h = ${G.fmt(hs[i])}   x = ${G.fmt(xs[i])}`);
          G.caption(`${fps}fps`);
        },
        logs,
      };
    },
    experiments: [
      { text: "GetAxisRaw に変えて、キーを離した瞬間の動きを比べよう", done: (v) => v.get === "GetAxisRaw" },
      { text: "* Time.deltaTime を消して、PCの性能も変えてみよう", done: (v, e) => v.dt === "" && Number(e.fps) !== 60 },
      { text: "入力軸の名前を1文字まちがえて \"Horizonta\" にしたら？", done: (v) => v.axis === "Horizonta" },
      { text: "Active Input Handling を New にしてみよう（Unity 6 の新規プロジェクトでよく起きる）", done: (v, e) => e.input === "new" },
    ],
    verbalize: {
      text: "Input.GetAxis(\"Horizontal\") は、左右キーの入力を ⟦0⟧ で返す。それに speed と Time.deltaTime を掛けて ⟦1⟧ ことで、キーを押している間だけ動く。入力軸の名前は文字列なので、まちがえても ⟦2⟧。",
      blanks: [
        { choices: ["-1〜1 の数", "true / false", "キーの名前"], answers: ["-1〜1 の数"] },
        { choices: ["毎フレーム位置に足す", "1回だけ位置に代入する"], answers: ["毎フレーム位置に足す"] },
        { choices: ["コンパイルは通り、実行してから赤いエラーが出る", "保存した時点でコンパイルエラーになる"], answers: ["コンパイルは通り、実行してから赤いエラーが出る"] },
      ],
    },
    explain: `
<p><code>Input.GetAxis("Horizontal")</code> は ← で -1、→ で 1、何も押さなければ 0 を返します。GetAxis は値がなめらかに変化するので、キーを離しても少し滑ります。キビキビ動かしたいアクションゲームでは、すぐに 0 になる <code>GetAxisRaw</code> がよく使われます。</p>
<p>この値に speed と <code>Time.deltaTime</code>（前のフレームからの経過秒数）を掛けて、毎フレーム位置に足しています。deltaTime を掛け忘れると「1フレームに5」進むことになり、速いPCほど速く動きます。</p>
<p><code>"Horizontal"</code> は文字列なので、つづりをまちがえてもコンパイルは通り、再生してから Console に赤いエラーが出続けます。エラーをダブルクリックすると、原因の行に飛べます。</p>
<p>Unity 6 で新しく作ったプロジェクトは、Player Settings の Active Input Handling が新しい Input System になっていて、このコードはエラーになります。Edit → Project Settings → Player → Other Settings で <b>Both</b> に変えるか、新しい Input System の書き方を使います。</p>`,
  },
  {
    id: "jump",
    course: "basic",
    title: "ジャンプさせる",
    goal: "スペースキーで、地面にいるときだけジャンプする",
    fileName: "PlayerJump.cs",
    code: `using UnityEngine;

public class PlayerJump : MonoBehaviour
{
    [SerializeField] float jumpPower = 6f;
    Rigidbody rb;
    bool isGrounded;

    void Start()
    {
        rb = GetComponent<Rigidbody>();
    }

    void Update()
    {
        if (Input.GetKeyDown(KeyCode.Space)⟦ground⟧)
        {
            rb.⟦force⟧;
            isGrounded = false;
        }
    }

    void OnCollisionEnter(Collision collision)
    {
        isGrounded = true;
    }
}`,
    slots: {
      ground: { label: "地面チェック", type: "choice", options: [" && isGrounded", REMOVE()], default: " && isGrounded" },
      force: {
        label: "跳ばし方",
        type: "choice",
        options: ["AddForce(Vector3.up * jumpPower, ForceMode.Impulse)", "AddForce(Vector3.up * jumpPower)", "linearVelocity = Vector3.up * jumpPower"],
        default: "AddForce(Vector3.up * jumpPower, ForceMode.Impulse)",
      },
    },
    env: [
      { name: "rb", label: "Player の Rigidbody", options: [opt("yes", "付いている"), opt("no", "付け忘れた")], default: "yes" },
    ],
    simulate(v, env, G) {
      const dur = 4, dt = 1 / FPS;
      const keys = [[0.5, 0.58, "Space"], [0.85, 0.93, "Space"], [1.15, 1.23, "Space"], [2.6, 2.68, "Space"]];
      const logs = [];
      let y = 0, vy = 0, grounded = true, jumps = 0, errs = 0;
      const ys = [];
      for (let f = 0; f <= dur * FPS; f++) {
        const t = f * dt;
        if (down(keys, "Space", t, dt)) {
          if (v.ground && !grounded) logs.push([t, "Space → 空中なので無視", "frame"]);
          else if (env.rb === "no") { errs++; if (errs === 1) logs.push([t, "MissingComponentException: There is no 'Rigidbody' attached to the \"Player\" game object, but a script is trying to access it.", "error"]); }
          else {
            jumps++;
            if (v.force.includes("Impulse")) vy += 6;
            else if (v.force.startsWith("AddForce")) vy += 6 * 0.02; // ForceMode.Force は1回の物理更新ぶん（0.02秒）しか効かない
            else vy = 6;
            grounded = false;
            logs.push([t, `Space → ジャンプ（${jumps}回目）  速度 y = ${G.fmt(vy, 1)}`]);
          }
        }
        if (env.rb === "yes") {
          vy -= 9.81 * dt;
          y += vy * dt;
          if (y <= 0) { if (!grounded && vy < 0) grounded = true; y = 0; vy = 0; }
        }
        ys.push(y);
      }
      if (errs > 1) logs.push(repeated(2.7, "MissingComponentException（同じエラー）", errs));
      return {
        duration: dur,
        draw(t) {
          const i = Math.min(ys.length - 1, Math.floor(t * FPS));
          G.bg();
          G.player(0, Math.min(ys[i], 5));
          G.keys([["Space", held(keys, "Space", t)]]);
          G.label(`position.y = ${G.fmt(ys[i])}`);
        },
        logs: logs.sort((a, b) => a[0] - b[0]),
      };
    },
    experiments: [
      { text: "&& isGrounded を消すと、空中で連打したらどうなる？", done: (v) => v.ground === "" },
      { text: "ForceMode.Impulse を外した AddForce にしてみよう", done: (v) => v.force === "AddForce(Vector3.up * jumpPower)" },
      { text: "Rigidbody を付け忘れた状態で実行してみよう", done: (v, e) => e.rb === "no" },
      { text: "linearVelocity に直接代入する書き方も試そう", done: (v) => v.force.startsWith("linearVelocity") },
    ],
    verbalize: {
      text: "Rigidbody に ⟦0⟧ と、あとは ⟦1⟧。isGrounded は ⟦2⟧ を覚えておく変数で、これがないと空中で何度でもジャンプできてしまう。",
      blanks: [
        { choices: ["上向きの力を一瞬加える", "毎フレーム位置を上げる"], answers: ["上向きの力を一瞬加える"] },
        { choices: ["物理エンジンが重力で落としてくれる", "自分で落とす処理を書く必要がある"], answers: ["物理エンジンが重力で落としてくれる"] },
        { choices: ["地面に触れているかどうか", "ジャンプした回数"], answers: ["地面に触れているかどうか"] },
      ],
    },
    explain: `
<p>Rigidbody を付けた GameObject は、Unity の物理エンジンが重力や衝突を計算して動かします。ジャンプは「上向きの力を一瞬加える」だけで、落ちてくるのは物理エンジンの仕事です。</p>
<p><code>ForceMode.Impulse</code> は「一瞬で加える力」です。省略すると <code>ForceMode.Force</code>（押し続ける力）になり、1回呼んだだけではほとんど跳びません。速度を直接決めたいなら <code>rb.linearVelocity</code> に代入します（Unity 6 より前は <code>velocity</code> という名前でした）。</p>
<p><code>GetComponent&lt;Rigidbody&gt;()</code> は、付いていなければ何も返しません。その状態で使うと MissingComponentException になります。クラスの上に <code>[RequireComponent(typeof(Rigidbody))]</code> と書いておくと、付け忘れを防げます。</p>
<p>ここでの isGrounded は「何かにぶつかったら地面にいる」という簡易版なので、壁に触れてもジャンプできてしまいます。実際のゲームでは、足元に Raycast を飛ばす方法がよく使われます。</p>`,
  },
  {
    id: "camera",
    course: "basic",
    title: "カメラを追従させる",
    goal: "カメラがプレイヤーを追いかけて、画面がスクロールする",
    fileName: "CameraFollow.cs",
    code: `using UnityEngine;

public class CameraFollow : MonoBehaviour
{
    [SerializeField] Transform target;
    [SerializeField] Vector3 offset = new Vector3(⟦ox⟧f, 2f, -10f);

    void ⟦when⟧()
    {
        transform.position = target.position + offset;
    }
}
// ※ この Script は Main Camera に付ける`,
    slots: {
      when: { label: "呼ばれるタイミング", type: "choice", options: ["LateUpdate", "Update", "Start"], default: "LateUpdate" },
      ox: { label: "offset の x", type: "number", default: 0 },
    },
    env: [
      { name: "target", label: "Inspector の Target 欄", options: [opt("set", "Player をドラッグした"), opt("none", "None のまま")], default: "set" },
    ],
    simulate(v, env, G) {
      const dur = 6;
      const px = (t) => -3 + Math.max(0, t - 0.3) * 3;
      const logs = [];
      const none = env.target === "none";
      if (none) {
        const n = v.when === "Start" ? 1 : dur * FPS;
        logs.push(repeated(0.05, "UnassignedReferenceException: The variable target of CameraFollow has not been assigned. You probably need to assign the target variable of the CameraFollow script in the inspector.", n));
      } else {
        logs.push([5.9, `最後  プレイヤー x = ${G.fmt(px(5.9))}  カメラ x = ${G.fmt(v.when === "Start" ? px(0) + v.ox : px(5.9) + v.ox)}`]);
        if (v.when === "Update") logs.push([2, "よく見ると、プレイヤーがカクカク揺れている（カメラが1フレーム遅れることがある）", "warn"]);
      }
      return {
        duration: dur,
        draw(t) {
          const p = px(t);
          let cam = 0;
          if (!none) {
            if (v.when === "Start") cam = px(0) + v.ox;
            else if (v.when === "LateUpdate") cam = p + v.ox;
            else cam = p + v.ox - (Math.floor(t * FPS) % 3 === 0 ? 3 / FPS * 3 : 0); // 実行順によって1フレーム遅れる
          }
          G.camera(cam);
          G.bg();
          [4, 9, 14].forEach((x) => G.coin(x, 0.5));
          G.player(p, 0);
          G.label(`camera.x = ${G.fmt(cam)}`);
        },
        logs,
      };
    },
    experiments: [
      { text: "Start にしたら、カメラはどうなる？", done: (v) => v.when === "Start" },
      { text: "Update にして、プレイヤーの動きをよく見てみよう", done: (v) => v.when === "Update" },
      { text: "Target 欄を None のまま実行してみよう（いちばんよく見るエラー）", done: (v, e) => e.target === "none" },
      { text: "offset の x を 3 や -3 にしてみよう", done: (v) => v.ox !== 0 },
    ],
    verbalize: {
      text: "LateUpdate は ⟦0⟧ に呼ばれる。カメラをここで動かすと ⟦1⟧ に合わせられるので、ガタつかない。Inspector の欄に入れ忘れると ⟦2⟧。",
      blanks: [
        { choices: ["すべての Update が終わった後", "ゲーム開始時に1回だけ"], answers: ["すべての Update が終わった後"] },
        { choices: ["プレイヤーが動いた後の位置", "1フレーム前の位置"], answers: ["プレイヤーが動いた後の位置"] },
        { choices: ["再生したときに毎フレームエラーが出る", "保存した時点でエラーになる"], answers: ["再生したときに毎フレームエラーが出る"] },
      ],
    },
    explain: `
<p><code>[SerializeField] Transform target;</code> と書くと、Inspector に Target 欄ができます。ここに Hierarchy から Player をドラッグして初めて、target がプレイヤーを指します。入れ忘れると UnassignedReferenceException（中身が空のまま使った、というエラー）になります。初学者が最もよく出会うエラーなので、出たら「Inspector の欄が None になっていないか」を最初に確認しましょう。</p>
<p>Update はスクリプトごとに呼ばれる順番が決まっていません。カメラの Update がプレイヤーより先に呼ばれると、カメラは「動く前の位置」に合わせてしまい、画面がガタつきます。LateUpdate はすべての Update の後に呼ばれるので、カメラの処理に向いています。</p>
<p>実際の開発では、Cinemachine というパッケージでカメラを制御することも多いです。仕組みを理解してから使うと、設定の意味がわかりやすくなります。</p>`,
  },
  {
    id: "coin",
    course: "basic",
    title: "コインを取る",
    goal: "コインに触れたら、コインが消える",
    fileName: "CoinCollector.cs",
    code: `using UnityEngine;

public class CoinCollector : MonoBehaviour
{
    void ⟦event⟧(Collider other)
    {
        if (other.CompareTag("⟦tag⟧"))
        {
            Destroy(⟦target⟧);
        }
    }
}
// ※ この Script は Player に付ける。コインには Coin タグを設定済み`,
    slots: {
      event: { label: "イベント関数", type: "choice", options: ["OnTriggerEnter", "OnCollisionEnter"], default: "OnTriggerEnter" },
      tag: { label: "タグ名", type: "choice", options: ["Coin", "coin", "Enemy"], default: "Coin" },
      target: { label: "消すもの", type: "choice", options: ["other.gameObject", "other", "gameObject"], default: "other.gameObject" },
    },
    env: [
      { name: "trigger", label: "コインの Collider の Is Trigger", options: [opt("on", "オン"), opt("off", "オフ")], default: "on" },
    ],
    simulate(v, env, G) {
      const dur = 5, dt = 1 / FPS;
      const coins = [0, 2, 4].map((x) => ({ x, alive: true, hasCollider: true, touched: false }));
      const frames = [], logs = [];
      let px = -4, playerAlive = true, blocked = false;
      if (v.event === "OnCollisionEnter") logs.push([0, "Script error: OnCollisionEnter\nThis message parameter has to be of type: Collision\nThe message will be ignored.", "error"]);
      for (let f = 0; f <= dur * FPS; f++) {
        const t = f * dt;
        if (playerAlive && !blocked) px += 2 * dt;
        const c = coins.find((k) => k.alive && k.hasCollider && !k.touched && px >= k.x - 0.6);
        if (c && playerAlive) {
          if (env.trigger === "off") {
            blocked = true;
            px = c.x - 0.6;
            logs.push([t, "コインにぶつかって止まった（Is Trigger がオフなので、すり抜けない）", "warn"]);
          } else {
            c.touched = true;
            if (v.event === "OnTriggerEnter") {
              if (v.tag !== "Coin") logs.push([t, `OnTriggerEnter が呼ばれたが、タグが "${v.tag}" と一致しない`, "frame"]);
              else if (v.target === "other.gameObject") { c.alive = false; logs.push([t, "コインを取った"]); }
              else if (v.target === "other") { c.hasCollider = false; logs.push([t, "コインの Collider だけが消えた（見た目は残る）", "warn"]); }
              else { playerAlive = false; logs.push([t, "Player（自分）が消えた", "warn"]); }
            }
          }
        }
        frames.push({ px, playerAlive, coins: coins.map((k) => k.alive) });
      }
      if (v.event === "OnTriggerEnter" && env.trigger === "on" && v.tag !== "Coin") logs.push([dur - 0.1, "タグ名は大文字と小文字も区別される", "frame"]);
      return {
        duration: dur,
        draw(t) {
          const s = frames[Math.min(frames.length - 1, Math.floor(t * FPS))];
          G.bg();
          coins.forEach((c, i) => s.coins[i] && G.coin(c.x, 0.3));
          G.player(s.px, 0, { visible: s.playerAlive });
          G.label(`${v.event} / Is Trigger: ${env.trigger === "on" ? "オン" : "オフ"}`);
        },
        logs: logs.sort((a, b) => a[0] - b[0]),
      };
    },
    experiments: [
      { text: "コインの Is Trigger をオフにしたら？", done: (v, e) => e.trigger === "off" },
      { text: "OnTriggerEnter を OnCollisionEnter に変えたら？", done: (v) => v.event === "OnCollisionEnter" },
      { text: "タグ名を小文字の \"coin\" にしてみよう", done: (v) => v.tag === "coin" },
      { text: "Destroy の中身を other や gameObject にしたら、何が消える？", done: (v) => v.target !== "other.gameObject" },
    ],
    verbalize: {
      text: "Is Trigger をオンにした Collider は ⟦0⟧、代わりに ⟦1⟧ が呼ばれる。CompareTag のタグ名は ⟦2⟧。Destroy に other.gameObject を渡すと ⟦3⟧ が消える。",
      blanks: [
        { choices: ["ぶつからずにすり抜け", "ぶつかって止まり"], answers: ["ぶつからずにすり抜け"] },
        { choices: ["OnTriggerEnter", "OnCollisionEnter"], answers: ["OnTriggerEnter"] },
        { choices: ["大文字と小文字も区別される", "大文字と小文字は区別されない"], answers: ["大文字と小文字も区別される"] },
        { choices: ["コインの GameObject ごと", "コインの Collider だけ"], answers: ["コインの GameObject ごと"] },
      ],
    },
    explain: `
<p>アイテムのように「触れたら反応するけど、ぶつかって止まらない」ものは、Collider の Is Trigger をオンにします。すると衝突の代わりに <code>OnTriggerEnter(Collider other)</code> が呼ばれます。Is Trigger がオフのままだと普通の壁と同じになり、OnTriggerEnter は呼ばれません。</p>
<p>OnCollisionEnter の引数は <code>Collision</code>、OnTriggerEnter の引数は <code>Collider</code> です。組み合わせをまちがえると、Unity は「このメッセージは無視します」というエラーを出して、メソッドを呼びません。</p>
<p>タグは Inspector の Tag 欄で設定し、名前は大文字・小文字まで一致させる必要があります。また、Trigger や衝突のイベントが起きるには、どちらか一方に Rigidbody が付いている必要があります（ここでは Player に付いています）。</p>
<p><code>other</code> は Collider というコンポーネント（部品）なので、<code>Destroy(other)</code> は当たり判定だけを外します。GameObject ごと消すには <code>other.gameObject</code> を渡します。</p>`,
  },
  {
    id: "score",
    course: "basic",
    title: "スコアを表示する",
    goal: "コインを取るたびに、画面左上のスコアが増える",
    fileName: "ScoreManager.cs",
    code: `using UnityEngine;
using TMPro;

public class ScoreManager : MonoBehaviour
{
    [SerializeField] TextMeshProUGUI scoreText;
    int score = 0;

    public void AddScore(int amount)
    {
        score ⟦op⟧ amount;
        ⟦show⟧
    }
}
// ※ CoinCollector から、コインを取るたびに scoreManager.AddScore(10); が呼ばれる`,
    slots: {
      op: { label: "足し方", type: "choice", options: ["+=", "="], default: "+=" },
      show: {
        label: "表示の更新",
        type: "choice",
        options: ['scoreText.text = "Score: " + score;', 'scoreText.text = "Score: score";', REMOVE()],
        default: 'scoreText.text = "Score: " + score;',
      },
    },
    env: [
      { name: "text", label: "Inspector の Score Text 欄", options: [opt("set", "Text (TMP) をドラッグした"), opt("none", "None のまま")], default: "set" },
    ],
    simulate(v, env, G) {
      const dur = 4.5, hits = [1, 2, 3];
      const logs = [];
      let score = 0, shown = "Score: 0";
      const states = [];
      hits.forEach((t) => {
        score = v.op === "+=" ? score + 10 : 10;
        if (v.show && env.text === "none") {
          logs.push([t, "NullReferenceException: Object reference not set to an instance of an object\nScoreManager.AddScore (System.Int32 amount) (at Assets/Scripts/ScoreManager.cs:12)", "error"]);
        } else if (v.show) {
          shown = v.show.includes('" + score') ? `Score: ${score}` : "Score: score";
          logs.push([t, `コインを取った  score = ${score}`]);
        } else {
          logs.push([t, `コインを取った  score = ${score}（画面は変わらない）`, "warn"]);
        }
        states.push({ t, shown, score });
      });
      return {
        duration: dur,
        draw(t) {
          const s = states.filter((x) => x.t <= t).pop() || { shown: "Score: 0", score: 0 };
          G.bg();
          const px = -4 + t * 2;
          hits.forEach((ht) => { if (t < ht) G.coin(-4 + ht * 2, 0.3); });
          G.player(px, 0);
          G.ui(env.text === "none" ? "New Text" : s.shown);
          G.label(`変数 score = ${s.score}`);
        },
        logs,
      };
    },
    experiments: [
      { text: "+= を = にしたら、スコアはどうなる？", done: (v) => v.op === "=" },
      { text: "\"Score: score\" と、変数を文字列の中に入れてしまったら？", done: (v) => v.show === 'scoreText.text = "Score: score";' },
      { text: "表示を更新する行を消してみよう。変数 score はどうなっている？", done: (v) => v.show === "" },
      { text: "Score Text 欄を None のまま実行してみよう", done: (v, e) => e.text === "none" },
    ],
    verbalize: {
      text: "score は ⟦0⟧ で、画面の文字は ⟦1⟧ 変わる。変数を増やしただけでは、画面の表示は ⟦2⟧。",
      blanks: [
        { choices: ["点数を覚えておく変数", "画面に表示される文字"], answers: ["点数を覚えておく変数"] },
        { choices: ["scoreText.text に代入したときだけ", "score が変わると自動で"], answers: ["scoreText.text に代入したときだけ"] },
        { choices: ["変わらない", "自動で変わる"], answers: ["変わらない"] },
      ],
    },
    explain: `
<p>「点数を覚えておく変数」と「画面に出ている文字」は別物です。score を増やしても、<code>scoreText.text</code> に新しい文字を代入しない限り、画面は変わりません。</p>
<p><code>"Score: " + score</code> は文字列と数をつなげて <code>"Score: 30"</code> にします。<code>"Score: score"</code> と書くと、score はただの文字になります。<code>$"Score: {score}"</code> という書き方（文字列補間）もよく使います。</p>
<p>NullReferenceException は「中身が空（null）のものを使おうとした」というエラーです。メッセージの最後の <code>ScoreManager.cs:12</code> が「12行目で起きた」という意味です。ほとんどの場合、Inspector の欄の入れ忘れが原因です。</p>
<p>AddScore を <code>public</code> にしているのは、CoinCollector など他のスクリプトから呼ぶためです。「点数の管理は ScoreManager に任せる」という役割分担になっています。</p>`,
  },
  {
    id: "gameover",
    course: "basic",
    title: "ゲームオーバーとリトライ",
    goal: "敵に当たったらゲームオーバー。R キーで最初からやり直す",
    fileName: "GameOver.cs",
    code: `using UnityEngine;
using UnityEngine.SceneManagement;

public class GameOver : MonoBehaviour
{
    [SerializeField] GameObject gameOverPanel;

    void OnCollisionEnter(Collision collision)
    {
        if (collision.gameObject.CompareTag("Enemy"))
        {
            gameOverPanel.SetActive(true);
            Time.timeScale = 0f;
        }
    }

    void Update()
    {
        if (gameOverPanel.activeSelf && Input.GetKeyDown(KeyCode.R))
        {
            ⟦reset⟧
            SceneManager.LoadScene(⟦scene⟧);
        }
    }
}`,
    slots: {
      reset: { label: "時間を戻す", type: "choice", options: ["Time.timeScale = 1f;", REMOVE()], default: "Time.timeScale = 1f;" },
      scene: { label: "読み込むシーン", type: "choice", options: ["SceneManager.GetActiveScene().name", '"Stage2"'], default: "SceneManager.GetActiveScene().name" },
    },
    simulate(v, env, G) {
      const dur = 6, hitAt = 1.5, retryAt = 3;
      const keys = [[retryAt, retryAt + 0.1, "R"]];
      const stage2 = v.scene === '"Stage2"';
      const logs = [[hitAt, "Enemy に当たった → ゲームオーバー（Time.timeScale = 0）"]];
      if (stage2) logs.push([retryAt, "Scene 'Stage2' couldn't be loaded because it has not been added to the build settings or the AssetBundle has not been loaded.", "error"]);
      else {
        logs.push([retryAt, "R → シーンを読み込み直した"]);
        if (!v.reset) logs.push([retryAt + 0.5, "シーンは最初に戻ったのに、プレイヤーも敵も動かない", "warn"]);
      }
      const state = (t) => {
        if (t < hitAt) return { px: -4 + t * 2, ex: 2 - t * 1.33, panel: false };
        if (t < retryAt || stage2) return { px: -4 + hitAt * 2, ex: 2 - hitAt * 1.33, panel: true };
        const tt = v.reset ? t - retryAt : 0;
        return { px: -4 + tt * 2, ex: 2 - tt * 1.33, panel: false };
      };
      return {
        duration: dur,
        draw(t) {
          const s = state(t);
          G.bg();
          G.enemy(s.ex, 0);
          G.player(s.px, 0);
          G.keys([["R", held(keys, "R", t)]]);
          const scale = t >= hitAt && (t < retryAt || stage2 || !v.reset) ? 0 : 1;
          if (s.panel) G.panel("GAME OVER", ["R キーでリトライ"], { color: G.css("--enemy") });
          G.label(`Time.timeScale = ${scale}`);
        },
        logs,
      };
    },
    experiments: [
      { text: "Time.timeScale = 1f; を消して、リトライしてみよう", done: (v) => v.reset === "" },
      { text: "読み込むシーンを \"Stage2\" にしてみよう（Build Settings に登録していない）", done: (v) => v.scene === '"Stage2"' },
    ],
    verbalize: {
      text: "Time.timeScale = 0 にすると ⟦0⟧。この値は ⟦1⟧ ので、リトライする前に 1 に戻しておく。シーンは ⟦2⟧ しか読み込めない。",
      blanks: [
        { choices: ["時間の進みが止まり、物理や deltaTime を使う動きが止まる", "すべてのスクリプトが削除される"], answers: ["時間の進みが止まり、物理や deltaTime を使う動きが止まる"] },
        { choices: ["シーンを読み込み直しても元に戻らない", "シーンを読み込み直すと 1 に戻る"], answers: ["シーンを読み込み直しても元に戻らない"] },
        { choices: ["Build Settings（Build Profiles）に登録したシーン", "Assets フォルダにあるすべてのシーン"], answers: ["Build Settings（Build Profiles）に登録したシーン"] },
      ],
    },
    explain: `
<p><code>Time.timeScale</code> はゲーム内の時間の進む速さです。0 にすると <code>Time.deltaTime</code> が 0 になり、物理演算も止まるので、ポーズやゲームオーバーによく使われます。Update 自体は呼ばれ続けるので、R キーの入力は受け付けられます。</p>
<p>timeScale はシーンに属さない、ゲーム全体の設定です。シーンを読み込み直しても 0 のまま残るので、「リトライしたら全部止まっている」というバグになります。シーンを切り替える前に 1 に戻しましょう。</p>
<p><code>SceneManager.LoadScene</code> で読み込めるのは、Build Settings（Unity 6 では Build Profiles）の Scene List に登録したシーンだけです。新しくシーンを作ったら、登録を忘れないようにしましょう。</p>`,
  },
  {
    id: "spawner",
    course: "basic",
    title: "敵を出現させる",
    goal: "一定時間ごとに、右から敵が出てくる",
    fileName: "EnemySpawner.cs",
    code: `using UnityEngine;

public class EnemySpawner : MonoBehaviour
{
    [SerializeField] GameObject enemyPrefab;
    [SerializeField] float interval = ⟦interval⟧f;
    float timer;

    void Update()
    {
        timer += Time.deltaTime;
        if (timer >= interval)
        {
            Instantiate(enemyPrefab, transform.position, Quaternion.identity);
            ⟦reset⟧
        }
    }
}
// ※ 敵は出現後に左へ歩き、画面の外に出たら自分を Destroy する`,
    slots: {
      interval: { label: "出現間隔（秒）", type: "number", default: 1.5 },
      reset: { label: "タイマーを戻す", type: "choice", options: ["timer = 0f;", REMOVE()], default: "timer = 0f;" },
    },
    env: [
      { name: "prefab", label: "Inspector の Enemy Prefab 欄", options: [opt("asset", "Assets の Prefab を入れた"), opt("scene", "シーン上の敵を入れた"), opt("none", "None のまま")], default: "asset" },
    ],
    simulate(v, env, G) {
      const dur = 8, dt = 1 / FPS, speed = 2;
      const iv = Math.max(dt, v.interval);
      const enemies = [], logs = [];
      if (env.prefab === "scene") enemies.push({ born: 0, x0: 6, original: true });
      let timer = 0, errs = 0, firstErr = null, missing = 0, firstMissing = null;
      for (let f = 1; f <= dur * FPS; f++) {
        const t = f * dt;
        timer += dt;
        if (timer >= iv) {
          const original = enemies.find((e) => e.original);
          const originalGone = original && 6 - (t - original.born) * speed < -7;
          if (env.prefab === "none") { errs++; firstErr ??= t; }
          else if (env.prefab === "scene" && originalGone) { missing++; firstMissing ??= t; }
          else enemies.push({ born: t, x0: 6 });
          if (v.reset) timer = 0;
        }
      }
      const spawned = enemies.filter((e) => !e.original);
      if (firstErr !== null) logs.push(repeated(firstErr, "ArgumentException: The Object you want to instantiate is null.", errs));
      if (firstMissing !== null) logs.push(repeated(firstMissing, "MissingReferenceException: The object of type 'GameObject' has been destroyed but you are still trying to access it.", missing));
      [2, 4, 6].forEach((s) => logs.push([s, `${s}秒後  出現した敵: ${spawned.filter((e) => e.born <= s).length} 体`]));
      if (spawned.length > 50) logs.push([3, "毎フレーム生成されて、敵が増え続けている", "warn"]);
      return {
        duration: dur,
        draw(t) {
          G.bg();
          G.player(-5, 0);
          let alive = 0;
          enemies.forEach((e) => {
            if (e.born > t) return;
            const x = e.x0 - (t - e.born) * speed;
            if (x >= -7) { alive++; if (alive <= 250) G.enemy(x, 0); }
          });
          G.cube(6.2, 0, { size: 0.5, color: G.css("--scene-grid") });
          G.label(`timer = ${G.fmt(v.reset ? t % iv : Math.min(t, 99), 2)}   画面内の敵: ${alive}`);
        },
        logs: logs.sort((a, b) => a[0] - b[0]),
      };
    },
    experiments: [
      { text: "timer = 0f; を消したらどうなる？", done: (v) => v.reset === "" },
      { text: "出現間隔の数字を変えてみよう", done: (v) => v.interval !== 1.5 },
      { text: "Enemy Prefab 欄に、シーン上の敵を入れてしまったら？（最後まで見てみよう）", done: (v, e) => e.prefab === "scene" },
      { text: "Enemy Prefab 欄を None のまま実行してみよう", done: (v, e) => e.prefab === "none" },
    ],
    verbalize: {
      text: "timer に毎フレーム Time.deltaTime を足すと、⟦0⟧ になる。interval を超えたら敵を生成して ⟦1⟧。Instantiate には ⟦2⟧ を渡す。",
      blanks: [
        { choices: ["前回の生成からの経過秒数", "フレーム数"], answers: ["前回の生成からの経過秒数"] },
        { choices: ["timer を 0 に戻す", "interval を増やす"], answers: ["timer を 0 に戻す"] },
        { choices: ["Assets にある Prefab", "シーン上にある敵"], answers: ["Assets にある Prefab"] },
      ],
    },
    explain: `
<p><code>Time.deltaTime</code> を毎フレーム足していくと、経過した秒数になります。これが「Update で時間を数える」基本の書き方です。生成したら timer を 0 に戻さないと、条件がずっと true のままになり、毎フレーム生成されてしまいます。</p>
<p>Prefab は、Assets フォルダに保存した GameObject の「型紙」です。Instantiate はこの型紙からコピーを作ります。Hierarchy にある敵をそのまま入れてしまうと、その敵が倒されたり画面外で消えたりした瞬間に、コピー元がなくなってエラーになります。必ず Project ウィンドウ（Assets）から Prefab をドラッグしましょう。</p>
<p>同じ「時間を待つ」処理は、コース2で学ぶコルーチンを使うと、もっと読みやすく書けます。</p>`,
  },

  // ───────────────────────── コース2 ─────────────────────────
  {
    id: "invincible",
    course: "async",
    title: "ダメージ後の無敵時間",
    goal: "敵に当たったら1秒間点滅して、その間はダメージを受けない",
    fileName: "PlayerDamage.cs",
    code: `using System.Collections;
using UnityEngine;

public class PlayerDamage : MonoBehaviour
{
    [SerializeField] Renderer rend;
    int hp = 3;
    bool isInvincible;

    void OnCollisionEnter(Collision collision)
    {
        if (!collision.gameObject.CompareTag("Enemy")⟦guard⟧) return;
        hp--;
        Debug.Log("HP: " + hp);
        ⟦start⟧
    }

    IEnumerator Invincible()
    {
        isInvincible = true;
        for (int i = 0; i < 10; i++)
        {
            rend.enabled = !rend.enabled;
            yield return new WaitForSeconds(⟦wait⟧f);
        }
        rend.enabled = true;
        isInvincible = false;
    }
}`,
    slots: {
      guard: { label: "無敵中は無視", type: "choice", options: [" || isInvincible", REMOVE()], default: " || isInvincible" },
      start: { label: "コルーチンの開始", type: "choice", options: ["StartCoroutine(Invincible());", "Invincible();"], default: "StartCoroutine(Invincible());" },
      wait: { label: "点滅の間隔（秒）", type: "number", default: 0.1 },
    },
    simulate(v, env, G) {
      const dur = 4.5, hits = [0.6, 1.1, 2.9];
      const w = Math.max(1 / FPS, v.wait);
      const routines = []; // { start, end }
      const toggles = [];
      const logs = [];
      let hp = 3;
      const hpAt = [];
      // isInvincible はコルーチンの開始で true、どれかのコルーチンの終了で false になる（重なると早く切れる）
      const invincibleAt = (t) => {
        const ev = routines.flatMap((r) => [[r.start, true], [r.end, false]]).filter((e) => e[0] <= t).sort((a, b) => a[0] - b[0]);
        return ev.length ? ev[ev.length - 1][1] : false;
      };
      hits.forEach((t) => {
        if (v.guard && invincibleAt(t)) { logs.push([t, "敵に当たったが無敵中なので無視", "frame"]); return; }
        hp--;
        hpAt.push([t, hp]);
        logs.push([t, `HP: ${hp}`, hp <= 0 ? "warn" : "info"]);
        if (v.start.startsWith("StartCoroutine")) {
          const r = { start: t, end: t + w * 10 };
          routines.push(r);
          for (let i = 0; i < 10; i++) toggles.push({ t: t + i * w, type: "toggle" });
          toggles.push({ t: r.end, type: "on" });
        }
      });
      toggles.sort((a, b) => a.t - b.t);
      if (routines.length > 1 && routines.some((r, i) => i > 0 && r.start < routines[i - 1].end)) logs.push([1.2, "コルーチンが2つ同時に動いていて、点滅がバラバラになっている", "warn"]);
      if (!v.start.startsWith("StartCoroutine")) logs.push([0.7, "点滅しない（コルーチンが始まっていない）", "warn"]);
      const visibleAt = (t) => {
        let vis = true;
        toggles.forEach((x) => { if (x.t <= t) vis = x.type === "on" ? true : !vis; });
        return vis;
      };
      return {
        duration: dur,
        draw(t) {
          G.bg();
          hits.forEach((h) => { const x = 4 - (t - h + 1.5) * 2.7; if (x > 0.6) G.enemy(x, 0); });
          G.player(0, 0, { visible: visibleAt(t) });
          const cur = hpAt.filter((x) => x[0] <= t).pop();
          G.hearts(cur ? Math.max(0, cur[1]) : 3, 3);
          G.label(`isInvincible = ${invincibleAt(t)}`);
        },
        logs,
      };
    },
    experiments: [
      { text: "|| isInvincible を消すと、続けて当たったときどうなる？", done: (v) => v.guard === "" },
      { text: "StartCoroutine を使わずに Invincible(); と呼んだら？", done: (v) => !v.start.startsWith("StartCoroutine") },
      { text: "点滅の間隔を変えると、無敵時間の長さはどうなる？", done: (v) => v.wait !== 0.1 },
    ],
    verbalize: {
      text: "StartCoroutine で動かしたコルーチンは、⟦0⟧、時間がたつと続きから動く。isInvincible のチェックがないと、無敵中に当たったときに ⟦1⟧。StartCoroutine を使わずに呼ぶと ⟦2⟧。",
      blanks: [
        { choices: ["yield return のたびに一時停止し", "最後まで一気に実行され"], answers: ["yield return のたびに一時停止し"] },
        { choices: ["コルーチンがもう1つ増えて点滅がおかしくなる", "前のコルーチンが自動で止まる"], answers: ["コルーチンがもう1つ増えて点滅がおかしくなる"] },
        { choices: ["中身が1行も実行されない", "普通のメソッドとして最後まで実行される"], answers: ["中身が1行も実行されない"] },
      ],
    },
    explain: `
<p>普通のメソッドは、呼ばれたら最後まで一気に実行されます。「0.1秒待って表示を切り替える」を10回くり返す処理は、普通のメソッドでは書けません。コルーチンなら <code>yield return new WaitForSeconds(0.1f)</code> の行で一時停止し、時間が来たら Unity が続きから再開してくれます。待っている間もゲームは動き続けます。</p>
<p>コルーチンは呼ばれるたびに新しく1つ動き出します。無敵中にもう一度当たってコルーチンが2つ動くと、点滅が乱れ、先に終わった方が isInvincible を false にしてしまいます。「動いている間は始めない」というチェックが大事です。</p>
<p><code>Invincible();</code> と直接呼ぶと、実行の準備をした入れ物が作られるだけで、中身は実行されません。エラーも出ないので気づきにくいミスです。</p>`,
  },
  {
    id: "gameover-seq",
    course: "async",
    title: "ゲームオーバー演出",
    goal: "時間を止めて GAME OVER を出し、2秒後にリザルト画面へ移る",
    fileName: "GameOverSequence.cs",
    code: `using System.Collections;
using UnityEngine;
using UnityEngine.SceneManagement;

public class GameOverSequence : MonoBehaviour
{
    [SerializeField] GameObject gameOverText;

    public void Play()
    {
        StartCoroutine(Sequence());
    }

    IEnumerator Sequence()
    {
        Time.timeScale = ⟦scale⟧f;
        gameOverText.SetActive(true);
        yield return new ⟦wait⟧(2f);
        Time.timeScale = 1f;
        SceneManager.LoadScene("Result");
    }
}`,
    slots: {
      scale: { label: "timeScale", type: "choice", options: ["0", "0.2", "1"], default: "0" },
      wait: { label: "待ち方", type: "choice", options: ["WaitForSecondsRealtime", "WaitForSeconds"], default: "WaitForSecondsRealtime" },
    },
    simulate(v, env, G) {
      const start = 1, scale = Number(v.scale);
      const realWait = v.wait === "WaitForSecondsRealtime" ? 2 : scale === 0 ? Infinity : 2 / scale;
      const endAt = start + realWait;
      const dur = Math.min(Number.isFinite(endAt) ? endAt + 1.2 : 6, 13);
      const logs = [[start, `プレイヤーがやられた → Time.timeScale = ${scale}`]];
      if (Number.isFinite(endAt)) logs.push([Math.min(endAt, dur - 0.2), `${G.fmt(realWait, 1)} 秒（現実の時間）後に Result シーンへ`]);
      else logs.push([5.5, "いつまで待っても Result シーンに移らない", "warn"]);
      const gameTime = (t) => (t < start ? t : start + (Math.min(t, endAt) - start) * scale);
      return {
        duration: dur,
        draw(t) {
          G.bg();
          const gt = gameTime(t);
          [0, 1, 2].forEach((i) => G.enemy(5 - ((gt * 1.8 + i * 3) % 11), 0));
          G.player(-4, 0, { color: t >= start ? G.css("--error") : undefined });
          if (t >= endAt) G.panel("RESULT", ["Score: 120"]);
          else if (t >= start) G.bigText("GAME OVER", `現実の経過: ${G.fmt(t - start, 1)} 秒`);
          G.label(`Time.timeScale = ${t >= start && t < endAt ? scale : 1}`);
        },
        logs,
      };
    },
    experiments: [
      { text: "WaitForSeconds に変えたらどうなる？", done: (v) => v.wait === "WaitForSeconds" && v.scale === "0" },
      { text: "timeScale を 0.2（スローモーション）にして、両方の待ち方を比べよう", done: (v) => v.scale === "0.2" },
    ],
    verbalize: {
      text: "WaitForSeconds は ⟦0⟧ で数えるので、timeScale が 0 だと ⟦1⟧。時間を止めたまま待ちたいときは ⟦2⟧ を使う。",
      blanks: [
        { choices: ["Time.timeScale の影響を受けるゲーム内の時間", "現実の時間"], answers: ["Time.timeScale の影響を受けるゲーム内の時間"] },
        { choices: ["永遠に再開しない", "すぐに再開する"], answers: ["永遠に再開しない"] },
        { choices: ["WaitForSecondsRealtime", "WaitForSeconds"], answers: ["WaitForSecondsRealtime"] },
      ],
    },
    explain: `
<p><code>WaitForSeconds</code> はゲーム内の時間で数えます。timeScale が 0 だとゲーム内の時間が進まないので、何秒たっても再開しません。0.2 なら 5 倍の時間がかかります。</p>
<p><code>WaitForSecondsRealtime</code> は timeScale に関係なく、現実の時間で数えます。ポーズ画面のアニメーションや、ゲームオーバー後の演出のように「時間を止めたまま待ちたい」ときに使います。</p>
<p>「ゲームオーバーになったら画面が固まって先に進まない」というバグの原因として、とてもよくあるパターンです。timeScale をいじったら、その間の待ち方も確認しましょう。</p>`,
  },
  {
    id: "wave",
    course: "async",
    title: "敵のウェーブ",
    goal: "敵を少しずつ出し、全滅させたら次のウェーブへ進む",
    fileName: "WaveSpawner.cs",
    code: `using System.Collections;
using UnityEngine;

public class WaveSpawner : MonoBehaviour
{
    [SerializeField] GameObject enemyPrefab;
    int enemyCount; // 敵が倒されると、敵側のスクリプトが 1 減らす

    IEnumerator Start()
    {
        for (int wave = 1; wave <= 3; wave++)
        {
            Debug.Log("Wave " + wave);
            for (int i = 0; i < wave * 2; i++)
            {
                Instantiate(enemyPrefab, RandomPosition(), Quaternion.identity);
                enemyCount++;
                ⟦inner⟧
            }
            ⟦between⟧
        }
        Debug.Log("ステージクリア！");
    }
}`,
    slots: {
      inner: { label: "1体ごとの待ち", type: "choice", options: ["yield return new WaitForSeconds(0.4f);", REMOVE()], default: "yield return new WaitForSeconds(0.4f);" },
      between: {
        label: "ウェーブの区切り",
        type: "choice",
        options: ["yield return new WaitUntil(() => enemyCount == 0);", "yield return new WaitForSeconds(2f);", REMOVE()],
        default: "yield return new WaitUntil(() => enemyCount == 0);",
      },
    },
    simulate(v, env, G) {
      const life = 1.4; // プレイヤーが敵を倒すまでの時間
      const enemies = [], logs = [];
      let t = 0.2;
      for (let wave = 1; wave <= 3; wave++) {
        logs.push([t, `Wave ${wave}`]);
        for (let i = 0; i < wave * 2; i++) {
          enemies.push({ born: t, dies: t + life, x: 1 + ((enemies.length * 37) % 50) / 10 });
          if (v.inner) t += 0.4;
        }
        if (v.between.includes("WaitUntil")) t = Math.max(t, ...enemies.map((e) => e.dies));
        else if (v.between.includes("2f")) t += 2;
      }
      logs.push([t, "ステージクリア！"]);
      if (!v.inner && !v.between) logs.push([t, "すべての敵が1フレームの間に出てきて、ウェーブの意味がなくなった", "warn"]);
      else if (!v.between.includes("WaitUntil")) {
        const maxAlive = Math.max(...enemies.map((e) => enemies.filter((o) => o.born <= e.born && o.dies > e.born).length));
        logs.push([t + 0.05, `前のウェーブが残っていても次が始まる（同時に最大 ${maxAlive} 体）`, "warn"]);
      }
      const dur = Math.max(...enemies.map((e) => e.dies), t) + 0.8;
      return {
        duration: dur,
        draw(time) {
          G.bg();
          G.player(-4, 0);
          let alive = 0;
          enemies.forEach((e) => { if (e.born <= time && time < e.dies) { alive++; G.enemy(e.x, 0, { size: 0.7 }); } });
          const cur = logs.filter((l) => l[0] <= time && l[1].startsWith("Wave")).pop();
          G.ui(time >= t ? "STAGE CLEAR" : cur ? cur[1] : "");
          G.label(`enemyCount = ${alive}`);
        },
        logs: logs.sort((a, b) => a[0] - b[0]),
      };
    },
    experiments: [
      { text: "1体ごとの待ちを消してみよう", done: (v) => v.inner === "" },
      { text: "ウェーブの区切りを WaitForSeconds(2f) にしたら？", done: (v) => v.between.includes("2f") },
      { text: "待ちを両方とも消したら？", done: (v) => !v.inner && !v.between },
    ],
    verbalize: {
      text: "コルーチンの中で yield return を書くと ⟦0⟧ ので、出現の間隔やウェーブの区切りを ⟦1⟧ 書ける。WaitUntil は ⟦2⟧ 待つ。",
      blanks: [
        { choices: ["そこで待ってから次の行に進む", "その行を飛ばす"], answers: ["そこで待ってから次の行に進む"] },
        { choices: ["上から順番に読める形で", "Update の中にタイマーを並べて"], answers: ["上から順番に読める形で"] },
        { choices: ["条件が true になるまで", "決まった秒数だけ"], answers: ["条件が true になるまで"] },
      ],
    },
    explain: `
<p>同じ処理を Update とタイマーで書くと「今は何ウェーブ目か」「何体出したか」「待ち中か」を変数で管理する必要があり、すぐに複雑になります。コルーチンなら、ゲームの進行を上から順番に書けます。</p>
<p><code>WaitUntil(() =&gt; enemyCount == 0)</code> は、毎フレーム条件を確かめて、true になったら先に進みます。<code>() =&gt;</code> は「あとで何度も実行される小さな関数」を書くための記法です。</p>
<p>Start の戻り値を <code>IEnumerator</code> にすると、Start 自体がコルーチンになり、StartCoroutine を書かなくても自動で動きます。</p>
<p>注意：<code>while (true)</code> のように終わらないループの中に yield がないと、1フレームの中で永遠にループし、Unity エディタごと固まります。ループの中には必ず yield を入れましょう。</p>`,
  },
  {
    id: "load-async",
    course: "async",
    title: "シーンをロード画面つきで読み込む",
    goal: "スタートボタンを押すと、ロードバーを表示しながら重いステージを読み込む",
    fileName: "TitleMenu.cs",
    code: `using UnityEngine;
using UnityEngine.SceneManagement;
using UnityEngine.UI;

public class TitleMenu : MonoBehaviour
{
    [SerializeField] GameObject loadingPanel;
    [SerializeField] Slider progressBar;

    // スタートボタンの OnClick に登録する
    public async void OnClickStart()
    {
        loadingPanel.SetActive(true);
        AsyncOperation op = SceneManager.LoadSceneAsync("Stage1");

        while (!op.isDone)
        {
            progressBar.value = ⟦value⟧;
            ⟦wait⟧
        }
    }
}`,
    slots: {
      value: { label: "バーに入れる値", type: "choice", options: ["Mathf.Clamp01(op.progress / 0.9f)", "op.progress"], default: "Mathf.Clamp01(op.progress / 0.9f)" },
      wait: { label: "1周ごとの待ち", type: "choice", options: ["await Awaitable.NextFrameAsync();", REMOVE()], default: "await Awaitable.NextFrameAsync();" },
    },
    env: [
      { name: "weight", label: "Stage1 の重さ", options: [opt(3, "重い（3秒）"), opt(1, "軽い（1秒）")], default: 3 },
    ],
    simulate(v, env, G) {
      const click = 0.6, load = Number(env.weight), done = click + load + 0.3;
      const logs = [[click, "スタートボタンが押された"]];
      if (!v.wait) {
        logs.push([click + 0.3, "Unity エディタが固まった（while が1フレームの中で回り続けている）", "error"]);
        return {
          duration: 4,
          draw(t) {
            G.bg();
            G.panel("TITLE", ["▶ スタート"]);
            if (t > click + 0.2) G.overlay("Unity（応答なし）", "await がないので、Unity に処理が戻らない");
          },
          logs,
        };
      }
      logs.push([done, "Stage1 に切り替わった"]);
      if (v.value === "op.progress") logs.push([click + load, "バーが 90% で止まって見える（progress は 0.9 までしか増えない）", "warn"]);
      const prog = (t) => Math.min(0.9, ((t - click) / load) * 0.9);
      return {
        duration: done + 1.2,
        draw(t) {
          G.bg();
          if (t < click) { G.panel("TITLE", ["▶ スタート"]); return; }
          if (t >= done) { G.player(-3 + (t - done) * 2, 0); G.ui("Stage1"); return; }
          const p = prog(t);
          const value = v.value === "op.progress" ? p : Math.min(1, p / 0.9);
          G.panel("Loading...", [" ", " "]);
          G.progress(value, `${Math.round(value * 100)}%`);
          G.label(`op.progress = ${G.fmt(p)}   progressBar.value = ${G.fmt(value)}`);
        },
        logs,
      };
    },
    experiments: [
      { text: "while の中の await を消したら？", done: (v) => v.wait === "" },
      { text: "バーに op.progress をそのまま入れてみよう", done: (v) => v.value === "op.progress" },
    ],
    verbalize: {
      text: "LoadSceneAsync は ⟦0⟧ シーンを読み込む。await Awaitable.NextFrameAsync() は ⟦1⟧ ので、その間に画面が描き直されてロードバーが動く。op.progress は読み込みが終わっても ⟦2⟧。",
      blanks: [
        { choices: ["ゲームを止めずに裏で少しずつ", "読み込みが終わるまで画面を止めて"], answers: ["ゲームを止めずに裏で少しずつ"] },
        { choices: ["次のフレームまで待って Unity に処理を返す", "読み込みを速くする"], answers: ["次のフレームまで待って Unity に処理を返す"] },
        { choices: ["0.9 までしか増えない", "必ず 1.0 になる"], answers: ["0.9 までしか増えない"] },
      ],
    },
    explain: `
<p><code>SceneManager.LoadScene</code> は読み込みが終わるまで画面が止まります。重いステージだと数秒間固まったように見えるので、ロード画面を出したいときは <code>LoadSceneAsync</code> を使います。</p>
<p><code>async</code> を付けたメソッドの中では、<code>await</code> で「終わるまで待つ」と書けます。待っている間は Unity に処理が戻るので、画面が描き直され、ロードバーが動きます。while の中で await しないと、ループが1フレームの中で回り続けて固まります。コルーチンで yield を忘れたときと同じ理屈です。</p>
<p><code>op.progress</code> は読み込みが終わった時点で 0.9 になり、残りの 0.1 はシーンの切り替え処理です。0.9 で割ると 0〜1 のバーとして自然に見えます。Unity でよく知られたクセです。</p>
<p>コルーチンでも同じことは書けます。async / await が向いているのは、このように「時間のかかる処理を頼んで、終わるのを待つ」場面です。</p>`,
  },
  {
    id: "ranking",
    course: "async",
    title: "ランキングを通信で取得する",
    goal: "ボタンを押すと、サーバーからランキングを取ってきて表示する",
    fileName: "RankingView.cs",
    code: `using UnityEngine;
using UnityEngine.Networking;
using TMPro;

public class RankingView : MonoBehaviour
{
    [SerializeField] GameObject loadingIcon;
    [SerializeField] TextMeshProUGUI rankingText;
    const string Url = "https://example.com/api/ranking";

    // ランキングボタンの OnClick に登録する
    public async void OnClickRanking()
    {
        loadingIcon.SetActive(true);
        using UnityWebRequest req = UnityWebRequest.Get(Url);
        ⟦send⟧
        loadingIcon.SetActive(false);

        if (req.result != UnityWebRequest.Result.Success)
        {
            ⟦onError⟧
            return;
        }
        rankingText.text = req.downloadHandler.text;
    }
}`,
    slots: {
      send: { label: "通信の待ち方", type: "choice", options: ["await req.SendWebRequest();", "req.SendWebRequest();"], default: "await req.SendWebRequest();" },
      onError: {
        label: "失敗したとき",
        type: "choice",
        options: ['rankingText.text = "通信に失敗しました。もう一度お試しください";', "// 何もしない"],
        default: 'rankingText.text = "通信に失敗しました。もう一度お試しください";',
      },
    },
    env: [
      { name: "net", label: "通信状態", options: [opt("good", "良好（0.8秒）"), opt("slow", "遅い（3秒）"), opt("offline", "圏外")], default: "good" },
    ],
    simulate(v, env, G) {
      const click = 0.5;
      const latency = { good: 0.8, slow: 3, offline: 1.5 }[env.net];
      const awaits = v.send.startsWith("await");
      const end = click + (awaits ? latency : 0);
      const success = awaits && env.net !== "offline";
      const showError = !success && v.onError.startsWith("rankingText");
      const logs = [[click, "ランキングボタンが押された"]];
      if (!awaits) logs.push([click, "通信の完了を待たずに次の行へ進んだ（req.result は InProgress のまま）", "warn"]);
      if (success) logs.push([end, `通信成功（${latency} 秒）`]);
      else if (awaits) logs.push([end, "Cannot resolve destination host", "error"]);
      if (!success && !showError) logs.push([end + 0.1, "画面には何も表示されない。プレイヤーは失敗したことに気づけない", "warn"]);
      const rows = ["1位  sora   9800", "2位  hina   8450", "3位  kaito  7210"];
      return {
        duration: end + 1.5,
        draw(t) {
          G.bg();
          if (t < click) { G.panel("RANKING", ["▶ ランキングを見る"]); return; }
          if (t < end) {
            G.panel("RANKING", [" ", " ", "通信中…"]);
            G.spinner(t, undefined, 110);
            return;
          }
          if (success) G.panel("RANKING", rows);
          else if (showError) G.panel("RANKING", ["通信に失敗しました。", "もう一度お試しください"], { color: G.css("--enemy") });
          else G.panel("RANKING", [" "]);
          G.label(`req.result = ${success ? "Success" : awaits ? "ConnectionError" : "InProgress"}`);
        },
        logs,
      };
    },
    experiments: [
      { text: "通信状態を「遅い」にして、ロード中の表示を確かめよう", done: (v, e) => e.net === "slow" && v.send.startsWith("await") },
      { text: "圏外にしたら、どう表示される？", done: (v, e) => e.net === "offline" },
      { text: "await を消して、通信が良好なときに実行してみよう", done: (v, e) => !v.send.startsWith("await") },
      { text: "失敗したときの処理を消して、圏外で実行してみよう", done: (v, e) => v.onError.startsWith("//") && e.net === "offline" },
    ],
    verbalize: {
      text: "await req.SendWebRequest() は ⟦0⟧ 次の行に進む。その間もゲームは止まらないので、⟦1⟧。通信は ⟦2⟧ ので、result を確かめてプレイヤーに知らせる。",
      blanks: [
        { choices: ["通信が終わるまで待ってから", "通信を始めたらすぐに"], answers: ["通信が終わるまで待ってから"] },
        { choices: ["ロード中のアイコンを動かし続けられる", "通信が速くなる"], answers: ["ロード中のアイコンを動かし続けられる"] },
        { choices: ["圏外や混雑で失敗することがある", "必ず成功する"], answers: ["圏外や混雑で失敗することがある"] },
      ],
    },
    explain: `
<p>通信は、いつ終わるかわかりません。速いときは一瞬、遅いときは数秒、圏外なら失敗します。<code>await req.SendWebRequest()</code> と書くと、通信が終わるまで待ってから次の行へ進み、その間もゲームは動き続けます。これが async / await の代表的な使いどころです。</p>
<p>await を付け忘れると、通信を「始めただけ」で次の行に進みます。結果はまだ届いていないので、通信状態が良くても失敗扱いになります。</p>
<p>通信は失敗する前提で作ります。<code>req.result</code> を確かめて、失敗したらプレイヤーに伝え、もう一度試せるようにしましょう。何も表示しないと、プレイヤーには「ボタンが壊れている」ように見えます。</p>
<p>使い分けの目安：演出のための時間待ち（点滅、カウントダウン）はコルーチン。通信やロードのように「結果を受け取って次に進む」処理は async / await が向いています。</p>`,
  },
];
