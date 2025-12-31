# 88Code SDK

基于 [88code-cost](https://github.com/byebye-code/88code-cost) 项目封装的 88Code API SDK，适用于 Node.js/TypeScript。

## 特性

- 完整的 TypeScript 类型定义
- 只读操作与危险操作分离（代码级隔离）
- 支持 Node.js 18+ 和现代浏览器
- 调试日志支持

## 安装

```bash
# 安装依赖
npm install

# 或者使用 pnpm
pnpm install
```

## 快速开始

### 1. 获取 authToken

登录 [88code.org](https://88code.org) 后，从浏览器获取 authToken：

1. 打开开发者工具 (F12)
2. 切换到 Application/应用 标签
3. 在左侧找到 Local Storage → https://88code.org
4. 找到 key 为 `authToken` 的条目
5. 复制其 value（去掉首尾的引号）

或者在控制台执行：
```js
localStorage.getItem("authToken")
```

### 2. 配置环境变量

创建 `.env` 文件：

```bash
cp .env.example .env
# 编辑 .env 填入你的 authToken
```

### 3. 使用 SDK

```ts
import { Code88Client, Code88Queries } from "@gaubee/88code-sdk";

// 创建客户端
const client = new Code88Client({
  authToken: process.env.CODE88_AUTH_TOKEN!,
  debug: true,  // 可选：启用调试日志
});

// 创建查询实例
const queries = new Code88Queries(client);

// 获取用户信息
const userInfo = await queries.getLoginInfo();
console.log(userInfo.data);

// 获取活跃订阅
const subscriptions = await queries.getSubscriptions();
console.log(subscriptions.data);

// 获取仪表盘数据
const dashboard = await queries.getDashboard();
console.log(dashboard.data);

// 获取额度概要
const credits = await queries.getCreditsOverview();
console.log(credits.data);

// 获取用量趋势
const trend = await queries.getUsageTrend({ days: 30 });
console.log(trend.data);
```

## API 文档

### 只读查询 (Code88Queries) - 安全

所有只读操作，不会修改任何数据：

| 方法 | 描述 |
|------|------|
| `getLoginInfo()` | 获取当前登录用户信息 |
| `getSubscriptions()` | 获取活跃订阅列表 |
| `getAllSubscriptions()` | 获取所有订阅列表（包含非活跃） |
| `getSubscriptionById(id)` | 获取指定订阅详情 |
| `getDashboard()` | 获取仪表盘统计数据 |
| `getUsageTrend(params?)` | 获取用量趋势 |
| `getCreditsOverview()` | 获取额度汇总信息 |

### 危险操作 (Code88Mutations) - 隔离

⚠️ **警告**：以下操作会修改数据，请谨慎使用！

| 方法 | 描述 | 风险 |
|------|------|------|
| `resetCredits(subscriptionId)` | 重置订阅额度 | 每日有次数限制 |
| `toggleAutoReset(subscriptionId, enabled)` | 切换自动重置开关 | 影响自动重置行为 |

使用危险操作需要显式确认：

```ts
import { Code88Client, createMutations } from "@gaubee/88code-sdk";

const client = new Code88Client({ authToken: "..." });

// 必须传入确认字符串
const mutations = createMutations(client, "I_UNDERSTAND_THE_RISKS");

// ⚠️ 执行危险操作
await mutations.resetCredits(123);
```

## 目录结构

```
88code-sdk/
├── src/
│   ├── index.ts      # 入口文件
│   ├── client.ts     # 核心 API 客户端
│   ├── config.ts     # 配置常量
│   ├── types.ts      # 类型定义
│   ├── queries.ts    # 只读查询（安全）
│   └── mutations.ts  # 危险操作（隔离）
├── examples/
│   └── test-queries.ts  # 查询测试示例
├── package.json      # Node.js 配置
├── tsconfig.json     # TypeScript 配置
├── .env.example      # 环境变量示例
└── README.md         # 本文档
```

## 运行测试

```bash
# 安装依赖
npm install

# 运行只读 API 测试
npm test
```

## 类型导出

所有类型均可从入口文件导入：

```ts
import type {
  Subscription,
  SubscriptionPlan,
  LoginInfo,
  DashboardData,
  UsageTrendPoint,
  ApiResult,
  Code88Config,
} from "@gaubee/88code-sdk";
```

## 注意事项

1. **Token 安全**：请勿将 authToken 提交到版本控制（.env 已在 .gitignore 中）
2. **API 限制**：某些操作（如重置额度）有每日次数限制
3. **域名**：88code.org 和 88code.ai 是同一服务的不同域名

## 致谢

基于 [88code-cost](https://github.com/byebye-code/88code-cost) 项目的 API 分析。

## License

MIT
