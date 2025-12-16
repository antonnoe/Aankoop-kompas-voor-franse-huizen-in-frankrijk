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
  
  // Kadaster Data
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
    // We checken nu ook of 'insee' bestaat, dat maakt de call stabieler
    if (adresFields.lat && adresFields.lon) {
      setLoading(true);
      setKadasterLoading(true);
      
      // 1. Kadaster (IGN) - DE ROBUUSTE VERSIE 2.0
      // We voegen code_insee toe aan de query om fouten te voorkomen
      const geomParams = encodeURIComponent(JSON.stringify({
        type: "Point",
        coordinates: [adresFields.lon, adresFields.lat]
      }));
      
      // FIX: Als we de insee code hebben, voegen we die toe.
      const inseeParam = adresFields.insee ? `&code_insee=${adresFields.insee}` : "";
      
      fetch(`https://apicarto.ign.fr/api/cadastre/parcelle?geom=${geomParams}${inseeParam}`)
        .then(res => res.json())
        .then(data => {
          if (data?.features?.length > 0) {
            const p = data.features[0].properties;
            setKadasterInfo({
              id: p.id, // Het unieke ID (bv. 625850000B0062)
              section: p.section,
              numero: p.numero,
              oppervlakte: p.contenance
            });
            if (!perceel) setPerceel(p.contenance);
          } else {
            console.warn("Geen perceel gevonden op exacte punt (waarschijnlijk punt op de weg)");
            setKadasterInfo(null);
          }
          setKadasterLoading(false);
        })
        .catch((err) => {
          console.error("IGN API Fout:", err);
          setKadasterInfo(null);
          setKadasterLoading(false);
        });

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
              let prices = relevant.map(h => h.properties.valeur_fonciere / h.properties.surface_reelle_bati);
              
              // Filter uitschieters als we genoeg data hebben (>=5)
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
  }, [adresFields.lat, adresFields.lon, adresFields.insee]);

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

  const geoportailLink = adresFields.lat
    ? `https://www.geoportail.gouv.fr/carte?c=${adresFields.lon},${adresFields.lat}&z=19&l0=GEOGRAPHICALGRIDSYSTEMS.PLANIGNV2::GEOPORTAIL:OGC:WMTS(1)&l1=CADASTRE.PARCELLES::GEOPORTAIL:OGC:WMTS(0.8)&permalink=yes`
    : "https://www.geoportail.gouv.fr/carte";
    
  // De WOW-link
  // FIX: Als ID ontbreekt, gebruiken we geoportail als fallback voor de visuele check, 
  // of we sturen ze naar de kaart gecentreerd op de stad als dat kan.
  const rechercheCadastraleLink = kadasterInfo?.id
    ? `https://recherchecadastrale.fr/cadastre/${kadasterInfo.id}`
    : `https://recherchecadastrale.fr/map?lat=${adresFields.lat}&lng=${adresFields.lon}&z=18`; 
    // ^ Let op: recherchecadastrale ondersteunt niet altijd query params goed, 
    // dus als dit faalt is geoportail de betere 'kaart' optie.

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
              
              {/* --- DE KADASTER TEGEL --- */}
              {adresFields.adres && (
                <div style={{ marginTop: 10, padding: 15, background: "#fffbe6", border: "1px solid #ffe58f", borderRadius: 6 }}>
                  <div style={{ fontWeight: "bold", color: "#800000", marginBottom: 8, display: "flex", justifyContent: "space-between" }}>
                    <span>🏛️ Officieel Kadaster</span>
                    {kadasterLoading && <span>🔍 Zoeken...</span>}
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
                           padding: "10px", borderRadius: "4px", fontWeight: "bold", fontSize: "0.95rem"
                         }}>
                           📍 Bekijk op RechercheCadastrale.fr
                         </a>
                         <a href={geoportailLink} target="_blank" className="btn-outline" style={{ textAlign: "center", padding: "10px" }}>
                           🛰️ Bekijk op Geoportail
                         </a>
                       </div>
                    </div>
                  ) : (
                    <div style={{ color: "#666", fontStyle: "italic" }}>
                      {!kadasterLoading && (
                        <div>
                          ⚠️ Geen specifiek perceel gevonden (punt ligt mogelijk op de weg). 
                          <br/>
                          <a href={geoportailLink} target="_blank" style={{ color: "#800000", fontWeight: "bold" }}>
                            Klik hier om handmatig te zoeken op de kaart
                          </a>
                        </div>
                      )}
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
          padding: 8px 12px; border-radius: 4px; font-size: 0.85rem; background: #fff; transition: all 0.2s;
        }
        .btn-outline:hover { background: #f0f0f0; border-color: #999; }
        .muted { color: #666; font-size: 0.9rem; margin-top: -10px; margin-bottom: 20px; }
      `}</style>
    </div>
  );
}
