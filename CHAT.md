优化订阅列表，把未开始的独立成一个简单的列表放在最下面，重点在于它的可用量、时间范围。其它“重置按钮、已使用、剩余 39 天 、重置次数”都没有意义，因为未开始。
优化Credit 变更历史 ，用shadcnui的table来优化显示。
所有的订阅面板中，进度条要反过来渲染：“已使用: $0.00 / $60 剩余: $60.00”，这种应该渲染成“满”，随着剩余减少而减少。
Codex Free 的卡片采用“紫色”
综合面板 中，你正确显示了“活跃中”的账号，但是应该和详情页使用同样的卡片
“重置额度”这个按钮应该是一个primary-button
综合面板 应该包含所有“活跃中”的订阅，包括codex-free

---

正在进行中的任务：

maybe-done:使用 sidebar 组件优化侧边栏
todo:使用 scroll-area 组件优化所有滚动
maybe-done:所有“刷新”按钮的旁边新增一个“自动刷新”的 toggle，并在设置面板中配置全局的“自动刷新的轮询时间”
maybe-done:优化移动端的交互体验（你自己用 browsermcp 中调试到满意为止）
todo:封装一系列统一的的 service+tankstack-query 来做服务提供，统一数据的状态管理、统一数据的缓存，统一自动刷新等等和请求有关的管理；并使用 Context 来进行注入
todo:所有任务完成后，把这个前端demo配置成github-page，请你做好项目的cicd，你有全局的gh命令可以使用。注意相对路径的的支持，因为最终github-page上，它的路径应该是 xxx.github.io/88code-sdk，同时也要支持custom-domain: xxxxx.com 这样的访问。

- 等到网站部署好了再通知我，否则一直工作到所有任务完成。
- 另外，我看到你自己去写shadcnui的组件了，不要这样，请使用 npx shadcn add 去做添加

---

新任务：

1. 我做了一个 public/logo.webp, 请更换 logo，可以适量进行缩放获得不同尺寸
2. 关于任务：“封装一系列统一的的 service+tankstack-query 来做服务提供，统一数据的状态管理、统一数据的缓存，统一自动刷新等等和请求有关的管理；并使用 Context 来进行注入” 还是没完成，要评估这项任务，最好的效果是：在 tab 之间切换，不论这些卡片被创建、销毁，但是只要请求过数据，那么下一次再创建的时候，只能立刻显示出来的。核心的工作原理是：
   1. service 提供订阅功能，并进行缓存
   2. 处于订阅状态的，那么受到“轮询时间”的影响，定时更新，这里轮询更新的机制不是 setInterval，而是：`loop { await fetchWithRetry() -> await setTimeout() }`所以要等请求回来后，才做下一次的轮询计时
   3. 被取消订阅的就不会轮询，但是最后一次请求的时间是知道的，所以重新开始订阅的时候，会根据上一次请求的时间加上轮询时间，来决定下一次请求的时间
   4. 基于订阅机制，会先把缓存的做数据返回，同时在新的数据下载下来后再次推送
   5. 定时轮询默认开启，默认时间 5s轮询
3. 首页的订阅信息和详情页的订阅信息卡片应该使用统一的组件，不然现在看不到这几个重要信息：“剩余 X 天 | 重置次数: X | 上次重置: X”
   1. 另外有一个奇怪的BUG：linuxdo 账号有一个 paygo，它的“额度余额: $-0.0751124163”，界面上的进度条应该是“空”的，可是我看到的却是“满”的。如果是同样的渲染逻辑，为什么这个订阅那么奇怪？还是说这个是 paygo 的数据结构不一样?
   2. 因为 paygo 是“按量付费”，所以理论上不该有”重置次数“，虽然它的数据确实提供了这个字段给你，但是“只有按月套餐才能重置积分”，所以你需要判断`subscriptionPlan.planType: "MONTHLY"|"PAY_PER_USE"`
   3. 订阅卡片上需要显示 `subscriptionPlan.features`，在首页上的订阅卡片比较紧凑，不显示这个信息。
4. 分析接口 https://relaypulse.top/api/status?period=90m&board=hot ，理解参数的含义，然后封装到我们这套 SDK 中，作为“扩展”功能存在。
   1. 在界面上新增一个页面，用来展示这些供应商的服务可用状态，并提供过滤功能.
      1. 参考网站：https://relaypulse.top/
      2. 参考截图：![https://relaypulse.top/?category=commercial&sort=channel_desc&provider=88code&service=cc](.tmp/relaypulse.png)
      3. 截图对应的a11y: [relaypulse-a11y.txt](.tmp/relaypulse-a11y.txt)
   2. 然后在我们的首页新增一个小卡片，用来展示 `88code` 的服务状态
