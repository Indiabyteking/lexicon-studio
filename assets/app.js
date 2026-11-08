(() => {
  const { React, useState, useEffect, useMemo, useRef, useCallback, createRoot, compressToUTF16, decompressFromUTF16, ArrowUpRight, ArrowRight, ArrowLeft, BookOpen, Layers3, Network, Search, Sun, Moon, Upload, Download, X, ChevronDown, ChevronLeft, ChevronRight, Check, CheckCheck, RotateCcw, Shuffle, Volume2, Sparkles, SlidersHorizontal, GraduationCap, Feather, Plus, Minus, Maximize2, Info, CheckCircle2, AlertCircle, FileJson, FileSpreadsheet, Copy, Link2, Keyboard, Circle, RefreshCw, Database, Menu, Command, Target, Move, Eye, Quote } = LexiconDependencies;
  const SEED = window.LEXICON_DATA || (document.getElementById("seed-data") ? JSON.parse(document.getElementById("seed-data").textContent) : []);
  const IO = LexiconIO;
  const KEYS = { words: "lexicon.studio.words.v3", progress: "lexicon.studio.progress.v1", theme: "lexicon.studio.theme.v1" };
  const LIBS = [
    { id: "all", name: "\u5168\u90E8\u8BCD\u5E93", en: "All collections", short: "ALL", icon: Layers3, color: "green", description: "\u5728\u8BED\u5883\u4E2D\u7406\u89E3\uFF0C\u5728\u5173\u7CFB\u4E2D\u8BB0\u5FC6\u3002" },
    { id: "ielts", name: "\u96C5\u601D\u6838\u5FC3 7000", en: "IELTS Core 7000", short: "IELTS", icon: BookOpen, color: "blue", description: "\u4ECE\u542C\u8BF4\u8BFB\u5199\u7684\u5E38\u7528\u573A\u666F\uFF0C\u5EFA\u7ACB\u624E\u5B9E\u7684\u8BCD\u6C47\u5E95\u5EA7\u3002" },
    { id: "writing", name: "\u96C5\u601D\u5199\u4F5C Band 8+", en: "IELTS Writing Advanced", short: "WRITING", icon: Feather, color: "gold", description: "\u628A\u201C\u8BA4\u8BC6\u201D\u8F6C\u5316\u4E3A\u201C\u4F1A\u7528\u201D\uFF1A\u51C6\u786E\u3001\u81EA\u7136\u3001\u6709\u8BF4\u670D\u529B\u3002" },
    { id: "gre", name: "GRE \u6838\u5FC3\u8FDB\u9636", en: "GRE Verbal Master", short: "GRE", icon: GraduationCap, color: "purple", description: "\u8FA8\u6790\u8BED\u6C14\u4E0E\u903B\u8F91\uFF0C\u7406\u89E3\u8FD1\u4E49\u8BCD\u80CC\u540E\u7684\u7EC6\u5FAE\u5DEE\u522B\u3002" }
  ];
  const STATUS = { new: { label: "\u672A\u5B66", color: "muted", icon: Circle }, review: { label: "\u590D\u4E60\u4E2D", color: "gold", icon: RefreshCw }, mastered: { label: "\u5DF2\u638C\u63E1", color: "green", icon: CheckCircle2 } };
  const statusOf = (progress, id) => progress[id]?.status || "new";
  const dateLabel = () => (/* @__PURE__ */ new Date()).toISOString().slice(0, 10);
  const combine = (base, incoming) => [...new Map([...base, ...incoming].map((w) => [w.id, w])).values()];
  const unique = (values) => [...new Set(values)].sort((a, b) => a.localeCompare(b, "zh-CN"));
  const encode = (data) => "lz1:" + compressToUTF16(JSON.stringify(data));
  const decode = (text) => JSON.parse(text.startsWith("lz1:") ? decompressFromUTF16(text.slice(4)) : text);
  function loadInitial() {
    let words = SEED, progress = {}, theme = "light";
    const raw = {}, damaged = { words: false, progress: false, theme: false };
    const seedIds = new Set(SEED.map((w) => w.id));
    try {
      raw.words = localStorage.getItem(KEYS.words);
      if (raw.words) {
        const checked = IO.validateImport(decode(raw.words), SEED, { allowLargeStore: true });
        if (checked.errors.length) throw new Error(checked.errors[0]);
        words = combine(SEED, checked.words);
      } else {
        const legacyRaw = localStorage.getItem("lexicon.studio.words.v1");
        if (legacyRaw) {
          const decodedLegacy = decode(legacyRaw);
          const legacyList = Array.isArray(decodedLegacy) ? decodedLegacy : decodedLegacy?.words;
          if (Array.isArray(legacyList)) {
            const customOnly = legacyList.filter((w) => w && typeof w.id === "string" && !seedIds.has(w.id));
            if (customOnly.length) {
              const checkedCustom = IO.validateImport(customOnly, SEED, { allowLargeStore: true });
              if (!checkedCustom.errors.length) words = combine(SEED, checkedCustom.words);
            }
          }
        }
      }
    } catch (e) {
      damaged.words = true;
    }
    try {
      raw.progress = localStorage.getItem(KEYS.progress);
      if (raw.progress) {
        const parsed = decode(raw.progress), clean = {};
        if (!parsed || Array.isArray(parsed) || typeof parsed !== "object") throw new Error("invalid progress");
        for (const [id, p] of Object.entries(parsed)) {
          if (!/^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/.test(id) || ["constructor", "prototype", "__proto__"].includes(id) || !p || !["new", "review", "mastered"].includes(p.status) || !Number.isSafeInteger(p.reviews) || p.reviews < 0) throw new Error("invalid progress");
          if (p.lastReviewed != null && (typeof p.lastReviewed !== "string" && typeof p.lastReviewed !== "number" || !Number.isFinite(new Date(p.lastReviewed).getTime()))) throw new Error("invalid review date");
          clean[id] = { status: p.status, lastReviewed: p.lastReviewed == null ? null : new Date(p.lastReviewed).toISOString(), reviews: p.reviews };
        }
        progress = clean;
      }
    } catch (e) {
      damaged.progress = true;
    }
    try {
      raw.theme = localStorage.getItem(KEYS.theme);
      theme = raw.theme === "dark" ? "dark" : "light";
    } catch (e) {
      damaged.theme = true;
    }
    const error = Object.values(damaged).some(Boolean) ? "\u90E8\u5206\u672C\u5730\u6570\u636E\u65E0\u6CD5\u8BFB\u53D6\u3002\u539F\u59CB\u5185\u5BB9\u4FDD\u7559\uFF1B\u8BF7\u5728\u201C\u5B66\u4E60\u6307\u5357\u201D\u4E2D\u5BFC\u51FA\u6062\u590D\u6570\u636E\uFF0C\u6216\u5BFC\u5165\u6709\u6548\u7684 JSON \u5907\u4EFD\u3002" : "";
    return { words, progress, theme, error, raw, damaged };
  }
  const INITIAL = loadInitial();
  function downloadFile(name, content, type = "application/json;charset=utf-8") {
    const url = URL.createObjectURL(new Blob([content], { type }));
    const a = document.createElement("a");
    a.href = url;
    a.download = name;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1500);
  }
  function Highlight({ text, phrases = [] }) {
    const terms = [...new Set(phrases.filter(Boolean))].sort((a, b) => b.length - a.length);
    if (!terms.length) return text;
    const escaped = terms.map((x) => x.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
    const rx = new RegExp("\\b(" + escaped.join("|") + ")\\b", "gi");
    return text.split(rx).map((part, i) => terms.some((t) => t.toLowerCase() === part.toLowerCase()) ? /* @__PURE__ */ React.createElement("mark", { key: i }, part) : part);
  }
  function Badge({ children, color = "muted", className = "" }) {
    return /* @__PURE__ */ React.createElement("span", { className: `badge ${color} ${className}` }, children);
  }
  function LibraryBadges({ word }) {
    return /* @__PURE__ */ React.createElement("div", { className: "flex flex-wrap items-center gap-1.5" }, word.libraries.map((id) => /* @__PURE__ */ React.createElement(Badge, { key: id, color: LIBS.find((l) => l.id === id)?.color }, LIBS.find((l) => l.id === id)?.short || id)));
  }
  function StatusBadge({ status }) {
    const item = STATUS[status] || STATUS.new;
    const Icon = item.icon;
    return /* @__PURE__ */ React.createElement("span", { className: `status-pill ${item.color}` }, /* @__PURE__ */ React.createElement(Icon, { size: 12 }), item.label);
  }
  function Stars({ value, label }) {
    return /* @__PURE__ */ React.createElement("span", { className: "stars-row", title: "\u7F16\u8F91\u5EFA\u8BAE\u7684\u5B66\u4E60\u4F18\u5148\u7EA7\uFF0C\u975E\u5B98\u65B9\u8003\u9891\u7EDF\u8BA1" }, /* @__PURE__ */ React.createElement("span", null, label), /* @__PURE__ */ React.createElement("span", { "aria-label": `${value} / 5 \u661F`, className: "stars" }, Array.from({ length: 5 }, (_, i) => /* @__PURE__ */ React.createElement("span", { className: i < value ? "filled" : "", key: i }, "\u2605"))));
  }
  function IconButton({ icon: Icon, label, onClick, className = "", ...props }) {
    return /* @__PURE__ */ React.createElement("button", { type: "button", className: `icon-btn ${className}`, "aria-label": label, title: label, onClick, ...props }, /* @__PURE__ */ React.createElement(Icon, { size: 18 }));
  }
  function SectionTitle({ icon: Icon, children, trailing }) {
    return /* @__PURE__ */ React.createElement("div", { className: "section-heading" }, /* @__PURE__ */ React.createElement("h3", null, Icon && /* @__PURE__ */ React.createElement(Icon, { size: 16 }), " ", children), trailing && /* @__PURE__ */ React.createElement("span", null, trailing));
  }
  function EmptyState({ onClear, text = "\u6362\u4E00\u4E2A\u5173\u952E\u8BCD\uFF0C\u6216\u653E\u5BBD\u7B5B\u9009\u6761\u4EF6\u3002" }) {
    return /* @__PURE__ */ React.createElement("div", { className: "empty-state" }, /* @__PURE__ */ React.createElement("div", { className: "empty-icon" }, /* @__PURE__ */ React.createElement(Search, { size: 26 })), /* @__PURE__ */ React.createElement("h3", null, "\u6682\u65F6\u6CA1\u6709\u5339\u914D\u7684\u8BCD\u6C47"), /* @__PURE__ */ React.createElement("p", null, text), /* @__PURE__ */ React.createElement("button", { className: "btn secondary", onClick: onClear }, /* @__PURE__ */ React.createElement(RotateCcw, { size: 15 }), "\u6E05\u9664\u7B5B\u9009"));
  }
  function Modal({ title, subtitle, onClose, children, wide = false, drawer = false }) {
    const ref = useRef();
    useEffect(() => {
      const previous = document.activeElement, bodyOverflow = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      const first = ref.current.querySelector('button, input, textarea, select, [tabindex="0"]');
      first?.focus();
      const handle = (e) => {
        if (e.key === "Escape") {
          e.preventDefault();
          onClose();
          return;
        }
        if (e.key !== "Tab") return;
        const elements = [...ref.current.querySelectorAll('button:not([disabled]), a[href], input:not([disabled]), textarea:not([disabled]), select:not([disabled]), [tabindex="0"]')].filter((el) => el.tabIndex >= 0 && el.getClientRects().length);
        if (!elements.length) {
          e.preventDefault();
          return;
        }
        const first2 = elements[0], last = elements.at(-1);
        if (e.shiftKey && (document.activeElement === first2 || !ref.current.contains(document.activeElement))) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && (document.activeElement === last || !ref.current.contains(document.activeElement))) {
          e.preventDefault();
          first2.focus();
        }
      };
      document.addEventListener("keydown", handle);
      return () => {
        document.body.style.overflow = bodyOverflow;
        document.removeEventListener("keydown", handle);
        previous?.isConnected && previous.focus();
      };
    }, [onClose]);
    return /* @__PURE__ */ React.createElement("div", { className: `modal-shade ${drawer ? "drawer-shade" : ""}`, onMouseDown: (e) => e.target === e.currentTarget && onClose() }, /* @__PURE__ */ React.createElement("section", { className: `modal ${wide ? "wide" : ""} ${drawer ? "drawer" : ""}`, ref, role: "dialog", "aria-modal": "true", "aria-labelledby": "modal-title" }, /* @__PURE__ */ React.createElement("header", { className: "modal-header" }, /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("h2", { id: "modal-title" }, title), subtitle && /* @__PURE__ */ React.createElement("p", null, subtitle)), /* @__PURE__ */ React.createElement(IconButton, { icon: X, label: "\u5173\u95ED\u5F39\u7A97", onClick: onClose })), children));
  }
  function WordDetail({ word, wordMap, progress, onStatus, onLink, history, onBack, onGraph, onClose, speak, onFilterTopic, onFilterFunc }) {
    const body = useRef();
    useEffect(() => {
      body.current?.scrollTo({ top: 0, behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" });
    }, [word.id]);
    return /* @__PURE__ */ React.createElement(Modal, { title: "\u8BCD\u6C47\u6DF1\u5EA6\u5361\u7247", subtitle: "WORD, MEANING & CONNECTIONS", onClose, drawer: true }, /* @__PURE__ */ React.createElement("div", { className: "detail-body", ref: body }, /* @__PURE__ */ React.createElement("div", { className: "detail-trail" }, /* @__PURE__ */ React.createElement("button", { className: "text-btn", disabled: history.length < 2, onClick: onBack }, /* @__PURE__ */ React.createElement(ArrowLeft, { size: 14 }), "\u8FD4\u56DE\u4E0A\u4E00\u4E2A"), /* @__PURE__ */ React.createElement("span", null, history.length > 1 ? history.slice(-3).map((id) => wordMap.get(id)?.word).join(" / ") : "\u4ECE\u4E00\u4E2A\u8BCD\u5F00\u59CB\u63A2\u7D22")), /* @__PURE__ */ React.createElement("div", { className: "detail-word-header" }, /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement(LibraryBadges, { word }), /* @__PURE__ */ React.createElement("h2", { className: "serif word-title" }, word.word)), /* @__PURE__ */ React.createElement(StatusBadge, { status: statusOf(progress, word.id) })), /* @__PURE__ */ React.createElement("div", { className: "pronunciation" }, /* @__PURE__ */ React.createElement("button", { onClick: () => speak(word.word, "en-GB"), title: "\u4F7F\u7528\u8BBE\u5907\u82F1\u5F0F\u8BED\u97F3\u6717\u8BFB" }, /* @__PURE__ */ React.createElement(Volume2, { size: 15 }), /* @__PURE__ */ React.createElement("b", null, "UK"), " ", word.ipa.uk), /* @__PURE__ */ React.createElement("button", { onClick: () => speak(word.word, "en-US"), title: "\u4F7F\u7528\u8BBE\u5907\u7F8E\u5F0F\u8BED\u97F3\u6717\u8BFB" }, /* @__PURE__ */ React.createElement(Volume2, { size: 15 }), /* @__PURE__ */ React.createElement("b", null, "US"), " ", word.ipa.us)), /* @__PURE__ */ React.createElement("div", { className: "definition-block" }, /* @__PURE__ */ React.createElement(Badge, { color: word.pos.startsWith("v") ? "green" : word.pos.startsWith("n") ? "blue" : "purple" }, word.pos), /* @__PURE__ */ React.createElement("h3", null, word.definition.zh), /* @__PURE__ */ React.createElement("p", null, word.definition.en)), /* @__PURE__ */ React.createElement("div", { className: "priority-block" }, /* @__PURE__ */ React.createElement(Stars, { value: word.frequency.ielts, label: "IELTS" }), /* @__PURE__ */ React.createElement(Stars, { value: word.frequency.gre, label: "GRE" }), /* @__PURE__ */ React.createElement("small", null, "\u661F\u7EA7\u4E3A\u5B66\u4E60\u4F18\u5148\u7EA7")), /* @__PURE__ */ React.createElement("div", { className: "detail-tags" }, word.topics.map((t) => /* @__PURE__ */ React.createElement("button", { key: t, type: "button", className: "detail-tag-btn", title: `\u7B5B\u9009\u8BDD\u9898\uFF1A${t}`, onClick: () => onFilterTopic && onFilterTopic(t) }, "# ", t)), word.functions.map((t) => /* @__PURE__ */ React.createElement("button", { key: t, type: "button", className: "detail-tag-btn", title: `\u7B5B\u9009\u5199\u4F5C\u529F\u80FD\uFF1A${t}`, onClick: () => onFilterFunc && onFilterFunc(t) }, "\u2726 ", t))), /* @__PURE__ */ React.createElement("div", { className: "register-note" }, /* @__PURE__ */ React.createElement("span", null, "\u8BED\u57DF"), word.register), /* @__PURE__ */ React.createElement(SectionTitle, { icon: Network, trailing: "\u70B9\u51FB\u8BCD\u6C47\uFF0C\u7EE7\u7EED\u4E32\u8054" }, "\u8BCD\u4E49\u5173\u7CFB"), [["synonyms", "\u8FD1\u4E49 \xB7 \u8BED\u57DF\u8FA8\u6790"], ["antonyms", "\u53CD\u4E49 \xB7 \u8BED\u5883\u5BF9\u7167"], ["partners", "\u642D\u914D \xB7 \u5E38\u7528\u8BCD\u4F19"]].filter(([kind]) => (word[kind] || []).length > 0).map(([kind, title]) => /* @__PURE__ */ React.createElement("div", { key: kind, className: `relation-group ${kind}` }, /* @__PURE__ */ React.createElement("h4", null, /* @__PURE__ */ React.createElement("span", { className: "dot" }), title), (word[kind] || []).map((link) => /* @__PURE__ */ React.createElement("button", { className: "relation-item", key: link.id, onClick: () => onLink(link.id) }, /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("span", { className: "relation-partner-meta" }, /* @__PURE__ */ React.createElement("strong", null, wordMap.get(link.id)?.word || link.id), link.rel && /* @__PURE__ */ React.createElement("span", { className: "relation-rel-badge" }, link.rel), link.phrase && /* @__PURE__ */ React.createElement("span", { className: "relation-phrase-tag" }, link.phrase)), /* @__PURE__ */ React.createElement(ArrowUpRight, { size: 14 })), /* @__PURE__ */ React.createElement("p", null, link.note))))), /* @__PURE__ */ React.createElement("button", { className: "btn secondary full", onClick: () => onGraph(word.id) }, /* @__PURE__ */ React.createElement(Network, { size: 16 }), "\u5728\u5173\u7CFB\u56FE\u8C31\u4E2D\u5C55\u5F00", /* @__PURE__ */ React.createElement(ArrowUpRight, { size: 15 })), /* @__PURE__ */ React.createElement(SectionTitle, { icon: Link2, trailing: `${word.collocations.length} \u7EC4\u5730\u9053\u8868\u8FBE` }, "\u9AD8\u9636\u642D\u914D"), /* @__PURE__ */ React.createElement("div", { className: "collocations" }, word.collocations.map((item, i) => /* @__PURE__ */ React.createElement("div", { key: i }, /* @__PURE__ */ React.createElement("span", { className: "item-number" }, "0", i + 1), /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("strong", null, item.en), /* @__PURE__ */ React.createElement("p", null, item.zh))))), /* @__PURE__ */ React.createElement(SectionTitle, { icon: Quote, trailing: `${word.examples.length} \u53E5\u9AD8\u9636\u8BED\u6599\u793A\u8303` }, "\u5B66\u672F\u8868\u8FBE"), word.examples.map((example, i) => { const typeIdx = word.examples.slice(0, i + 1).filter((e) => e.type === example.type).length; const typeTotal = word.examples.filter((e) => e.type === example.type).length; return /* @__PURE__ */ React.createElement("article", { className: "example", key: i }, /* @__PURE__ */ React.createElement("div", { className: "example-header" }, /* @__PURE__ */ React.createElement(Badge, { color: example.type === "IELTS" ? "gold" : "purple" }, example.type === "IELTS" ? `IELTS \xB7 \u9AD8\u9636\u5199\u4F5C${typeTotal > 1 ? " #" + typeIdx : ""}` : `GRE \xB7 \u5B66\u672F\u8BED\u5883${typeTotal > 1 ? " #" + typeIdx : ""}`), /* @__PURE__ */ React.createElement(IconButton, { icon: Volume2, className: "example-speak", label: "\u6717\u8BFB\u4F8B\u53E5", onClick: () => speak(example.en, example.type === "IELTS" ? "en-GB" : "en-US") })), /* @__PURE__ */ React.createElement("p", { className: "example-en" }, /* @__PURE__ */ React.createElement(Highlight, { text: example.en, phrases: [...example.highlights, word.word, ...word.forms] })), /* @__PURE__ */ React.createElement("p", { className: "example-zh" }, example.zh)); }), /* @__PURE__ */ React.createElement("div", { className: "usage-note" }, /* @__PURE__ */ React.createElement(Info, { size: 18 }), /* @__PURE__ */ React.createElement("div", { className: "usage-note-content" }, /* @__PURE__ */ React.createElement("strong", null, "\u6DF1\u5EA6\u7528\u6CD5\u4E0E\u8003\u573A\u6307\u5357"), word.note.includes("\u3010") ? /* @__PURE__ */ React.createElement("div", { className: "usage-note-sections" }, word.note.split(/(?=\u3010[^\u3011]+\u3011)/).map((seg, idx) => { const m = seg.trim().match(/^\u3010([^\u3011]+)\u3011(.*)$/s); return m ? /* @__PURE__ */ React.createElement("div", { key: idx, className: "usage-note-row" }, /* @__PURE__ */ React.createElement("span", { className: "usage-note-tag" }, m[1]), /* @__PURE__ */ React.createElement("span", { className: "usage-note-text" }, m[2].trim())) : seg.trim() ? /* @__PURE__ */ React.createElement("p", { key: idx }, seg.trim()) : null; })) : /* @__PURE__ */ React.createElement("p", null, word.note))), word.forms.length > 0 && /* @__PURE__ */ React.createElement("p", { className: "forms" }, /* @__PURE__ */ React.createElement("span", null, "\u8BCD\u5F62 / \u62FC\u5199"), " ", word.forms.join(" \xB7 "))), /* @__PURE__ */ React.createElement("footer", { className: "detail-footer" }, /* @__PURE__ */ React.createElement("span", null, "\u6211\u7684\u638C\u63E1\u7A0B\u5EA6"), /* @__PURE__ */ React.createElement("div", { className: "status-actions" }, Object.entries(STATUS).map(([id, item]) => {
      const Icon = item.icon;
      return /* @__PURE__ */ React.createElement("button", { key: id, className: `btn ${statusOf(progress, word.id) === id ? "selected-" + item.color : "secondary"}`, onClick: () => onStatus(word.id, id) }, /* @__PURE__ */ React.createElement(Icon, { size: 15 }), item.label);
    }))));
  }
  const WordCard = React.memo(function WordCard({ word, curStatus = "new", onOpen, onLink, onStatus, speak, wordMap, cardIndex, highlighted }) {
    const isMastered = curStatus === "mastered";
    const isReview = curStatus === "review";
    return /* @__PURE__ */ React.createElement("article", {
      id: `word-card-${word.id}`,
      className: `word-card group ${isMastered ? "is-mastered-card" : ""} ${highlighted ? "is-highlighted-card" : ""}`,
      role: "button",
      tabIndex: 0,
      "aria-label": `\u67E5\u770B ${word.word} \u5B8C\u6574\u91CA\u4E49\u3001\u642D\u914D\u4E0E\u540C\u53CD\u4E49\u8BCD`,
      onClick: (e) => {
        if (e.target.closest("button")) return;
        onOpen(word.id);
      },
      onKeyDown: (e) => {
        if (e.target === e.currentTarget && (e.key === "Enter" || e.key === " ")) {
          e.preventDefault();
          onOpen(word.id);
        }
      }
    }, /* @__PURE__ */ React.createElement("div", { className: "flex items-center justify-between gap-2" }, /* @__PURE__ */ React.createElement("div", { className: "flex items-center gap-1.5 flex-wrap" }, cardIndex != null && /* @__PURE__ */ React.createElement("span", { className: "card-index-badge", title: `\u5F53\u524D\u5217\u8868\u7B2C #${cardIndex} \u5F20\u8BCD\u5361` }, "#", cardIndex), /* @__PURE__ */ React.createElement(LibraryBadges, { word })), /* @__PURE__ */ React.createElement("div", { className: "card-quick-status" }, /* @__PURE__ */ React.createElement("button", {
      type: "button",
      className: `card-review-btn ${isReview ? "active" : ""}`,
      title: isReview ? "\u5DF2\u5728\u590D\u4E60\u5217\u8868\uFF0C\u70B9\u51FB\u91CD\u7F6E\u4E3A\u672A\u5B66" : "\u6807\u8BB0\u4E3A\u590D\u4E60\u4E2D\uFF08\u65E0\u9700\u8FDB\u5165\u8BCD\u5361\uFF09",
      onClick: (e) => {
        e.stopPropagation();
        onStatus && onStatus(word.id, isReview ? "new" : "review");
      }
    }, /* @__PURE__ */ React.createElement(RefreshCw, { size: 12 }), isReview ? "\u590D\u4E60\u4E2D" : "\u5F85\u590D\u4E60"), /* @__PURE__ */ React.createElement("button", {
      type: "button",
      className: `card-master-btn ${isMastered ? "active" : ""}`,
      title: isMastered ? "\u5DF2\u638C\u63E1\uFF0C\u70B9\u51FB\u53D6\u6D88\u5DF2\u638C\u63E1\u72B6\u6001" : "\u4E00\u952E\u6807\u8BB0\u4E3A\u5DF2\u638C\u63E1\uFF08\u65E0\u9700\u70B9\u8FDB\u8BCD\u5361\uFF09",
      "aria-pressed": isMastered,
      onClick: (e) => {
        e.stopPropagation();
        onStatus && onStatus(word.id, isMastered ? "new" : "mastered");
      }
    }, /* @__PURE__ */ React.createElement(CheckCircle2, { size: 13 }), isMastered ? "\u5DF2\u638C\u63E1" : "\u638C\u63E1"))), /* @__PURE__ */ React.createElement("div", { className: "card-word-row" }, /* @__PURE__ */ React.createElement("button", { className: "card-word serif", onClick: (e) => { e.stopPropagation(); onOpen(word.id); } }, word.word), /* @__PURE__ */ React.createElement(IconButton, { icon: Volume2, label: `\u6717\u8BFB ${word.word}`, onClick: (e) => { e.stopPropagation(); speak(word.word, "en-GB"); } })), /* @__PURE__ */ React.createElement("div", { className: "card-phonetic" }, /* @__PURE__ */ React.createElement(Badge, { color: word.pos.startsWith("v") ? "green" : word.pos.startsWith("n") ? "blue" : "purple" }, word.pos), /* @__PURE__ */ React.createElement("span", { className: "card-ipa-text" }, word.ipa.uk), /* @__PURE__ */ React.createElement("span", { className: "card-stars", title: `IELTS ${word.frequency.ielts}\u2605 / GRE ${word.frequency.gre}\u2605` }, "\u2605".repeat(Math.max(word.frequency.ielts, word.frequency.gre)))), /* @__PURE__ */ React.createElement("p", { className: "card-definition" }, word.definition.zh), /* @__PURE__ */ React.createElement("p", { className: "card-definition-en" }, word.definition.en), word.collocations?.[0] && /* @__PURE__ */ React.createElement("div", { className: "card-collocation-preview" }, /* @__PURE__ */ React.createElement("span", { className: "card-colloc-en" }, word.collocations[0].en), /* @__PURE__ */ React.createElement("span", { className: "card-colloc-zh" }, word.collocations[0].zh)), /* @__PURE__ */ React.createElement("div", { className: "card-links" }, /* @__PURE__ */ React.createElement(Link2, { size: 14 }), word.synonyms.slice(0, 2).map((l) => /* @__PURE__ */ React.createElement("button", { key: `s-${l.id}`, title: `\u8FD1\u4E49\uFF1A${l.note}`, onClick: (e) => { e.stopPropagation(); onLink(l.id); } }, "\u2248 ", wordMap.get(l.id)?.word || l.id)), word.antonyms.slice(0, 1).map((l) => /* @__PURE__ */ React.createElement("button", { key: `a-${l.id}`, className: "opposite", title: `\u53CD\u4E49\uFF1A${l.note}`, onClick: (e) => { e.stopPropagation(); onLink(l.id); } }, "\u2260 ", wordMap.get(l.id)?.word || l.id)), (word.partners || []).slice(0, word.synonyms.length + word.antonyms.length >= 2 ? 1 : 2).map((l) => /* @__PURE__ */ React.createElement("button", { key: `p-${l.id}`, className: "partner-link", title: `${l.rel || "\u642D\u914D"}\uFF1A${l.phrase ? l.phrase + " \u2014 " : ""}${l.note}`, onClick: (e) => { e.stopPropagation(); onLink(l.id); } }, "\u2295 ", wordMap.get(l.id)?.word || l.id, l.rel && /* @__PURE__ */ React.createElement("small", null, l.rel)))), /* @__PURE__ */ React.createElement("div", { className: "card-bottom" }, /* @__PURE__ */ React.createElement("span", { className: "card-topic-tag" }, "# ", word.topics[0], word.functions?.[0] ? ` \xB7 ${word.functions[0]}` : ""), /* @__PURE__ */ React.createElement("button", { onClick: (e) => { e.stopPropagation(); onOpen(word.id); }, "aria-label": `\u67E5\u770B ${word.word} \u5B8C\u6574\u91CA\u4E49\u3001\u642D\u914D\u548C\u4F8B\u53E5` }, "\u67E5\u770B\u8BE6\u60C5", /* @__PURE__ */ React.createElement(ArrowUpRight, { size: 15 }))));
  });
  const HeroNetwork = React.memo(function HeroNetwork({ onOpen, words, wordMap }) {
    const central = (wordMap ? wordMap.get("mitigate") : words.find((w) => w.id === "mitigate")) || words[0];
    const choices = [...central.synonyms.slice(0, 2).map((r, i) => ({ ...r, kind: "synonym", slot: i })), ...central.antonyms.slice(0, 2).map((r, i) => ({ ...r, kind: "antonym", slot: i + 2 }))].map((r) => ({ ...r, word: wordMap ? wordMap.get(r.id) : words.find((w) => w.id === r.id) })).filter((r) => r.word);
    const positions = [[37, 22], [68, 79], [281, 16], [303, 89]];
    return /* @__PURE__ */ React.createElement("div", { className: "hero-network", "aria-label": "\u8BCD\u4E49\u5173\u7CFB\u9884\u89C8" }, /* @__PURE__ */ React.createElement("svg", { viewBox: "0 0 420 168", "aria-hidden": "true" }, /* @__PURE__ */ React.createElement("defs", null, /* @__PURE__ */ React.createElement("linearGradient", { id: "heroLine" }, /* @__PURE__ */ React.createElement("stop", { stopColor: "var(--accent)", stopOpacity: ".8" }), /* @__PURE__ */ React.createElement("stop", { offset: "1", stopColor: "var(--accent)", stopOpacity: ".2" }))), choices.map((c) => {
      const [x, y] = positions[c.slot];
      return /* @__PURE__ */ React.createElement("path", { key: c.id, d: `M210 83 Q${x + 45} 83 ${x + 45} ${y + 17}`, fill: "none", stroke: "url(#heroLine)", strokeWidth: "1.3", strokeDasharray: c.kind === "antonym" ? "4 4" : void 0 });
    }), /* @__PURE__ */ React.createElement("circle", { cx: "210", cy: "83", r: "57", fill: "none", stroke: "var(--border)", strokeDasharray: "3 5" })), choices.map((c) => /* @__PURE__ */ React.createElement("button", { key: c.id, className: `hero-node ${c.kind === "antonym" ? "negative" : ""}`, style: { left: positions[c.slot][0] / 4.2 + "%", top: positions[c.slot][1] / 1.68 + "%" }, onClick: () => onOpen(c.id) }, c.word.word, /* @__PURE__ */ React.createElement("span", null, c.kind === "antonym" ? "\u53CD\u4E49" : "\u8FD1\u4E49"))), /* @__PURE__ */ React.createElement("button", { className: "hero-center", onClick: () => onOpen(central.id) }, /* @__PURE__ */ React.createElement("span", { className: "tiny-label" }, "START HERE"), /* @__PURE__ */ React.createElement("strong", { className: "serif" }, central.word), /* @__PURE__ */ React.createElement("span", null, "\u4E00\u8BCD\uFF0C\u8FDE\u63A5\u66F4\u591A\u3002")), /* @__PURE__ */ React.createElement("div", { className: "hero-network-caption" }, /* @__PURE__ */ React.createElement("span", { className: "dot" }), "\u70B9\u51FB\u8282\u70B9\uFF0C\u6CBF\u7740\u8BED\u4E49\u63A2\u7D22"));
  });
  function GraphView({ focusId, setFocus, filtered, wordMap, onOpen, progress, speak }) {
    const [zoom, setZoom] = useState(1), [pan, setPan] = useState({ x: 0, y: 0 });
    const [compact, setCompact] = useState(() => window.matchMedia("(max-width:580px)").matches);
    const word = wordMap.get(focusId) || filtered[0];
    const [trail, setTrail] = useState(() => word ? [word.id] : []);
    const drag = useRef(null), svgRef = useRef();
    useEffect(() => {
      setPan({ x: 0, y: 0 });
      setZoom(1);
      if (word?.id) {
        setTrail((prev) => prev.at(-1) === word.id ? prev : [...prev.filter((id) => id !== word.id).slice(-9), word.id]);
      }
    }, [word?.id]);
    useEffect(() => {
      const mq = window.matchMedia("(max-width:580px)"), change = () => setCompact(mq.matches);
      mq.addEventListener("change", change);
      return () => mq.removeEventListener("change", change);
    }, []);
    if (!word) return null;
    const cx = compact ? 240 : 480, cy = compact ? 310 : 260, canvasWidth = compact ? 480 : 960, canvasHeight = compact ? 620 : 520, nodeWidth = compact ? 132 : 168, nodeLimit = compact ? 3 : 4;
    const nodes = [];
    const leftLinks = word.synonyms.filter((l) => wordMap.has(l.id)).slice(0, nodeLimit).map((l) => ({ ...l, kind: "synonyms", side: -1 }));
    const rightLinks = [
      ...word.antonyms.filter((l) => wordMap.has(l.id)).slice(0, nodeLimit).map((l) => ({ ...l, kind: "antonyms", side: 1 })),
      ...(word.partners || []).filter((l) => wordMap.has(l.id)).slice(0, 2).map((l) => ({ ...l, kind: "partners", side: leftLinks.length === 0 ? -1 : 1 }))
    ];
    for (const [side, group] of [[-1, leftLinks.concat(rightLinks.filter((r) => r.side === -1))], [1, rightLinks.filter((r) => r.side === 1)]]) {
      const links = group.slice(0, nodeLimit + 1);
      links.forEach((l, i) => {
        const fraction = links.length === 1 ? 0.5 : i / (links.length - 1);
        const x = compact ? 90 + fraction * 300 : cx + side * (205 + 32 * Math.sin(fraction * Math.PI));
        const y = compact ? cy + side * 200 : links.length === 1 ? cy : 96 + fraction * 328;
        nodes.push({ ...l, x, y, word: wordMap.get(l.id) });
      });
    }
    const satellites = [];
    if (!compact) {
      const usedIds = new Set([word.id, ...nodes.map((n) => n.id)]);
      const slots = [
        { side: -1, x: cx - 385, y: 66 },
        { side: -1, x: cx - 385, y: 454 },
        { side: 1, x: cx + 385, y: 66 },
        { side: 1, x: cx + 385, y: 454 }
      ];
      for (const slot of slots) {
        const candidates = nodes.filter((n) => n.side === slot.side);
        if (!candidates.length) continue;
        const parent = slot.y < cy ? candidates[0] : candidates.at(-1);
        const nextRel = [...parent.word.synonyms, ...parent.word.antonyms, ...(parent.word.partners || [])].find((r) => wordMap.has(r.id) && !usedIds.has(r.id));
        if (nextRel) {
          usedIds.add(nextRel.id);
          satellites.push({ id: nextRel.id, note: nextRel.note, word: wordMap.get(nextRel.id), x: slot.x, y: slot.y, px: parent.x, py: parent.y });
        }
      }
    }
    const startPan = (e) => {
      if (e.target.closest("[data-node]")) return;
      const rect = svgRef.current.getBoundingClientRect();
      drag.current = { x: e.clientX, y: e.clientY, pan, scale: canvasWidth / rect.width };
      e.currentTarget.setPointerCapture(e.pointerId);
    };
    return /* @__PURE__ */ React.createElement("section", { className: "graph-panel" }, /* @__PURE__ */ React.createElement("div", { className: "graph-top" }, /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("span", { className: "eyebrow" }, "SEMANTIC NEIGHBOURHOOD"), /* @__PURE__ */ React.createElement("h3", null, "\u6BCF\u4E00\u4E2A\u8BCD\uFF0C\u90FD\u662F\u65B0\u7684\u8D77\u70B9\u3002")), /* @__PURE__ */ React.createElement("label", { className: "select-wrap" }, /* @__PURE__ */ React.createElement("span", { className: "sr-only" }, "\u9009\u62E9\u56FE\u8C31\u8D77\u70B9"), /* @__PURE__ */ React.createElement("select", { value: word.id, onChange: (e) => setFocus(e.target.value) }, !filtered.slice(0, 400).some((w) => w.id === word.id) && /* @__PURE__ */ React.createElement("option", { value: word.id }, word.word, " \xB7 \u5173\u8054\u8BCD"), filtered.slice(0, 400).map((w) => /* @__PURE__ */ React.createElement("option", { key: w.id, value: w.id }, w.word))), /* @__PURE__ */ React.createElement(ChevronDown, { size: 14 }))), /* @__PURE__ */ React.createElement("div", { className: "graph-focus-bar" }, /* @__PURE__ */ React.createElement("div", { className: "graph-focus-info" }, /* @__PURE__ */ React.createElement(Badge, { color: word.pos.startsWith("v") ? "green" : word.pos.startsWith("n") ? "blue" : "purple" }, word.pos), /* @__PURE__ */ React.createElement("strong", { className: "serif" }, word.word), speak && /* @__PURE__ */ React.createElement(IconButton, { icon: Volume2, label: `\u6717\u8BFB ${word.word}`, onClick: () => speak(word.word, "en-GB") }), /* @__PURE__ */ React.createElement("p", null, word.definition.zh)), /* @__PURE__ */ React.createElement("button", { className: "btn secondary", onClick: () => onOpen(word.id) }, "\u6253\u5F00\u5B8C\u6574\u8BCD\u5361", /* @__PURE__ */ React.createElement(ArrowUpRight, { size: 14 }))), trail.length > 1 && /* @__PURE__ */ React.createElement("div", { className: "graph-trail" }, /* @__PURE__ */ React.createElement("span", null, "\u63A2\u7D22\u8DB3\u8FF9\uFF1A"), trail.map((id) => /* @__PURE__ */ React.createElement("button", { key: id, type: "button", className: `graph-trail-btn ${id === word.id ? "current" : ""}`, onClick: () => setFocus(id) }, wordMap.get(id)?.word || id))), /* @__PURE__ */ React.createElement("div", { className: "graph-canvas" }, /* @__PURE__ */ React.createElement("div", { className: "graph-legend" }, /* @__PURE__ */ React.createElement("span", null, /* @__PURE__ */ React.createElement("i", { className: "legend-line" }), "\u8FD1\u4E49 / \u8FA8\u6790"), /* @__PURE__ */ React.createElement("span", null, /* @__PURE__ */ React.createElement("i", { className: "legend-line opposite" }), "\u53CD\u4E49 / \u5BF9\u7167"), /* @__PURE__ */ React.createElement("span", null, /* @__PURE__ */ React.createElement("i", { className: "legend-line partner" }), "\u642D\u914D / \u8BCD\u4F19")), /* @__PURE__ */ React.createElement("svg", { ref: svgRef, viewBox: `0 0 ${canvasWidth} ${canvasHeight}`, className: "network-svg", role: "group", "aria-label": `${word.word} \u7684\u540C\u53CD\u4E49\u8BCD\u5173\u7CFB\u56FE\uFF0C\u70B9\u51FB\u4EFB\u4E00\u8BCD\u6C47\u91CD\u65B0\u5C55\u5F00`, onPointerDown: startPan, onPointerMove: (e) => {
      if (drag.current) setPan({ x: drag.current.pan.x + (e.clientX - drag.current.x) * drag.current.scale, y: drag.current.pan.y + (e.clientY - drag.current.y) * drag.current.scale });
    }, onPointerUp: () => {
      drag.current = null;
    }, onPointerCancel: () => {
      drag.current = null;
    } }, /* @__PURE__ */ React.createElement("defs", null, /* @__PURE__ */ React.createElement("pattern", { id: "graph-dots", x: "0", y: "0", width: "24", height: "24", patternUnits: "userSpaceOnUse" }, /* @__PURE__ */ React.createElement("circle", { cx: "2", cy: "2", r: "1", fill: "var(--graph-dot)" }))), /* @__PURE__ */ React.createElement("rect", { width: canvasWidth, height: canvasHeight, fill: "url(#graph-dots)" }), /* @__PURE__ */ React.createElement("g", { transform: `translate(${cx + pan.x},${cy + pan.y}) scale(${zoom}) translate(${-cx},${-cy})` }, /* @__PURE__ */ React.createElement("circle", { cx, cy, r: compact ? 105 : 115, className: "graph-orbit" }), /* @__PURE__ */ React.createElement("circle", { cx, cy, r: compact ? 147 : 175, className: "graph-orbit outer" }), satellites.map((s) => /* @__PURE__ */ React.createElement("path", { key: `sat-edge-${s.id}`, d: `M${s.px} ${s.py} Q${(s.px + s.x) / 2} ${s.y} ${s.x} ${s.y}`, className: "graph-edge satellite" })), nodes.map((n) => /* @__PURE__ */ React.createElement("path", { key: `${n.kind}-${n.id}`, d: compact ? `M${cx} ${cy} C${cx} ${(cy + n.y) / 2} ${n.x} ${(cy + n.y) / 2} ${n.x} ${n.y}` : `M${cx} ${cy} C${(cx + n.x) / 2} ${cy} ${(cx + n.x) / 2} ${n.y} ${n.x} ${n.y}`, className: `graph-edge ${n.kind}` })), satellites.map((s) => /* @__PURE__ */ React.createElement("g", { key: `sat-${s.id}`, "data-node": "true", role: "button", tabIndex: 0, "aria-label": `\u8DF3\u8F6C\u4E8C\u9636\u5173\u8054\u8BCD ${s.word.word}`, onClick: () => setFocus(s.id), onKeyDown: (e) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        setFocus(s.id);
      }
    }, className: "graph-node satellite" }, /* @__PURE__ */ React.createElement("title", null, s.word.word, " \xB7 \u4E8C\u9636\u5173\u8054\uFF1A", s.note), /* @__PURE__ */ React.createElement("rect", { x: s.x - 64, y: s.y - 24, width: "128", height: "48", rx: "10" }), /* @__PURE__ */ React.createElement("text", { x: s.x, y: s.y - 2, textAnchor: "middle", className: "graph-word", style: { fontSize: "13px" } }, s.word.word.length > 14 ? s.word.word.slice(0, 13) + "\u2026" : s.word.word), /* @__PURE__ */ React.createElement("text", { x: s.x, y: s.y + 14, textAnchor: "middle", className: "graph-meaning" }, "\u4E8C\u9636 \xB7 ", s.word.definition.zh.slice(0, 6), s.word.definition.zh.length > 6 ? "\u2026" : ""))), nodes.map((n) => /* @__PURE__ */ React.createElement("g", { key: `${n.kind}-${n.id}`, "data-node": "true", role: "button", tabIndex: 0, "aria-label": `\u4EE5 ${n.word.word} \u4E3A\u4E2D\u5FC3\u5C55\u5F00\u56FE\u8C31`, onClick: () => setFocus(n.id), onKeyDown: (e) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        setFocus(n.id);
      }
    }, className: `graph-node ${n.kind}` }, /* @__PURE__ */ React.createElement("title", null, n.word.word, "\uFF1A", n.note), /* @__PURE__ */ React.createElement("rect", { x: n.x - nodeWidth / 2, y: n.y - 33, width: nodeWidth, height: "66", rx: "12" }), /* @__PURE__ */ React.createElement("circle", { cx: n.x - nodeWidth / 2 + 16, cy: n.y - 18, r: "3", className: statusOf(progress, n.id) === "mastered" ? "learned" : "" }), /* @__PURE__ */ React.createElement("text", { x: n.x, y: n.y - 3, textAnchor: "middle", className: "graph-word" }, n.word.word.length > (compact ? 13 : 18) ? n.word.word.slice(0, compact ? 12 : 17) + "\u2026" : n.word.word), /* @__PURE__ */ React.createElement("text", { x: n.x, y: n.y + 17, textAnchor: "middle", className: "graph-meaning" }, n.word.definition.zh.slice(0, compact ? 10 : 12), n.word.definition.zh.length > (compact ? 10 : 12) ? "\u2026" : ""))), /* @__PURE__ */ React.createElement("g", { "data-node": "true", role: "button", tabIndex: 0, "aria-label": `\u67E5\u770B\u4E2D\u5FC3\u8BCD ${word.word} \u7684\u8BE6\u60C5`, onClick: () => onOpen(word.id), onKeyDown: (e) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        onOpen(word.id);
      }
    }, className: "graph-node center" }, /* @__PURE__ */ React.createElement("rect", { x: cx - 106, y: cy - 46, width: "212", height: "92", rx: "16" }), /* @__PURE__ */ React.createElement("text", { x: cx, y: cy - 23, textAnchor: "middle", className: "graph-center-label" }, "FOCUS WORD"), /* @__PURE__ */ React.createElement("text", { x: cx, y: cy + 5, textAnchor: "middle", className: "graph-center-word" }, word.word.length > 17 ? word.word.slice(0, 16) + "\u2026" : word.word), /* @__PURE__ */ React.createElement("text", { x: cx, y: cy + 27, textAnchor: "middle", className: "graph-center-label" }, "\u70B9\u51FB\u67E5\u770B\u5B8C\u6574\u8BCD\u5361 \u2197")))), /* @__PURE__ */ React.createElement("div", { className: "graph-bottom" }, /* @__PURE__ */ React.createElement("span", null, /* @__PURE__ */ React.createElement(Move, { size: 13 }), "\u62D6\u52A8\u7A7A\u767D\u5904\u79FB\u52A8 \xB7 \u70B9\u51FB\u8282\u70B9\u4E32\u8054"), /* @__PURE__ */ React.createElement("div", { className: "zoom-controls" }, /* @__PURE__ */ React.createElement(IconButton, { icon: Minus, label: "\u7F29\u5C0F\u56FE\u8C31", onClick: () => setZoom((z) => Math.max(0.6, +(z - 0.15).toFixed(2))), disabled: zoom <= 0.6 }), /* @__PURE__ */ React.createElement("span", null, Math.round(zoom * 100), "%"), /* @__PURE__ */ React.createElement(IconButton, { icon: Plus, label: "\u653E\u5927\u56FE\u8C31", onClick: () => setZoom((z) => Math.min(1.6, +(z + 0.15).toFixed(2))), disabled: zoom >= 1.6 }), /* @__PURE__ */ React.createElement(IconButton, { icon: Maximize2, label: "\u91CD\u7F6E\u56FE\u8C31\u4F4D\u7F6E", onClick: () => {
      setZoom(1);
      setPan({ x: 0, y: 0 });
    } })))), /* @__PURE__ */ React.createElement("div", { className: "graph-notes" }, /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement(Network, { size: 18 }), /* @__PURE__ */ React.createElement("p", null, "\u5F53\u524D\u663E\u793A ", /* @__PURE__ */ React.createElement("strong", null, nodes.length + satellites.length + 1), " \u4E2A\u8282\u70B9\uFF08\u542B\u4E00\u9636\u4E0E\u4E8C\u9636\u8BED\u4E49\u90BB\u57DF\uFF09\u3002", word.synonyms.length + word.antonyms.length > nodes.length ? `\u753B\u5E03\u6BCF\u7C7B\u5C55\u793A\u524D ${nodeLimit} \u4E2A\uFF1B\u5168\u90E8\u5173\u8054\u53EF\u5728\u4E0B\u65B9\u7EE7\u7EED\u5C55\u5F00\u3002` : "\u7B5B\u9009\u51B3\u5B9A\u8D77\u70B9\uFF0C\u8BCD\u4E49\u5173\u8054\u53EF\u8DE8\u8BCD\u5E93\u63A2\u7D22\u3002")), /* @__PURE__ */ React.createElement("button", { className: "text-btn", onClick: () => onOpen(word.id) }, "\u67E5\u770B\u300C", word.word, "\u300D\u8FA8\u6790", /* @__PURE__ */ React.createElement(ArrowUpRight, { size: 15 }))), /* @__PURE__ */ React.createElement("div", { className: "graph-relation-list" }, ["synonyms", "antonyms", "partners"].flatMap((kind) => (word[kind] || []).filter((n) => wordMap.has(n.id)).map((n) => /* @__PURE__ */ React.createElement("button", { key: `${kind}-${n.id}`, className: kind, onClick: () => setFocus(n.id) }, /* @__PURE__ */ React.createElement("span", null, /* @__PURE__ */ React.createElement("strong", null, wordMap.get(n.id).word, n.rel ? ` \xB7 ${n.rel}` : ""), /* @__PURE__ */ React.createElement(ArrowRight, { size: 14 })), /* @__PURE__ */ React.createElement("p", null, n.note))))));
  }
  function Flashcards({ words, wordMap, progress, onStatus, onOpen, speak, onExit, onClear, modalOpen, notify }) {
    const [deck, setDeck] = useState(() => words.map((w) => w.id)), [index, setIndex] = useState(0), [flipped, setFlipped] = useState(false), [finished, setFinished] = useState(false), [rated, setRated] = useState({}), [jumpText, setJumpText] = useState("");
    const word = wordMap.get(deck[index]);
    const step = useCallback((delta) => {
      setIndex((i) => Math.min(Math.max(0, i + delta), deck.length - 1));
      setFlipped(false);
      setFinished(false);
    }, [deck.length]);
    const rate = useCallback((status) => {
      if (!word) return;
      onStatus(word.id, status);
      setRated((r) => ({ ...r, [word.id]: status }));
      setFlipped(false);
      if (index === deck.length - 1) setFinished(true);
      else setIndex((i) => i + 1);
    }, [word, index, deck.length, onStatus]);
    useEffect(() => {
      if (modalOpen) return;
      const key = (e) => {
        if (e.ctrlKey || e.metaKey || e.altKey || /INPUT|TEXTAREA|SELECT/.test(e.target.tagName) || e.target.isContentEditable) return;
        if (e.key === "ArrowRight") {
          e.preventDefault();
          step(1);
        }
        if (e.key === "ArrowLeft") {
          e.preventDefault();
          step(-1);
        }
        if (e.code === "Space" && !finished && !e.target.closest('button,a[href],[role="tab"],[role="button"]')) {
          e.preventDefault();
          setFlipped((f) => !f);
        }
        if (["1", "2", "3"].includes(e.key) && !finished) {
          e.preventDefault();
          rate(["new", "review", "mastered"][Number(e.key) - 1]);
        }
      };
      document.addEventListener("keydown", key);
      return () => document.removeEventListener("keydown", key);
    }, [modalOpen, step, rate, finished]);
    const shuffle = () => {
      const next = [...deck];
      for (let i = next.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [next[i], next[j]] = [next[j], next[i]];
      }
      setDeck(next);
      setIndex(0);
      setFlipped(false);
      setFinished(false);
      setRated({});
      notify && notify("\u95EA\u5361\u5DF2\u968F\u673A\u6253\u4E71\u987A\u5E8F\uFF01");
    };
    const handleFlashJump = (e) => {
      e.preventDefault();
      const raw = jumpText.trim();
      if (!raw) return;
      const numMatch = raw.match(/^#?(\d+)$/);
      if (numMatch) {
        const targetIdx = Math.min(Math.max(1, parseInt(numMatch[1], 10)), deck.length) - 1;
        setIndex(targetIdx);
        setFlipped(false);
        setFinished(false);
        setJumpText("");
        const w = wordMap.get(deck[targetIdx]);
        notify && notify(`\u5DF2\u8DF3\u8F6C\u5230\u7B2C ${targetIdx + 1} / ${deck.length} \u5F20\u95EA\u5361\u300C${w?.word || ""}\u300D`);
        return;
      }
      const q = raw.toLowerCase();
      const foundIdx = deck.findIndex((id) => {
        const w = wordMap.get(id);
        return w && (w.word.toLowerCase() === q || id === q);
      }) !== -1 ? deck.findIndex((id) => {
        const w = wordMap.get(id);
        return w && (w.word.toLowerCase() === q || id === q);
      }) : deck.findIndex((id) => {
        const w = wordMap.get(id);
        return w && (w.word.toLowerCase().startsWith(q) || w.definition.zh.includes(raw));
      });
      if (foundIdx !== -1) {
        setIndex(foundIdx);
        setFlipped(false);
        setFinished(false);
        setJumpText("");
        const w = wordMap.get(deck[foundIdx]);
        notify && notify(`\u5DF2\u5B9A\u4F4D\u5230\u7B2C ${foundIdx + 1} \u5F20\u95EA\u5361\u300C${w.word}\u300D`);
      } else {
        notify && notify(`\u5F53\u524D\u95EA\u5361\u961F\u5217\u672A\u627E\u5230\u300C${raw}\u300D`, "error");
      }
    };
    if (!word) return /* @__PURE__ */ React.createElement(EmptyState, { onClear });
    if (finished) return /* @__PURE__ */ React.createElement("div", { className: "session-complete" }, /* @__PURE__ */ React.createElement("div", { className: "complete-icon" }, /* @__PURE__ */ React.createElement(CheckCheck, { size: 36 })), /* @__PURE__ */ React.createElement("span", { className: "eyebrow" }, "A LITTLE MORE CONNECTED"), /* @__PURE__ */ React.createElement("h2", { className: "serif" }, "This is how words stay."), /* @__PURE__ */ React.createElement("p", null, "\u5DF2\u8D70\u5B8C ", deck.length, " \u5F20\u95EA\u5361\uFF1B\u672C\u8F6E\u81EA\u8BC4\u4E86 ", Object.keys(rated).length, " \u4E2A\u8BCD\u3002"), /* @__PURE__ */ React.createElement("div", { className: "session-results" }, Object.entries(STATUS).map(([id, s]) => /* @__PURE__ */ React.createElement("div", { key: id }, /* @__PURE__ */ React.createElement("strong", null, Object.values(rated).filter((v) => v === id).length), /* @__PURE__ */ React.createElement("span", null, s.label)))), /* @__PURE__ */ React.createElement("div", { className: "flex flex-wrap justify-center gap-3" }, /* @__PURE__ */ React.createElement("button", { className: "btn secondary", onClick: onExit }, /* @__PURE__ */ React.createElement(Layers3, { size: 16 }), "\u8FD4\u56DE\u8BCD\u5E93"), /* @__PURE__ */ React.createElement("button", { className: "btn primary", onClick: shuffle }, /* @__PURE__ */ React.createElement(Shuffle, { size: 16 }), "\u6253\u4E71\u518D\u5B66\u4E00\u8F6E")));
    return /* @__PURE__ */ React.createElement("section", { className: "flash-section" }, /* @__PURE__ */ React.createElement("div", { className: "flash-toolbar" }, /* @__PURE__ */ React.createElement("div", { className: "flex items-center gap-2.5" }, /* @__PURE__ */ React.createElement(Badge, { color: "green" }, "FOCUS SESSION"), /* @__PURE__ */ React.createElement("span", null, /* @__PURE__ */ React.createElement("b", null, String(index + 1).padStart(2, "0")), " / ", String(deck.length).padStart(2, "0")), /* @__PURE__ */ React.createElement(StatusBadge, { status: statusOf(progress, word.id) })), /* @__PURE__ */ React.createElement("div", { className: "flash-tool-actions" }, /* @__PURE__ */ React.createElement("form", { className: "jump-form", onSubmit: handleFlashJump }, /* @__PURE__ */ React.createElement("input", { className: "jump-input", value: jumpText, onChange: (e) => setJumpText(e.target.value), placeholder: `\u8F93\u5165\u5E8F\u53F7(1-${deck.length})\u6216\u5355\u8BCD\u2026`, "aria-label": "\u8DF3\u8F6C\u5230\u6307\u5B9A\u95EA\u5361\u5E8F\u53F7\u6216\u5355\u8BCD" }), /* @__PURE__ */ React.createElement("button", { type: "submit", className: "jump-submit-btn" }, "\u8DF3\u8F6C")), /* @__PURE__ */ React.createElement("button", { type: "button", className: "btn-shuffle-inline", onClick: shuffle, title: "\u968F\u673A\u6253\u4E71\u95EA\u5361\u987A\u5E8F" }, /* @__PURE__ */ React.createElement(Shuffle, { size: 15 }), "\u4E71\u5E8F\u6D17\u724C"), /* @__PURE__ */ React.createElement(IconButton, { icon: Volume2, label: `\u6717\u8BFB ${word.word}`, onClick: () => speak(word.word, "en-GB") }), /* @__PURE__ */ React.createElement(IconButton, { icon: Eye, label: "\u6253\u5F00\u5F53\u524D\u8BCD\u5B8C\u6574\u5361\u7247", onClick: () => onOpen(word.id) }))), /* @__PURE__ */ React.createElement("div", { className: "flash-progress" }, /* @__PURE__ */ React.createElement("div", { style: { width: `${index / deck.length * 100}%` } })), /* @__PURE__ */ React.createElement("div", { className: "flash-scene" }, /* @__PURE__ */ React.createElement("div", { className: `flash-flipper ${flipped ? "is-flipped" : ""}`, role: "button", tabIndex: 0, "aria-label": flipped ? "\u5F53\u524D\u4E3A\u91CA\u4E49\u9762\uFF0C\u70B9\u51FB\u8FD4\u56DE\u5355\u8BCD\u9762" : `${word.word}\uFF0C\u70B9\u51FB\u7FFB\u8F6C\u67E5\u770B\u91CA\u4E49`, onClick: () => setFlipped((f) => !f), onKeyDown: (e) => {
      if (e.key === "Enter" || e.code === "Space") {
        e.preventDefault();
        e.stopPropagation();
        setFlipped((f) => !f);
      }
    } }, /* @__PURE__ */ React.createElement("div", { className: "flash-face flash-front", "aria-hidden": flipped }, /* @__PURE__ */ React.createElement("span", { className: "flash-top-label" }, "RECALL BEFORE YOU REVEAL"), /* @__PURE__ */ React.createElement(LibraryBadges, { word }), /* @__PURE__ */ React.createElement("h2", { className: "serif" }, word.word), /* @__PURE__ */ React.createElement("p", { className: "flash-ipa" }, word.pos, " \xA0 ", word.ipa.uk), /* @__PURE__ */ React.createElement("div", { className: "flash-topic" }, word.topics.join(" / ")), /* @__PURE__ */ React.createElement("span", { className: "flip-hint" }, /* @__PURE__ */ React.createElement(RotateCcw, { size: 14 }), "\u70B9\u51FB\u5361\u7247\u6216\u6309 Space \u7FFB\u8F6C \xB7 \u4E5F\u53EF\u76F4\u63A5\u6309 1 / 2 / 3 \u6807\u8BB0\u638C\u63E1\u72B6\u6001"), /* @__PURE__ */ React.createElement("div", { className: "flash-decoration" })), /* @__PURE__ */ React.createElement("div", { className: "flash-face flash-back", "aria-hidden": !flipped }, /* @__PURE__ */ React.createElement("span", { className: "flash-top-label" }, "MAKE IT PART OF YOUR LANGUAGE"), /* @__PURE__ */ React.createElement("h3", { className: "serif" }, word.word), /* @__PURE__ */ React.createElement("h4", null, word.definition.zh), /* @__PURE__ */ React.createElement("p", { className: "flash-definition" }, word.definition.en), /* @__PURE__ */ React.createElement("div", { className: "flash-collocations" }, word.collocations.slice(0, 3).map((c) => /* @__PURE__ */ React.createElement("span", { key: c.en }, c.en, /* @__PURE__ */ React.createElement("small", null, c.zh)))), /* @__PURE__ */ React.createElement("div", { className: "flash-relations" }, word.synonyms.slice(0, 2).map((rel) => /* @__PURE__ */ React.createElement("button", { key: `s-${rel.id}`, type: "button", className: "flash-rel-pill", title: rel.note, onClick: (e) => { e.stopPropagation(); onOpen(rel.id); } }, "\u2248 ", wordMap.get(rel.id)?.word || rel.id)), word.antonyms.slice(0, 2).map((rel) => /* @__PURE__ */ React.createElement("button", { key: `a-${rel.id}`, type: "button", className: "flash-rel-pill antonym", title: rel.note, onClick: (e) => { e.stopPropagation(); onOpen(rel.id); } }, "\u2260 ", wordMap.get(rel.id)?.word || rel.id)), (word.partners || []).slice(0, 2).map((rel) => /* @__PURE__ */ React.createElement("button", { key: `p-${rel.id}`, type: "button", className: "flash-rel-pill partner", title: rel.note, onClick: (e) => { e.stopPropagation(); onOpen(rel.id); } }, "\u2295 ", wordMap.get(rel.id)?.word || rel.id, rel.rel ? ` (${rel.rel})` : ""))), /* @__PURE__ */ React.createElement("p", { className: "flash-example" }, /* @__PURE__ */ React.createElement(Highlight, { text: word.examples[0].en, phrases: [word.word, ...word.examples[0].highlights] })), /* @__PURE__ */ React.createElement("span", { className: "flip-hint" }, "\u56DE\u60F3\u4E00\u4E2A\u81EA\u5DF1\u7684\u4F8B\u53E5\uFF0C\u518D\u8BC4\u4EF7\u638C\u63E1\u7A0B\u5EA6")))), /* @__PURE__ */ React.createElement("div", { className: "flash-navigation" }, /* @__PURE__ */ React.createElement(IconButton, { icon: ChevronLeft, label: "\u4E0A\u4E00\u5F20\u95EA\u5361", onClick: () => step(-1), disabled: index === 0 }), /* @__PURE__ */ React.createElement("div", { className: "flash-ratings" }, Object.entries(STATUS).map(([id, s], i) => {
      const Icon = s.icon;
      return /* @__PURE__ */ React.createElement("button", { key: id, className: `btn rate-${id}`, onClick: () => rate(id) }, /* @__PURE__ */ React.createElement("kbd", null, i + 1), /* @__PURE__ */ React.createElement(Icon, { size: 15 }), id === "new" ? "\u8FD8\u4E0D\u719F\u6089" : s.label);
    })), /* @__PURE__ */ React.createElement(IconButton, { icon: ChevronRight, label: "\u4E0B\u4E00\u5F20\u95EA\u5361", onClick: () => step(1), disabled: index === deck.length - 1 })), /* @__PURE__ */ React.createElement("p", { className: "flash-help" }, /* @__PURE__ */ React.createElement(Keyboard, { size: 14 }), /* @__PURE__ */ React.createElement("span", null, "Space \u7FFB\u8F6C \xB7 \u2190 \u2192 \u5207\u6362 \xB7 1 / 2 / 3 \u76F4\u63A5\u6807\u8BB0\u638C\u63E1\u72B6\u6001\u5E76\u8FDB\u5165\u4E0B\u4E00\u5F20")), /* @__PURE__ */ React.createElement("p", { className: "session-note" }, "\u672C\u8F6E\u4F7F\u7528\u8FDB\u5165\u65F6\u7684\u8BCD\u6C47\u5217\u8868\uFF1B\u66F4\u65B0\u638C\u63E1\u7A0B\u5EA6\u4E0D\u4F1A\u8BA9\u5361\u7247\u7A81\u7136\u6D88\u5931\u3002"));
  }
  function Studio({ words, progress, theme, onImport, onClose, notify }) {
    const [tab, setTab] = useState("import"), [input, setInput] = useState(""), [filename, setFilename] = useState(""), [result, setResult] = useState(null), [busy, setBusy] = useState(false), [restore, setRestore] = useState(false), [dragging, setDragging] = useState(false), [promptLib, setPromptLib] = useState("all"), [promptTopic, setPromptTopic] = useState("\u5B66\u672F\u8BBA\u8BC1\u3001\u793E\u4F1A\u53D1\u5C55\u4E0E\u73AF\u5883\u4FDD\u62A4"), [count, setCount] = useState(20);
    const fileRef = useRef(), promptRef = useRef();
    const prompt = useMemo(() => IO.makePrompt(words, promptLib, promptTopic, count), [words, promptLib, promptTopic, count]);
    const readFile = async (file) => {
      if (!file || busy) return;
      setResult(null);
      if (file.size > IO.MAX_BYTES) {
        notify("\u6587\u4EF6\u8D85\u8FC7 25 MB\uFF0C\u8BF7\u5206\u6279\u5BFC\u5165\u3002", "error");
        return;
      }
      setBusy(true);
      try {
        setInput(await file.text());
        setFilename(file.name);
      } catch (e) {
        notify("\u8BFB\u53D6\u6587\u4EF6\u5931\u8D25\uFF0C\u8BF7\u91CD\u65B0\u9009\u62E9\u3002", "error");
      } finally {
        setBusy(false);
      }
    };
    const check = () => {
      try {
        const parsed = IO.parseInput(input, filename);
        setResult(IO.validateImport(parsed, words));
      } catch (e) {
        setResult({ errors: [e.message], warnings: [], words: [], added: 0, updated: 0 });
      }
    };
    const commit = async () => {
      if (!result || result.errors.length) return;
      setBusy(true);
      try {
        await onImport(result, restore);
        onClose();
        notify(`\u5DF2\u4FDD\u5B58\uFF1A\u65B0\u589E ${result.added} \u8BCD\uFF0C\u66F4\u65B0 ${result.updated} \u8BCD\u3002`);
      } catch (e) {
        notify(e.message, "error");
      } finally {
        setBusy(false);
      }
    };
    const backup = () => downloadFile(`lexicon-backup-${dateLabel()}.json`, JSON.stringify({ version: 1, exportedAt: (/* @__PURE__ */ new Date()).toISOString(), words, progress, theme }, null, 2));
    const copyPrompt = async () => {
      try {
        if (!navigator.clipboard?.writeText) throw new Error();
        await navigator.clipboard.writeText(prompt);
        notify("\u751F\u6210\u63D0\u793A\u8BCD\u5DF2\u590D\u5236\u3002");
      } catch (e) {
        promptRef.current?.focus();
        promptRef.current?.select();
        notify("\u5DF2\u9009\u4E2D\u63D0\u793A\u8BCD\uFF0C\u8BF7\u6309 Ctrl+C / \u2318C \u590D\u5236\u3002");
      }
    };
    return /* @__PURE__ */ React.createElement(Modal, { title: "\u8BCD\u5E93\u5DE5\u4F5C\u5BA4", subtitle: "\u8BA9\u4F60\u7684\u8BCD\u6C47\u7F51\u7EDC\u6301\u7EED\u751F\u957F\u3002", onClose, wide: true }, /* @__PURE__ */ React.createElement("div", { className: "studio-tabs", role: "tablist", "aria-label": "\u8BCD\u5E93\u5DE5\u5177" }, [["import", "\u5BFC\u5165\u8BCD\u5E93", Upload], ["export", "\u5BFC\u51FA\u4E0E\u5907\u4EFD", Download], ["ai", "AI \u751F\u6210\u63D0\u793A\u8BCD", Sparkles]].map(([id, label, Icon]) => /* @__PURE__ */ React.createElement("button", { key: id, id: `studio-tab-${id}`, role: "tab", "aria-controls": `studio-panel-${id}`, "aria-selected": tab === id, className: tab === id ? "active" : "", onClick: () => setTab(id) }, /* @__PURE__ */ React.createElement(Icon, { size: 16 }), label))), /* @__PURE__ */ React.createElement("div", { className: "studio-body", role: "tabpanel", id: `studio-panel-${tab}`, "aria-labelledby": `studio-tab-${tab}` }, tab === "import" && /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement("div", { className: `dropzone ${dragging ? "dragging" : ""}`, onDragOver: (e) => {
      e.preventDefault();
      setDragging(true);
    }, onDragLeave: () => setDragging(false), onDrop: (e) => {
      e.preventDefault();
      setDragging(false);
      readFile(e.dataTransfer.files[0]);
    } }, /* @__PURE__ */ React.createElement("div", { className: "upload-symbol" }, /* @__PURE__ */ React.createElement(Upload, { size: 24 })), /* @__PURE__ */ React.createElement("h3", null, filename || "\u628A JSON / CSV \u8BCD\u5E93\u62D6\u5230\u8FD9\u91CC"), /* @__PURE__ */ React.createElement("p", null, "\u652F\u6301\u5B8C\u6574\u8BCD\u6761\u4E0E\u5173\u8054\u5173\u7CFB\uFF1B\u6BCF\u6279\u6700\u591A 10,000 \u8BCD / 25 MB\u3002"), /* @__PURE__ */ React.createElement("button", { className: "btn secondary", onClick: () => fileRef.current.click() }, /* @__PURE__ */ React.createElement(Plus, { size: 15 }), "\u9009\u62E9\u672C\u5730\u6587\u4EF6"), /* @__PURE__ */ React.createElement("input", { className: "sr-only", tabIndex: -1, ref: fileRef, type: "file", accept: ".json,.csv,application/json,text/csv", onChange: (e) => {
      readFile(e.target.files[0]);
      e.target.value = "";
    } })), /* @__PURE__ */ React.createElement("div", { className: "field-label" }, /* @__PURE__ */ React.createElement("label", { htmlFor: "import-text" }, "\u6216\u8005\uFF0C\u7C98\u8D34\u8BCD\u5E93\u5185\u5BB9"), /* @__PURE__ */ React.createElement("button", { className: "text-btn", onClick: () => {
      setInput(JSON.stringify({ version: 1, words: SEED.slice(0, 30) }, null, 2));
      setFilename(`\u5185\u7F6E\u7CBE\u9009 30 \u8BCD \xB7 JSON \u793A\u4F8B`);
      setResult(null);
    } }, "\u586B\u5165\u5B8C\u6574\u793A\u4F8B", /* @__PURE__ */ React.createElement(ArrowUpRight, { size: 13 }))), /* @__PURE__ */ React.createElement("textarea", { id: "import-text", className: "code-input", disabled: busy, value: input, onChange: (e) => {
      setInput(e.target.value);
      setFilename("");
      setResult(null);
    }, placeholder: '{"version": 1, "words": [ ...\u5B8C\u6574\u8BCD\u6761... ]}', spellCheck: false }), /* @__PURE__ */ React.createElement("div", { className: "import-guidance" }, /* @__PURE__ */ React.createElement(Info, { size: 16 }), /* @__PURE__ */ React.createElement("p", null, "\u540C\u4E00 id \u5C06\u66F4\u65B0\u539F\u8BCD\u6761\uFF1B\u5176\u4ED6\u8BCD\u6761\u4E0E\u5B66\u4E60\u8BB0\u5F55\u4FDD\u7559\u3002\u4F1A\u68C0\u67E5\u5FC5\u586B\u5B57\u6BB5\u3001\u91CD\u590D\u8BCD\u53CA\u6240\u6709\u5173\u7CFB\u94FE\u63A5\u3002CSV \u7684\u6570\u7EC4\u4E0E\u5BF9\u8C61\u5B57\u6BB5\u4F7F\u7528 JSON\uFF1B\u5EFA\u8BAE\u5148\u4E0B\u8F7D CSV \u6A21\u677F\u3002")), result && /* @__PURE__ */ React.createElement("div", { className: `validation ${result.errors.length ? "invalid" : "valid"}`, role: "status" }, /* @__PURE__ */ React.createElement("h4", null, result.errors.length ? /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement(AlertCircle, { size: 17 }), "\u9700\u8981\u4FEE\u6B63 ", result.errors.length, " \u9879") : /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement(CheckCircle2, { size: 17 }), "\u6821\u9A8C\u901A\u8FC7 \xB7 \u65B0\u589E ", result.added, "\uFF0C\u66F4\u65B0 ", result.updated)), result.errors.length > 0 ? /* @__PURE__ */ React.createElement("ul", null, result.errors.map((error, i) => /* @__PURE__ */ React.createElement("li", { key: i }, error))) : /* @__PURE__ */ React.createElement("p", null, "\u5168\u90E8\u5173\u8054\u76EE\u6807\u5747\u53EF\u89E3\u6790\uFF0C\u786E\u8BA4\u540E\u5C06\u81EA\u52A8\u4FDD\u5B58\u3002"), result.warnings.length > 0 && /* @__PURE__ */ React.createElement("ul", null, result.warnings.map((warning, i) => /* @__PURE__ */ React.createElement("li", { key: i }, warning))), result.progress && /* @__PURE__ */ React.createElement("label", { className: "checkbox-row" }, /* @__PURE__ */ React.createElement("input", { type: "checkbox", checked: restore, onChange: (e) => setRestore(e.target.checked) }), "\u540C\u65F6\u6062\u590D\u5907\u4EFD\u4E2D\u7684\u638C\u63E1\u72B6\u6001\u4E0E\u4E3B\u9898\u8BBE\u7F6E")), /* @__PURE__ */ React.createElement("div", { className: "studio-actions" }, /* @__PURE__ */ React.createElement("button", { className: "btn secondary", onClick: () => downloadFile("lexicon-template.csv", IO.toCSV(SEED.slice(0, 50)), "text/csv;charset=utf-8") }, /* @__PURE__ */ React.createElement(FileSpreadsheet, { size: 16 }), "CSV \u6A21\u677F"), /* @__PURE__ */ React.createElement("div", { className: "flex gap-2" }, /* @__PURE__ */ React.createElement("button", { className: "btn secondary", disabled: !input.trim() || busy, onClick: check }, "\u6821\u9A8C\u8BCD\u5E93"), /* @__PURE__ */ React.createElement("button", { className: "btn primary", disabled: !result || result.errors.length > 0 || busy, onClick: commit }, /* @__PURE__ */ React.createElement(Check, { size: 16 }), busy ? "\u4FDD\u5B58\u4E2D\u2026" : "\u786E\u8BA4\u5BFC\u5165")))), tab === "export" && /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement("div", { className: "export-heading" }, /* @__PURE__ */ React.createElement(Database, { size: 25 }), /* @__PURE__ */ React.createElement("h3", null, "\u4F60\u7684\u79EF\u7D2F\uFF0C\u968F\u65F6\u5E26\u8D70\u3002"), /* @__PURE__ */ React.createElement("p", null, "\u5F53\u524D\u5171 ", words.length.toLocaleString(), " \u4E2A\u8BCD\u6761\uFF0C", Object.values(progress).filter((p) => p.status !== "new").length, " \u4E2A\u5DF2\u6709\u5B66\u4E60\u72B6\u6001\u3002")), /* @__PURE__ */ React.createElement("button", { className: "export-option", onClick: backup }, /* @__PURE__ */ React.createElement("span", { className: "export-icon green" }, /* @__PURE__ */ React.createElement(FileJson, { size: 25 })), /* @__PURE__ */ React.createElement("span", null, /* @__PURE__ */ React.createElement("strong", null, "\u5B8C\u6574 JSON \u5907\u4EFD"), /* @__PURE__ */ React.createElement("p", null, "\u8BCD\u5E93\u3001\u5173\u7CFB\u3001\u5B66\u4E60\u8FDB\u5EA6\u4E0E\u4E3B\u9898\uFF1B\u53EF\u91CD\u65B0\u5BFC\u5165\u6062\u590D\u3002")), /* @__PURE__ */ React.createElement(Download, { size: 19 })), /* @__PURE__ */ React.createElement("button", { className: "export-option", onClick: () => downloadFile(`lexicon-words-${dateLabel()}.csv`, IO.toCSV(words), "text/csv;charset=utf-8") }, /* @__PURE__ */ React.createElement("span", { className: "export-icon gold" }, /* @__PURE__ */ React.createElement(FileSpreadsheet, { size: 25 })), /* @__PURE__ */ React.createElement("span", null, /* @__PURE__ */ React.createElement("strong", null, "\u8BCD\u5E93 CSV"), /* @__PURE__ */ React.createElement("p", null, "\u4FDD\u7559\u6240\u6709\u8BCD\u6761\u5B57\u6BB5\uFF0C\u4FBF\u4E8E\u8868\u683C\u6574\u7406\uFF1B\u4E0D\u5305\u542B\u4E2A\u4EBA\u5B66\u4E60\u8FDB\u5EA6\u3002")), /* @__PURE__ */ React.createElement(Download, { size: 19 })), /* @__PURE__ */ React.createElement("button", { className: "export-option", onClick: () => downloadFile(`lexicon-seed-${SEED.length}.json`, JSON.stringify({ version: 1, words: SEED }, null, 2)) }, /* @__PURE__ */ React.createElement("span", { className: "export-icon purple" }, /* @__PURE__ */ React.createElement(Layers3, { size: 25 })), /* @__PURE__ */ React.createElement("span", null, /* @__PURE__ */ React.createElement("strong", null, SEED.length, " \u8BCD\u5B8C\u6574\u6570\u636E\u793A\u4F8B"), /* @__PURE__ */ React.createElement("p", null, "\u53EF\u76F4\u63A5\u53C2\u8003\u7684\u7ED3\u6784\uFF0C\u6240\u6709\u540C\u53CD\u4E49\u8BCD\u5747\u5728\u793A\u4F8B\u5185\u95ED\u5408\u3002")), /* @__PURE__ */ React.createElement(Download, { size: 19 })), /* @__PURE__ */ React.createElement("div", { className: "import-guidance" }, /* @__PURE__ */ React.createElement(Info, { size: 16 }), /* @__PURE__ */ React.createElement("p", null, "\u672C\u5730\u6570\u636E\u7ECF\u8FC7\u538B\u7F29\u4FDD\u5B58\u3002\u6D4F\u89C8\u5668\u5BB9\u91CF\u4ECD\u6709\u4E0A\u9650\uFF1B\u5BFC\u5165\u8D85\u989D\u4F1A\u4FDD\u7559\u539F\u8BCD\u5E93\u5E76\u660E\u786E\u63D0\u793A\u3002\u66F4\u6362\u8BBE\u5907\u3001\u6D4F\u89C8\u5668\u6216\u6587\u4EF6\u4F4D\u7F6E\u524D\uFF0C\u8BF7\u5BFC\u51FA JSON \u5907\u4EFD\u3002"))), tab === "ai" && /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement("div", { className: "ai-intro" }, /* @__PURE__ */ React.createElement("span", { className: "export-icon green" }, /* @__PURE__ */ React.createElement(Sparkles, { size: 24 })), /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("h3", null, "\u4E00\u4EFD\u63D0\u793A\u8BCD\uFF0C\u957F\u51FA\u65B0\u7684\u8BCD\u7FA4\u3002"), /* @__PURE__ */ React.createElement("p", null, "\u590D\u5236\u7ED9\u4F60\u4F7F\u7528\u7684 AI\uFF0C\u83B7\u53D6 JSON\uFF0C\u518D\u56DE\u5230\u8FD9\u91CC\u6821\u9A8C\u5BFC\u5165\u3002"))), /* @__PURE__ */ React.createElement("div", { className: "prompt-fields" }, /* @__PURE__ */ React.createElement("label", null, "\u76EE\u6807\u8BCD\u5E93", /* @__PURE__ */ React.createElement("select", { value: promptLib, onChange: (e) => setPromptLib(e.target.value) }, LIBS.map((l) => /* @__PURE__ */ React.createElement("option", { key: l.id, value: l.id }, l.name)))), /* @__PURE__ */ React.createElement("label", null, "\u751F\u6210\u6570\u91CF", /* @__PURE__ */ React.createElement("select", { value: count, onChange: (e) => setCount(Number(e.target.value)) }, [10, 20, 30, 40, 50].map((n) => /* @__PURE__ */ React.createElement("option", { key: n, value: n }, n, " \u8BCD"))))), /* @__PURE__ */ React.createElement("label", { className: "field-label", htmlFor: "prompt-topic" }, "\u573A\u666F / \u5199\u4F5C\u529F\u80FD"), /* @__PURE__ */ React.createElement("input", { id: "prompt-topic", className: "text-input", maxLength: 200, value: promptTopic, onChange: (e) => setPromptTopic(e.target.value), placeholder: "\u4F8B\u5982\uFF1A\u81EA\u7136\u5730\u7406\u3001\u8BA9\u6B65\u8F6C\u6298\u3001\u66FF\u6362 important" }), /* @__PURE__ */ React.createElement("label", { className: "field-label", htmlFor: "generated-prompt" }, "\u751F\u6210\u63D0\u793A\u8BCD \xB7 \u542B\u5F53\u524D\u8BCD\u5E93\u7684\u5173\u8054\u951A\u70B9"), /* @__PURE__ */ React.createElement("textarea", { id: "generated-prompt", readOnly: true, ref: promptRef, className: "code-input prompt-text", value: prompt, spellCheck: false }), /* @__PURE__ */ React.createElement("div", { className: "studio-actions" }, /* @__PURE__ */ React.createElement("span", { className: "muted text-xs" }, "\u4E0D\u9700\u8981 API Key\uFF1B\u672C\u9875\u4E0D\u5411 AI \u670D\u52A1\u53D1\u9001\u6570\u636E\u3002"), /* @__PURE__ */ React.createElement("div", { className: "flex gap-2" }, /* @__PURE__ */ React.createElement("button", { className: "btn secondary", onClick: () => downloadFile("lexicon-ai-prompt.txt", prompt, "text/plain;charset=utf-8") }, /* @__PURE__ */ React.createElement(Download, { size: 15 }), "\u5BFC\u51FA TXT"), /* @__PURE__ */ React.createElement("button", { className: "btn primary", onClick: copyPrompt }, /* @__PURE__ */ React.createElement(Copy, { size: 15 }), "\u590D\u5236\u63D0\u793A\u8BCD"))))));
  }
  function Guide({ onClose, onRecover }) {
    return /* @__PURE__ */ React.createElement(Modal, { title: "\u628A\u8BCD\u6C47\u5B66\u6210\u53EF\u4EE5\u8C03\u7528\u7684\u8868\u8FBE", subtitle: "A SMALL GUIDE TO DEEPER LEARNING", onClose, wide: true }, /* @__PURE__ */ React.createElement("div", { className: "guide-body" }, /* @__PURE__ */ React.createElement("div", { className: "guide-grid" }, [["01", "\u5148\u7406\u89E3\uFF0C\u518D\u66FF\u6362", "\u5148\u770B\u4E2D\u82F1\u91CA\u4E49\u4E0E\u8BED\u57DF\uFF0C\u518D\u770B\u642D\u914D\u3002\u8FD1\u4E49\u8BCD\u76F8\u8FD1\u7684\u53EA\u662F\u67D0\u4E9B\u4E49\u9879\uFF0C\u4E0D\u610F\u5473\u7740\u6240\u6709\u53E5\u5B50\u90FD\u53EF\u4EE5\u4E92\u6362\u3002"], ["02", "\u6CBF\u7740\u5173\u7CFB\uFF0C\u5EFA\u7ACB\u5BF9\u7167", "\u7EFF\u8272\u5B9E\u7EBF\u8868\u793A\u8FD1\u4E49\u5173\u8054\uFF0C\u73CA\u745A\u8272\u865A\u7EBF\u8868\u793A\u53CD\u4E49\u6216\u660E\u786E\u8BF4\u660E\u7684\u8BED\u5883\u5BF9\u7167\u3002\u70B9\u51FB\u8BCD\u5361\u4E2D\u7684\u5173\u8054\u8BCD\u53EF\u8FDE\u7EED\u8DF3\u8F6C\u3002"], ["03", "\u4E3B\u52A8\u56DE\u5FC6\uFF0C\u7136\u540E\u81EA\u8BC4", "\u95EA\u5361\u6B63\u9762\u5148\u56DE\u60F3\u542B\u4E49\u4E0E\u642D\u914D\uFF0C\u7FFB\u9762\u6838\u5BF9\uFF0C\u518D\u6309 1 / 2 / 3 \u8BB0\u5F55\u72B6\u6001\u3002\u5DF2\u638C\u63E1\u662F\u4F60\u7684\u81EA\u8BC4\uFF0C\u4E0D\u662F\u6D4B\u8BD5\u5206\u6570\u3002"], ["04", "\u9010\u7EC4\u6269\u5C55\uFF0C\u4FDD\u7559\u5907\u4EFD", "\u5BFC\u51FA\u63D0\u793A\u8BCD\uFF0C\u6309\u4E3B\u9898\u751F\u6210\u65B0\u8BCD\u7FA4\u3002\u5BFC\u5165\u524D\u4F1A\u68C0\u67E5\u7ED3\u6784\u4E0E\u95ED\u5408\u94FE\u63A5\uFF1B\u8BED\u4E49\u8D28\u91CF\u4ECD\u9700\u4F60\u590D\u6838\u3002"]].map(([n, title, text]) => /* @__PURE__ */ React.createElement("article", { key: n }, /* @__PURE__ */ React.createElement("span", null, n), /* @__PURE__ */ React.createElement("h3", null, title), /* @__PURE__ */ React.createElement("p", null, text)))), /* @__PURE__ */ React.createElement(SectionTitle, { icon: Keyboard }, "\u952E\u76D8\u6377\u5F84"), /* @__PURE__ */ React.createElement("div", { className: "shortcut-list" }, [["/ \u6216 Ctrl / \u2318 + K", "\u805A\u7126\u641C\u7D22"], ["Space / Enter", "\u7FFB\u8F6C\u95EA\u5361"], ["\u2190 / \u2192", "\u4E0A\u4E00\u5F20 / \u4E0B\u4E00\u5F20"], ["1 / 2 / 3", "\u672A\u719F\u6089 / \u590D\u4E60\u4E2D / \u5DF2\u638C\u63E1"], ["Esc", "\u5173\u95ED\u8BE6\u60C5\u6216\u5DE5\u5177\u5F39\u7A97"]].map(([key, value]) => /* @__PURE__ */ React.createElement("div", { key }, /* @__PURE__ */ React.createElement("kbd", null, key), /* @__PURE__ */ React.createElement("span", null, value)))), /* @__PURE__ */ React.createElement(SectionTitle, { icon: BookOpen }, "\u5185\u5BB9\u8BF4\u660E\u4E0E\u53C2\u8003"), /* @__PURE__ */ React.createElement("p", null, "\u201CIELTS Core 7000\u201D\u662F\u53EF\u6269\u5C55\u8BCD\u5E93\u7684\u5B66\u4E60\u76EE\u6807\u540D\u79F0\u3002\u521D\u59CB\u6570\u636E\u5171 ", SEED.length, " \u4E2A\u8BCD\uFF1B\u5B83\u4E0D\u662F\u5B98\u65B9 7000 \u8BCD\u8868\u3002\u661F\u7EA7\u662F\u7F16\u8F91\u5EFA\u8BAE\u7684\u5B66\u4E60\u4F18\u5148\u7EA7\uFF0C\u5E76\u975E\u8003\u8BD5\u9891\u6B21\u7EDF\u8BA1\u3002IELTS / GRE \u4F8B\u53E5\u5168\u90E8\u4E3A\u539F\u521B\u6559\u5B66\u793A\u8303\uFF0C\u4E0D\u662F\u5B98\u65B9\u771F\u9898\u3001\u671F\u520A\u6458\u5F55\u6216\u5DF2\u83B7\u8BC4\u5206\u7684\u7B54\u6848\u3002"), /* @__PURE__ */ React.createElement("p", null, "IELTS \u7684\u8BCD\u6C47\u8981\u6C42\u5305\u542B\u51C6\u786E\u6027\u3001\u8BED\u5883\u9002\u5207\u6027\u4E0E\u642D\u914D\u63A7\u5236\u3002GRE \u516D\u9009\u4E8C\u8981\u6C42\u4E24\u4E2A\u9009\u9879\u5206\u522B\u4EE3\u5165\u540E\uFF0C\u6574\u53E5\u610F\u4E49\u76F8\u8FD1\uFF1B\u53EA\u914D\u5BF9\u8FD1\u4E49\u8BCD\u4E0D\u8DB3\u4EE5\u4F5C\u7B54\u3002"), /* @__PURE__ */ React.createElement("div", { className: "source-links" }, /* @__PURE__ */ React.createElement("a", { href: "https://ielts.org/cdn/Guides/ielts-writing-band-descriptors.pdf", target: "_blank", rel: "noreferrer" }, "IELTS \u5B98\u65B9\u5199\u4F5C\u8BC4\u5206\u6807\u51C6", /* @__PURE__ */ React.createElement(ArrowUpRight, { size: 14 })), /* @__PURE__ */ React.createElement("a", { href: "https://www.ets.org/gre/test-takers/general-test/prepare/content/verbal-reasoning.html", target: "_blank", rel: "noreferrer" }, "ETS \u5B98\u65B9 Verbal / Sentence Equivalence", /* @__PURE__ */ React.createElement(ArrowUpRight, { size: 14 })), /* @__PURE__ */ React.createElement("a", { href: "https://dictionary.cambridge.org/dictionary/english/equivocal", target: "_blank", rel: "noreferrer" }, "Cambridge \xB7 equivocal \u4E49\u9879\u53C2\u8003", /* @__PURE__ */ React.createElement(ArrowUpRight, { size: 14 }))), /* @__PURE__ */ React.createElement(SectionTitle, { icon: Database }, "\u672C\u5730\u4F7F\u7528\u4E0E\u8BED\u97F3"), /* @__PURE__ */ React.createElement("p", null, "\u5E94\u7528\u3001\u56FE\u6807\u3001\u5B57\u4F53\u4E0E\u8BCD\u5E93\u968F\u6587\u4EF6\u5185\u5D4C\uFF0C\u5B66\u4E60\u754C\u9762\u65E0\u9700\u8054\u7F51\u3002\u5BFC\u5165\u8BCD\u5E93\u548C\u8FDB\u5EA6\u538B\u7F29\u540E\u5B58\u5165 localStorage\uFF1B\u5BB9\u91CF\u548C file:// \u6587\u4EF6\u95F4\u7684\u9694\u79BB\u89C4\u5219\u53D6\u51B3\u4E8E\u6D4F\u89C8\u5668\u3002\u5EFA\u8BAE\u56FA\u5B9A\u6587\u4EF6\u4F4D\u7F6E\u4E0E\u6D4F\u89C8\u5668\uFF0C\u5B9A\u671F\u5BFC\u51FA JSON \u5907\u4EFD\u3002\u82E5\u6D4F\u89C8\u5668\u7981\u6B62\u5B58\u50A8\u6216\u7A7A\u95F4\u4E0D\u8DB3\uFF0C\u9875\u9762\u4F1A\u660E\u786E\u63D0\u793A\u3002\u82F1\u7F8E\u6717\u8BFB\u8C03\u7528\u8BBE\u5907\u7684\u8BED\u97F3\u5F15\u64CE\uFF0C\u662F\u5426\u53EF\u7528\u3001\u53E3\u97F3\u4E0E\u79BB\u7EBF\u80FD\u529B\u53D6\u51B3\u4E8E\u5DF2\u5B89\u88C5\u7684\u8BED\u97F3\uFF1BIPA \u59CB\u7EC8\u53EF\u67E5\u770B\u3002"), /* @__PURE__ */ React.createElement("button", { className: "btn secondary", onClick: onRecover }, /* @__PURE__ */ React.createElement(Download, { size: 16 }), "\u5BFC\u51FA\u672C\u5730\u6062\u590D\u6570\u636E")));
  }
  function App() {
    const [words, setWords] = useState(INITIAL.words), [progress, setProgress] = useState(INITIAL.progress), [theme, setTheme] = useState(INITIAL.theme);
    const [lib, setLib] = useState("all"), [view, setView] = useState("grid"), [query, setQuery] = useState(""), [letter, setLetter] = useState(""), [topic, setTopic] = useState(""), [func, setFunc] = useState(""), [status, setStatusFilter] = useState(""), [sort, setSort] = useState("priority"), [page, setPage] = useState(1);
    const [randomSeed, setRandomSeed] = useState(() => Math.floor(Math.random() * 1e9));
    const [hideMastered, setHideMastered] = useState(() => {
      try { return localStorage.getItem("lexicon.studio.hideMastered.v1") === "1"; } catch (e) { return false; }
    });
    const [jumpInput, setJumpInput] = useState(""), [highlightedWord, setHighlightedWord] = useState("");
    const [overlay, setOverlay] = useState(null), [selected, setSelected] = useState(null), [history, setHistory] = useState([]), [graphFocus, setGraphFocus] = useState("mitigate"), [toast, setToast] = useState(null), [storageError, setStorageError] = useState(INITIAL.error), [mobileNav, setMobileNav] = useState(false);
    const searchRef = useRef(), toastTimer = useRef(), progressRef = useRef(progress), wordsRef = useRef(words), contentRef = useRef(), damaged = useRef({ ...INITIAL.damaged });
    progressRef.current = progress;
    wordsRef.current = words;
    const notify = useCallback((text, type = "success") => {
      clearTimeout(toastTimer.current);
      setToast({ text, type });
      toastTimer.current = setTimeout(() => setToast(null), 5e3);
    }, []);
    const closeOverlay = useCallback(() => setOverlay(null), []);
    const wordMap = useMemo(() => new Map(words.map((w) => [w.id, w])), [words]);
    const moduleWords = useMemo(() => lib === "all" ? words : words.filter((w) => w.libraries.includes(lib)), [words, lib]);
    const searchIndex = useMemo(() => {
      const m = new Map();
      for (let i = 0; i < words.length; i++) {
        const w = words[i];
        let s = w.word + " " + w.definition.zh + " " + w.definition.en;
        for (let j = 0; j < w.forms.length; j++) s += " " + w.forms[j];
        for (let j = 0; j < w.topics.length; j++) s += " " + w.topics[j];
        for (let j = 0; j < w.functions.length; j++) s += " " + w.functions[j];
        for (let j = 0; j < w.collocations.length; j++) s += " " + w.collocations[j].en + " " + w.collocations[j].zh;
        m.set(w.id, s.toLowerCase());
      }
      return m;
    }, [words]);
    const counts = useMemo(() => {
      const c = { all: words.length, ielts: 0, writing: 0, gre: 0 };
      for (let i = 0; i < words.length; i++) {
        const libs = words[i].libraries;
        for (let j = 0; j < libs.length; j++) if (c[libs[j]] !== void 0) c[libs[j]]++;
      }
      return c;
    }, [words]);
    const stats = useMemo(() => {
      let mastered = 0, review = 0;
      for (const k in progress) {
        const st = progress[k]?.status;
        if (st === "mastered" && wordMap.has(k)) mastered++;
        else if (st === "review" && wordMap.has(k)) review++;
      }
      return { mastered, review, new: words.length - mastered - review };
    }, [words.length, wordMap, progress]);
    const links = useMemo(() => {
      let total = 0;
      for (let i = 0; i < words.length; i++) {
        const w = words[i];
        total += w.synonyms.length + w.antonyms.length + (w.partners ? w.partners.length : 0);
      }
      return Math.round(total / 2);
    }, [words]);
    const { topics, functions, letters } = useMemo(() => {
      const tSet = new Set(), fSet = new Set(), lSet = new Set();
      for (let i = 0; i < moduleWords.length; i++) {
        const w = moduleWords[i];
        if (w.word) lSet.add(w.word[0].toUpperCase());
        for (let j = 0; j < w.topics.length; j++) tSet.add(w.topics[j]);
        for (let j = 0; j < w.functions.length; j++) fSet.add(w.functions[j]);
      }
      return { topics: unique([...tSet]), functions: unique([...fSet]), letters: lSet };
    }, [moduleWords]);
    const hashWord = useCallback((id, seed) => {
      let h = seed | 0;
      for (let i = 0; i < id.length; i++) h = Math.imul(h ^ id.charCodeAt(i), 2654435761);
      return (h ^ h >>> 16) >>> 0;
    }, []);
    const fastCmp = (a, b) => a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
    const baseFiltered = useMemo(() => {
      const terms = query.normalize("NFKC").trim().toLowerCase().split(/\s+/).filter(Boolean);
      const list = moduleWords.filter((w) => (!letter || w.word[0].toUpperCase() === letter) && (!topic || w.topics.includes(topic)) && (!func || w.functions.includes(func)) && (! terms.length || terms.every((t) => searchIndex.get(w.id).includes(t))));
      if (sort === "random") return list.sort((a, b) => hashWord(a.id, randomSeed) - hashWord(b.id, randomSeed));
      if (sort === "az") return list.sort(fastCmp);
      if (sort === "priority") return list.sort((a, b) => (lib === "gre" ? b.frequency.gre - a.frequency.gre : lib === "ielts" || lib === "writing" ? b.frequency.ielts - a.frequency.ielts : b.frequency.gre + b.frequency.ielts - (a.frequency.gre + a.frequency.ielts)) || fastCmp(a, b));
      return list;
    }, [moduleWords, letter, topic, func, query, sort, randomSeed, hashWord, searchIndex, lib]);
    const filtered = useMemo(() => {
      let list = baseFiltered;
      if (status || hideMastered) {
        list = list.filter((w) => {
          const st = statusOf(progress, w.id);
          if (hideMastered && status !== "mastered" && st === "mastered") return false;
          return !status || st === status;
        });
      }
      if (sort === "progress") {
        const order = { new: 0, review: 1, mastered: 2 };
        return [...list].sort((a, b) => order[statusOf(progress, a.id)] - order[statusOf(progress, b.id)] || fastCmp(a, b));
      }
      return list;
    }, [baseFiltered, status, hideMastered, sort, progress]);
    const filterKey = [lib, query, letter, topic, func, status, hideMastered, sort, randomSeed].join("|");
    const pages = Math.max(1, Math.ceil(filtered.length / 12));
    const pageOptions = useMemo(() => Array.from({ length: pages }, (_, i) => /* @__PURE__ */ React.createElement("option", { key: i + 1, value: i + 1 }, "\u7B2C ", i + 1, " \u9875")), [pages]);
    const currentPage = Math.min(page, pages);
    const hasFilters = Boolean(query || letter || topic || func || status || hideMastered);
    useEffect(() => {
      setPage(1);
      setGraphFocus(filtered[0]?.id || "");
    }, [filterKey]);
    useEffect(() => {
      document.documentElement.dataset.theme = theme;
      try {
        localStorage.setItem(KEYS.theme, theme);
      } catch (e) {
        setStorageError("\u6D4F\u89C8\u5668\u7981\u6B62\u672C\u5730\u4FDD\u5B58\uFF1B\u5F53\u524D\u4FEE\u6539\u4EC5\u5728\u672C\u9875\u9762\u6709\u6548\uFF0C\u8BF7\u5BFC\u51FA JSON \u5907\u4EFD\u3002");
      }
    }, [theme]);
    useEffect(() => {
      const key = (e) => {
        if (overlay || e.target.isContentEditable || /INPUT|TEXTAREA|SELECT/.test(e.target.tagName)) return;
        if (e.key === "/" || (e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
          e.preventDefault();
          searchRef.current?.focus();
        }
      };
      document.addEventListener("keydown", key);
      return () => document.removeEventListener("keydown", key);
    }, [overlay]);
    useEffect(() => () => {
      clearTimeout(toastTimer.current);
      window.speechSynthesis?.cancel();
    }, []);
    useEffect(() => {
      try { localStorage.setItem("lexicon.studio.hideMastered.v1", hideMastered ? "1" : "0"); } catch (e) {}
    }, [hideMastered]);
    const clearFilters = () => {
      setQuery("");
      setLetter("");
      setTopic("");
      setFunc("");
      setStatusFilter("");
      setHideMastered(false);
    };
    const triggerShuffle = (goFlash = false) => {
      const nextSeed = Math.floor(Math.random() * 1e9) + 1;
      setRandomSeed(nextSeed);
      setSort("random");
      setPage(1);
      if (goFlash) {
        setView("flash");
        setMobileNav(false);
      }
      notify(goFlash ? "\u5DF2\u5F00\u542F\u4E71\u5E8F\u80CC\u5355\u8BCD\u6A21\u5F0F\uFF01" : "\u8BCD\u5E93\u5DF2\u968F\u673A\u6253\u4E71\u987A\u5E8F\uFF01");
    };
    const highlightCard = (wordId) => {
      setHighlightedWord(wordId);
      setTimeout(() => {
        const el = document.getElementById(`word-card-${wordId}`);
        if (el) el.scrollIntoView({ behavior: "smooth", block: "center" });
      }, 60);
      setTimeout(() => setHighlightedWord((prev) => prev === wordId ? "" : prev), 2600);
    };
    const handleJump = (e) => {
      if (e && e.preventDefault) e.preventDefault();
      const raw = jumpInput.trim();
      if (!raw) return;
      const cardNumMatch = raw.match(/^(?:#|\u8BCD\u5361|\u7B2C)?(\d+)(?:\u5F20|\u8BCD)?$/i);
      const isExplicitCard = raw.startsWith("#") || /\u8BCD|\u5F20/.test(raw);
      if (cardNumMatch) {
        const num = parseInt(cardNumMatch[1], 10);
        if (!isExplicitCard && num >= 1 && num <= pages) {
          setPage(num);
          setJumpInput("");
          contentRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
          notify(`\u5DF2\u8DF3\u8F6C\u5230\u7B2C ${num} / ${pages} \u9875`);
          return;
        }
        if (num >= 1 && num <= filtered.length) {
          const target = filtered[num - 1];
          const targetPage = Math.floor((num - 1) / 12) + 1;
          setPage(targetPage);
          setJumpInput("");
          if (view !== "grid") setView("grid");
          highlightCard(target.id);
          notify(`\u5DF2\u5B9A\u4F4D\u5230\u7B2C #${num} \u5F20\u8BCD\u5361\u300C${target.word}\u300D\uFF08\u7B2C ${targetPage} \u9875\uFF09`);
          return;
        }
        notify(`\u8BF7\u8F93\u5165\u6709\u6548\u9875\u7801 (1-${pages}) \u6216 #\u8BCD\u5361\u5E8F\u53F7 (#1-#${filtered.length})`, "error");
        return;
      }
      const q = raw.toLowerCase();
      let idx = filtered.findIndex((w) => w.word.toLowerCase() === q || w.id === q);
      if (idx === -1) idx = filtered.findIndex((w) => w.word.toLowerCase().startsWith(q));
      if (idx === -1) idx = filtered.findIndex((w) => w.word.toLowerCase().includes(q) || w.definition.zh.includes(raw));
      if (idx !== -1) {
        const target = filtered[idx];
        const targetPage = Math.floor(idx / 12) + 1;
        setPage(targetPage);
        setJumpInput("");
        if (view !== "grid") setView("grid");
        highlightCard(target.id);
        notify(`\u5DF2\u8DF3\u8F6C\u5230\u8BCD\u5361 #${idx + 1}\u300C${target.word}\u300D\uFF08\u7B2C ${targetPage} \u9875\uFF09`);
        return;
      }
      const globalMatch = words.find((w) => w.word.toLowerCase() === q || w.id === q) || words.find((w) => w.word.toLowerCase().startsWith(q) || w.definition.zh.includes(raw));
      if (globalMatch) {
        setJumpInput("");
        openWord(globalMatch.id);
        notify(`\u300C${globalMatch.word}\u300D\u5728\u5F53\u524D\u7B5B\u9009/\u5C4F\u853D\u8303\u56F4\u5916\uFF0C\u5DF2\u76F4\u63A5\u4E3A\u4F60\u6253\u5F00\u8BE6\u60C5\u8BCD\u5361\uFF01`);
        return;
      }
      notify(`\u672A\u627E\u5230\u4E0E\u300C${raw}\u300D\u5339\u914D\u7684\u9875\u7801\u6216\u8BCD\u5361`, "error");
    };
    const chooseLib = (id) => {
      setLib(id);
      setTopic("");
      setFunc("");
      setLetter("");
      setMobileNav(false);
    };
    const updateStatus = useCallback((id, status2) => {
      const old = progressRef.current[id], next = { ...progressRef.current, [id]: { status: status2, lastReviewed: (/* @__PURE__ */ new Date()).toISOString(), reviews: (old?.reviews || 0) + 1 } };
      progressRef.current = next;
      setProgress(next);
      try {
        if (damaged.current.progress) throw new Error("damaged original progress");
        localStorage.setItem(KEYS.progress, encode(next));
        if (!Object.values(damaged.current).some(Boolean)) setStorageError("");
      } catch (e) {
        setStorageError("\u5B66\u4E60\u8BB0\u5F55\u5C1A\u672A\u4FDD\u5B58\uFF1A\u672C\u5730\u7A7A\u95F4\u4E0D\u8DB3\u6216\u5B58\u50A8\u88AB\u7981\u7528\uFF0C\u8BF7\u5BFC\u51FA JSON \u5907\u4EFD\u3002");
        notify("\u672C\u6B21\u72B6\u6001\u4EC5\u4FDD\u7559\u5728\u5F53\u524D\u9875\u9762\uFF0C\u8BF7\u5907\u4EFD\u3002", "error");
      }
    }, [notify]);
    const openWord = useCallback((id) => {
      if (!wordMap.has(id)) {
        notify("\u6B64\u5173\u8054\u8BCD\u5C1A\u672A\u6536\u5F55\uFF0C\u8BF7\u68C0\u67E5\u8BCD\u5E93\u3002", "error");
        return;
      }
      setSelected(id);
      setHistory([id]);
      setOverlay("detail");
    }, [wordMap, notify]);
    const followLink = (id) => {
      if (!wordMap.has(id)) return;
      setSelected(id);
      setHistory((h) => h.at(-1) === id ? h : [...h.slice(-29), id]);
      setOverlay("detail");
    };
    const backWord = () => {
      if (history.length < 2) return;
      const next = history.slice(0, -1);
      setHistory(next);
      setSelected(next.at(-1));
    };
    const graphFrom = (id) => {
      setOverlay(null);
      setView("graph");
      setGraphFocus(id);
    };
    const speak = useCallback((text, lang) => {
      if (!("speechSynthesis" in window)) {
        notify("\u6B64\u6D4F\u89C8\u5668\u4E0D\u652F\u6301\u6717\u8BFB\uFF0C\u53EF\u76F4\u63A5\u53C2\u8003\u82F1\u7F8E\u97F3\u6807\u3002", "error");
        return;
      }
      const voices = window.speechSynthesis.getVoices(), voice = voices.find((v) => v.lang.replace("_", "-").toLowerCase() === lang.toLowerCase());
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = lang;
      utterance.rate = 0.88;
      if (voice) utterance.voice = voice;
      utterance.onerror = (e) => {
        if (!["interrupted", "canceled"].includes(e.error)) notify("\u8BED\u97F3\u6682\u65F6\u4E0D\u53EF\u7528\uFF0C\u8BF7\u68C0\u67E5\u8BBE\u5907\u82F1\u8BED\u8BED\u97F3\u5305\u3002", "error");
      };
      window.speechSynthesis.cancel();
      window.speechSynthesis.speak(utterance);
    }, [notify]);
    const importWords = async (result, restore) => {
      const nextWords = combine(wordsRef.current, result.words), nextProgress = restore && result.progress ? { ...progressRef.current, ...result.progress } : progressRef.current;
      let oldWords, rollbackFailed = false;
      try {
        oldWords = localStorage.getItem(KEYS.words);
        const seedMap = new Map(SEED.map((w) => [w.id, w])); const deltaWords = nextWords.filter((w) => !seedMap.has(w.id) || JSON.stringify(seedMap.get(w.id)) !== JSON.stringify(w)); const packed = encode({ version: 1, words: deltaWords.length ? deltaWords : result.words });
        localStorage.setItem(KEYS.words, packed);
        try {
          if (!damaged.current.progress || restore && result.progress) localStorage.setItem(KEYS.progress, encode(nextProgress));
        } catch (e) {
          try {
            if (oldWords === null) localStorage.removeItem(KEYS.words);
            else localStorage.setItem(KEYS.words, oldWords);
          } catch (rollbackError) {
            rollbackFailed = true;
          }
          throw e;
        }
      } catch (e) {
        if (rollbackFailed) {
          setStorageError("\u5BFC\u5165\u4FDD\u5B58\u4E0E\u56DE\u9000\u5747\u5931\u8D25\uFF0C\u8BF7\u7ACB\u5373\u5BFC\u51FA\u5F53\u524D\u8BCD\u5E93\u548C\u672C\u5730\u6062\u590D\u6570\u636E\u540E\u91CD\u65B0\u6253\u5F00\u3002");
          throw new Error("\u65E0\u6CD5\u786E\u8BA4\u672C\u5730\u4FDD\u5B58\u72B6\u6001\u3002\u5F53\u524D\u9875\u9762\u7684\u539F\u8BCD\u5E93\u4ECD\u5728\uFF0C\u8BF7\u5148\u5BFC\u51FA\u5907\u4EFD\u4E0E\u6062\u590D\u6570\u636E\u3002");
        }
        throw new Error("\u65E0\u6CD5\u4FDD\u5B58\u5BFC\u5165\u5185\u5BB9\uFF1A\u672C\u5730\u7A7A\u95F4\u4E0D\u8DB3\u6216\u5B58\u50A8\u88AB\u7981\u7528\u3002\u539F\u8BCD\u5E93\u4FDD\u6301\u4E0D\u53D8\uFF1B\u8BF7\u51CF\u5C0F\u5BFC\u5165\u6279\u6B21\uFF0C\u6216\u5148\u5907\u4EFD\u5E76\u5728\u53EF\u4FDD\u5B58\u7684\u6D4F\u89C8\u5668\u4E2D\u4F7F\u7528\u3002");
      }
      damaged.current.words = false;
      if (restore && result.progress) damaged.current.progress = false;
      wordsRef.current = nextWords;
      progressRef.current = nextProgress;
      setWords(nextWords);
      setProgress(nextProgress);
      if (!Object.values(damaged.current).some(Boolean)) setStorageError("");
      if (restore && result.theme) setTheme(result.theme);
    };
    const backupRaw = () => {
      try {
        downloadFile(`lexicon-recovery-${dateLabel()}.json`, JSON.stringify({ version: 1, original: INITIAL.raw, rawWords: localStorage.getItem(KEYS.words), rawProgress: localStorage.getItem(KEYS.progress), rawTheme: localStorage.getItem(KEYS.theme), note: "\u6062\u590D\u5BB9\u5668\uFF1Alz1: \u524D\u7F00\u540E\u7684\u5185\u5BB9\u4F7F\u7528 LZ-string decompressFromUTF16 \u89E3\u7801\uFF1B\u6B63\u5E38\u5907\u4EFD\u8BF7\u4F7F\u7528\u8BCD\u5E93\u5DE5\u4F5C\u5BA4\u3002" }, null, 2));
      } catch (e) {
        notify("\u6D4F\u89C8\u5668\u7981\u6B62\u8BFB\u53D6\u5B58\u50A8\uFF1B\u8BF7\u5728\u8BCD\u5E93\u5DE5\u4F5C\u5BA4\u5BFC\u51FA\u5F53\u524D\u9875\u9762\u7684 JSON\u3002", "error");
      }
    };
    const activeLib = LIBS.find((l) => l.id === lib);
    const switchView = (next) => {
      setView(next);
      setMobileNav(false);
    };
    return /* @__PURE__ */ React.createElement("div", { className: `app-shell ${view === "flash" ? "focus-mode" : ""}` }, mobileNav && /* @__PURE__ */ React.createElement("button", { className: "sidebar-backdrop", "aria-label": "\u5173\u95ED\u5BFC\u822A", onClick: () => setMobileNav(false) }), /* @__PURE__ */ React.createElement("aside", { className: `sidebar ${mobileNav ? "is-open" : ""}` }, /* @__PURE__ */ React.createElement("a", { href: "#", className: "brand", onClick: (e) => {
      e.preventDefault();
      chooseLib("all");
      clearFilters();
      setView("grid");
    } }, /* @__PURE__ */ React.createElement("span", { className: "brand-icon" }, /* @__PURE__ */ React.createElement(Network, { size: 23 })), /* @__PURE__ */ React.createElement("span", null, /* @__PURE__ */ React.createElement("strong", null, "lexicon", /* @__PURE__ */ React.createElement("span", { className: "brand-dot" }, ".")), /* @__PURE__ */ React.createElement("small", null, "\u8BCD\u5883 \xB7 \u8BED\u8A00\u5B66\u4E60\u5DE5\u4F5C\u53F0"))), /* @__PURE__ */ React.createElement("div", { className: "sidebar-section-label" }, "YOUR COLLECTIONS"), /* @__PURE__ */ React.createElement("nav", { className: "collection-nav", role: "tablist", "aria-label": "\u4E09\u5927\u8BCD\u5E93\u4E0E\u6DF7\u5408\u68C0\u7D22" }, LIBS.map((l) => {
      const Icon = l.icon;
      return /* @__PURE__ */ React.createElement("button", { key: l.id, role: "tab", "aria-selected": lib === l.id, className: lib === l.id ? "active" : "", onClick: () => chooseLib(l.id) }, /* @__PURE__ */ React.createElement(Icon, { size: 18, className: l.color }), /* @__PURE__ */ React.createElement("span", null, l.name, /* @__PURE__ */ React.createElement("small", null, l.en)), /* @__PURE__ */ React.createElement("b", null, counts[l.id]));
    })), /* @__PURE__ */ React.createElement("div", { className: "sidebar-divider" }), /* @__PURE__ */ React.createElement("div", { className: "sidebar-section-label" }, "MY LEARNING"), /* @__PURE__ */ React.createElement("button", { className: `sidebar-link ${status === "review" ? "selected" : ""}`, onClick: () => {
      setLib("all");
      clearFilters();
      setStatusFilter("review");
      setView("grid");
      setMobileNav(false);
    } }, /* @__PURE__ */ React.createElement(RefreshCw, { size: 17 }), /* @__PURE__ */ React.createElement("span", null, "\u5F85\u590D\u4E60\u7684\u8BCD"), /* @__PURE__ */ React.createElement("b", null, stats.review)), /* @__PURE__ */ React.createElement("button", { className: `sidebar-link ${status === "mastered" ? "selected" : ""}`, onClick: () => {
      setLib("all");
      clearFilters();
      setStatusFilter("mastered");
      setView("grid");
      setMobileNav(false);
    } }, /* @__PURE__ */ React.createElement(CheckCheck, { size: 18 }), /* @__PURE__ */ React.createElement("span", null, "\u5DF2\u7ECF\u638C\u63E1"), /* @__PURE__ */ React.createElement("b", null, stats.mastered)), /* @__PURE__ */ React.createElement("button", { className: `sidebar-link ${hideMastered ? "selected" : ""}`, onClick: () => {
      setHideMastered((h) => !h);
      if (status === "mastered") setStatusFilter("");
      setMobileNav(false);
    } }, /* @__PURE__ */ React.createElement(Eye, { size: 17 }), /* @__PURE__ */ React.createElement("span", null, hideMastered ? "\u5DF2\u5C4F\u853D\u5DF2\u638C\u63E1\u8BCD" : "\u5C4F\u853D\u5DF2\u638C\u63E1\u7684\u8BCD"), /* @__PURE__ */ React.createElement("b", null, hideMastered ? "\u5F00\u542F" : "\u5173\u95ED")), /* @__PURE__ */ React.createElement("div", { className: "sidebar-spacer" }), /* @__PURE__ */ React.createElement("div", { className: "sidebar-note" }, /* @__PURE__ */ React.createElement("span", { className: "tiny-label" }, "A NOTE TO YOURSELF"), /* @__PURE__ */ React.createElement("p", { className: "serif" }, "Learn the word.", /* @__PURE__ */ React.createElement("br", null), "Keep the context."), /* @__PURE__ */ React.createElement("span", null, "\u8BB0\u4F4F\u4E00\u4E2A\u8BCD\uFF0C\u4E5F\u8BB0\u4F4F\u5B83\u5982\u4F55\u88AB\u4F7F\u7528\u3002")), /* @__PURE__ */ React.createElement("button", { className: "sidebar-link", onClick: () => {
      setOverlay("guide");
      setMobileNav(false);
    } }, /* @__PURE__ */ React.createElement(Info, { size: 17 }), /* @__PURE__ */ React.createElement("span", null, "\u5B66\u4E60\u6307\u5357\u4E0E\u5FEB\u6377\u952E"), /* @__PURE__ */ React.createElement(ArrowUpRight, { size: 14 })), /* @__PURE__ */ React.createElement("div", { className: `storage-indicator ${storageError ? "error" : ""}` }, /* @__PURE__ */ React.createElement("span", { className: "dot" }), /* @__PURE__ */ React.createElement("span", null, storageError ? "\u672C\u5730\u4FDD\u5B58\u9700\u8981\u5173\u6CE8" : "\u8FDB\u5EA6\u81EA\u52A8\u4FDD\u5B58\u5728\u6B64\u6D4F\u89C8\u5668")), /* @__PURE__ */ React.createElement("div", { className: "sidebar-foot" }, "IELTS & GRE ", /* @__PURE__ */ React.createElement("span", null, "PERSONAL EDITION / 01"))), /* @__PURE__ */ React.createElement("div", { className: "main-shell" }, /* @__PURE__ */ React.createElement("header", { className: "topbar" }, /* @__PURE__ */ React.createElement("div", { className: "topbar-path" }, /* @__PURE__ */ React.createElement(IconButton, { icon: Menu, label: "\u6253\u5F00\u4FA7\u8FB9\u5BFC\u822A", className: "mobile-menu", onClick: () => setMobileNav(true) }), /* @__PURE__ */ React.createElement("span", null, "WORKSPACE"), /* @__PURE__ */ React.createElement(ChevronRight, { size: 13 }), /* @__PURE__ */ React.createElement("strong", null, "Vocabulary atlas")), /* @__PURE__ */ React.createElement("div", { className: "flex items-center gap-2" }, /* @__PURE__ */ React.createElement("span", { className: "offline-pill" }, /* @__PURE__ */ React.createElement("span", { className: "dot" }), "\u79BB\u7EBF\u53EF\u7528"), /* @__PURE__ */ React.createElement(IconButton, { icon: theme === "dark" ? Sun : Moon, label: theme === "dark" ? "\u5207\u6362\u62A4\u773C\u6D45\u8272\u6A21\u5F0F" : "\u5207\u6362\u6DF1\u8272\u6A21\u5F0F", onClick: () => setTheme((t) => t === "dark" ? "light" : "dark") }), /* @__PURE__ */ React.createElement("button", { className: "btn topbar-studio", onClick: () => setOverlay("studio") }, /* @__PURE__ */ React.createElement(Plus, { size: 16 }), /* @__PURE__ */ React.createElement("span", null, "\u8BCD\u5E93\u5DE5\u4F5C\u5BA4")))), /* @__PURE__ */ React.createElement("main", null, storageError && /* @__PURE__ */ React.createElement("div", { className: "storage-banner", role: "alert" }, /* @__PURE__ */ React.createElement(AlertCircle, { size: 17 }), /* @__PURE__ */ React.createElement("p", null, storageError), /* @__PURE__ */ React.createElement("button", { className: "text-btn", onClick: () => setOverlay("studio") }, "\u7ACB\u5373\u5907\u4EFD", /* @__PURE__ */ React.createElement(ArrowRight, { size: 14 }))), /* @__PURE__ */ React.createElement("section", { className: "hero" }, /* @__PURE__ */ React.createElement("div", { className: "hero-copy" }, /* @__PURE__ */ React.createElement("span", { className: "eyebrow" }, /* @__PURE__ */ React.createElement("span", { className: "short-rule" }), "YOUR PERSONAL WORD ATLAS"), /* @__PURE__ */ React.createElement("h1", null, "Words worth", /* @__PURE__ */ React.createElement("br", null), /* @__PURE__ */ React.createElement("span", { className: "serif" }, "connecting.")), /* @__PURE__ */ React.createElement("p", null, "\u628A\u5B64\u7ACB\u7684\u5355\u8BCD\uFF0C\u8FDE\u6210\u4F60\u7684\u8868\u8FBE\u7F51\u7EDC\u3002"), /* @__PURE__ */ React.createElement("div", { className: "hero-actions" }, /* @__PURE__ */ React.createElement("button", { className: "btn primary", onClick: () => switchView("flash"), disabled: !filtered.length }, "\u5F00\u59CB\u4E00\u8F6E\u5B66\u4E60", /* @__PURE__ */ React.createElement(ArrowRight, { size: 16 })), /* @__PURE__ */ React.createElement("button", { className: "btn btn-shuffle-hero", onClick: () => triggerShuffle(true), disabled: !filtered.length, title: "\u968F\u673A\u6253\u4E71\u8BCD\u5E93\u5E76\u8FDB\u5165\u95EA\u5361\u80CC\u8BF5" }, /* @__PURE__ */ React.createElement(Shuffle, { size: 16 }), "\u4E71\u5E8F\u80CC\u5355\u8BCD"), /* @__PURE__ */ React.createElement("button", { className: "btn btn-shuffle-hero", onClick: () => triggerShuffle(false), disabled: !filtered.length, title: "\u5728\u5361\u7247\u7F51\u683C\u4E2D\u968F\u673A\u4E71\u5E8F\u6392\u5217" }, /* @__PURE__ */ React.createElement(Shuffle, { size: 15 }), "\u5361\u7247\u4E71\u5E8F\u6D17\u724C"))), /* @__PURE__ */ React.createElement("div", { className: "hero-aside" }, /* @__PURE__ */ React.createElement(HeroNetwork, { words, wordMap, onOpen: openWord }), /* @__PURE__ */ React.createElement("div", { className: "hero-meta" }, /* @__PURE__ */ React.createElement("span", null, /* @__PURE__ */ React.createElement("b", null, words.length.toLocaleString()), " \u7CBE\u9009\u8BCD\u6761"), /* @__PURE__ */ React.createElement("span", null, /* @__PURE__ */ React.createElement("b", null, links.toLocaleString()), " \u8BED\u4E49\u5173\u8054"), /* @__PURE__ */ React.createElement(Badge, { color: "green" }, SEED.length, " \u8BCD\u5185\u7F6E \xB7 \u81EA\u7531\u6269\u5C55")))), /* @__PURE__ */ React.createElement("div", { className: "overview-grid" }, /* @__PURE__ */ React.createElement("div", { className: "overview-card collection-summary" }, /* @__PURE__ */ React.createElement("span", { className: `summary-icon ${activeLib.color}` }, /* @__PURE__ */ React.createElement(activeLib.icon, { size: 21 })), /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("p", null, activeLib.id === "all" ? "\u4E09\u5927\u8BCD\u5E93\uFF0C\u4E00\u8D77\u63A2\u7D22" : activeLib.en), /* @__PURE__ */ React.createElement("strong", null, activeLib.id === "all" ? "IELTS + Writing + GRE" : activeLib.name)), /* @__PURE__ */ React.createElement("span", { className: "overview-number" }, moduleWords.length, /* @__PURE__ */ React.createElement("small", null, "\u8BCD"))), /* @__PURE__ */ React.createElement("button", { className: `overview-card progress-summary ${status === "mastered" ? "active" : ""}`, onClick: () => setStatusFilter(status === "mastered" ? "" : "mastered") }, /* @__PURE__ */ React.createElement("svg", { className: "progress-ring", viewBox: "0 0 42 42" }, /* @__PURE__ */ React.createElement("circle", { cx: "21", cy: "21", r: "17" }), /* @__PURE__ */ React.createElement("circle", { cx: "21", cy: "21", r: "17", pathLength: "100", strokeDasharray: `${stats.mastered / words.length * 100} 100`, transform: "rotate(-90 21 21)" })), /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("p", null, "\u5DF2\u638C\u63E1 \xB7 \u5168\u8BCD\u5E93"), /* @__PURE__ */ React.createElement("strong", null, stats.mastered, /* @__PURE__ */ React.createElement("span", null, " / ", words.length))), /* @__PURE__ */ React.createElement("span", { className: "stat-percent" }, Math.round(stats.mastered / words.length * 100), "%")), /* @__PURE__ */ React.createElement("button", { className: `overview-card review-summary ${status === "review" ? "active" : ""}`, onClick: () => setStatusFilter(status === "review" ? "" : "review") }, /* @__PURE__ */ React.createElement("span", { className: "summary-icon gold" }, /* @__PURE__ */ React.createElement(RefreshCw, { size: 21 })), /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("p", null, "\u6E29\u6545\u800C\u77E5\u65B0"), /* @__PURE__ */ React.createElement("strong", null, stats.review, /* @__PURE__ */ React.createElement("span", null, " \u4E2A\u8BCD\u5F85\u590D\u4E60"))), /* @__PURE__ */ React.createElement(ArrowUpRight, { size: 18 }))), /* @__PURE__ */ React.createElement("section", { className: "workspace", ref: contentRef, "aria-label": "\u8BCD\u6C47\u5DE5\u4F5C\u53F0" }, /* @__PURE__ */ React.createElement("div", { className: "workspace-title" }, /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("h2", null, view === "flash" ? "\u6C89\u6D78\u5B66\u4E60" : view === "graph" ? "\u8BCD\u4E49\u5173\u7CFB\u56FE\u8C31" : "\u8BCD\u6C47\u5DE5\u4F5C\u53F0", /* @__PURE__ */ React.createElement("span", { className: "count-chip" }, filtered.length)), /* @__PURE__ */ React.createElement("p", null, activeLib.description)), /* @__PURE__ */ React.createElement("div", { className: "view-switcher", role: "tablist", "aria-label": "\u5B66\u4E60\u6A21\u5F0F" }, [["grid", "\u5361\u7247", Layers3], ["flash", "\u95EA\u5361", BookOpen], ["graph", "\u56FE\u8C31", Network]].map(([id, label, Icon]) => /* @__PURE__ */ React.createElement("button", { key: id, role: "tab", "aria-label": label, "aria-selected": view === id, className: view === id ? "active" : "", onClick: () => switchView(id) }, /* @__PURE__ */ React.createElement(Icon, { size: 16 }), /* @__PURE__ */ React.createElement("span", null, label))))), /* @__PURE__ */ React.createElement("div", { className: "module-tabs", role: "tablist", "aria-label": "\u4E09\u5927\u6838\u5FC3\u8BCD\u5E93\u5FEB\u901F\u5207\u6362" }, LIBS.map((l) => {
      const Icon = l.icon;
      return /* @__PURE__ */ React.createElement("button", { key: l.id, type: "button", role: "tab", "aria-selected": lib === l.id, className: `module-tab ${l.color} ${lib === l.id ? "active" : ""}`, onClick: () => chooseLib(l.id) }, /* @__PURE__ */ React.createElement("span", { className: `module-tab-icon ${l.color}` }, /* @__PURE__ */ React.createElement(Icon, { size: 16 })), /* @__PURE__ */ React.createElement("span", { className: "module-tab-copy" }, /* @__PURE__ */ React.createElement("strong", null, l.name), /* @__PURE__ */ React.createElement("small", null, l.en)), /* @__PURE__ */ React.createElement("span", { className: "module-tab-count" }, counts[l.id]));
    })), /* @__PURE__ */ React.createElement("div", { className: "filters-panel" }, /* @__PURE__ */ React.createElement("div", { className: "search-row" }, /* @__PURE__ */ React.createElement("div", { className: "search-box" }, /* @__PURE__ */ React.createElement(Search, { size: 18 }), /* @__PURE__ */ React.createElement("input", { ref: searchRef, value: query, onChange: (e) => setQuery(e.target.value), placeholder: "\u641C\u7D22\u5355\u8BCD\u3001\u4E2D\u6587\u91CA\u4E49\u6216\u642D\u914D\u2026", "aria-label": "\u641C\u7D22\u5355\u8BCD\u3001\u4E2D\u6587\u91CA\u4E49\u6216\u642D\u914D" }), query ? /* @__PURE__ */ React.createElement(IconButton, { icon: X, label: "\u6E05\u9664\u641C\u7D22", onClick: () => setQuery("") }) : /* @__PURE__ */ React.createElement("kbd", null, "/")), /* @__PURE__ */ React.createElement("label", { className: "select-wrap" }, /* @__PURE__ */ React.createElement(SlidersHorizontal, { size: 15 }), /* @__PURE__ */ React.createElement("span", { className: "sr-only" }, "\u6309\u638C\u63E1\u7A0B\u5EA6\u7B5B\u9009"), /* @__PURE__ */ React.createElement("select", { value: status, onChange: (e) => setStatusFilter(e.target.value) }, /* @__PURE__ */ React.createElement("option", { value: "" }, "\u5168\u90E8\u638C\u63E1\u7A0B\u5EA6"), Object.entries(STATUS).map(([id, s]) => /* @__PURE__ */ React.createElement("option", { key: id, value: id }, s.label))), /* @__PURE__ */ React.createElement(ChevronDown, { size: 13 })), /* @__PURE__ */ React.createElement("label", { className: "select-wrap" }, /* @__PURE__ */ React.createElement("span", { className: "sr-only" }, "\u6309\u8BDD\u9898\u7B5B\u9009"), /* @__PURE__ */ React.createElement("select", { value: topic, onChange: (e) => setTopic(e.target.value) }, /* @__PURE__ */ React.createElement("option", { value: "" }, "\u5168\u90E8\u8BDD\u9898"), topics.map((t) => /* @__PURE__ */ React.createElement("option", { key: t, value: t }, t))), /* @__PURE__ */ React.createElement(ChevronDown, { size: 13 })), /* @__PURE__ */ React.createElement("label", { className: "select-wrap" }, /* @__PURE__ */ React.createElement("span", { className: "sr-only" }, "\u6309\u5199\u4F5C\u529F\u80FD\u7B5B\u9009"), /* @__PURE__ */ React.createElement("select", { value: func, onChange: (e) => setFunc(e.target.value) }, /* @__PURE__ */ React.createElement("option", { value: "" }, "\u5199\u4F5C\u529F\u80FD"), functions.map((t) => /* @__PURE__ */ React.createElement("option", { key: t, value: t }, t))), /* @__PURE__ */ React.createElement(ChevronDown, { size: 13 })), /* @__PURE__ */ React.createElement("button", {
      type: "button",
      className: `hide-mastered-toggle ${hideMastered ? "active" : ""}`,
      "aria-pressed": hideMastered,
      title: hideMastered ? "\u5F53\u524D\u5DF2\u9690\u85CF\u6240\u6709\u5DF2\u638C\u63E1\u5355\u8BCD\uFF0C\u70B9\u51FB\u6062\u590D\u663E\u793A" : "\u4E00\u952E\u5C4F\u853D\u6240\u6709\u5DF2\u638C\u63E1\u7684\u5355\u8BCD\uFF0C\u4E13\u6CE8\u672A\u638C\u63E1\u8BCD\u6C47",
      onClick: () => {
        const next = !hideMastered;
        setHideMastered(next);
        if (next && status === "mastered") setStatusFilter("");
        notify(next ? `\u5DF2\u5C4F\u853D ${stats.mastered} \u4E2A\u5DF2\u638C\u63E1\u5355\u8BCD` : "\u5DF2\u6062\u590D\u663E\u793A\u5DF2\u638C\u63E1\u5355\u8BCD");
      }
    }, /* @__PURE__ */ React.createElement(CheckCircle2, { size: 15 }), hideMastered ? `\u5DF2\u5C4F\u853D\u5DF2\u638C\u63E1 (${stats.mastered})` : `\u5C4F\u853D\u5DF2\u638C\u63E1 (${stats.mastered})`)), /* @__PURE__ */ React.createElement("div", { className: "quick-chips-row" }, /* @__PURE__ */ React.createElement("span", { className: "quick-chips-label" }, lib === "ielts" ? "\u9AD8\u9891\u573A\u666F" : "\u529F\u80FD\u901F\u9009"), (lib === "ielts" ? topics : functions).map((chip) => {
      const isActive = lib === "ielts" ? topic === chip : func === chip;
      return /* @__PURE__ */ React.createElement("button", { key: chip, type: "button", className: `quick-chip ${isActive ? "active" : ""}`, onClick: () => lib === "ielts" ? setTopic(isActive ? "" : chip) : setFunc(isActive ? "" : chip) }, chip);
    })), /* @__PURE__ */ React.createElement("div", { className: "alphabet-row" }, /* @__PURE__ */ React.createElement("button", { className: !letter ? "active" : "", onClick: () => setLetter(""), "aria-pressed": !letter }, "\u5168\u90E8"), "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("").map((l) => /* @__PURE__ */ React.createElement("button", { key: l, disabled: !letters.has(l), className: letter === l ? "active" : "", "aria-pressed": letter === l, onClick: () => setLetter(letter === l ? "" : l) }, l)))), /* @__PURE__ */ React.createElement("div", { className: "results-bar" }, /* @__PURE__ */ React.createElement("span", null, hasFilters ? "\u7B5B\u9009\u5F97\u5230" : "\u6B63\u5728\u63A2\u7D22", " ", /* @__PURE__ */ React.createElement("b", null, filtered.length.toLocaleString()), " \u4E2A\u8BCD\u6C47", sort === "random" && /* @__PURE__ */ React.createElement(Badge, { color: "green", className: "ml-2" }, "\u4E71\u5E8F\u6A21\u5F0F"), hideMastered && /* @__PURE__ */ React.createElement(Badge, { color: "gold", className: "ml-1.5" }, "\u5DF2\u5C4F\u853D\u638C\u63E1\u8BCD"), hasFilters && /* @__PURE__ */ React.createElement("button", { className: "text-btn", onClick: clearFilters }, /* @__PURE__ */ React.createElement(X, { size: 12 }), "\u6E05\u9664\u7B5B\u9009")), /* @__PURE__ */ React.createElement("div", { className: "results-controls" }, /* @__PURE__ */ React.createElement("form", { className: "jump-form", onSubmit: handleJump }, /* @__PURE__ */ React.createElement("input", { className: "jump-input", value: jumpInput, onChange: (e) => setJumpInput(e.target.value), placeholder: `\u8DF3\u9875(1-${pages}) / #\u8BCD\u5361 / \u5355\u8BCD\u2026`, "aria-label": "\u8F93\u5165\u9875\u7801\u3001#\u8BCD\u5361\u5E8F\u53F7\u6216\u5355\u8BCD\u76F4\u8FBE" }), /* @__PURE__ */ React.createElement("button", { type: "submit", className: "jump-submit-btn" }, "\u76F4\u8FBE")), /* @__PURE__ */ React.createElement("button", { type: "button", className: `btn-shuffle-inline ${sort === "random" ? "active" : ""}`, onClick: () => triggerShuffle(false), title: "\u4E00\u952E\u968F\u673A\u6253\u4E71\u8BCD\u5361\u987A\u5E8F" }, /* @__PURE__ */ React.createElement(Shuffle, { size: 14 }), sort === "random" ? "\u91CD\u65B0\u6D17\u724C" : "\u4E71\u5E8F\u80CC\u8BCD"), /* @__PURE__ */ React.createElement("label", null, /* @__PURE__ */ React.createElement("span", null, "\u6392\u5E8F"), /* @__PURE__ */ React.createElement("select", { value: sort, onChange: (e) => { if (e.target.value === "random") triggerShuffle(false); else setSort(e.target.value); }, "aria-label": "\u8BCD\u6C47\u6392\u5E8F" }, /* @__PURE__ */ React.createElement("option", { value: "priority" }, "\u5B66\u4E60\u4F18\u5148\u7EA7"), /* @__PURE__ */ React.createElement("option", { value: "az" }, "\u5B57\u6BCD A \u2192 Z"), /* @__PURE__ */ React.createElement("option", { value: "progress" }, "\u638C\u63E1\u7A0B\u5EA6"), /* @__PURE__ */ React.createElement("option", { value: "random" }, "\u968F\u673A\u4E71\u5E8F")), /* @__PURE__ */ React.createElement(ChevronDown, { size: 12 })))), view === "flash" ? /* @__PURE__ */ React.createElement(Flashcards, { key: filterKey + ":" + words.length, words: filtered, wordMap, progress, onStatus: updateStatus, onOpen: openWord, speak, onExit: () => setView("grid"), onClear: clearFilters, modalOpen: Boolean(overlay), notify }) : view === "graph" && (wordMap.has(graphFocus) || filtered.length > 0) ? /* @__PURE__ */ React.createElement(GraphView, { focusId: graphFocus, setFocus: setGraphFocus, filtered, wordMap, progress, onOpen: openWord, speak }) : !filtered.length ? /* @__PURE__ */ React.createElement(EmptyState, { onClear: clearFilters }) : /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement("div", { className: "word-grid" }, filtered.slice((currentPage - 1) * 12, currentPage * 12).map((w, idx) => /* @__PURE__ */ React.createElement(WordCard, { key: w.id, word: w, curStatus: statusOf(progress, w.id), wordMap, onOpen: openWord, onLink: openWord, onStatus: updateStatus, speak, cardIndex: (currentPage - 1) * 12 + idx + 1, highlighted: highlightedWord === w.id }))), /* @__PURE__ */ React.createElement("div", { className: "pagination" }, /* @__PURE__ */ React.createElement("span", null, "\u7B2C ", (currentPage - 1) * 12 + 1, "\u2013", Math.min(currentPage * 12, filtered.length), " \u8BCD\uFF0C\u5171 ", filtered.length.toLocaleString(), " \u8BCD \xB7 \u7B2C ", currentPage, " / ", pages, " \u9875"), /* @__PURE__ */ React.createElement("div", { className: "pagination-controls" }, /* @__PURE__ */ React.createElement("form", { className: "jump-form", onSubmit: handleJump }, /* @__PURE__ */ React.createElement("input", { className: "jump-input", value: jumpInput, onChange: (e) => setJumpInput(e.target.value), placeholder: `\u8F93\u5165\u9875\u7801(1-${pages})\u3001#\u8BCD\u5361\u6216\u5355\u8BCD\u2026`, "aria-label": "\u8F93\u5165\u9875\u7801\u6216\u8BCD\u5361\u540D\u79F0\u8DF3\u8F6C" }), /* @__PURE__ */ React.createElement("button", { type: "submit", className: "jump-submit-btn" }, "\u8DF3\u8F6C / \u5B9A\u4F4D")), /* @__PURE__ */ React.createElement("div", { className: "flex items-center gap-2" }, /* @__PURE__ */ React.createElement(IconButton, { icon: ChevronLeft, label: "\u4E0A\u4E00\u9875", disabled: currentPage === 1, onClick: () => {
      setPage(currentPage - 1);
      contentRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
    } }), /* @__PURE__ */ React.createElement("label", null, /* @__PURE__ */ React.createElement("span", { className: "sr-only" }, "\u8DF3\u5230\u9875\u7801"), /* @__PURE__ */ React.createElement("select", { value: currentPage, onChange: (e) => setPage(Number(e.target.value)) }, pageOptions)), /* @__PURE__ */ React.createElement("span", null, "/ ", pages), /* @__PURE__ */ React.createElement(IconButton, { icon: ChevronRight, label: "\u4E0B\u4E00\u9875", disabled: currentPage === pages, onClick: () => {
      setPage(currentPage + 1);
      contentRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
    } })))))), /* @__PURE__ */ React.createElement("footer", { className: "main-footer" }, /* @__PURE__ */ React.createElement("span", null, /* @__PURE__ */ React.createElement(Network, { size: 14 }), "Connected words. Lasting knowledge."), /* @__PURE__ */ React.createElement("button", { onClick: () => setOverlay("guide") }, SEED.length, " \u5185\u7F6E\u8BCD\u6761 \xB7 \u53EF\u6269\u5C55\u8BCD\u5E93", /* @__PURE__ */ React.createElement(Info, { size: 13 }))))), overlay === "detail" && wordMap.has(selected) && /* @__PURE__ */ React.createElement(WordDetail, { word: wordMap.get(selected), wordMap, progress, onStatus: updateStatus, onLink: followLink, history, onBack: backWord, onGraph: graphFrom, onClose: closeOverlay, speak, onFilterTopic: (t) => { setTopic(t); setOverlay(null); }, onFilterFunc: (f) => { setFunc(f); setOverlay(null); } }), overlay === "studio" && /* @__PURE__ */ React.createElement(Studio, { words, progress, theme, onImport: importWords, onClose: closeOverlay, notify }), overlay === "guide" && /* @__PURE__ */ React.createElement(Guide, { onClose: closeOverlay, onRecover: backupRaw }), toast && /* @__PURE__ */ React.createElement("div", { className: `toast ${toast.type}`, role: "status" }, toast.type === "error" ? /* @__PURE__ */ React.createElement(AlertCircle, { size: 18 }) : /* @__PURE__ */ React.createElement(CheckCircle2, { size: 18 }), /* @__PURE__ */ React.createElement("span", null, toast.text), /* @__PURE__ */ React.createElement(IconButton, { icon: X, label: "\u5173\u95ED\u63D0\u793A", onClick: () => setToast(null) })));
  }
  class AppErrorBoundary extends React.Component {
    constructor(props) {
      super(props);
      this.state = { error: null };
    }
    static getDerivedStateFromError(error) {
      return { error };
    }
    render() {
      if (this.state.error) return /* @__PURE__ */ React.createElement("main", { className: "fatal-error" }, /* @__PURE__ */ React.createElement("h1", null, "\u9875\u9762\u6682\u65F6\u65E0\u6CD5\u663E\u793A"), /* @__PURE__ */ React.createElement("p", null, "\u672C\u5730\u4FDD\u5B58\u7684\u8BCD\u5E93\u4E0D\u4F1A\u88AB\u81EA\u52A8\u5220\u9664\u3002\u4F60\u53EF\u4EE5\u5237\u65B0\u91CD\u8BD5\uFF0C\u6216\u5148\u4FDD\u5B58\u6062\u590D\u6570\u636E\u3002"), /* @__PURE__ */ React.createElement("button", { className: "btn primary", onClick: () => location.reload() }, "\u5237\u65B0\u9875\u9762"), /* @__PURE__ */ React.createElement("button", { className: "btn secondary", onClick: () => {
        const backup = {};
        for (const [k, v] of Object.entries(KEYS)) {
          try {
            backup[k] = localStorage.getItem(v);
          } catch (e) {
            backup[k] = "unavailable";
          }
        }
        downloadFile("lexicon-recovery.json", JSON.stringify(backup, null, 2));
      } }, "\u5BFC\u51FA\u6062\u590D\u6570\u636E"), /* @__PURE__ */ React.createElement("pre", null, this.state.error.message));
      return this.props.children;
    }
  }
  createRoot(document.getElementById("root")).render(/* @__PURE__ */ React.createElement(AppErrorBoundary, null, /* @__PURE__ */ React.createElement(App, null)));
})();
