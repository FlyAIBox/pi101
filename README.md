# pi101：从 Agent Demo 到可运营 Harness

本项目以 pi `v0.85.1`（commit `d981de1229ef899957bbe968bc8dcda02a21f477`）为固定源码基线，拆解 Harness Agent，并通过可运行实验把业务流程、运行轨迹、评测、可靠性和成本控制连接起来。

## 基线

- pi release：`v0.85.1`，2026-09-05
- Node.js：`>=22.19.0`
- 语言：TypeScript
- 模型接入集中在 `src/model.ts`；Harness 与文章结论保持模型无关
- 资料截止日期：2026-09-25

## 快速开始

```bash
npm install --ignore-scripts
npm run check
npm test

# 二选一：在 shell 设置，或把 .env.example 复制为被 git 忽略的 .env
export DEEPSEEK_API_KEY="..."
npm run lab:01

# 使用上一条命令打印出的轨迹路径
npm run trace:summary -- artifacts/agent-trace-....jsonl
```

真实运行会把脱敏后的 Agent 轨迹写入 `artifacts/`。默认不记录提示词、工具参数和工具结果正文。

## 内容结构

- `articles/`：13 篇递进式实践文稿
- `labs/`：与文章对应的运行入口
- `src/`：跨实验复用的模型、轨迹和业务工具模块
- `research/`：官方源码、文档和外部一手资料研究底稿
- `test/`：不访问模型 API 的确定性测试

## 证据标准

pi 行为以固定 release 的源码和官方文档为准。Anthropic、OpenAI、AWS、阿里云、DeepSeek及 Twitter/X 内容用于设计对照；关键事实回溯到官方代码、文档、论文或可复现实验。Twitter/X 中无法交叉验证的内容只作为观点。
