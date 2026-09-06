import { encryptJsonPayload } from "./src/aes-gcm.ts";

var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });

// worker.js
var JSON_HEADERS = {
  "Content-Type": "application/json; charset=utf-8",
  "Cache-Control": "no-store"
};
var json = /* @__PURE__ */ __name((body, status = 200) => new Response(JSON.stringify(body), { status, headers: JSON_HEADERS }), "json");
function isBusinessError(payload) {
  if (!payload || typeof payload !== "object") return false;
  if (payload.ok === false || payload.success === false) return true;
  if (typeof payload.code === "number" && payload.code !== 0) return true;
  if (typeof payload.status === "number" && payload.status !== 0) return true;
  return false;
}
__name(isBusinessError, "isBusinessError");
async function maybeEncryptJsonResponse(request, response) {
  const url = new URL(request.url);
  if (url.searchParams.get("encrypted") !== "1" || request.method !== "GET" || !response.ok) return response;
  const contentType = response.headers.get("content-type") || "";
  if (!contentType.includes("application/json")) return response;
  try {
    const payload = JSON.parse(await response.clone().text());
    if (isBusinessError(payload)) return response;
    const encrypted = await encryptJsonPayload(payload);
    return new Response(JSON.stringify(encrypted), {
      status: response.status,
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Cache-Control": "no-store",
        "X-Content-Type-Options": "nosniff"
      }
    });
  } catch (error) {
    console.error(JSON.stringify({ event: "response_encryption_failed", path: url.pathname, error: String(error?.stack || error) }));
    return json({ message: "数据加载失败" }, 500);
  }
}
__name(maybeEncryptJsonResponse, "maybeEncryptJsonResponse");
function safeScriptJson(value) {
  return JSON.stringify(value).replace(/</g, "\\u003c").replace(/>/g, "\\u003e").replace(/&/g, "\\u0026");
}
__name(safeScriptJson, "safeScriptJson");
async function encryptedHtmlShell(html) {
  const titleMatch = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  const title = (titleMatch?.[1] || "").replace(/<[^>]*>/g, "").trim();
  const pageEnvelope = await encryptJsonPayload({ html });
  const titleEnvelope = await encryptJsonPayload(title);
  return `<!doctype html><html lang="zh-CN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title></title><style>html,body{height:100%;margin:0;background:#050505}.loading-shell{height:100%;display:grid;place-items:center}.loading-spinner{width:42px;height:42px;border:4px solid rgba(218,174,75,.2);border-top-color:#daae4b;border-radius:50%;animation:spin .8s linear infinite}@keyframes spin{to{transform:rotate(360deg)}}.decrypt-error{min-height:100%;display:grid;place-items:center;color:#eed078;font:600 18px/1.6 system-ui;background:#050505;padding:24px;text-align:center}</style></head><body><div class="loading-shell" aria-label="loading"><span class="loading-spinner"></span></div><script id="encrypted-page" type="application/json">${safeScriptJson(pageEnvelope)}</script><script id="encrypted-title" type="application/json">${safeScriptJson(titleEnvelope)}</script><script src="/app-loader.js" defer></script></body></html>`;
}
__name(encryptedHtmlShell, "encryptedHtmlShell");
function isAdmin(request, env) {
  const provided = request.headers.get("X-Admin-Token") || "";
  return Boolean(env.ADMIN_TOKEN && provided === env.ADMIN_TOKEN);
}
__name(isAdmin, "isAdmin");
function adminAuth(request, env) {
  if (request.method !== "POST") return json({ ok: false, message: "\u4E0D\u652F\u6301\u7684\u8BF7\u6C42\u65B9\u5F0F" }, 405);
  return isAdmin(request, env) ? json({ ok: true }) : json({ ok: false, message: "\u540E\u53F0\u5BC6\u7801\u9519\u8BEF" }, 401);
}
__name(adminAuth, "adminAuth");
async function proxyDraw(request) {
  const url = new URL(request.url);
  const lottery = Number(url.searchParams.get("lottery") || 5);
  if (![5, 6, 11].includes(lottery)) {
    return json({ code: 1, message: "\u4E0D\u652F\u6301\u7684\u5F69\u79CD" }, 400);
  }
  try {
    const response = await fetch(
      `https://fkzyapi.niksuhfds.com/api/index/lastLotteryRecord/${lottery}?t=${Date.now()}`,
      { method: "POST", headers: { Accept: "application/json", "Cache-Control": "no-cache" }, cache: "no-store" }
    );
    if (!response.ok) throw new Error("upstream");
    return new Response(await response.text(), { headers: JSON_HEADERS });
  } catch (_) {
    return json({ code: 1, message: "\u5F00\u5956\u63A5\u53E3\u6682\u65F6\u4E0D\u53EF\u7528" }, 502);
  }
}
__name(proxyDraw, "proxyDraw");
async function proxyLive(request) {
  const url = new URL(request.url);
  const lottery = Number(url.searchParams.get("lottery") || 5);
  if (![1, 5, 8].includes(lottery)) {
    return json({ code: 1, message: "\u4E0D\u652F\u6301\u7684\u5F69\u79CD" }, 400);
  }
  try {
    const response = await fetch(
      `https://6htv70.com/gallerynew/h5/index/lastLotteryRecord?lotteryType=${lottery}&t=${Date.now()}`,
      { headers: { Accept: "application/json", "Cache-Control": "no-cache" }, cache: "no-store" }
    );
    if (!response.ok) throw new Error("upstream");
    const payload = await response.json();
    if (!payload?.data) throw new Error("invalid payload");
    return json({
      code: 0,
      data: payload.data,
      serverTime: payload.serverTime || Date.now(),
      message: payload.msg || payload.subMsg || "\u64CD\u4F5C\u6210\u529F"
    });
  } catch (_) {
    return json({ code: 1, message: "\u5F00\u5956\u76F4\u64AD\u63A5\u53E3\u6682\u65F6\u4E0D\u53EF\u7528" }, 502);
  }
}
__name(proxyLive, "proxyLive");
async function proxyWuqi(request) {
  const url = new URL(request.url);
  const type = url.searchParams.get("type") || "xam";
  if (!["xg", "xam", "tt"].includes(type)) {
    return json({ status: 1, info: "\u4E0D\u652F\u6301\u7684\u5F69\u79CD" }, 400);
  }
  const page = Math.max(1, Number(url.searchParams.get("page")) || 1);
  const limit = Math.min(500, Math.max(15, Number(url.searchParams.get("limit")) || 500));
  try {
    const response = await fetch("https://lhw.235-from.com/index/wuqiapi/getwuqibizhong", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ type, page: String(page), limit: String(limit) })
    });
    if (!response.ok) throw new Error("upstream");
    return new Response(await response.text(), { headers: JSON_HEADERS });
  } catch (_) {
    return json({ status: 1, info: "\u4E94\u671F\u5FC5\u4E2D\u63A5\u53E3\u6682\u65F6\u4E0D\u53EF\u7528" }, 502);
  }
}
__name(proxyWuqi, "proxyWuqi");
async function proxyHistory(request) {
  const url = new URL(request.url);
  const type = url.searchParams.get("type") || "xam";
  const page = Math.max(1, Math.min(100, Number(url.searchParams.get("page")) || 1));
  const year = Math.max(2e3, Math.min(2100, Number(url.searchParams.get("year")) || (/* @__PURE__ */ new Date()).getUTCFullYear()));
  if (!["xam", "xg", "fktt"].includes(type)) return json({ status: 1, info: "\u4E0D\u652F\u6301\u7684\u5F69\u79CD" }, 400);
  try {
    const response = await fetch("https://lhw.235-from.com/index/index/getkjls", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ type, page: String(page), year: String(year), sort: "1" })
    });
    if (!response.ok) throw new Error("upstream");
    const body = await response.text();
    JSON.parse(body);
    return new Response(body, { headers: JSON_HEADERS });
  } catch (_) {
    return json({ status: 1, info: "\u5386\u53F2\u5F00\u5956\u63A5\u53E3\u6682\u65F6\u4E0D\u53EF\u7528" }, 502);
  }
}
__name(proxyHistory, "proxyHistory");
var AUTO_SECTIONS = ["five", "four", "tail", "fourZodiac", "strategy", "wave", "kill", "poem", "ten"];
var ZODIACS = ["\u9F20", "\u725B", "\u864E", "\u5154", "\u9F99", "\u86C7", "\u9A6C", "\u7F8A", "\u7334", "\u9E21", "\u72D7", "\u732A"];
var WAVES = ["\u7EA2\u6CE2", "\u84DD\u6CE2", "\u7EFF\u6CE2"];
var COLOR_WAVE = { 1: "\u7EA2\u6CE2", 2: "\u84DD\u6CE2", 3: "\u7EFF\u6CE2" };
var LOTTERY_CONFIG = {
  "\u6FB3\u95E8": { historyType: "xam", liveId: 5, code: "am" },
  "\u9999\u6E2F": { historyType: "xg", liveId: 6, code: "hk" },
  "\u75AF\u72C2\u5929\u5929\u5F69": { historyType: "fktt", liveId: 11, code: "tt" }
};
var padNumber = /* @__PURE__ */ __name((value) => String(value).padStart(2, "0"), "padNumber");
var extractNumbers = /* @__PURE__ */ __name((value) => (String(value).match(/\d+/g) || []).map(Number), "extractNumbers");
var extractZodiacs = /* @__PURE__ */ __name((value) => String(value).match(/[鼠牛虎兔龙蛇马羊猴鸡狗猪]/g) || [], "extractZodiacs");
function ensembleRank(values, universe) {
  const recent = values.slice(0, 15), maxRecent = Math.max(1, ...universe.map((value) => recent.filter((item) => item === value).length));
  const maxBase = Math.max(1, ...universe.map((value) => values.filter((item) => item === value).length));
  return universe.map((value) => {
    const recentWeighted = recent.reduce((sum, item, index) => sum + (item === value ? Math.exp(-index / 7) : 0), 0);
    const recentMax = recent.reduce((sum, _item, index) => sum + Math.exp(-index / 7), 0);
    const base = values.filter((item) => item === value).length / maxBase;
    const positions = values.map((item, index) => item === value ? index : -1).filter((index) => index >= 0);
    const gap = positions.length ? positions[0] : values.length;
    const averageGap = positions.length > 1 ? positions.slice(1).reduce((sum, position, index) => sum + position - positions[index], 0) / (positions.length - 1) : Math.max(1, values.length / universe.length);
    const overdue = Math.min(2, gap / Math.max(1, averageGap)) / 2;
    let transition = 0;
    for (let index = 1; index < values.length; index += 1) if (values[index] === values[0] && values[index - 1] === value) transition += 1;
    const score = 0.45 * (recentWeighted / Math.max(1, recentMax / maxRecent)) + 0.25 * base + 0.2 * overdue + 0.1 * Math.min(1, transition);
    return { value, score };
  }).sort((a, b) => b.score - a.score || String(a.value).localeCompare(String(b.value)));
}
__name(ensembleRank, "ensembleRank");
function diversifyNumbers(ranking, count) {
  const chosen = [], heads = /* @__PURE__ */ new Map(), parity = [0, 0];
  for (const { value } of ranking) {
    const head = Math.floor(value / 10), kind = value % 2;
    if ((heads.get(head) || 0) >= 3 || parity[kind] >= Math.ceil(count / 2) && chosen.length < count - 1) continue;
    chosen.push(value);
    heads.set(head, (heads.get(head) || 0) + 1);
    parity[kind] += 1;
    if (chosen.length === count) break;
  }
  for (const { value } of ranking) if (chosen.length < count && !chosen.includes(value)) chosen.push(value);
  return chosen.slice(0, count);
}
__name(diversifyNumbers, "diversifyNumbers");
function buildPredictions(history, nextIssue, lottery = "\u6FB3\u95E8") {
  const specials = history.map((row) => row.numberList?.slice(0, 7).at(-1)).filter(Boolean);
  const numberRank = ensembleRank(specials.map((item) => Number(item.number)), Array.from({ length: 49 }, (_, index) => index + 1));
  const drawRank = ensembleRank(history.flatMap((row) => (row.numberList || []).slice(0, 7).map((item) => Number(item.number))), Array.from({ length: 49 }, (_, index) => index + 1));
  const zodiacRank = ensembleRank(specials.map((item) => item.shengXiao), ZODIACS);
  const waveRank = ensembleRank(specials.map((item) => COLOR_WAVE[item.color]), WAVES);
  const tailRank = ensembleRank(specials.map((item) => Number(item.number) % 10), Array.from({ length: 10 }, (_, index) => index));
  const headRank = ensembleRank(specials.map((item) => Math.floor(Number(item.number) / 10)), [0, 1, 2, 3, 4]);
  const numbers = diversifyNumbers(numberRank, 24), drawNumbers = diversifyNumbers(drawRank, 4), zodiacs = zodiacRank.map((item) => item.value), waves = waveRank.map((item) => item.value);
  const wildZodiacs = zodiacs.filter((zodiac) => ["\u9F20", "\u864E", "\u5154", "\u9F99", "\u86C7", "\u7334"].includes(zodiac)).slice(0, 2);
  const topHeads = headRank.slice(0, 3).map((item) => item.value);
  const hotHead = headRank.find((item) => item.value > 0)?.value || 1, headStart = hotHead * 10, headEnd = Math.min(49, hotHead * 10 + 9), headNumbers = Array.from({ length: headEnd - headStart + 1 }, (_, index) => headStart + index);
  const lowZodiac = zodiacs.at(-1), lowWave = waves.at(-1), lowTail = tailRank.at(-1).value, lowHead = headRank.at(-1).value;
  const format = /* @__PURE__ */ __name((items) => items.map(padNumber).join(" "), "format"), topSix = zodiacs.slice(0, 6);
  const issueText = String(nextIssue), issueYear = issueText.slice(0, 4), issuePeriod = Number(issueText.slice(4));
  const weeklyStart = issuePeriod - ((issuePeriod - 222) % 7 + 7) % 7, weeklyEnd = weeklyStart + 6;
  const weeklyIssue = `${issueYear}${String(weeklyStart).padStart(3, "0")}-${issueYear}${String(weeklyEnd).padStart(3, "0")}`;
  const headStartPeriod = issuePeriod - ((issuePeriod - 225) % 5 + 5) % 5, headEndPeriod = headStartPeriod + 4;
  const headIssue = `${issueYear}${String(headStartPeriod).padStart(3, "0")}-${issueYear}${String(headEndPeriod).padStart(3, "0")}`;
  const records = [
    ["five", `${lottery}\u9A6C\u4F1A\u3010\u672C\u5468\u516B\u7801\u3011`, format(numbers.slice(0, 8))],
    ["four", `${lottery}\u9A6C\u4F1A\u3010\u5FC5\u5F00\u7279\u5934\u3011`, format(headNumbers)],
    ["tail", `${lottery}\u9A6C\u4F1A\u3010\u5BB6\u91CE\u51FA\u7279\u3011`, `\u5BB6\u79BD+${wildZodiacs.join("")}`],
    ["fourZodiac", "\u5929\u6709\u6674 \u96E8\u4F1A\u505C\uFF0C\u60A8\u8DDF\u8E2A \u5FC5\u5B9A\u8D62", `\u2467\u7801:${format(numbers.slice(0, 8))}|\u2462\u8096:${zodiacs.slice(0, 3).join("")}|\u2464\u8096:${zodiacs.slice(0, 5).join("")}|\u2466\u8096:${zodiacs.slice(0, 7).join("")}|\u2468\u8096:${zodiacs.slice(0, 9).join("")}`],
    ["strategy", `${lottery}\u9A6C\u4F1A\u3010\u4E09\u5934\u7206\u7279\u3011`, topHeads.map((head) => `${head}\u5934`).join(" ")],
    ["wave", "\u5FC5\u4E2D\u6CE2\u8272\xB7\u8D8B\u52BF\u5206\u6790", waves.slice(0, 2).join(" ")],
    ["kill", "\u7EDD\u6740\u4E13\u533A\xB7\u8D8B\u52BF\u5206\u6790", `\u6740\u8096${lowZodiac} \u6740\u5934${lowHead} \u6740\u6CE2${lowWave} \u6740\u5C3E${lowTail}`],
    ["poem", "\u5FC5\u4E2D\u7279\u7801\u8BD7\xB7\u8D8B\u52BF\u5206\u6790", `${topSix[0]}\u8DC3\u6625\u98CE${topSix[1]}\u5B88\u95E8\uFF0C${topSix[2]}\u817E${topSix[3]}\u821E\u4F34${topSix[4]}\u8FCE${topSix[5]} | ${topSix.join(" ")}`],
    ["ten", "\u8D85\u51C610\u7801\xB7\u8D8B\u52BF\u5206\u6790", format(numbers.slice(0, 10))]
  ];
  const code = LOTTERY_CONFIG[lottery]?.code || "am";
  return records.filter(([section]) => !(lottery === "\u9999\u6E2F" && section === "five")).map(([section, category, content]) => ({ id: `auto-${code}-${section}-${nextIssue}`, section, issue: section === "five" ? weeklyIssue : section === "four" ? headIssue : nextIssue, author: "\u7CFB\u7EDF\u8D8B\u52BF\u5206\u6790", category, content, result: "", status: "pending", lottery }));
}
__name(buildPredictions, "buildPredictions");
var EXPERT_AUTHORS = {
  "\u9999\u6E2F": ["\u53F6\u5B64\u57CE", "\u695A\u7559\u9999", "\u80E1\u94C1\u82B1", "\u59EC\u51B0\u96C1", "\u5085\u7EA2\u96EA", "\u53F6\u5F00", "\u674E\u5BFB\u6B22", "\u963F\u98DE", "\u4E0A\u5B98\u91D1\u8679", "\u8346\u65E0\u547D", "\u71D5\u5357\u5929", "\u6C5F\u5C0F\u9C7C", "\u82B1\u65E0\u7F3A", "\u9080\u6708\u5BAB\u4E3B", "\u601C\u661F\u5BAB\u4E3B", "\u94C1\u5FC3\u5170", "\u82CF\u6A31", "\u71D5\u5341\u4E09", "\u8C22\u6653\u5CF0", "\u6155\u5BB9\u79CB\u837B", "\u94C1\u4E2D\u68E0", "\u4E91\u94EE", "\u6C34\u7075\u5149", "\u6731\u85FB", "\u6C88\u6D6A", "\u738B\u601C\u82B1", "\u718A\u732B\u513F", "\u767D\u98DE\u98DE", "\u9646\u5C0F\u51E4", "\u82B1\u6EE1\u697C", "\u897F\u95E8\u5439\u96EA", "\u53F8\u7A7A\u6458\u661F", "\u6728\u9053\u4EBA", "\u5BAB\u4E5D", "\u6C99\u66FC", "\u859B\u51B0", "\u5B5F\u661F\u9B42", "\u9AD8\u6E10\u98DE", "\u5B59\u7389\u4F2F", "\u5F8B\u9999\u5DDD", "\u8427\u5341\u4E00\u90CE", "\u98CE\u56DB\u5A18", "\u8FDE\u57CE\u74A7", "\u6C88\u74A7\u541B", "\u4E01\u9E4F", "\u9752\u9752", "\u5353\u4E1C\u6765", "\u53F8\u9A6C\u8D85\u7FA4", "\u6731\u731B", "\u90ED\u5927\u8DEF", "\u738B\u52A8", "\u6797\u592A\u5E73"],
  "\u75AF\u72C2\u5929\u5929\u5F69": ["\u4EE4\u72D0\u51B2", "\u4EFB\u6211\u884C", "\u5411\u95EE\u5929", "\u98CE\u6E05\u626C", "\u5CB3\u4E0D\u7FA4", "\u5B81\u4E2D\u5219", "\u6797\u5E73\u4E4B", "\u66F2\u6D0B", "\u5218\u6B63\u98CE", "\u84DD\u51E4\u51F0", "\u7530\u4F2F\u5149", "\u5E73\u4E00\u6307", "\u8881\u627F\u5FD7", "\u590F\u96EA\u5B9C", "\u6E29\u9752\u9752", "\u4F55\u94C1\u624B", "\u5F52\u8F9B\u6811", "\u7A46\u4EBA\u6E05", "\u9648\u5BB6\u6D1B", "\u970D\u9752\u6850", "\u9999\u9999\u516C\u4E3B", "\u6587\u6CF0\u6765", "\u4F59\u9C7C\u540C", "\u8D75\u534A\u5C71", "\u82D7\u4EBA\u51E4", "\u80E1\u6590", "\u7A0B\u7075\u7D20", "\u8881\u7D2B\u8863", "\u80E1\u4E00\u5200", "\u77F3\u7834\u5929", "\u767D\u81EA\u5728", "\u8C22\u70DF\u5BA2", "\u4E01\u4E0D\u4E09", "\u4E01\u4E0D\u56DB", "\u8D1D\u6D77\u77F3", "\u9F99\u6728\u5C9B\u4E3B", "\u72C4\u4E91", "\u6C34\u7B19", "\u8840\u5200\u8001\u7956", "\u4E01\u5178", "\u51CC\u971C\u534E", "\u9648\u8FD1\u5357", "\u97E6\u5C0F\u5B9D", "\u53CC\u513F", "\u82CF\u8343", "\u4E5D\u96BE\u5E08\u592A", "\u6D2A\u5B89\u901A", "\u9CCC\u62DC", "\u9676\u7EA2\u82F1", "\u5434\u516D\u5947", "\u80E1\u9038\u4E4B", "\u5F52\u4E8C\u5A18"]
};
var EXPERT_CATEGORIES = ["\u4E5D\u8096\u516B\u7801", "\u516B\u8096\u4E2D\u7279", "30\u7801\u4E2D\u7279", "36\u7801\u4E2D\u7279", "\u4E5D\u7801\u51FA\u7279", "\u516D\u8096\u247F\u7801", "\u7A33\u4E2D\u516B\u8096", "\u7CBE\u51C6\u4E03\u8096", "\u4E2D\u7279\u516D\u5C3E", "\u7CBE\u51C6\u56DB\u5934", "\u4E24\u6CE2\u4E2D\u7279", "\u4E24\u4E2A\u534A\u6CE2", "\u5FC5\u4E2D\u5355\u53CC", "\u5927\u5C0F\u4E2D\u7279", "\u5BB6\u91CE\u516D\u8096", "\u7F8E\u4E11\u751F\u8096", "\u5403\u8349\u83DC\u8089", "\u6625\u590F\u79CB\u51AC", "18\u7801\u4E2D\u7279", "\u7ECF\u517824\u7801"];
function buildExpertPredictions(history, nextIssue, lottery) {
  const authors = EXPERT_AUTHORS[lottery] || [], specials = history.map((row) => row.numberList?.slice(0, 7).at(-1)).filter(Boolean);
  const rankedNumbers = ensembleRank(specials.map((item) => Number(item.number)), Array.from({ length: 49 }, (_, index) => index + 1)).map((item) => item.value);
  const rankedZodiacs = ensembleRank(specials.map((item) => item.shengXiao), ZODIACS).map((item) => item.value);
  const rankedWaves = ensembleRank(specials.map((item) => COLOR_WAVE[item.color]), WAVES).map((item) => item.value);
  const rotate = /* @__PURE__ */ __name((values, offset) => [...values.slice(offset % values.length), ...values.slice(0, offset % values.length)], "rotate");
  return authors.map((author, index) => {
    const category = EXPERT_CATEGORIES[index % EXPERT_CATEGORIES.length], nums = rotate(rankedNumbers, index), zodiacs = rotate(rankedZodiacs, index), waves = rotate(rankedWaves, index);
    let content;
    if (category.includes("36\u7801")) content = nums.slice(0, 36).map(padNumber).join(" ");
    else if (category.includes("30\u7801")) content = nums.slice(0, 30).map(padNumber).join(" ");
    else if (category.includes("24\u7801")) content = nums.slice(0, 24).map(padNumber).join(" ");
    else if (category.includes("18\u7801")) content = nums.slice(0, 18).map(padNumber).join(" ");
    else if (category.includes("\u4E5D\u7801")) content = nums.slice(0, 9).map(padNumber).join(" ");
    else if (category.includes("\u516B\u7801") && category.includes("\u8096")) content = `\u4E5D\u8096\u3010${zodiacs.slice(0, 9).join(" ")}\u3011 \u516B\u7801\u3010${nums.slice(0, 8).map(padNumber).join(" ")}\u3011`;
    else if (category.includes("\u516D\u8096") && category.includes("\u7801")) content = `\u516D\u8096\u3010${zodiacs.slice(0, 6).join(" ")}\u3011 12\u7801\u3010${nums.slice(0, 12).map(padNumber).join(" ")}\u3011`;
    else if (category.includes("\u4E5D\u8096")) content = zodiacs.slice(0, 9).join(" ");
    else if (category.includes("\u516B\u8096")) content = zodiacs.slice(0, 8).join(" ");
    else if (category.includes("\u4E03\u8096")) content = zodiacs.slice(0, 7).join(" ");
    else if (category.includes("\u516D\u5C3E")) content = rotate([0, 1, 2, 3, 4, 5, 6, 7, 8, 9], index).slice(0, 6).map((value) => `${value}\u5C3E`).join(" ");
    else if (category.includes("\u56DB\u5934")) content = rotate([0, 1, 2, 3, 4], index).slice(0, 4).map((value) => `${value}\u5934`).join(" ");
    else if (category.includes("\u6CE2")) content = waves.slice(0, 2).join(" ");
    else if (category.includes("\u5355\u53CC")) content = index % 2 ? "\u53CC\u6570" : "\u5355\u6570";
    else if (category.includes("\u5927\u5C0F")) content = index % 2 ? "\u5927\u6570" : "\u5C0F\u6570";
    else if (category.includes("\u5BB6\u91CE")) content = "\u5BB6\u79BD\u3010\u725B \u9A6C \u7F8A \u9E21 \u72D7 \u732A\u3011";
    else if (category.includes("\u7F8E\u4E11")) content = "\u7F8E\u8096\u3010\u5154 \u9F99 \u86C7 \u9A6C \u7F8A \u9E21\u3011";
    else if (category.includes("\u5403\u8349")) content = "\u5403\u8349\u3010\u725B \u5154 \u9A6C \u7F8A\u3011 \u5403\u8089\u3010\u864E \u86C7 \u72D7\u3011";
    else if (category.includes("\u6625\u590F\u79CB\u51AC")) content = index % 2 ? "\u6625\u8096\u3010\u864E \u5154 \u9F99\u3011 \u590F\u8096\u3010\u86C7 \u9A6C \u7F8A\u3011" : "\u79CB\u8096\u3010\u7334 \u9E21 \u72D7\u3011 \u51AC\u8096\u3010\u732A \u9F20 \u725B\u3011";
    else content = zodiacs.slice(0, 8).join(" ");
    return { id: `expert-auto-${LOTTERY_CONFIG[lottery].code}-${nextIssue}-${index}`, section: "expert", issue: nextIssue, author, category, content, result: "", status: "pending", lottery };
  });
}
__name(buildExpertPredictions, "buildExpertPredictions");
var CHINESE_DIGITS = ["\u96F6", "\u4E00", "\u4E8C", "\u4E09", "\u56DB", "\u4E94", "\u516D", "\u4E03"];
function settleWeeklyPrediction(record, history) {
  const match = String(record.issue).match(/^(\d{4})(\d+)-(\d{4})(\d+)$/);
  if (!match) return { result: "", status: "pending" };
  const start = Number(match[2]), end = Number(match[4]), numbers = extractNumbers(record.content);
  const draws = history.filter((draw) => {
    const period = Number(String(draw.issueNo).slice(4));
    return period >= start && period <= end && (draw.numberList || []).length >= 7;
  });
  const hitNumbers = draws.map((draw) => Number(draw.numberList.slice(0, 7).at(-1).number)).filter((number) => numbers.includes(number)), hits = hitNumbers.length;
  const latestPeriod = Math.max(0, ...history.map((draw) => Number(String(draw.issueNo).slice(4))));
  const resultLabel = record.section === "four" ? "\u4E2D" : "\u51C6";
  return { result: `${resultLabel}${CHINESE_DIGITS[hits] || hits}\u671F${hitNumbers.length ? `|${[...new Set(hitNumbers)].map(padNumber).join(" ")}` : ""}`, status: latestPeriod >= end ? hits >= 2 ? "hit" : "miss" : "pending" };
}
__name(settleWeeklyPrediction, "settleWeeklyPrediction");
function settlePrediction(record, draw) {
  const drawNumbers = (draw.numberList || []).slice(0, 7), special = drawNumbers.at(-1);
  const number = Number(special.number), zodiac = special.shengXiao, wave = COLOR_WAVE[special.color] || "";
  const numbers = extractNumbers(record.content), zodiacs = extractZodiacs(record.content);
  let hit = false;
  if (record.section === "expert") {
    const category = String(record.category || ""), isKill = /杀/.test(category);
    let matched;
    if (/尾/.test(category)) matched = numbers.includes(number % 10);
    else if (/头/.test(category)) matched = numbers.includes(Math.floor(number / 10));
    else if (/波/.test(category)) matched = (record.content.match(/[红蓝绿]波/g) || []).includes(wave);
    else if (/单双/.test(category)) matched = record.content.includes(number % 2 ? "\u5355" : "\u53CC");
    else if (/大小/.test(category)) matched = record.content.includes(number >= 25 ? "\u5927" : "\u5C0F");
    else if (zodiacs.length) matched = zodiacs.includes(zodiac);
    else matched = numbers.includes(number);
    hit = isKill ? !matched : matched;
  } else if (record.section === "five") hit = numbers.includes(number);
  else if (record.section === "four") hit = numbers.some((value) => drawNumbers.some((item) => Number(item.number) === value));
  else if (record.section === "strategy") hit = numbers.includes(Math.floor(number / 10));
  else if (record.section === "ten") hit = numbers.includes(number);
  else if (record.section === "tail") {
    const picks = new Set(extractZodiacs(record.content));
    if (record.content.includes("\u5BB6\u79BD")) ["\u725B", "\u9A6C", "\u7F8A", "\u9E21", "\u72D7", "\u732A"].forEach((item) => picks.add(item));
    if (record.content.includes("\u91CE\u517D")) ["\u9F20", "\u864E", "\u5154", "\u9F99", "\u86C7", "\u7334"].forEach((item) => picks.add(item));
    hit = picks.has(zodiac);
  } else if (["fourZodiac", "poem"].includes(record.section)) hit = zodiacs.includes(zodiac);
  else if (record.section === "wave") hit = (record.content.match(/[红蓝绿]波/g) || []).includes(wave);
  else if (record.section === "kill") hit = !(record.content.includes(`\u6740\u8096${zodiac}`) || record.content.includes(`\u6740\u5934${Math.floor(number / 10)}`) || record.content.includes(`\u6740\u6CE2${wave}`) || record.content.includes(`\u6740\u5C3E${number % 10}`));
  const drawHits = record.section === "four" ? numbers.filter((value) => drawNumbers.some((item) => Number(item.number) === value)) : [];
  const result = record.section === "four" ? `\u5F00\uFF1A${drawHits.length ? drawHits.map(padNumber).join(" ") : "00"}` : record.section === "tail" ? `\u5F00${zodiac}${padNumber(number)}${hit ? "\u51C6" : "\u9519"}` : record.section === "strategy" ? `\u5F00${Math.floor(number / 10)}\u5934${hit ? "\u51C6" : "\u9519"}` : record.section === "fourZodiac" ? `${padNumber(number)} ${zodiac}` : record.section === "poem" ? zodiac : record.section === "wave" ? `${padNumber(number)} ${wave}` : record.section === "kill" ? `${padNumber(number)} ${zodiac} ${wave}` : `${padNumber(number)} ${zodiac}`;
  return { result, status: hit ? "hit" : "miss" };
}
__name(settlePrediction, "settlePrediction");
function recordCoversIssue(recordIssue, drawIssue) {
  const drawText = String(drawIssue), drawPeriod = Number(drawText.slice(-3)), text = String(recordIssue || "");
  if (text === drawText || text.replace(/期/g, "") === drawText) return true;
  const values = (text.match(/\d+/g) || []).map((value) => Number(String(value).slice(-3)));
  return values.length >= 2 && drawPeriod >= Math.min(values[0], values[1]) && drawPeriod <= Math.max(values[0], values[1]);
}
__name(recordCoversIssue, "recordCoversIssue");
async function autoUpdateContent(env, lotteryName) {
  if (!env.DB) return { ok: false, message: "D1\u672A\u914D\u7F6E" };
  if (!lotteryName) {
    const lotteries = [];
    for (const name of Object.keys(LOTTERY_CONFIG)) lotteries.push(await autoUpdateContent(env, name));
    const updatedAt2 = (/* @__PURE__ */ new Date()).toISOString();
    await env.DB.prepare("INSERT INTO app_meta (key, value) VALUES ('updatedAt', ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value").bind(updatedAt2).run();
    return { ok: lotteries.every((item) => item.ok), lotteries, latestIssue: lotteries[0]?.latestIssue, nextIssue: lotteries[0]?.nextIssue };
  }
  const config = LOTTERY_CONFIG[lotteryName];
  if (!config) return { ok: false, message: "\u4E0D\u652F\u6301\u7684\u5F69\u79CD" };
  const timestamp = Date.now();
  const [historyResponse, olderResponse, liveResponse] = await Promise.all([
    fetch(`https://lhw.235-from.com/index/index/getkjls?t=${timestamp}`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded", "Cache-Control": "no-cache" },
      body: new URLSearchParams({ type: config.historyType, page: "1", year: String((/* @__PURE__ */ new Date()).getUTCFullYear()), sort: "1" })
    }),
    fetch(`https://lhw.235-from.com/index/index/getkjls?t=${timestamp + 1}`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded", "Cache-Control": "no-cache" },
      body: new URLSearchParams({ type: config.historyType, page: "2", year: String((/* @__PURE__ */ new Date()).getUTCFullYear()), sort: "1" })
    }),
    fetch(`https://fkzyapi.niksuhfds.com/api/index/lastLotteryRecord/${config.liveId}?t=${timestamp}`, { method: "POST", headers: { Accept: "application/json", "Cache-Control": "no-cache" } })
  ]);
  if (!historyResponse.ok) throw new Error("history upstream");
  const payload = await historyResponse.json(), olderPayload = olderResponse.ok ? await olderResponse.json() : null, livePayload = liveResponse.ok ? await liveResponse.json() : null;
  let history = [...Array.isArray(payload?.data?.list) ? payload.data.list : [], ...Array.isArray(olderPayload?.data?.list) ? olderPayload.data.list : []];
  const live = livePayload?.data;
  if (live?.issueNo && (live.numberList || []).length >= 7) history.push(live);
  history = [...new Map(history.map((row) => [String(row.issueNo), row])).values()].sort((a, b) => Number(b.issueNo) - Number(a.issueNo));
  if (!Array.isArray(history) || !history.length || (history[0].numberList || []).length < 7) return { ok: false, message: "\u6700\u65B0\u4E00\u671F\u5C1A\u672A\u5F00\u5956\u5B8C\u6210" };
  const latest = history[0], nextIssue = String(Number(latest.issueNo) + 1);
  const { results: rows } = await env.DB.prepare("SELECT id, section, issue, author, category, content, result, status FROM content_records WHERE lottery = ?").bind(lotteryName).all();
  const existingRows = new Map((rows || []).map((row) => [`${row.section}:${row.issue}`, row])), existing = new Set(existingRows.keys()), statements = [];
  for (const record of (rows || []).filter((row) => ["five", "four"].includes(row.section) && String(row.issue).includes("-"))) {
    const settled = settleWeeklyPrediction(record, history);
    statements.push(env.DB.prepare("UPDATE content_records SET result = ?, status = ? WHERE id = ?").bind(settled.result, settled.status, record.id));
  }
  for (const record of (rows || []).filter((row) => !(["five", "four"].includes(row.section) && String(row.issue).includes("-")) && recordCoversIssue(row.issue, latest.issueNo))) {
    const settled = settlePrediction(record, latest);
    statements.push(env.DB.prepare("UPDATE content_records SET result = ?, status = ? WHERE id = ?").bind(settled.result, settled.status, record.id));
  }
  const drawByIssue = new Map(history.map((draw) => [String(draw.issueNo), draw]));
  for (const record of (rows || []).filter((row) => !(["five", "four"].includes(row.section) && String(row.issue).includes("-")) && history.some((draw) => recordCoversIssue(row.issue, draw.issueNo)))) {
    const targetDraw = history.find((draw) => recordCoversIssue(record.issue, draw.issueNo));
    const settled = settlePrediction(record, targetDraw);
    statements.push(env.DB.prepare("UPDATE content_records SET result = ?, status = ? WHERE id = ?").bind(settled.result, settled.status, record.id));
  }
  const insert = env.DB.prepare("INSERT OR REPLACE INTO content_records (id, section, issue, author, category, content, result, status, lottery) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)");
  for (const record of buildPredictions(history.slice(0, 30), nextIssue, lotteryName)) {
    const key = `${record.section}:${record.issue}`, previous = existingRows.get(key);
    if (!previous) {
      const initial = ["five", "four"].includes(record.section) ? settleWeeklyPrediction(record, history) : record;
      statements.push(insert.bind(record.id, record.section, record.issue, record.author, record.category, record.content, initial.result, initial.status, lotteryName));
      existing.add(key);
    }
  }
  const expertExisting = new Set((rows || []).filter((row) => row.section === "expert").map((row) => `${row.author}|${row.category}|${row.issue}`));
  for (const record of buildExpertPredictions(history.slice(0, 40), nextIssue, lotteryName)) {
    const key = `${record.author}|${record.category}|${record.issue}`;
    if (!expertExisting.has(key)) statements.push(insert.bind(record.id, record.section, record.issue, record.author, record.category, record.content, record.result, record.status, lotteryName));
  }
  const sampleWeeklyKey = "five:2026222-2026228";
  if (lotteryName === "\u6FB3\u95E8" && !existing.has(sampleWeeklyKey)) {
    const sampleWeekly = { section: "five", issue: "2026222-2026228", content: "03 06 07 23 27 30 36 37" }, sampleWeeklyResult = settleWeeklyPrediction(sampleWeekly, history);
    statements.push(insert.bind("weekly-five-2026222-2026228", "five", sampleWeekly.issue, "", "\u6FB3\u95E8\u9A6C\u4F1A\u3010\u672C\u5468\u516B\u7801\u3011", sampleWeekly.content, sampleWeeklyResult.result, sampleWeeklyResult.status, lotteryName));
    existing.add(sampleWeeklyKey);
  }
  const sampleHeadKey = "four:2026225-2026229";
  if (lotteryName === "\u6FB3\u95E8" && !existing.has(sampleHeadKey)) {
    const sampleHead = { section: "four", issue: "2026225-2026229", content: "30 31 32 33 34 35 36 37 38 39" }, sampleHeadResult = settleWeeklyPrediction(sampleHead, history);
    statements.push(insert.bind("head-four-2026225-2026229", "four", sampleHead.issue, "", "\u6FB3\u95E8\u9A6C\u4F1A\u3010\u5FC5\u5F00\u7279\u5934\u3011", sampleHead.content, sampleHeadResult.result, sampleHeadResult.status, lotteryName));
    existing.add(sampleHeadKey);
  }
  const sampleFamilyKey = "tail:2026221";
  if (lotteryName === "\u6FB3\u95E8" && !existing.has(sampleFamilyKey)) {
    const sampleFamily = { section: "tail", issue: "2026221", content: "\u5BB6\u79BD+\u864E\u7334" };
    const sampleDraw = history.find((draw) => String(draw.issueNo) === sampleFamily.issue);
    const sampleFamilyResult = sampleDraw ? settlePrediction(sampleFamily, sampleDraw) : { result: "\u5F00\u9A6C01\u51C6", status: "hit" };
    statements.push(insert.bind("family-tail-2026221", "tail", sampleFamily.issue, "", "\u6FB3\u95E8\u9A6C\u4F1A\u3010\u5BB6\u91CE\u51FA\u7279\u3011", sampleFamily.content, sampleFamilyResult.result, sampleFamilyResult.status, lotteryName));
    existing.add(sampleFamilyKey);
  }
  for (let index = 0; index < Math.min(20, history.length); index += 1) {
    const target = history[index], training = history.slice(index + 1, index + 31);
    if ((target.numberList || []).length < 7 || training.length < 15) continue;
    for (const generated of buildPredictions(training, String(target.issueNo), lotteryName)) {
      if (["five", "four", "tail"].includes(generated.section)) continue;
      const key = `${generated.section}:${generated.issue}`, previous = existingRows.get(key), settled = settlePrediction(generated, target);
      if (previous || existing.has(key)) {
        if (generated.section === "four" && String(previous.id).startsWith("history-")) statements.push(env.DB.prepare("UPDATE content_records SET category = ?, content = ?, result = ?, status = ? WHERE id = ?").bind(generated.category, generated.content, settled.result, settled.status, previous.id));
        continue;
      }
      const id = `history-${config.code}-${generated.section}-${target.issueNo}`;
      const weeklySettled = generated.section === "five" ? settleWeeklyPrediction(generated, history) : settled;
      statements.push(insert.bind(id, generated.section, generated.issue, "\u7CFB\u7EDF\u5386\u53F2\u56DE\u6D4B", generated.category, generated.content, weeklySettled.result, weeklySettled.status, lotteryName));
      existing.add(key);
    }
  }
  const updatedAt = (/* @__PURE__ */ new Date()).toISOString();
  statements.push(env.DB.prepare("INSERT INTO app_meta (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value").bind(`updatedAt:${lotteryName}`, updatedAt));
  statements.push(env.DB.prepare("INSERT INTO app_meta (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value").bind(`autoPredictionIssue:${lotteryName}`, nextIssue));
  statements.push(env.DB.prepare("INSERT INTO app_meta (key, value) VALUES ('autoBackfillV1', ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value").bind(updatedAt));
  statements.push(env.DB.prepare("INSERT INTO app_meta (key, value) VALUES ('fourRuleAllSevenV2', ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value").bind(updatedAt));
  statements.push(env.DB.prepare("INSERT INTO app_meta (key, value) VALUES ('settleAllHistoryV3', ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value").bind(updatedAt));
  for (let index = 0; index < statements.length; index += 75) await env.DB.batch(statements.slice(index, index + 75));
  for (const section of AUTO_SECTIONS) await env.DB.prepare("DELETE FROM content_records WHERE lottery = ? AND id LIKE ? AND id NOT IN (SELECT id FROM content_records WHERE lottery = ? AND id LIKE ? ORDER BY CAST(issue AS INTEGER) DESC LIMIT 30)").bind(lotteryName, `auto-${config.code}-${section}-%`, lotteryName, `auto-${config.code}-${section}-%`).run();
  await env.DB.prepare("DELETE FROM content_records WHERE lottery = ? AND id LIKE ? AND id NOT IN (SELECT id FROM content_records WHERE lottery = ? AND id LIKE ? ORDER BY CAST(issue AS INTEGER) DESC LIMIT 416)").bind(lotteryName, `expert-auto-${config.code}-%`, lotteryName, `expert-auto-${config.code}-%`).run();
  return { ok: true, lottery: lotteryName, latestIssue: latest.issueNo, nextIssue };
}
__name(autoUpdateContent, "autoUpdateContent");
var allowedSections = /* @__PURE__ */ new Set([
  "five",
  "four",
  "tail",
  "fourZodiac",
  "strategy",
  "wave",
  "kill",
  "poem",
  "ten",
  "expert"
]);
var configurableSections = /* @__PURE__ */ new Set(["wuqi", "five", "four", "tail", "fourZodiac", "strategy", "paogou", "wave", "kill", "poem", "ten"]);
async function siteConfig(request, env) {
  if (!env.DB) return json({ ok: true, ads: [], hiddenSections: [], popupAd: { image: "", link: "", enabled: false } });
  if (request.method === "GET") {
    const row = await env.DB.prepare("SELECT value FROM app_meta WHERE key = 'siteConfig'").first();
    try {
      const localConfig = row?.value ? JSON.parse(row.value) : { ads: [], hiddenSections: [], interlinks: [] };
      try {
        if (env.CENTRAL_LINKS) {
          const centralResponse = await env.CENTRAL_LINKS.fetch(new Request("https://central-links.internal/api/public/recommended-sites"));
          if (centralResponse.ok) {
            const centralPayload = await centralResponse.json();
            if (centralPayload?.success && Array.isArray(centralPayload.data)) {
              localConfig.interlinks = centralPayload.data.map((item) => ({
                name: String(item?.name || "").trim(),
                icon: String(item?.name || "\u7AD9").trim().slice(0, 1) || "\u7AD9",
                url: String(item?.site_url || "").trim(),
                enabled: true
              })).filter((item) => item.name && /^https?:\/\//i.test(item.url));
            }
          }
          const centralAdsResponse = await env.CENTRAL_LINKS.fetch(new Request("https://central-links.internal/api/public/ads"));
          if (centralAdsResponse.ok) {
            const centralAdsPayload = await centralAdsResponse.json();
            if (centralAdsPayload?.success && Array.isArray(centralAdsPayload.data)) {
              const banner = centralAdsPayload.data.find((item) => item.position_key === "banner");
              const popup = centralAdsPayload.data.find((item) => item.position_key === "popup");
              if (banner?.image_url) {
                const sharedBanner = { image: banner.image_url, link: banner.link_url || "", enabled: true };
                localConfig.ads = Array.from({ length: Math.max(16, localConfig.ads?.length || 0) }, () => ({ ...sharedBanner }));
              }
              if (popup?.image_url) localConfig.popupAd = { image: popup.image_url, link: popup.link_url || "", enabled: true, displayMode: popup.display_mode || "always", delaySeconds: Number(popup.delay_seconds) || 0 };
              else localConfig.popupAd = { image: "", link: "", enabled: false };
            }
          }
        }
      } catch (_) {
      }
      return json({ ok: true, ...localConfig });
    } catch (_) {
      return json({ ok: true, ads: [], hiddenSections: [], interlinks: [] });
    }
  }
  if (request.method !== "POST") return json({ ok: false, message: "\u4E0D\u652F\u6301\u7684\u8BF7\u6C42\u65B9\u5F0F" }, 405);
  if (!isAdmin(request, env)) return json({ ok: false, message: "\u540E\u53F0\u5BC6\u7801\u9519\u8BEF" }, 401);
  let payload;
  try {
    payload = await request.json();
  } catch (_) {
    payload = null;
  }
  if (!payload) return json({ ok: false, message: "\u914D\u7F6E\u683C\u5F0F\u4E0D\u6B63\u786E" }, 422);
  const ads = (Array.isArray(payload.ads) ? payload.ads : []).slice(0, 3).map((ad) => {
    const image = String(ad?.image || "").slice(0, 7e5), link = String(ad?.link || "").slice(0, 500);
    const validImage = /^(https?:\/\/|data:image\/(?:png|jpeg|webp|gif);base64,|assets\/)/i.test(image) ? image : "";
    const validLink = !link || /^https?:\/\//i.test(link) ? link : "";
    return { image: validImage, link: validLink, enabled: ad?.enabled !== false };
  });
  const popupImage = String(payload.popupAd?.image || "").slice(0, 7e5);
  const popupLink = String(payload.popupAd?.link || "").slice(0, 500);
  const popupAd = {
    image: /^(https?:\/\/|data:image\/(?:png|jpeg|webp|gif);base64,|assets\/)/i.test(popupImage) ? popupImage : "",
    link: !popupLink || /^https?:\/\//i.test(popupLink) ? popupLink : "",
    enabled: payload.popupAd?.enabled !== false
  };
  const hiddenSections = [...new Set((Array.isArray(payload.hiddenSections) ? payload.hiddenSections : []).filter((item) => configurableSections.has(item)))];
  const interlinks = (Array.isArray(payload.interlinks) ? payload.interlinks : []).slice(0, 40).map((item) => {
    const name = String(item?.name || "").trim().slice(0, 30), icon = String(item?.icon || name.slice(0, 1) || "\u7AD9").trim().slice(0, 2), rawUrl = String(item?.url || "").trim().slice(0, 500);
    const url = /^(https?:\/\/|(?:history|live|chat|formula|expert)(?:\.html)?$|action:pick$|#$)/i.test(rawUrl) ? rawUrl : "#";
    return { name, icon, url, enabled: item?.enabled !== false };
  }).filter((item) => item.name);
  const value = JSON.stringify({ ads, popupAd, hiddenSections, interlinks });
  if (value.length > 18e5) return json({ ok: false, message: "\u5E7F\u544A\u56FE\u7247\u603B\u5927\u5C0F\u8D85\u8FC7\u9650\u5236" }, 413);
  await env.DB.prepare("INSERT INTO app_meta (key, value) VALUES ('siteConfig', ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value").bind(value).run();
  return json({ ok: true, ads, popupAd, hiddenSections, interlinks });
}
__name(siteConfig, "siteConfig");
async function contentData(request, env) {
  if (!env.DB) return json({ version: 1, updatedAt: null, records: [] });
  if (request.method === "GET") {
    const autoMeta = await env.DB.prepare("SELECT value FROM app_meta WHERE key = 'updatedAt'").first();
    const stale = !autoMeta?.value || Date.now() - Date.parse(autoMeta.value) > 5 * 60 * 1e3;
    let autoError = "";
    if (stale) {
      try {
        await autoUpdateContent(env);
      } catch (error) {
        autoError = String(error?.stack || error?.message || error);
      }
    }
    const { results } = await env.DB.prepare(
      "SELECT id, section, issue, author, category, content, result, status, lottery FROM content_records ORDER BY rowid"
    ).all();
    const meta = await env.DB.prepare("SELECT value FROM app_meta WHERE key = 'updatedAt'").first();
    return json({ version: 1, updatedAt: meta?.value || null, records: results || [], ...autoError ? { autoError } : {} });
  }
  if (request.method !== "POST") return json({ ok: false, message: "\u4E0D\u652F\u6301\u7684\u8BF7\u6C42\u65B9\u5F0F" }, 405);
  if (!isAdmin(request, env)) {
    return json({ ok: false, message: env.ADMIN_TOKEN ? "\u540E\u53F0\u5BC6\u7801\u9519\u8BEF" : "\u670D\u52A1\u5668\u5C1A\u672A\u8BBE\u7F6E\u540E\u53F0\u53D1\u5E03\u5BC6\u7801" }, 401);
  }
  let payload;
  try {
    payload = await request.json();
  } catch (_) {
    payload = null;
  }
  if (!payload || !Array.isArray(payload.records)) {
    return json({ ok: false, message: "\u8D44\u6599\u683C\u5F0F\u4E0D\u6B63\u786E" }, 422);
  }
  if (payload.records.length > 2e3) {
    return json({ ok: false, message: "\u8D44\u6599\u6570\u91CF\u8D85\u8FC7\u9650\u5236" }, 422);
  }
  const clean = payload.records.filter((record) => record && allowedSections.has(record.section)).map((record) => ({
    id: String(record.id || crypto.randomUUID()).slice(0, 80),
    section: record.section,
    lottery: ["\u6FB3\u95E8", "\u9999\u6E2F", "\u75AF\u72C2\u5929\u5929\u5F69"].includes(record.lottery) ? record.lottery : "\u6FB3\u95E8",
    issue: String(record.issue || "").slice(0, 20),
    author: String(record.author || "").slice(0, 40),
    category: String(record.category || "").slice(0, 60),
    content: String(record.content || "").slice(0, 1e3),
    result: String(record.result || "").slice(0, 120),
    status: ["pending", "hit", "miss"].includes(record.status) ? record.status : "pending"
  }));
  const insert = env.DB.prepare(
    "INSERT INTO content_records (id, section, issue, author, category, content, result, status, lottery) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)"
  );
  const updatedAt = (/* @__PURE__ */ new Date()).toISOString();
  await env.DB.batch([
    env.DB.prepare("DELETE FROM content_records"),
    ...clean.map((r) => insert.bind(r.id, r.section, r.issue, r.author, r.category, r.content, r.result, r.status, r.lottery)),
    env.DB.prepare("INSERT INTO app_meta (key, value) VALUES ('updatedAt', ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value").bind(updatedAt)
  ]);
  return json({ ok: true, updatedAt, count: clean.length });
}
__name(contentData, "contentData");
async function chatData(request, env) {
  const db = env.CHAT_DB;
  if (!db) return json({ ok: false, message: "\u516D\u5408\u738B\u804A\u5929\u5BA4\u5C1A\u672A\u8FDE\u63A5" }, 503);
  const now = (/* @__PURE__ */ new Date()).toISOString(), requestUrl = new URL(request.url);
  if (request.method === "GET") {
    const deviceId2 = String(requestUrl.searchParams.get("device") || "").trim().slice(0, 80);
    const nickname2 = String(requestUrl.searchParams.get("nickname") || "\u6E38\u5BA2").replace(/[\u0000-\u001f\u007f]/g, "").trim().slice(0, 12) || "\u6E38\u5BA2";
    if (deviceId2) await db.prepare(
      "INSERT INTO chat_devices (device_id, nickname, banned, muted_until, last_seen, created_at) VALUES (?, ?, 0, NULL, ?, ?) ON CONFLICT(device_id) DO UPDATE SET nickname = excluded.nickname, last_seen = excluded.last_seen"
    ).bind(deviceId2, nickname2, now, now).run();
    const [{ results }, onlineRow] = await Promise.all([
      db.prepare(
        "SELECT id, device_id AS deviceId, nickname, content, is_admin AS isAdmin, created_at AS createdAt FROM chat_messages WHERE deleted = 0 ORDER BY id DESC LIMIT 100"
      ).all(),
      db.prepare("SELECT COUNT(*) AS total FROM chat_devices WHERE last_seen >= ?").bind(new Date(Date.now() - 5 * 60 * 1e3).toISOString()).first()
    ]);
    const countryNames = { CN: "\u4E2D\u56FD", HK: "\u9999\u6E2F", MO: "\u6FB3\u95E8", TW: "\u53F0\u6E7E", SG: "\u65B0\u52A0\u5761", MY: "\u9A6C\u6765\u897F\u4E9A" };
    const viewerLocation = countryNames[request.cf?.country] || "\u6D77\u5916";
    return json({ messages: (results || []).reverse().map((item) => ({ ...item, isAdmin: Boolean(item.isAdmin) })), online: Math.max(1, Number(onlineRow?.total || 0)), viewerLocation });
  }
  if (request.method !== "POST") return json({ ok: false, message: "\u4E0D\u652F\u6301\u7684\u8BF7\u6C42\u65B9\u5F0F" }, 405);
  let payload;
  try {
    payload = await request.json();
  } catch (_) {
    payload = null;
  }
  const deviceId = String(payload?.deviceId || "").trim().slice(0, 80);
  const nickname = String(payload?.nickname || "\u6E38\u5BA2").replace(/[\u0000-\u001f\u007f]/g, "").trim().slice(0, 12) || "\u6E38\u5BA2";
  const content = String(payload?.content || "").replace(/[\u0000-\u001f\u007f]/g, " ").trim().slice(0, 120);
  if (!deviceId) return json({ ok: false, message: "\u8BBE\u5907\u6807\u8BC6\u65E0\u6548\uFF0C\u8BF7\u5237\u65B0\u540E\u91CD\u8BD5" }, 422);
  if (!content) return json({ ok: false, message: "\u8BF7\u8F93\u5165\u4EA4\u6D41\u5185\u5BB9" }, 422);
  if (!/^[\u3400-\u9fff0-9\s]+$/u.test(content)) return json({ ok: false, message: "\u53EA\u5141\u8BB8\u4E2D\u6587\u3001\u6570\u5B57\u548C\u7A7A\u683C" }, 422);
  await db.prepare(
    "INSERT INTO chat_devices (device_id, nickname, banned, muted_until, last_seen, created_at) VALUES (?, ?, 0, NULL, ?, ?) ON CONFLICT(device_id) DO UPDATE SET nickname = excluded.nickname, last_seen = excluded.last_seen"
  ).bind(deviceId, nickname, now, now).run();
  const device = await db.prepare("SELECT banned, muted_until AS mutedUntil FROM chat_devices WHERE device_id = ?").bind(deviceId).first();
  if (device?.banned) return json({ ok: false, message: "\u8BE5\u8BBE\u5907\u5DF2\u88AB\u7981\u6B62\u53D1\u8A00" }, 403);
  if (device?.mutedUntil && Date.parse(device.mutedUntil) > Date.now()) return json({ ok: false, message: "\u8BE5\u8BBE\u5907\u6B63\u5728\u7981\u8A00\u4E2D" }, 403);
  const latest = await db.prepare(
    "SELECT created_at AS createdAt FROM chat_messages WHERE device_id = ? ORDER BY id DESC LIMIT 1"
  ).bind(deviceId).first();
  if (latest?.createdAt && Date.now() - Date.parse(latest.createdAt) < 5e3) return json({ ok: false, message: "\u53D1\u9001\u592A\u5FEB\uFF0C\u8BF7\u7A0D\u540E\u518D\u8BD5" }, 429);
  const result = await db.prepare(
    "INSERT INTO chat_messages (device_id, nickname, content, deleted, is_admin, created_at) VALUES (?, ?, ?, 0, 0, ?)"
  ).bind(deviceId, nickname, content, now).run();
  return json({ ok: true, message: { id: result.meta.last_row_id, deviceId, nickname, content, isAdmin: false, createdAt: now } });
}
__name(chatData, "chatData");
var trackedPaths = /* @__PURE__ */ new Set(["/", "/index", "/history", "/live", "/chat", "/formula", "/expert"]);
var htmlAssetPaths = /* @__PURE__ */ new Map([
  ["/", "/index.html"],
  ["/index", "/index.html"],
  ["/admin", "/admin.html"],
  ["/expert", "/expert.html"],
  ["/history", "/history.html"],
  ["/live", "/live.html"],
  ["/chat", "/chat.html"],
  ["/formula", "/formula.html"]
]);
function assetRequest(request, pathname) {
  const mappedPath = htmlAssetPaths.get(pathname);
  if (!mappedPath) return request;
  const url = new URL(request.url);
  url.pathname = mappedPath;
  return new Request(url, request);
}
__name(assetRequest, "assetRequest");
async function statsData(request, env) {
  if (!env.DB) return json({ ok: false, message: "\u7EDF\u8BA1\u670D\u52A1\u5C1A\u672A\u542F\u7528" }, 503);
  if (request.method === "POST") {
    let payload;
    try {
      payload = await request.json();
    } catch (_) {
      payload = null;
    }
    let path;
    if (["ad", "interlink"].includes(payload?.eventType)) {
      const key = String(payload?.key || "").trim().replace(/[^\p{L}\p{N}_\- .]/gu, "").slice(0, 60);
      if (!key) return json({ ok: false, message: "\u7EDF\u8BA1\u53C2\u6570\u4E0D\u6B63\u786E" }, 422);
      path = `click:${payload.eventType}:${key}`;
    } else {
      path = String(payload?.path || "/").replace(/\.html$/, "");
      if (path === "/index") path = "/";
      if (!trackedPaths.has(path)) return json({ ok: false, message: "\u9875\u9762\u53C2\u6570\u4E0D\u6B63\u786E" }, 422);
    }
    const day = (/* @__PURE__ */ new Date()).toISOString().slice(0, 10);
    await env.DB.prepare(
      "INSERT INTO page_stats (day, path, views) VALUES (?, ?, 1) ON CONFLICT(day, path) DO UPDATE SET views = views + 1"
    ).bind(day, path).run();
    return json({ ok: true }, 201);
  }
  if (request.method === "GET") {
    if (!isAdmin(request, env)) return json({ ok: false, message: "\u540E\u53F0\u5BC6\u7801\u9519\u8BEF" }, 401);
    const { results } = await env.DB.prepare(
      "SELECT day, path, views FROM page_stats WHERE day >= date('now', '-13 days') ORDER BY day DESC, views DESC"
    ).all();
    return json({ ok: true, stats: results || [] });
  }
  return json({ ok: false, message: "\u4E0D\u652F\u6301\u7684\u8BF7\u6C42\u65B9\u5F0F" }, 405);
}
__name(statsData, "statsData");
var worker_default = {
  async fetch(request, env) {
    const pathname = new URL(request.url).pathname;
    if (pathname === "/draw-data.php") return maybeEncryptJsonResponse(request, await proxyDraw(request));
    if (pathname === "/live-data.php") return maybeEncryptJsonResponse(request, await proxyLive(request));
    if (pathname === "/wuqi-data.php") return maybeEncryptJsonResponse(request, await proxyWuqi(request));
    if (pathname === "/history-data.php") return maybeEncryptJsonResponse(request, await proxyHistory(request));
    if (pathname === "/content-data.php") return maybeEncryptJsonResponse(request, await contentData(request, env));
    if (pathname === "/site-config.php") return maybeEncryptJsonResponse(request, await siteConfig(request, env));
    if (pathname === "/admin-auth.php") return adminAuth(request, env);
    if (pathname === "/stats-data.php") return statsData(request, env);
    if (pathname === "/api/chat/v1") return maybeEncryptJsonResponse(request, await chatData(request, env));
    if (pathname === "/auto-update.php") {
      if (request.method !== "POST") return json({ ok: false, message: "\u4E0D\u652F\u6301\u7684\u8BF7\u6C42\u65B9\u5F0F" }, 405);
      if (!isAdmin(request, env)) return json({ ok: false, message: "\u540E\u53F0\u5BC6\u7801\u9519\u8BEF" }, 401);
      const lottery = new URL(request.url).searchParams.get("lottery") || null;
      try {
        return json(await autoUpdateContent(env, lottery));
      } catch (_) {
        return json({ ok: false, message: "\u81EA\u52A8\u5206\u6790\u6682\u65F6\u5931\u8D25" }, 502);
      }
    }
    const asset = await env.ASSETS.fetch(assetRequest(request, pathname));
    if (asset.status === 200 && (pathname === "/" || /\.html$/i.test(pathname) || !/\.[a-z0-9]+$/i.test(pathname)) && (asset.headers.get("content-type") || "").includes("text/html")) {
      const html = await asset.text();
      const shell = await encryptedHtmlShell(html);
      return new Response(shell, {
        status: 200,
        headers: {
          "Content-Type": "text/html; charset=utf-8",
          "Cache-Control": "no-store, max-age=0",
          "X-Content-Type-Options": "nosniff"
        }
      });
    }
    if (asset.status === 200 && (/\.(?:html|js)$/i.test(pathname) || !/\.[a-z0-9]+$/i.test(pathname))) {
      const headers = new Headers(asset.headers);
      headers.set("Cache-Control", "no-store, max-age=0");
      return new Response(asset.body, { status: asset.status, statusText: asset.statusText, headers });
    }
    return asset;
  },
  async scheduled(_controller, env, ctx) {
    ctx.waitUntil(autoUpdateContent(env));
  }
};
export {
  worker_default as default
};
//# sourceMappingURL=worker.js.map
