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
const MAX_WORDS_PER_SENTENCE = 20;
const MAX_WORDS_PER_DEF = 14;
for (const w of bank.words) {
  const problems = [];
  if (!w.en || typeof w.en !== 'string') problems.push('en 缺失');
  if (!w.zh) problems.push('zh 缺失');
  if (!bank.themes[w.theme]) problems.push('theme 未在 themes 中声明: ' + w.theme);
  if (!LEVELS.has(w.level)) problems.push('level 非法: ' + w.level);
  if (!Array.isArray(w.sentences) || w.sentences.length < 2) {
    problems.push('sentences 需要 2 句可直接朗读的完整句');
  } else {
    // 句子必须是完整可朗读的：不允许留下 ___ 之类的填空占位符
    for (const s of w.sentences) {
      if (/_{2,}|\[|\]/.test(s)) problems.push('sentences 里还有填空占位符: ' + s);
      const n = s.trim().split(/\s+/).length;
      if (n > MAX_WORDS_PER_SENTENCE) problems.push('句子过长（' + n + ' 词，朗读困难）: ' + s);
    }
  }
  if (!w.def) {
    problems.push('def 缺失');
  } else {
    const n = w.def.trim().split(/\s+/).length;
    if (n > MAX_WORDS_PER_DEF) problems.push('def 过长（' + n + ' 词，应尽量简短易读）: ' + w.def);
  }
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

// 答案泄露检查：句子和定义都会被玩家直接朗读，绝不能出现目标词及其变形
const escRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
for (const w of bank.words) {
  const en = w.en.toLowerCase();
  const forms = new Set([en, en + 's', en + 'es', en + 'ed', en + 'd', en + 'ing', en + 'er', en + 'ers']);
  if (en.endsWith('e')) {
    forms.add(en.slice(0, -1) + 'ing');
    forms.add(en.slice(0, -1) + 'ed');
  }
  if (en.endsWith('y')) {
    forms.add(en.slice(0, -1) + 'ies');
    forms.add(en.slice(0, -1) + 'ied');
  }
  // 多词短语（parking lot）逐词也要挡
  for (const part of en.split(/\s+/)) if (part.length > 3) forms.add(part);
  const re = new RegExp('\\b(' + [...forms].map(escRe).join('|') + ')\\b', 'i');
  const fields = {
    sentences: (w.sentences || []).join(' | '),
    def: w.def || '',
  };
  for (const [field, text] of Object.entries(fields)) {
    const m = re.exec(text);
    if (m) {
      console.error('答案泄露 [' + w.en + '] 在 ' + field + ' 里出现 "' + m[1] + '": ' + text);
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
