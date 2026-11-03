// =====================================================
//  app.js - weekrooster met alle activiteiten
// =====================================================

const rooster = document.getElementById("rooster");
const periode = document.getElementById("periode");
const vorigeKnop = document.getElementById("vorige");
const volgendeKnop = document.getElementById("volgende");
const dagknoppen = document.getElementById("dagknoppen");
const venster = document.getElementById("venster");
const formulier = document.getElementById("formulier");
const melding = document.getElementById("melding");
// Demo-modus: op GitHub Pages is er geen server.
// Lokaal testen kan met ?demo achter de link.
const DEMO = location.hostname.endsWith("github.io") || location.search.includes("demo");
let alleLessen = [];
let alleLesgevers = [];
let maandag = null;      // maandag van de week die we tonen (Date)
let gekozenDag = 0;      // op gsm: welke dag (0 = maandag ... 6 = zondag)
let gekozenLes = null;

// Kleur per zaal (zoals de kleuren op de papieren planning)
const ZAALKLEUR = {
  "Gouden zaal": "#e3b341",
  "Zilveren zaal": "#c0c6cc",
  "Expo-zaal": "#4a90b8",
  "Vitrine": "#8fbf8f",
  "Brons": "#b87333",
  "Inkomhal + bar": "#c98bb9",
};

const KORTE_DAGEN = ["Ma", "Di", "Wo", "Do", "Vr", "Za", "Zo"];

// ---------- Datum-hulpfuncties ----------
function naarIso(d) {                    // Date -> "2026-10-19"
  const j = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const dag = String(d.getDate()).padStart(2, "0");
  return `${j}-${m}-${dag}`;
}
function vanIso(iso) { return new Date(iso + "T12:00:00"); }
function plusDagen(d, n) { const x = new Date(d); x.setDate(x.getDate() + n); return x; }
function maandagVan(d) {                 // maandag van de week van d
  const dagNr = (d.getDay() + 6) % 7;    // maandag = 0
  return plusDagen(d, -dagNr);
}
function dagNaam(d) {
  const n = d.toLocaleDateString("nl-BE", { weekday: "long" });
  return n.charAt(0).toUpperCase() + n.slice(1);
}
function korteDatum(d) {
  return d.toLocaleDateString("nl-BE", { day: "numeric", month: "long" });
}
function isGsm() { return window.innerWidth <= 900; }

// ---------- STAP 1: data ophalen ----------
async function laadData() {
  try {
       if (DEMO) {
      // Demo: alles uit één bestand, alle plaatsen vrij
      const antwoord = await fetch("demo-data.json");
      const data = await antwoord.json();
      alleLessen = data.lessen.map((les) => ({ ...les, vrij: les.capaciteit }));
      alleLesgevers = data.lesgevers || [];
    } else {
      const [lessenAntw, lesgeversAntw] = await Promise.all([
        fetch("/api/lessen"),
        fetch("/api/lesgevers"),
      ]);
      alleLessen = await lessenAntw.json();
      alleLesgevers = await lesgeversAntw.json();
    }

    // Eerste keer: kies de week van vandaag, of de eerste week met lessen
    if (!maandag) maandag = kiesStartWeek();
    toonRooster();
  } catch (fout) {
    rooster.textContent = "De planning kon niet geladen worden. Probeer later opnieuw.";
  }
}

function kiesStartWeek() {
  const vandaag = naarIso(new Date());
  const datums = alleLessen.map((l) => l.datum).sort();
  // eerste les vanaf vandaag, anders de laatste week met lessen
  const volgende = datums.find((d) => d >= vandaag) || datums[datums.length - 1];
  return maandagVan(volgende ? vanIso(volgende) : new Date());
}

// ---------- STAP 2: het rooster tekenen ----------
function toonRooster() {
  // de 7 dagen van deze week
  const week = [];
  for (let i = 0; i < 7; i++) week.push(plusDagen(maandag, i));

  // op gsm: alleen de gekozen dag tonen
  const dagen = isGsm() ? [week[gekozenDag]] : week;

  rooster.style.setProperty("--dagen", dagen.length);
  rooster.innerHTML = "";

  // Rij 1: koppen met dagnamen
  rooster.appendChild(maakDiv("cel kop", ""));
  const vandaag = naarIso(new Date());
  for (const d of dagen) {
    const kop = maakDiv("cel kop" + (naarIso(d) === vandaag ? " vandaag" : ""));
    kop.innerHTML = `<div>${dagNaam(d)}</div><div class="datum">${korteDatum(d)}</div>`;
    rooster.appendChild(kop);
  }

  // Rij 2: lesgevers
  /*const lgLabel = maakDiv("cel label lesgever-rij");
  lgLabel.innerHTML = "Lesgevers<small>beschikbaar</small>";
  rooster.appendChild(lgLabel);
  for (const d of dagen) {
    const cel = maakDiv("cel lesgever-rij");
    const lijst = alleLesgevers.filter((l) => l.datum === naarIso(d));
    if (lijst.length === 0) {
      cel.appendChild(maakDiv("leeg", "–"));
    } else {
      // per naam samenvoegen: "Xander — VM, NM"
      const perNaam = {};
      for (const l of lijst) {
        perNaam[l.naam] = perNaam[l.naam] || [];
        perNaam[l.naam].push(`${l.dagdeel} ${l.plaats}`);
      }
      for (const naam in perNaam) {
        const chip = maakDiv("lesgever-chip");
        chip.innerHTML = "<strong></strong><span></span>";
        chip.querySelector("strong").textContent = naam;
        chip.querySelector("span").textContent = perNaam[naam].join(" · ");
        cel.appendChild(chip);
      }
    }
    rooster.appendChild(cel);
  }*/

  // Rij 3 en 4: voormiddag en namiddag
  const dagdelen = [
    { code: "VM", naam: "Voormiddag", uren: "tot 12u" },
    { code: "NM", naam: "Namiddag",   uren: "vanaf 12u" },
  ];
  for (const deel of dagdelen) {
    const label = maakDiv("cel label");
    label.innerHTML = `${deel.naam}<small>${deel.uren}</small>`;
    rooster.appendChild(label);

    for (const d of dagen) {
      const cel = maakDiv("cel");
      const lessen = alleLessen
        .filter((l) => l.datum === naarIso(d))
        // "dag" = hele dag -> in beide rijen tonen
        .filter((l) => l.dagdeel === deel.code || l.dagdeel === "dag")
        .sort((a, b) => (a.start || "99").localeCompare(b.start || "99"));

      if (lessen.length === 0) cel.appendChild(maakDiv("leeg", "–"));
      else lessen.forEach((les) => cel.appendChild(maakLesKaart(les)));
      rooster.appendChild(cel);
    }
  }

  // Navigatie bijwerken
  const zondag = week[6];
  periode.textContent = `Week van ${korteDatum(maandag)} tot ${korteDatum(zondag)}`;
  toonDagknoppen(week);
}

// ---------- STAP 3: één kaartje per activiteit ----------
function maakLesKaart(les) {
  const kaart = document.createElement("div");

  // uur: "09:30 – 11:30", "vanaf 14:00" of "uur volgt"
  let uur = "Uur volgt";
  if (les.start && les.einde) uur = `${les.start} – ${les.einde}`;
  else if (les.start) uur = `Vanaf ${les.start}`;

  // status bepalen
  let status = "";
  let vrijTekst = "";
  if (!les.boekbaar) {
    status = "info";
    vrijTekst = les.opmerking || "Geen inschrijving";
  } else if (les.vrij === 0) {
    status = "vol"; vrijTekst = "Volzet";
  } else {
    if (les.vrij <= 3) status = "weinig";
    vrijTekst = les.vrij === 1 ? "Nog 1 plaats" : `${les.vrij} plaatsen vrij`;
  }

  kaart.className = "les " + status;
  kaart.innerHTML = `
    <div class="uur"></div>
    <h3></h3>
    <div class="meta"><i class="zaalbol"></i><span class="zaal"></span></div>
    <div class="vrij"></div>
  `;
  kaart.querySelector(".uur").textContent = uur;
  kaart.querySelector("h3").textContent = les.naam;
  kaart.querySelector(".zaalbol").style.background = ZAALKLEUR[les.zaal] || "#ccc";
  // zaal + lesgever naast elkaar
  kaart.querySelector(".zaal").textContent =
    les.lesgever ? `${les.zaal} · ${les.lesgever}` : les.zaal;
  kaart.querySelector(".vrij").textContent = vrijTekst;

  // alleen een knop als je kan inschrijven
  if (les.boekbaar) {
    const knop = document.createElement("button");
    knop.textContent = les.vrij === 0 ? "Volzet" : "Inschrijven";
    knop.disabled = les.vrij === 0;
    knop.addEventListener("click", () => openVenster(les));
    kaart.appendChild(knop);
  }
  return kaart;
}

function maakDiv(klasse, tekst) {
  const div = document.createElement("div");
  div.className = klasse;
  if (tekst !== undefined) div.textContent = tekst;
  return div;
}

// ---------- STAP 4: navigatie ----------
vorigeKnop.addEventListener("click", () => { maandag = plusDagen(maandag, -7); toonRooster(); });
volgendeKnop.addEventListener("click", () => { maandag = plusDagen(maandag, 7); toonRooster(); });
window.addEventListener("resize", () => { if (maandag) toonRooster(); });

// op gsm: knoppen Ma Di Wo ... om een dag te kiezen
function toonDagknoppen(week) {
  dagknoppen.innerHTML = "";
  week.forEach((d, i) => {
    const knop = document.createElement("button");
    knop.textContent = `${KORTE_DAGEN[i]} ${d.getDate()}`;
    if (i === gekozenDag) knop.classList.add("actief");
    knop.addEventListener("click", () => { gekozenDag = i; toonRooster(); });
    dagknoppen.appendChild(knop);
  });
}

// ---------- STAP 5: inschrijven ----------
function openVenster(les) {
  gekozenLes = les;
  const d = vanIso(les.datum);
  document.getElementById("venster-titel").textContent = les.naam;
  let info = `${dagNaam(d)} ${korteDatum(d)}`;
  if (les.start) info += `, ${les.start}${les.einde ? " – " + les.einde : ""}`;
  info += ` (${les.zaal}${les.lesgever ? ", met " + les.lesgever : ""})`;
  document.getElementById("venster-info").textContent = info;

  formulier.reset();
  melding.textContent = "";
  melding.className = "";
  formulier.querySelector("button[type=submit]").hidden = false;
  document.getElementById("annuleer").textContent = "Annuleren";
  venster.showModal();
}

document.getElementById("annuleer").addEventListener("click", () => venster.close());

formulier.addEventListener("submit", async (e) => {
  e.preventDefault();
   // Demo: niets versturen, alleen een melding tonen
  if (DEMO) {
    melding.className = "gelukt";
    melding.textContent = "Dit is een demo: uw inschrijving wordt niet opgeslagen.";
    formulier.querySelector("button[type=submit]").hidden = true;
    document.getElementById("annuleer").textContent = "Sluiten";
    return;
  }
  const antwoord = await fetch("/api/boekingen", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      lesId: gekozenLes.id,
      naam: formulier.naam.value,
      telefoon: formulier.telefoon.value,
    }),
  });
  const resultaat = await antwoord.json();

  if (antwoord.ok) {
    melding.className = "gelukt";
    melding.textContent = `Gelukt! U bent ingeschreven voor ${resultaat.les}.`;
    formulier.querySelector("button[type=submit]").hidden = true;
    document.getElementById("annuleer").textContent = "Sluiten";
    laadData(); // vrije plaatsen vernieuwen
  } else {
    melding.textContent = resultaat.fout;
  }
});
if (DEMO) document.getElementById("demo-melding").hidden = false;
laadData();
