# Haru PC

[English](README.md) · [한국어](README.ko.md) · [日本語](README.ja.md) · [简体中文](README.zh-Hans.md) · **繁體中文** · [Français](README.fr.md) · [Deutsch](README.de.md) · [Español](README.es.md) · [Português](README.pt-BR.md)

**用手機交代 Haru，工作交給電腦完成。**

Haru PC 是 **Haru – AI 助理**（iPhone 與 Android）的桌面版搭檔軟體。你在手機上請 Haru 幫忙，例如「幫我整理電腦裡的 Reports 資料夾」或「找出上個月的帳單寄給我」，Haru PC 就會在你自己的電腦上接下這項工作、執行完畢，再把結果傳回你的手機。

Haru PC 在開放原始碼的個人 AI 助理 [OpenClaw](https://github.com/openclaw/openclaw)（MIT 授權）上執行。安裝程式會安裝一個經過測試的 OpenClaw 版本，再於其上加入 Haru PC 外掛程式：包含 Haru 的助理角色、手機核准安全機制，以及一組立即可用的技能。Haru PC 是非官方發行版，與 OpenClaw 專案並無隸屬或合作關係。

> **狀態：** 早期預覽版。可能還有不夠完善的地方，發現問題歡迎回報。

---

## 運作方式

```
 Haru App（手機）                           Haru PC（你的電腦）
 ─────────────────                          ───────────────────────
 「幫我整理電腦裡的 Reports 資料夾」
   → 卡片：「要傳送到你的電腦嗎？」[執行]
   ── 直接連線，不經雲端中繼 ───────────────▶ 接收工作
                                              規劃步驟
   ◀── 「即將移動 12 個檔案，可以嗎？」 ───── 有風險的動作先詢問
   [核准]  ─────────────────────────────────▶ 執行工作
   ◀── 「完成：移動 12 個，重複 3 個」 ────── 傳回結果
```

- **手機透過端對端加密連線，與你自己的電腦溝通。** 在同一個 Wi-Fi 下直接連線，不在家時經由 Haru 中繼。中繼只轉送它無法讀取的密文，除了連線權杖的雜湊值之外什麼都不儲存。不需要設定路由器或 VPN。
- **沒有你的同意，什麼都不會執行。** 任何會變更檔案、執行指令、傳送訊息或使用瀏覽器的動作，都會先以卡片形式顯示在手機上，必須等你點選 **核准** 才會執行。
- **你的資料只屬於你。** 對話、記憶與憑證只會儲存在你的電腦和手機上。

---

## Haru PC 能做什麼

| 在手機上說 | Haru PC 會 |
|---|---|
| 「幫我整理下載資料夾」 | 依類型和日期將檔案分類到各個資料夾，並回報重複的檔案 |
| 「找出上週那份合約 PDF 傳給我」 | 搜尋你的檔案，並把檔案傳到你的手機 |
| 「把這份會議記錄做成 Word 文件」 | 在「文件」資料夾中建立 `.docx` 檔 |
| 「幫我摘要桌面上那份試算表」 | 讀取檔案，並回覆一段簡短摘要 |
| 「幫我在這三個網站比較這項商品的價格」 | 開啟瀏覽器比價後回覆。瀏覽器技能在你自行開啟之前都是關閉的，而且絕不付款 |
| 「每週一早上 9 點，列出我這週修改過的檔案」 | 設定一項在你電腦上執行的例行工作 |

技能可以新增，也能隨時開啟或關閉。詳見[技能](#技能)。

---

## 系統需求

- 手機上安裝 **Haru App**（iPhone 與 Android，即將在 App Store 和 Google Play 上架）
- 一台在 Haru PC 接收工作期間**保持開機的電腦**：
  - **macOS** 13 或以上版本（Apple 晶片或 Intel）
  - **Windows** 10/11（64 位元）。原生執行，不需要 WSL
  - 使用 `systemd` 的 **Linux**：Ubuntu 22.04+、Debian 12+、Fedora 等類似發行版。若使用雲端模型，Raspberry Pi 4/5（64 位元、2 GB 以上記憶體）也能執行
  - **Node.js 24** 或以上版本。若尚未安裝，安裝程式會自動幫你安裝
- 由你自行選擇的 **AI 模型**：
  - **雲端模型**：使用你已訂閱的 ChatGPT、Claude 或 GitHub Copilot 登入，或使用 API 金鑰（例如 Gemini）。品質最好。
  - 在你電腦上執行的**本機模型**（llama.cpp 或 [Ollama](https://ollama.com)）。免費且完全私密，但速度較慢。以 16 GB 記憶體來說，約 9B 參數的模型就是實際可用的上限。基於安全考量，除非你自行變更，小型本機模型只能使用唯讀技能。

### 建議配置

最適合擺放 Haru PC 的是一台 **Mac mini**（或任何一直開著的電腦）：耗電少、不接螢幕也能運作，記憶體 16 GB 以上還能執行免費的本機模型。用手機上的 Haru App 配對一次，之後讓它保持開機即可。

---

## 安裝

### macOS 與 Linux

```bash
curl -fsSL https://raw.githubusercontent.com/inphilchoi/haru-pc/main/install.sh | bash
```

### Windows（PowerShell）

```powershell
irm https://raw.githubusercontent.com/inphilchoi/haru-pc/main/install.ps1 | iex
```

安裝程式會：
1. 視需要安裝 Node.js，接著安裝經過測試並鎖定版本的 OpenClaw；
2. 加入 Haru PC 外掛程式及其預設技能；
3. 套用安全設定：執行指令須經核准、使用加密連線（TLS）、開啟區域網路探索；
4. 將 Haru PC 註冊為在背景自動啟動（macOS 使用 launchd，Windows 使用排程工作，Linux 使用 `systemd --user` 服務）；
5. 協助你選擇 AI 模型，然後顯示配對用的 QR 碼。

想先看過指令碼內容？可以下載 [`install.sh`](install.sh) 或 [`install.ps1`](install.ps1)，確認後再執行。更多說明：[inphilchoi.github.io/haru](https://inphilchoi.github.io/haru/)

---

## 連接手機

1. 在手機上開啟 **Haru**，說 **「連接我的電腦」**（或點選 ⚙ → **Haru PC**）。
2. 掃描安裝程式顯示的 QR 碼。QR 碼的有效時間為 10 分鐘，且只能使用一次。若要顯示新的 QR 碼，請執行：
   ```bash
   haru-pc pair
   ```
3. App 顯示 **「已連線」** 就完成了，在家在外都能使用。

**在外面使用：** 不需要任何設定。連線碼裡已經包含加密的 Haru 中繼，在哪裡都能連到 Haru PC。Haru PC 絕不會對公開網際網路開放連接埠。（如果想用你自己的 [Tailscale](https://tailscale.com) 網路，`haru-pc remote on` 仍然可以使用。）

---

## 選擇 AI 模型

安裝時選擇一個，之後隨時都能更換。

**用你已訂閱的 AI 服務登入。** Haru PC 絕不會要求你提供密碼。你會在供應商自己的頁面上登入，Haru PC 只會取得所需的權限。

| 供應商 | 連線方式 |
|---|---|
| **ChatGPT**（OpenAI） | 執行 `haru-pc model login chatgpt`，然後在 OpenAI 的頁面上登入。使用額度依你的 ChatGPT 方案而定 |
| **Claude**（Anthropic） | 先用 Anthropic 官方的 Claude CLI 登入一次（`claude auth login`），再執行 `haru-pc model login claude`。使用額度依你的 Claude 方案而定。關於在其他工具中使用你的方案，請查看 Anthropic 最新的條款 |
| **GitHub Copilot** | 執行 `haru-pc model login copilot`，然後在 GitHub 頁面上輸入顯示的代碼 |

**也可以使用 API 金鑰**（Anthropic、OpenAI、Google Gemini、Mistral、DeepSeek 等）：

```bash
haru-pc model key openai      # 出現提示時貼上你的金鑰
haru-pc model key gemini
```

Google Gemini 只能透過 API 金鑰連線，可以在 Google AI Studio 免費取得金鑰。

**也能在你的電腦上執行本機模型**，免費又私密：

```bash
haru-pc model local           # 推薦適合你電腦的模型
```

```bash
haru-pc model                 # 顯示目前的模型
```

登入資訊與金鑰會存放在作業系統的安全儲存區（鑰匙圈、Windows 認證管理員，或 Linux 上的 libsecret），絕不會傳送到你的手機，也不會傳給我們。

### 在中國大陸

OpenAI、Anthropic 和 Google 並未在中國大陸提供模型服務。請改選在當地可用的服務商，例如深度求索 DeepSeek、通義千問（阿里雲）、Kimi（月之暗面）、豆包（火山引擎）、文心（百度千帆）、MiniMax 或智譜 GLM，並用 `haru-pc model key <provider>` 連接；也可以用 `haru-pc model local` 執行本機模型，不需連上網際網路也能使用。

---

## 技能

技能是一個個小巧、易讀的指示套件，用來教 Haru PC 完成某項工作。技能存放在 `~/.haru-pc/skills/`，並遵循 OpenClaw 的技能格式。

```bash
haru-pc skills                # 列出已安裝的技能
haru-pc skills enable office  # 開啟某項技能
haru-pc skills disable browser
```

預設技能：

| 技能 | 功能 |
|---|---|
| `files` | 尋找、移動、重新命名與整理檔案，並回報重複的檔案 |
| `send-to-phone` | 將檔案或摘要傳回你的 Haru App |
| `office` | 建立與讀取 Word、Excel、PowerPoint 和 PDF 文件 |
| `browser` | 查詢資料、比較網頁。**預設為關閉。** 絕不付款，未經詢問也絕不登入 |
| `routines` | 依排程執行工作（「每週一早上 9 點」） |

Haru PC 內建經過我們自行審查的技能，絕不會自行安裝來自公開市集的技能。要安裝任何新東西，都需要你在手機上核准。

你也可以自己撰寫技能，詳見 [docs/skills.md](docs/skills.md)。

---

## 安全性

Haru PC 能直接在你的電腦上動作，因此在設計上特別謹慎：

- **任何會變更內容的動作都要在手機上核准**：寫入或移動檔案、執行指令、使用瀏覽器、傳送檔案。你可以清楚看到即將執行的內容，並選擇 **僅允許這次** 或 **拒絕**。沒有「一律允許」的選項。
- **訊息一律視為不受信任的輸入。** 檔案、網頁或電子郵件中的文字無法對 Haru PC 下達新指示，這些內容只會被當作資料處理，藉此防範提示詞注入攻擊。
- **資料夾允許清單。** 預設情況下，Haru PC 只會在 `Documents`、`Downloads` 和 `Desktop` 中作業。可以用 `haru-pc allow <folder>` 變更。
- **不付款，不轉帳。** Haru PC 絕不會購物、付款或移轉金錢。
- **必須先配對。** 只有已配對的手機才能傳送工作。隨時都能用 `haru-pc unpair` 解除配對。
- **僅限區域網路或你自己的 tailnet。** Haru PC 絕不會暴露在公開網際網路上。
- **鎖定版本並經過安全稽核。** 安裝程式使用經過測試的 OpenClaw 版本，並在最後執行 OpenClaw 的安全稽核。`haru-pc update` 會升級到下一個經過測試的版本。

如果發現安全性問題，請寄信至 **creativelab.choi@gmail.com**，請勿建立公開的 Issue。

---

## 更新與解除安裝

```bash
haru-pc update       # 更新 Haru PC 及其技能
haru-pc uninstall    # 停止背景服務並移除 Haru PC
```

在你刪除 `~/.haru-pc` 資料夾之前，你的設定都會保留。

---

## 疑難排解

| 問題 | 解決方式 |
|---|---|
| 手機找不到電腦 | 確認電腦已開機並連上網際網路，然後執行 `haru-pc status`。還是不行的話，用 `haru-pc pair` 顯示新的連線碼再掃一次 |
| 配對 QR 碼已過期 | 重新執行 `haru-pc pair` |
| 工作執行得很慢 | 在效能較低的電腦上，本機模型會比較慢。可以用 `haru-pc model login chatgpt` 或 `haru-pc model login claude` 登入訂閱方案 |
| 一直沒收到核准卡片 | 交代工作後可以關閉 Haru App：Haru PC 會繼續處理最多 15 分鐘，重新開啟 Haru 時，等待中的核准卡片就會出現。如果請求在 10 分鐘內沒有得到回應，Haru PC 會自動拒絕，不會執行任何動作。請開啟 Haru 再說一次 |
| 發生其他問題 | 執行 `haru-pc logs`，並將輸出內容附加到 Issue 中 |

---

## 隱私權

Haru PC 不需要帳號，我們也沒有自己的伺服器。你的工作、檔案、記憶與金鑰都只會留在你自己的裝置上。如果你選擇雲端 AI 模型，工作的文字內容會依該供應商的條款傳送給對方；若使用本機模型，任何資料都不會離開你的電腦。

---

## 致謝與授權

Haru PC 由 **CreativeLab** 開發。聯絡方式：creativelab.choi@gmail.com

Haru PC 在 OpenClaw 基金會及其貢獻者所開發的 **OpenClaw** 上執行，並依 MIT 授權條款使用 OpenClaw（本儲存庫中附有 OpenClaw 的授權條款與著作權聲明）。Haru PC 是獨立的非官方發行版，與 OpenClaw 基金會並無任何隸屬或合作關係，亦未獲得 OpenClaw 基金會的認可或背書。本文提及「OpenClaw」僅用於說明 Haru PC 是在什麼之上執行。

Haru PC 採用 [MIT 授權條款](LICENSE) 發布。
