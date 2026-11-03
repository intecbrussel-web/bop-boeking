# BOP Boekingspagina (simpele versie)

Een eenvoudige pagina waar mensen zich kunnen inschrijven voor lessen van het Brussels Ouderenplatform.
Alleen HTML, CSS, JavaScript en een klein Node.js-servertje. Geen database: alles staat in `data.json`.

## Starten

1. Installeer [Node.js](https://nodejs.org) (LTS-versie).
2. Open een terminal in deze map en typ:
   ```
   npm install
   npm start
   ```
3. Open http://localhost:3000 in je browser.

## Hoe zit het in elkaar?

| Bestand | Wat doet het? |
|---|---|
| `server.js` | De server. Geeft de lessen terug en slaat boekingen op. |
| `data.json` | De "database": lijst met lessen + lijst met boekingen. |
| `public/index.html` | De structuur van de pagina. |
| `public/style.css` | De opmaak (groot en duidelijk voor ouderen). |
| `public/app.js` | Haalt lessen op, toont ze, en verstuurt een boeking. |

## API

- `GET /api/lessen` → alle lessen met het aantal vrije plaatsen
- `POST /api/boekingen` met `{ "lesId", "naam", "telefoon" }` → boeking maken (weigert als de les volzet is)

## Een les toevoegen

Open `data.json` en voeg een regel toe aan `lessen`, met een uniek `id`. Je hoeft de server niet te herstarten: het bestand wordt bij elke aanvraag opnieuw gelezen.

## Vrije plaatsen

`vrije plaatsen = capaciteit − aantal boekingen voor die les`
Een les is pas "volzet" als dat getal 0 is.
