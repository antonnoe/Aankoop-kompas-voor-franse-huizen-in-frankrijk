import React, { useState, useEffect } from "react";

// --- HELPERS ---
function fmtBedrag(val) {
  if (!val) return "–";
  const num = Number(val);
  return Number.isNaN(num) ? "–" : num.toLocaleString("nl-NL");
}

// Badge componentjes
const BadgeVerplicht = () => (
  <span style={{ fontSize: "0.7em", background: "#ffeef0", color: "#c00", padding: "2px 6px", borderRadius: 4, marginLeft: 6, fontWeight: "600" }}>
    VERPLICHT
  </span>
);

const BadgeCheck = () => (
  <span style={{ fontSize: "0.7em", background: "#e6f7ff", color: "#0050b3", padding: "2px 6px", borderRadius: 4, marginLeft: 6, fontWeight: "600" }}>
    CHECK DIT
  </span>
);

// --- DATA ---
const kostenMinderingItems = [
  { stateName: "fosse", label: "Septic tank (Fosse) niet op norm", default: 8000 },
  { stateName: "dak", label: "Dakstructuur/pannen slecht", default: 15000 },
  { stateName: "ramen", label: "Enkel glas / rotte kozijnen", default: 4000 },
  { stateName: "isolatie", label: "Geen/slechte isolatie (DPE F/G)", default: 8000 },
  { stateName: "sanitair", label: "Badkamer/Sanitair verouderd", default: 7000 },
  { stateName: "keuken", label: "Keuken vervangen", default: 6000 },
  { stateName: "elektra", label: "Elektra niet conform (gevaar)", default: 6000 },
  { stateName: "verwarming", label: "Verwarming vervangen", default: 10000 }
];

const checklistGroepen = [
  {
    naam: "Documenten & Recht",
    items: [
      { name: "kadaster", label: "Kadasterkaart & Perceelgrens", badge: "check" },
      { name: "bestemmingsplan", label: "Bestemmingsplan (PLU/Zone N/U)", badge: "check" },
      { name: "diagnostics", label: "DDT Rapporten (Lood/Asbest/Elektra)", badge: "check" },
      { name: "eigendomsbewijs", label: "Eigendomsbewijs (Titre) aanwezig" },
      { name: "erfdienst", label: "Erfdienstbaarheden (recht van overpad)" }
    ]
  },
  {
    naam: "Staat van het Pand",
    items: [
      { name: "bouwkundig", label: "Muren/Scheuren/Vochtplekken", badge: "check" },
      { name: "dakgoten", label: "Staat dakgoten & zinkwerk", kostenVeld: true },
      { name: "houtstaat", label: "Houtwerk & Balken (Boktor/Termiet)", kostenVeld: true },
      { name: "vocht", label: "Optrekkend vocht / Schimmel", kostenVeld: true }
    ]
  },
  {
    naam: "Omgeving",
    items: [
      { name: "internet", label: "Internet (Glasvezel/4G) getest" },
      { name: "geluid", label: "Geluidsoverlast (weg/buren/honden)" },
      { name: "geur", label: "Geuroverlast (agrarisch/fabriek)" }
    ]
  }
];

// --- AUTOCOMPLETE ---
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

  function handleSelect(s) {
    setQuery(s.properties.label);
    setSuggestions([]);
    const [lon, lat] = s.geometry.coordinates;
    setAdresFields({
      adres: s.properties.label,
      city: s.properties.city,
      zip: s.properties.postcode,
      insee: s.properties.citycode,
      lat, lon
    });
  }

  return (
    <div style={{ position: "relative", marginBottom: 15 }}>
      <input
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="🔍 Zoek adres (bijv. 10 Rue de l'Eglise...)"
        style={{ width: "100%", padding: "12px", border: "1px solid #ccc", borderRadius: "6px", fontSize: "1rem" }}
      />
      {suggestions.length > 0 && (
        <ul style={{
          position: "absolute", top: "100%", left: 0, right: 0,
          background: "#fff", border: "1px solid #ddd", zIndex: 100,
          listStyle: "none", padding: 0, margin: 0, boxShadow: "0 4px 6px rgba(0,0,0,0.1)"
        }}>
          {suggestions.map((s) => (
            <li
              key={s.properties.id}
              style={{ padding: "10px", cursor: "pointer", borderBottom: "1px solid #eee" }}
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

// --- MAIN APP ---
function App() {
  const [tab, setTab] = useState(0);

  // Basis Data
  const [adresFields, setAdresFields] = useState({});
  const [vraagprijs, setVraagprijs] = useState("");
  const [oppervlakte, setOppervlakte] = useState("");
  const [perceel, setPerceel] = useState("");
  const [bouwjaar, setBouwjaar] = useState("");
  
  // Waardebepaling
  const [m2Prijs, setM2Prijs] = useState(""); 
  const [dvfInfo, setDvfInfo] = useState("");
  const [loading, setLoading] = useState(false);
  
  // Kadaster Data (De Tegel!)
  const [kadasterInfo, setKadasterInfo] = useState(null);
  const [kadasterLoading, setKadasterLoading] = useState(false);

  // Markt Sentiment Slider
  const [marktSentiment, setMarktSentiment] = useState(0); 

  // Kosten & Checklist
  const [minderingChecked, setMinderingChecked] = useState({});
  const [kosten, setKosten] = useState(
    kostenMinderingItems.reduce((acc, i) => ({ ...acc, [i.stateName]: i.default }), {})
  );
  
  const checkboxNames = checklistGroepen.flatMap(g => g.items).map(i => i.name);
  const [checked, setChecked] = useState(
    checkboxNames.reduce((acc, name) => ({ ...acc, [name]: false }), {})
  );
  const [kostenChecklist, setKostenChecklist] = useState({});

  // --- DATA OPHALEN ---
  useEffect(() => {
    if (adresFields.lat && adresFields.lon) {
      setLoading(true);
      setKadasterLoading(true);
      
      // 1. Kadaster (IGN) - Haalt perceelnummer, sectie, grootte EN ID op
      fetch(`https://apicarto.ign.fr/api/cadastre/parcelle?geom={"type":"Point","coordinates":[${adresFields.lon},${adresFields.lat}]}`)
        .then(res => res.json())
        .then(data => {
          if (data?.features?.length > 0) {
            const p = data.features[0].properties;
            setKadasterInfo({
              id: p.id, // Het unieke ID (bv. 625850000B0062) voor de link
              section: p.section,
              numero: p.numero,
              oppervlakte: p.contenance
            });
            if (!perceel) setPerceel(p.contenance);
          } else {
            setKadasterInfo(null);
          }
          setKadasterLoading(false);
        })
        .catch(() => setKadasterLoading(false));

      // 2. Slimme Prijszoeker (DVF)
      const fetchPrices = async () => {
        const distances = [500, 1000, 3000, 5000, 10000, 20000];
        setDvfInfo("Zoeken naar vergelijkbare huizen...");
        
        for (const dist of distances) {
          try {
            const res = await fetch(`https://api.cquest.org/dvf?lat=${adresFields.lat}&lon=${adresFields.lon}&dist=${dist}`);
            const data = await res.json();
            
            // Filter: Koop, Huis, >15k prijs, >30m2
            const relevant = data.features.filter(f => 
              f.properties.nature_mutation === "Vente" &&
              f.properties.type_local === "Maison" &&
              f.properties.valeur_fonciere > 15000 && 
              f.properties.surface_reelle_bati > 30
            );

            if (relevant.length > 0) {
              // Bereken m2 prijzen
              let prices = relevant.map(h => h.properties.valeur_fonciere / h.properties.surface_reelle_bati);
              
              // Filter uitschieters als we genoeg data hebben
              if (relevant.length >= 5) {
                prices.sort((a, b) => a - b);
                const trim = Math.floor(prices.length * 0.2);
                prices = prices.slice(trim, prices.length - trim);
              }
              
              const avg = Math.round(prices.reduce((a, b) => a + b, 0) / prices.length);
              setM2Prijs(avg);
              setDvfInfo(`✅ Gevonden: ${relevant.length} woningen (straal ${dist/1000}km).`);
              setLoading(false);
              return; 
            }
          } catch (e) { console.error(e); }
        }
        setDvfInfo("⚠️ Geen automatische prijs gevonden. Vul handmatig in.");
        setLoading(false);
      };
      fetchPrices();
    }
  }, [adresFields.lat, adresFields.lon]);

  // --- BEREKENING ---
  const technischeWaarde = (Number(oppervlakte) || 0) * (Number(m2Prijs) || 0);
  
  const kostenTotaal = 
    Object.keys(minderingChecked).reduce((s, k) => minderingChecked[k] ? s + Number(kosten[k]) : s, 0) +
    Object.keys(kostenChecklist).reduce((s, k) => checked[k] ? s + Number(kostenChecklist[k]) : s, 0);

  const marktCorrectie = technischeWaarde * (marktSentiment / 100);
  const gecorrigeerdeMarktwaarde = technischeWaarde + marktCorrectie;
  const adviesBod = Math.max(0, gecorrigeerdeMarktwaarde - kostenTotaal);

  // --- LINKS GENEREREN ---
  const geoRisquesLink = adresFields.lat 
    ? `https://www.georisques.gouv.fr/mes-risques/connaitre-les-risques-pres-de-chez-moi?lat=${adresFields.lat}&lng=${adresFields.lon}`
    : "https://www.georisques.gouv.fr/";

  // Link naar Geoportail (GPS)
  const geoportailLink = adresFields.lat
    ? `https://www.geoportail.gouv.fr/carte?c=${adresFields.lon},${adresFields.lat}&z=19&l0=GEOGRAPHICALGRIDSYSTEMS.PLANIGNV2::GEOPORTAIL:OGC:WMTS(1)&l1=CADASTRE.PARCELLES::GEOPORTAIL:OGC:WMTS(0.8)&permalink=yes`
    : "https://www.geoportail.gouv.fr/carte";
    
  // Link naar RechercheCadastrale (Perceel ID)
  const rechercheCadastraleLink = kadasterInfo?.id
    ? `https://recherchecadastrale.fr/cadastre/${kadasterInfo.id}`
    : (adresFields.insee ? `https://recherchecadastrale.fr/cadastre?commune=${adresFields.insee}&recherche=par_adresse` : "https://recherchecadastrale.fr/cadastre");

  // De nieuwe data.gouv kaart (voor prijzen)
  const dvfMapLink = "https://explore.data.gouv.fr/fr/immobilier?onglet=carte&filtre=tous";

  // --- HANDLERS ---
  const handleCheck = (e) => setChecked({ ...checked, [e.target.name]: e.target.checked });
  const handleKostenInput = (e, name, setter) => setter(prev => ({ ...prev, [name]: Number(e.target.value) }));

  return (
    <div className="container" style={{ maxWidth: 900, margin: "0 auto", fontFamily: "Mulish, sans-serif", color: "#333" }}>
      
      {/* HEADER */}
      <div style={{ background: "#800000", color: "#fff", padding: "20px", borderRadius: "8px 8px 0 0", marginBottom: 20 }}>
        <h1 style={{ margin: 0, fontSize: "1.8rem" }}>🇫🇷 Aankoopkompas Frankrijk</h1>
        <p style={{ margin: "5px 0 0 0", opacity: 0.9 }}>Professionele waardebepaling & risico-analyse</p>
      </div>

      {/* TABS */}
      <div style={{ display: "flex", gap: 10, marginBottom: 20, borderBottom: "2px solid #eee" }}>
        {["Object & Waarde", "Checklist & Staat", "Kosten", "Resultaat"].map((t, i) => (
          <button 
            key={i} 
            onClick={() => setTab(i)}
            style={{ 
              padding: "10px 20px", cursor: "pointer", border: "none", background: "none", 
              borderBottom: tab === i ? "3px solid #800000" : "3px solid transparent",
              fontWeight: tab === i ? "bold" : "normal", color: tab === i ? "#800000" : "#666"
            }}
          >
            {t}
          </button>
        ))}
      </div>

      {/* === TAB 1: OBJECT === */}
      {tab === 0 && (
        <div className="panel">
          <div className="grid">
            <div style={{ gridColumn: "1 / -1" }}>
              <label>Adres van het pand <BadgeVerplicht /></label>
              <AdresAutoComplete setAdresFields={setAdresFields} />
              
              {/* --- DE KADASTER TEGEL (NU MET 2 KNOPPEN) --- */}
              {adresFields.adres && (
                <div style={{ marginTop: 10, padding: 15, background: "#fffbe6", border: "1px solid #ffe58f", borderRadius: 6 }}>
                  <div style={{ fontWeight: "bold", color: "#800000", marginBottom: 8, display: "flex", justifyContent: "space-between" }}>
                    <span>🏛️ Officieel Kadaster</span>
                    {kadasterLoading && <span>...</span>}
                  </div>
                  
                  {kadasterInfo ? (
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, fontSize: "0.95rem" }}>
                       <div>
                         <span style={{color: "#666"}}>Sectie & Nummer:</span><br/>
                         <b>{kadasterInfo.section} - {kadasterInfo.numero}</b>
                       </div>
                       <div>
                         <span style={{color: "#666"}}>Oppervlakte:</span><br/>
                         <b>{kadasterInfo.oppervlakte} m²</b>
                       </div>
                       
                       {/* KNOPPEN */}
                       <div style={{ gridColumn: "1 / -1", display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginTop: 10 }}>
                         <a href={rechercheCadastraleLink} target="_blank" style={{ 
                           background: "#800000", color: "#fff", textDecoration: "none", textAlign: "center", 
                           padding: "8px", borderRadius: "4px", fontWeight: "bold"
                         }}>
                           📍 Bekijk op RechercheCadastrale.fr
                         </a>
                         <a href={geoportailLink} target="_blank" className="btn-outline" style={{ textAlign: "center" }}>
                           🛰️ Bekijk op Geoportail
                         </a>
                       </div>
                    </div>
                  ) : (
                    <div style={{ color: "#666", fontStyle: "italic" }}>
                      Nog geen kadasterdata beschikbaar. Selecteer een adres.
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* QUICK LINKS */}
            {adresFields.adres && (
              <div style={{ gridColumn: "1 / -1", display: "flex", gap: 10, flexWrap: "wrap", marginTop: 5 }}>
                 <a href={geoRisquesLink} target="_blank" className="btn-outline">⚠️ Risico's (Overstroming/Klei)</a>
                 <a href={dvfMapLink} target="_blank" className="btn-outline">💰 Bekijk verkoopprijzen buren</a>
              </div>
            )}

            <div>
              <label>Vraagprijs (€) <BadgeVerplicht /></label>
              <input type="number" value={vraagprijs} onChange={e => setVraagprijs(e.target.value)} />
            </div>

            <div>
              <label>Woonoppervlakte (m²) <BadgeVerplicht /></label>
              <input type="number" value={oppervlakte} onChange={e => setOppervlakte(e.target.value)} />
            </div>

            <div>
              <label>Marktprijs Regio (€/m²) <BadgeVerplicht /></label>
              <div style={{ position: "relative" }}>
                <input 
                  type="number" 
                  value={m2Prijs} 
                  onChange={e => setM2Prijs(e.target.value)} 
                  placeholder="Wordt berekend..."
                  style={{ fontWeight: "bold", color: "#800000" }}
                />
                {loading && <span style={{ position: "absolute", right: 10, top: 12 }}>⏳</span>}
              </div>
              <small style={{ display: "block", marginTop: 4, color: dvfInfo.includes("Geen") ? "orange" : "green" }}>
                {dvfInfo}
              </small>
            </div>

            <div>
              <label>Perceel (m²)</label>
              <input 
                type="number" 
                value={perceel} 
                onChange={e => setPerceel(e.target.value)} 
                placeholder={kadasterInfo ? kadasterInfo.oppervlakte : ""}
              />
              {kadasterInfo && <small style={{ color: "green" }}>✓ Gekopieerd uit kadaster</small>}
            </div>

            <div>
              <label>Bouwjaar (Indicatief)</label>
              <input type="number" value={bouwjaar} onChange={e => setBouwjaar(e.target.value)} placeholder="Bijv. 1950" />
            </div>
          </div>
        </div>
      )}

      {/* === TAB 2: CHECKLIST === */}
      {tab === 1 && (
        <div>
          {checklistGroepen.map(groep => (
            <div key={groep.naam} className="panel" style={{ marginBottom: 15 }}>
              <h4>{groep.naam}</h4>
              <div className="grid">
                {groep.items.map(item => (
                  <label key={item.name} style={{ display: "flex", alignItems: "center", cursor: "pointer", padding: 5 }}>
                    <input 
                      type="checkbox" 
                      name={item.name} 
                      checked={!!checked[item.name]} 
                      onChange={handleCheck} 
                      style={{ width: "20px", height: "20px", marginRight: 10, accentColor: "#800000" }}
                    />
                    <span>
                      {item.label}
                      {item.badge === "check" && <BadgeCheck />}
                    </span>
                  </label>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* === TAB 3: KOSTEN === */}
      {tab === 2 && (
        <div className="panel">
          <h3>💸 Renovatie & Herstel</h3>
          <p className="muted">Selecteer wat van toepassing is. De bedragen worden afgetrokken van de waarde.</p>
          
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {kostenMinderingItems.map(item => (
              <div key={item.stateName} style={{ display: "flex", alignItems: "center", background: "#f9f9f9", padding: "10px 15px", borderRadius: 6 }}>
                <input 
                  type="checkbox" 
                  name={item.stateName} 
                  checked={!!minderingChecked[item.stateName]} 
                  onChange={e => setMinderingChecked({ ...minderingChecked, [e.target.name]: e.target.checked })}
                  style={{ width: "20px", height: "20px", marginRight: 15, accentColor: "#800000" }}
                />
                <div style={{ flex: 1, fontWeight: "500" }}>{item.label}</div>
                {minderingChecked[item.stateName] && (
                  <div style={{ display: "flex", alignItems: "center" }}>
                    <span style={{ marginRight: 5 }}>€</span>
                    <input 
                      type="number" 
                      value={kosten[item.stateName]} 
                      onChange={e => handleKostenInput(e, item.stateName, setKosten)}
                      style={{ width: 100, fontWeight: "bold", textAlign: "right" }}
                    />
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* === TAB 4: RESULTAAT === */}
      {tab === 3 && (
        <div className="panel" style={{ padding: "40px" }}>
          <h2 style={{ textAlign: "center", color: "#800000", marginBottom: 30 }}>Waarderapport</h2>

          {/* SLIDER VOOR MARKTSENTIMENT */}
          <div style={{ background: "#f4f4f4", padding: 20, borderRadius: 8, marginBottom: 30 }}>
            <label style={{ fontWeight: "bold", display: "block", marginBottom: 10 }}>
              Staat van het pand / Ligging: {marktSentiment > 0 ? `+${marktSentiment}%` : `${marktSentiment}%`}
            </label>
            <input 
              type="range" 
              min="-20" max="20" step="5" 
              value={marktSentiment}
              onChange={e => setMarktSentiment(Number(e.target.value))}
              style={{ width: "100%", accentColor: "#800000" }}
            />
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.8rem", color: "#666", marginTop: 5 }}>
              <span>🏚️ Bouwval / Slechte ligging</span>
              <span>Normaal</span>
              <span>✨ Instapklaar / Toplocatie</span>
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: 15, fontSize: "1.1rem" }}>
            <div>Technische Waarde ({oppervlakte}m² x €{m2Prijs}):</div>
            <div style={{ fontWeight: "bold" }}>€ {fmtBedrag(technischeWaarde)}</div>
            
            <div style={{ color: marktSentiment !== 0 ? "#000" : "#999" }}>
              Correctie staat/ligging ({marktSentiment}%):
            </div>
            <div style={{ fontWeight: "bold", color: marktSentiment !== 0 ? "#000" : "#999" }}>
              {marktSentiment > 0 ? "+" : ""} € {fmtBedrag(marktCorrectie)}
            </div>

            <div style={{ borderBottom: "1px solid #ddd", marginBottom: 10 }}></div><div style={{ borderBottom: "1px solid #ddd", marginBottom: 10 }}></div>

            <div style={{ color: "red" }}>Totale Herstelkosten:</div>
            <div style={{ color: "red", fontWeight: "bold" }}>- € {fmtBedrag(kostenTotaal)}</div>

            <div style={{ fontSize: "1.4rem", fontWeight: "bold", color: "#800000", marginTop: 20 }}>
              Advies Bieding:
            </div>
            <div style={{ fontSize: "1.4rem", fontWeight: "bold", color: "#800000", marginTop: 20, background: "#ffeef0", padding: "5px 15px", borderRadius: 4 }}>
              € {fmtBedrag(adviesBod)}
            </div>
          </div>
          
          <div style={{ marginTop: 40, padding: 15, background: "#e6f7ff", borderRadius: 8, fontSize: "0.9rem" }}>
            <strong>💡 Strategie tip:</strong> 
            {adviesBod < (Number(vraagprijs) * 0.85) 
              ? " Je adviesbod ligt meer dan 15% onder de vraagprijs. Onderbouw je bod goed met de kostenlijst uit tabblad 3!"
              : " Je adviesbod ligt in de buurt van de vraagprijs. Check of er nog onderhandelruimte is op basis van de gebreken."}
          </div>
        </div>
      )}

      {/* CSS STYLES IN-LINE FOR SIMPLICITY */}
      <style>{`
        .container { font-family: 'Segoe UI', sans-serif; }
        .grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 20px; }
        .panel { background: #fff; padding: 25px; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.05); border: 1px solid #eee; }
        label { display: block; margin-bottom: 6px; font-weight: 600; font-size: 0.95rem; }
        input[type="number"], input[type="text"] { width: 100%; padding: 10px; border: 1px solid #ddd; borderRadius: 4px; font-size: 1rem; }
        .btn-outline { 
          display: inline-block; text-decoration: none; color: #555; border: 1px solid #ccc; 
          padding: 6px 12px; border-radius: 4px; font-size: 0.85rem; background: #fff; transition: all 0.2s;
        }
        .btn-outline:hover { background: #f0f0f0; border-color: #999; }
        .muted { color: #666; font-size: 0.9rem; margin-top: -10px; margin-bottom: 20px; }
      `}</style>
    </div>
  );
}

export default App;
