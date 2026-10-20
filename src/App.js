import React, { useState, useEffect } from "react";

// Helper: Format currency (Euro)
function fmtBedrag(val) {
  // Leeg of niet ingevuld → streepje
  if (val === "" || val === null || val === undefined) return "–";
  const num = Number(val);
  if (Number.isNaN(num)) return "–";
  return num.toLocaleString("nl-NL");
}

// --- Constants ---
const bronUrl = "https://www.jouweigenbrondata.nl/"; // <-- hier stel je je brondata-url in
const bouwtypes = [
  "En pierre (natuursteen)",
  "Betonblokken (parpaings)",
  "Baksteen",
  "Keramische blokken",
  "Strobalen",
  "Houtvakwerk",
  "Leemconstructie"
];
const bodemtypes = ["Klei", "Rots", "Zand", "Leem", "Veen", "Gemengd"];
const internetOpties = ["", "Glasvezel", "4G", "5G", "ADSL", "Geen"];
const mandatory = (str) => (
  <span>
    {str}{" "}
    <span style={{ color: "red" }} title="Verplicht veld">
      *
    </span>
  </span>
);
const important = (str) => (
  <span>
    {str}{" "}
    <span style={{ color: "#e08b00" }} title="Belangrijk veld">
      **
    </span>
  </span>
);

// --- Kosten mindering hoofdposten (met zwembad) ---
const kostenMinderingItems = [
  { stateName: "fosse", label: "Vervangen fosse septique", default: 8000, mandatory: true },
  { stateName: "dak", label: "Dakvernieuwing", default: 15000, important: true },
  { stateName: "ramen", label: "Ramen isolatie/vervanging", default: 4000, important: true },
  { stateName: "isolatie", label: "Algemene isolatie (vloer/dak/wanden)", default: 8000, important: true },
  { stateName: "sanitair", label: "Sanitaire voorzieningen", default: 7000, important: true },
  { stateName: "keuken", label: "Vernieuwen keuken", default: 6000, important: true },
  { stateName: "schilderwerk", label: "Schilderwerk binnen/buiten", default: 5000, important: true },
  { stateName: "bijgebouwen", label: "Bijgebouwen/garage herstel", default: 8000 },
  { stateName: "buitenterrein", label: "Buitenterrein aanleg/herstel", default: 12000 },
  { stateName: "zwembad", label: "Zwembad herstel/aanleg", default: 14000 }
];

// Checklist: Notaris als dropdown
const checklistGroepen = [
  {
    naam: "Juridisch/Notarieel",
    items: [
      { name: "kadaster", label: "Kadasterinfo gecontroleerd", mandatory: true },
      { name: "bestemmingsplan", label: "Bestemmingsplan gecheckt (C.U., PLU)", important: true },
      { name: "erfdienst", label: "Erfdienstbaarheden/droit de passage bekeken" },
      {
        name: "notaris",
        label: "Notaris gekozen/gecontacteerd",
        important: true,
        type: "select",
        opties: ["", "Notaris Dupont", "Notaris Martin"]
      },
      { name: "financiering", label: "Financiering/hypotheek geregeld" }
    ]
  },
  {
    naam: "Bouwkundig",
    items: [
      { name: "bouwkundig", label: "Bouwkundige staat beoordeeld (rapport)", important: true },
      { name: "fundering", label: "Fundering gecontroleerd", kostenVeld: true },
      { name: "dak", label: "Dakstate/dakgoten gecontroleerd", kostenVeld: true },
      { name: "ramen", label: "Ramen gecheckt", kostenVeld: true },
      { name: "isolatie", label: "Isolatie gecontroleerd", kostenVeld: true },
      { name: "sanitair", label: "Sanitair/waterafvoer op orde", kostenVeld: true },
      { name: "elektra", label: "Elektra-installatie in orde", kostenVeld: true },
      { name: "verwarming", label: "Verwarming gecontroleerd" },
      { name: "keuken", label: "Keuken staat beoordeeld", kostenVeld: true },
      { name: "schilderwerk", label: "Schilderwerk beoordeeld", kostenVeld: true },
      { name: "bijgebouwen", label: "Bijgebouwen beoordeeld", kostenVeld: true },
      { name: "buitenterrein", label: "Buitenterrein/tuin beoordeeld", kostenVeld: true },
      { name: "zwembad", label: "Zwembad/herstel aanleg", kostenVeld: true }
    ]
  },
  {
    naam: "Technisch/Installaties",
    items: [
      { name: "waterleiding", label: "Waterleiding controle" },
      { name: "riolering", label: "Rioleringssituatie/fosse septique", kostenVeld: true },
      { name: "energielabel", label: "Energielabel/DPE ontvangen" }
    ]
  },
  {
    naam: "Attesten/DDT",
    items: [
      { name: "asbest", label: "Asbest gecontroleerd" },
      { name: "lood", label: "Lood gecontroleerd" },
      { name: "termieten", label: "Termieten gecontroleerd" },
      { name: "huisZwam", label: "Hout- of huiszwam gecontroleerd" }
    ]
  },
  {
    naam: "Overige",
    items: [
      { name: "internet", label: "Internet(bereik/kwaliteit) getest" },
      { name: "overlast", label: "Mogelijke overlast bekeken" },
      { name: "voorzieningen", label: "Afstand tot voorzieningen vastgesteld" },
      { name: "ligging", label: "Ligging/uitzicht goed" },
      { name: "inventaris", label: "Inventarisafspraken gemaakt" }
    ]
  }
];

// --- Tabbladen helper ---
const Tabs = ({ tab, setTab, list }) => (
  <div style={{ display: "flex", gap: 12, marginBottom: 25, flexWrap: "wrap" }}>
    {list.map((item, idx) => (
      <button
        key={item}
        onClick={() => setTab(idx)}
        style={{
          background: tab === idx ? "#3067b2" : "#eaf0f6",
          color: tab === idx ? "#fff" : "#264",
          fontWeight: 600,
          padding: "7px 19px",
          borderRadius: 7,
          border: "none",
          boxShadow: tab === idx ? "0 2px 12px #1b3954" : "none",
          cursor: "pointer"
        }}
      >
        {item}
      </button>
    ))}
  </div>
);

// --- Address autocomplete ---
function AdresAutoComplete({ setAdresFields }) {
  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (query.length < 3) {
      setSuggestions([]);
      return;
    }
    setIsLoading(true);
    fetch(`https://api-adresse.data.gouv.fr/search/?q=${encodeURIComponent(query)}`)
      .then((res) => res.json())
      .then((data) => {
        setSuggestions(data.features || []);
        setIsLoading(false);
      })
      .catch(() => setIsLoading(false));
  }, [query]);

  function handleSelect(suggestion) {
    setQuery(suggestion.properties.label);
    setSuggestions([]);
    setAdresFields({
      adres: suggestion.properties.label,
      straat: suggestion.properties.street || "",
      huisnummer: suggestion.properties.housenumber || "",
      postcode: suggestion.properties.postcode || "",
      gemeente: suggestion.properties.city || "",
      insee: suggestion.properties.citycode || "",
      lat: suggestion.geometry.coordinates?.[1] || "",
      lon: suggestion.geometry.coordinates?.[0] || ""
    });
  }

  return (
    <div style={{ position: "relative" }}>
      <input
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Bijv. 22 rue de Sehen, Montcavrel"
        style={{ width: "100%", fontSize: "1rem", padding: "6px" }}
      />
      {isLoading && <span> Laden...</span>}
      {suggestions.length > 0 && (
        <ul
          style={{
            position: "absolute",
            top: "2.4em",
            background: "#fff",
            border: "1px solid #aaa",
            margin: 0,
            padding: 0,
            listStyle: "none",
            width: "100%",
            maxHeight: "230px",
            overflowY: "auto",
            zIndex: 100,
            fontSize: "1rem"
          }}
        >
          {suggestions.map((suggestion) => (
            <li
              key={suggestion.properties.id || suggestion.properties.label}
              style={{ padding: "7px", cursor: "pointer", borderBottom: "1px solid #eee" }}
              onClick={() => handleSelect(suggestion)}
            >
              {suggestion.properties.label}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

// --- Bouwgrond prijs/m2 ophalen uit DVF ---
async function fetchPrijsM2Bouwgrond(insee) {
  // DVF: https://www.data.gouv.fr/fr/datasets/demande-de-valeurs-foncieres/
  // Real API: https://data.economie.gouv.fr/api/records/1.0/search/?dataset=dvf_etalab&refine.code_commune={INSEE}&refine.nature_mutation=Vente&refine.type_local=Terrain
  // Als voorbeeld; neem evt. een dummy/prijs
  try {
    if (!insee) return null;
    const url = `https://data.economie.gouv.fr/api/records/1.0/search/?dataset=dvf_etalab&refine.code_commune=${insee}&refine.nature_mutation=Vente&refine.type_local=Terrain`;
    const resp = await fetch(url);
    const data = await resp.json();
    // Bereken gemiddelde prijs/m2
    let sum = 0,
      count = 0;
    data.records.forEach((rec) => {
      if (rec.fields.valeur_fonciere && rec.fields.surface_terrain && rec.fields.surface_terrain > 1000) {
        sum += rec.fields.valeur_fonciere / rec.fields.surface_terrain;
        count++;
      }
    });
    return count ? Math.round(sum / count) : null;
  } catch (e) {
    return null;
  }
}

function App() {
  // --- Tab state ---
  const tabNames = [
    "Basisgegevens",
    "Checklist",
    "Kosten/Herstelpunten",
    "Risico's",
    "Koopproces & Juridisch traject",
    "Advies/PDF"
  ];
  const [tab, setTab] = useState(0);

  // --- Basisgegevens/overige ---
  const [adresFields, setAdresFields] = useState({
    adres: "",
    straat: "",
    huisnummer: "",
    postcode: "",
    gemeente: "",
    insee: "",
    lat: "",
    lon: ""
  });
  const [vraagprijs, setVraagprijs] = useState("");
  const [makelaar, setMakelaar] = useState("");
  const [notaris, setNotaris] = useState("");
  const [bouwjaar, setBouwjaar] = useState("");
  const [oppervlakte, setOppervlakte] = useState("");
  const [perceel, setPerceel] = useState("");
  const [inventaris, setInventaris] = useState("");
  const [eigenaar, setEigenaar] = useState("");
  const [teKoopSinds, setTeKoopSinds] = useState("");
  const [directBeschikbaar, setDirectBeschikbaar] = useState("");
  const [soortBouw, setSoortBouw] = useState("");
  const [bodem, setBodem] = useState("");
  const [ligging, setLigging] = useState("");
  const [overlast, setOverlast] = useState("");
  const [internet, setInternet] = useState("");
  const [erfdienst, setErfdienst] = useState("");
  // Vaste lasten
  const [taxeF, setTaxeF] = useState("");
  const [taxeH, setTaxeH] = useState("");
  const [riolering, setRiolering] = useState("");

  // Checklist meta + state (scheiding checkboxes/selects)
  const alleItems = checklistGroepen.flatMap((gr) => gr.items);
  const checkboxNames = alleItems.filter((i) => i.type !== "select").map((i) => i.name);
  const selectNames = alleItems.filter((i) => i.type === "select").map((i) => i.name);
  const checklistMeta = Object.fromEntries(alleItems.map((i) => [i.name, i]));

  const [checked, setChecked] = useState(
    checkboxNames.reduce((acc, name) => ({ ...acc, [name]: false }), {})
  );
  const [kostenChecklist, setKostenChecklist] = useState(
    checkboxNames.reduce((acc, name) => ({ ...acc, [name]: "" }), {})
  );
  const [checkSelect, setCheckSelect] = useState(
    selectNames.reduce((acc, name) => ({ ...acc, [name]: "" }), {})
  );

  const handleCheck = (e) =>
    setChecked({
      ...checked,
      [e.target.name]: e.target.checked
    });
  const handleKostenChecklistChange = (e, name) =>
    setKostenChecklist({
      ...kostenChecklist,
      [name]: e.target.value
    });
  const handleChecklistSelect = (e, name) =>
    setCheckSelect({
      ...checkSelect,
      [name]: e.target.value
    });

  // Kosten mindering
  const [kosten, setKosten] = useState(
    kostenMinderingItems.reduce((acc, i) => ({ ...acc, [i.stateName]: i.default }), {})
  );
  const [minderingChecked, setMinderingChecked] = useState(
    kostenMinderingItems.reduce((acc, item) => ({ ...acc, [item.stateName]: false }), {})
  );
  const handleMinderingCheck = (e) =>
    setMinderingChecked({
      ...minderingChecked,
      [e.target.name]: e.target.checked
    });
  const handleKostenChange = (e, name) =>
    setKosten({
      ...kosten,
      [name]: e.target.value
    });

  // Dummy DVF woon m² prijs
  const [autoM2Prijs, setAutoM2Prijs] = useState("");
  useEffect(() => {
    if (adresFields.insee)
      setTimeout(() => {
        setAutoM2Prijs("1300");
      }, 600);
  }, [adresFields.insee]);

  // DVF: Bouwgrond prijs/m²
  const [bouwgrondM2Prijs, setBouwgrondM2Prijs] = useState("");
  useEffect(() => {
    async function fetcher() {
      const price = await fetchPrijsM2Bouwgrond(adresFields.insee);
      if (price !== null) setBouwgrondM2Prijs(price);
      else setBouwgrondM2Prijs("");
    }
    if (Number(perceel) >= 5000 && adresFields.insee) fetcher();
    else setBouwgrondM2Prijs("");
  }, [perceel, adresFields.insee]);

  // Dummy risico's / notarissen / risico type
  const [risico, setRisico] = useState([]);
  const [risicoType, setRisicoType] = useState("");
  useEffect(() => {
    if (adresFields.adres && adresFields.gemeente) {
      if (adresFields.gemeente.toLowerCase().includes("montcavrel")) {
        setRisico(["Overstromingsgevaar: Hoog", "Radongehalte: Verhoogd", "Aardbevingsrisico: Matig"]);
        setRisicoType("hoog");
      } else {
        setRisico(["Overstromingsgevaar: Laag", "Radongehalte: Niet verhoogd", "Aardbevingsrisico: Geen"]);
        setRisicoType("laag");
      }
    }
  }, [adresFields.adres, adresFields.gemeente]);

  // Berekeningen
  const marktOppervlakte = Number(oppervlakte) > 0 ? Number(oppervlakte) : 0;
  const marktprijs = Number(autoM2Prijs) > 0 ? Number(autoM2Prijs) : 0;
  const marktwaardeWoon = marktOppervlakte * marktprijs;
  const perceelValue =
    Number(perceel) >= 5000 && bouwgrondM2Prijs
      ? bouwgrondM2Prijs * Number(perceel)
      : 0;
  const marktwaarde = marktwaardeWoon + perceelValue;

  const kostenHoofd = Object.entries(minderingChecked).reduce(
    (sum, [key, val]) => (val ? sum + (Number(kosten[key]) || 0) : sum),
    0
  );
  const kostenHerstel = checkboxNames
    .filter((name) => checklistMeta[name]?.kostenVeld && checked[name])
    .reduce((sum, name) => sum + (Number(kostenChecklist[name]) || 0), 0);

  const inventarisPrijs = Number(inventaris) > 0 ? Number(inventaris) : 0;

  const heeftBasis = marktwaarde > 0 || Number(vraagprijs) > 0;
  const adviesprijsRaw = heeftBasis
    ? marktwaarde - kostenHoofd - kostenHerstel + inventarisPrijs
    : null;
  const adviesprijs =
    adviesprijsRaw != null ? Math.max(1, Math.round(adviesprijsRaw)) : null;

  const totaalChecklist = checkboxNames.length + selectNames.length;
  const aangevinktCheckboxen = checkboxNames.filter((name) => checked[name]).length;
  const aangevinktSelects = selectNames.filter((name) => !!checkSelect[name]).length;
  const aangevinkt = aangevinktCheckboxen + aangevinktSelects;

  const aangevinktHerstel = checkboxNames.filter(
    (name) => checked[name] && checklistMeta[name]?.kostenVeld
  ).length;

  const checklistPerc =
    totaalChecklist > 0 ? Math.round((aangevinkt / totaalChecklist) * 100) : 0;

  // Kadaster/Georisques-link helpers
  const kadasterUrl = adresFields.insee
    ? `https://www.recherchecadastrale.fr/?commune=${adresFields.insee}&recherche=par_adresse`
    : undefined;
  const georisquesUrl = adresFields.insee
    ? `https://www.georisques.gouv.fr/cartographie?code_commune=${adresFields.insee}`
    : adresFields.postcode
    ? `https://www.georisques.gouv.fr/cartographie?code_postal=${adresFields.postcode}`
    : "https://www.georisques.gouv.fr/";

  // PDF: browser-print (de actieve app staat in App.jsx)
  function handlePDFGen() {
    window.print();
  }

  // --- Waarschuwingen ---
  function renderWarnings() {
    const ratio =
      marktwaarde > 0 && adviesprijs != null ? adviesprijs / marktwaarde : 1;
    const herstelratio =
      totaalChecklist > 0 ? aangevinktHerstel / totaalChecklist : 0;

    return (
      <div>
        {herstelratio > 0.25 && (
          <div
            style={{
              background: "#fff4ee",
              borderLeft: "5px solid #d92c1e",
              padding: "6px 16px",
              marginBottom: 8,
              fontWeight: 700
            }}
          >
            Let op: veel herstelpunten aangevinkt.
            <br />
            Stel extra onderzoek in en bied voorzichtig!
          </div>
        )}
        {risicoType === "hoog" && (
          <div
            style={{
              background: "#fff4ea",
              borderLeft: "5px solid #e18803",
              padding: "6px 16px",
              marginBottom: 8,
              fontWeight: 600
            }}
          >
            Let op: dit huis ligt in een georisques-gebied met verhoogde risico's.
            <br />
            Controleer alle attesten en laat altijd inspectie uitvoeren!
          </div>
        )}
        {marktwaarde > 0 && adviesprijs != null && ratio < 0.8 && (
          <div
            style={{
              background: "#fcf7ec",
              borderLeft: "5px solid #0d8733",
              padding: "6px 16px",
              fontWeight: 600
            }}
          >
            Adviesprijs ({fmtBedrag(adviesprijs)} €) is veel lager dan de
            m²-marktwaarde ({fmtBedrag(marktwaarde)} €).
            <br />
            Advies: bied voorzichtig, maak voorbehoud!
          </div>
        )}
        {adviesprijsRaw != null && adviesprijsRaw <= 0 && (
          <div style={{ color: "red", fontWeight: 700, margin: "12px 0" }}>
            Let op: Herstelkosten zijn hoger dan de waarde! Advies: bied symbolisch
            of overleg voor prijsverlaging.
          </div>
        )}
      </div>
    );
  }

  // --- Uitleg berekeningsgrondslag (Advies/PDF-tab) ---
  function renderBerekeningsUitleg() {
    return (
      <details style={{ margin: "15px 0 0 0", cursor: "pointer" }}>
        <summary style={{ fontWeight: "bold", fontSize: "1.1em" }}>
          Uitleg berekening adviesprijs
        </summary>
        <div style={{ margin: "8px 0", fontSize: "1em", lineHeight: "1.44" }}>
          <ul>
            <li>
              Marktwaarde woning is: woonoppervlakte x markt m²-prijs (opgehaald via
              DVF of recente referenties)
            </li>
            <li>
              Perceelgrond telt alleen mee vanaf <b>5000 m²</b>; prijs per m²
              bouwgrond automatisch opgehaald bij DVF (Franse overheid).
              Toegevoegde waarde: perceelgrootte × bouwgrondprijs/m²
            </li>
            <li>
              Herstelkosten worden volledig in mindering gebracht (op basis van
              ingevulde punten én hoofdposten)
            </li>
            <li>
              Indien perceelwaarde of herstelkosten groter zijn dan woningwaarde, kan
              de biedingsprijs lager of symbolisch uitvallen.
            </li>
            <li>
              Risico’s (bouwkundig, georisques) zijn direct verwerkt in
              advies/waarschuwing, bij veel risico’s is het bod extra voorzichtig.
            </li>
            <li>
              Inventaris of meeverkochte roerende zaken komen als toeslag bij de
              berekening.
            </li>
            <li>
              Vaste lasten worden “indicatief” getoond, bedragen zijn gemiddeld per
              regio, geen rechten aan te ontlenen.
            </li>
          </ul>
        </div>
      </details>
    );
  }

  // --- Render ---
  return (
    <div
      style={{
        padding: "2.3rem",
        maxWidth: 1300,
        fontFamily: "system-ui,sans-serif",
        background: "#fafdff",
        position: "relative"
      }}
    >
      <h1 style={{ marginBottom: "12px" }}>Franse Huizen Aankoopdossier – PRO</h1>
      {/* Floating/sticky Adviesprijs, alle tabs */}
      <div
        style={{
          position: "fixed",
          bottom: 28,
          right: 28,
          zIndex: 9999,
          background: "#fffefa",
          border: "2px solid #299c42",
          boxShadow: "0 2px 14px #b9eaca",
          borderRadius: "12px",
          padding: "12px 24px",
          fontSize: "1.15em",
          fontWeight: 700,
          color: "#146842"
        }}
      >
        Advies biedingsprijs:{" "}
        <span style={{ color: "#218c29", fontWeight: 900 }}>
          {adviesprijs != null ? `${fmtBedrag(adviesprijs)} €` : "–"}
        </span>
      </div>
      {/* --- Kadaster/Georisques links + PDF --- */}
      <div style={{ display: "flex", gap: 20, marginBottom: 17 }}>
        {kadasterUrl && (
          <a href={kadasterUrl} target="_blank" rel="noopener noreferrer">
            🗺️ Kadasterkaart
          </a>
        )}
        {georisquesUrl && (
          <a href={georisquesUrl} target="_blank" rel="noopener noreferrer">
            ⚡ Georisques
          </a>
        )}
        <button
          onClick={handlePDFGen}
          style={{
            padding: "5px 18px",
            fontSize: "1em",
            borderRadius: "7px",
            background: "#087e26",
            color: "#fff",
            border: "none"
          }}
        >
          Genereer PDF
        </button>
      </div>
      <Tabs tab={tab} setTab={setTab} list={tabNames} />
      {/* --- Tab Inhoud --- */}
      {/* --- TAB 0: BASISGEGEVENS --- */}
      {tab === 0 && (
        <div>
          <h3>Basisgegevens</h3>
          {/* --- OVERZICHT INDICATIEVE WAARDEN EN BRON --- */}
          <div
            style={{
              background: "#fcfcf3",
              padding: "2rem",
              marginBottom: "24px",
              borderRadius: "12px",
              boxShadow: "0 1px 8px #eaeaea"
            }}
          >
            <strong>Indicatieve waarden (alle bedragen per jaar, geen rechten):</strong>
            <ul style={{ margin: "7px 0" }}>
              <li>
                Taxe Foncière: <b>{fmtBedrag(taxeF)} €</b>{" "}
                <small>
                  <a href={bronUrl}>Bron</a>
                </small>
              </li>
              <li>
                Taxe d’Habitation: <b>{fmtBedrag(taxeH)} €</b>{" "}
                <small>
                  <a href={bronUrl}>Bron</a>
                </small>
              </li>
              <li>
                Rioleringsheffing: <b>{fmtBedrag(riolering)} €</b>{" "}
                <small>
                  <a href={bronUrl}>Bron</a>
                </small>
              </li>
            </ul>
          </div>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "2fr 2fr",
              gap: 22,
              marginBottom: 21
            }}
          >
            <div>
              <label>
                {mandatory("Projectadres")}
                <br />
                <AdresAutoComplete setAdresFields={setAdresFields} />
              </label>
              <div
                style={{
                  fontSize: "0.99em",
                  color: "#222",
                  margin: "7px 0 9px 0"
                }}
              >
                <b>Adres:</b> {adresFields.adres}
                <br />
                <small>
                  <b>Straat:</b> {adresFields.straat} {adresFields.huisnummer}
                  <br />
                  <b>Gemeente:</b> {adresFields.gemeente} | <b>Postcode:</b>{" "}
                  {adresFields.postcode} | <b>INSEE:</b> {adresFields.insee}
                  <br />
                  <b>Coörd:</b> {adresFields.lat}, {adresFields.lon}
                </small>
              </div>
              <label>
                {important("Makelaarsnaam/URL:")}
                <br />
                <input
                  type="text"
                  value={makelaar}
                  onChange={(e) => setMakelaar(e.target.value)}
                  style={{ width: "98%" }}
                />
              </label>
              <label>
                {important("Notaris (naam):")}
                <br />
                <input
                  type="text"
                  value={notaris}
                  onChange={(e) => setNotaris(e.target.value)}
                  style={{ width: "98%" }}
                />
              </label>
              <label>
                {"Naam eigenaar:"}
                <br />
                <input
                  type="text"
                  value={eigenaar}
                  onChange={(e) => setEigenaar(e.target.value)}
                  style={{ width: "98%" }}
                />
              </label>
              <label>
                {mandatory("Vraagprijs (€):")}
                <br />
                <input
                  type="number"
                  value={vraagprijs}
                  onChange={(e) => setVraagprijs(e.target.value)}
                  style={{ width: "98%" }}
                />
              </label>
              <label>
                {mandatory("Bouwjaar:")}
                <br />
                <input
                  type="number"
                  value={bouwjaar}
                  onChange={(e) => setBouwjaar(e.target.value)}
                  style={{ width: "98%" }}
                />
              </label>
              <label>
                {mandatory("Bewoonbare oppervlakte (m²):")}
                <br />
                <input
                  type="number"
                  value={oppervlakte}
                  onChange={(e) => setOppervlakte(e.target.value)}
                  style={{ width: "98%" }}
                />
              </label>
              <label>
                {important("Totale perceelgrootte (m²):")}
                <br />
                <input
                  type="number"
                  value={perceel}
                  onChange={(e) => setPerceel(e.target.value)}
                  style={{ width: "98%" }}
                />
                {bouwgrondM2Prijs && Number(perceel) >= 5000 && (
                  <span style={{ color: "#2a708c", marginLeft: 5 }}>
                    Bouwgrond DVF {bouwgrondM2Prijs} €/m²
                  </span>
                )}
              </label>
              <label>
                {mandatory("Overname inventaris (€):")}
                <br />
                <input
                  type="number"
                  value={inventaris}
                  onChange={(e) => setInventaris(e.target.value)}
                  style={{ width: "98%" }}
                />
              </label>
              <label>
                {important("Sinds wanneer te koop:")}
                <br />
                <input
                  type="date"
                  value={teKoopSinds}
                  onChange={(e) => setTeKoopSinds(e.target.value)}
                  style={{ width: "98%" }}
                />
              </label>
              <label>
                {important("Direct beschikbaar:")}
                <br />
                <input
                  type="text"
                  value={directBeschikbaar}
                  onChange={(e) => setDirectBeschikbaar(e.target.value)}
                  style={{ width: "98%" }}
                />
              </label>
            </div>
            <div>
              <label>
                {important("Soort bouw:")}
                <br />
                <select
                  value={soortBouw}
                  onChange={(e) => setSoortBouw(e.target.value)}
                  style={{ width: "98%" }}
                >
                  <option value="">Selecteer type...</option>
                  {bouwtypes.map((b) => (
                    <option key={b} value={b}>
                      {b}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                {important("Bodemtype:")}
                <br />
                <select
                  value={bodem}
                  onChange={(e) => setBodem(e.target.value)}
                  style={{ width: "98%" }}
                >
                  <option value="">Selecteer bodem...</option>
                  {bodemtypes.map((b) => (
                    <option key={b} value={b}>
                      {b}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                {important("Ligging/uitzicht:")}
                <br />
                <input
                  type="text"
                  value={ligging}
                  onChange={(e) => setLigging(e.target.value)}
                  style={{ width: "98%" }}
                />
              </label>
              <label>
                {"Mogelijke overlast:"}
                <br />
                <input
                  type="text"
                  value={overlast}
                  onChange={(e) => setOverlast(e.target.value)}
                  style={{ width: "98%" }}
                />
              </label>
              <label>
                {important("Internet/bereik:")}
                <br />
                <select
                  value={internet}
                  onChange={(e) => setInternet(e.target.value)}
                  style={{ width: "98%" }}
                >
                  {internetOpties.map((opt) => (
                    <option key={opt} value={opt}>
                      {opt || "Selecteer..."}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                {important("Erfdienstbaarheden:")}
                <br />
                <input
                  type="text"
                  value={erfdienst}
                  onChange={(e) => setErfdienst(e.target.value)}
                  style={{ width: "98%" }}
                />
              </label>
              <label>
                {mandatory("Taxe Foncière (€):")}
                <br />
                <input
                  type="number"
                  value={taxeF}
                  onChange={(e) => setTaxeF(e.target.value)}
                  style={{ width: "98%" }}
                />
                <span style={{ marginLeft: 6, fontSize: "0.9em" }}>
                  <a href={bronUrl} target="_blank" rel="noopener noreferrer">
                    Bron
                  </a>
                </span>
              </label>
              <label>
                {mandatory("Taxe d’Habitation (€):")}
                <br />
                <input
                  type="number"
                  value={taxeH}
                  onChange={(e) => setTaxeH(e.target.value)}
                  style={{ width: "98%" }}
                />
                <span style={{ marginLeft: 6, fontSize: "0.9em" }}>
                  <a href={bronUrl} target="_blank" rel="noopener noreferrer">
                    Bron
                  </a>
                </span>
              </label>
              <label>
                {important("Rioleringsheffing (€):")}
                <br />
                <input
                  type="number"
                  value={riolering}
                  onChange={(e) => setRiolering(e.target.value)}
                  style={{ width: "98%" }}
                />
                <span style={{ marginLeft: 6, fontSize: "0.9em" }}>
                  <a href={bronUrl} target="_blank" rel="noopener noreferrer">
                    Bron
                  </a>
                </span>
              </label>
            </div>
          </div>
        </div>
      )}
      {/* --- Tab Warnings --- */}
      {renderWarnings()}
      {/* --- TAB 1: CHECKLIST --- */}
      {tab === 1 && (
        <div>
          <h3>Checklist aankoop</h3>
          {checklistGroepen.map((gr) => (
            <div
              key={gr.naam}
              style={{
                background: "#eafafc",
                marginBottom: "14px",
                borderRadius: "8px",
                padding: "10px 19px"
              }}
            >
              <h4 style={{ marginTop: 8 }}>{gr.naam}</h4>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(2,1fr)",
                  gap: "11px 15px"
                }}
              >
                {gr.items.map((item) => (
                  <div key={item.name} style={{ marginBottom: 7 }}>
                    {item.type === "select" ? (
                      <>
                        <label style={{ fontWeight: 500 }}>
                          {item.important ? important(item.label) : item.label}
                          <br />
                          <select
                            value={checkSelect[item.name]}
                            onChange={(e) => handleChecklistSelect(e, item.name)}
                            style={{ width: "98%" }}
                          >
                            {item.opties.map((opt) => (
                              <option key={opt} value={opt}>
                                {opt || "Selecteer..."}
                              </option>
                            ))}
                          </select>
                        </label>
                      </>
                    ) : (
                      <label style={{ fontWeight: 500 }}>
                        <input
                          type="checkbox"
                          name={item.name}
                          checked={!!checked[item.name]}
                          onChange={handleCheck}
                        />{" "}
                        {item.mandatory
                          ? mandatory(item.label)
                          : item.important
                          ? important(item.label)
                          : item.label}
                        {item.name === "kadaster" && kadasterUrl && (
                          <a
                            style={{ marginLeft: 6 }}
                            href={kadasterUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            🔗
                          </a>
                        )}
                      </label>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
      {/* --- TAB 2: KOSTEN / HERSTELPUNTEN --- */}
      {tab === 2 && (
        <div>
          <h3>Kosten mindering & herstelpunten</h3>
          <div>
            <div style={{ marginBottom: "10px" }}>Hoofdposten:</div>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(2,1fr)",
                gap: 14
              }}
            >
              {kostenMinderingItems.map((item) => (
                <div
                  key={item.stateName}
                  style={{
                    background: "#f8faf9",
                    padding: "13px",
                    borderRadius: "6px",
                    marginBottom: 7,
                    boxShadow: "0 1px 3px #e8eaea"
                  }}
                >
                  <label style={{ fontWeight: 500 }}>
                    <input
                      type="checkbox"
                      name={item.stateName}
                      checked={minderingChecked[item.stateName]}
                      onChange={handleMinderingCheck}
                    />{" "}
                    {item.mandatory
                      ? mandatory(item.label)
                      : item.important
                      ? important(item.label)
                      : item.label}
                  </label>
                  {minderingChecked[item.stateName] && (
                    <div style={{ marginTop: 8 }}>
                      <div style={{ fontWeight: "bold", color: "red" }}>
                        Herstelkosten €:
                      </div>
                      <input
                        type="number"
                        value={kosten[item.stateName]}
                        onChange={(e) => handleKostenChange(e, item.stateName)}
                        style={{
                          width: "90px",
                          fontWeight: "bold",
                          fontSize: "1em"
                        }}
                      />{" "}
                      <span style={{ color: "red" }}>-</span>
                    </div>
                  )}
                </div>
              ))}
            </div>
            <div style={{ marginTop: "18px" }}>Herstelpunten uit checklist:</div>
            {checklistGroepen.map((gr) => (
              <div key={gr.naam}>
                <h4 style={{ margin: "7px 0 3px 0", color: "#218c29" }}>
                  {gr.naam}
                </h4>
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(2,1fr)",
                    gap: "11px 15px"
                  }}
                >
                  {gr.items
                    .filter((i) => i.kostenVeld)
                    .map((item) => (
                      <div
                        key={item.name}
                        style={{
                          background: "#f6f9fd",
                          padding: "10px",
                          borderRadius: "5px",
                          boxShadow: "0 1px 2px #dce2ea",
                          marginBottom: "4px"
                        }}
                      >
                        <label>
                          <input
                            type="checkbox"
                            name={item.name}
                            checked={!!checked[item.name]}
                            onChange={handleCheck}
                          />{" "}
                          {item.label}
                        </label>
                        {checked[item.name] && (
                          <div style={{ marginTop: 7 }}>
                            <div
                              style={{ fontWeight: "bold", color: "red" }}
                            >
                              Herstelkosten €:
                            </div>
                            <input
                              type="number"
                              min="0"
                              value={kostenChecklist[item.name]}
                              onChange={(e) =>
                                handleKostenChecklistChange(e, item.name)
                              }
                              style={{
                                width: "90px",
                                fontWeight: "bold",
                                fontSize: "1em"
                              }}
                            />{" "}
                            <span style={{ color: "red" }}>-</span>
                          </div>
                        )}
                      </div>
                    ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
      {/* --- TAB 3: RISICO'S / OVERZICHT --- */}
      {tab === 3 && (
        <div>
          <h3>Risico's en Overzicht</h3>
          <div
            style={{
              background: "#fefae8",
              padding: "17px",
              borderRadius: "7px",
              marginBottom: "12px",
              fontSize: "1.08em"
            }}
          >
            <b>Adres:</b> {adresFields.adres}
            <br />
            <b>Gemeente:</b> {adresFields.gemeente}
            <br />
            <b>Postcode:</b> {adresFields.postcode}
            <br />
            <b>INSEE:</b> {adresFields.insee}
            <br />
            <b>Bouwjaar:</b> {bouwjaar || "--"}
            <br />
            <b>Type bouw:</b> {soortBouw || "--"}
            <br />
            <b>Bodem:</b> {bodem || "--"}
            <br />
            <b>Oppervlakte:</b> {fmtBedrag(oppervlakte)} m²
            <br />
            <b>Perceel:</b> {fmtBedrag(perceel)} m²
            {bouwgrondM2Prijs && Number(perceel) >= 5000 && (
              <span>
                {" "}
                (+bouwgrondwaarde: {fmtBedrag(perceelValue)} €)
              </span>
            )}
            <br />
            <b>Risico's:</b>
            <br />
            {risico.map((r, i) => (
              <span key={i}>
                {r}
                <br />
              </span>
            ))}
            {adresFields.insee && (
              <div style={{ marginTop: 7 }}>
                {kadasterUrl && (
                  <a href={kadasterUrl} target="_blank" rel="noopener noreferrer">
                    🗺️ Kadasterkaart
                  </a>
                )}
                {" | "}
                {georisquesUrl && (
                  <a
                    href={georisquesUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    ⚡ Georisques
                  </a>
                )}
              </div>
            )}
            <b>Bestemmingsplan:</b>{" "}
            <span style={{ fontSize: "0.9em", color: "#108aac" }}>
              <a
                href="https://www.geoportail-urbanisme.gouv.fr/"
                target="_blank"
                rel="noopener noreferrer"
              >
                Bekijk PLU/CU/plan op geoportail
              </a>
            </span>
          </div>
        </div>
      )}
      {/* --- TAB 4: KOOPPROCES & JURIDISCH --- */}
      {tab === 4 && (
        <div>
          <h3>Koopproces & Juridisch Traject</h3>
          {/* Verkoper cards */}
          <div
            style={{
              marginBottom: "13px",
              padding: "13px",
              background: "#ffeef4",
              borderRadius: 10
            }}
          >
            <h4>1️⃣ Verkoper – documenten aan koper</h4>
            <ul>
              <li>
                <b>Eigendom & situatie verkoper:</b>
                <ul>
                  <li>Acte / titre de propriété (eigendomsbewijs)</li>
                  <li>Identiteitsbewijs verkoper</li>
                  <li>
                    Burgerlijke staat: geboorteakte, huwelijkscontract, PACS,
                    scheiding etc.
                  </li>
                  <li>Adresgegevens verkoper</li>
                  <li>
                    Meerdere eigenaars/nalatenschap: sterfakte, volmachten,
                    attestation de propriété
                  </li>
                </ul>
              </li>
              <li>
                <b>DDT – diagnostiekpakket:</b>
                <ul>
                  <li>DPE (energielabel), Lood (plomb), Asbest (amiante)</li>
                  <li>
                    Gas, Elektra, ERP (risico’s), Termieten, Assainissement,
                    geluidszones, houtzwam
                  </li>
                </ul>
              </li>
              <li>
                <b>Appartement/copropriété (Loi ALUR):</b>
                <ul>
                  <li>Reglement, PV’s, charges, état daté, carnet d’entretien, VvE-info</li>
                  <li>
                    Procedures VvE, reserveringsfonds, budget, achterstallige
                    betalingen
                  </li>
                </ul>
              </li>
              <li>
                <b>Werken/vergunningen:</b>
                <ul>
                  <li>
                    Bouwvergunningen, attesten/facturen, conformiteit septic tank,
                    erfdienstbaarheden
                  </li>
                </ul>
              </li>
              <li>
                <b>Fiscaal & praktisch:</b>
                <ul>
                  <li>Kopie aanslag taxe foncière</li>
                  <li>Lijst roerende zaken/meubelen die blijven/meeverkocht</li>
                  <li>Verkoopopdracht makelaar: Mandat de vente</li>
                </ul>
              </li>
            </ul>
          </div>
          {/* Koper cards */}
          <div
            style={{
              marginBottom: "13px",
              padding: "13px",
              background: "#e5fcfc",
              borderRadius: 10
            }}
          >
            <h4>2️⃣ Koper – documenten & handtekeningen + bedenktijden</h4>
            <ul>
              <li>
                <b>Koper levert aan:</b>
                <ul>
                  <li>
                    Identiteitsbewijs, burgerlijke staat, adresbewijs, bankgegevens,
                    evt. volmacht/verkoop firma
                  </li>
                  <li>
                    Loonstroken, pensioen, belastingaanslag, werkgeversverklaring,
                    spaarrekeningen/oorsprong eigen middelen
                  </li>
                </ul>
              </li>
              <li>
                <b>Koper tekent:</b>
                <ul>
                  <li>(Mandat de recherche, fakultatief)</li>
                  <li>(Offre d’achat, indien van toepassing)</li>
                  <li>Compromis de vente of promesse unilatérale de vente</li>
                  <li>Aanbetaling op derdenrekening notaris</li>
                  <li>Offre de prêt (bank) + bedenktijd</li>
                  <li>Acte authentique bij notaris – eigendomsoverdracht</li>
                </ul>
              </li>
              <li>
                <b>Bedenktijden:</b>
                <ul>
                  <li>
                    Compromis: 10 dagen bedenktijd SRU na ontvangst (volledige
                    restitutie depot mogelijk)
                  </li>
                  <li>
                    Hypotheekofferte: 10 dagen reflectieperiode bank voor
                    ondertekening
                  </li>
                  <li>
                    Financieringsvoorbehoud: 30–45 dagen na compromis, bij niet
                    halen lening volledige ontbinding + depot terug
                  </li>
                </ul>
              </li>
            </ul>
            <div style={{ marginTop: "9px" }}>
              <b>Samenvatting per rol:</b>
              <ul>
                <li>
                  <b>Verkoper:</b> eigendomsbewijs, DDT, ALUR, vergunningen,
                  inventaris
                </li>
                <li>
                  <b>Koper:</b> ID, bank, stukken, offerte, compromis, bedenktijden
                </li>
              </ul>
            </div>
          </div>
        </div>
      )}
      {/* --- TAB 5: ADVIES & PDF --- */}
      {tab === 5 && (
        <div>
          <h3>Advies & PDF</h3>
          <div
            style={{
              background: "#eaf6ff",
              borderRadius: "7px",
              padding: "19px",
              marginBottom: "12px",
              boxShadow: "0 2px 14px rgba(34,68,180,.09)"
            }}
          >
            <div style={{ fontSize: "1.16em" }}>
              <b>Vraagprijs:</b>{" "}
              {vraagprijs ? `${fmtBedrag(vraagprijs)} €` : "-"}
              <br />
              <b>Gemiddelde m² prijs:</b>{" "}
              {autoM2Prijs ? `${fmtBedrag(autoM2Prijs)} €/m²` : "-"}
              <br />
              <b>Marktwaarde woning:</b>{" "}
              {marktwaardeWoon ? `${fmtBedrag(marktwaardeWoon)} €` : "-"}
              <br />
              {bouwgrondM2Prijs && perceelValue ? (
                <span>
                  <b>Marktwaarde perceel (bouwgrond, DVF):</b>{" "}
                  {fmtBedrag(perceelValue)} €
                  <br />
                  <b>Bouwgrondprijs/m² (DVF):</b>{" "}
                  {fmtBedrag(bouwgrondM2Prijs)} €/m²
                  <br />
                </span>
              ) : null}
              <b>Totale marktwaarde:</b> {fmtBedrag(marktwaarde)} €
              <br />
              <b>Kosten mindering (hoofdposten):</b>{" "}
              <span style={{ color: "red", fontWeight: "bold" }}>
                - {fmtBedrag(kostenHoofd)} €
              </span>
              <br />
              <b>Kosten herstel (details/checklist):</b>{" "}
              <span style={{ color: "red", fontWeight: "bold" }}>
                - {fmtBedrag(kostenHerstel)} €
              </span>
              <br />
              <b>Overname inventaris:</b>{" "}
              <span style={{ color: "green" }}>
                + {fmtBedrag(inventarisPrijs)} €
              </span>
              <br />
              <b>
                <span style={{ color: "green" }}>Advies biedingsprijs:</span>
              </b>{" "}
              <span style={{ fontWeight: "bold", color: "blue" }}>
                {adviesprijs != null
                  ? `${fmtBedrag(adviesprijs)} €`
                  : "-"}
              </span>
              <br />
              <b>Vaste lasten:</b>
              <br />
              <span>
                Taxe Foncière: {fmtBedrag(taxeF)} €{" "}
                <small>
                  <a href={bronUrl}>Bron</a>
                </small>
              </span>{" "}
              <br />
              <span>
                Taxe d’Habitation: {fmtBedrag(taxeH)} €{" "}
                <small>
                  <a href={bronUrl}>Bron</a>
                </small>
              </span>{" "}
              <br />
              <span>
                Rioleringsheffing: {fmtBedrag(riolering)} €{" "}
                <small>
                  <a href={bronUrl}>Bron</a>
                </small>
              </span>
            </div>
            {renderBerekeningsUitleg()}
            <div style={{ margin: "19px 0 5px 0", fontSize: "1.05em" }}>
              <b>Checklist afgevinkt:</b> {aangevinkt} van {totaalChecklist} punten{" "}
              <span style={{ color: "#2468e4" }}>({checklistPerc}%)</span>
              <br />
              {checklistPerc <= 50 && (
                <span style={{ color: "red" }}>
                  Let op: minder dan de helft afgevinkt!
                </span>
              )}
              {checklistPerc > 50 && checklistPerc < 90 && (
                <span style={{ color: "orange" }}>
                  Bijna compleet, check nog meer punten.
                </span>
              )}
              {checklistPerc >= 90 && (
                <span style={{ color: "green" }}>
                  Bijna alles gecheckt. Top!
                </span>
              )}
            </div>
            <div>
              <button
                style={{
                  margin: "12px 0 0 0",
                  padding: "9px 24px",
                  fontSize: "1em",
                  borderRadius: "6px",
                  background: "#218c29",
                  color: "#fff",
                  border: "none"
                }}
                onClick={handlePDFGen}
              >
                Genereer PDF
              </button>
            </div>
            {/* --- Brondata onder Advies tab --- */}
            <div
              style={{
                margin: "19px 0 0 0",
                padding: "13px",
                background: "#fcfcf2",
                borderRadius: "9px",
                fontSize: "1.1em",
                boxShadow: "0 1px 4px #efeccd"
              }}
            >
              <h4>Brondata & Koppelingen</h4>
              <p>Actuele brondata, toelichting en links:</p>
              <iframe
                src={bronUrl}
                width="100%"
                height="250px"
                style={{ border: "1px solid #aaa", borderRadius: "8px" }}
                title="Brondata"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
