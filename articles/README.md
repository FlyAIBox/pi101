# pi101：Harness Agent 工程实践

这套文章回答一个问题：模型会调用工具之后，怎样把 Agent 变成可接入业务、可观测、可评估、可恢复、成本可控的产品。

固定研究基线为 pi `v0.85.1`。实验固定使用单一模型，不做模型横评；结论保持模型无关。每篇统一包含业务问题、pi 源码链、外部实践、实验、运行轨迹、指标、故障恢复和产品化路径。

| # | 文章 | 核心产物 |
|---|---|---|
| 01 | [会调用工具，还不是产品](01-tool-calling-is-not-a-product.md) | 真实 API 最小闭环与脱敏 trace |
| 02 | [读懂 pi 的三层运行时](02-pi-runtime-map.md) | Loop / Agent / Harness 源码地图 |
| 03 | [先画业务状态机](03-business-workflow.md) | 确定性 workflow 与 Agent 决策边界 |
| 04 | [工具是业务事务](04-tools-permissions-idempotency.md) | contract、权限、幂等与审批 |
| 05 | [State 不是 Context](05-state-context-compaction.md) | session ledger、投影、compaction |
| 06 | [构建模型无关运行轨迹](06-observability-otel.md) | OTel 映射与脱敏策略 |
| 07 | [从回答评分到业务评测](07-evaluation.md) | outcome/trajectory/online eval |
| 08 | [恢复未知结果](08-reliability-recovery.md) | effect sandwich、retry、recovery |
| 09 | [按成功任务核算成本](09-cost-operations.md) | 预算信封、SLO、运维指标 |
| 10 | [个人研究与内容 Agent](10-personal-research-agent.md) | 可溯源研究产品 |
| 11 | [OPC 客户运营 Agent](11-opc-customer-ops-agent.md) | 从建议到受控业务动作 |
| 12 | [企业研发 Agent](12-enterprise-engineering-agent.md) | 多租户生产蓝图与验收清单 |
| 13 | [给 Pi 加上本地语音输入](13-local-voice-input.md) | 快捷键听写与本地音视频转写 |

## 扩展阅读

`readings/` 收录 Earendil（pi 团队）的原文剪藏，中英对照。文件名前缀对应配合阅读的正文编号：`00` 放在 01 之前，`99` 放在全部正文之后。

| 位置 | 文章 | 配合理由 |
|---|---|---|
| 01 之前 | [What is a Harness?](readings/00-what-is-a-harness.md) | 先建立 Harness 的定义和边界 |
| 与 02 同读 | [Pi, Minimal and Performant](readings/02-pi-minimal-and-performant.md) | pi 为什么只给 4 个工具、极简 system prompt |
| 与 05 同读（09 回看） | [Prompt Caching In Agents](readings/05-prompt-caching-in-agents.md) | context 设计如何影响缓存命中，进而影响成本与延迟 |
| 全部正文之后 | [The High Ground](readings/99-the-high-ground.md) | 2026–2031 年软件"高地"在哪里，作为收尾展望 |

## 复现实验

```bash
cd /Users/fly/code/pi101
npm install --ignore-scripts
npm run check
npm test

export DEEPSEEK_API_KEY='在本机设置，不要写入仓库'
npm run lab:01
```

实验的 JSONL 轨迹写入 `artifacts/`，该目录默认不提交。默认只记录元数据；只有显式设置 `PI101_TRACE_CONTENT=1` 才记录内容。

## 证据边界

- pi 行为引用固定 tag 的代码，不引用漂移的 `main`；
- Twitter/X 用于发现线索，结论回溯官方资料；
- “官方宣称”与“本项目实测”分开；
- 没有真实 API 运行就不展示伪造轨迹；
- 单次成功不是可靠性结论，关键样本必须重复运行。
