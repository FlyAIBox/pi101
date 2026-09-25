# 13｜给 Pi 加上本地语音输入：pi-voice 实操

> 本文基于 [`@earendil-works/pi-voice`](https://www.npmjs.com/package/@earendil-works/pi-voice) `0.1.0` 与固定源码提交 [`f28e440`](https://github.com/earendil-works/pi-voice/tree/f28e440bcc82ddad134cc6e54c8cc3f3f45eccdd)。

## 业务问题

语音输入解决的是输入摩擦，不会自动把 Agent 变成“实时语音助手”。Pi Voice 在本机完成 speech-to-text，提供两条清晰的使用路径：用户按快捷键口述，把转写结果放入编辑器；Agent 调用 `transcribe_file`，读取本地音频或视频中的语音。

这两条路径的控制权不同：听写结果先回到编辑器，用户检查后再发送；文件转写结果是工具返回值，会进入当前 Agent 任务的上下文。

```text
麦克风 ── 快捷键录音 ── 本地转写 ── 编辑器 ── 用户确认发送

音频/视频 ── FFmpeg 解码 ── 本地转写 ── tool result ── Agent
```

Pi Voice 当前不提供语音合成，也不提供持续双向的 `/voice` 对话模式；`/voice` 仍是为未来能力保留的命令。

## 同类工具：Handy

[Handy](https://handy.computer/) 是一个免费、开源、跨平台的本地语音转文字桌面应用。它同样通过快捷键录音，在本机使用 Whisper 或 Parakeet 模型完成转写，但会把结果粘贴到当前获得焦点的任意应用，而不是只服务于 Pi。

- 官网与使用演示：[handy.computer](https://handy.computer/)
- 源码：[cjpais/Handy](https://github.com/cjpais/Handy)
- 安装包：[GitHub Releases](https://github.com/cjpais/Handy/releases)

| 维度 | Pi Voice | Handy |
|---|---|---|
| 产品形态 | Pi 扩展 | 独立桌面应用 |
| 输入范围 | Pi 的编辑器 | 任意可输入文字的应用 |
| 本地语音识别 | 支持 | 支持 |
| Agent 文件转写工具 | 提供 `transcribe_file` | 不以 Pi 工具形式提供 |
| 适合场景 | 在 Pi 内口述提示词、让 Agent 读取音视频 | 全系统语音输入 |

如果主要需求是在不同应用中替代键盘输入，Handy 的覆盖面更广；如果希望转写能力直接进入 Pi 的 Agent 工作流，尤其需要 `transcribe_file`，Pi Voice 更贴合。两者可以同时安装，但应避免配置相同的全局快捷键。

## pi 扩展链

扩展入口只做注册，实际功能在第一次使用时延迟加载。它向 Pi 注册三个入口：

- 默认 `Ctrl+Alt+Z` 快捷键：开始或停止麦克风录音；
- `/voice-settings`：选择偏好语言、本地模型、识别语言、麦克风和快捷键；
- `transcribe_file`：让 Agent 转写本地音频或视频。

对应源码是 [`src/index.ts`](https://github.com/earendil-works/pi-voice/blob/f28e440bcc82ddad134cc6e54c8cc3f3f45eccdd/src/index.ts)、[`src/runtime.ts`](https://github.com/earendil-works/pi-voice/blob/f28e440bcc82ddad134cc6e54c8cc3f3f45eccdd/src/runtime.ts) 和 [`src/file-transcription.ts`](https://github.com/earendil-works/pi-voice/blob/f28e440bcc82ddad134cc6e54c8cc3f3f45eccdd/src/file-transcription.ts)。`/transcribe` 只是 `/voice-settings` 的兼容别名，不是执行一次转写的命令。

## 安装与首次配置

Pi Voice 要求 Node.js 22 或更高版本。先安装扩展：

```bash
pi install npm:@earendil-works/pi-voice
pi
```

进入 Pi 的交互式 TUI 后运行：

```text
/voice-settings
```

按向导选择偏好语言、模型、识别语言、麦克风和快捷键。模型只会在用户确认后下载。以后仍可用 `/voice-settings` 修改配置；如果改了快捷键，按界面提示执行 `/reload`，让 Pi 重新注册快捷键。

如果曾通过 Git 安装旧版 `pi-transcribe`，先移除旧扩展再安装 Pi Voice：

```bash
pi remove git:github.com/earendil-works/pi-transcribe
pi install npm:@earendil-works/pi-voice
```

## 实操一：快捷键听写

1. 在 Pi TUI 中按 `Ctrl+Alt+Z` 开始录音；如果配置过其他快捷键，以设置页显示为准。
2. 说一句包含专有名词、数字和标点意图的话，例如：“检查 ACME-042 的续费风险，先不要修改 CRM。”
3. 再按一次快捷键停止录音并开始本地转写。
4. 检查写入编辑器的文本，修正客户编号或专有名词后再发送。

这条路径调用 `pasteToEditor`，不会替用户自动提交消息。默认按 `Esc` 可以丢弃正在录制或转写的内容；该键位也可以在 Pi 的 keybindings 配置中修改。

## 实操二：转写本地音视频

文件转写需要系统能够执行 FFmpeg。先检查：

```bash
ffmpeg -version
```

如果尚未安装，可按系统选择一种方式：

```bash
# macOS with Homebrew
brew install ffmpeg

# Debian / Ubuntu
sudo apt install ffmpeg

# Windows with winget
winget install Gyan.FFmpeg
```

FFmpeg 不在 `PATH` 时，在启动 Pi 前显式指定：

```bash
export PI_VOICE_FFMPEG_PATH=/absolute/path/to/ffmpeg
pi
```

完成一次 `/voice-settings` 配置后，在 Pi 中输入：

```text
请调用 transcribe_file 转写 ./meeting.m4a，只输出逐字稿，不要总结。
```

也可以传绝对路径或视频文件。工具按当前工作目录解析相对路径，使用 FFmpeg 提取第一条音轨，再用已配置的本地模型转写。解码后的音频上限是 128 MiB，约等于 35 分钟的 16 kHz 单声道音频；更长文件应先切分。长转写会在 Agent 上下文中截断，并把完整文本保存到临时文件。

## 隐私与权限边界

“本地 speech-to-text”只说明音频识别在本机执行，不代表后续链路全部留在本机：

- 快捷键听写先进入编辑器，是否发送由用户决定；
- `transcribe_file` 的返回文本会成为工具结果，后续可能随当前上下文发给所配置的模型 provider；
- 首次配置需要下载本地转写模型；
- 文件工具可读取 Agent 进程有权限访问的本地路径，因此仍应遵守工作区和敏感数据边界；
- 完整长转写可能写入系统临时目录，不应把临时目录当作长期、受控的业务存储。

因此，敏感录音在使用前仍要判断：能否进入 Agent 上下文、是否允许发送给模型 provider、临时转写文件应由谁清理。

## 轨迹与指标

语音输入至少应观察四类指标：录音时长、转写耗时、识别后人工修改率和最终发送率。文件转写再增加 FFmpeg 解码耗时、无音轨/无语音比例、截断次数和临时文件数量。

一条合格的验收路径是：首次配置成功；快捷键可以开始、停止和取消；中文、英文、数字与业务专有名词经过人工检查可用；文件工具能处理一个短音频和一个带音轨的视频；超长文件被明确拒绝而不是耗尽内存。

不要只统计“转写成功”。如果用户频繁重录、逐字修改或最终不发送，语音入口并没有真正降低输入成本。

## 故障与恢复

- 找不到本地模型：重新运行 `/voice-settings` 选择并确认下载；
- macOS 麦克风被拒绝：在“系统设置 → 隐私与安全性 → 麦克风”中允许当前终端应用；
- 快捷键冲突：在 `/voice-settings` 中修改，然后执行 `/reload`；
- FFmpeg 不可用：安装后重试，或设置 `PI_VOICE_FFMPEG_PATH`；
- 文件没有音轨：换用包含音频流的文件，工具不会对无音轨视频伪造结果；
- 文件超过限制：先切分为小于约 35 分钟的片段；
- 转写结果为空：检查麦克风、音量、语言和模型设置，不把“未检测到语音”当成成功。

## 产品化路径

Pi Voice 适合作为本地交互入口，而不是新的业务事实源。进入 Agent 之后，转写文本仍需经过与键盘输入相同的权限、审计、上下文和数据治理。若要用于会议纪要、访谈分析或客服录音，还应补齐文件保留策略、说话人分离、时间戳、敏感信息脱敏、人工校对和结构化落库。

最重要的边界是：语音只改变输入方式，不改变 Harness 对工具、状态、权限和业务终态的责任。
