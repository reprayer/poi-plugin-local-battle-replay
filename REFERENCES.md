# 参考与致谢

## poi

项目：

- [poooi/poi](https://github.com/poooi/poi)
- [poi 开发文档](https://dev.poi.moe/)

主要用于了解：

- poi 插件的基本接入方式；
- 战斗响应在宿主中的传递；
- 舰队、地图、节点和活动难度等已有状态；
- 插件配置和 npm 安装方式。

## poi-plugin-prophet

项目：

- [poooi/plugin-prophet](https://github.com/poooi/plugin-prophet)

主要用于交叉确认 poi 中战斗响应的订阅方式，以及昼战、夜战、战果、基地航空队等数据的组织方式。

## KC3Kai

项目：

- [KC3Kai/KC3Kai](https://github.com/KC3Kai/KC3Kai)

主要参考其公开代码中对舰队 Collection 战斗数据结构的处理，包括：

- 通常舰队与联合舰队；
- 炮击、雷击、航空战等阶段顺序；
- 昼夜战衔接；
- 攻击者、目标和伤害数据；
- KC3 sortie replay 数据结构。

KC3Kai 使用 MIT License，具体授权以其项目仓库为准。

## kancolle-replay

项目：

- [KC3Kai/kancolle-replay](https://github.com/KC3Kai/kancolle-replay)

主要用于参考战斗回放的事件队列、逐事件推进、昼夜战衔接和进度控制思路。

## 其他资料

开发过程中还查阅了以下公开资料，用于交叉确认部分 API 字段和战斗机制：

- [七四式电子观测仪 API 字段表](https://github.com/andanteyk/ElectronicObserver/blob/develop/ElectronicObserver/Other/Information/apilist.txt)
- [KanColle Wiki: Night Battle](https://en.kancollewiki.net/Combat/Night_Battle)
- [KanColle Wiki: Land Base](https://en.kancollewiki.net/Land_Base)
- [C86 KanColle API: Battle](https://np-complete.gitbook.io/c86-kancolle-api/battle)
- poi `lib-battle`：[`features/friendly_info/1584729348536.json`](https://github.com/poooi/lib-battle/blob/master/tests/fixtures/battle-detail/features/friendly_info/1584729348536.json)
- Nishisonic：[`ec_night_to_day`](https://gist.github.com/Nishisonic/284cee49750fc88a984bd28e5b0c0971)
- Nishisonic：[`輸送連合 vs 敵通常`](https://gist.github.com/Nishisonic/b431857f48af62f3b7eb8b8f7c8731c9)
- Nishisonic：[`7433bfd6bc8c844c0843b3c60b0a7dd1`](https://gist.github.com/Nishisonic/7433bfd6bc8c844c0843b3c60b0a7dd1)
- Nishisonic：[`80e7bae9200921ba02a1f5bbdb40b15d`](https://gist.github.com/Nishisonic/80e7bae9200921ba02a1f5bbdb40b15d)

部分公开响应样例仅用于确认字段和索引，没有作为原始数据随插件发布。

## 实现原则

本播放器尽量只展示服务器响应或 poi 已明确提供的信息：

- 不重新计算服务器已经给出的命中和伤害结果；
- 不根据缺失字段猜测战斗事件；
- 不联网补全舰名、节点、装备或其他资料；
- 不打包舰队 Collection 的图片、语音、音乐或字体。
