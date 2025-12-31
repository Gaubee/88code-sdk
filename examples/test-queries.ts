#!/usr/bin/env npx tsx
/**
 * 88Code SDK 只读查询测试示例
 *
 * 运行方式:
 *   npx tsx examples/test-queries.ts
 *
 * 或者设置环境变量:
 *   CODE88_AUTH_TOKEN=xxx npx tsx examples/test-queries.ts
 */

import { config } from "dotenv";
import { Code88Client, Code88Queries } from "../src/index.ts";

// 加载 .env 文件
config();

const authToken = process.env.CODE88_AUTH_TOKEN;

if (!authToken) {
  console.error("错误: 请设置 CODE88_AUTH_TOKEN 环境变量");
  console.error("\n获取方式:");
  console.error("1. 登录 https://88code.org");
  console.error("2. 打开开发者工具 (F12) -> Application -> Local Storage");
  console.error("3. 找到 authToken 并复制其值");
  console.error("\n使用方式:");
  console.error("CODE88_AUTH_TOKEN=xxx npx tsx examples/test-queries.ts");
  process.exit(1);
}

console.log("=".repeat(60));
console.log("88Code SDK - 只读查询测试");
console.log("=".repeat(60));

const client = new Code88Client({
  authToken,
  debug: true,
});

const queries = new Code88Queries(client);

// 1. 获取登录信息
console.log("\n[1] 获取登录信息...");
const loginInfo = await queries.getLoginInfo();
if (loginInfo.success) {
  console.log("✅ 登录信息:");
  console.log(`   用户名: ${loginInfo.data.actualName}`);
  console.log(`   邮箱: ${loginInfo.data.email}`);
  console.log(`   用户类型: ${loginInfo.data.userType}`);
} else {
  console.error("❌ 获取登录信息失败:", loginInfo.message);
}

// 2. 获取所有订阅（不过滤）
console.log("\n[2] 获取所有订阅（原始数据）...");
const allSubscriptions = await queries.getAllSubscriptions();
if (allSubscriptions.success) {
  console.log(`✅ 所有订阅数量: ${allSubscriptions.data.length}`);
  for (const sub of allSubscriptions.data) {
    console.log(`\n   📦 ${sub.subscriptionPlanName}`);
    console.log(`      ID: ${sub.id}`);
    console.log(`      状态: ${sub.subscriptionStatus}`);
    console.log(`      isActive: ${sub.isActive}`);
    console.log(
      `      剩余额度: $${sub.currentCredits?.toFixed(2) ?? 'N/A'} / $${sub.subscriptionPlan?.creditLimit ?? 'N/A'}`,
    );
    console.log(`      剩余天数: ${sub.remainingDays} 天`);
    console.log(`      billingCycle: ${sub.billingCycle}`);
  }
} else {
  console.error("❌ 获取订阅失败:", allSubscriptions.message);
}

// 3. 获取仪表盘数据
console.log("\n[3] 获取仪表盘数据...");
const dashboard = await queries.getDashboard();
if (dashboard.success) {
  const { overview, recentActivity } = dashboard.data;
  console.log("✅ 仪表盘概览:");
  console.log(
    `   API Keys: ${overview.activeApiKeys}/${overview.totalApiKeys} 活跃`,
  );
  console.log(`   总请求数: ${overview.totalRequestsUsed.toLocaleString()}`);
  console.log(`   总 Token: ${overview.totalTokensUsed.toLocaleString()}`);
  console.log(`   总费用: $${overview.cost.toFixed(2)}`);
  console.log("\n   今日活动:");
  console.log(`   请求数: ${recentActivity.requestsToday.toLocaleString()}`);
  console.log(`   Token: ${recentActivity.tokensToday.toLocaleString()}`);
  console.log(`   费用: $${recentActivity.cost.toFixed(2)}`);
} else {
  console.error("❌ 获取仪表盘失败:", dashboard.message);
}

// 4. 获取额度概要
console.log("\n[4] 获取额度概要...");
const credits = await queries.getCreditsOverview();
if (credits.success) {
  console.log("✅ 额度概要:");
  console.log(`   总额度: $${credits.data.totalCredits.toFixed(2)}`);
  console.log(`   已使用: $${credits.data.usedCredits.toFixed(2)}`);
  console.log(`   剩余: $${credits.data.remainingCredits.toFixed(2)}`);
} else {
  console.error("❌ 获取额度概要失败:", credits.message);
}

// 5. 获取用量趋势（最近7天）
console.log("\n[5] 获取用量趋势（最近7天）...");
const trend = await queries.getUsageTrend({ days: 7 });
if (trend.success) {
  console.log("✅ 用量趋势:");
  for (const point of trend.data) {
    console.log(
      `   ${point.label}: ${point.requests} 请求, $${point.cost.toFixed(4)}`,
    );
  }
} else {
  console.error("❌ 获取用量趋势失败:", trend.message);
}

// 6. 获取 API Keys
console.log("\n[6] 获取 API Keys...");
const apiKeys = await queries.queryApiKeys({ pageNum: 1, pageSize: 5 });
if (apiKeys.success) {
  console.log(`✅ API Keys (共 ${apiKeys.data.total} 个):`);
  for (const key of apiKeys.data.list) {
    console.log(`\n   🔑 ${key.name || "(未命名)"}`);
    console.log(`      maskedApiKey: ${key.maskedApiKey}`);
    console.log(`      总请求: ${key.totalRequests}`);
    console.log(`      总费用: $${key.totalCost?.toFixed(4) ?? "N/A"}`);
    console.log(`      创建时间: ${key.createdAt}`);
  }
} else {
  console.error("❌ 获取 API Keys 失败:", apiKeys.message);
}

// 7. 获取 Credit History
console.log("\n[7] 获取 Credit History...");
const now = new Date();
const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
const creditHistory = await queries.getCreditHistory({
  startTime: thirtyDaysAgo,
  endTime: now,
  pageNum: 1,
  pageSize: 5,
});
if (creditHistory.success) {
  console.log(`✅ Credit History (共 ${creditHistory.data.total} 条):`);
  if (creditHistory.data.list.length > 0) {
    for (const item of creditHistory.data.list) {
      console.log(`\n   📋 ${item.description}`);
      console.log(`      时间: ${item.createdAt}`);
      console.log(`      变化: ${item.creditChange >= 0 ? "+" : ""}$${item.creditChange.toFixed(4)}`);
      console.log(`      余额: $${item.creditsAfter.toFixed(4)}`);
      console.log(`      模型: ${item.requestModel ?? "-"}`);
    }
  } else {
    console.log("   (无数据)");
  }
} else {
  console.error("❌ 获取 Credit History 失败:", creditHistory.message);
}

// 8. 获取 Model Usage Timeline
console.log("\n[8] 获取 Model Usage Timeline...");
const modelUsage = await queries.getModelUsageTimeline({
  startDate: thirtyDaysAgo,
  endDate: now,
  granularity: "day",
});
if (modelUsage.success) {
  console.log(`✅ Model Usage Timeline (${modelUsage.data.length} 天):`);
  if (modelUsage.data.length > 0) {
    // 按模型分组统计 (使用新的数据结构)
    const modelStats = new Map<string, { requests: number; cost: number; tokens: number }>();
    for (const dayData of modelUsage.data) {
      for (const model of dayData.models) {
        const name = model.model;
        const existing = modelStats.get(name) || { requests: 0, cost: 0, tokens: 0 };
        modelStats.set(name, {
          requests: existing.requests + model.requests,
          cost: existing.cost + model.cost,
          tokens: existing.tokens + model.tokens,
        });
      }
    }
    console.log("\n   按模型汇总:");
    for (const [model, stats] of modelStats.entries()) {
      console.log(`   📊 ${model}:`);
      console.log(`      ${stats.requests.toLocaleString()} 请求, ${stats.tokens.toLocaleString()} tokens, $${stats.cost.toFixed(4)}`);
    }

    // 显示每日汇总
    console.log("\n   每日汇总 (最近 5 天):");
    for (const dayData of modelUsage.data.slice(-5)) {
      console.log(`   ${dayData.label}: ${dayData.totalRequests} 请求, $${dayData.totalCost.toFixed(4)}`);
    }
  } else {
    console.log("   (无数据)");
  }
} else {
  console.error("❌ 获取 Model Usage Timeline 失败:", modelUsage.message);
}

// 9. 获取 Codex Free 额度
console.log("\n[9] 获取 Codex Free 每日免费额度...");
const codexFree = await queries.getCodexFreeQuota();
if (codexFree.success) {
  console.log("✅ Codex Free 额度:");
  console.log(`   订阅等级: ${codexFree.data.subscriptionLevel}`);
  console.log(`   每日额度: $${codexFree.data.dailyQuota}`);
  console.log(`   已用额度: $${codexFree.data.usedQuota}`);
  console.log(`   剩余额度: $${codexFree.data.remainingQuota}`);
  console.log(`   使用比例: ${codexFree.data.usagePercent}%`);
  console.log(`   是否启用: ${codexFree.data.enabled ? "是" : "否"}`);
} else {
  console.error("❌ 获取 Codex Free 额度失败:", codexFree.message);
}

console.log("\n" + "=".repeat(60));
console.log("测试完成！所有只读 API 均已测试。");
console.log("=".repeat(60));
