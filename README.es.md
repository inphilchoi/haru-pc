# Haru PC

[English](README.md) · [한국어](README.ko.md) · [日本語](README.ja.md) · [简体中文](README.zh-Hans.md) · [繁體中文](README.zh-Hant.md) · [Français](README.fr.md) · [Deutsch](README.de.md) · **Español** · [Português](README.pt-BR.md)

**Pídaselo a Haru desde el teléfono. Su computadora hace el trabajo.**

Haru PC es el complemento de escritorio de **Haru – AI Assistant** (iPhone y Android). Usted le encarga una tarea a Haru desde el teléfono, por ejemplo "ordena la carpeta Informes de mi PC" o "busca la factura del mes pasado y envíamela". Haru PC recibe la tarea en su propia computadora, la realiza y envía el resultado de vuelta a su teléfono.

Haru PC funciona sobre [OpenClaw](https://github.com/openclaw/openclaw), el asistente personal de IA de código abierto (licencia MIT). El instalador configura una versión probada de OpenClaw y le añade el plugin de Haru PC: la personalidad de asistente de Haru, una capa de seguridad basada en la aprobación desde el teléfono y un conjunto de habilidades listas para usar. Haru PC es una distribución no oficial y no está afiliada al proyecto OpenClaw.

> **Estado:** versión preliminar. Es posible que encuentre detalles sin pulir; le agradecemos que informe de cualquier problema.

---

## Cómo funciona

```
 App Haru (teléfono)                               Haru PC (su computadora)
 ───────────────────                               ────────────────────────
 "Ordena la carpeta Informes de mi PC"
   → Tarjeta: "¿Enviar esto a su PC?" [Ejecutar]
   ── conexión directa, sin relé en la nube ─────▶ recibe la tarea
                                                     planifica los pasos
   ◀── "Voy a mover 12 archivos. ¿De acuerdo?" ──  pregunta antes de algo arriesgado
   [Aprobar]  ───────────────────────────────────▶ hace el trabajo
   ◀── "Listo: 12 movidos, 3 duplicados" ────────  envía el resultado
```

- **Su teléfono se comunica con su propia computadora** mediante una conexión cifrada de extremo a extremo. En la misma red Wi-Fi se conectan directamente; fuera de casa pasan por el relé de Haru, que solo transmite datos cifrados que no puede leer y no guarda nada salvo un hash de su token de conexión. No hace falta configurar el router ni usar VPN.
- **Nada se ejecuta sin su visto bueno.** Toda acción que modifique archivos, ejecute comandos, envíe mensajes o use el navegador aparece primero como una tarjeta en su teléfono. Solo se ejecuta después de que usted toque **Aprobar**.
- **Sus datos siguen siendo suyos.** Las conversaciones, la memoria y las credenciales se guardan únicamente en su computadora y en su teléfono.

---

## Qué puede hacer Haru PC

| Lo que pide en el teléfono | Lo que hace Haru PC |
|---|---|
| "Ordena mi carpeta Descargas" | Clasifica los archivos en carpetas por tipo y fecha, e informa de los duplicados |
| "Busca el PDF del contrato de la semana pasada y envíamelo" | Busca entre sus archivos y envía el archivo a su teléfono |
| "Convierte esta nota de la reunión en un documento de Word" | Crea un `.docx` en su carpeta Documentos |
| "Resume la hoja de cálculo que tengo en el escritorio" | Lee el archivo y responde con un resumen breve |
| "Compara el precio de este artículo en estos tres sitios" | Abre un navegador, compara y responde. La habilidad de navegador permanece desactivada hasta que usted la active, y nunca realiza pagos |
| "Todos los lunes a las 9, haz una lista de los archivos que cambié esta semana" | Configura una rutina que se ejecuta en su computadora |

Las habilidades se pueden añadir, activar y desactivar. Consulte [Habilidades](#habilidades).

---

## Requisitos

- **La app Haru** en su teléfono (iPhone y Android, próximamente en App Store y Google Play)
- **Una computadora que permanezca encendida** mientras quiera que Haru PC reciba tareas:
  - **macOS** 13 o posterior (Apple silicon o Intel)
  - **Windows** 10/11, 64 bits. Se ejecuta de forma nativa, así que no necesita WSL
  - **Linux** con `systemd`: Ubuntu 22.04+, Debian 12+, Fedora y similares. También funciona en una Raspberry Pi 4/5 (64 bits, 2 GB o más) si usa un modelo en la nube
  - **Node.js 24** o posterior. Si no está instalado, el instalador se encarga de ello
- **Un modelo de IA**, a su elección:
  - **Modelo en la nube:** inicie sesión con una suscripción a ChatGPT, Claude o GitHub Copilot que ya tenga, o use una clave de API (por ejemplo, de Gemini). Ofrece la mejor calidad.
  - **Modelo local** que se ejecuta en su computadora (llama.cpp u [Ollama](https://ollama.com)). Es gratuito y totalmente privado, pero más lento. Con 16 GB de RAM, el límite práctico es un modelo de unos 9B de parámetros. Por seguridad, los modelos locales pequeños solo tienen habilidades de solo lectura, salvo que usted cambie esta opción.

### Configuración recomendada

Un **Mac mini** (o cualquier computadora que esté siempre encendida) es el lugar más cómodo para Haru PC: consume poca energía, funciona sin pantalla y, con 16 GB de RAM o más, también puede ejecutar un modelo local gratuito. Vincúlelo una vez con la app Haru de su teléfono y déjelo encendido.

---

## Instalación

### macOS y Linux

```bash
curl -fsSL https://raw.githubusercontent.com/inphilchoi/haru-pc/main/install.sh | bash
```

### Windows (PowerShell)

```powershell
irm https://raw.githubusercontent.com/inphilchoi/haru-pc/main/install.ps1 | iex
```

El instalador:
1. instala Node.js si hace falta y, después, una versión probada y fijada de OpenClaw,
2. añade el plugin de Haru PC y sus habilidades predeterminadas,
3. aplica una configuración segura: aprobación obligatoria de comandos, conexiones cifradas (TLS) y descubrimiento en la red local activado,
4. registra Haru PC para que se inicie en segundo plano (launchd en macOS, una tarea programada en Windows, un servicio `systemd --user` en Linux),
5. le ayuda a elegir un modelo de IA y, a continuación, muestra un código QR de vinculación.

¿Prefiere leer el script antes? Descargue [`install.sh`](install.sh) o [`install.ps1`](install.ps1), revíselos y luego ejecútelos. Más información: [inphilchoi.github.io/haru](https://inphilchoi.github.io/haru/)

---

## Conectar el teléfono

1. Abra **Haru** en su teléfono y diga **"Conecta mi PC"** (o toque ⚙ → **Haru PC**).
2. Escanee el código QR que muestra el instalador. El código es válido durante 10 minutos y solo funciona una vez. Para generar uno nuevo, ejecute:
   ```bash
   haru-pc pair
   ```
3. Cuando la app muestre **"Conectado"**, habrá terminado: en casa o fuera de ella.

**Uso fuera de casa:** no hay nada que configurar. El código de emparejamiento ya incluye el relé cifrado de Haru, así que la app llega a Haru PC desde cualquier lugar. Haru PC nunca abre un puerto hacia internet. (Si prefiere su propia red de [Tailscale](https://tailscale.com), `haru-pc remote on` sigue funcionando.)

**¿Prefiere no usar nuestro relé?** Elija **Conexión directa (autoalojada)** al instalar, o ejecute `haru-pc relay off`. El teléfono se conectará directamente a su computadora en la misma red Wi-Fi; fuera de casa, use su propio Tailscale (`haru-pc remote on`) o su propio relé (`haru-pc relay url wss://…`). Vea [docs/self-host-relay.md](docs/self-host-relay.md).

---

## Elegir el modelo de IA

Elija uno durante la instalación; puede cambiarlo cuando quiera.

**Inicie sesión con una suscripción de IA que ya tenga.** Haru PC nunca le pide su contraseña. Usted inicia sesión en la página del propio proveedor y Haru PC solo recibe el permiso que necesita.

| Proveedor | Cómo conectarse |
|---|---|
| **ChatGPT** (OpenAI) | `haru-pc model login chatgpt` y, después, inicie sesión en la página de OpenAI. Se aplican los límites de su plan de ChatGPT |
| **Claude** (Anthropic) | Inicie sesión una vez con la CLI oficial de Claude de Anthropic (`claude auth login`) y luego ejecute `haru-pc model login claude`. Se aplican los límites de su plan de Claude. Consulte las condiciones vigentes de Anthropic sobre el uso de su plan con otras herramientas |
| **GitHub Copilot** | `haru-pc model login copilot` y, después, introduzca el código que aparece en la página de GitHub |

**O use una clave de API** (Anthropic, OpenAI, Google Gemini, Mistral, DeepSeek, entre otros):

```bash
haru-pc model key openai      # pegue su clave cuando se le pida
haru-pc model key gemini
```

Google Gemini solo se conecta con una clave de API. Puede obtener una clave gratuita en Google AI Studio.

**O ejecute un modelo local** en su computadora. Es gratuito y privado:

```bash
haru-pc model local           # recomienda un modelo adecuado para su computadora
```

```bash
haru-pc model                 # muestra el modelo actual
```

Los inicios de sesión y las claves se guardan en el almacenamiento seguro de su sistema operativo (Llavero, Administrador de credenciales de Windows o libsecret en Linux). Nunca se envían a su teléfono ni a nosotros.

### En China continental

OpenAI, Anthropic y Google no ofrecen sus modelos en China continental. Elija en su lugar un proveedor disponible allí, por ejemplo DeepSeek, Qwen (Alibaba), Kimi (Moonshot), Doubao (Volcano Engine), ERNIE (Baidu Qianfan), MiniMax o Zhipu GLM, con `haru-pc model key <provider>`, o use un modelo local con `haru-pc model local`, que funciona sin acceso a internet.

---

## Habilidades

Las habilidades son pequeños paquetes de instrucciones, fáciles de leer, que le enseñan a Haru PC a hacer un trabajo concreto. Se encuentran en `~/.haru-pc/skills/` y siguen el formato de habilidades de OpenClaw.

```bash
haru-pc skills                # lista las habilidades instaladas
haru-pc skills enable office  # activa una habilidad
haru-pc skills disable browser
```

Habilidades predeterminadas:

| Habilidad | Qué hace |
|---|---|
| `files` | Buscar, mover, renombrar y ordenar archivos. Informa de los duplicados |
| `send-to-phone` | Enviar un archivo o un resumen de vuelta a su app Haru |
| `office` | Crear y leer documentos de Word, Excel, PowerPoint y PDF |
| `browser` | Buscar información y comparar páginas. **Desactivada de forma predeterminada.** Nunca paga ni inicia sesión sin preguntar |
| `routines` | Ejecutar una tarea según un horario ("todos los lunes a las 9") |

Haru PC incluye sus propias habilidades, ya revisadas, y nunca instala por su cuenta habilidades de marketplaces públicos. Para instalar cualquier cosa nueva, hace falta su aprobación en el teléfono.

También puede escribir su propia habilidad. Consulte [docs/skills.md](docs/skills.md).

---

## Seguridad

Haru PC puede actuar en su computadora, por eso está diseñado para ser prudente:

- **Aprobación desde el teléfono para cada acción** que cambie algo: escribir o mover archivos, ejecutar comandos, usar el navegador, enviar archivos. Usted ve exactamente lo que se va a ejecutar y elige **Permitir una vez** o **Denegar**. No existe la opción "permitir siempre".
- **Los mensajes son entradas no confiables.** El texto de archivos, páginas web o correos electrónicos no puede darle nuevas instrucciones a Haru PC. Se trata como simples datos, lo que protege contra la inyección de prompts.
- **Lista de carpetas permitidas.** De forma predeterminada, Haru PC solo trabaja en `Documents`, `Downloads` y `Desktop`. Puede cambiarlo con `haru-pc allow <folder>`.
- **Sin pagos ni transferencias.** Haru PC nunca compra, paga ni mueve dinero.
- **Vinculación obligatoria.** Solo los teléfonos que usted haya vinculado pueden enviar tareas. Puede desvincularlos en cualquier momento con `haru-pc unpair`.
- **Solo red local o su tailnet.** Haru PC nunca queda expuesto a internet.
- **Versión fijada y auditada.** El instalador usa una versión probada de OpenClaw y, al final, ejecuta la auditoría de seguridad de OpenClaw. `haru-pc update` pasa a la siguiente versión probada.

Si encuentra un problema de seguridad, escriba a **creativelab.choi@gmail.com** en lugar de abrir un issue público.

---

## Actualizar y desinstalar

```bash
haru-pc update       # actualiza Haru PC y sus habilidades
haru-pc uninstall    # detiene el servicio en segundo plano y elimina Haru PC
```

Su configuración se conserva en `~/.haru-pc` hasta que elimine esa carpeta.

---

## Solución de problemas

| Problema | Qué probar |
|---|---|
| El teléfono no encuentra el PC | Compruebe que la computadora esté encendida y conectada a internet y ejecute `haru-pc status`. Si sigue sin funcionar, muestre un código nuevo con `haru-pc pair` y escanéelo de nuevo |
| El código QR de vinculación caducó | Vuelva a ejecutar `haru-pc pair` |
| Las tareas van lentas | Un modelo local en un equipo modesto es lento. Inicie sesión con una suscripción mediante `haru-pc model login chatgpt` o `haru-pc model login claude` |
| Nunca apareció la tarjeta de aprobación | Puede cerrar Haru después de encargar una tarea: Haru PC sigue trabajando hasta 15 minutos y las tarjetas de aprobación pendientes aparecen al volver a abrir Haru. Si una solicitud no se responde en 10 minutos, Haru PC la rechaza y no se ejecuta nada. Abra Haru y vuelva a pedirlo |
| Algo salió mal | Ejecute `haru-pc logs` y adjunte el resultado a un issue |

---

## Privacidad

Haru PC no tiene cuentas ni servidores nuestros. Sus tareas, archivos, memoria y claves permanecen en sus dispositivos. Si elige un modelo de IA en la nube, el texto de su tarea se envía a ese proveedor según sus propias condiciones. Con un modelo local, nada sale de su computadora.

---

## Créditos y licencia

Haru PC es un producto de **CreativeLab**. Contacto: creativelab.choi@gmail.com

Funciona sobre **OpenClaw**, de la OpenClaw Foundation y sus colaboradores, que se usa bajo la licencia MIT (la licencia y el aviso de copyright de OpenClaw se incluyen en este repositorio). Haru PC es una distribución independiente y no oficial, y no está afiliada a la OpenClaw Foundation ni cuenta con su respaldo. El nombre "OpenClaw" se usa aquí únicamente para indicar sobre qué funciona Haru PC.

Haru PC se publica bajo la [licencia MIT](LICENSE).
