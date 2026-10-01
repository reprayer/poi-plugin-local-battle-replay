# 零回传安全模型

## 保证范围

本项目自己的运行时代码不会主动建立网络连接，也不会调用宿主提供的上传、分享、遥测或远程页面功能。

插件只读取：

- poi Redux action 中已经存在的战斗响应 `body`；
- poi 内存中用于显示舰名、等级、舰队顺序、活动难度、FCD 节点字母，以及判断应急修理要员/女神的装备 master ID；
- 用户明确选择或粘贴到独立页的本地 JSON。

战斗响应、舰队信息和回放时间线只保存于当前 JavaScript 内存。它不把回放写入 localStorage、IndexedDB、Cookie、剪贴板、poi 配置或日志文件。

唯一允许的本地持久化是播放器主题偏好：poi 模式通过宿主 `window.config` API 把 `mode`、`background`、`foreground`、`backgroundOpacity` 和 `foregroundOpacity` 写入 `config.cson` 的 `plugin.poi-plugin-local-battle-replay.theme` 子节点。这里不包含战斗数据、舰名、地图、日志或时间线；独立页面检测不到 poi 配置接口时退回仅内存，不使用浏览器持久化。

## 明确不存在的能力

- 没有 `fetch`、XMLHttpRequest、WebSocket、EventSource 或 `sendBeacon` 调用；
- 没有 Node `http`、`https`、`net`、`tls` 或 UDP 模块；
- 没有 KCRDB、GitHub Pages、图床、CDN、统计、崩溃报告或更新检查；
- 没有 URL 导入、远程网页、分享链接、表单提交或剪贴板 API 读写；独立视窗由 poi 自己的本地窗口模式创建；
- 没有原游戏图片、语音、音乐或远程字体。
- CUSTOM 主题只接受两个六位十六进制颜色和两个限制在 0–100 的整数透明度，通过固定 CSS 变量白名单应用；没有任意 CSS、`url()`、`@import` 或动态样式代码入口。

独立页面额外用 CSP 和 `standalone/network-lock.js` 拒绝浏览器网络能力。poi 插件不全局篡改宿主的网络对象，以免影响游戏本身；它依靠代码中完全不存在外发调用来保证自身不回传。

## 可复核验证

运行：

```bash
npm run check
```

静态审计扫描全部插件运行时入口，并验证独立页 CSP。安全测试失败时命令返回非零状态。

还可以对最终 tarball 做人工复核：

```bash
npm pack --dry-run
tar -tf poi-plugin-local-battle-replay-1.0.0.tgz
```

`REFERENCES.md` 中包含公开资料链接，但它只是随包分发的文字说明，不会被运行时代码读取或访问。

任何未来新增以下能力的改动都应被视为安全模型变化，不能静默合入：网络模块、远程 URL、遥测、更新检查、上传/分享、剪贴板、主题偏好以外的持久化存储、动态代码下载。

## 宿主边界

poi 和舰队 Collection 本身当然需要网络才能游玩；本保证只覆盖本插件及其独立页面。插件不会干预、代理或重发游戏流量，只消费 poi 已经分发到本地 Redux 的响应副本。
