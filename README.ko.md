# 하루 PC

[English](README.md) · **한국어** · [日本語](README.ja.md) · [简体中文](README.zh-Hans.md) · [繁體中文](README.zh-Hant.md) · [Français](README.fr.md) · [Deutsch](README.de.md) · [Español](README.es.md) · [Português](README.pt-BR.md)

**휴대폰으로 하루에게 부탁하세요. 일은 컴퓨터가 합니다.**

하루 PC는 **하루 – AI 비서**(iPhone·Android)와 함께 쓰는 데스크톱 앱이에요. 휴대폰에서 하루에게 "PC에 있는 Reports 폴더 정리해 줘", "지난달 청구서 찾아서 보내 줘"처럼 일을 맡기면, 하루 PC가 내 컴퓨터에서 그 일을 받아 처리하고 결과를 휴대폰으로 돌려보내요.

하루 PC는 오픈소스 개인 AI 비서인 [OpenClaw](https://github.com/openclaw/openclaw)(MIT 라이선스) 위에서 동작해요. 설치 프로그램이 검증된 버전의 OpenClaw를 설치하고, 그 위에 하루 PC 플러그인을 더해요. 플러그인에는 하루의 비서 페르소나, 휴대폰 승인 안전장치, 바로 쓸 수 있는 스킬 모음이 들어 있어요. 하루 PC는 비공식 배포판이며 OpenClaw 프로젝트와 제휴 관계가 없어요.

> **상태:** 초기 미리보기 버전이에요. 다듬어지지 않은 부분이 있을 수 있으니 문제를 발견하면 알려 주세요.

---

## 작동 방식

```
 하루 앱 (휴대폰)                              하루 PC (내 컴퓨터)
 ─────────────────                             ───────────────────────
 "PC에 있는 Reports 폴더 정리해 줘"
   → 카드: "이 작업을 PC로 보낼까요?" [실행]
   ── 직접 연결, 클라우드 중계 없음 ───────────▶ 작업을 받아요
                                                 단계를 계획해요
   ◀── "파일 12개를 옮길게요. 괜찮을까요?" ───── 위험한 작업은 먼저 물어봐요
   [승인]  ────────────────────────────────────▶ 작업을 실행해요
   ◀── "완료: 12개 이동, 중복 3개" ───────────── 결과를 보내요
```

- **휴대폰이 암호화된 연결로 내 컴퓨터와 직접 통신해요.** 같은 Wi-Fi에 있으면 서로 자동으로 찾아요. 집 밖에서는 내 [Tailscale](https://tailscale.com) 네트워크로 연결할 수 있어요. 저희가 운영하는 서버는 전혀 거치지 않아요.
- **내가 허락하지 않으면 아무것도 실행되지 않아요.** 파일을 바꾸거나, 명령을 실행하거나, 메시지를 보내거나, 브라우저를 쓰는 모든 작업은 먼저 휴대폰에 카드로 표시돼요. **승인**을 눌러야만 실행돼요.
- **내 데이터는 내 것이에요.** 대화, 기억, 자격 증명은 내 컴퓨터와 휴대폰에만 저장돼요.

---

## 하루 PC로 할 수 있는 일

| 휴대폰에서 부탁하면 | 하루 PC가 하는 일 |
|---|---|
| "다운로드 폴더 정리해 줘" | 파일을 종류와 날짜별로 폴더에 나누고, 중복 파일을 알려 줘요 |
| "지난주 계약서 PDF 찾아서 보내 줘" | 내 파일을 검색해 휴대폰으로 파일을 보내요 |
| "이 회의록을 Word 문서로 만들어 줘" | 문서 폴더에 `.docx` 파일을 만들어요 |
| "바탕화면에 있는 스프레드시트 요약해 줘" | 파일을 읽고 짧게 요약해서 답해요 |
| "이 상품 가격을 세 사이트에서 비교해 줘" | 브라우저를 열어 비교한 뒤 답해요. 브라우저 스킬은 직접 켜기 전까지 꺼져 있고, 결제는 절대 하지 않아요 |
| "매주 월요일 9시에 이번 주에 수정한 파일 목록 보여 줘" | 내 컴퓨터에서 실행되는 루틴을 설정해요 |

스킬은 추가할 수 있고 켜고 끌 수도 있어요. [스킬](#스킬)을 참고하세요.

---

## 준비물

- 휴대폰에 설치한 **하루 앱**(iPhone·Android, App Store와 Google Play에 곧 출시 예정)
- 하루 PC가 일을 받는 동안 **켜져 있는 컴퓨터**:
  - **macOS** 13 이상(Apple silicon 또는 Intel)
  - **Windows** 10/11 64비트. 네이티브로 실행되므로 WSL은 필요 없어요
  - `systemd`를 쓰는 **Linux**: Ubuntu 22.04 이상, Debian 12 이상, Fedora 등. 클라우드 모델을 쓴다면 Raspberry Pi 4/5(64비트, 2GB 이상)에서도 돌아가요
  - **Node.js 24** 이상. 없으면 설치 프로그램이 알아서 설치해요
- 직접 고르는 **AI 모델**:
  - **클라우드 모델**: 이미 쓰고 있는 ChatGPT, Claude, GitHub Copilot 구독으로 로그인하거나, API 키를 사용해요(예: Gemini). 품질이 가장 좋아요.
  - 내 컴퓨터에서 돌아가는 **로컬 모델**(llama.cpp 또는 [Ollama](https://ollama.com)). 무료이고 완전히 비공개지만 느려요. RAM 16GB라면 파라미터 약 9B 모델이 현실적인 한계예요. 안전을 위해, 작은 로컬 모델에는 설정을 바꾸지 않는 한 읽기 전용 스킬만 주어져요.

### 추천 구성

하루 PC를 두기에 가장 편한 곳은 **Mac mini**(또는 늘 켜 두는 컴퓨터)예요. 전기를 적게 쓰고, 모니터 없이도 돌아가며, RAM이 16GB 이상이면 무료 로컬 모델까지 돌릴 수 있어요. 휴대폰의 하루 앱과 한 번만 페어링하고 켜 두기만 하면 돼요.

---

## 설치

### macOS와 Linux

```bash
curl -fsSL https://raw.githubusercontent.com/inphilchoi/haru-pc/main/install.sh | bash
```

### Windows(PowerShell)

```powershell
irm https://raw.githubusercontent.com/inphilchoi/haru-pc/main/install.ps1 | iex
```

설치 프로그램은 다음 순서로 진행돼요.
1. 필요하면 Node.js를 설치한 뒤, 검증을 거쳐 버전을 고정한 OpenClaw를 설치해요.
2. 하루 PC 플러그인과 기본 스킬을 추가해요.
3. 안전한 설정을 적용해요. 명령 실행 승인 필수, 암호화 연결(TLS), 로컬 네트워크 검색 켜기.
4. 하루 PC가 백그라운드에서 자동으로 시작되도록 등록해요(macOS는 launchd, Windows는 예약된 작업, Linux는 `systemd --user` 서비스).
5. AI 모델 선택을 도와준 뒤, 페어링용 QR 코드를 보여 줘요.

스크립트를 먼저 읽어 보고 싶다면 [`install.sh`](install.sh) 또는 [`install.ps1`](install.ps1)을 내려받아 확인한 뒤 실행하세요. 플랫폼별 설치 패키지는 [Releases](https://github.com/inphilchoi/haru-pc/releases) 페이지에서도 받을 수 있어요.

---

## 휴대폰 연결하기

1. 휴대폰에서 **하루**를 열고 **"내 PC 연결해 줘"**라고 말하세요(또는 ⚙ → **하루 PC**를 누르세요).
2. 설치 프로그램이 보여 준 QR 코드를 스캔하세요. 코드는 10분 동안 유효하고 한 번만 쓸 수 있어요. 새 코드를 띄우려면 다음을 실행하세요.
   ```bash
   haru-pc pair
   ```
3. 컴퓨터에 **"이 휴대폰을 연결할까요?"**라는 확인 창이 떠요. 확인을 누르고, 두 화면의 보안 코드가 같은지 확인하면 끝이에요.

**집 밖에서 쓰려면:** 휴대폰과 컴퓨터 모두에 [Tailscale](https://tailscale.com)을 설치하고 같은 tailnet에 로그인한 뒤 `haru-pc remote on`을 실행하세요. 그러면 하루 PC에는 내 tailnet 안에서만 접속할 수 있어요(Tailscale Serve). 하루 PC는 공용 인터넷에 포트를 절대 열지 않아요.

---

## AI 모델 고르기

설치할 때 하나를 고르고, 언제든 바꿀 수 있어요.

**이미 쓰고 있는 AI 구독으로 로그인하세요.** 하루 PC는 비밀번호를 절대 묻지 않아요. 로그인은 제공업체의 공식 페이지에서 하고, 하루 PC는 필요한 권한만 받아요.

| 제공업체 | 연결 방법 |
|---|---|
| **ChatGPT**(OpenAI) | `haru-pc model login chatgpt`를 실행한 뒤 OpenAI 페이지에서 로그인하세요. 내 ChatGPT 요금제의 사용 한도가 적용돼요 |
| **Claude**(Anthropic) | Anthropic의 공식 Claude CLI로 한 번 로그인한 뒤(`claude auth login`) `haru-pc model login claude`를 실행하세요. 내 Claude 요금제의 사용 한도가 적용돼요. 요금제를 다른 도구에서 쓰는 것에 관한 Anthropic의 최신 약관을 꼭 확인해 주세요 |
| **GitHub Copilot** | `haru-pc model login copilot`을 실행한 뒤 GitHub 페이지에 표시된 코드를 입력하세요 |

**API 키를 쓸 수도 있어요**(Anthropic, OpenAI, Google Gemini, Mistral, DeepSeek 등).

```bash
haru-pc model key openai      # 물어보면 키를 붙여 넣으세요
haru-pc model key gemini
```

Google Gemini는 API 키로만 연결돼요. Google AI Studio에서 무료 키를 받을 수 있어요.

**내 컴퓨터에서 로컬 모델을 돌릴 수도 있어요.** 무료이고 비공개예요.

```bash
haru-pc model local           # 내 컴퓨터에 맞는 모델을 추천해요
```

```bash
haru-pc model                 # 현재 모델 보기
```

로그인 정보와 키는 운영체제의 보안 저장소(키체인, Windows 자격 증명 관리자, Linux의 libsecret)에 보관돼요. 휴대폰이나 저희에게 전송되는 일은 절대 없어요.

### 중국 본토에서는

OpenAI, Anthropic, Google은 중국 본토에서 모델을 제공하지 않아요. 대신 현지에서 쓸 수 있는 제공사를 고르세요. 예를 들어 DeepSeek, Qwen(Alibaba), Kimi(Moonshot), Doubao(Volcano Engine), ERNIE(Baidu Qianfan), MiniMax, Zhipu GLM 등을 `haru-pc model key <provider>`로 연결하면 돼요. 인터넷 없이도 동작하는 로컬 모델을 `haru-pc model local`로 쓰는 방법도 있어요.

---

## 스킬

스킬은 하루 PC에게 일을 가르치는 작고 읽기 쉬운 지침 묶음이에요. `~/.haru-pc/skills/`에 저장되고 OpenClaw 스킬 형식을 따라요.

```bash
haru-pc skills                # 설치된 스킬 목록 보기
haru-pc skills enable office  # 스킬 켜기
haru-pc skills disable browser
```

기본 스킬:

| 스킬 | 하는 일 |
|---|---|
| `files` | 파일을 찾고, 옮기고, 이름을 바꾸고, 정리해요. 중복 파일도 알려 줘요 |
| `send-to-phone` | 파일이나 요약을 하루 앱으로 보내요 |
| `office` | Word, Excel, PowerPoint, PDF 문서를 만들고 읽어요 |
| `browser` | 정보를 찾아보고 페이지를 비교해요. **기본값은 꺼짐이에요.** 결제는 절대 하지 않고, 묻지 않고 로그인하지 않아요 |
| `routines` | 정해진 일정에 따라 작업을 실행해요("매주 월요일 9시") |

하루 PC에는 자체 검토를 거친 스킬이 함께 들어 있고, 공개 마켓플레이스의 스킬을 스스로 설치하는 일은 없어요. 무언가를 새로 설치하려면 휴대폰에서 승인해야 해요.

직접 스킬을 만들 수도 있어요. [docs/skills.md](docs/skills.md)를 참고하세요.

---

## 안전

하루 PC는 내 컴퓨터에서 직접 작업할 수 있기 때문에 신중하게 동작하도록 설계했어요.

- 무언가를 바꾸는 **모든 작업은 휴대폰에서 승인**해야 해요. 파일 쓰기·옮기기, 명령 실행, 브라우저 사용, 파일 보내기가 모두 해당돼요. 무엇이 실행될지 정확히 보여 주고, **이번만 허용** 또는 **거부** 중에서 고르면 돼요. "항상 허용"은 없어요.
- **메시지는 신뢰하지 않는 입력으로 다뤄요.** 파일, 웹페이지, 이메일 안의 텍스트는 하루 PC에게 새로운 지시를 내릴 수 없어요. 모두 데이터로만 취급해서 프롬프트 인젝션을 막아요.
- **허용 폴더 목록.** 기본적으로 하루 PC는 `Documents`, `Downloads`, `Desktop`에서만 작업해요. `haru-pc allow <folder>`로 바꿀 수 있어요.
- **결제·송금 없음.** 하루 PC는 물건을 사거나, 결제하거나, 돈을 옮기지 않아요.
- **페어링 필수.** 페어링한 휴대폰만 작업을 보낼 수 있어요. 언제든 `haru-pc unpair`로 페어링을 해제할 수 있어요.
- **로컬 네트워크나 내 tailnet에서만.** 하루 PC는 공용 인터넷에 절대 노출되지 않아요.
- **버전 고정과 보안 점검.** 설치 프로그램은 검증된 OpenClaw 버전을 사용하고, 마지막에 OpenClaw 보안 점검을 실행해요. `haru-pc update`를 실행하면 다음 검증 버전으로 올라가요.

보안 문제를 발견하면 공개 이슈를 올리지 말고 **creativelab.choi@gmail.com**으로 메일을 보내 주세요.

---

## 업데이트와 제거

```bash
haru-pc update       # 하루 PC와 스킬 업데이트
haru-pc uninstall    # 백그라운드 서비스를 멈추고 하루 PC 제거
```

설정은 `~/.haru-pc` 폴더를 지우기 전까지 그대로 남아 있어요.

---

## 문제 해결

| 문제 | 해결 방법 |
|---|---|
| 휴대폰이 PC를 찾지 못해요 | 두 기기가 같은 Wi-Fi에 있는지, 또는 둘 다 Tailscale에 로그인했는지 확인한 뒤 `haru-pc status`를 실행하세요 |
| 페어링 QR 코드가 만료됐어요 | `haru-pc pair`를 다시 실행하세요 |
| 작업이 느려요 | 사양이 낮은 컴퓨터에서는 로컬 모델이 느려요. `haru-pc model login chatgpt` 또는 `haru-pc model login claude`로 구독에 로그인해 보세요 |
| 승인 카드가 오지 않아요 | 승인 요청은 하루 앱이 열려 있을 때 휴대폰에 도착해요. 10분 안에 응답하지 않으면 하루 PC가 요청을 거절하고 아무것도 실행하지 않아요. 하루를 열고 다시 부탁해 보세요 |
| 뭔가 잘못됐어요 | `haru-pc logs`를 실행하고 출력 내용을 이슈에 첨부해 주세요 |

---

## 개인정보

하루 PC에는 계정이 없고 저희 서버도 없어요. 작업, 파일, 기억, 키는 모두 내 기기에만 남아요. 클라우드 AI 모델을 고르면 작업 내용 텍스트가 해당 제공업체의 약관에 따라 그곳으로 전송돼요. 로컬 모델을 쓰면 어떤 데이터도 내 컴퓨터 밖으로 나가지 않아요.

---

## 만든 곳과 라이선스

하루 PC는 **CreativeLab**이 만들었어요. 문의: creativelab.choi@gmail.com

하루 PC는 OpenClaw 재단과 기여자들이 만든 **OpenClaw** 위에서 동작하며, OpenClaw는 MIT 라이선스에 따라 사용하고 있어요(OpenClaw 라이선스와 저작권 고지는 이 저장소에 포함되어 있어요). 하루 PC는 독립적인 비공식 배포판으로, OpenClaw 재단과 제휴 관계가 없으며 OpenClaw 재단의 보증을 받지도 않았어요. 여기서 "OpenClaw"라는 이름은 하루 PC가 무엇 위에서 동작하는지 설명하기 위해서만 사용해요.

하루 PC는 [MIT 라이선스](LICENSE)로 배포돼요.
