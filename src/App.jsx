import React, { useState, useEffect } from "react";

// Helper: Format currency (Euro)
function fmtBedrag(val) {
  if (val === "" || val === null || val === undefined) return "–";
  const num = Number(val);
  if (Number.isNaN(num)) return "–";
  return num.toLocaleString("nl-NL");
}

// --- Constants ---
const bouwtypes = [
  "Natuursteen (En pierre)",
  "Betonblokken (Parpaings)",
  "Baksteen (Brique)",
  "Houtskelet/Vakwerk",
  "Anders"
];

const mandatory = (str) => (
  <span>
    {str}{" "}
    <span style={{ color: "red" }} title="Verplicht veld">*</span>
  </span>
);
const important = (str) => (
  <span>
    {str}{" "}
    <span style={{ color: "#e08b00" }} title="Belangrijk veld">**</span>
  </span>
);

// --- Kosten mindering hoofdposten ---
const kostenMinderingItems = [
  { stateName: "fosse", label: "Vervangen fosse septique", default: 8000, mandatory: true },
  { stateName: "dak", label: "Dakvernieuwing", default: 15000, important: true },
  { stateName: "ramen", label: "Ramen isolatie/vervanging", default: 4000, important: true },
  { stateName: "isolatie", label: "Algemene isolatie", default: 8000, important: true },
  { stateName: "sanitair", label: "Sanitaire voorzieningen", default: 7000 },
  { stateName: "keuken", label: "Vernieuwen keuken", default: 6000 },
  { stateName: "schilderwerk", label: "Schilderwerk binnen/buiten", default: 5000 },
  { stateName: "elektra", label: "Elektriciteit vernieuwen", default: 6000 },
  { stateName: "verwarming", label: "Verwarmingssysteem", default: 9000 }
];

// Checklist Groepen
const checklistGroepen = [
  {
    naam: "Juridisch & Documenten",
    items: [
      { name: "kadaster", label: "Kadasterkaart bekeken", mandatory: true },
      { name: "bestemmingsplan", label: "Bestemmingsplan (PLU) gecheckt", important: true },
      { name: "erfdienst", label: "Erfdienstbaarheden (recht van overpad?)" },
      { name: "eigendomsbewijs", label: "Titre de propriété aanwezig" },
      { name: "diagnostics", label: "DDT (Diagnostiek rapporten) ingezien" }
    ]
  },
  {
    naam: "Bouwkundige Staat",
    items: [
      { name: "bouwkundig", label: "Algemene staat muren/dak", important: true },
      { name: "vocht", label: "Geen tekenen van vocht/schimmel", kostenVeld: true },
      { name: "houtstaat", label: "Houtwerk (balken/luiken) in orde", kostenVeld: true },
      { name: "dakgoten", label: "Dakgoten en afvoer", kostenVeld: true },
      { name: "beglazing", label: "Staat van beglazing (enkel/dubbel)", kostenVeld: true }
    ]
  },
  {
    naam: "Omgeving & Voorzieningen",
    items: [
      { name: "internet", label: "Internet snelheid/glasvezel gecheckt" },
      { name: "mobiel", label: "Mobiel bereik (4G/5G) getest" },
      { name: "geluid", label: "Geen geluidsoverlast (weg/buren)" },
      { name: "geur", label: "Geen geuroverlast (agrarisch/fabriek)" },
      { name: "voorzieningen", label: "Afstand tot bakker/supermarkt acceptabel" }
    ]
  }
];

// --- Tabbladen helper ---
const Tabs = ({ tab, setTab, list }) => (
  <div style={{ display: "flex", gap: 10, marginBottom: 20, flexWrap: "wrap", borderBottom: "1px solid #ddd", paddingBottom: 10 }}>
    {list.map((item, idx) => (
      <button
        key={item}
        onClick={() => setTab(idx)}
        className={tab === idx ? "btn" : ""} 
        style={{
          background: tab === idx ? "#800000" : "#fff",
          color: tab === idx ? "#fff" : "#444",
          border: "1px solid #ddd",
          padding: "8px 16px",
          borderRadius: "4px",
          cursor: "pointer",
          fontWeight: tab === idx ? "bold" : "normal"
        }}
      >
        {item}
      </button>
    ))}
  </div>
);

// --- Adres Autocomplete (Versimpeld) ---
function AdresAutoComplete({ setAdresFields }) {
  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState([]);

  useEffect(() => {
    if (query.length < 3) { setSuggestions([]); return; }
    fetch(`https://api-adresse.data.gouv.fr/search/?q=${encodeURIComponent(query)}`)
      .then((res) => res.json())
      .then((data) => setSuggestions(data.features || []))
      .catch(() => {});
  }, [query]);

  function handleSelect(suggestion) {
    setQuery(suggestion.properties.label);
    setSuggestions([]);
    
    // We slaan nu ook de coördinaten op (lat/lon) voor de DVF check
    const [lon, lat] = suggestion.geometry.coordinates;
    
    setAdresFields({
      adres: suggestion.properties.label,
      postcode: suggestion.properties.postcode,
      gemeente: suggestion.properties.city,
      insee: suggestion.properties.citycode, 
      lat: lat,
      lon: lon
    });
  }

  return (
    <div style={{ position: "relative" }}>
      <input
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Typ adres (bijv. 12 Rue de l'Eglise...)"
        style={{ width: "100%", padding: "10px", border: "1px solid #ccc", borderRadius: "4px" }}
      />
      {suggestions.length > 0 && (
        <ul style={{
          position: "absolute", top: "100%", left: 0, right: 0,
          background: "#fff", border: "1px solid #ddd", zIndex: 100,
          listStyle: "none", padding: 0, margin: 0, maxHeight: "200px", overflowY: "auto"
        }}>
          {suggestions.map((s) => (
            <li
              key={s.properties.id}
              style={{ padding: "8px", cursor: "pointer", borderBottom: "1px solid #eee" }}
              onClick={() => handleSelect(s)}
            >
              {s.properties.label}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function App() {
  const tabNames = ["Basisgegevens", "Checklist", "Kosten & Herstel", "Resultaat"];
  const [tab, setTab] = useState(0);

  // Data State
  const [adresFields, setAdresFields] = useState({});
  const [vraagprijs, setVraagprijs] = useState("");
  const [oppervlakte, setOppervlakte] = useState("");
  const [perceel, setPerceel] = useState("");
  const [bouwjaar, setBouwjaar] = useState("");
  const [soortBouw, setSoortBouw] = useState("");
  const [makelaar, setMakelaar] = useState("");
  
  // Nieuw: Automatische m2 prijs logica
  const [m2Prijs, setM2Prijs] = useState(""); 
  const [dvfLoading, setDvfLoading] = useState(false);
  const [dvfInfo, setDvfInfo] = useState(""); // Tekst met aantal gevonden huizen

  // Effect: Als adres (lat/lon) wijzigt, haal DVF data op
  useEffect(() => {
    if (adresFields.lat && adresFields.lon) {
      setDvfLoading(true);
      setDvfInfo("Prijzen in de buurt ophalen...");
      
      // We zoeken in een straal van 500m
      fetch(`https://api.cquest.org/dvf?lat=${adresFields.lat}&lon=${adresFields.lon}&dist=500`)
        .then(res => res.json())
        .then(data => {
          // Filter alleen op huizen (maisons) en echte verkopen
          const relevant = data.features.filter(f => 
            f.properties.nature_mutation === "Vente" &&
            f.properties.type_local === "Maison" &&
            f.properties.valeur_fonciere > 0 &&
            f.properties.surface_reelle_bati > 0
          );

          if (relevant.length > 0) {
            // Bereken gemiddelde m2 prijs
            let totalM2Price = 0;
            relevant.forEach(item => {
              const price = item.properties.valeur_fonciere;
              const size = item.properties.surface_reelle_bati;
              totalM2Price += (price / size);
            });
            const average = Math.round(totalM2Price / relevant.length);
            
            setM2Prijs(average);
            setDvfInfo(`Gevonden: ${relevant.length} verkopen in straal van 500m.`);
          } else {
            setDvfInfo("Geen recente verkopen gevonden in de directe omgeving.");
            setM2Prijs(""); // Reset of laat leeg voor handmatige invoer
          }
          setDvfLoading(false);
        })
        .catch(err => {
          console.error(err);
          setDvfInfo("Kon prijzen niet automatisch ophalen.");
          setDvfLoading(false);
        });
    }
  }, [adresFields.lat, adresFields.lon]);

  // Lasten
  const [taxeF, setTaxeF] = useState("");
  const [taxeH, setTaxeH] = useState("");

  // Checklist State
  const checkboxNames = checklistGroepen.flatMap(g => g.items).map(i => i.name);
  
  const [checked, setChecked] = useState(
    checkboxNames.reduce((acc, name) => ({ ...acc, [name]: false }), {})
  );
  const [kostenChecklist, setKostenChecklist] = useState({});
  
  const handleCheck = (e) => setChecked({ ...checked, [e.target.name]: e.target.checked });
  const handleKostenChecklistChange = (e, name) => setKostenChecklist({ ...kostenChecklist, [name]: e.target.value });

  // Hoofdkosten State
  const [minderingChecked, setMinderingChecked] = useState({});
  const [kosten, setKosten] = useState(
    kostenMinderingItems.reduce((acc, i) => ({ ...acc, [i.stateName]: i.default }), {})
  );
  
  const handleMinderingCheck = (e) => setMinderingChecked({ ...minderingChecked, [e.target.name]: e.target.checked });
  const handleKostenChange = (e, name) => setKosten({ ...kosten, [name]: e.target.value });

  // Berekeningen
  const marktwaarde = (Number(oppervlakte) || 0) * (Number(m2Prijs) || 0);
  
  const kostenHoofdTotaal = Object.keys(minderingChecked).reduce((sum, key) => 
    minderingChecked[key] ? sum + (Number(kosten[key]) || 0) : sum, 0
  );
  
  const kostenHerstelTotaal = Object.keys(kostenChecklist).reduce((sum, key) => 
    checked[key] ? sum + (Number(kostenChecklist[key]) || 0) : sum, 0
  );

  const totaleKosten = kostenHoofdTotaal + kostenHerstelTotaal;
  const adviesBod = Math.max(0, marktwaarde - totaleKosten);

  // Links
  const georisquesUrl = adresFields.insee ? `https://www.georisques.gouv.fr/cartographie?code_commune=${adresFields.insee}` : "https://www.georisques.gouv.fr/";

  return (
    <div className="container">
      <header style={{ marginBottom: 20 }}>
        <h1 style={{ color: "#800000" }}>Franse Huizen Checker</h1>
      </header>

      {/* Sticky Resultaat Balk */}
      <div style={{
        position: "fixed", bottom: 20, right: 20, background: "#fff", 
        padding: "15px 25px", border: "2px solid #800000", borderRadius: "8px",
        boxShadow: "0 4px 12px rgba(0,0,0,0.15)", zIndex: 1000
      }}>
        <div style={{ fontSize: "0.9rem", color: "#666" }}>Advies Bieding:</div>
        <div style={{ fontSize: "1.5rem", fontWeight: "bold", color: "#800000" }}>
          {marktwaarde > 0 ? `€ ${fmtBedrag(adviesBod)}` : "..."}
        </div>
      </div>

      <Tabs tab={tab} setTab={setTab} list={tabNames} />

      {/* --- TAB 0: BASISGEGEVENS --- */}
      {tab === 0 && (
        <section className="panel">
          <h3>Object Gegevens</h3>
          <div className="grid">
            <div>
              <label>{mandatory("Adres")}</label>
              <AdresAutoComplete setAdresFields={setAdresFields} />
              {adresFields.adres && (
                <div style={{ marginTop: 5, color: "green", fontSize: "0.9em" }}>
                  📍 Geselecteerd: {adresFields.adres}
                </div>
              )}
            </div>
            <div>
               <label>{mandatory("Vraagprijs (€)")}</label>
               <input type="number" value={vraagprijs} onChange={e => setVraagprijs(e.target.value)} />
            </div>
            <div>
               <label>{mandatory("Woonoppervlakte (m²)")}</label>
               <input type="number" value={oppervlakte} onChange={e => setOppervlakte(e.target.value)} />
            </div>
            
            {/* --- AUTOMATISCHE M2 PRIJS SECTIE --- */}
            <div>
               <label>{important("Gemiddelde m² prijs in regio")}</label>
               <div style={{ position: "relative" }}>
                 <input 
                   type="number" 
                   placeholder="Wordt berekend..."
                   value={m2Prijs} 
                   onChange={e => setM2Prijs(e.target.value)} 
                   style={{ 
                     border: "2px solid #800000", 
                     background: dvfLoading ? "#f0f0f0" : "#fff" 
                   }}
                 />
                 {dvfLoading && <span style={{ position: "absolute", right: 10, top: 10 }}>⏳</span>}
               </div>
               
               <small style={{ display: "block", marginTop: 4, color: "#666" }}>
                 {dvfInfo ? (
                   <span style={{ color: dvfInfo.includes("Gevonden") ? "green" : "orange", fontWeight: "bold" }}>
                     {dvfInfo}
                   </span>
                 ) : (
                   "Kies een adres om prijzen op te halen."
                 )}
               </small>
               
               <small style={{ display: "block", marginTop: 2, color: "#999" }}>
                 Of check handmatig: 
                 <a href="https://app.dvf.etalab.gouv.fr/" target="_blank" style={{marginLeft: 5, color: "#800000"}}>DVF</a> | 
                 <a href="https://www.meilleursagents.com/prix-immobilier/" target="_blank" style={{marginLeft: 5, color: "#800000"}}>MeilleursAgents</a>
               </small>
            </div>
            
            <div>
               <label>{important("Perceeloppervlakte (m²)")}</label>
               <input type="number" value={perceel} onChange={e => setPerceel(e.target.value)} />
            </div>
            <div>
               <label>Bouwjaar</label>
               <input type="number" value={bouwjaar} onChange={e => setBouwjaar(e.target.value)} />
            </div>
          </div>

          <h3 style={{ marginTop: 30 }}>Financieel & Links</h3>
          <div className="grid">
            <div>
              <label>{mandatory("Taxe Foncière (€/jaar)")}</label>
              <input type="number" value={taxeF} onChange={e => setTaxeF(e.target.value)} />
            </div>
            <div>
              <label>Taxe d'Habitation (€/jaar)</label>
              <input type="number" value={taxeH} onChange={e => setTaxeH(e.target.value)} />
            </div>
            <div>
              <label>Externe bronnen</label>
              <div style={{ display: "flex", gap: 10, marginTop: 5 }}>
                <a href={georisquesUrl} target="_blank" className="btn" style={{ fontSize: "0.9rem" }}>
                  ⚠️ Check Risico's (Georisques)
                </a>
                <a href="https://www.geoportail-urbanisme.gouv.fr/" target="_blank" className="btn" style={{ fontSize: "0.9rem", background: "#666" }}>
                  🗺️ Bestemmingsplan
                </a>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* --- TAB 1: CHECKLIST --- */}
      {tab === 1 && (
        <section>
          {checklistGroepen.map(groep => (
            <div key={groep.naam} className="panel" style={{ marginBottom: 15 }}>
              <h4>{groep.naam}</h4>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                {groep.items.map(item => (
                  <label key={item.name} style={{ display: "flex", alignItems: "center", cursor: "pointer" }}>
                    <input 
                      type="checkbox" 
                      name={item.name} 
                      checked={!!checked[item.name]} 
                      onChange={handleCheck} 
                      style={{ width: "auto", marginRight: 10 }}
                    />
                    <span>
                        {item.mandatory ? mandatory(item.label) : (item.important ? important(item.label) : item.label)}
                    </span>
                  </label>
                ))}
              </div>
            </div>
          ))}
        </section>
      )}

      {/* --- TAB 2: KOSTEN --- */}
      {tab === 2 && (
        <section className="panel">
          <h3>Grote Kostenposten</h3>
          <p className="muted">Vink aan wat vervangen moet worden. Bedragen zijn aanpasbaar.</p>
          
          <div style={{ display: "grid", gap: 10 }}>
            {kostenMinderingItems.map(item => (
              <div key={item.stateName} style={{ display: "flex", alignItems: "center", background: "#f9f9f9", padding: 10, borderRadius: 5 }}>
                <input 
                  type="checkbox" 
                  name={item.stateName} 
                  checked={!!minderingChecked[item.stateName]} 
                  onChange={handleMinderingCheck}
                  style={{ width: "auto", marginRight: 15 }} 
                />
                <div style={{ flex: 1, fontWeight: "bold" }}>{item.label}</div>
                {minderingChecked[item.stateName] && (
                  <div style={{ display: "flex", alignItems: "center" }}>
                    <span style={{ marginRight: 5 }}>€</span>
                    <input 
                      type="number" 
                      value={kosten[item.stateName]} 
                      onChange={e => handleKostenChange(e, item.stateName)} 
                      style={{ width: 100, fontWeight: "bold", color: "#800000" }}
                    />
                  </div>
                )}
              </div>
            ))}
          </div>

          <h3 style={{ marginTop: 30 }}>Kosten uit Checklist</h3>
          <p className="muted">Specifieke herstelpunten die je eerder hebt aangevinkt.</p>
          {checklistGroepen.flatMap(g => g.items).filter(i => i.kostenVeld && checked[i.name]).length === 0 && (
            <p><i>Geen kosten-items aangevinkt in de checklist.</i></p>
          )}
          
          {checklistGroepen.flatMap(g => g.items).filter(i => i.kostenVeld && checked[i.name]).map(item => (
             <div key={item.name} style={{ display: "flex", alignItems: "center", padding: "10px 0", borderBottom: "1px solid #eee" }}>
               <div style={{ flex: 1 }}>{item.label}</div>
               <div style={{ display: "flex", alignItems: "center" }}>
                 <span style={{ marginRight: 5 }}>€</span>
                 <input 
                   type="number" 
                   placeholder="0"
                   value={kostenChecklist[item.name] || ""} 
                   onChange={e => handleKostenChecklistChange(e, item.name)} 
                   style={{ width: 100 }}
                 />
               </div>
             </div>
          ))}
        </section>
      )}

      {/* --- TAB 3: RESULTAAT --- */}
      {tab === 3 && (
        <section className="panel" style={{ textAlign: "center", padding: "40px 20px" }}>
          <h2>Samenvatting</h2>
          
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, textAlign: "left", maxWidth: 600, margin: "20px auto" }}>
            <div>Marktwaarde (geschat):</div>
            <div style={{ fontWeight: "bold" }}>€ {fmtBedrag(marktwaarde)}</div>
            
            <div>Totale herstelkosten:</div>
            <div style={{ color: "red", fontWeight: "bold" }}>- € {fmtBedrag(totaleKosten)}</div>
            
            <div style={{ borderTop: "1px solid #ddd", paddingTop: 10, fontWeight: "bold" }}>Advies Bieding:</div>
            <div style={{ borderTop: "1px solid #ddd", paddingTop: 10, fontWeight: "bold", color: "#800000", fontSize: "1.2em" }}>
               € {fmtBedrag(adviesBod)}
            </div>
          </div>
          
          <p className="muted" style={{ fontSize: "0.9rem" }}>
            * Dit advies is gebaseerd op {oppervlakte || 0}m² woonoppervlakte keer de automatisch berekende (of ingevulde) m²-prijs van €{m2Prijs || 0}.
          </p>
        </section>
      )}
    </div>
  );
}

export default App;
