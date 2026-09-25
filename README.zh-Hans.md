# Haru PC

[English](README.md) · [한국어](README.ko.md) · [日本語](README.ja.md) · **简体中文** · [繁體中文](README.zh-Hant.md) · [Français](README.fr.md) · [Deutsch](README.de.md) · [Español](README.es.md) · [Português](README.pt-BR.md)

**在手机上吩咐 Haru，活儿交给电脑来干。**

Haru PC 是 **Haru – AI 助手**（iPhone 和 Android）的桌面端配套软件。你在手机上给 Haru 布置任务，比如“把我电脑上的 Reports 文件夹整理一下”或者“找到上个月的发票发给我”，Haru PC 就会在你自己的电脑上接收任务、完成任务，再把结果发回你的手机。

Haru PC 运行在开源个人 AI 助手 [OpenClaw](https://github.com/openclaw/openclaw)（MIT 许可证）之上。安装程序会部署一个经过测试的 OpenClaw 版本，并在其上添加 Haru PC 插件：包括 Haru 的助手人设、手机审批安全机制，以及一套开箱即用的技能。Haru PC 是非官方发行版，与 OpenClaw 项目没有隶属或合作关系。

> **状态：** 早期预览版。难免有不完善之处，发现问题欢迎反馈。

---

## 工作原理

```
 Haru App（手机）                         Haru PC（你的电脑）
 ─────────────────                        ───────────────────────
 “整理一下我电脑上的 Reports 文件夹”
   → 卡片：“发送到你的电脑？”[执行]
   ── 直连，不经云端中转 ─────────────────▶ 接收任务
                                            规划步骤
   ◀── “即将移动 12 个文件，可以吗？” ───── 有风险的操作先询问
   [批准]  ───────────────────────────────▶ 执行任务
   ◀── “完成：移动 12 个，重复 3 个” ────── 发回结果
```

- **手机通过加密连接直接与你自己的电脑通信。** 在同一个 Wi-Fi 下，两者会自动发现对方。不在家时，可以通过你自己的 [Tailscale](https://tailscale.com) 网络连接。整个过程不经过我们运营的任何服务器。
- **未经你同意，什么都不会执行。** 凡是修改文件、运行命令、发送消息或使用浏览器的操作，都会先以卡片形式显示在手机上，只有你点了 **批准** 才会执行。
- **你的数据只属于你。** 对话、记忆和凭据只保存在你的电脑和手机上。

---

## Haru PC 能做什么

| 在手机上说 | Haru PC 会 |
|---|---|
| “整理一下下载文件夹” | 按类型和日期把文件归入不同文件夹，并报告重复文件 |
| “找到上周那份合同 PDF 发给我” | 搜索你的文件，并把文件发送到你的手机 |
| “把这份会议记录做成 Word 文档” | 在“文稿”文件夹中生成一个 `.docx` 文件 |
| “总结一下桌面上的那个表格” | 读取文件，回复一段简短摘要 |
| “在这三个网站上比一下这件商品的价格” | 打开浏览器比价后回复。浏览器技能在你手动开启前保持关闭，而且绝不付款 |
| “每周一 9 点，列出我这周改过的文件” | 设置一个在你电脑上运行的例行任务 |

技能可以添加，也可以随时开启或关闭。详见 [技能](#技能)。

---

## 系统要求

- 手机上安装 **Haru App**（iPhone 和 Android，即将登陆 App Store 和 Google Play）
- 一台在 Haru PC 接收任务期间**保持开机的电脑**：
  - **macOS** 13 或更高版本（Apple 芯片或 Intel）
  - **Windows** 10/11（64 位）。原生运行，无需 WSL
  - 使用 `systemd` 的 **Linux**：Ubuntu 22.04+、Debian 12+、Fedora 等类似发行版。如果使用云端模型，树莓派 4/5（64 位，2 GB 及以上内存）也能运行
  - **Node.js 24** 或更高版本。如果没有，安装程序会自动帮你安装
- 由你自己选择的 **AI 模型**：
  - **云端模型**：用你已有的 ChatGPT、Claude 或 GitHub Copilot 订阅登录，或者使用 API 密钥（例如 Gemini）。效果最好。
  - 在你电脑上运行的**本地模型**（llama.cpp 或 [Ollama](https://ollama.com)）。免费且完全私密，但速度较慢。16 GB 内存的电脑，实际能跑的上限大约是 9B 参数的模型。出于安全考虑，除非你手动修改，小型本地模型只能使用只读技能。

### 推荐配置

最适合安放 Haru PC 的是一台 **Mac mini**（或任何一直开着的电脑）：耗电少，不接显示器也能运行，内存 16 GB 及以上还能跑免费的本地模型。用手机上的 Haru App 配对一次，然后让它一直开着就行。

---

## 安装

### macOS 和 Linux

```bash
curl -fsSL https://raw.githubusercontent.com/inphilchoi/haru-pc/main/install.sh | bash
```

### Windows（PowerShell）

```powershell
irm https://raw.githubusercontent.com/inphilchoi/haru-pc/main/install.ps1 | iex
```

安装程序会：
1. 按需安装 Node.js，然后安装一个经过测试并锁定版本的 OpenClaw；
2. 添加 Haru PC 插件及其默认技能；
3. 应用安全设置：执行命令须经审批、启用加密连接（TLS）、开启局域网发现；
4. 将 Haru PC 注册为后台自启动（macOS 上用 launchd，Windows 上用计划任务，Linux 上用 `systemd --user` 服务）；
5. 引导你选择 AI 模型，然后显示用于配对的二维码。

想先看看脚本内容？可以下载 [`install.sh`](install.sh) 或 [`install.ps1`](install.ps1)，检查无误后再运行。各平台的安装包也可以在 [Releases](https://github.com/inphilchoi/haru-pc/releases) 页面下载。

---

## 连接手机

1. 在手机上打开 **Haru**，说一句 **“连接我的电脑”**（或点击 ⚙ → **Haru PC**）。
2. 扫描安装程序显示的二维码。二维码 10 分钟内有效，且只能使用一次。如需生成新的二维码，运行：
   ```bash
   haru-pc pair
   ```
3. 电脑上会弹出 **“要连接这台手机吗？”**。点击确认，并核对两边屏幕上的安全码是否一致，就大功告成了。

**在外面使用：** 在手机和电脑上都安装 [Tailscale](https://tailscale.com)，登录同一个 tailnet，然后运行 `haru-pc remote on`。这样 Haru PC 就只能在你自己的 tailnet 内访问（Tailscale Serve）。Haru PC 绝不会向公网开放端口。

---

## 选择 AI 模型

安装时选一个，之后随时可以更换。

**用你已有的 AI 订阅登录。** Haru PC 绝不会索要你的密码。你在服务商自己的页面上登录，Haru PC 只获得它所需的授权。

| 服务商 | 连接方式 |
|---|---|
| **ChatGPT**（OpenAI） | 运行 `haru-pc model login chatgpt`，然后在 OpenAI 的页面上登录。使用额度以你的 ChatGPT 套餐为准 |
| **Claude**（Anthropic） | 先用 Anthropic 官方的 Claude CLI 登录一次（`claude auth login`），再运行 `haru-pc model login claude`。使用额度以你的 Claude 套餐为准。关于在其他工具中使用你的套餐，请查阅 Anthropic 的最新条款 |
| **GitHub Copilot** | 运行 `haru-pc model login copilot`，然后在 GitHub 页面上输入显示的验证码 |

**也可以使用 API 密钥**（Anthropic、OpenAI、Google Gemini、Mistral、DeepSeek 等）：

```bash
haru-pc model key openai      # 按提示粘贴你的密钥
haru-pc model key gemini
```

Google Gemini 只能通过 API 密钥连接，可以在 Google AI Studio 免费获取密钥。

**还可以在你的电脑上运行本地模型**，免费又私密：

```bash
haru-pc model local           # 推荐适合你电脑配置的模型
```

```bash
haru-pc model                 # 查看当前模型
```

登录凭据和密钥保存在操作系统的安全存储中（钥匙串、Windows 凭据管理器，或 Linux 上的 libsecret），绝不会发送到你的手机，也不会发给我们。

### 在中国大陆

OpenAI、Anthropic 和 Google 不在中国大陆提供模型服务。请改选在大陆可用的服务商，例如深度求索 DeepSeek、通义千问（阿里云）、Kimi（月之暗面）、豆包（火山引擎）、文心（百度千帆）、MiniMax 或智谱 GLM，用 `haru-pc model key <provider>` 接入；也可以用 `haru-pc model local` 运行本地模型，无需联网即可使用。

---

## 技能

技能是一个个小巧、易读的指令包，用来教 Haru PC 完成某项工作。技能存放在 `~/.haru-pc/skills/` 中，遵循 OpenClaw 技能格式。

```bash
haru-pc skills                # 列出已安装的技能
haru-pc skills enable office  # 开启某个技能
haru-pc skills disable browser
```

默认技能：

| 技能 | 功能 |
|---|---|
| `files` | 查找、移动、重命名和整理文件，并报告重复文件 |
| `send-to-phone` | 把文件或摘要发回你的 Haru App |
| `office` | 创建和读取 Word、Excel、PowerPoint 和 PDF 文档 |
| `browser` | 查资料、比较网页。**默认关闭。** 绝不付款，未经询问绝不登录 |
| `routines` | 按计划运行任务（“每周一 9 点”） |

Haru PC 自带经过自家审核的技能，绝不会自行安装来自公共技能市场的技能。安装任何新内容，都需要你在手机上批准。

你也可以编写自己的技能，详见 [docs/skills.md](docs/skills.md)。

---

## 安全

Haru PC 能直接在你的电脑上执行操作，因此在设计上格外谨慎：

- **凡是会改动内容的操作，都要在手机上批准**：写入或移动文件、运行命令、使用浏览器、发送文件。你能清楚看到将要执行的内容，然后选择 **仅允许这一次** 或 **拒绝**。没有“始终允许”选项。
- **消息一律视为不可信输入。** 文件、网页或邮件中的文字无法给 Haru PC 下达新指令，它们只会被当作数据处理，从而防范提示词注入。
- **文件夹白名单。** 默认情况下，Haru PC 只在 `Documents`、`Downloads` 和 `Desktop` 中工作。可以用 `haru-pc allow <folder>` 修改。
- **不付款，不转账。** Haru PC 绝不会购物、付款或转移资金。
- **必须配对。** 只有已配对的手机才能发送任务。随时可以用 `haru-pc unpair` 解除配对。
- **仅限局域网或你自己的 tailnet。** Haru PC 绝不会暴露在公网上。
- **锁定版本并经过安全审计。** 安装程序使用经过测试的 OpenClaw 版本，并在最后运行 OpenClaw 的安全审计。`haru-pc update` 会升级到下一个经过测试的版本。

如果发现安全问题，请发邮件至 **creativelab.choi@gmail.com**，不要提交公开 Issue。

---

## 更新与卸载

```bash
haru-pc update       # 更新 Haru PC 及其技能
haru-pc uninstall    # 停止后台服务并移除 Haru PC
```

在你删除 `~/.haru-pc` 文件夹之前，你的设置会一直保留。

---

## 故障排除

| 问题 | 解决方法 |
|---|---|
| 手机找不到电脑 | 确认两者连接的是同一个 Wi-Fi，或都已登录 Tailscale，然后运行 `haru-pc status` |
| 配对二维码已过期 | 重新运行 `haru-pc pair` |
| 任务执行很慢 | 在配置较低的电脑上，本地模型会比较慢。可以用 `haru-pc model login chatgpt` 或 `haru-pc model login claude` 登录订阅 |
| 一直没收到审批卡片 | 审批请求只会在 Haru App 打开时送达手机。如果请求 10 分钟内没有得到回应，Haru PC 会自动拒绝，不执行任何操作。打开 Haru 再说一次即可 |
| 出现其他问题 | 运行 `haru-pc logs`，并把输出附在 Issue 中 |

---

## 隐私

Haru PC 不需要账号，我们也没有自己的服务器。你的任务、文件、记忆和密钥都只保存在你自己的设备上。如果你选择云端 AI 模型，任务文本会按照该服务商的条款发送给对方；如果使用本地模型，任何数据都不会离开你的电脑。

---

## 致谢与许可证

Haru PC 由 **CreativeLab** 开发。联系方式：creativelab.choi@gmail.com

Haru PC 运行在 OpenClaw 基金会及其贡献者开发的 **OpenClaw** 之上，并依据 MIT 许可证使用 OpenClaw（本仓库中附有 OpenClaw 的许可证和版权声明）。Haru PC 是一个独立的非官方发行版，与 OpenClaw 基金会没有任何隶属或合作关系，也未获得 OpenClaw 基金会的认可或背书。本文提及“OpenClaw”仅用于说明 Haru PC 运行在什么之上。

Haru PC 以 [MIT 许可证](LICENSE) 发布。
