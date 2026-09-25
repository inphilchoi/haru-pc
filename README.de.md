# Haru PC

[English](README.md) · [한국어](README.ko.md) · [日本語](README.ja.md) · [简体中文](README.zh-Hans.md) · [繁體中文](README.zh-Hant.md) · [Français](README.fr.md) · **Deutsch** · [Español](README.es.md) · [Português](README.pt-BR.md)

**Fragen Sie Haru auf dem Smartphone. Ihr Computer erledigt die Arbeit.**

Haru PC ist die Desktop-Ergänzung zu **Haru – AI Assistant** (iPhone und Android). Sie geben Haru auf dem Smartphone eine Aufgabe, zum Beispiel „Ordner Berichte auf meinem PC aufräumen“ oder „Rechnung vom letzten Monat suchen und mir schicken“. Haru PC nimmt die Aufgabe auf Ihrem eigenen Computer entgegen, führt sie aus und schickt das Ergebnis zurück auf Ihr Smartphone.

Haru PC läuft auf [OpenClaw](https://github.com/openclaw/openclaw), dem quelloffenen persönlichen KI-Assistenten (MIT-Lizenz). Das Installationsprogramm richtet eine getestete OpenClaw-Version ein und ergänzt sie um das Haru-PC-Plugin: die Assistenten-Persona von Haru, eine Sicherheitsschicht mit Freigabe per Smartphone und eine Reihe fertiger Skills. Haru PC ist eine inoffizielle Distribution und steht in keiner Verbindung zum OpenClaw-Projekt.

> **Status:** frühe Vorschauversion. Rechnen Sie mit Ecken und Kanten, und melden Sie Probleme bitte.

---

## So funktioniert es

```
 Haru-App (Smartphone)                          Haru PC (Ihr Computer)
 ─────────────────────                          ──────────────────────
 „Ordner Berichte auf meinem PC aufräumen“
   → Karte: „An Ihren PC senden?“ [Ausführen]
   ── direkte Verbindung, kein Cloud-Relay ───▶ nimmt die Aufgabe an
                                                  plant die Schritte
   ◀── „12 Dateien werden verschoben. OK?“ ───  fragt vor jedem riskanten Schritt
   [Freigeben]  ──────────────────────────────▶ erledigt die Arbeit
   ◀── „Fertig: 12 verschoben, 3 Duplikate“ ──  sendet das Ergebnis
```

- **Ihr Smartphone spricht direkt mit Ihrem eigenen Computer**, über eine verschlüsselte Verbindung. Im selben WLAN finden sich die Geräte automatisch. Unterwegs können Sie sich über Ihr eigenes [Tailscale](https://tailscale.com)-Netzwerk verbinden. Nichts läuft über einen Server, den wir betreiben.
- **Nichts läuft ohne Ihr Okay.** Jede Aktion, die Dateien ändert, Befehle ausführt, Nachrichten sendet oder den Browser verwendet, erscheint zuerst als Karte auf Ihrem Smartphone. Ausgeführt wird sie erst, wenn Sie auf **Freigeben** tippen.
- **Ihre Daten bleiben Ihre Daten.** Unterhaltungen, Gedächtnis und Zugangsdaten werden ausschließlich auf Ihrem Computer und Ihrem Smartphone gespeichert.

---

## Was Haru PC kann

| Ihre Bitte auf dem Smartphone | Was Haru PC tut |
|---|---|
| „Downloads-Ordner aufräumen“ | Sortiert Dateien nach Typ und Datum in Ordner und meldet Duplikate |
| „Vertrags-PDF von letzter Woche suchen und mir schicken“ | Durchsucht Ihre Dateien und sendet die Datei an Ihr Smartphone |
| „Diese Besprechungsnotiz in ein Word-Dokument umwandeln“ | Erstellt eine `.docx` in Ihrem Ordner „Dokumente“ |
| „Tabelle auf meinem Schreibtisch zusammenfassen“ | Liest die Datei und antwortet mit einer kurzen Zusammenfassung |
| „Preis dieses Artikels auf diesen drei Websites vergleichen“ | Öffnet einen Browser, vergleicht und antwortet. Der Browser-Skill bleibt aus, bis Sie ihn einschalten, und er bezahlt nie |
| „Jeden Montag um 9 Uhr die Dateien auflisten, die ich diese Woche geändert habe“ | Richtet eine Routine ein, die auf Ihrem Computer läuft |

Skills lassen sich hinzufügen sowie ein- und ausschalten. Siehe [Skills](#skills).

---

## Voraussetzungen

- **Die Haru-App** auf Ihrem Smartphone (iPhone und Android, bald im App Store und bei Google Play)
- **Ein Computer, der eingeschaltet bleibt**, solange Haru PC Aufgaben annehmen soll:
  - **macOS** 13 oder neuer (Apple silicon oder Intel)
  - **Windows** 10/11, 64 Bit. Läuft nativ, WSL ist also nicht nötig
  - **Linux** mit `systemd`: Ubuntu 22.04+, Debian 12+, Fedora und vergleichbare Distributionen. Auch ein Raspberry Pi 4/5 (64 Bit, ab 2 GB) funktioniert, sofern Sie ein Cloud-Modell verwenden
  - **Node.js 24** oder neuer. Falls es fehlt, installiert das Installationsprogramm es für Sie
- **Ein KI-Modell** Ihrer Wahl:
  - **Cloud-Modell:** Melden Sie sich mit einem bereits vorhandenen ChatGPT-, Claude- oder GitHub-Copilot-Abonnement an, oder verwenden Sie einen API-Schlüssel (zum Beispiel für Gemini). Das liefert die beste Qualität.
  - **Lokales Modell**, das auf Ihrem Computer läuft (llama.cpp oder [Ollama](https://ollama.com)). Es ist kostenlos und vollständig privat, aber langsamer. Mit 16 GB RAM liegt die praktische Grenze bei einem Modell mit etwa 9 Mrd. Parametern. Aus Sicherheitsgründen erhalten kleine lokale Modelle nur Skills mit Lesezugriff, sofern Sie das nicht ändern.

### Empfohlene Einrichtung

Am bequemsten läuft Haru PC auf einem **Mac mini** (oder einem anderen Computer, der ständig eingeschaltet ist): Er verbraucht wenig Strom, läuft ohne Bildschirm und kann mit 16 GB RAM oder mehr auch ein kostenloses lokales Modell ausführen. Koppeln Sie ihn einmal mit der Haru-App auf Ihrem Smartphone und lassen Sie ihn eingeschaltet.

---

## Installation

### macOS und Linux

```bash
curl -fsSL https://raw.githubusercontent.com/inphilchoi/haru-pc/main/install.sh | bash
```

### Windows (PowerShell)

```powershell
irm https://raw.githubusercontent.com/inphilchoi/haru-pc/main/install.ps1 | iex
```

Das Installationsprogramm:
1. installiert bei Bedarf Node.js und anschließend eine getestete, fest vorgegebene OpenClaw-Version,
2. fügt das Haru-PC-Plugin und seine Standard-Skills hinzu,
3. übernimmt sichere Einstellungen: Freigabe für Befehle erforderlich, verschlüsselte Verbindungen (TLS) und Erkennung im lokalen Netzwerk aktiv,
4. registriert Haru PC für den Start im Hintergrund (launchd unter macOS, eine geplante Aufgabe unter Windows, ein `systemd --user`-Dienst unter Linux),
5. hilft Ihnen bei der Wahl eines KI-Modells und zeigt anschließend einen QR-Code zum Koppeln an.

Möchten Sie das Skript zuerst lesen? Laden Sie [`install.sh`](install.sh) oder [`install.ps1`](install.ps1) herunter, prüfen Sie die Dateien und führen Sie sie dann aus. Installationspakete für jede Plattform finden Sie außerdem auf der Seite [Releases](https://github.com/inphilchoi/haru-pc/releases).

---

## Smartphone verbinden

1. Öffnen Sie **Haru** auf Ihrem Smartphone und sagen Sie **„Meinen PC verbinden“** (oder tippen Sie auf ⚙ → **Haru PC**).
2. Scannen Sie den QR-Code, den das Installationsprogramm anzeigt. Der Code ist 10 Minuten gültig und nur einmal verwendbar. Einen neuen Code erzeugen Sie mit:
   ```bash
   haru-pc pair
   ```
3. Ihr Computer fragt **„Dieses Smartphone verbinden?“**. Bestätigen Sie und prüfen Sie, ob der Sicherheitscode auf beiden Bildschirmen übereinstimmt. Fertig.

**Nutzung unterwegs:** Installieren Sie [Tailscale](https://tailscale.com) auf dem Smartphone und dem Computer, melden Sie sich bei beiden im selben Tailnet an und führen Sie `haru-pc remote on` aus. Damit ist Haru PC nur innerhalb Ihres eigenen Tailnets erreichbar (Tailscale Serve). Haru PC öffnet niemals einen Port zum öffentlichen Internet.

---

## KI-Modell wählen

Sie wählen ein Modell bei der Installation und können es jederzeit wechseln.

**Mit einem vorhandenen KI-Abonnement anmelden.** Haru PC fragt nie nach Ihrem Passwort. Sie melden sich auf der Seite des Anbieters selbst an, und Haru PC erhält nur die Berechtigung, die es benötigt.

| Anbieter | So verbinden Sie sich |
|---|---|
| **ChatGPT** (OpenAI) | `haru-pc model login chatgpt` ausführen und sich dann auf der Seite von OpenAI anmelden. Es gelten die Limits Ihres ChatGPT-Tarifs |
| **Claude** (Anthropic) | Einmal mit der offiziellen Claude CLI von Anthropic anmelden (`claude auth login`) und dann `haru-pc model login claude` ausführen. Es gelten die Limits Ihres Claude-Tarifs. Bitte prüfen Sie die aktuellen Bedingungen von Anthropic zur Nutzung Ihres Tarifs mit anderen Tools |
| **GitHub Copilot** | `haru-pc model login copilot` ausführen und dann den angezeigten Code auf der Seite von GitHub eingeben |

**Oder einen API-Schlüssel verwenden** (Anthropic, OpenAI, Google Gemini, Mistral, DeepSeek und weitere):

```bash
haru-pc model key openai      # Schlüssel einfügen, wenn danach gefragt wird
haru-pc model key gemini
```

Google Gemini lässt sich nur mit einem API-Schlüssel verbinden. Einen kostenlosen Schlüssel erhalten Sie in Google AI Studio.

**Oder ein lokales Modell** auf Ihrem Computer ausführen. Das ist kostenlos und privat:

```bash
haru-pc model local           # empfiehlt ein Modell, das zu Ihrem Computer passt
```

```bash
haru-pc model                 # aktuelles Modell anzeigen
```

Anmeldungen und Schlüssel werden im sicheren Speicher Ihres Betriebssystems abgelegt (Schlüsselbund, Windows-Anmeldeinformationsverwaltung oder libsecret unter Linux). Sie werden niemals an Ihr Smartphone oder an uns gesendet.

### In Festlandchina

OpenAI, Anthropic und Google bieten ihre Modelle in Festlandchina nicht an. Wählen Sie stattdessen einen dort verfügbaren Anbieter, zum Beispiel DeepSeek, Qwen (Alibaba), Kimi (Moonshot), Doubao (Volcano Engine), ERNIE (Baidu Qianfan), MiniMax oder Zhipu GLM, mit `haru-pc model key <provider>`, oder nutzen Sie mit `haru-pc model local` ein lokales Modell, das ohne Internetzugang funktioniert.

---

## Skills

Skills sind kleine, gut lesbare Anleitungspakete, die Haru PC eine bestimmte Aufgabe beibringen. Sie liegen in `~/.haru-pc/skills/` und folgen dem Skill-Format von OpenClaw.

```bash
haru-pc skills                # installierte Skills auflisten
haru-pc skills enable office  # einen Skill einschalten
haru-pc skills disable browser
```

Standard-Skills:

| Skill | Funktion |
|---|---|
| `files` | Dateien finden, verschieben, umbenennen und aufräumen. Meldet Duplikate |
| `send-to-phone` | Eine Datei oder Zusammenfassung zurück an Ihre Haru-App senden |
| `office` | Word-, Excel-, PowerPoint- und PDF-Dokumente erstellen und lesen |
| `browser` | Informationen nachschlagen und Seiten vergleichen. **Standardmäßig aus.** Bezahlt nie und meldet sich nie ohne Rückfrage an |
| `routines` | Eine Aufgabe nach Zeitplan ausführen („jeden Montag um 9 Uhr“) |

Haru PC bringt eigene, geprüfte Skills mit und installiert niemals von sich aus Skills aus öffentlichen Marktplätzen. Jede neue Installation müssen Sie auf dem Smartphone freigeben.

Sie können auch eigene Skills schreiben. Siehe [docs/skills.md](docs/skills.md).

---

## Sicherheit

Haru PC kann auf Ihrem Computer handeln und ist deshalb auf Vorsicht ausgelegt:

- **Freigabe per Smartphone für jede Aktion**, die etwas verändert: Dateien schreiben oder verschieben, Befehle ausführen, den Browser verwenden, Dateien senden. Sie sehen genau, was ausgeführt wird, und wählen **Einmal erlauben** oder **Ablehnen**. Ein „Immer erlauben“ gibt es nicht.
- **Nachrichten gelten als nicht vertrauenswürdige Eingaben.** Text in Dateien, Webseiten oder E-Mails kann Haru PC keine neuen Anweisungen geben. Er wird als reine Daten behandelt, was vor Prompt-Injection schützt.
- **Ordner-Positivliste.** Standardmäßig arbeitet Haru PC nur in `Documents`, `Downloads` und `Desktop`. Ändern lässt sich das mit `haru-pc allow <folder>`.
- **Keine Zahlungen, keine Überweisungen.** Haru PC kauft nie etwas, bezahlt nie und bewegt kein Geld.
- **Kopplung erforderlich.** Nur gekoppelte Smartphones können Aufgaben senden. Mit `haru-pc unpair` heben Sie die Kopplung jederzeit auf.
- **Nur lokales Netzwerk oder Ihr Tailnet.** Haru PC ist niemals aus dem öffentlichen Internet erreichbar.
- **Feste Version, geprüft.** Das Installationsprogramm verwendet eine getestete OpenClaw-Version und führt zum Abschluss das Sicherheitsaudit von OpenClaw aus. `haru-pc update` wechselt zur nächsten getesteten Version.

Wenn Sie ein Sicherheitsproblem finden, schreiben Sie bitte eine E-Mail an **creativelab.choi@gmail.com**, statt ein öffentliches Issue zu eröffnen.

---

## Aktualisieren und deinstallieren

```bash
haru-pc update       # Haru PC und seine Skills aktualisieren
haru-pc uninstall    # Hintergrunddienst beenden und Haru PC entfernen
```

Ihre Einstellungen bleiben in `~/.haru-pc`, bis Sie diesen Ordner löschen.

---

## Fehlerbehebung

| Problem | Lösungsansatz |
|---|---|
| Das Smartphone findet den PC nicht | Prüfen Sie, ob beide Geräte im selben WLAN oder beide bei Tailscale angemeldet sind. Führen Sie dann `haru-pc status` aus |
| QR-Code zum Koppeln abgelaufen | Führen Sie `haru-pc pair` erneut aus |
| Aufgaben dauern lange | Ein lokales Modell auf einem leistungsschwachen Rechner ist langsam. Melden Sie sich mit `haru-pc model login chatgpt` oder `haru-pc model login claude` bei einem Abonnement an |
| Es ist keine Freigabekarte erschienen | Nachdem Sie eine Aufgabe übergeben haben, können Sie die Haru-App schließen: Haru PC arbeitet bis zu 15 Minuten weiter, und wartende Freigabekarten erscheinen, sobald Sie Haru wieder öffnen. Wird eine Anfrage nicht innerhalb von 10 Minuten beantwortet, lehnt Haru PC sie ab und es wird nichts ausgeführt. Öffnen Sie Haru und stellen Sie die Anfrage erneut |
| Etwas ist schiefgelaufen | Führen Sie `haru-pc logs` aus und hängen Sie die Ausgabe an ein Issue an |

---

## Datenschutz

Haru PC kommt ohne Konto und ohne eigenen Server von uns aus. Ihre Aufgaben, Dateien, das Gedächtnis und Ihre Schlüssel bleiben auf Ihren Geräten. Wenn Sie ein Cloud-KI-Modell wählen, geht der Text Ihrer Aufgabe gemäß dessen Bedingungen an diesen Anbieter. Mit einem lokalen Modell verlässt nichts Ihren Computer.

---

## Danksagung und Lizenz

Haru PC wird von **CreativeLab** entwickelt. Kontakt: creativelab.choi@gmail.com

Es läuft auf **OpenClaw** der OpenClaw Foundation und ihrer Mitwirkenden, verwendet unter der MIT-Lizenz (die OpenClaw-Lizenz und der Urheberrechtshinweis sind in diesem Repository enthalten). Haru PC ist eine unabhängige, inoffizielle Distribution und ist weder mit der OpenClaw Foundation verbunden noch von ihr unterstützt. Der Name „OpenClaw“ wird hier nur verwendet, um zu beschreiben, worauf Haru PC läuft.

Haru PC wird unter der [MIT-Lizenz](LICENSE) veröffentlicht.
