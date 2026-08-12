import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import { DraftStore } from "../src/store.js";
import { demoResult, formatForPlatform, normalizeReferenceLinks } from "../src/agent.js";

test("草稿可以新增、更新和删除", async () => {
  const dir = await mkdtemp(path.join(os.tmpdir(), "creator-store-"));
  const store = new DraftStore(path.join(dir, "drafts.json"));
  const item = await store.save({ title: "标题", content: "正文", platform: "小红书" });
  assert.equal((await store.list()).length, 1);
  await store.save({ ...item, title: "新标题" });
  assert.equal((await store.list())[0].title, "新标题");
  assert.equal(await store.remove(item.id), true);
  assert.deepEqual(await store.list(), []);
  await rm(dir, { recursive: true, force: true });
});

test("演示 Agent 生成两个平台候选", () => {
  const result = demoResult({ topic: "AI 内容创作", audience: "创作者" });
  assert.equal(result.mode, "demo");
  assert.ok(result.candidates.filter(x => x.platform === "小红书").length >= 2);
  assert.ok(result.candidates.some(x => x.platform === "公众号"));
});

test("平台格式分别适配小红书和公众号", () => {
  const red = formatForPlatform({ platform: "小红书", title: "AI 创作方法", content: "第一段\n\n第二段" });
  assert.match(red.content, /#内容创作/);
  const wechat = formatForPlatform({ platform: "公众号", title: "AI 创作方法", content: "导语\n\n正文" });
  assert.match(wechat.content, /^# AI 创作方法/);
});

test("参考链接只接受去重后的 http/https 且最多五条", () => {
  const links = normalizeReferenceLinks("https://example.com/post#part\nftp://bad.test/a\nhttps://example.com/post#other\nhttps://two.test/");
  assert.deepEqual(links, ["https://example.com/post", "https://two.test/"]);
});
