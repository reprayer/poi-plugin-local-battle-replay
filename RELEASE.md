# 正式版发布清单

目标包名：`poi-plugin-local-battle-replay`

当前正式版本：`1.0.0`

该包不需要加入 poi 自带插件列表。poi 的插件安装器会把用户输入的完整包名交给内置 npm；发布到公开 npm 注册表后，用户可在 poi 插件安装框直接输入 `poi-plugin-local-battle-replay`。

## 发布前检查

在项目根目录执行：

```bash
npm run check
npm pack --dry-run
npm publish --dry-run --access public
```

确认清单：

- 版本号、README 和安装包名一致；
- tarball 不包含 `.codex-review/`、预览图、旧版本包或用户数据；
- `npm run audit:network` 通过；
- `package.json` 没有 `private: true`；
- `publishConfig.access` 为 `public`；
- 包名仍以 `poi-plugin-` 开头。

## 首次正式上传

上传会改变外部状态，必须由包名所有者明确执行：

```bash
npm login --registry=https://registry.npmjs.org/
npm whoami --registry=https://registry.npmjs.org/
npm publish --access public --registry=https://registry.npmjs.org/
```

发布后核对：

```bash
npm view poi-plugin-local-battle-replay version --registry=https://registry.npmjs.org/
npm view poi-plugin-local-battle-replay dist.tarball --registry=https://registry.npmjs.org/
```

然后在 poi 的插件安装框中输入：

```text
poi-plugin-local-battle-replay
```

本项目没有配置 npm token、GitHub Action 或自动发布脚本；发布凭据不应写入项目文件。版本一旦发布不能用相同版本号覆盖，后续修改应先递增语义化版本。
