// 問題データ
// code 内の ⟦n⟧ が n 番目の空欄になる（C# の [] や {} と衝突しない記号を使う）
// blanks[n]:
//   answers  正解の候補（空白を無視して比較）
//   hint     ヒント
//   choices  指定するとプルダウン式になる
//   mistakes よくある誤答 → 疑似コンパイルエラーの文言
// console: 正解時に Console に出す行（"--" で始まる行はフレーム区切りの注記）
// scene:   正解時に Scene ビューで再生する動き（app.js の SCENES を参照）

window.CHAPTERS = [
  { id: "csharp", title: "第1章 C#の基礎" },
  { id: "mono", title: "第2章 MonoBehaviourの基礎" },
  { id: "physics", title: "第3章 物理・衝突・生成" },
];

window.PROBLEMS = [
  // ───────── 第1章 C#の基礎 ─────────
  {
    id: "cs-variables",
    chapter: "csharp",
    title: "変数と型",
    goal: "スコア・速度・名前・生存フラグを、それぞれ適切な型の変数に入れてください。",
    lesson:
      "C#では変数を宣言するときに型を書きます。整数は <code>int</code>、小数は <code>float</code>、文字列は <code>string</code>、真偽値は <code>bool</code> です。Unityでは小数に <code>float</code> を使うのが基本で、数値の末尾に <code>f</code> を付けます。",
    code: `int score = 10;
⟦0⟧ speed = 2.5⟦1⟧;
⟦2⟧ playerName = "Hero";
⟦3⟧ isAlive = true;

Debug.Log(playerName + " score:" + score + " speed:" + speed + " alive:" + isAlive);`,
    blanks: [
      { answers: ["float"], hint: "小数を入れる型。Unityの座標や速度でよく使います。", mistakes: { double: "error CS0029: 'double' はUnityでは使えますが、この教材では float を使います" } },
      { answers: ["f", "F"], hint: "float の数値リテラルには末尾に1文字付けます。", mistakes: { "": "error CS0664: double 型のリテラルを float に暗黙変換できません。末尾に 'f' を付けてください" } },
      { answers: ["string", "String"], hint: "文字列の型。小文字で始まります。" },
      { answers: ["bool"], hint: "true / false を入れる型。", mistakes: { boolean: "error CS0246: 型 'boolean' が見つかりません（C#では bool）" } },
    ],
    console: ["Hero score:10 speed:2.5 alive:True"],
    scene: "none",
    explain:
      "float の <code>2.5f</code> の f を忘れると、C#は <code>2.5</code> を double とみなしてコンパイルエラーになります。Unityで最初によく出会うエラーです。",
  },
  {
    id: "cs-if",
    chapter: "csharp",
    title: "if文で条件分岐",
    goal: "HPが0以下になったら「ゲームオーバー」、それ以外は「生存中」と出力してください。",
    lesson:
      "<code>if (条件) { ... } else { ... }</code> で処理を分けます。比較演算子は <code>==</code> <code>!=</code> <code>&lt;</code> <code>&lt;=</code> <code>&gt;</code> <code>&gt;=</code> です。",
    code: `int hp = 0;

⟦0⟧ (hp ⟦1⟧ 0)
{
    Debug.Log("ゲームオーバー");
}
⟦2⟧
{
    Debug.Log("生存中");
}`,
    blanks: [
      { answers: ["if"], hint: "条件分岐のキーワード。" },
      { answers: ["<="], hint: "「以下」を表す比較演算子。", mistakes: { "=<": "error CS1525: '=<' は無効な式です（正しくは '<='）", "<": "コンパイルは通りますが、hp が 0 のときにゲームオーバーになりません" } },
      { answers: ["else"], hint: "条件に当てはまらなかったときの分岐。" },
    ],
    console: ["ゲームオーバー"],
    scene: "none",
    explain: "<code>&lt;=</code> は「以下」、<code>&lt;</code> は「未満」です。境界の値（ここでは0）がどちらに入るかを意識すると、バグを減らせます。",
  },
  {
    id: "cs-for",
    chapter: "csharp",
    title: "for文で繰り返し",
    goal: "敵を3体出現させるログを、for文で3回出力してください。",
    lesson:
      "<code>for (初期化; 条件; 更新)</code> で決まった回数だけ繰り返します。<code>i++</code> は「i を1増やす」という意味です。",
    code: `for (int i = 0; i ⟦0⟧ 3; i⟦1⟧)
{
    Debug.Log("敵" + i + "が出現");
}`,
    blanks: [
      { answers: ["<"], hint: "0,1,2 の3回で止めたい。", mistakes: { "<=": "0,1,2,3 の4回ループしてしまいます" } },
      { answers: ["++", "+=1"], hint: "1ずつ増やす演算子（記号2文字）。" },
    ],
    console: ["敵0が出現", "敵1が出現", "敵2が出現"],
    scene: "none",
    explain: "0 から数え始めて <code>&lt; 個数</code> で止めるのがC#の定番の書き方です。配列の添字も0から始まるので、相性が良い書き方です。",
  },
  {
    id: "cs-list",
    chapter: "csharp",
    title: "配列とList",
    goal: "アイテム一覧の List に「剣」を追加し、所持数を出力してください。",
    lesson:
      "配列 <code>int[]</code> は長さが固定です。<code>List&lt;T&gt;</code> は後から要素を追加・削除できます。使うには <code>using System.Collections.Generic;</code> が必要です。",
    code: `using System.Collections.Generic;

int[] scores = new int[3] { 10, 20, 30 };
Debug.Log("最初のスコア:" + scores[⟦0⟧]);

⟦1⟧<string> items = new List<string>();
items.⟦2⟧("剣");
items.Add("盾");
Debug.Log("所持数:" + items.⟦3⟧);`,
    blanks: [
      { answers: ["0"], hint: "配列の先頭の添字は？" },
      { answers: ["List"], hint: "可変長のコレクション型の名前。" },
      { answers: ["Add"], hint: "要素を末尾に追加するメソッド。" },
      { answers: ["Count"], hint: "List の要素数を表すプロパティ（配列の場合は Length）。", mistakes: { Length: "error CS1061: 'List<string>' に 'Length' の定義がありません（List は Count）" } },
    ],
    console: ["最初のスコア:10", "所持数:2"],
    scene: "none",
    explain: "配列は <code>Length</code>、List は <code>Count</code> で要素数を取ります。混同しやすいので注意してください。",
  },
  {
    id: "cs-method",
    chapter: "csharp",
    title: "メソッド",
    goal: "2つの整数を足して返すメソッド Add と、値を返さないメソッド ShowScore を完成させてください。",
    lesson:
      "メソッドは <code>戻り値の型 名前(引数) { ... }</code> の形で書きます。値を返すときは <code>return</code>、何も返さないときは戻り値の型を <code>void</code> にします。",
    code: `int Add(int a, int b)
{
    ⟦0⟧ a + b;
}

⟦1⟧ ShowScore(int score)
{
    Debug.Log("スコア:" + score);
}

ShowScore(Add(30, 12));`,
    blanks: [
      { answers: ["return"], hint: "呼び出し元に値を返すキーワード。" },
      { answers: ["void"], hint: "「何も返さない」を表す型。" },
    ],
    console: ["スコア:42"],
    scene: "none",
    explain: "Unityの <code>Start()</code> や <code>Update()</code> も、実は戻り値が <code>void</code> のメソッドです。",
  },
  {
    id: "cs-class",
    chapter: "csharp",
    title: "クラスとインスタンス",
    goal: "Enemy クラスからインスタンスを作り、名前とHPを設定してください。",
    lesson:
      "クラスはデータと処理をまとめた設計図です。<code>new</code> で実体（インスタンス）を作り、<code>.</code> でフィールドやメソッドにアクセスします。外から触るフィールドには <code>public</code> を付けます。",
    code: `class Enemy
{
    ⟦0⟧ string name;
    public int hp;

    public void TakeDamage(int damage)
    {
        hp -= damage;
        Debug.Log(name + "の残りHP:" + hp);
    }
}

Enemy slime = ⟦1⟧ Enemy();
slime.name = "スライム";
slime.hp = 30;
slime⟦2⟧TakeDamage(12);`,
    blanks: [
      { answers: ["public"], hint: "クラスの外から読み書きできるようにするアクセス修飾子。", mistakes: { private: "error CS0122: 'Enemy.name' はアクセスできない保護レベルです" } },
      { answers: ["new"], hint: "インスタンスを生成するキーワード。" },
      { answers: ["."], hint: "メンバーにアクセスする記号。" },
    ],
    console: ["スライムの残りHP:18"],
    scene: "none",
    explain: "Unityのスクリプトもすべてクラスです。ただし MonoBehaviour を継承したクラスは <code>new</code> では作らず、GameObjectに「アタッチ」して使います（次章）。",
  },

  // ───────── 第2章 MonoBehaviourの基礎 ─────────
  {
    id: "mb-skeleton",
    chapter: "mono",
    title: "スクリプトの骨格",
    goal: "Unityで新規作成したC#スクリプトの雛形を完成させてください。",
    lesson:
      "Unityのスクリプトは <code>MonoBehaviour</code> を継承したクラスです。<code>using UnityEngine;</code> で Unity の機能を使えるようにします。クラス名とファイル名は一致させる必要があります（Player.cs なら class Player）。",
    code: `using ⟦0⟧;

public class Player : ⟦1⟧
{
    void ⟦2⟧()
    {
        Debug.Log("Playerが起動しました");
    }
}`,
    blanks: [
      { answers: ["UnityEngine"], hint: "Debug や Transform などが入っている名前空間。" },
      { answers: ["MonoBehaviour"], hint: "GameObjectにアタッチできるスクリプトの基底クラス。", mistakes: { MonoBehavior: "error CS0246: 型 'MonoBehavior' が見つかりません（英国式つづりの MonoBehaviour が正解）" } },
      { answers: ["Start"], hint: "最初のフレームの前に1回だけ呼ばれるメソッド。" },
    ],
    console: ["Playerが起動しました"],
    scene: "idle",
    explain: "<code>MonoBehaviour</code> は u を含む英国式のつづりです。<code>MonoBehavior</code> と書くとエラーになります。",
  },
  {
    id: "mb-start-update",
    chapter: "mono",
    title: "Start と Update",
    goal: "起動時に1回だけ「開始」、毎フレーム「フレーム更新」と出力してください。",
    lesson:
      "<code>Start()</code> は最初の1回だけ、<code>Update()</code> は毎フレーム（1秒に数十回）呼ばれます。どちらも Unity が自動で呼ぶので、自分で呼び出す必要はありません。",
    code: `using UnityEngine;

public class Logger : MonoBehaviour
{
    void ⟦0⟧()
    {
        Debug.Log("開始");
    }

    void ⟦1⟧()
    {
        Debug.⟦2⟧("フレーム更新");
    }
}`,
    blanks: [
      { answers: ["Start"], hint: "1回だけ呼ばれる方。" },
      { answers: ["Update"], hint: "毎フレーム呼ばれる方。" },
      { answers: ["Log"], hint: "Console にメッセージを出すメソッド。", mistakes: { print: "print() も使えますが、ここでは Debug.Log を使います" } },
    ],
    console: ["開始", "-- frame 1", "フレーム更新", "-- frame 2", "フレーム更新", "-- frame 3", "フレーム更新", "（以下、毎フレーム続く）"],
    scene: "idle",
    explain: "Update に重い処理やログを入れると、毎フレーム実行されるので処理が重くなります。必要な処理だけを入れるようにしましょう。",
  },
  {
    id: "mb-lifecycle",
    chapter: "mono",
    title: "イベント関数の呼ばれる順番",
    goal: "Unityがイベント関数を呼ぶ順番どおりに、空欄を選んでください。",
    lesson:
      "Unityは決まった順番でイベント関数を呼びます。<code>Awake</code>（生成直後）→ <code>OnEnable</code>（有効化時）→ <code>Start</code>（最初のフレームの前）→ <code>Update</code>（毎フレーム）→ <code>OnDestroy</code>（破棄時）の順です。",
    code: `// 呼ばれる順番に並べてください
void ⟦0⟧()     { Debug.Log("1"); }
void ⟦1⟧()     { Debug.Log("2"); }
void ⟦2⟧()     { Debug.Log("3"); }
void ⟦3⟧()     { Debug.Log("4 (毎フレーム)"); }
void ⟦4⟧()     { Debug.Log("5"); }`,
    blanks: [
      { answers: ["Awake"], choices: ["Awake", "OnEnable", "Start", "Update", "OnDestroy"], hint: "インスタンスが生成された直後。" },
      { answers: ["OnEnable"], choices: ["Awake", "OnEnable", "Start", "Update", "OnDestroy"], hint: "コンポーネントが有効になったとき。" },
      { answers: ["Start"], choices: ["Awake", "OnEnable", "Start", "Update", "OnDestroy"], hint: "最初の Update の直前。" },
      { answers: ["Update"], choices: ["Awake", "OnEnable", "Start", "Update", "OnDestroy"], hint: "毎フレーム。" },
      { answers: ["OnDestroy"], choices: ["Awake", "OnEnable", "Start", "Update", "OnDestroy"], hint: "GameObjectが破棄されるとき。" },
    ],
    console: ["1", "2", "3", "-- frame 1", "4 (毎フレーム)", "-- frame 2", "4 (毎フレーム)", "-- Destroy", "5"],
    scene: "idle",
    explain: "他のスクリプトを参照する準備は <code>Awake</code>、参照先を使う処理は <code>Start</code> に書くと、初期化の順番によるバグを防げます。",
  },
  {
    id: "mb-move",
    chapter: "mono",
    title: "Time.deltaTime で移動",
    goal: "キューブを右方向へ毎秒 speed の速さで動かしてください。",
    lesson:
      "<code>transform.position</code> はGameObjectの位置です。Update は環境によって呼ばれる回数が違うので、<code>Time.deltaTime</code>（前のフレームからの経過秒数）を掛けると、どのPCでも同じ速さで動きます。",
    code: `using UnityEngine;

public class Mover : MonoBehaviour
{
    public float speed = 2f;

    void Update()
    {
        ⟦0⟧.position += ⟦1⟧.right * speed * ⟦2⟧;
    }
}`,
    blanks: [
      { answers: ["transform"], hint: "自分のGameObjectの位置・回転・大きさを持つコンポーネント（小文字始まり）。", mistakes: { Transform: "error CS0120: 'Transform.position' は静的ではないため、インスタンス（小文字の transform）から参照してください" } },
      { answers: ["Vector3"], hint: "3次元のベクトルを表す型。right は (1,0,0)。" },
      { answers: ["Time.deltaTime"], hint: "前フレームからの経過時間（秒）。" },
    ],
    console: ["-- frame 1: position = (0.03, 0, 0)", "-- frame 30: position = (1.00, 0, 0)", "-- frame 60: position = (2.00, 0, 0)"],
    scene: "move",
    explain: "<code>Time.deltaTime</code> を掛け忘れると「1フレームごとに2」動くことになり、60fpsなら毎秒120も移動してしまいます。",
  },
  {
    id: "mb-rotate",
    chapter: "mono",
    title: "transform.Rotate で回転",
    goal: "キューブをY軸まわりに毎秒90度回転させてください。",
    lesson:
      "<code>transform.Rotate(x, y, z)</code> は、各軸まわりに指定した角度（度数法）だけ回転させます。移動と同じく <code>Time.deltaTime</code> を掛けると、速さが秒単位になります。",
    code: `using UnityEngine;

public class Spinner : MonoBehaviour
{
    void Update()
    {
        transform.⟦0⟧(0f, ⟦1⟧ * Time.deltaTime, 0f);
    }
}`,
    blanks: [
      { answers: ["Rotate"], hint: "回転させるメソッド。" },
      { answers: ["90", "90f", "90.0f"], hint: "毎秒何度回すか。" },
    ],
    console: ["-- 1秒後: rotation.y = 90", "-- 2秒後: rotation.y = 180", "-- 4秒後: rotation.y = 360（1周）"],
    scene: "rotate",
    explain: "回転を直接代入したいときは <code>transform.rotation = Quaternion.Euler(0, 90, 0);</code> のように Quaternion を使います。",
  },
  {
    id: "mb-input",
    chapter: "mono",
    title: "キー入力でジャンプ",
    goal: "スペースキーを押した瞬間に「ジャンプ！」と出力し、キューブを跳ねさせてください。",
    lesson:
      "<code>Input.GetKeyDown</code> は押した瞬間の1フレームだけ true、<code>Input.GetKey</code> は押している間ずっと true になります。キーは <code>KeyCode.○○</code> で指定します。",
    code: `using UnityEngine;

public class Jumper : MonoBehaviour
{
    void Update()
    {
        if (Input.⟦0⟧(KeyCode.⟦1⟧))
        {
            Debug.Log("ジャンプ！");
            Jump();
        }
    }

    void Jump() { /* 次の章で物理を使って実装 */ }
}`,
    blanks: [
      { answers: ["GetKeyDown"], choices: ["GetKey", "GetKeyDown", "GetKeyUp"], hint: "押した「瞬間」だけ反応させたい。", mistakes: { GetKey: "押している間ずっと反応するので、毎フレームジャンプしてしまいます" } },
      { answers: ["Space"], hint: "スペースキーの KeyCode。" },
    ],
    console: ["-- Spaceキーを押した", "ジャンプ！"],
    scene: "jump",
    explain: "ジャンプや攻撃のように「1回だけ」実行したい処理は GetKeyDown、移動のように「押している間」続ける処理は GetKey を使います。（新しい Input System でも考え方は同じです）",
  },
  {
    id: "mb-serialize",
    chapter: "mono",
    title: "[SerializeField] と Inspector",
    goal: "speed を private のまま Inspector から編集できるようにしてください。",
    lesson:
      "<code>public</code> フィールドは Inspector に表示されますが、他のスクリプトからも書き換えられてしまいます。<code>[SerializeField]</code> を付けると、<code>private</code> のまま Inspector で編集できます。",
    code: `using UnityEngine;

public class PlayerMove : MonoBehaviour
{
    ⟦0⟧ ⟦1⟧ float speed = 5f;

    void Update()
    {
        float h = Input.GetAxis("⟦2⟧");
        transform.position += Vector3.right * h * speed * Time.deltaTime;
    }
}`,
    blanks: [
      { answers: ["[SerializeField]"], hint: "角カッコで囲む属性。Inspectorに表示させる。" },
      { answers: ["private"], hint: "外部のスクリプトから触れないようにするアクセス修飾子。" },
      { answers: ["Horizontal"], hint: "左右キー / A・D キーの入力軸の名前。", mistakes: { Vertical: "Vertical は上下（W・S）の入力軸です" } },
    ],
    console: ["Inspector: Speed [ 5 ]", "-- →キー入力: h = 1", "-- position.x が毎秒 5 ずつ増加"],
    scene: "move",
    explain: "「Inspectorで調整したいけれど外部からは触らせたくない」場合は <code>[SerializeField] private</code> が定番です。",
  },

  // ───────── 第3章 物理・衝突・生成 ─────────
  {
    id: "ph-rigidbody",
    chapter: "physics",
    title: "Rigidbody と AddForce",
    goal: "Rigidbody を取得し、物理更新のタイミングで上向きの力を加えてジャンプさせてください。",
    lesson:
      "物理演算で動かすには <code>Rigidbody</code> コンポーネントを使います。<code>GetComponent&lt;T&gt;()</code> で同じGameObjectに付いたコンポーネントを取得できます。物理処理は <code>Update</code> ではなく、一定間隔で呼ばれる <code>FixedUpdate</code> に書きます。",
    code: `using UnityEngine;

public class PhysicsJump : MonoBehaviour
{
    Rigidbody rb;
    bool jumpRequested;

    void Start()
    {
        rb = ⟦0⟧<⟦1⟧>();
    }

    void Update()
    {
        if (Input.GetKeyDown(KeyCode.Space)) jumpRequested = true;
    }

    void ⟦2⟧()
    {
        if (jumpRequested)
        {
            rb.⟦3⟧(Vector3.up * 5f, ForceMode.Impulse);
            jumpRequested = false;
        }
    }
}`,
    blanks: [
      { answers: ["GetComponent"], hint: "同じGameObjectのコンポーネントを取得するメソッド。" },
      { answers: ["Rigidbody"], hint: "物理演算のコンポーネント名（3D用）。", mistakes: { Rigidbody2D: "2Dゲームなら正解ですが、ここでは3Dの Rigidbody を使います" } },
      { answers: ["FixedUpdate"], hint: "物理演算と同じ一定間隔で呼ばれるイベント関数。" },
      { answers: ["AddForce"], hint: "力を加えるメソッド。" },
    ],
    console: ["-- Spaceキーを押した (Update)", "-- FixedUpdate: AddForce (0, 5, 0) Impulse", "-- 重力で落下して着地"],
    scene: "jump",
    explain: "入力は Update で受け取り、物理は FixedUpdate で処理する、という分担が基本です。GetKeyDown を FixedUpdate で調べると、押した瞬間を取りこぼすことがあります。",
  },
  {
    id: "ph-collision",
    chapter: "physics",
    title: "OnCollisionEnter で衝突判定",
    goal: "Enemy タグの付いた物体にぶつかったら「ダメージ！」と出力してください。",
    lesson:
      "Collider と Rigidbody を持つ物体同士がぶつかると <code>OnCollisionEnter(Collision collision)</code> が呼ばれます。相手の種類は <code>CompareTag(\"タグ名\")</code> で判定します。",
    code: `using UnityEngine;

public class PlayerHit : MonoBehaviour
{
    void ⟦0⟧(Collision collision)
    {
        if (collision.gameObject.⟦1⟧("⟦2⟧"))
        {
            Debug.Log("ダメージ！");
        }
    }
}`,
    blanks: [
      { answers: ["OnCollisionEnter"], hint: "衝突した瞬間に呼ばれるイベント関数。", mistakes: { OnTriggerEnter: "OnTriggerEnter は Is Trigger にチェックを入れたColliderで使います。引数の型も Collider です" } },
      { answers: ["CompareTag"], hint: "タグを比較するメソッド。tag == より高速です。" },
      { answers: ["Enemy"], hint: "敵に付けたタグ名。" },
    ],
    console: ["-- Player が Enemy に衝突", "ダメージ！"],
    scene: "collide",
    explain: "<code>gameObject.tag == \"Enemy\"</code> でも判定はできますが、<code>CompareTag</code> の方がメモリ確保が発生せず高速です。",
  },
  {
    id: "ph-trigger",
    chapter: "physics",
    title: "OnTriggerEnter でコイン取得",
    goal: "Coin タグのトリガーに触れたら、スコアを加算してコインを消してください。",
    lesson:
      "Collider の <code>Is Trigger</code> にチェックを入れると、ぶつからずにすり抜け、代わりに <code>OnTriggerEnter(Collider other)</code> が呼ばれます。オブジェクトを消すには <code>Destroy()</code> を使います。",
    code: `using UnityEngine;

public class CoinCollector : MonoBehaviour
{
    int score = 0;

    void OnTriggerEnter(⟦0⟧ other)
    {
        if (other.CompareTag("Coin"))
        {
            score⟦1⟧;
            Debug.Log("スコア:" + score);
            ⟦2⟧(other.⟦3⟧);
        }
    }
}`,
    blanks: [
      { answers: ["Collider"], hint: "トリガーの引数は Collision ではなくこちら。", mistakes: { Collision: "error: OnTriggerEnter の引数は Collider です。メッセージのシグネチャが一致しないため呼ばれません" } },
      { answers: ["++", "+=1"], hint: "1増やす。" },
      { answers: ["Destroy"], hint: "GameObjectを破棄するメソッド。" },
      { answers: ["gameObject"], hint: "Collider自体ではなく、それが付いているGameObjectごと消したい。" },
    ],
    console: ["-- Player が Coin に接触", "スコア:1", "-- Coin を Destroy"],
    scene: "coin",
    explain: "<code>Destroy(other)</code> と書くと Collider コンポーネントだけが消え、コインの見た目は残ります。GameObjectごと消すには <code>other.gameObject</code> を渡します。",
  },
  {
    id: "ph-instantiate",
    chapter: "physics",
    title: "Instantiate で生成",
    goal: "スペースキーを押すたびに、弾の Prefab を自分の位置に生成してください。",
    lesson:
      "<code>Instantiate(プレハブ, 位置, 回転)</code> で Prefab からGameObjectを複製します。回転なしは <code>Quaternion.identity</code> と書きます。",
    code: `using UnityEngine;

public class Shooter : MonoBehaviour
{
    [SerializeField] ⟦0⟧ bulletPrefab;

    void Update()
    {
        if (Input.GetKeyDown(KeyCode.Space))
        {
            ⟦1⟧(bulletPrefab, transform.position, Quaternion.⟦2⟧);
        }
    }
}`,
    blanks: [
      { answers: ["GameObject"], hint: "Prefabを入れるフィールドの型（大文字始まり）。", mistakes: { gameObject: "error CS0246: 型としては大文字の GameObject を使います（小文字の gameObject は自分自身を指すプロパティ）" } },
      { answers: ["Instantiate"], hint: "複製を生成するメソッド。" },
      { answers: ["identity"], hint: "「回転なし」を表す Quaternion の静的プロパティ。" },
    ],
    console: ["-- Spaceキー", "Bullet(Clone) を生成", "-- Spaceキー", "Bullet(Clone) を生成"],
    scene: "spawn",
    explain: "生成されたオブジェクトには <code>(Clone)</code> が付きます。生成しっぱなしだと増え続けるので、次の問題のように一定時間で消すのが一般的です。",
  },
  {
    id: "ph-destroy-timer",
    chapter: "physics",
    title: "Destroy で時間差削除",
    goal: "弾が生成されてから3秒後に自動で消えるようにしてください。",
    lesson:
      "<code>Destroy(対象, 秒数)</code> のように第2引数を渡すと、指定した秒数のあとに破棄されます。自分自身のGameObjectは <code>gameObject</code> で参照できます。",
    code: `using UnityEngine;

public class Bullet : MonoBehaviour
{
    [SerializeField] float speed = 10f;

    void Start()
    {
        Destroy(⟦0⟧, ⟦1⟧);
    }

    void Update()
    {
        transform.position += transform.⟦2⟧ * speed * Time.deltaTime;
    }
}`,
    blanks: [
      { answers: ["gameObject"], hint: "このスクリプトが付いている自分自身のGameObject。", mistakes: { this: "this だとスクリプト（コンポーネント）だけが消え、弾は残ります" } },
      { answers: ["3f", "3", "3.0f"], hint: "何秒後に消すか。" },
      { answers: ["forward"], hint: "自分の向いている前方向（ローカルZ+）。" },
    ],
    console: ["Bullet 生成", "-- 3秒経過", "Bullet を Destroy"],
    scene: "bullet",
    explain: "<code>Vector3.forward</code> はワールド座標の前方向、<code>transform.forward</code> はそのオブジェクトの向いている方向です。弾には後者を使います。",
  },
];
