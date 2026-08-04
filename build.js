#!/usr/bin/env node
/**
 * build.js — 把 words.json 回灌进 index.html 的内嵌兜底词库（EMBEDDED）。
 * 每次改完 words.json 后运行：node build.js
 * 这样即使同事拿到的是离线 HTML 文件，打开也自带最新词库。
 */
const fs = require('fs');
const path = require('path');

const root = __dirname;
const bankPath = path.join(root, 'words.json');
const htmlPath = path.join(root, 'index.html');

const bank = JSON.parse(fs.readFileSync(bankPath, 'utf8'));
if (!bank.version || !bank.themes || !Array.isArray(bank.words) || bank.words.length === 0) {
  console.error('words.json 结构不合法：需要 version / themes / words[]');
  process.exit(1);
}

// 基本词条校验，坏一条就中止，避免把脏数据发出去
const LEVELS = new Set(['A2', 'B1', 'B2']);
for (const w of bank.words) {
  const problems = [];
  if (!w.en || typeof w.en !== 'string') problems.push('en 缺失');
  if (!w.zh) problems.push('zh 缺失');
  if (!bank.themes[w.theme]) problems.push('theme 未在 themes 中声明: ' + w.theme);
  if (!LEVELS.has(w.level)) problems.push('level 非法: ' + w.level);
  if (!Array.isArray(w.frames) || w.frames.length < 1) problems.push('frames 缺失');
  if (!w.def) problems.push('def 缺失');
  if (problems.length) {
    console.error('词条不合法 [' + (w.en || '?') + ']: ' + problems.join('; '));
    process.exit(1);
  }
}

// 查重
const seen = new Set();
for (const w of bank.words) {
  const k = w.en.toLowerCase().trim();
  if (seen.has(k)) {
    console.error('重复词条: ' + w.en);
    process.exit(1);
  }
  seen.add(k);
}

// 答案泄露检查：frames / def / colloc / taboo 不得包含目标词及常见变形
const escRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
for (const w of bank.words) {
  const en = w.en.toLowerCase();
  const forms = [en, en + 's', en + 'es', en + 'ed', en + 'd', en + 'ing'];
  if (en.endsWith('e')) forms.push(en.slice(0, -1) + 'ing');
  const re = new RegExp('\\b(' + forms.map(escRe).join('|') + ')\\b', 'i');
  const fields = {
    frames: (w.frames || []).join(' | '),
    def: w.def || '',
    colloc: (w.colloc || []).join(', '),
    taboo: (w.taboo || []).join(', '),
  };
  for (const [field, text] of Object.entries(fields)) {
    if (re.test(text)) {
      console.error('答案泄露 [' + w.en + '] 出现在 ' + field + ': ' + text);
      process.exit(1);
    }
  }
}

let html = fs.readFileSync(htmlPath, 'utf8');
const re = /\/\/__EMBEDDED_START__[\s\S]*?\/\/__EMBEDDED_END__/;
if (!re.test(html)) {
  console.error('index.html 中找不到 EMBEDDED 标记');
  process.exit(1);
}
html = html.replace(re,
  '//__EMBEDDED_START__\n  const EMBEDDED = ' + JSON.stringify(bank) + ';\n  //__EMBEDDED_END__');
fs.writeFileSync(htmlPath, html);

const perTheme = {};
for (const w of bank.words) perTheme[w.theme] = (perTheme[w.theme] || 0) + 1;
console.log('OK: v' + bank.version + ' · ' + bank.words.length + ' 词已内嵌进 index.html');
console.log(Object.entries(perTheme).map(([k, v]) => k + '=' + v).join(', '));
