# Abstimmungstool

Anonymes Abstimmungstool für Gremiensitzungen. Teilnehmer erhalten physische Stimmzettel mit einmaligen Codes und stimmen digital ab. Ergebnisse werden ausschließlich aggregiert veröffentlicht — eine Zuordnung von Code zu Stimme ist über die API nicht möglich.

## Funktionsübersicht

**Admin:**
- Abstimmungsgruppen erstellen und verwalten (z.B. "LMV 20.02.2026")
- Abstimmungen (Polls) innerhalb einer Gruppe anlegen
- Stimmcodes generieren und verteilen
- Abstimmungsstatus steuern: `DRAFT` → `OPEN` → `CLOSED` → `PUBLISHED`
- Live-Ergebnisse und Teilnahmequoten einsehen

**Teilnehmer:**
- Mit Stimmcode anmelden
- An offenen Abstimmungen teilnehmen (JA / NEIN / ENTHALTUNG)
- Eigene Stimmen einsehen
- Veröffentlichte Ergebnisse ansehen

## Tech-Stack

| Komponente | Technologie |
|---|---|
| Backend | Spring Boot 3.5, Java 21 |
| Frontend | React 19, TypeScript, Tailwind CSS 4, Vite |
| UI-Bibliothek | shadcn/ui (Radix UI + Tailwind) |
| Datenbank | MySQL 8.0 |
| Echtzeit | WebSocket (STOMP + SockJS) |
| Auth | Session-basiert (kein JWT) |

## Schnellstart mit Docker

```bash
# 1. .env-Datei anlegen
cp .env.example .env   # oder manuell erstellen:
# ADMIN_USERNAME=admin
# ADMIN_PASSWORD=sicheres-passwort

# 2. Starten
docker compose up --build
```

Backend erreichbar unter `http://localhost:4222`.

## Lokale Entwicklung

### Voraussetzungen

- Java 21
- Node.js (für das Frontend)
- MySQL 8.0 (oder via Docker)

### Datenbank starten

```bash
# Nur die MySQL-Datenbank via Docker starten
docker compose up db
```

### Backend starten

```bash
# .env-Datei mit Admin-Zugangsdaten anlegen
echo "ADMIN_USERNAME=admin" > .env
echo "ADMIN_PASSWORD=password" >> .env

# Backend starten (Port 4222)
./mvnw spring-boot:run
```

> **Hinweis:** Die `application.properties` verwendet `abstimmungstool-db` als DB-Hostname (Docker-Service-Name). Bei lokaler MySQL-Instanz muss der Hostname in der `.env` überschrieben werden:
> `spring.datasource.url=jdbc:mysql://localhost:3306/abstimmungstool`

### Frontend starten

```bash
cd frontend
npm install
npm run dev    # Dev-Server auf http://localhost:5173
```

## Anonymitätskonzept

Das System garantiert Anonymität durch folgende Maßnahmen:

- Kein API-Endpoint gibt die Zuordnung Code → Stimme preis
- Ergebnisse werden ausschließlich aggregiert zurückgegeben (Anzahl JA/NEIN/ENTHALTUNG)
- WebSocket-Broadcasts enthalten nur Gesamtzahlen, keine Einzelstimmen
- Stimmcodes sind zufällige 8-stellige Zeichenketten, die physisch auf Papier verteilt werden

## Abstimmungsablauf

```
1. Admin erstellt Gruppe und Abstimmungen
2. Admin generiert Stimmcodes → physische Verteilung
3. Teilnehmer meldet sich mit Code an
4. Admin öffnet Abstimmung (DRAFT → OPEN)
5. Teilnehmer stimmen ab (Live-Zähler via WebSocket)
6. Admin schließt Abstimmung (OPEN → CLOSED)
7. Admin veröffentlicht Ergebnis (CLOSED → PUBLISHED)
```

Statusübergänge sind nur vorwärts möglich. Stimmen können nur bei offener Abstimmung abgegeben werden.

## Projektstruktur

```
abstimmungstool/
├── src/main/java/de/kyle/abstimmungstool/
│   ├── config/         # Security, WebSocket, CORS
│   ├── controller/     # REST-Endpoints
│   ├── dto/            # Request/Response Records
│   ├── entity/         # JPA-Entities + Enums
│   ├── exception/      # Custom Exceptions
│   ├── repository/     # Spring Data JPA
│   └── service/        # Geschäftslogik
├── frontend/src/
│   ├── pages/          # Seiten-Komponenten
│   ├── components/     # Wiederverwendbare Komponenten + ui/
│   ├── contexts/       # AuthContext
│   ├── hooks/          # Custom Hooks
│   └── lib/            # API-Client, WebSocket, Types
├── docker-compose.yml
├── Dockerfile
└── .env
```

## API-Übersicht

| Pfad | Zugriff | Beschreibung |
|---|---|---|
| `/api/auth/**` | Öffentlich | Login/Logout/Session-Check |
| `/api/admin/**` | Admin | Gruppen, Polls, Codes verwalten |
| `/api/polls/**` | Teilnehmer + Admin | Abstimmungen einsehen, Stimme abgeben |
| `/api/my-votes` | Teilnehmer + Admin | Eigene Stimmen abrufen |
| `/ws/**` | Authentifiziert | WebSocket (STOMP) |

### WebSocket-Topics

| Topic | Inhalt |
|---|---|
| `/topic/poll-status` | Statusänderungen aller Abstimmungen |
| `/topic/poll/{id}/votes` | Live-Stimmenzähler (nur Gesamtzahl) |
| `/topic/poll/{id}/results` | Aggregierte Ergebnisse bei Veröffentlichung |

## Lizenz

MIT License — siehe [LICENSE](LICENSE).
