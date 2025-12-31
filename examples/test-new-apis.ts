#!/usr/bin/env npx tsx
/**
 * 88Code SDK 新增 API 测试示例
 *
 * 测试以下新 API:
 * - 模型用量时间线
 * - API Key 查询
 * - Credit 历史记录
 *
 * 运行方式:
 *   npx tsx examples/test-new-apis.ts
 */

import { config } from "dotenv";
import { Code88Client, Code88Queries } from "../src/index.ts";

config();

const authToken = process.env.CODE88_AUTH_TOKEN;

if (!authToken) {
  console.error("错误: 请设置 CODE88_AUTH_TOKEN 环境变量");
  process.exit(1);
}

console.log("=".repeat(60));
console.log("88Code SDK - 新增 API 测试");
console.log("=".repeat(60));

const client = new Code88Client({
  authToken,
  debug: true,
});

const queries = new Code88Queries(client);

// 1. 测试模型用量时间线
console.log("\n[1] 获取模型用量时间线（最近 7 天）...");

const endDate = new Date();
const startDate = new Date();
startDate.setDate(startDate.getDate() - 7);

const modelUsage = await queries.getModelUsageTimeline({
  startDate,
  endDate,
  granularity: "day",
});

if (modelUsage.success) {
  console.log(`✅ 模型用量时间线: ${modelUsage.data.length} 条记录`);

  // 按模型分组统计
  const modelStats = new Map<
    string,
    { requests: number; cost: number; tokens: number }
  >();

  for (const point of modelUsage.data) {
    const existing = modelStats.get(point.modelName) || {
      requests: 0,
      cost: 0,
      tokens: 0,
    };
    modelStats.set(point.modelName, {
      requests: existing.requests + point.requests,
      cost: existing.cost + point.cost,
      tokens:
        existing.tokens +
        point.inputTokens +
        point.outputTokens +
        point.cacheCreateTokens +
        point.cacheReadTokens,
    });
  }

  console.log("\n   按模型统计:");
  for (const [model, stats] of modelStats.entries()) {
    console.log(
      `   📊 ${model}: ${stats.requests} 请求, ${stats.tokens.toLocaleString()} tokens, $${stats.cost.toFixed(4)}`,
    );
  }
} else {
  console.error("❌ 获取模型用量时间线失败:", modelUsage.message);
}

// 2. 测试 API Key 查询
console.log("\n[2] 查询 API Key 列表...");
const apiKeys = await queries.queryApiKeys({ pageNum: 1, pageSize: 10 });

if (apiKeys.success) {
  console.log(
    `✅ API Keys: 共 ${apiKeys.data.total} 个, 当前页 ${apiKeys.data.list.length} 个`,
  );

  for (const key of apiKeys.data.list.slice(0, 5)) {
    const maskedKey = key.apiKey.slice(0, 8) + "..." + key.apiKey.slice(-4);
    console.log(`\n   🔑 ${key.apiKeyName || "(未命名)"}`);
    console.log(`      Key: ${maskedKey}`);
    console.log(`      状态: ${key.status}`);
    console.log(`      请求数: ${key.totalRequests.toLocaleString()}`);
    console.log(`      费用: $${key.totalCost.toFixed(4)}`);
    if (key.lastUsedTime) {
      console.log(`      最后使用: ${key.lastUsedTime}`);
    }
  }
} else {
  console.error("❌ 查询 API Key 失败:", apiKeys.message);
}

// 3. 测试 Credit 历史记录
console.log("\n[3] 获取 Credit 历史记录（最近 30 天）...");

const historyEndTime = new Date();
const historyStartTime = new Date();
historyStartTime.setDate(historyStartTime.getDate() - 30);

const creditHistory = await queries.getCreditHistory({
  startTime: historyStartTime,
  endTime: historyEndTime,
  pageNum: 1,
  pageSize: 10,
});

if (creditHistory.success) {
  console.log(
    `✅ Credit 历史: 共 ${creditHistory.data.total} 条, 当前页 ${creditHistory.data.list.length} 条`,
  );

  for (const item of creditHistory.data.list.slice(0, 5)) {
    const changeSign = item.changeAmount >= 0 ? "+" : "";
    console.log(`\n   📝 ${item.description}`);
    console.log(`      类型: ${item.changeType}`);
    console.log(`      变更: ${changeSign}$${item.changeAmount.toFixed(4)}`);
    console.log(
      `      余额: $${item.balanceBefore.toFixed(4)} → $${item.balanceAfter.toFixed(4)}`,
    );
    console.log(`      时间: ${item.createdTime}`);
  }
} else {
  console.error("❌ 获取 Credit 历史失败:", creditHistory.message);
}

// 4. 测试获取所有 API Key（自动分页）
console.log("\n[4] 获取所有 API Keys（自动分页）...");
const allApiKeys = await queries.getAllApiKeys();

if (allApiKeys.success) {
  console.log(`✅ 共获取 ${allApiKeys.data.length} 个 API Key`);

  // 统计活跃和非活跃
  const activeCount = allApiKeys.data.filter(
    (k) => k.status === "active" || k.status === "正常",
  ).length;
  console.log(`   活跃: ${activeCount}, 非活跃: ${allApiKeys.data.length - activeCount}`);

  // 统计总使用量
  const totalRequests = allApiKeys.data.reduce(
    (sum, k) => sum + k.totalRequests,
    0,
  );
  const totalCost = allApiKeys.data.reduce((sum, k) => sum + k.totalCost, 0);
  console.log(`   总请求数: ${totalRequests.toLocaleString()}`);
  console.log(`   总费用: $${totalCost.toFixed(4)}`);
} else {
  console.error("❌ 获取所有 API Keys 失败:", allApiKeys.message);
}

console.log("\n" + "=".repeat(60));
console.log("新增 API 测试完成！");
console.log("=".repeat(60));
