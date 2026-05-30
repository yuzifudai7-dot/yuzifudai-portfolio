// Edit this file to update your portfolio projects.
// Keep it dependency-free so it works on any static host.
window.PORTFOLIO_PROJECTS = [
  {
    id: "integrated-humanities-platform",
    title: { en: "Integrated Humanities Learning Platform", zh: "文史哲一体化学习平台" },
    description: {
      en: "A bilingual learning portal connecting literature, philosophy, and history with searchable routes.",
      zh: "一个连接文学、哲学、历史的双语学习门户，强调可检索、可对照、可持续学习。",
    },
    targetUsers: {
      en: "Students, cross-cultural learners, and non-specialist readers",
      zh: "学生、跨文化学习者、非专业读者",
    },
    problem: {
      en: "Most humanities resources are fragmented and repetitive; learners struggle to build a clear map.",
      zh: "文科资料长期碎片化、重复化，学习者很难建立清晰地图。",
    },
    tech: ["HTML", "CSS", "JavaScript", "Vercel"],
    review: {
      en: "Current focus is improving indexing quality, bilingual reading flow, and AI-assisted Q&A.",
      zh: "当前重点是完善索引质量、双语阅读流与站内 AI 问答体验。",
    },
    coverText: { en: "Homepage · Library · Philosophy", zh: "首页 · 文学书架 · 哲学书架" },
    tags: ["Bilingual", "Learning Platform", "Humanities"],
    links: [{ label: { en: "Open Library", zh: "打开书架" }, href: "./library.html" }],
  },
  {
    id: "pku-ancient-lit-notes",
    title: { en: "Ancient Chinese Literature Compendium (2023-10-01)", zh: "古代文学资料汇编（2023-10-01）" },
    description: {
      en: "Core notes for Ancient Chinese Literature, organized into a clear and reusable structure.",
      zh: "古代文学资料汇编：整理为结构化提纲，便于系统阅读与检索。",
    },
    targetUsers: {
      en: "Chinese literature learners preparing for structured review",
      zh: "需要系统复习古代文学的学习者",
    },
    problem: {
      en: "Dense notes are hard to navigate without a layered structure.",
      zh: "高密度资料若无层级结构，阅读与复习效率会显著下降。",
    },
    tech: ["PDF indexing", "Keyword navigation", "Static site"],
    review: {
      en: "Large-scale materials are now organized by period/theme/people and keep being refined.",
      zh: "已按年代/主题/人物组织，后续继续补足检索与导读。",
    },
    coverText: { en: "Compendium · Structured Index", zh: "总纲文献 · 结构索引" },
    tags: ["Notes", "Compendium", "Chinese Literature"],
    links: [
      { label: { en: "PDF", zh: "PDF" }, href: "../assets/docs/pku-ancient-lit-notes-2023-10-01.pdf" },
    ],
  },
  {
    id: "notes-01-pre-qin",
    title: { en: "Notes 01 — Intro + Pre-Qin", zh: "绪论 + 第一编 先秦" },
    description: {
      en: "Intro framework + Pre-Qin literature overview and key points.",
      zh: "绪论框架 + 先秦文学脉络与重点梳理。",
    },
    tags: ["Pre-Qin", "Outline"],
    links: [{ label: { en: "PDF", zh: "PDF" }, href: "../assets/docs/notes-01-pre-qin.pdf" }],
  },
  {
    id: "notes-02-han",
    title: { en: "Notes 02 — Han Dynasty", zh: "第二编 汉代" },
    description: {
      en: "Han literature: authors, genres, and key highlights.",
      zh: "汉代文学：作家、文体与重点梳理。",
    },
    tags: ["Han", "Outline"],
    links: [{ label: { en: "PDF", zh: "PDF" }, href: "../assets/docs/notes-02-han.pdf" }],
  },
  {
    id: "notes-03-wei-jin-nanbei",
    title: { en: "Notes 03 — Wei-Jin & Northern/Southern Dynasties", zh: "第三编 魏晋南北朝" },
    description: {
      en: "From Jian'an to Northern/Southern dynasties: movements, key texts, and thinkers.",
      zh: "从建安到南北朝：思潮、名篇与重要作家梳理。",
    },
    tags: ["Wei-Jin", "Outline"],
    links: [{ label: { en: "PDF", zh: "PDF" }, href: "../assets/docs/notes-03-wei-jin-nanbei.pdf" }],
  },
  {
    id: "notes-04-sui-tang-wudai",
    title: { en: "Notes 04 — Sui-Tang & Five Dynasties", zh: "第四编 隋唐五代" },
    description: {
      en: "Sui-Tang and Five Dynasties literature: poetry, prose, and focused summaries.",
      zh: "隋唐五代文学：诗歌、散文与重点总结。",
    },
    tags: ["Tang", "Outline"],
    links: [{ label: { en: "PDF", zh: "PDF" }, href: "../assets/docs/notes-04-sui-tang-wudai.pdf" }],
  },
  {
    id: "notes-05-song",
    title: { en: "Notes 05 — Song Dynasty", zh: "第五编 宋代" },
    description: {
      en: "Song literature: ci, prose, key authors, and themes.",
      zh: "宋代文学：词、文与重要作家主题梳理。",
    },
    tags: ["Song", "Outline"],
    links: [{ label: { en: "PDF", zh: "PDF" }, href: "../assets/docs/notes-05-song.pdf" }],
  },
  {
    id: "notes-06-yuan",
    title: { en: "Notes 06 — Yuan Dynasty", zh: "第六编 元代" },
    description: {
      en: "Yuan drama and literature: key points and structure.",
      zh: "元代文学与戏曲：重点与框架整理。",
    },
    tags: ["Yuan", "Drama"],
    links: [{ label: { en: "PDF", zh: "PDF" }, href: "../assets/docs/notes-06-yuan.pdf" }],
  },
  {
    id: "notes-07-ming",
    title: { en: "Notes 07 — Ming Dynasty", zh: "第七编 明代" },
    description: {
      en: "Ming literature: major works, genres, and contextual notes.",
      zh: "明代文学：重要作品、文体与重点梳理。",
    },
    tags: ["Ming", "Outline"],
    links: [{ label: { en: "PDF", zh: "PDF" }, href: "../assets/docs/notes-07-ming.pdf" }],
  },
  {
    id: "notes-08-qing",
    title: { en: "Notes 08 — Qing Dynasty", zh: "第八编 清代" },
    description: {
      en: "Qing literature: schools, trends, and key authors.",
      zh: "清代文学：流派思潮与重要作家梳理。",
    },
    tags: ["Qing", "Outline"],
    links: [{ label: { en: "PDF", zh: "PDF" }, href: "../assets/docs/notes-08-qing.pdf" }],
  },
  {
    id: "notes-09-modern",
    title: { en: "Notes 09 — Modern (Late Qing to Modern)", zh: "第九编 近代" },
    description: {
      en: "Modern period overview and key points for review.",
      zh: "近代文学概览与重点梳理。",
    },
    tags: ["Modern", "Outline"],
    links: [{ label: { en: "PDF", zh: "PDF" }, href: "../assets/docs/notes-09-modern.pdf" }],
  },
];
