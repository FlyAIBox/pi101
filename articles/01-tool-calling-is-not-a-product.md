# 01｜Agent 会调用工具，为什么仍不是产品

> 状态：代码、类型检查和确定性测试已完成；真实模型轨迹需在本机配置 API key 后生成。

## 业务问题

一个 demo 可以让模型查 CRM，再生成一段客户风险建议。但业务负责人真正关心的是：它查了哪个客户、使用了什么身份、有没有越权、失败后会不会重复发邮件、成本是多少、结论错了如何回放。工具调用成功，只证明模型能生成一个合法参数；它没有证明任务产生了正确业务终态。

本篇把最小 demo 改造成一个可检查的闭环：模型负责判断何时查询客户和怎样解释结果；确定性代码负责数据、权限、日志和停止边界。

## pi 源码链

实验使用进程内 `Agent`：

```text
Agent.prompt
  → runPromptMessages
  → agentLoop
  → stream assistant message
  → validate tool arguments
  → beforeToolCall policy
  → lookup_customer.execute
  → toolResult 写回 transcript
  → next model turn
  → agent_end
```

对应源码是 [`agent.ts`](https://github.com/earendil-works/pi/blob/v0.85.1/packages/agent/src/agent.ts) 和 [`agent-loop.ts`](https://github.com/earendil-works/pi/blob/v0.85.1/packages/agent/src/agent-loop.ts)。`Agent` 的事件监听器会按订阅顺序等待，因此 trace 写入是运行结算的一部分，而不是可能丢失的后台回调。

一个容易忽略的保护是：assistant 响应因长度截断时，pi 不执行其中的 tool call。参数只有一半却触发真实副作用，比普通格式错误危险得多。

## 外部实践

Anthropic 建议对路径明确的任务优先使用 workflow，只在不可预知的节点使用 Agent；OpenAI 内部数据 Agent 也限制重叠工具，并继承既有数据权限。共同原则是：模型选择“如何分析”，业务系统决定“允许做什么”。参见 [Building effective agents](https://www.anthropic.com/engineering/building-effective-agents) 与 [Inside our in-house data agent](https://openai.com/index/inside-our-in-house-data-agent/)。

## 实操

代码入口：[`labs/01-minimal-agent.ts`](/Users/fly/code/pi101/labs/01-minimal-agent.ts)。模型端口集中在 [`src/model.ts`](/Users/fly/code/pi101/src/model.ts)，业务工具在 [`src/business/customer.ts`](/Users/fly/code/pi101/src/business/customer.ts)。

```bash
cd /Users/fly/code/pi101
npm install --ignore-scripts
npm run check
npm test

export DEEPSEEK_API_KEY='...'
npm run lab:01
```

任务是分析 `ACME-042` 的续费风险。系统提示只规定输出合同和禁止动作；客户事实必须来自 `lookup_customer`。`beforeToolCall` 是第二层确定性 allowlist，即使模型请求别的工具也会被拒绝。

模型替换验收很简单：只能修改 `src/model.ts` 或环境变量；`customer.ts`、`trace.ts`、测试和业务提示不得修改。否则这个 Harness 仍与 provider 耦合。

## Agent 运行轨迹

轨迹由 [`src/trace.ts`](/Users/fly/code/pi101/src/trace.ts) 记录。默认形态如下，字段值必须来自真实运行，本文不预填：

```text
agent_start
turn_start
message_start(role=assistant)
message_update(...)
message_end(provider=..., model=..., usage=...)
tool_execution_start(tool=lookup_customer, args=REDACTED)
tool_execution_end(tool=lookup_customer, isError=false, result=REDACTED)
turn_end(toolResultCount=1)
turn_start
...
agent_end(messageCount=...)
```

JSONL 只记录相对耗时、事件类型、provider/model、stop reason、tool 名称、错误和 usage。提示词、工具参数及结果默认不进入日志。调试时可临时设置 `PI101_TRACE_CONTENT=1`，但不应在生产默认开启。

## 指标与验收

单次运行至少计算：

| 指标 | 验收 |
|---|---|
| 任务终态 | 回答含风险、证据、动作、审批判断 |
| 事实依据 | 客户事实全部能映射到 tool result |
| 工具选择 | 恰好调用一次 `lookup_customer` |
| 安全 | 未请求或执行写操作 |
| 收敛 | 有限 turn 内结束，无循环 |
| 成本 | input/output/cache token 与估算费用 |
| 延迟 | 总时长、模型耗时、工具耗时 |
| 隐私 | 默认 trace 不含客户 ID 和工具正文 |

真实评测不能只跑一次。至少 20 次，报告任务通过率、工具参数正确率、P50/P95 延迟、平均成本和失败类型分布。

## 失败与恢复

- 无 API key：启动前失败，不产生“成功”轨迹；
- 客户不存在：工具返回确定性 not found，模型不得编造；
- 非 allowlist 工具：`beforeToolCall` 拒绝；
- 模型 429/5xx：本篇只记录失败，不在业务层无限重试；
- 进程在工具后崩溃：本篇的 `Agent` 无 durable recovery，这是刻意暴露的限制，文章 08 用 `AgentHarness` 解决。

## 产品化路径

这个实验离产品还有四步：把 transcript 换成 durable session；把查询身份绑定当前用户；把 trace 接到 OTel；把自然语言答案之外的业务终态写入结构化存储。不要先加更多工具或多 Agent，那只会放大尚未解决的状态、权限和恢复问题。
