# 口语抽词器 · Taboo

团队英语口语练习游戏：抽一个英文词，用英语描述它让同事猜，但不能说出这个词本身。
每个词都带**描述脚手架**——句型支架、可用搭配、禁忌词、折叠的英文定义——帮英文没那么好的同事开口，而不是照着念。

## 怎么玩

直接用浏览器打开 `index.html`（或访问 GitHub Pages 地址）。

- 顶部按**主题 / 难度**筛选牌堆（A2 入门 / B1 进阶 / B2 挑战）
- `空格` 抽词；抽过的词在重置前不会重复
- 「显示英文脚手架」「显示中文」可随时开关
- 脚手架里的 `___` 要玩家自己补全；🚫 划线的词是禁忌词，描述时不能说

## 词库自动更新机制

页面打开时会静默拉取本仓库 `main` 分支的 `words.json`：

1. 有新版本且还没开始抽词 → 直接生效
2. 有新版本但正在玩 → 暂存，点「重置牌堆」后生效
3. 离线 → 回退到 localStorage 缓存或文件内嵌词库

所以**改 `words.json` 并 push，就等于给所有人更新了词库**。

## 加词 / 改词

1. 编辑 `words.json`，往 `words` 数组里加词条（格式见下）
2. 把顶部 `version` 改成当天日期（页面靠它判断新旧）
3. 运行 `node build.js`（把新词库内嵌回 `index.html` 作离线兜底，并做格式校验）
4. commit + push

### 词条格式

```json
{
  "en": "stapler",
  "zh": "订书机",
  "theme": "objects",
  "level": "B1",
  "pos": "noun",
  "frames": ["It's a small office tool you press ___.", "You use it to keep loose ___ together."],
  "colloc": ["press", "metal pin", "desk", "click"],
  "taboo": ["staple", "paper", "press"],
  "def": "a tool that joins sheets of paper with metal pins"
}
```

字段约定：

| 字段 | 说明 |
|---|---|
| `theme` | 必须是 `words.json` 顶部 `themes` 里声明过的 key |
| `level` | `A2`（简单具体）/ `B1`（进阶）/ `B2`（抽象有难度） |
| `frames` | 2 条口语句型支架，含 `___` 留白；**不能包含目标词及其变形** |
| `colloc` | 3–5 个描述时用得上的搭配词，不含目标词 |
| `taboo` | 2–4 个最容易脱口而出的禁忌词，不含目标词本身 |
| `def` | 简明英文定义（≤14 词），不含目标词及其变形 |

## 每周自动补词

一个每周执行的定时任务会自动生成一批新词（带完整脚手架、查重、审核），更新 `words.json` 并 push。同事打开页面即可看到「已联网更新」。
