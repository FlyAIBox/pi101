# 06｜构建模型无关的 Agent 运行轨迹

## 业务问题

只记录请求和最终回答，无法判断失败来自上下文、模型、工具、权限还是恢复。反过来把完整提示词和工具结果全写日志，又会制造隐私、合规和存储风险。

## pi 源码链

pi `@earendil-works/pi-telemetry` 只定义显式 `TelemetryContext/Span` 与 schema，不绑定 exporter。Harness schema 覆盖 run、turn、step、tool、hook、checkpoint、compaction、navigation、session write 和 AI request，并携带 usage、cost、cache、TTFC、replay/recovery 等属性。

文章 01 的 [`src/trace.ts`](/Users/fly/code/pi101/src/trace.ts) 先用 JSONL 演示同一原则：元数据默认开启，内容显式 opt-in。后续只需增加 OTel adapter，不修改业务工具。

## 外部实践

OpenAI Agents SDK 记录 agent/generation/tool/guardrail/handoff spans；AWS AgentCore Evaluations 直接消费 OTel GenAI traces；阿里云 AgentRun 按 user/session/agent 归集模型与工具成本。OTel GenAI Agent 语义仍标记为 Development，因此自定义字段必须版本化。

## 实操

建议 span 树：

```text
agent.task
├─ agent.turn
│  ├─ agent.context.build
│  ├─ gen_ai.client.operation
│  ├─ agent.tool.execute
│  └─ agent.checkpoint
├─ agent.human_intervention
└─ agent.evaluation
```

自定义字段使用 `pi101.schema.version`、`task.id`、`business.outcome`、`budget.*`、`approval.*`、`recovery.*`。大 payload 放受控 artifact store，span 只保存摘要、分类和引用。

## 轨迹与指标

技术指标包括 TTFT、模型时长、工具 P95、queue age、token/cache/cost、重试和 exporter 丢失率；业务维度包括 tenant、case、outcome 和人工接管。禁止把客户 ID、API key、原始文档放入高基数 attribute。

## 失败与恢复

exporter 不可用不能拖垮主任务；采用有界队列、采样、批量导出和 drop counter。trace 写入失败应可见，但不能重试到耗尽业务预算。敏感内容误采集需要支持删除 artifact，而不是把正文复制进不可删除的指标标签。

## 产品化路径

先定义内部 canonical events，再分别适配 OTel、审计库和实时 UI。不要让任一厂商 span 名称成为领域模型；规范升级只改 adapter。
