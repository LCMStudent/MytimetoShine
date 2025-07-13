# Solarized - Balkonkraftwerk Analyse / Balcony Solar Analysis

Web-Anwendung zur Berechnung des Solarpotentials von Balkonkraftwerken.

*Web application for calculating balcony solar panel potential.*

## 🇩🇪 Deutsch

### Was macht die App?

- Standort auswählen (Karte oder Adresssuche)
- Linie zeichnen wo Panels montiert werden
- Panel-Parameter einstellen
- Energieproduktion und Kosten berechnen

### Deutsche Regelungen

- Max. 2000W DC Panel-Leistung
- Max. 800W AC Wechselrichter-Ausgang
- Berücksichtigt Sonnenverlauf und Jahreszeiten

### Installation

1. Repository klonen:
   ```bash
   git clone <repository-url>
   cd solarized
   ```

2. Abhängigkeiten installieren:
   ```bash
   npm install
   ```

3. API-Schlüssel konfigurieren:
   ```bash
   cp .env.example .env
   # .env Datei bearbeiten
   ```

4. Starten:
   ```bash
   npm run dev
   ```

5. Öffnen: `http://localhost:5173`

### API-Schlüssel

1. [Google Cloud Console](https://console.cloud.google.com/)
2. Projekt erstellen
3. APIs aktivieren: Maps JavaScript API, Solar API, Places API
4. API-Schlüssel erstellen
5. In `.env` eintragen

---

## 🇬🇧 English

### What does the app do?

- Select location (map or address search)
- Draw line where panels will be mounted
- Configure panel parameters  
- Calculate energy production and costs

### German Regulations

- Max. 2000W DC panel capacity
- Max. 800W AC inverter output
- Considers sun movement and seasons

### Installation

1. Clone repository:
   ```bash
   git clone <repository-url>
   cd solarized
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Configure API keys:
   ```bash
   cp .env.example .env
   # Edit .env file
   ```

4. Start:
   ```bash
   npm run dev
   ```

5. Open: `http://localhost:5173`

### API Keys

1. [Google Cloud Console](https://console.cloud.google.com/)
2. Create project
3. Enable APIs: Maps JavaScript API, Solar API, Places API
4. Create API key
5. Add to `.env`

---

## Requirements

- Node.js 16+
- Google Maps API key
- Modern browser

**Built with Vite and vanilla JavaScript**
