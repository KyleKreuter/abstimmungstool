# Abstimmungstool - Implementierungsplan

## Architektur-Übersicht

### Tech-Stack
- **Backend**: Spring Boot 3.5.11, Java 21, Spring Security, Spring WebSocket, Spring Data JPA, Lombok
- **Datenbank**: MySQL
- **Frontend**: React + Vite (im `frontend/` Verzeichnis)
- **Kommunikation**: REST API + WebSocket (STOMP)

### Entitäten & Hierarchie
```
PollGroup (z.B. "LMV 20.02.2026")
  ├── n Polls (Abstimmungen dieser Veranstaltung)
  └── n VotingCodes (gültig für alle Polls dieser Gruppe)
```
- **PollGroup** — Eine Veranstaltung/Gruppe (z.B. "LMV 20.02.2026"), enthält Polls und VotingCodes
- **Poll** — Eine Abstimmung mit Titel, Beschreibung, Status und Admin-Notizen, gehört zu genau einer PollGroup
- **VotingCode** — Zufällig generierter Code, gehört zu einer PollGroup, wird physisch auf Papierzetteln verteilt, dient als Login, einmalig pro Poll einlösbar
- **Vote** — Eine abgegebene Stimme (Ja / Nein / Enthaltung), referenziert Poll und VotingCode intern in der DB, **unveränderbar** sobald die Abstimmung CLOSED ist

### Statusmodell (Poll)
```
DRAFT  →  OPEN  →  CLOSED  →  PUBLISHED
  ↑
  └── (nur bearbeitbar)
```
- **DRAFT**: Abstimmung wird vorbereitet, nur für Admin sichtbar
- **OPEN**: Teilnehmer können abstimmen
- **CLOSED**: Keine Stimmen mehr möglich, Ergebnis noch nicht öffentlich
- **PUBLISHED**: Ergebnis ist öffentlich einsehbar

### Anonymität
- Codes sind **inhärent anonym** — sie werden physisch auf Papierzetteln an Teilnehmende ausgeteilt
- Es gibt keine digitale Zuordnung von Code zu Person
- `Vote` referenziert den `VotingCode` intern in der DB (um doppelte Stimmabgabe zu verhindern)
- **Kein API-Endpunkt** gibt preis, wie ein bestimmter Code abgestimmt hat — Ergebnisse werden nur aggregiert (Ja/Nein/Enthaltung-Zähler) zurückgegeben

### Authentifizierung (zwei Rollen)
- **Admin**: Login via Benutzername + Passwort (aus `application.properties`)
- **Teilnehmer**: Login via VotingCode — Code bestimmt die PollGroup, Teilnehmer sieht nur die Polls dieser Gruppe und seine eigenen Stimmen
- Alle Inhalte sind **hinter dem Login** — ohne gültigen Code oder Admin-Login kein Zugriff

---

## Backend

### 1. Dependency ergänzen: `spring-boot-starter-data-jpa`
- [ ] `spring-boot-starter-data-jpa` zur `pom.xml` hinzufügen (fehlt aktuell!)
- [ ] `mvn clean compile` ausführen um sicherzustellen, dass alles auflöst

### 2. `application.properties` konfigurieren
- [ ] MySQL-Verbindung konfigurieren (`spring.datasource.*`)
- [ ] JPA/Hibernate konfigurieren (`spring.jpa.hibernate.ddl-auto=update`, Dialect)
- [ ] Admin-Credentials als Properties definieren (`app.admin.username`, `app.admin.password`)
- [ ] WebSocket-Endpunkt konfigurieren (falls nötig)

### 3. JPA Entities
- [ ] `PollGroup` Entity erstellen
  - Felder: `id`, `name` (unique, z.B. "LMV 20.02.2026"), `createdAt`
- [ ] `Poll` Entity erstellen
  - Felder: `id`, `title`, `description`, `notes` (Admin-Notizen, optional), `status` (Enum), `group` (ManyToOne, **pflicht**), `createdAt`, `updatedAt`
- [ ] `PollStatus` Enum erstellen (DRAFT, OPEN, CLOSED, PUBLISHED)
- [ ] `VoteOption` Enum erstellen (YES, NO, ABSTAIN)
- [ ] `VotingCode` Entity erstellen
  - Felder: `id`, `code` (unique, zufällig generiert), `group` (ManyToOne, **pflicht** — Code gehört zu einer PollGroup)
- [ ] `Vote` Entity erstellen
  - Felder: `id`, `poll` (ManyToOne), `votingCode` (ManyToOne), `option` (VoteOption Enum), `votedAt`
  - Unique Constraint auf (`poll`, `votingCode`) — verhindert doppelte Stimmabgabe
  - Stimme ist **unveränderbar** sobald Poll-Status CLOSED oder PUBLISHED ist

### 4. Repositories
- [ ] `PollGroupRepository` (JpaRepository)
- [ ] `PollRepository` (JpaRepository) — inkl. `findByGroup(PollGroup)`
- [ ] `VotingCodeRepository` (JpaRepository) — inkl. `findByCode(String code)`, `findByGroup(PollGroup)`, `countByGroup(PollGroup)`
- [ ] `VoteRepository` (JpaRepository) — inkl. `countByPollAndOption(Poll, VoteOption)`, `existsByPollAndVotingCode(Poll, VotingCode)`, `findByPollAndVotingCode(Poll, VotingCode)`, `findByVotingCode(VotingCode)`

### 5. Services
- [ ] `PollGroupService`
  - Gruppe erstellen, umbenennen, löschen (nur wenn keine Polls und keine Codes zugeordnet)
  - Alle Gruppen auflisten (mit Anzahl Polls und Codes)
- [ ] `PollService`
  - Abstimmung erstellen (Status: DRAFT, PollGroup pflicht)
  - Status-Übergänge: DRAFT→OPEN, OPEN→CLOSED, CLOSED→PUBLISHED
  - Abstimmung bearbeiten (nur im DRAFT-Status)
  - Admin-Notizen lesen und bearbeiten
  - Alle Abstimmungen auflisten (Admin: alle, Teilnehmer: nur OPEN + PUBLISHED der eigenen Gruppe)
  - Ergebnisse abrufen (nur wenn PUBLISHED) — **nur aggregiert** (Ja/Nein/Enthaltung-Zähler), nie pro Code
- [ ] `VotingCodeService`
  - Codes generieren für eine bestimmte PollGroup (Batch, z.B. 50 Stück)
  - Alle Codes einer Gruppe auflisten (Admin, **ohne Stimm-Details**)
  - Code validieren (existiert + gehört zur richtigen Gruppe)
  - Code-Login: Session für Teilnehmer erstellen, PollGroup aus Code ableiten
- [ ] `VoteService`
  - Stimme abgeben: Code validieren → Code gehört zur Gruppe der Poll → prüfen ob bereits abgestimmt → Vote speichern
  - Stimme ändern: nur möglich solange Poll-Status = OPEN
  - Eigene Stimmen abrufen (alle Votes des eingeloggten VotingCodes innerhalb seiner Gruppe)
  - Ergebnis zählen (Ja/Nein/Enthaltung pro Poll) — **nur aggregiert**, keine Zuordnung Code→Stimme nach außen

### 6. REST Controller
- [ ] `AuthController`
  - `POST /api/auth/admin/login` — Admin-Login (Benutzername + Passwort)
  - `POST /api/auth/code/login` — Teilnehmer-Login (Body: `{ code }`)
  - `POST /api/auth/logout` — Logout (beide Rollen)
  - `GET /api/auth/me` — Aktuelle Session-Info (Rolle, ggf. Code-ID)
- [ ] `PollGroupController` (Admin, authentifiziert)
  - `POST /api/admin/groups` — Gruppe erstellen
  - `GET /api/admin/groups` — Alle Gruppen auflisten (mit Anzahl Polls/Codes)
  - `GET /api/admin/groups/{id}` — Einzelne Gruppe mit Polls
  - `PUT /api/admin/groups/{id}` — Gruppe umbenennen
  - `DELETE /api/admin/groups/{id}` — Gruppe löschen (nur wenn leer)
- [ ] `PollController` (Admin, authentifiziert)
  - `POST /api/admin/groups/{groupId}/polls` — Abstimmung in Gruppe erstellen
  - `PUT /api/admin/polls/{id}` — Abstimmung bearbeiten
  - `PATCH /api/admin/polls/{id}/status` — Status ändern (open, close, publish)
  - `PUT /api/admin/polls/{id}/notes` — Admin-Notizen bearbeiten
  - `GET /api/admin/polls` — Alle Abstimmungen auflisten (filterbar nach Gruppe)
  - `GET /api/admin/polls/{id}` — Einzelne Abstimmung mit aggregiertem Ergebnis und Notizen
- [ ] `VotingCodeController` (Admin, authentifiziert)
  - `POST /api/admin/groups/{groupId}/codes/generate` — Neue Codes für eine Gruppe generieren
  - `GET /api/admin/groups/{groupId}/codes` — Alle Codes einer Gruppe auflisten (**ohne Stimm-Details**)
- [ ] `ParticipantPollController` (Teilnehmer, authentifiziert via Code)
  - `GET /api/polls` — Alle sichtbaren Abstimmungen der eigenen Gruppe (OPEN + PUBLISHED)
  - `GET /api/polls/{id}` — Einzelne Abstimmung (inkl. eigene Stimme falls vorhanden)
  - `POST /api/polls/{id}/vote` — Stimme abgeben (Body: `{ option }`, Code kommt aus Session)
  - `PUT /api/polls/{id}/vote` — Stimme ändern (nur solange Poll OPEN)
  - `GET /api/polls/{id}/results` — Aggregiertes Ergebnis (nur wenn PUBLISHED, keine Code-Zuordnung)
  - `GET /api/my-votes` — Alle eigenen Stimmen innerhalb der Gruppe

### 7. WebSocket Konfiguration
- [ ] `WebSocketConfig` erstellen (STOMP über SockJS)
  - Endpoint: `/ws`
  - Broker-Prefix: `/topic`
  - Application-Prefix: `/app`
- [ ] WebSocket-Topics definieren:
  - `/topic/poll-status` — Poll-Status-Änderungen (geöffnet, geschlossen, veröffentlicht)
  - `/topic/poll/{id}/votes` — Live-Zähler Updates (nur Anzahl Stimmen, nicht welche Option)
  - `/topic/poll/{id}/results` — Ergebnis-Veröffentlichung
- [ ] `WebSocketEventService` erstellen
  - Methoden zum Broadcasten von Events bei Status-Änderungen und neuen Stimmen
  - In `PollService` und `VoteService` einbinden

### 8. Security Konfiguration
- [ ] `SecurityConfig` erstellen
  - `/api/auth/**` — öffentlich (Login-Endpunkte)
  - `/api/admin/**` — authentifiziert, nur Rolle ADMIN
  - `/api/polls/**`, `/api/my-votes` — authentifiziert, Rolle PARTICIPANT oder ADMIN
  - `/ws/**` — authentifiziert (WebSocket)
  - Statische Dateien — öffentlich
- [ ] Zwei Authentifizierungswege:
  - Admin: Benutzername + Passwort aus `application.properties`
  - Teilnehmer: VotingCode → Session mit Rolle PARTICIPANT und VotingCode-Referenz
- [ ] CORS konfigurieren (Frontend läuft auf anderem Port im Dev-Modus)
- [ ] CSRF für API-Endpunkte deaktivieren (REST API mit Session)
- [ ] Session-basierte Authentifizierung (Spring Session)

---

## Frontend

### Design-Prinzip
- **shadcn/ui** als primäre Komponentenbibliothek — jede UI-Komponente soll aus shadcn kommen
- **Grauskala-Design** (Schwarz/Weiß/Grau) — keine Farben, nur neutrale Töne
- Tailwind CSS als Grundlage (wird von shadcn vorausgesetzt)

### 9. Projekt-Setup
- [ ] Vite + React Projekt in `frontend/` erstellen (`npm create vite@latest frontend -- --template react-ts`)
- [ ] Tailwind CSS installieren und konfigurieren
- [ ] shadcn/ui initialisieren (`npx shadcn@latest init`)
  - Theme auf Grauskala konfigurieren (neutral/slate/zinc Palette)
  - CSS-Variablen auf Schwarz/Weiß/Grau anpassen (keine farbigen Akzente)
- [ ] shadcn-Komponenten installieren, die projektübergreifend gebraucht werden:
  - `button`, `input`, `card`, `dialog`, `badge`, `table`, `tabs`, `select`, `textarea`, `toast`, `alert`, `separator`, `dropdown-menu`, `form`, `label`
- [ ] Routing einrichten (React Router)
- [ ] HTTP-Client einrichten (fetch oder axios, Basis-URL konfigurierbar)
- [ ] WebSocket-Client einrichten (SockJS + STOMP.js)

### 10. Login & Authentifizierung
- [ ] Landing-Page / Login-Seite (`/`)
  - shadcn `Card` zentriert, Code-Eingabe via shadcn `Input` + `Button`
  - Link zu Admin-Login (shadcn `Button` variant="link")
  - API-Call an `POST /api/auth/code/login`
  - Fehlermeldung via shadcn `Alert` (destructive variant, Grauskala)
  - Bei Erfolg: Weiterleitung zur Teilnehmer-Ansicht
- [ ] Admin-Login-Seite (`/admin/login`)
  - shadcn `Card` mit `Form`, `Input`, `Label`, `Button`
  - API-Call an `POST /api/auth/admin/login`
  - Bei Erfolg: Weiterleitung zum Dashboard
- [ ] Auth-Context/State für Session-Verwaltung (Rolle + Code-Info)
- [ ] Protected Routes: Admin-Bereich und Teilnehmer-Bereich getrennt absichern

### 11. Admin-Dashboard
- [ ] Dashboard-Seite (`/admin`)
  - shadcn `Tabs` für Gruppen-Filter, `Table` für Abstimmungsliste
  - Status via shadcn `Badge` (outline-Varianten in Graustufen)
  - shadcn `Button` für "Neue Abstimmung"
- [ ] Abstimmung erstellen — shadcn `Dialog` mit `Form`, `Input`, `Textarea`, `Select` (Gruppe auswählen)
- [ ] Abstimmung bearbeiten (nur im DRAFT-Status) — gleicher `Dialog` vorausgefüllt
- [ ] Admin-Notizen pro Abstimmung — shadcn `Textarea` im Detail-Bereich
- [ ] Status-Buttons pro Abstimmung (shadcn `Button` + `AlertDialog` zur Bestätigung):
  - DRAFT → "Öffnen" Button
  - OPEN → "Schließen" Button
  - CLOSED → "Veröffentlichen" Button
- [ ] Live-Ergebnis-Ansicht für Admin (Stimmenanzahl in Echtzeit via WebSocket)
- [ ] Gruppen-Verwaltung:
  - Gruppen erstellen/umbenennen via shadcn `Dialog` + `Input`
  - Gruppen löschen via shadcn `AlertDialog`
  - Gruppen-Detailansicht: Polls und Codes dieser Gruppe in shadcn `Table`
- [ ] Code-Verwaltung (pro Gruppe):
  - Codes generieren via shadcn `Dialog` + `Input` (Anzahl)
  - Code-Liste in shadcn `Table` (zum Ausdrucken/Exportieren, **ohne Stimm-Details**)

### 12. Teilnehmer-Ansicht
- [ ] Teilnehmer-Dashboard (`/polls`) — nach Code-Login
  - shadcn `Card`-Liste aller sichtbaren Abstimmungen der eigenen Gruppe (OPEN + PUBLISHED)
  - Eigene Stimme pro Abstimmung via shadcn `Badge` anzeigen (falls bereits abgestimmt)
  - Falls keine Abstimmungen: Hinweis in shadcn `Alert`
- [ ] Abstimmungs-Formular
  - Drei shadcn `Button`s: Ja / Nein / Enthaltung (outline-Varianten, aktive Auswahl mit dunklem Hintergrund)
  - Bestätigung via shadcn `AlertDialog`
  - Erfolgs-/Fehler-Meldung via shadcn `Toast`
  - Stimme ändern: solange Poll OPEN, kann die Stimme geändert werden
  - Nach CLOSED: Buttons deaktiviert, Stimme nur noch als `Badge` angezeigt
- [ ] Übersicht eigene Stimmen (`/my-votes`)
  - shadcn `Table` mit allen bisherigen Stimmen innerhalb der eigenen Gruppe
- [ ] WebSocket-Listener:
  - Neue Abstimmung geöffnet → automatisch anzeigen
  - Abstimmung geschlossen → Formular deaktivieren, Stimme einfrieren

### 13. Ergebnis-Anzeige
- [ ] Ergebnis-Seite (`/polls/{id}/results`)
  - shadcn `Card` mit Balkendiagramm in Graustufen (Ja/Nein/Enthaltung)
  - Gesamtzahl der Stimmen via shadcn `Badge`
  - Wird erst angezeigt wenn Status = PUBLISHED
- [ ] WebSocket-Listener: Ergebnis veröffentlicht → automatisch Ergebnis-Seite anzeigen

---

## Optionale Verbesserungen (nach MVP)
- [ ] Codes als QR-Code generieren und exportieren (PDF)
- [ ] Mehrere Abstimmungen gleichzeitig offen
- [ ] Abstimmungs-Historie / Archiv
- [ ] Dark Mode (shadcn unterstützt das nativ via `dark`-Klasse)
- [ ] Rate-Limiting für Vote-Endpunkt
- [ ] Docker Compose Setup (Backend + MySQL + Frontend)
