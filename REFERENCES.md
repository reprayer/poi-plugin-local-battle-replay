# 参考项目、代码与数据资料

本文档记录开发 `poi-plugin-local-battle-replay` 时实际查阅过的公开项目、源码位置、响应样例和机制资料，便于后续致谢与许可证核对。

本项目没有打包舰队 Collection 的图片、语音、音乐或字体，也没有把下列项目的播放器代码整段复制进来。核心解析器、DOM 播放器、白底文字界面和网络锁均针对本项目重新编写。下列链接只作为本地 Markdown 文本存在，插件运行时不会访问它们。

## 直接代码参考

### poi

- 项目：[`poooi/poi`](https://github.com/poooi/poi)
- 配置源码：[`lib/config.ts`](https://github.com/poooi/poi/blob/master/lib/config.ts)
- 地图状态：[`views/redux/info/maps.ts`](https://github.com/poooi/poi/blob/master/views/redux/info/maps.ts)
- 出击状态：[`views/redux/sortie/index.ts`](https://github.com/poooi/poi/blob/master/views/redux/sortie/index.ts)
- FCD 地图类型与数据：[`views/redux/fcd.ts`](https://github.com/poooi/poi/blob/master/views/redux/fcd.ts)、[`assets/data/fcd/map.json`](https://github.com/poooi/poi/blob/master/assets/data/fcd/map.json)
- 按包名安装：[`views/services/plugin-manager/index.ts`](https://github.com/poooi/poi/blob/master/views/services/plugin-manager/index.ts)、[`npm-utils.ts`](https://github.com/poooi/poi/blob/master/views/services/plugin-manager/npm-utils.ts)
- 开发文档：[`Utilities in poi`](https://dev.poi.moe/docs/api/poi-utils)
- 查阅内容：poi 插件导出约定、插件窗口模式、宿主提供的 React/Redux 环境、响应 action、插件重载方式、npm 包名直接安装，以及 `APPDATA_PATH/config.cson` 和 `window.config.get/set` 的配置读写约定；还核对了活动难度 `api_selected_rank`、出击 `api_no` 和 FCD 路线编号到字母点的本地映射。
- 本项目中的对应实现：`index.js` 的 `reducer`、`windowMode`、独立插件视窗和宿主状态读取；`src/theme.js` 只在 `plugin.poi-plugin-local-battle-replay.theme` 子节点保存主题模式与两个颜色。
- 许可证：以 [`poooi/poi` 仓库许可证](https://github.com/poooi/poi/blob/master/LICENSE)及其对资源文件的说明为准。

### poi 未卜先知

- 项目：[`poooi/plugin-prophet`](https://github.com/poooi/plugin-prophet)
- 实际查阅的发布源码映射：
  - [`poi-plugin-prophet@7.4.5/index.js.map`](https://app.unpkg.com/poi-plugin-prophet@7.4.5/files/index.js.map)
  - [`poi-plugin-prophet@7.3.1/redux.js.map`](https://app.unpkg.com/poi-plugin-prophet@7.3.1/files/redux.js.map)
  - [`poi-plugin-prophet@6.9.5/utils.js.map`](https://app.unpkg.com/poi-plugin-prophet@6.9.5/files/utils.js.map)
- 查阅内容：
  - `game.response`/响应路径的订阅方式；
  - 昼战、夜战、战果数据包的归集；
  - `sortieMapId`、`currentNode`、`api_event_id`、`api_event_kind` 的读取边界；
  - 阵形、交战形态、制空状态和战斗前瞻使用的数据字段；
  - 联合舰队、基地航空队及基地防空数据的结构。
- 本项目没有移植未卜先知的 UI、图片、通知、历史文件写入或预测算法。

### KC3Kai

- 项目：[`KC3Kai/KC3Kai`](https://github.com/KC3Kai/KC3Kai)
- 主要源码位置：
  - [`src/library/modules/BattlePrediction.js`](https://github.com/KC3Kai/KC3Kai/blob/master/src/library/modules/BattlePrediction.js)
  - [`src/library/modules/BattlePrediction/`](https://github.com/KC3Kai/KC3Kai/tree/master/src/library/modules/BattlePrediction)
  - [`src/library/modules/AntiAir.js`](https://github.com/KC3Kai/KC3Kai/blob/master/src/library/modules/AntiAir.js)
- 查阅内容：
  - 战斗响应中的初始 HP、阶段伤害、联合舰队舰位和昼夜包追加；
  - `battleTypes` 阶段表中机动/运输、水打、单舰队分别面对通常/敌联合舰队时，`hougeki1/2/3` 与 `raigeki` 的排列；
  - `parseAttacker` 对联合舰位的直接读取，以及联合舰队夜战金刚级类型 104 需要增加护卫偏移、两段攻击分别属于一二号舰的已知 API 例外；
  - `api_at_eflag`、`api_at_list`、`api_df_list`、`api_damage`、`api_at_type`、`api_sp_list`；
  - 航空战、开闭幕雷击、友军、支援和损害管制相关的数据形状；
  - KC3 sortie replay 的 `fleet1`、`fleet2`、`battles[].data`、`battles[].yasen` 输入结构。
- 许可证：[`KC3Kai/KC3Kai` MIT License](https://github.com/KC3Kai/KC3Kai/blob/master/LICENSE)。

### kancolle-replay

- 项目：[`KC3Kai/kancolle-replay`](https://github.com/KC3Kai/kancolle-replay)
- 在线播放器：[`battleplayer.html`](https://kc3kai.github.io/kancolle-replay/battleplayer.html)
- 主要源码位置：
  - [`battleplayer.html`](https://github.com/KC3Kai/kancolle-replay/blob/master/battleplayer.html)
  - [`js/battleplayer.js`](https://github.com/KC3Kai/kancolle-replay/blob/master/js/battleplayer.js)
  - [`js/player.js`](https://github.com/KC3Kai/kancolle-replay/blob/master/js/player.js)
  - [`sources.html`](https://github.com/KC3Kai/kancolle-replay/blob/master/sources.html)
- 查阅内容：回放输入结构、事件队列、逐事件推进、昼夜战衔接、进度控制以及战斗日志的表现方式。
- 未采用内容：原项目图片、音频、远程资源、分享功能、模拟器和画布动画。
- 许可证：[`KC3Kai/kancolle-replay` MIT License](https://github.com/KC3Kai/kancolle-replay/blob/master/LICENSE)。

## 实际响应样例

以下样例仅用于确认服务器字段和数组索引，没有把原始响应打包进发布文件。GitHub Gist 未声明可再分发许可证时，本项目只记录链接和观察结论。

- Nishisonic：[`ec_night_to_day`](https://gist.github.com/Nishisonic/284cee49750fc88a984bd28e5b0c0971)
  - 用于确认夜转昼、`api_n_hougeki1/2`、`api_sp_list`、基地航空数组以及重复 `api_base_id`。
- Nishisonic：[`輸送連合 vs 敵通常`](https://gist.github.com/Nishisonic/b431857f48af62f3b7eb8b8f7c8731c9)
  - 用于确认联合舰队舰位、基地航空、开幕雷击、闭幕雷击和支援数据。
- Nishisonic：[`80e7bae9200921ba02a1f5bbdb40b15d`](https://gist.github.com/Nishisonic/80e7bae9200921ba02a1f5bbdb40b15d)
  - 用于核对普通战斗阶段字段。
- Nishisonic：[`7433bfd6bc8c844c0843b3c60b0a7dd1`](https://gist.github.com/Nishisonic/7433bfd6bc8c844c0843b3c60b0a7dd1)
  - 用于核对七舰编成、航空战和对空相关字段。
- 用户提供的匿名实战响应：
  - 用于复现闭幕雷击零基索引错误；
  - 用于确认 `api_air_fire`、两次相同 `api_base_id` 的基地攻击和真实 HP 结果；
  - 原始内容不写入 `REFERENCES.md`，也不打包分发。

## API 与机制资料

- [七四式电子观测仪：API 字段表](https://github.com/andanteyk/ElectronicObserver/blob/develop/ElectronicObserver/Other/Information/apilist.txt)
  - 用于交叉核对 `api_friendly_info.api_ship_id/api_ship_lv`、活动难度 `api_selected_rank` 的 1–4 映射，以及友军响应只提供 master ID 而不直接提供舰名。

- [poi 开发文档：Utilities with redux](https://dev.poi.moe/docs/api/redux)
  - 用于核对 `store.sortie.escapedPos` 的零基舰位与联合舰队拼接规则，以及 `@@BattleResult` 中 MVP、掉落舰船和掉落物品字段。
- [Guide to reading Raw API Data](https://kancolle.fandom.com/wiki/User_blog%3ARephira/Guide_to_reading_Raw_API_Data)
  - 用于交叉核对 `svdata=...`、`api_data` 和常见战斗字段。
- [KanColle Wiki：Night Battle](https://en.kancollewiki.net/Combat/Night_Battle)
  - 用于核对夜战连击、夜战 CI 和损害管制表现。
- [KanColle Wiki：Land Base](https://en.kancollewiki.net/Land_Base)
  - 用于理解基地航空队队次、出击次数和基地防空语义；播放器仍只显示响应直接给出的字段。
- [C86 KanColle API：Battle](https://np-complete.gitbook.io/c86-kancolle-api/battle)
  - 用于交叉核对战斗阶段、阵形、航空和炮雷击数据结构。

## 本项目的独立实现边界

- 不重新计算服务器已经判定的命中、暴击或伤害，只播放响应值。
- 不根据装备或数组出现次数推测未返回的事件；节点字母只采用 poi FCD 已明确给出的路线终点映射，缺失时保留数字编号。
- `api_base_id` 可直接显示基地队次；当前样例没有独立波次字段，因此不自行标注第一波/第二波。
- 地图与节点只在 poi 内存或地图响应已经提供 `sortieMapId`、`currentNode`、`api_no` 等字段时显示；字母点只读 poi 已加载的 `fcd.map`，不自行生成映射。
- 所有舰名和导入文本通过 `textContent` 写入；运行时代码不包含上传、遥测、远程脚本或远程素材加载。
