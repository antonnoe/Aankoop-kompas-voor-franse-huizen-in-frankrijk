# CLAUDE.md
Repo: Aankoop-kompas-voor-franse-huizen-in-frankrijk

## Wat dit is
Aankoopkompas voor Franse huizen: een React-tool (in package.json `franse-huizen-checker`) waarmee een koper een adres opzoekt, kadaster-, risico- en DVF-gegevens bekijkt en een kostenaftrek voor renovatiepunten (fosse, dak, ramen, isolatie, sanitair, keuken en meer) berekent. Bevat ook een serverless DVF-route.

## Live adres
Niet in de repo vastgelegd.

## Opbouw
- Standaardtak is `master`.
- `index.html` en `src/main.jsx`: Vite-ingang, laadt `src/App.jsx` (de actieve app) en `assets/css/huisstijl-fixes.css`.
- `src/App.jsx`: de app. `src/index.css`, `src/App.css`.
- `src/App.js`, `src/index.js`, `src/reportWebVitals.js`, `src/setupTests.js`, `src/App.test.js`, `public/index.html`, `public/manifest.json`: restanten van een eerdere Create React App-opzet; Vite gebruikt ze niet (de ingang is `src/main.jsx`).
- `api/dvf.js`: Vercel serverless route, GET `/api/dvf?insee=XXXXX`, m²-prijs voor woningen over de laatste 3 jaar uit geo-DVF van data.gouv.fr. `src/App.jsx` roept deze route zelf niet aan.
- `assets/css/`: `huisstijl.css` en `huisstijl-fixes.css`.

## Techniek
Vite 7, React 19, `@vitejs/plugin-react`, ESLint 9. Scripts: `dev`, `build`, `lint`, `preview`. Geen tests die draaien, geen vercel.json, geen workflows, geen eigen omgevingsvariabelen. README.md is nog de standaardtekst van de Vite-sjabloon.

## Externe diensten en namen van omgevingsvariabelen
- Key-loze open data in de browser: api-adresse.data.gouv.fr (adres), apicarto.ign.fr (kadaster), api.cquest.org (DVF rond een punt), plus links naar georisques.gouv.fr, recherchecadastrale.fr en explore.data.gouv.fr.
- files.data.gouv.fr (geo-DVF) via `api/dvf.js`.
- Vercel (de route in `api/` is een Vercel serverless functie).
- Omgevingsvariabelen: geen.

## Hoe het live gaat
Niet in de repo vastgelegd. `api/dvf.js` is geschreven voor Vercel Serverless (commentaar in het bestand); een vercel.json of workflow ontbreekt.

## Regels en besluiten
Nog geen vastgelegd

## Laatst nagelopen
Laatst nagelopen: 5 november 2026
