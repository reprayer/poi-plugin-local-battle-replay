# poi 本地战斗回放

用于 [poi](https://github.com/poooi/poi) 的舰队 Collection 战斗回放插件；

简约线条，极致奠感

## 介绍

界面支持LIGHT/DARK及自定义主题，主要展示：
- 我方舰队、敌方舰队的编成与状态
- 出击海域、交战详情、战斗结算与掉落信息
- 应急修理要员或女神的装备情况

可以直接读取 poi 已经截获的战斗响应，也可以手动导入本地 JSON
`standalone/index.html` 页可以不启动 poi 打开本插件

## 安装

要求 **poi 10.0.0 或更新版本**，在 poi 的插件安装界面输入：
```text
poi-plugin-local-battle-replay
```
即可安装，也可下载 GitHub 源码，将项目内容放入`<poi 插件目录>/node_modules/poi-plugin-local-battle-replay/`后重启poi

## 示例数据
双击打开 [`standalone/index.html`](standalone/index.html)，页面自带一份 2020 年桃之节句 E1-3 T 点战斗示例数据

## 参考与致谢

使用Codex构建，战斗阶段与数据结构的实现过程中参考了 poi、poi-plugin-prophet、KC3Kai 和 kancolle-replay 等公开项目与资料，具体可见 [REFERENCES.md](REFERENCES.md)

## License

本项目代码以 [MIT License](LICENSE) 发布
舰队 Collection、poi 以及文中提到的其他项目和资源分别归其各自权利方所有；本项目的 MIT License 不代表对第三方内容重新授权
