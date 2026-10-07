# Unity穴埋め練習

Unity をインストールしなくても、ブラウザだけで C# と MonoBehaviour を穴埋め形式で練習できるサイトです。

## 使い方

`index.html` をブラウザで開きます。ビルドもサーバーも不要です。GitHub Pages などにそのまま置けます。

1. コード中の空欄に入力する（一部の問題はプルダウンで選ぶ）
2. 「▶ 実行」または Enter / Ctrl+Enter で判定する
3. 間違えると Console に疑似コンパイルエラーが表示される。正解すると Console のログと Scene ビューの動きが再生され、解説が出る

進捗はブラウザの localStorage に保存されます。「答えを見る」を使った問題には ✓ が付きません。

## 構成

| ファイル | 役割 |
|---|---|
| `problems.js` | 章と問題のデータ。問題の追加・修正はここだけで済む |
| `app.js` | 描画・判定・Console 表示・Scene の疑似再生 |
| `style.css` | 見た目（ライト / ダーク両対応） |

## 問題の追加方法

`problems.js` の `PROBLEMS` に次の形のオブジェクトを足します。

```js
{
  id: "mb-example",          // 一意のID（進捗の保存キー）
  chapter: "mono",           // CHAPTERS の id
  title: "問題名",
  goal: "何をするか",
  lesson: "事前解説（HTML可）",
  code: `transform.⟦0⟧(0f, 90f, 0f);`,   // ⟦n⟧ が n 番目の空欄
  blanks: [
    {
      answers: ["Rotate"],                 // 正解候補（空白は無視して比較）
      hint: "回転させるメソッド",
      choices: ["Rotate", "Translate"],   // 任意: 指定するとプルダウンになる
      mistakes: { Translate: "それは移動です" }, // 任意: 誤答ごとのエラー文
    },
  ],
  console: ["-- frame 1", "ログ"],  // 正解時の出力。"--" で始まる行はフレーム注記
  scene: "rotate",                  // none / idle / move / rotate / jump / collide / coin / spawn / bullet
  explain: "正解後の解説（HTML可）",
}
```

## 収録内容（18問）

- 第1章 C#の基礎：変数と型、if、for、配列と List、メソッド、クラス
- 第2章 MonoBehaviour：スクリプトの骨格、Start/Update、イベント関数の順番、Time.deltaTime、Rotate、Input、[SerializeField]
- 第3章 物理・衝突・生成：Rigidbody/AddForce/FixedUpdate、OnCollisionEnter、OnTriggerEnter、Instantiate、Destroy
