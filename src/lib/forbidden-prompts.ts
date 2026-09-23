export const FORBIDDEN_PROMPT_MESSAGE = "提示词里包含违规词，无法生成图片。";

const DEFAULT_FORBIDDEN_PROMPT_TERMS = [
  // ── 色情 / 低俗 ──
  "色情",
  "裸露",
  "裸体",
  "裸女",
  "裸男",
  "情色",
  "性爱",
  "性交",
  "做爱",
  "口交",
  "肛交",
  "乱伦",
  "强奸",
  "轮奸",
  "SM",
  "捆绑",
  "调教",
  "淫荡",
  "淫秽",
  "淫乱",
  "荡妇",
  "发骚",
  "勾引",
  "诱惑",
  "挑逗",
  "脱衣",
  "脱光",
  "走光",
  "露点",
  "露胸",
  "露臀",
  "内衣秀",
  "比基尼",
  "丝袜诱惑",
  "制服诱惑",
  "援交",
  "卖淫",
  "嫖娼",
  "妓女",
  "小姐上门",
  "约炮",
  "一夜情",
  "成人视频",
  "成人网站",
  "AV女优",
  "黄片",
  "黄色视频",
  "porn",
  "nude",
  "naked",
  "nsfw",
  "hentai",
  "xxx",
  "erotic",
  "blowjob",
  "handjob",
  "orgasm",
  "penis",
  "vagina",
  "nipple",
  "topless",
  "bottomless",
  "uncensored",
  "loli",
  "shota",

  // ── 未成年人保护 ──
  "未成年人色情",
  "儿童色情",
  "幼女",
  "幼男",
  "恋童",
  "童交",
  "小学生裸",
  "中学生裸",
  "underage",
  "child porn",
  "childporn",
  "pedophilia",
  "csam",

  // ── 暴力 / 血腥 / 恐怖 ──
  "血腥",
  "恐怖主义",
  "斩首",
  "砍头",
  "肢解",
  "分尸",
  "开膛",
  "挖眼",
  "割喉",
  "活剥",
  "虐杀",
  "屠杀",
  "处决",
  "绞刑",
  "枪决",
  "酷刑",
  "虐待",
  "家暴",
  "人体炸弹",
  "恐怖袭击",
  "炸弹制作",
  "制造炸弹",
  "枪支制造",
  "gore",
  "dismember",
  "decapitate",
  "mutilate",
  "torture",
  "beheading",

  // ── 自残 / 自杀 ──
  "自杀",
  "自残",
  "割腕",
  "跳楼",
  "上吊",
  "烧炭自杀",
  "服毒自杀",
  "suicide",
  "self-harm",

  // ── 毒品 / 违禁品 ──
  "毒品",
  "吸毒",
  "贩毒",
  "制毒",
  "冰毒",
  "海洛因",
  "大麻",
  "可卡因",
  "摇头丸",
  "K粉",
  "麻古",
  "鸦片",
  "安非他命",
  "致幻剂",
  "笑气",
  "迷药",
  "迷奸药",
  "春药",

  // ── 赌博 ──
  "赌博",
  "赌场",
  "网赌",
  "赌球",
  "赌马",
  "老虎机",
  "百家乐",
  "六合彩",
  "时时彩",
  "北京赛车",
  "棋牌赌博",

  // ── 诈骗 / 违法 ──
  "诈骗",
  "杀猪盘",
  "传销",
  "洗钱",
  "行贿",
  "受贿",
  "贪污",
  "假币",
  "伪造证件",
  "偷渡",
  "黑客攻击",
  "钓鱼网站",
  "盗号",
  "刷单",

  // ── 歧视 / 仇恨 ──
  "种族歧视",
  "种族灭绝",
  "白人至上",
  "纳粹",
  "希特勒",
  "法西斯",
  "三K党",
  "仇恨犯罪",
  "杀光",
  "灭族",
  "劣等民族",
  "黑鬼",
  "支那",
  "nigger",
  "nazi",
  "swastika",

  // ── 邪教 / 宗教极端 ──
  "邪教",
  "法轮功",
  "全能神",
  "圣战",
  "极端主义",
  "ISIS",
  "基地组织",
  "塔利班",
  "东突",
  "东伊运",
  "jihad",

  // ── 政治敏感 ──
  "天安门事件",
  "六四事件",
  "颜色革命",
  "藏独",
  "疆独",
  "台独",
  "港独",
  "分裂国家",
  "推翻政权",
  "颠覆政权",
  "反华",
  "辱华",
  "反共",

  // ── 侵犯人格 / 名誉 ──
  "人肉搜索",
  "网络暴力",
  "造谣",
  "诽谤",
  "侮辱英烈",
  "亵渎国旗",
  "亵渎国徽",
  "焚烧国旗",
];

function normalizePromptText(value: string) {
  return value.toLowerCase().replace(/\s+/g, "");
}

function getForbiddenPromptTerms() {
  const configuredTerms =
    typeof process !== "undefined"
      ? process.env.NEXT_PUBLIC_FORBIDDEN_PROMPT_TERMS || process.env.FORBIDDEN_PROMPT_TERMS
      : undefined;

  const extraTerms =
    configuredTerms
      ?.split(",")
      .map((term) => term.trim())
      .filter(Boolean) || [];

  return [...DEFAULT_FORBIDDEN_PROMPT_TERMS, ...extraTerms];
}

export function containsForbiddenPromptTerm(prompt: string) {
  const normalizedPrompt = normalizePromptText(prompt);
  return getForbiddenPromptTerms().some((term) =>
    normalizedPrompt.includes(normalizePromptText(term))
  );
}
