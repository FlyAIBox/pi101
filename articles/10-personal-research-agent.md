# 10｜个人研究与内容 Agent：从搜索结果到可溯源文稿

## 业务问题

个人研究 Agent 最容易做成“搜索、总结、写一篇看似完整的文章”。真正难的是证据等级、冲突处理、引用可达、事实与观点分离、增量更新和发布前审阅。

## 产品合同

输入是研究问题、截止日期和读者；终态是一个 evidence bundle：来源登记表、摘录/摘要、相互支持或冲突的 claim、文章草稿、未验证项。发布始终需要人工批准。

```text
question
  → deterministic source plan
  → agent discovery
  → primary-source fetch
  → claim/evidence graph
  → contradiction check
  → draft
  → human review
```

## pi 落点

每个来源、claim、draft 都作为 artifact/entry 引用保存；context builder 只投影当前章节所需证据。branch 用来比较不同论证结构，compaction 只能摘要搜索过程，不能丢失引用。steering 用于研究中途改变范围，follow-up 用于主任务完成后的编辑请求。

## 外部实践

Anthropic 的 context engineering 建议 just-in-time 检索，长任务依靠结构化笔记；OpenAI 的 repo-as-system-of-record 实践强调 Agent 看不到的脑内知识等于不存在。本系列的 [`source-register.md`](/Users/fly/code/pi101/research/source-register.md) 就是最小事实源。

## 实操

以“durable Agent tool execution”为题：X 只发现关键词；最终结论至少有固定版本源码或官方文档。工具只返回标准化 `Source` 和 `Evidence`，写作 Agent 不能直接浏览未登记网页。随机抽 10 个 claim，验证链接、时间、主体、支持方向和是否过期。

## 轨迹与指标

记录 query、来源类型、fetch 结果、claim-evidence edge、引用使用和人工修改。指标包括 primary-source ratio、unsupported claim、dead link、contradiction、每千字成本、研究周期和发布后更正数。

## 失败与恢复

页面不可达时保留缺口，不凭摘要补全；来源冲突时并列呈现；X 无法直接验证时标为观点；写作中断后从 claim graph 和 section checkpoint 恢复，不重跑所有搜索。

## 产品化路径

个人版可用本地 Markdown + JSONL；OPC 产品增加定时更新和内容审批；企业版增加来源授权、保留策略、审计和多租户隔离。模型可以换，证据 schema、claim graph 和发布门禁不变。
