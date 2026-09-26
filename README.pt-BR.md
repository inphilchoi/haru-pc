# Haru PC

[English](README.md) · [한국어](README.ko.md) · [日本語](README.ja.md) · [简体中文](README.zh-Hans.md) · [繁體中文](README.zh-Hant.md) · [Français](README.fr.md) · [Deutsch](README.de.md) · [Español](README.es.md) · **Português**

**Peça ao Haru no celular. Seu computador faz o trabalho.**

O Haru PC é o companheiro de desktop do **Haru – AI Assistant** (iPhone e Android). Você passa uma tarefa ao Haru pelo celular, por exemplo "organize a pasta Relatórios no meu PC" ou "encontre a fatura do mês passado e me envie". O Haru PC recebe a tarefa no seu próprio computador, executa e manda o resultado de volta para o celular.

O Haru PC roda sobre o [OpenClaw](https://github.com/openclaw/openclaw), o assistente pessoal de IA de código aberto (Licença MIT). O instalador configura uma versão testada do OpenClaw e acrescenta o plugin do Haru PC: a persona de assistente do Haru, uma camada de segurança com aprovação pelo celular e um conjunto de habilidades prontas para usar. O Haru PC é uma distribuição não oficial e não tem vínculo com o projeto OpenClaw.

> **Status:** prévia inicial. Pode haver arestas a aparar; por favor, relate os problemas que encontrar.

---

## Como funciona

```
 App Haru (celular)                                  Haru PC (seu computador)
 ──────────────────                                  ────────────────────────
 "Organize a pasta Relatórios no meu PC"
   → Cartão: "Enviar para o seu PC?" [Executar]
   ── conexão direta, sem retransmissão na nuvem ──▶ recebe a tarefa
                                                       planeja as etapas
   ◀── "Vou mover 12 arquivos. OK?" ───────────────  pergunta antes de algo arriscado
   [Aprovar]  ─────────────────────────────────────▶ faz o trabalho
   ◀── "Pronto: 12 movidos, 3 duplicatas" ─────────  envia o resultado
```

- **Seu celular conversa com o seu próprio computador** por uma conexão com criptografia de ponta a ponta. Na mesma rede Wi-Fi, a conexão é direta; fora de casa, passa pelo relay do Haru, que só repassa dados criptografados que não consegue ler e não guarda nada além de um hash do seu token de conexão. Sem configurar o roteador nem usar VPN.
- **Nada é executado sem o seu OK.** Toda ação que altera arquivos, executa comandos, envia mensagens ou usa o navegador aparece antes como um cartão no seu celular. Ela só é executada depois que você toca em **Aprovar**.
- **Seus dados continuam sendo seus.** Conversas, memória e credenciais ficam armazenadas apenas no seu computador e no seu celular.

---

## O que o Haru PC pode fazer

| O que você pede no celular | O que o Haru PC faz |
|---|---|
| "Organize minha pasta Downloads" | Separa os arquivos em pastas por tipo e data e aponta duplicatas |
| "Encontre o PDF do contrato da semana passada e me envie" | Procura nos seus arquivos e envia o arquivo para o seu celular |
| "Transforme esta anotação de reunião em um documento do Word" | Cria um `.docx` na sua pasta Documentos |
| "Resuma a planilha que está na minha área de trabalho" | Lê o arquivo e responde com um resumo curto |
| "Compare o preço deste produto nestes três sites" | Abre um navegador, compara e responde. A habilidade de navegador fica desativada até você ativá-la, e ela nunca faz pagamentos |
| "Toda segunda às 9h, liste os arquivos que eu alterei na semana" | Cria uma rotina que roda no seu computador |

As habilidades podem ser adicionadas, ativadas e desativadas. Veja [Habilidades](#habilidades).

---

## Requisitos

- **O app Haru** no seu celular (iPhone e Android, em breve na App Store e no Google Play)
- **Um computador que fique ligado** enquanto você quiser que o Haru PC receba tarefas:
  - **macOS** 13 ou mais recente (Apple silicon ou Intel)
  - **Windows** 10/11, 64 bits. Roda nativamente, então o WSL não é necessário
  - **Linux** com `systemd`: Ubuntu 22.04+, Debian 12+, Fedora e similares. Um Raspberry Pi 4/5 (64 bits, 2 GB ou mais) também funciona, desde que você use um modelo na nuvem
  - **Node.js 24** ou mais recente. Se não estiver instalado, o instalador cuida disso para você
- **Um modelo de IA**, à sua escolha:
  - **Modelo na nuvem:** entre com uma assinatura do ChatGPT, do Claude ou do GitHub Copilot que você já tenha, ou use uma chave de API (por exemplo, do Gemini). Oferece a melhor qualidade.
  - **Modelo local**, que roda no seu computador (llama.cpp ou [Ollama](https://ollama.com)). É gratuito e totalmente privado, mas mais lento. Com 16 GB de RAM, o limite prático é um modelo de cerca de 9B de parâmetros. Por segurança, modelos locais pequenos recebem apenas habilidades somente leitura, a menos que você altere essa configuração.

### Configuração recomendada

Um **Mac mini** (ou qualquer computador que fique sempre ligado) é o lugar mais confortável para o Haru PC: gasta pouca energia, funciona sem tela e, com 16 GB de RAM ou mais, também consegue rodar um modelo local gratuito. Pareie uma vez com o app Haru no seu celular e deixe-o ligado.

---

## Instalação

### macOS e Linux

```bash
curl -fsSL https://raw.githubusercontent.com/inphilchoi/haru-pc/main/install.sh | bash
```

### Windows (PowerShell)

```powershell
irm https://raw.githubusercontent.com/inphilchoi/haru-pc/main/install.ps1 | iex
```

O instalador:
1. instala o Node.js, se necessário, e depois uma versão testada e fixada do OpenClaw,
2. adiciona o plugin do Haru PC e suas habilidades padrão,
3. aplica configurações seguras: aprovação obrigatória de comandos, conexões criptografadas (TLS) e descoberta na rede local ativada,
4. registra o Haru PC para iniciar em segundo plano (launchd no macOS, uma tarefa agendada no Windows, um serviço `systemd --user` no Linux),
5. ajuda você a escolher um modelo de IA e, em seguida, mostra um QR code de pareamento.

Prefere ler o script antes? Baixe o [`install.sh`](install.sh) ou o [`install.ps1`](install.ps1), confira e depois execute. Mais informações: [inphilchoi.github.io/haru](https://inphilchoi.github.io/haru/)

---

## Conectar o celular

1. Abra o **Haru** no celular e diga **"Conectar meu PC"** (ou toque em ⚙ → **Haru PC**).
2. Escaneie o QR code exibido pelo instalador. O código vale por 10 minutos e só pode ser usado uma vez. Para gerar um novo, execute:
   ```bash
   haru-pc pair
   ```
3. Quando o app mostrar **"Conectado"**, pronto — em casa ou fora dela.

**Usando fora de casa:** não há nada a configurar. O código de pareamento já inclui o relay criptografado do Haru, então o app alcança o Haru PC de qualquer lugar. O Haru PC nunca abre uma porta para a internet pública. (Se preferir sua própria rede [Tailscale](https://tailscale.com), `haru-pc remote on` continua funcionando.)

---

## Escolher o modelo de IA

Escolha um na instalação e troque quando quiser.

**Entre com uma assinatura de IA que você já tem.** O Haru PC nunca pede a sua senha. Você faz login na página do próprio provedor, e o Haru PC recebe apenas a permissão de que precisa.

| Provedor | Como conectar |
|---|---|
| **ChatGPT** (OpenAI) | `haru-pc model login chatgpt` e, depois, faça login na página da OpenAI. Valem os limites do seu plano do ChatGPT |
| **Claude** (Anthropic) | Faça login uma vez com a CLI oficial do Claude, da Anthropic (`claude auth login`), e depois execute `haru-pc model login claude`. Valem os limites do seu plano do Claude. Confira os termos atuais da Anthropic sobre o uso do seu plano com outras ferramentas |
| **GitHub Copilot** | `haru-pc model login copilot` e, depois, digite o código exibido na página do GitHub |

**Ou use uma chave de API** (Anthropic, OpenAI, Google Gemini, Mistral, DeepSeek e outros):

```bash
haru-pc model key openai      # cole sua chave quando for solicitada
haru-pc model key gemini
```

O Google Gemini só se conecta com chave de API. Você pode obter uma chave gratuita no Google AI Studio.

**Ou rode um modelo local** no seu computador. É gratuito e privado:

```bash
haru-pc model local           # recomenda um modelo adequado ao seu computador
```

```bash
haru-pc model                 # mostra o modelo atual
```

Os logins e as chaves ficam guardados no armazenamento seguro do seu sistema operacional (Keychain, Gerenciador de Credenciais do Windows ou libsecret no Linux). Eles nunca são enviados para o seu celular nem para nós.

### Na China continental

OpenAI, Anthropic e Google não oferecem seus modelos na China continental. Em vez disso, escolha um provedor disponível por lá, por exemplo DeepSeek, Qwen (Alibaba), Kimi (Moonshot), Doubao (Volcano Engine), ERNIE (Baidu Qianfan), MiniMax ou Zhipu GLM, com `haru-pc model key <provider>`, ou use um modelo local com `haru-pc model local`, que funciona sem acesso à internet.

---

## Habilidades

Habilidades são pequenos pacotes de instruções, fáceis de ler, que ensinam o Haru PC a fazer um trabalho. Elas ficam em `~/.haru-pc/skills/` e seguem o formato de habilidades do OpenClaw.

```bash
haru-pc skills                # lista as habilidades instaladas
haru-pc skills enable office  # ativa uma habilidade
haru-pc skills disable browser
```

Habilidades padrão:

| Habilidade | O que faz |
|---|---|
| `files` | Encontrar, mover, renomear e organizar arquivos. Aponta duplicatas |
| `send-to-phone` | Enviar um arquivo ou um resumo de volta para o seu app Haru |
| `office` | Criar e ler documentos do Word, Excel, PowerPoint e PDF |
| `browser` | Pesquisar e comparar páginas. **Desativada por padrão.** Nunca faz pagamentos e nunca faz login sem perguntar |
| `routines` | Executar uma tarefa em horários programados ("toda segunda às 9h") |

O Haru PC já vem com as próprias habilidades, revisadas, e nunca instala sozinho habilidades de marketplaces públicos. Qualquer instalação nova precisa da sua aprovação no celular.

Você também pode escrever sua própria habilidade. Veja [docs/skills.md](docs/skills.md).

---

## Segurança

O Haru PC pode agir no seu computador, por isso foi projetado para ser cuidadoso:

- **Aprovação pelo celular para cada ação** que altere algo: gravar ou mover arquivos, executar comandos, usar o navegador, enviar arquivos. Você vê exatamente o que será executado e escolhe **Permitir uma vez** ou **Negar**. Não existe "permitir sempre".
- **Mensagens são entradas não confiáveis.** Textos dentro de arquivos, páginas da web ou e-mails não podem dar novas instruções ao Haru PC. Eles são tratados como dados, o que protege contra injeção de prompt.
- **Lista de pastas permitidas.** Por padrão, o Haru PC trabalha apenas em `Documents`, `Downloads` e `Desktop`. Para mudar isso, use `haru-pc allow <folder>`.
- **Sem pagamentos, sem transferências.** O Haru PC nunca compra, paga ou movimenta dinheiro.
- **Pareamento obrigatório.** Só celulares que você pareou podem enviar tarefas. Desfaça o pareamento quando quiser com `haru-pc unpair`.
- **Apenas rede local ou a sua tailnet.** O Haru PC nunca fica exposto à internet pública.
- **Versão fixada e auditada.** O instalador usa uma versão testada do OpenClaw e, no final, executa a auditoria de segurança do OpenClaw. O `haru-pc update` passa para a próxima versão testada.

Se você encontrar um problema de segurança, envie um e-mail para **creativelab.choi@gmail.com** em vez de abrir uma issue pública.

---

## Atualizar e desinstalar

```bash
haru-pc update       # atualiza o Haru PC e suas habilidades
haru-pc uninstall    # para o serviço em segundo plano e remove o Haru PC
```

Suas configurações ficam em `~/.haru-pc` até você apagar essa pasta.

---

## Solução de problemas

| Problema | O que tentar |
|---|---|
| O celular não encontra o PC | Verifique se o computador está ligado e conectado à internet e execute `haru-pc status`. Se ainda não funcionar, mostre um código novo com `haru-pc pair` e escaneie de novo |
| O QR code de pareamento expirou | Execute `haru-pc pair` novamente |
| As tarefas estão lentas | Um modelo local em uma máquina modesta é lento. Entre com uma assinatura usando `haru-pc model login chatgpt` ou `haru-pc model login claude` |
| O cartão de aprovação não apareceu | Depois de passar uma tarefa, você pode fechar o Haru: o Haru PC continua trabalhando por até 15 minutos, e os cartões de aprovação pendentes aparecem quando você abre o Haru de novo. Se um pedido não for respondido em 10 minutos, o Haru PC o recusa e nada é executado. Abra o Haru e peça de novo |
| Algo deu errado | Execute `haru-pc logs` e anexe a saída a uma issue |

---

## Privacidade

O Haru PC não tem conta nem servidor nosso. Suas tarefas, arquivos, memória e chaves ficam nos seus dispositivos. Se você escolher um modelo de IA na nuvem, o texto da tarefa vai para esse provedor, de acordo com os termos dele. Com um modelo local, nada sai do seu computador.

---

## Créditos e licença

O Haru PC é feito pela **CreativeLab**. Contato: creativelab.choi@gmail.com

Ele roda sobre o **OpenClaw**, da OpenClaw Foundation e colaboradores, usado sob a Licença MIT (a licença e o aviso de copyright do OpenClaw estão incluídos neste repositório). O Haru PC é uma distribuição independente e não oficial, sem afiliação com a OpenClaw Foundation e sem o endosso dela. O nome "OpenClaw" é usado aqui apenas para descrever sobre o que o Haru PC roda.

O Haru PC é distribuído sob a [Licença MIT](LICENSE).
