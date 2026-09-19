# 07｜从“回答像不像”到业务结果评测

## 业务问题

同一任务的回答措辞不同，业务结果可能等价；回答写得漂亮，CRM 却可能被改错。单纯 LLM-as-judge 评分文本，会把 Agent 最重要的工具轨迹和最终系统状态排除在外。

## pi 源码链

pi 的 Agent/Harness 事件提供 transcript 与 tool trajectory，session entry 和 operation result 提供可恢复事实，usage ledger 提供成本。评测 runner 应消费这些公共输出，而不是在 Agent 内嵌一个 grader。这样 evaluation harness 和 agent harness 才能独立演化。

## 外部实践

Anthropic 明确区分 transcript 和 outcome，也区分 agent harness 与负责运行、记录、评分、聚合的 evaluation harness。OpenAI 内部数据 Agent 同时比较生成 SQL 与真实查询结果，避免只按字符串判断。AWS 把在线采样、按 trace 选择的临时评测和带 ground truth 的批量回归分开。

## 实操

建立六层指标：

1. 业务：正确终态、周期、人工接管、单位成功任务成本；
2. Session：目标达成、turn 数、恢复和循环；
3. Tool：选择、参数、结果、幂等和补偿；
4. Model：格式、token、延迟、cache；
5. 安全：越权、外传、误批和审计完整性；
6. 运维：crash recovery、queue、sandbox、trace delivery。

把 `ACME-042` 样本运行至少 20 次。确定性 grader 检查是否调用正确工具、事实是否来自结果、是否包含结构化四项输出；人工或模型 grader 只评价建议质量。

## 轨迹与指标

每个 trial 固定代码 commit、配置、模型 ID、prompt、tool schema 和数据快照。报告均值还不够，要给通过次数、失败类型、P50/P95、成本分布和置信区间。训练/调优样本与 held-out 回归集分开。

## 失败与恢复

grader 自身会错。上线前必须人工阅读一批 transcript 校准假阳性/假阴性；grader 版本进入结果。长批次要 checkpoint，避免 runner 崩溃后重跑全部真实 API 调用。

## 产品化路径

把生产 trace 采样回流成候选 eval，但先脱敏和人工标注。离线 eval 做发布门禁，在线监测发现真实分布漂移，A/B 验证改动是否改善业务结果；三者不能互相替代。
