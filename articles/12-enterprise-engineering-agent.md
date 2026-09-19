# 12｜企业研发 Agent：生产蓝图与验收清单

## 业务问题

企业研发 Agent 会接触源码、工单、CI、凭据和网络。单用户本地 demo 的隐含信任全部失效：必须处理租户、身份、并发、长任务、环境隔离、发布门禁、审计和成本分摊。

## 产品蓝图

```text
Channels / API / IDE
        ↓
Tenant auth + policy + admission control
        ↓
Harness control plane ─── Session / operation store
        ↓                           ↓
Model adapter                 Event / usage ledger
        ↓
Ephemeral sandbox ─── Tool gateway ─── Enterprise systems
        ↓
OTel + audit + eval + cost attribution
```

业务任务、session、harness worker 和 sandbox 是不同生命周期。worker 可重启，sandbox 可重建，session 不丢；用户身份透传到工具网关，模型永远不接触长期凭据。

## pi 落点

`AgentHarness` 提供 lane、operation、entry、usage、checkpoint、abort、steer、follow-up、compaction 和 navigation。应用补齐 durable Session/Storage、worker queue、tenant policy、sandbox provisioner、tool gateway 与 telemetry exporter。不要把这些责任塞进 system prompt。

## 外部实践

OpenAI Codex App Server 将同一 core 通过协议暴露给多个客户端；Anthropic 把 brain/session/hands 分成独立故障域；AWS AgentCore 和阿里云 AgentRun 将 runtime、memory、identity、gateway、observability 组件化；DeepSeek Harness 的 developer preview 展示了插件 seam，但官方明确不是 production-ready。

## 实操

构建“修复一个有回归测试的 bug”任务：从工单创建 operation，临时 worktree/sandbox 内执行，网络默认 deny，只允许包镜像和代码托管；测试通过后产生 patch artifact，由人工或 CI 合并。kill worker 和 sandbox 后恢复，验证没有重复提交、凭据未进入 transcript、旧环境可以销毁。

## 轨迹与指标

以 tenant/task/session/lane/operation/sandbox/commit 关联完整 trace。业务指标是任务完成、review 通过率、回滚和 lead time；安全指标是越界写、网络拒绝、secret exposure；运维指标是 queue age、恢复率、sandbox 冷启动、trace 丢失；成本指标是每个合并变更成本。

## 故障与恢复

必须注入 provider 429、工具超时、worker 崩溃、sandbox 丢失、审批期间部署、context overflow、CI 不稳定和 exporter 故障。任何测试只通过一次的路径都不能声称可靠。

## 上线清单

- [ ] 业务终态和责任人明确
- [ ] provider 只在 adapter/config 出现
- [ ] session、worker、sandbox 独立故障域
- [ ] 工具身份、数据范围、网络、幂等和审批明确
- [ ] 不可逆 effect 有 receipt 或人工核对状态
- [ ] trace 默认脱敏，审计不可被普通 hook 绕过
- [ ] 离线 eval、在线监测、回归门禁均存在
- [ ] wall time、turn、token、tool、cost、human wait 有预算
- [ ] 多租户隔离与成本归因经过验证
- [ ] 降级、接管、补偿和停机手册可执行

## 结论

Harness 的价值不是让模型更聪明，而是把不确定的模型决策放进确定的工程边界。做到这一点，模型升级只影响能力和经济性，不会重写业务、审计和恢复体系。
