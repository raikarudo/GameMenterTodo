// レッスンデータ
//
// 1レッスン = 体験（コピペして動かす）→ 壊して試す（スクラップ＆ビルド）→ 言葉にする → 解説（原理）
//
// code     : ⟦name⟧ が書き換え可能な場所（slots[name]）
// slots    : { type: "choice", options: [...], default } / { type: "number", default }
//            choice の option は文字列か { value, label }。value "" は「消す」
// env      : コードの外の条件（PCの性能、Inspectorの値など）。壊して試すステップで変えられる
// simulate : (v, env, G) => { duration, draw(t), logs: [[秒, 文字列, 種類?]], errors? }
//            v は slots の現在値（number は数値に変換済み）、G は app.js の描画ヘルパー
// experiments : 壊して試すお題。done(v, env) が true の状態で実行すると達成
// verbalize   : 言葉にするステップの日本語穴埋め（⟦n⟧ が blanks[n]）

const FPS = 60;
const REMOVE = (label = "（消す）") => ({ value: "", label });

window.COURSES = [
  { id: "basic", title: "コース1　動かしてから考える", desc: "まず動かし、壊し、言葉にする。Unity の基本操作を体で覚えるコース" },
  { id: "async", title: "コース2　コルーチンと非同期", desc: "1人でゲームを完成させた人向け。「待つ」処理の書き方を学ぶ次のステップ" },
];

window.LESSONS = [
  // ───────────────────────── コース1 ─────────────────────────
  {
    id: "move",
    course: "basic",
    title: "プレイヤーを動かす",
    goal: "キューブが右へ動き続けるスクリプト",
    fileName: "PlayerMove.cs",
    code: `using UnityEngine;

public class PlayerMove : MonoBehaviour
{
    float speed = ⟦speed⟧f;

    void Update()
    {
        this.transform.position ⟦op⟧ Vector3.⟦dir⟧ * speed⟦dt⟧;
    }
}`,
    slots: {
      speed: { type: "number", default: 2 },
      op: { type: "choice", options: ["+=", "="], default: "+=" },
      dir: { type: "choice", options: ["right", "left", "up", "zero"], default: "right" },
      dt: { type: "choice", options: [{ value: " * Time.deltaTime", label: " * Time.deltaTime" }, REMOVE()], default: " * Time.deltaTime" },
    },
    env: [
      { name: "fps", label: "PCの性能（1秒あたりのフレーム数）", options: [{ value: 30, label: "遅いPC 30fps" }, { value: 60, label: "普通 60fps" }, { value: 144, label: "速いPC 144fps" }], default: 60 },
    ],
    simulate(v, env, G) {
      const dirs = { right: [1, 0], left: [-1, 0], up: [0, 1], zero: [0, 0] };
      const [dx, dy] = dirs[v.dir];
      const fps = Number(env.fps);
      const perFrame = v.speed * (v.dt ? 1 / fps : 1);
      const amount = (t) => (v.op === "+=" ? perFrame * Math.floor(t * fps) : perFrame);
      const pos = (t) => `(${G.fmt(dx * amount(t))}, ${G.fmt(dy * amount(t))}, 0)`;
      return {
        duration: 4,
        draw(t) {
          G.bg();
          G.cube(G.wrapX(dx * amount(t)), G.wrapY(dy * amount(t)));
          G.label(`position = ${pos(t)}`);
          G.caption(`${fps}fps`);
        },
        logs: [1, 2, 3].map((s) => [s, `${s}秒後  position = ${pos(s)}`]),
      };
    },
    experiments: [
      { text: "向きを right 以外に変えると、どう動く？", done: (v) => v.dir !== "right" },
      { text: "speed の数字を変えてみよう。0 やマイナスにしたら？", done: (v) => v.speed !== 2 },
      { text: "* Time.deltaTime を消してみよう。そのまま PC の性能も変えて比べてみよう", done: (v, e) => v.dt === "" && Number(e.fps) !== 60 },
      { text: "+= を = にしたら、動き続ける？", done: (v) => v.op === "=" },
    ],
    verbalize: {
      text: "このコードは ⟦0⟧、自分の ⟦1⟧ に「右向き × 速さ × 前のフレームからの経過時間」を ⟦2⟧ いた。Time.deltaTime を掛けているので、PCの性能に関係なく 1秒あたり ⟦3⟧ だけ進む。",
      blanks: [
        { choices: ["最初に1回だけ", "毎フレーム", "1秒に1回"], answers: ["毎フレーム"] },
        { choices: ["位置", "大きさ", "色"], answers: ["位置"] },
        { choices: ["足し続けて", "上書きして", "掛けて"], answers: ["足し続けて"] },
        { choices: ["speed", "60", "1"], answers: ["speed"] },
      ],
    },
    explain: `
<p><code>this.transform</code> は「このスクリプトが付いている GameObject の Transform」です。Transform は位置（position）・回転（rotation）・大きさ（scale）を持つ部品で、どの GameObject にも必ず付いています。</p>
<p><code>Update()</code> は Unity が毎フレーム自動で呼びます。<code>+=</code> は「今の値に足す」なので、毎フレーム少しずつ足し続けた結果、動いて見えます。<code>=</code> にすると毎フレーム同じ値で上書きするだけなので、止まったままになります。</p>
<p><code>Time.deltaTime</code> は前のフレームからの経過秒数です。60fps なら約 0.016、30fps なら約 0.033 になります。これを掛けると「1フレームあたりの移動量」が「1秒あたりの移動量」に変わり、PCの性能が違っても同じ速さで動きます。掛け忘れると、速いPCほど速く動くゲームになってしまいます。</p>`,
  },
  {
    id: "rotate",
    course: "basic",
    title: "回転させる",
    goal: "キューブが回り続けるスクリプト",
    fileName: "Spinner.cs",
    code: `using UnityEngine;

public class Spinner : MonoBehaviour
{
    void ⟦when⟧()
    {
        transform.Rotate(Vector3.⟦axis⟧ * ⟦deg⟧f * Time.deltaTime);
    }
}`,
    slots: {
      when: { type: "choice", options: ["Update", "Start"], default: "Update" },
      axis: { type: "choice", options: ["up", "forward", "right"], default: "up" },
      deg: { type: "number", default: 90 },
    },
    simulate(v, env, G) {
      const angle = (t) => (v.when === "Update" ? v.deg * Math.floor(t * FPS) / FPS : v.deg / FPS);
      const axisName = { up: "Y", forward: "Z", right: "X" }[v.axis];
      return {
        duration: 5,
        draw(t) {
          G.bg();
          const a = angle(t);
          const r = (a * Math.PI) / 180;
          if (v.axis === "forward") G.cube(0, 1, { angle: -r });
          else if (v.axis === "up") G.cube(0, 1, { scaleX: Math.max(0.06, Math.abs(Math.cos(r))), shade: Math.cos(r) < 0 });
          else G.cube(0, 1, { scaleY: Math.max(0.06, Math.abs(Math.cos(r))), shade: Math.cos(r) < 0 });
          G.label(`${axisName}軸まわりに ${G.fmt(a, 0)}°`);
        },
        logs: [1, 2, 4].map((s) => [s, `${s}秒後  ${axisName}軸の角度 = ${G.fmt(angle(s), 1)}°`]),
      };
    },
    experiments: [
      { text: "90 を別の数字にしてみよう。マイナスにすると？", done: (v) => v.deg !== 90 },
      { text: "回す軸 up を forward や right に変えてみよう", done: (v) => v.axis !== "up" },
      { text: "Update を Start に変えたら、回り続ける？", done: (v) => v.when === "Start" },
    ],
    verbalize: {
      text: "Rotate は ⟦0⟧ さらに指定した角度だけ回す命令。Update に書くと ⟦1⟧ 少しずつ回るので回り続けて見えるが、Start に書くと ⟦2⟧ しか回らない。",
      blanks: [
        { choices: ["今の向きから", "0度の向きから"], answers: ["今の向きから"] },
        { choices: ["毎フレーム", "1秒に1回"], answers: ["毎フレーム"] },
        { choices: ["1回（1フレーム分）だけ", "10回だけ"], answers: ["1回（1フレーム分）だけ"] },
      ],
    },
    explain: `
<p><code>transform.Rotate()</code> は「今の向き」を基準に、さらに回します。毎フレーム呼べば少しずつ回り続けます。</p>
<p>前のレッスンの移動と同じく、<code>Time.deltaTime</code> を掛けているので、<code>90f</code> は「1秒に90度」という意味になります。Start は最初に1回しか呼ばれないので、1フレーム分（約1.5度）だけ回って止まります。</p>
<p><code>Vector3.up</code> は (0,1,0)、つまりY軸です。Unity では Y が上、Z が奥、X が右です。「どの軸を中心に回すか」をベクトルで指定しています。</p>`,
  },
  {
    id: "input",
    course: "basic",
    title: "キーで操作する",
    goal: "スペースキーでジャンプするスクリプト",
    fileName: "Jumper.cs",
    code: `using UnityEngine;

public class Jumper : MonoBehaviour
{
    void Update()
    {
        if (Input.⟦method⟧(KeyCode.⟦key⟧))
        {
            Debug.Log("ジャンプ！");
            transform.position += Vector3.up * 1f;
        }
    }
}
// ※ 落ちてくる動きは別のスクリプト（Gravity.cs）が担当`,
    slots: {
      method: { type: "choice", options: ["GetKeyDown", "GetKey", "GetKeyUp"], default: "GetKeyDown" },
      key: { type: "choice", options: ["Space", "Return", "A"], default: "Space" },
    },
    simulate(v, env, G) {
      // シミュレーション上のプレイヤーは 1.0〜2.0秒 の間スペースキーを押し続ける
      const pressed = (f) => f >= FPS && f < FPS * 2;
      const ys = [], logs = [];
      let y = 0, vy = 0, count = 0;
      for (let f = 0; f <= FPS * 4; f++) {
        const down = pressed(f) && !pressed(f - 1);
        const up = !pressed(f) && pressed(f - 1);
        const hit = v.key === "Space" && (v.method === "GetKey" ? pressed(f) : v.method === "GetKeyDown" ? down : up);
        if (hit) {
          count++;
          y += 1;
          vy = 0;
          if (count <= 3) logs.push([f / FPS, "ジャンプ！"]);
        }
        vy -= 9.8 / FPS;
        y = Math.max(0, y + vy / FPS);
        if (y === 0) vy = 0;
        ys.push(y);
      }
      if (count > 3) logs.push([2.05, `ジャンプ！ ×${count}（同じログをまとめて表示）`, "warn"]);
      if (count === 0) logs.push([2.05, "スペースキーを押したが、何も起きなかった", "warn"]);
      logs.push([0.99, "（スペースキーを押し始めた）", "frame"]);
      logs.push([1.99, "（スペースキーを離した）", "frame"]);
      logs.sort((a, b) => a[0] - b[0]);
      return {
        duration: 4,
        draw(t) {
          const f = Math.min(ys.length - 1, Math.floor(t * FPS));
          G.bg();
          G.cube(0, G.wrapY(ys[f]));
          G.key("Space", pressed(f));
          G.label(`position.y = ${G.fmt(ys[f])}`);
        },
        logs,
      };
    },
    experiments: [
      { text: "GetKeyDown を GetKey にしたら、ジャンプは何回起きる？", done: (v) => v.method === "GetKey" },
      { text: "GetKeyUp にすると、いつジャンプする？", done: (v) => v.method === "GetKeyUp" },
      { text: "KeyCode を Space 以外にしてみよう（押しているのはスペースキー）", done: (v) => v.key !== "Space" },
    ],
    verbalize: {
      text: "GetKeyDown はキーを ⟦0⟧ true になる。GetKey は ⟦1⟧ true なので、if の中が ⟦2⟧ 実行される。",
      blanks: [
        { choices: ["押した瞬間の1フレームだけ", "押している間ずっと", "離した瞬間だけ"], answers: ["押した瞬間の1フレームだけ"] },
        { choices: ["押した瞬間の1フレームだけ", "押している間ずっと", "離した瞬間だけ"], answers: ["押している間ずっと"] },
        { choices: ["1回だけ", "毎フレーム"], answers: ["毎フレーム"] },
      ],
    },
    explain: `
<p><code>Input.GetKeyDown</code> は押した瞬間のフレームだけ、<code>GetKey</code> は押している間の全フレームで、<code>GetKeyUp</code> は離した瞬間のフレームだけ <code>true</code> を返します。</p>
<p>if 文は Update の中にあるので、毎フレーム「今キーはどうなっている？」と確認しています。GetKey だと押している1秒間（60フレーム）ずっと true になり、ジャンプが60回起きます。ジャンプや攻撃のように1回だけ実行したい処理には GetKeyDown、移動のように押している間続ける処理には GetKey を使います。</p>
<p>Unity 6 の新しい Input System でも「押した瞬間」と「押している間」を区別する考え方は同じです。</p>`,
  },
  {
    id: "lifecycle",
    course: "basic",
    title: "Start と Update",
    goal: "呼ばれた回数を数えて表示するスクリプト",
    fileName: "Counter.cs",
    code: `using UnityEngine;

public class Counter : MonoBehaviour
{
    int count = 0;

    void ⟦method⟧()
    {
        count⟦inc⟧;
        Debug.Log("呼ばれた回数: " + count);
    }
}
// ※ 2.5秒後に、別のスクリプトがこのオブジェクトを Destroy する`,
    slots: {
      method: { type: "choice", options: ["Start", "Update", "Awake", "OnDestroy"], default: "Start" },
      inc: { type: "choice", options: ["++", " += 10", "--"], default: "++" },
    },
    simulate(v, env, G) {
      const destroyAt = 2.5;
      const step = { "++": 1, " += 10": 10, "--": -1 }[v.inc];
      const calls = v.method === "Update"
        ? Array.from({ length: Math.floor(destroyAt * FPS) }, (_, i) => i / FPS)
        : v.method === "OnDestroy" ? [destroyAt] : [0];
      const logs = [];
      calls.forEach((t, i) => {
        if (i < 3) logs.push([t, `呼ばれた回数: ${(i + 1) * step}`]);
      });
      if (calls.length > 3) logs.push([destroyAt, `…（合計 ${calls.length} 回呼ばれた。最後の値: ${calls.length * step}）`, "warn"]);
      logs.push([destroyAt, "（Destroy(gameObject) が実行された）", "frame"]);
      logs.sort((a, b) => a[0] - b[0]);
      const countAt = (t) => calls.filter((c) => c <= t).length * step;
      return {
        duration: 3.5,
        draw(t) {
          G.bg();
          if (t < destroyAt) G.cube(0, 0);
          else G.ghost(0, 0);
          G.bigText(String(countAt(t)));
          G.label(t < destroyAt ? "count" : "Destroy 済み");
        },
        logs,
      };
    },
    experiments: [
      { text: "Start を Update に変えたら、ログは何回出る？", done: (v) => v.method === "Update" },
      { text: "Awake にするとどうなる？ Start と違いはある？", done: (v) => v.method === "Awake" },
      { text: "OnDestroy にしたら、いつ呼ばれる？", done: (v) => v.method === "OnDestroy" },
      { text: "++ を += 10 や -- に変えてみよう", done: (v) => v.inc !== "++" },
    ],
    verbalize: {
      text: "Start は ⟦0⟧、Update は ⟦1⟧、OnDestroy は ⟦2⟧ に、Unity から自動で呼ばれる。だから自分で呼び出す必要は ⟦3⟧。",
      blanks: [
        { choices: ["最初に1回だけ", "毎フレーム", "消えるとき"], answers: ["最初に1回だけ"] },
        { choices: ["最初に1回だけ", "毎フレーム", "消えるとき"], answers: ["毎フレーム"] },
        { choices: ["最初に1回だけ", "毎フレーム", "消えるとき"], answers: ["消えるとき"] },
        { choices: ["ない", "ある"], answers: ["ない"] },
      ],
    },
    explain: `
<p>Start や Update のように、決まったタイミングで Unity が自動的に呼ぶメソッドを「イベント関数」と呼びます。名前のつづりが1文字でも違うと呼ばれません（<code>update</code> と小文字で書くと動かない）。</p>
<p>呼ばれる順番は Awake → OnEnable → Start → Update（毎フレーム）→ OnDestroy です。Awake と Start はどちらも最初に1回ですが、Awake の方が先に呼ばれます。「自分の準備は Awake、他のオブジェクトを使う処理は Start」と分けると、初期化の順番によるバグを防げます。</p>
<p><code>int count = 0;</code> をメソッドの外（クラスの中）に書いているので、count の値はフレームをまたいで残ります。これを「フィールド」と呼びます。</p>`,
  },
  {
    id: "serialize",
    course: "basic",
    title: "Inspector で調整する",
    goal: "速さを Inspector から変えられるスクリプト",
    fileName: "PlayerMove.cs",
    code: `using UnityEngine;

public class PlayerMove : MonoBehaviour
{
    ⟦attr⟧ float speed = 2f;

    void Update()
    {
        transform.position += Vector3.right * speed * Time.deltaTime;
    }
}

// ── 別ファイル GameManager.cs ──
public class GameManager : MonoBehaviour
{
    public PlayerMove player;

    void Start()
    {
        ⟦other⟧
    }
}`,
    slots: {
      attr: { type: "choice", options: ["[SerializeField] private", "private", "public"], default: "[SerializeField] private" },
      other: { type: "choice", options: ["// 何もしない", "player.speed = 10f;"], default: "// 何もしない" },
    },
    env: [
      { name: "inspector", label: "Inspector の Speed 欄に入れる値", options: [{ value: 5, label: "5" }, { value: 1, label: "1" }, { value: 0, label: "0" }], default: 5 },
    ],
    simulate(v, env, G) {
      const visible = v.attr !== "private";
      const assigns = v.other.startsWith("player.");
      if (assigns && v.attr !== "public") {
        return { errors: ["GameManager.cs: error CS0122: 'PlayerMove.speed' はアクセスできない保護レベルです"] };
      }
      const speed = assigns ? 10 : visible ? Number(env.inspector) : 2;
      const why = assigns ? "GameManager が 10 に書き換えた" : visible ? "Inspector の値が使われた" : "Inspector に出ないので初期値 2 のまま";
      return {
        duration: 4,
        draw(t) {
          G.bg();
          G.cube(G.wrapX(-5 + speed * t), 0);
          G.inspector("Player Move (Script)", visible ? [["Speed", String(env.inspector)]] : []);
          G.label(`speed = ${speed}`);
        },
        logs: [[0.2, `実行時の speed = ${speed}（${why}）`]],
      };
    },
    experiments: [
      { text: "[SerializeField] を消して private だけにしたら、Inspector はどうなる？", done: (v) => v.attr === "private" },
      { text: "Inspector の値を変えて実行してみよう。コードの 2f とどちらが使われる？", done: (v, e) => v.attr !== "private" && Number(e.inspector) !== 5 },
      { text: "GameManager から player.speed = 10f; と書き換えてみよう", done: (v) => v.other.startsWith("player.") },
      { text: "public にしてから、もう一度 GameManager で書き換えてみよう", done: (v) => v.attr === "public" && v.other.startsWith("player.") },
    ],
    verbalize: {
      text: "Inspector に表示されるのは ⟦0⟧ フィールド。private のままでも ⟦1⟧ を付ければ、他のスクリプトからは書き換えられないまま Inspector で調整できる。Inspector に入れた値は、コードに書いた初期値 2f より ⟦2⟧。",
      blanks: [
        { choices: ["public か [SerializeField] の付いた", "private の", "すべての"], answers: ["public か [SerializeField] の付いた"] },
        { choices: ["[SerializeField]", "public", "static"], answers: ["[SerializeField]"] },
        { choices: ["優先される", "無視される"], answers: ["優先される"] },
      ],
    },
    explain: `
<p><code>private</code> はそのクラスの中からしか触れない、<code>public</code> はどこからでも触れる、という意味です。public は便利ですが、どこで書き換えられたか追いにくくなり、バグの原因になります。</p>
<p>Unity は public フィールドと <code>[SerializeField]</code> の付いたフィールドを「保存する値」として扱い、Inspector に表示します。Inspector で入れた値はシーンに保存され、ゲーム開始時にコードの初期値（<code>= 2f</code>）を上書きします。</p>
<p>「Inspector で調整したいけれど、他のスクリプトからは触らせたくない」場合は <code>[SerializeField] private</code> と書くのが定番です。</p>`,
  },
  {
    id: "collision",
    course: "basic",
    title: "ぶつかったら消す",
    goal: "敵にぶつかったら敵を消すスクリプト",
    fileName: "PlayerHit.cs",
    code: `using UnityEngine;

public class PlayerHit : MonoBehaviour
{
    void OnCollisionEnter(Collision collision)
    {
        if (collision.gameObject.CompareTag("⟦tag⟧"))
        {
            Destroy(⟦target⟧);
        }
    }
}
// ※ プレイヤーは別のスクリプトで右へ進み続ける。赤 = Enemy タグ、黄 = Coin タグ`,
    slots: {
      tag: { type: "choice", options: ["Enemy", "Coin", "Player"], default: "Enemy" },
      target: { type: "choice", options: ["collision.gameObject", "gameObject", "this"], default: "collision.gameObject" },
    },
    simulate(v, env, G) {
      const objs = [
        { x: -1, tag: "Enemy", color: "--enemy", alive: true, hitAt: null },
        { x: 3, tag: "Coin", color: "--coin", alive: true, hitAt: null },
      ];
      const frames = [], logs = [];
      let px = -5, playerAlive = true, scriptAlive = true, blocked = false;
      for (let f = 0; f <= FPS * 6; f++) {
        if (playerAlive && !blocked) px += 2 / FPS;
        const next = objs.find((o) => o.alive && px >= o.x - 1 && o.hitAt === null);
        if (playerAlive && next) {
          next.hitAt = f / FPS;
          logs.push([f / FPS, `OnCollisionEnter  相手: ${next.tag}`]);
          if (scriptAlive && next.tag === v.tag) {
            if (v.target === "collision.gameObject") { next.alive = false; logs.push([f / FPS, `${next.tag} を Destroy`]); }
            else if (v.target === "gameObject") { playerAlive = false; logs.push([f / FPS, "Player（自分自身）を Destroy", "warn"]); }
            else { scriptAlive = false; logs.push([f / FPS, "PlayerHit スクリプトだけが消えた（見た目は残る）", "warn"]); }
          } else if (scriptAlive) {
            logs.push([f / FPS, `タグが "${v.tag}" ではないので何もしない`, "frame"]);
          }
          if (next.alive && playerAlive) { blocked = true; px = next.x - 1; }
        }
        frames.push({ px, playerAlive, alive: objs.map((o) => o.alive) });
      }
      if (blocked) logs.push([6, "プレイヤーは障害物に止められたまま", "frame"]);
      return {
        duration: 6,
        draw(t) {
          const s = frames[Math.min(frames.length - 1, Math.floor(t * FPS))];
          G.bg();
          objs.forEach((o, i) => s.alive[i] ? G.cube(o.x, 0, { color: G.css(o.color) }) : null);
          if (s.playerAlive) G.cube(s.px, 0); else G.ghost(s.px, 0);
          G.label(`tag = "${v.tag}" / Destroy(${v.target})`);
        },
        logs,
      };
    },
    experiments: [
      { text: "Destroy の中身を gameObject にしたら、何が消える？", done: (v) => v.target === "gameObject" },
      { text: "this にしたら、何が消える？（見た目に注目）", done: (v) => v.target === "this" },
      { text: "タグを Coin にしたら、コインは消える？", done: (v) => v.tag === "Coin" },
    ],
    verbalize: {
      text: "OnCollisionEnter は ⟦0⟧ に呼ばれ、引数の collision には ⟦1⟧ の情報が入っている。Destroy(gameObject) と書くと ⟦2⟧ が消える。",
      blanks: [
        { choices: ["何かにぶつかった瞬間", "毎フレーム", "ゲーム開始時"], answers: ["何かにぶつかった瞬間"] },
        { choices: ["ぶつかった相手", "自分自身", "シーン全体"], answers: ["ぶつかった相手"] },
        { choices: ["ぶつかった相手", "自分自身", "スクリプトだけ"], answers: ["自分自身"] },
      ],
    },
    explain: `
<p>Collider と Rigidbody を持つ物体同士がぶつかると、Unity が <code>OnCollisionEnter</code> を呼びます。引数の <code>collision</code> には相手の情報が入っていて、<code>collision.gameObject</code> で相手の GameObject を取り出せます。</p>
<p><code>gameObject</code>（小文字）は「このスクリプトが付いている GameObject」、<code>this</code> は「このスクリプト（コンポーネント）自体」です。<code>Destroy(this)</code> はスクリプトという部品を1つ外すだけなので、見た目は残ります。</p>
<p>相手の種類は <code>CompareTag("タグ名")</code> で見分けます。タグは Inspector の上部で設定します。Is Trigger をオンにしたすり抜ける当たり判定では、代わりに <code>OnTriggerEnter(Collider other)</code> が呼ばれます。</p>`,
  },
  {
    id: "spawn",
    course: "basic",
    title: "弾を撃つ",
    goal: "スペースキーで弾を生成するスクリプト",
    fileName: "Shooter.cs",
    code: `using UnityEngine;

public class Shooter : MonoBehaviour
{
    [SerializeField] GameObject bulletPrefab;

    void Update()
    {
        ⟦cond⟧
            Instantiate(bulletPrefab, transform.position, Quaternion.identity);
    }
}
// ※ 弾は別のスクリプトで右へ飛んでいく`,
    slots: {
      cond: {
        type: "choice",
        options: ["if (Input.GetKeyDown(KeyCode.Space))", "if (Input.GetKey(KeyCode.Space))", REMOVE("（if を消す）")],
        default: "if (Input.GetKeyDown(KeyCode.Space))",
      },
    },
    simulate(v, env, G) {
      // 0.5秒に軽く1回押し、1.5〜2.5秒は押しっぱなし
      const pressed = (f) => (f >= 30 && f < 36) || (f >= 90 && f < 150);
      const spawns = [];
      for (let f = 0; f <= FPS * 3; f++) {
        const down = pressed(f) && !pressed(f - 1);
        const hit = v.cond === "" ? true : v.cond.includes("GetKeyDown") ? down : pressed(f);
        if (hit) spawns.push(f / FPS);
      }
      const countAt = (t) => spawns.filter((s) => s <= t).length;
      const logs = [1, 2, 3].map((s) => [s, `${s}秒後  Hierarchy の Bullet(Clone): ${countAt(s)} 個`]);
      if (countAt(3) > 100) logs.push([3, "オブジェクトが増え続けて、ゲームが重くなっていく", "warn"]);
      return {
        duration: 3.5,
        draw(t) {
          G.bg();
          G.cube(-5, 0);
          spawns.filter((s) => s <= t).slice(-300).forEach((s) => {
            const x = -4.4 + (t - s) * 6;
            if (x < 6.5) G.bullet(x, 0.5);
          });
          G.key("Space", pressed(Math.floor(t * FPS)));
          G.label(`Bullet(Clone) × ${countAt(t)}`);
        },
        logs,
      };
    },
    experiments: [
      { text: "GetKeyDown を GetKey にしたら、押しっぱなしのとき何発出る？", done: (v) => v.cond.includes("GetKey(") },
      { text: "if の行を消したらどうなる？", done: (v) => v.cond === "" },
    ],
    verbalize: {
      text: "Instantiate は Prefab の ⟦0⟧ を作る命令。Update の中に条件なしで書くと ⟦1⟧ 弾が作られ、if (Input.GetKeyDown(...)) で囲むと ⟦2⟧ だけ作られる。",
      blanks: [
        { choices: ["コピー（複製）", "元のデータ"], answers: ["コピー（複製）"] },
        { choices: ["毎フレーム", "1回だけ"], answers: ["毎フレーム"] },
        { choices: ["キーを押した瞬間", "押している間ずっと"], answers: ["キーを押した瞬間"] },
      ],
    },
    explain: `
<p><code>Instantiate(元, 位置, 回転)</code> は Prefab をコピーして、新しい GameObject をシーンに作ります。作られたものの名前には <code>(Clone)</code> が付きます。<code>Quaternion.identity</code> は「回転なし」という意味です。</p>
<p>Update は毎フレーム呼ばれるので、条件なしで書くと1秒に60個ずつ増えます。生成した弾は自分で消さない限り残り続けるので、実際のゲームでは弾側に <code>Destroy(gameObject, 3f);</code>（3秒後に消す）などを書きます。</p>`,
  },

  // ───────────────────────── コース2 ─────────────────────────
  {
    id: "coroutine",
    course: "async",
    title: "コルーチンで待つ",
    goal: "3, 2, 1, スタート！とカウントダウンするスクリプト",
    fileName: "Countdown.cs",
    code: `using System.Collections;
using UnityEngine;

public class Countdown : MonoBehaviour
{
    void Start()
    {
        ⟦call⟧
    }

    IEnumerator CountdownRoutine()
    {
        Debug.Log("3");
        ⟦wait⟧
        Debug.Log("2");
        yield return new WaitForSeconds(1f);
        Debug.Log("1");
        yield return new WaitForSeconds(1f);
        Debug.Log("スタート！");
    }
}`,
    slots: {
      call: { type: "choice", options: ["StartCoroutine(CountdownRoutine());", "CountdownRoutine();"], default: "StartCoroutine(CountdownRoutine());" },
      wait: {
        type: "choice",
        options: ["yield return new WaitForSeconds(1f);", "yield return new WaitForSeconds(3f);", "yield return null;", REMOVE()],
        default: "yield return new WaitForSeconds(1f);",
      },
    },
    simulate(v, env, G) {
      if (!v.call.startsWith("StartCoroutine")) {
        return {
          duration: 3,
          draw() { G.bg(); G.cube(0, 0); G.bigText("…"); G.label("何も表示されない"); },
          logs: [[0.3, "（Console に何も出ない）", "frame"]],
        };
      }
      const w = { "yield return new WaitForSeconds(1f);": 1, "yield return new WaitForSeconds(3f);": 3, "yield return null;": 1 / FPS, "": 0 }[v.wait];
      const events = [[0, "3"], [w, "2"], [w + 1, "1"], [w + 2, "スタート！"]];
      return {
        duration: w + 3,
        draw(t) {
          G.bg();
          G.cube(0, 0);
          const cur = events.filter((e) => e[0] <= t).pop();
          G.bigText(cur ? cur[1] : "");
          G.label(`経過 ${t.toFixed(2)} 秒`);
        },
        logs: events.map(([t, s]) => [t, `${s}  （${t.toFixed(2)}秒）`]),
      };
    },
    experiments: [
      { text: "最初の待ち時間を 3f にしてみよう", done: (v) => v.wait.includes("3f") },
      { text: "yield return null; にすると、どれくらい待つ？", done: (v) => v.wait === "yield return null;" },
      { text: "最初の yield の行を消してみよう", done: (v) => v.wait === "" },
      { text: "StartCoroutine を使わずに CountdownRoutine(); と直接呼んだら？", done: (v) => !v.call.startsWith("StartCoroutine") },
    ],
    verbalize: {
      text: "yield return はコルーチンを ⟦0⟧、⟦1⟧ に続きから再開させる。yield return null は ⟦2⟧ 待つ。StartCoroutine を使わずに直接呼ぶと ⟦3⟧。",
      blanks: [
        { choices: ["そこで一時停止させ", "そこで終了させ"], answers: ["そこで一時停止させ"] },
        { choices: ["指定した時間がたったとき", "次にキーを押したとき"], answers: ["指定した時間がたったとき"] },
        { choices: ["1フレームだけ", "1秒", "永遠に"], answers: ["1フレームだけ"] },
        { choices: ["中身が何も実行されない", "普通に実行される"], answers: ["中身が何も実行されない"] },
      ],
    },
    explain: `
<p>普通のメソッドは、呼ばれたら最後まで一気に実行されます。途中で「1秒待つ」と書くと、その間ゲーム全体が止まってしまいます。</p>
<p>コルーチンは <code>IEnumerator</code> を返すメソッドで、<code>yield return</code> の行で一時停止できます。Unity が待ち時間を管理し、時間が来たら続きから再開してくれるので、待っている間もゲームは動き続けます。<code>WaitForSeconds(1f)</code> は1秒、<code>null</code> は次のフレームまで待ちます。</p>
<p>コルーチンは <code>StartCoroutine()</code> に渡して初めて動きます。<code>CountdownRoutine();</code> と直接呼ぶと、「実行の準備をした入れ物」が作られるだけで、中身は1行も実行されません。エラーも出ないので気づきにくい間違いです。</p>`,
  },
  {
    id: "spawn-loop",
    course: "async",
    title: "一定間隔で敵を出す",
    goal: "1秒ごとに敵を出し続けるスクリプト",
    fileName: "EnemySpawner.cs",
    code: `using System.Collections;
using UnityEngine;

public class EnemySpawner : MonoBehaviour
{
    [SerializeField] GameObject enemyPrefab;

    void Start()
    {
        StartCoroutine(SpawnLoop());
    }

    IEnumerator SpawnLoop()
    {
        while (true)
        {
            Instantiate(enemyPrefab, RandomPosition(), Quaternion.identity);
            ⟦wait⟧
        }
    }
}`,
    slots: {
      wait: {
        type: "choice",
        options: ["yield return new WaitForSeconds(1f);", "yield return new WaitForSeconds(0.2f);", "yield return null;", REMOVE()],
        default: "yield return new WaitForSeconds(1f);",
      },
    },
    simulate(v, env, G) {
      const xs = Array.from({ length: 400 }, (_, i) => ((i * 7919) % 1100) / 100 - 5.5);
      if (v.wait === "") {
        return {
          duration: 3,
          draw(t) {
            G.bg();
            G.overlay("Unity（応答なし）", "while(true) が1フレームの中で永遠に回り続けている");
          },
          logs: [[0.4, "Unity エディタが固まった。タスクマネージャーで強制終了するしかない", "error"]],
        };
      }
      const interval = { "yield return new WaitForSeconds(1f);": 1, "yield return new WaitForSeconds(0.2f);": 0.2, "yield return null;": 1 / FPS }[v.wait];
      const countAt = (t) => Math.floor(t / interval) + 1;
      return {
        duration: 4,
        draw(t) {
          G.bg();
          const n = countAt(t);
          for (let i = 0; i < Math.min(n, xs.length); i++) G.cube(xs[i], (i % 4) * 0.15, { color: G.css("--enemy"), size: 0.6 });
          G.label(`Enemy(Clone) × ${n}`);
        },
        logs: [1, 2, 3].map((s) => [s, `${s}秒後  敵の数: ${countAt(s)}`]),
      };
    },
    experiments: [
      { text: "待ち時間を 0.2f にしてみよう", done: (v) => v.wait.includes("0.2f") },
      { text: "yield return null; にしたら？", done: (v) => v.wait === "yield return null;" },
      { text: "yield の行を消してみよう（何が起きるか予想してから）", done: (v) => v.wait === "" },
    ],
    verbalize: {
      text: "while (true) は終わらないループだが、yield return があるので ⟦0⟧。yield を消すと ⟦1⟧、Unity が固まる。",
      blanks: [
        { choices: ["毎回 Unity に処理を返している", "ループが自動で止まる"], answers: ["毎回 Unity に処理を返している"] },
        { choices: ["1フレームの中で永遠にループし続け", "1秒ごとにループし"], answers: ["1フレームの中で永遠にループし続け"] },
      ],
    },
    explain: `
<p>Unity は1つのフレームの中で、すべてのスクリプトの処理を順番に実行してから画面を描きます。どこかの処理が終わらないと、次のフレームに進めません。</p>
<p><code>yield return</code> は「いったん Unity に処理を返す」という意味です。だから <code>while (true)</code> の中に yield があれば、1周ごとに Unity へ処理が戻り、ゲームは普通に動きます。yield を消すと、ループが1フレームの中で永遠に回り続けて、エディタごと固まります。</p>
<p>この「無限ループで固まる」事故は Update に while を書いたときにも起きます。ループを書いたら「どこで Unity に処理を返すか」を必ず確認しましょう。</p>`,
  },
  {
    id: "stop-coroutine",
    course: "async",
    title: "コルーチンを止める",
    goal: "点滅を、スペースキーで止めるスクリプト",
    fileName: "Blinker.cs",
    code: `using System.Collections;
using UnityEngine;

public class Blinker : MonoBehaviour
{
    [SerializeField] Renderer rend;
    Coroutine blink;

    void Start()
    {
        blink = StartCoroutine(Blink());
    }

    void Update()
    {
        if (Input.GetKeyDown(KeyCode.Space))
        {
            ⟦stop⟧
        }
    }

    IEnumerator Blink()
    {
        while (true)
        {
            rend.enabled = !rend.enabled;
            yield return new WaitForSeconds(⟦interval⟧f);
        }
    }
}
// ※ 2.2秒の時点でスペースキーを押す`,
    slots: {
      stop: { type: "choice", options: ["StopCoroutine(blink);", "StopAllCoroutines();", "StartCoroutine(Blink());", REMOVE("// 何もしない")], default: "StopCoroutine(blink);" },
      interval: { type: "number", default: 0.5 },
    },
    simulate(v, env, G) {
      const spaceAt = 2.2, end = 5;
      const iv = Math.max(1 / FPS, v.interval);
      const routines = [{ start: 0, stop: Infinity }];
      if (v.stop.startsWith("Stop")) routines[0].stop = spaceAt;
      if (v.stop.startsWith("StartCoroutine")) routines.push({ start: spaceAt, stop: Infinity });
      const toggles = [];
      routines.forEach((r) => { for (let t = r.start; t < Math.min(r.stop, end); t += iv) toggles.push(t); });
      toggles.sort((a, b) => a - b);
      const visibleAt = (t) => toggles.filter((x) => x <= t).length % 2 === 0;
      const msg = { "StopCoroutine(blink);": "StopCoroutine で点滅を止めた", "StopAllCoroutines();": "StopAllCoroutines で全部止めた", "StartCoroutine(Blink());": "同じコルーチンをもう1つ開始した", "": "何もしない" }[v.stop];
      return {
        duration: end,
        draw(t) {
          G.bg();
          if (visibleAt(t)) G.cube(0, 0); else G.ghost(0, 0);
          G.key("Space", t >= spaceAt && t < spaceAt + 0.15);
          G.label(`rend.enabled = ${visibleAt(t)}  /  動いているコルーチン: ${routines.filter((r) => r.start <= t && t < r.stop).length}`);
        },
        logs: [
          [spaceAt, `スペースキー → ${msg}`],
          [end - 0.1, `最後の状態: ${visibleAt(end - 0.01) ? "見えている" : "消えたまま"}`, "frame"],
        ],
      };
    },
    experiments: [
      { text: "そのまま何度か実行して、止まったあと見えている？消えている？", done: (v) => v.stop === "StopCoroutine(blink);" },
      { text: "interval を変えると、止まったときの状態は変わる？", done: (v) => v.interval !== 0.5 && v.stop.startsWith("Stop") },
      { text: "StartCoroutine(Blink()); にしたら、点滅はどうなる？", done: (v) => v.stop.startsWith("StartCoroutine") },
    ],
    verbalize: {
      text: "StopCoroutine は実行中のコルーチンを ⟦0⟧。止めた瞬間の状態（見えている／消えている）は ⟦1⟧。StartCoroutine をもう一度呼ぶと ⟦2⟧。",
      blanks: [
        { choices: ["その場で止める", "最後まで実行してから止める"], answers: ["その場で止める"] },
        { choices: ["そのまま残る", "最初の状態に戻る"], answers: ["そのまま残る"] },
        { choices: ["同じ処理がもう1つ増える", "最初からやり直しになる"], answers: ["同じ処理がもう1つ増える"] },
      ],
    },
    explain: `
<p><code>StartCoroutine</code> は、動き始めたコルーチンを <code>Coroutine</code> 型の値として返します。これを変数に取っておくと、あとで <code>StopCoroutine(変数)</code> で止められます。</p>
<p>止めた瞬間に元の状態へ戻してくれるわけではありません。点滅の途中で止めると、消えたままになることがあります。止めたあとに <code>rend.enabled = true;</code> のように状態を整える処理を書くのが安全です。</p>
<p>止めずにもう一度 StartCoroutine を呼ぶと、同じコルーチンが2つ並行して動きます。「ボタンを連打したら処理が二重に走った」というバグの典型的な原因です。また、GameObject を Destroy したり非アクティブにしたりすると、その上で動いていたコルーチンはすべて自動で止まります。</p>`,
  },
  {
    id: "async-await",
    course: "async",
    title: "async / await で待つ",
    goal: "2秒待ってからキューブを持ち上げるスクリプト（Unity 6 の Awaitable）",
    fileName: "Loader.cs",
    code: `using UnityEngine;

public class Loader : MonoBehaviour
{
    async void Start()
    {
        Debug.Log("ロード開始");
        ⟦wait⟧
        Debug.Log("ロード完了");
        transform.position += Vector3.up * 2f;
    }
}`,
    slots: {
      wait: {
        type: "choice",
        options: [
          "await Awaitable.WaitForSecondsAsync(2f);",
          "Awaitable.WaitForSecondsAsync(2f);",
          "await Awaitable.WaitForSecondsAsync(2f, destroyCancellationToken);",
        ],
        default: "await Awaitable.WaitForSecondsAsync(2f);",
      },
    },
    env: [
      { name: "destroy", label: "1秒後にこのオブジェクトを Destroy する", options: [{ value: "no", label: "しない" }, { value: "yes", label: "する" }], default: "no" },
    ],
    simulate(v, env, G) {
      const destroyAt = env.destroy === "yes" ? 1 : Infinity;
      const awaits = v.wait.startsWith("await");
      const token = v.wait.includes("destroyCancellationToken");
      const doneAt = awaits ? 2 : 0;
      const logs = [[0, "ロード開始"]];
      if (!awaits) logs.unshift([0, "warning CS4014: この呼び出しは待機されません。await を付けることを検討してください", "warn"]);
      let moved = false;
      if (destroyAt < Infinity) logs.push([destroyAt, "（Destroy(gameObject) が実行された）", "frame"]);
      if (doneAt < destroyAt) {
        logs.push([doneAt, "ロード完了"]);
        moved = true;
      } else if (token) {
        logs.push([destroyAt, "待機がキャンセルされたので、ここから先は実行されない", "frame"]);
      } else {
        logs.push([doneAt, "ロード完了"]);
        logs.push([doneAt, "MissingReferenceException: The object of type 'Transform' has been destroyed but you are still trying to access it.", "error"]);
      }
      logs.sort((a, b) => a[0] - b[0]);
      return {
        duration: 3.5,
        draw(t) {
          G.bg();
          const y = moved && t >= doneAt ? 2 : 0;
          if (t < destroyAt) G.cube(0, y); else G.ghost(0, 0);
          G.label(`経過 ${t.toFixed(1)} 秒`);
        },
        logs,
      };
    },
    experiments: [
      { text: "await を消してみよう。いつ「ロード完了」が出る？", done: (v) => !v.wait.startsWith("await") },
      { text: "「1秒後に Destroy する」をオンにして実行してみよう", done: (v, e) => e.destroy === "yes" && v.wait === "await Awaitable.WaitForSecondsAsync(2f);" },
      { text: "Destroy をオンにしたまま、destroyCancellationToken 付きにしたら？", done: (v, e) => e.destroy === "yes" && v.wait.includes("destroyCancellationToken") },
    ],
    verbalize: {
      text: "await は ⟦0⟧ 処理を一時停止する。ただしコルーチンと違い、オブジェクトを Destroy しても ⟦1⟧ ので、destroyCancellationToken を渡して ⟦2⟧。",
      blanks: [
        { choices: ["Unity 全体を止めずに", "Unity 全体を止めて"], answers: ["Unity 全体を止めずに"] },
        { choices: ["自動では止まらない", "自動で止まる"], answers: ["自動では止まらない"] },
        { choices: ["消えたときに待機をキャンセルする", "待ち時間を短くする"], answers: ["消えたときに待機をキャンセルする"] },
      ],
    },
    explain: `
<p><code>async</code> を付けたメソッドの中では、<code>await</code> で「終わるまで待つ」と書けます。コルーチンと同じく、待っている間もゲームは動き続けます。Unity 6 では <code>Awaitable.WaitForSecondsAsync()</code> などが用意されています。</p>
<p>await を付け忘れると、待つ処理を「開始しただけ」で次の行に進んでしまいます。コンパイラは警告 CS4014 で教えてくれるので、警告を読む習慣をつけましょう。</p>
<p>コルーチンは GameObject が消えると自動で止まりますが、async メソッドは止まりません。消えたあとに <code>transform</code> を触ると MissingReferenceException になります。<code>destroyCancellationToken</code> を渡すと、オブジェクトが消えた時点で待機がキャンセルされ、続きは実行されません。</p>
<p>使い分けの目安：Unity の古いバージョンや、見た目の演出（点滅・カウントダウン）にはコルーチン。結果を返す処理や、通信・ファイル読み込みなどの非同期 API と組み合わせるときは async / await が向いています。</p>`,
  },
];
