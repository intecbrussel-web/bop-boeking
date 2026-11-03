// =====================================================
//  BOP boekingsserver - zo simpel mogelijk
//  Start met:  npm install   en daarna   npm start
//  Open dan:   http://localhost:3000
// =====================================================

const express = require("express");
const fs = require("fs");
const path = require("path");

const app = express();
const DATA_FILE = path.join(__dirname, "data.json");

app.use(express.json());                                  // JSON lezen uit requests
app.use(express.static(path.join(__dirname, "public"))); // HTML/CSS/JS tonen

// --- Hulpfuncties: data lezen en opslaan in data.json ---
function leesData() {
  return JSON.parse(fs.readFileSync(DATA_FILE, "utf8"));
}
function bewaarData(data) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
}

// --- GET /api/lessen : alle activiteiten + vrije plaatsen ---
app.get("/api/lessen", (req, res) => {
  const data = leesData();
  const lessen = data.lessen.map((les) => {
    if (!les.boekbaar) return les; // geen inschrijving -> geen plaatsen tellen
    const geboekt = data.boekingen.filter((b) => b.lesId === les.id).length;
    return { ...les, vrij: les.capaciteit - geboekt };
  });
  res.json(lessen);
});

// --- GET /api/lesgevers : wie is wanneer beschikbaar ---
app.get("/api/lesgevers", (req, res) => {
  res.json(leesData().lesgevers || []);
});

// --- POST /api/boekingen : een plaats boeken ---
app.post("/api/boekingen", (req, res) => {
  const { lesId, naam, telefoon } = req.body;

  // 1. Controle: zijn de velden ingevuld?
  if (!lesId || !naam || !naam.trim() || !telefoon || !telefoon.trim()) {
    return res.status(400).json({ fout: "Vul je naam en telefoonnummer in." });
  }

  const data = leesData();
  const les = data.lessen.find((l) => l.id === lesId);
  if (!les) {
    return res.status(404).json({ fout: "Deze les bestaat niet." });
  }
  // 2. Controle: kan je je hiervoor inschrijven?
  if (!les.boekbaar) {
    return res.status(400).json({ fout: "Voor deze activiteit kan je niet inschrijven." });
  }

  // 3. Controle: is er nog plaats? (capaciteit min aantal boekingen)
  const geboekt = data.boekingen.filter((b) => b.lesId === lesId).length;
  if (geboekt >= les.capaciteit) {
    return res.status(409).json({ fout: "Sorry, deze les is volzet." });
  }

  // 4. Boeking opslaan
  const boeking = {
    id: Date.now(),
    lesId,
    naam: naam.trim(),
    telefoon: telefoon.trim(),
    aangemaaktOp: new Date().toISOString(),
  };
  data.boekingen.push(boeking);
  bewaarData(data);

  res.status(201).json({ ok: true, les: les.naam, vrij: les.capaciteit - geboekt - 1 });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server draait op http://localhost:${PORT}`);
});
