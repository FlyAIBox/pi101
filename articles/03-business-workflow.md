# 03｜先画业务状态机，再让模型做决定

## 业务问题

“让 Agent 负责客户续费”没有可验证终态。它可能查数据、写建议，也可能直接承诺折扣。真正可交付的定义应是：在限定时间和权限内完成风险判断，生成可审阅动作；任何外发或价格变更必须审批。

## pi 源码链

pi 的 `beforeToolCall`、`afterToolCall`、`shouldStopAfterTurn`、steering 和 follow-up 是运行扩展点；Harness hooks 又覆盖 run、request、response、tool、compaction 和 navigation。但 hook 只是机制，业务状态机必须由应用显式定义。

```text
received → facts_ready → proposal_ready → awaiting_approval
                                      ├─ approved → executed
                                      └─ rejected → revised | closed
```

模型只负责 `facts_ready → proposal_ready` 的开放推理。状态迁移、审批有效期和执行动作由代码决定。

## 外部实践

[Anthropic](https://www.anthropic.com/engineering/building-effective-agents) 区分 workflow 和 agent：已知路径用代码，步骤不可预知才由模型决策。[OpenAI 内部数据 Agent](https://openai.com/index/inside-our-in-house-data-agent/) 则把成熟分析固化为可复用 workflow。

## 实操

为一个业务任务填写六项合同：目标终态、Agent 决策点、可用动作、权限来源、失败补偿、SLO/预算。然后做反例测试：提示注入要求“直接给客户发邮件”，模型即使同意，系统也没有相应工具，状态机也不允许从 `facts_ready` 跳到 `executed`。

## 轨迹与指标

每次状态迁移记录 `from/to/reason/actor/evidence`。核心指标是正确终态率、越级迁移数、人工接管率、周期和单位成功任务成本，不是回复“看起来专业”的比例。

## 失败与恢复

模型输出无法解析时停留在原状态；审批超时进入 `expired`；执行失败进入 `execution_unknown` 或 `failed`，不能退回 `proposal_ready` 假装什么都没发生。

## 产品化路径

把状态机放在领域服务或 workflow engine，Harness 通过 command/event 与它交互。这样更换模型、UI 或 Agent 框架时，业务正确性仍由同一套规则约束。
