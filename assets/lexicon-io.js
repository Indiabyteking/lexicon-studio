/* Lexicon IO — pure data utilities. Imported text is never evaluated as code. */
const LexiconIO = (() => {
  'use strict';
  const columns = ['id','word','ipa','pos','definition','libraries','topics','functions','frequency','register','synonyms','antonyms','collocations','examples','note','forms'];
  const structured = new Set(['ipa','definition','libraries','topics','functions','frequency','synonyms','antonyms','collocations','examples','forms']);
  const MAX_WORDS = 25000, MAX_BYTES = 60 * 1024 * 1024;
  const object = value => value !== null && typeof value === 'object' && !Array.isArray(value);
  const safeKey = key => !['__proto__','prototype','constructor'].includes(key);
  const norm = value => typeof value === 'string' ? value.trim() : '';
  const idOf = value => norm(value).toLowerCase();
  const slug = /^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/;

  function parseCSV(input) {
    if (typeof input !== 'string') throw new Error('CSV 内容必须是文本。');
    const text = input.replace(/^\uFEFF/, '');
    const rows = []; let row = [], field = '', state = 'start', line = 1, startLine = 1;
    const cell = () => { row.push(field); field = ''; state = 'start'; };
    const record = () => { cell(); rows.push(row); row = []; startLine = line + 1; if (rows.length > MAX_WORDS + 1) throw new Error('每次最多导入 25,000 个词条，请分批导入。'); };
    for (let i = 0; i < text.length; i++) {
      const c = text[i];
      if (state === 'quoted') {
        if (c === '"') { if (text[i + 1] === '"') { field += '"'; i++; } else state = 'closed'; }
        else { field += c; if (c === '\n' || (c === '\r' && text[i+1] !== '\n')) line++; }
        continue;
      }
      if (c === ',') { cell(); continue; }
      if (c === '\n' || c === '\r') { record(); if (c === '\r' && text[i+1] === '\n') i++; line++; continue; }
      if (state === 'closed') throw new Error(`CSV 第 ${line} 行：结束引号后只能出现逗号或换行。`);
      if (c === '"') {
        if (state !== 'start') throw new Error(`CSV 第 ${line} 行：字段内的引号需要用双引号转义，并将整个字段加引号。`);
        state = 'quoted';
      } else { field += c; state = 'bare'; }
    }
    if (state === 'quoted') throw new Error(`CSV 第 ${startLine} 行开始的引号未闭合。`);
    if (field !== '' || row.length || state !== 'start') { cell(); rows.push(row); }
    return rows;
  }

  function toCSV(words) {
    const escape = value => '"' + String(value == null ? '' : value).replace(/"/g, '""') + '"';
    return '\uFEFF' + [columns.join(','), ...words.map(word => columns.map(key => escape(structured.has(key) ? JSON.stringify(word[key] ?? null) : word[key])).join(','))].join('\r\n');
  }

  function parseInput(input, filename = '') {
    if (typeof input !== 'string') throw new Error('请选择文件或粘贴 JSON / CSV 内容。');
    if (new Blob([input]).size > MAX_BYTES) throw new Error('文件超过 60 MB，请拆分后导入。');
    const text = input.replace(/^\uFEFF/, '').trim();
    if (!text) throw new Error('导入内容为空。');
    if (/^[\[{]/.test(text) || /\.json$/i.test(filename)) {
      let parsed;
      try { parsed = JSON.parse(text); } catch (error) { throw new Error('JSON 语法错误：' + error.message); }
      if (Array.isArray(parsed)) return { version: 1, words: parsed };
      if (!object(parsed) || !Array.isArray(parsed.words)) throw new Error('JSON 顶层须为词条数组，或包含 words 数组的对象。');
      if (parsed.version !== undefined && parsed.version !== 1) throw new Error('不支持此备份版本；当前支持 version: 1。');
      return parsed;
    }
    const rows = parseCSV(text).filter(row => !(row.length === 1 && row[0].trim() === ''));
    if (rows.length < 2) throw new Error('CSV 需要一行表头和至少一行词条。');
    const headers = rows.shift().map(header => header.trim());
    if (new Set(headers).size !== headers.length) throw new Error('CSV 表头存在重复列名。');
    const missing = columns.filter(key => !headers.includes(key));
    if (missing.length) throw new Error('CSV 缺少字段：' + missing.join(', ') + '。请先下载 CSV 模板。');
    if (headers.some(key => !safeKey(key))) throw new Error('CSV 包含不支持的字段名。');
    const words = rows.map((row, index) => {
      if (row.length !== headers.length) throw new Error(`CSV 第 ${index + 2} 条记录有 ${row.length} 列，表头有 ${headers.length} 列。请检查逗号和引号。`);
      const result = Object.create(null);
      headers.forEach((key, i) => {
        if (!columns.includes(key)) return;
        if (structured.has(key)) {
          try { result[key] = JSON.parse(row[i]); } catch (error) { throw new Error(`CSV 第 ${index + 2} 条记录的 ${key} 必须为合法 JSON。`); }
        } else result[key] = row[i];
      });
      return result;
    });
    return { version: 1, words };
  }

  function validateImport(parsed, existingWords = [], options = {}) {
    const errors = [], warnings = []; let errorCount = 0;
    const fail = text => { errorCount++; if (errors.length < 50) errors.push(text); };
    const source = Array.isArray(parsed) ? parsed : parsed && parsed.words;
    if (!Array.isArray(source) || source.length === 0) return { words: [], errors: ['请提供非空的 words 数组。'], warnings, added: 0, updated: 0 };
    // Only the application's own full-store restore may bypass the per-batch cap.
    // Ordinary file/text imports must keep the default options.
    if (source.length > MAX_WORDS && options?.allowLargeStore !== true) return { words: [], errors: ['每批最多导入 25,000 个词条。'], warnings, added: 0, updated: 0 };
    const ids = new Set(), names = new Map();
    const words = source.map((raw, i) => {
      const row = `第 ${i + 1} 个词条`;
      if (!object(raw)) { fail(`${row}必须是对象。`); return null; }
      const str = (value, key, max = 2000) => {
        if (typeof value !== 'string' || !value.trim() || value.length > max) { fail(`${row} ${key} 必须是 1–${max} 字符的非空文本。`); return ''; }
        return value.trim();
      };
      const list = (value, key, min = 1, max = 100) => {
        if (!Array.isArray(value) || value.length < min || value.length > max) { fail(`${row} ${key} 必须包含 ${min}–${max} 项。`); return []; }
        return value;
      };
      const strings = (value, key, min = 1) => [...new Set(list(value, key, min).map((v, n) => str(v, `${key}[${n}]`, 500)))];
      const pair = (value, key, a = 'en', b = 'zh') => {
        if (!object(value)) { fail(`${row} ${key} 必须包含 ${a} 和 ${b}。`); value = {}; }
        return { [a]: str(value[a], `${key}.${a}`), [b]: str(value[b], `${key}.${b}`) };
      };
      const id = idOf(raw.id), word = str(raw.word, 'word', 80);
      if (!slug.test(id) || id.length > 100 || !safeKey(id)) fail(`${row} id 只能使用小写字母、数字和单连字符，且以字母开头。`);
      if (ids.has(id)) fail(`${row} id “${id}” 在本次导入中重复。`); ids.add(id);
      const name = word.toLocaleLowerCase('en-US');
      if (names.has(name)) fail(`${row}单词 “${word}” 与第 ${names.get(name)} 个词条重复。`); names.set(name, i + 1);
      const ipa = pair(raw.ipa, 'ipa', 'uk', 'us');
      const definition = pair(raw.definition, 'definition');
      const libraries = strings(raw.libraries, 'libraries');
      if (libraries.some(v => !['ielts','writing','gre'].includes(v))) fail(`${row} libraries 仅支持 ielts、writing、gre。`);
      const frequency = { ielts: raw.frequency?.ielts, gre: raw.frequency?.gre };
      for (const key of ['ielts','gre']) if (!Number.isInteger(frequency[key]) || frequency[key] < 1 || frequency[key] > 5) fail(`${row} frequency.${key} 须为 1–5 的整数。`);
      const links = (key, minCount = 0) => {
        if (raw[key] == null && minCount === 0) return [];
        const seen = new Set();
        return list(raw[key], key, minCount).map((link, n) => {
          if (!object(link)) { fail(`${row} ${key}[${n}] 必须含 id 和 note。`); link = {}; }
          const target = idOf(link.id);
          if (!slug.test(target) || !safeKey(target)) fail(`${row} ${key}[${n}].id 格式不正确。`);
          if (target === id) fail(`${row} ${key} 不可关联自身。`);
          if (seen.has(target)) fail(`${row} ${key} 含重复关联 “${target}”。`); seen.add(target);
          const item = { id: target, note: str(link.note, `${key}[${n}].note`) };
          if (key === 'partners') {
            item.rel = typeof link.rel === 'string' && link.rel.trim() ? link.rel.trim().slice(0, 30) : '常用搭配';
            item.phrase = typeof link.phrase === 'string' && link.phrase.trim() ? link.phrase.trim().slice(0, 120) : '';
          }
          return item;
        });
      };
      const synonyms = links('synonyms', 0), antonyms = links('antonyms', 0), partners = links('partners', 0);
      const collocations = list(raw.collocations, 'collocations', 3, 20).map((v,n) => pair(v, `collocations[${n}]`));
      const examples = list(raw.examples, 'examples', 2, 20).map((example, n) => {
        if (!object(example)) { fail(`${row} examples[${n}] 必须是对象。`); example = {}; }
        const sentences = pair(example, `examples[${n}]`);
        if (!['IELTS','GRE'].includes(example.type)) fail(`${row} examples[${n}].type 须为 IELTS 或 GRE。`);
        const highlights = strings(example.highlights, `examples[${n}].highlights`);
        if (highlights.some(phrase => !sentences.en.includes(phrase))) fail(`${row} examples[${n}] 的每个高亮短语必须原样出现在英文例句中。`);
        return { type: example.type, ...sentences, highlights };
      });
      if (!examples.some(v => v.type === 'IELTS') || !examples.some(v => v.type === 'GRE')) fail(`${row}须分别包含 IELTS 和 GRE 例句。`);
      return { id, word, ipa, pos: str(raw.pos, 'pos', 20), definition, libraries, topics: strings(raw.topics, 'topics'), functions: strings(raw.functions, 'functions'), frequency, register: str(raw.register, 'register', 500), synonyms, antonyms, partners, collocations, examples, note: str(raw.note, 'note'), forms: strings(raw.forms, 'forms', 0) };
    }).filter(Boolean);
    const merged = new Map(existingWords.map(word => [word.id, word]));
    words.forEach(word => merged.set(word.id, word));
    const mergedNames = new Map();
    for (const [id, word] of merged) {
      const name = norm(word.word).toLocaleLowerCase('en-US');
      if (mergedNames.has(name) && mergedNames.get(name) !== id) fail(`单词 “${word.word}” 已存在于 id “${mergedNames.get(name)}”；更新时请使用原 id。`);
      mergedNames.set(name, id);
    }
    words.forEach(word => {
      ['synonyms','antonyms','partners'].forEach(key => (word[key] || []).forEach(link => {
        if (!merged.has(link.id)) fail(`“${word.word}” 的 ${key} 指向未收录的 “${link.id}”。请一并导入该词，或改为已收录词条的 id。`);
      }));
      const opposite = new Set(word.antonyms.map(v => v.id));
      if (word.synonyms.some(v => opposite.has(v.id))) warnings.push(`“${word.word}” 的同义与反义列表存在相同目标，请核对多义词的语境说明。`);
    });
    let progress;
    if (object(parsed) && Object.prototype.hasOwnProperty.call(parsed, 'progress')) {
      progress = Object.create(null);
      if (!object(parsed.progress)) fail('progress 必须是以词条 id 为键的对象。');
      else for (const [id, value] of Object.entries(parsed.progress)) {
        if (!safeKey(id)) { fail('progress 包含非法词条 id。'); continue; }
        if (!merged.has(id)) { warnings.push(`忽略未收录词条 “${id}” 的进度。`); continue; }
        const item = typeof value === 'string' ? { status: value } : value;
        if (!object(item) || !['new','review','mastered'].includes(item.status)) { fail(`progress.${id}.status 仅支持 new、review、mastered。`); continue; }
        let lastReviewed = null;
        if (item.lastReviewed != null) {
          const value = item.lastReviewed;
          if ((typeof value !== 'string' && typeof value !== 'number') || !Number.isFinite(new Date(value).getTime())) fail(`progress.${id}.lastReviewed 不是有效时间。`);
          else lastReviewed = new Date(value).toISOString();
        }
        const reviews = item.reviews ?? 0;
        if (!Number.isSafeInteger(reviews) || reviews < 0) fail(`progress.${id}.reviews 须为非负整数。`);
        progress[id] = { status: item.status, lastReviewed, reviews: Number.isSafeInteger(reviews) ? reviews : 0 };
      }
    }
    if (errorCount > 50) errors.push(`另有 ${errorCount - 50} 处错误，请修正后重新校验。`);
    const existingIds = new Set(existingWords.map(word => word.id));
    const added = words.filter(word => !existingIds.has(word.id)).length;
    const result = { words: errors.length ? [] : words, errors, warnings: warnings.slice(0, 50), added: errors.length ? 0 : added, updated: errors.length ? 0 : words.length - added };
    if (!errors.length && progress) result.progress = progress;
    if (!errors.length && ['light','dark'].includes(parsed?.theme)) result.theme = parsed.theme;
    return result;
  }

  function makePrompt(existingWords = [], module = 'all', topic = '学术论证与社会议题', count = 20) {
    const chosen = ['all','ielts','writing','gre'].includes(module) ? module : 'all';
    const total = Number.isInteger(Number(count)) && Number(count) >= 2 && Number(count) <= 50 ? Number(count) : 20;
    const anchors = existingWords.slice(0, 100).map(word => `${word.id} (${word.word})`).join(', ');
    return `你是严谨的 IELTS / GRE 词汇教研编辑。请生成 ${total} 个高质量新词条，主题：${String(topic).slice(0,200)}，重点词库：${chosen === 'all' ? 'ielts / writing / gre，按实际适用范围标注' : chosen}。
只返回可被 JSON.parse 解析的 JSON，不要 Markdown 代码围栏或解释。顶层必须是 {"version":1,"words":[...] }。
每个词条严格使用以下所有字段，不能省略：
{"id":"lowercase-hyphenated-id","word":"word","ipa":{"uk":"/英国 IPA/","us":"/美国 IPA/"},"pos":"adj.","definition":{"en":"Precise English definition of the relevant sense.","zh":"精准中文释义"},"libraries":["ielts","writing","gre"],"topics":["社会与经济"],"functions":["观点评价"],"frequency":{"ielts":4,"gre":4},"register":"学术／正式／中性等语域说明","synonyms":[{"id":"another-valid-id","note":"近义辨析、强度及语域差别，不宣称所有语境可互换"}],"antonyms":[{"id":"opposite-valid-id","note":"反义或明确指出语境对照关系"}],"collocations":[{"en":"natural collocation one","zh":"搭配一"},{"en":"natural collocation two","zh":"搭配二"},{"en":"natural collocation three","zh":"搭配三"}],"examples":[{"type":"IELTS","en":"原创学术写作例句，约 16–25 个词。","zh":"例句中文翻译","highlights":["必须原样出现在 en 中的目标词或搭配"]},{"type":"GRE","en":"原创学术阅读例句，约 16–25 个词。","zh":"例句中文翻译","highlights":["必须原样出现在 en 中的目标词或搭配"]}],"note":"常见误用或搭配限制","forms":["相关屈折形式或拼写变体"]}
质量与一致性要求：
1. id 使用小写英文字母、数字及单连字符，以字母开头；word 和 id 均不得重复。引用时 id 必须逐字一致。
2. libraries 只可含 ielts、writing、gre；按适用场景合理选择，可多选。
3. 每词至少 1 个同义关联、1 个反义关联、3 个搭配，并分别提供至少 1 条 IELTS 及 1 条 GRE 语境例句。不要为了连边编造同义或反义关系；区分严格反义与语境对照。
4. 所有关联目标必须来自本批 words 或下面列出的已收录锚点，禁止悬空链接，禁止关联自身。优先按近义组、反义组构成可循环学习的词群。
5. frequency 两项均为 1–5 的整数，仅代表编辑建议的学习优先级，不声称来自官方考频统计。不要宣称使用某个词可确保 Band 9。
6. IPA、词性、释义、搭配须对应同一义项；英美音标不同请如实填写，相同也分别填。
7. 例句须原创，避免虚构期刊引用或冒用官方真题；每个 en 必须实际使用目标词或其正确屈折形式，highlights 必须包含该词形或包含该词形的完整搭配。highlights 每项须逐字、连续地出现在对应 en 中，大小写一致，不能只高亮无关词。
8. topics 尽量沿用：社会与经济、自然与环境、科技与教育、健康与生活、逻辑与论证；functions 可用：改善与恶化、因果与影响、利弊权衡、数量与趋势、观点评价、替换基础词；需要时可增加合理标签。
已收录锚点（只可引用以下列出的已有 id，其他已收录词未在此列出）：
${anchors || '暂无。所有关系必须在本批词条内部闭合。'}
生成后自行检查 JSON 语法、必填字段、真实语义关系和所有引用是否闭合。`;
  }
  return Object.freeze({ columns, parseCSV, toCSV, parseInput, validateImport, makePrompt, MAX_WORDS, MAX_BYTES });
})();
