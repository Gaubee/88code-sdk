#!/usr/bin/env npx tsx
import { config } from "dotenv";
config();

const token = process.env.CODE88_AUTH_TOKEN!;
const baseUrl = "https://www.88code.ai";

const endpoints = [
  "/admin-api/cc-admin/system/subscription/my",
  "/admin-api/cc-admin/system/subscription/codex",
  "/admin-api/cc-admin/system/subscription/codex-free",
  "/admin-api/cc-admin/user/codex-quota",
  "/admin-api/cc-admin/user/free-quota",
  "/admin-api/cc-admin/user/codex",
  "/admin-api/cc-admin/codex/quota",
  "/admin-api/cc-admin/codex/free",
];

async function testEndpoint(endpoint: string) {
  try {
    const res = await fetch(baseUrl + endpoint, {
      headers: { authorization: "Bearer " + token },
    });
    const data = await res.json();
    console.log(`\n${endpoint} => ${res.status}`);
    if (data.ok) {
      console.log("  数据:", JSON.stringify(data.data).slice(0, 300));
    } else {
      console.log("  错误:", data.msg);
    }
  } catch (e) {
    console.log(`\n${endpoint} => 错误:`, (e as Error).message);
  }
}

async function main() {
  console.log("测试可能的 Codex API 端点...\n");
  for (const ep of endpoints) {
    await testEndpoint(ep);
  }
}

main();
