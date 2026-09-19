# 11｜OPC 客户运营 Agent：从建议到受控执行

## 业务问题

一人公司需要 Agent 承担客户健康检查、跟进草稿和续费提醒，但不能让它在错误对象、错误价格或错误语气下自动外发。OPC 人力少，更需要低运维和清晰接管，而不是最大自治。

## 产品合同

每天读取到期客户，生成风险与行动提案；低风险内部任务可自动创建，高风险外发和折扣必须批准。业务终态是 CRM 中的结构化 plan、审批记录和执行 receipt，不是聊天回复。

```text
scheduled
  → candidate customers
  → facts + policy
  → proposal
  → auto-create internal task | await owner
  → execute with idempotency key
  → receipt + next review date
```

## pi 落点

文章 01 的只读 `lookup_customer` 是第一步。迁移到 Harness 后，每个客户一个 lane；scheduler 只 `accept` operation，worker `drive`；人工审批持久化后再恢复。外发工具设 `replay: never`，CRM 内部任务若支持幂等 key 可设 `safe`。

## 外部实践

OpenAI 内部数据 Agent 的经验是减少重叠工具并继承已有权限；Anthropic managed agents 把 session、harness、sandbox 解耦；AWS/阿里云实践则把 session、trace 和 cost 作为运营单元。对 OPC 的直接含义是：宁可 5 个窄工具，不要一个万能 CRM API。

## 实操

加入 `create_followup_draft`、`create_internal_task`、`send_approved_email` 三个分层工具。模拟用户拒绝一次外发、修改收件人后再次提交。验收旧审批失效、发送只有一次、receipt 能回写 CRM、重启后仍能继续。

## 轨迹与指标

业务指标：续费风险发现率、提案采纳率、人工编辑幅度、跟进周期和收入影响。安全指标：误发、重复发、越权和过期审批。运维指标：每天需人工处理的异常数与单位成功跟进成本。

## 失败与恢复

CRM 读取失败时不生成事实；发送超时后先查询 message receipt；审批过期回到 owner；预算耗尽返回可执行摘要。任何未知外发结果都不能靠模型猜测。

## 产品化路径

先跑 shadow mode，只生成提案；达到评测门槛后自动创建内部任务；最后才开放经审批的外发。对 OPC，最重要的 SLO 是“每天异常能在十分钟内看懂并处理”，而不是全年无人值守。
