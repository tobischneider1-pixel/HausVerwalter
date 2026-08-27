"use client";

import React, { useState } from "react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { Property, Tenant, Unit } from "@/types";

interface Props {
  properties: Property[];
  units: Unit[];
  tenants: Tenant[];
}

interface CostRow {
  id: string;
  active: boolean;
  category: string;
  key: string;
  amount: number;
}

const DEFAULT_COST_ITEMS: Omit<CostRow, "id">[] = [
  { active: true, category: "Abfallentsorgung", key: "Anteile (1000stel)", amount: 1310.4 },
  { active: true, category: "Oberflächenwasser", key: "Wohnfläche (m²)", amount: 210.0 },
  { active: true, category: "Straßenreinigung", key: "Wohnfläche (m²)", amount: 150.0 },
  { active: true, category: "Gebäudehaftpflichtversicherung", key: "Wohnfläche (m²)", amount: 320.0 },
  { active: true, category: "Geb.-Vers. Leitungswasser/Sturm", key: "Wohnfläche (m²)", amount: 780.0 },
  { active: true, category: "Glasbruchversicherung", key: "Wohnfläche (m²)", amount: 120.0 },
  { active: true, category: "Strom (Beleuchtung)", key: "Personen / Einheiten", amount: 190.0 },
  { active: true, category: "Gartenpflege (Fremdfirma)", key: "Wohnfläche (m²)", amount: 850.0 },
  { active: true, category: "Reinigung (Fremdfirma)", key: "Wohnfläche (m²)", amount: 1200.0 },
  { active: true, category: "Hausmeister (Fremdfirma)", key: "Wohnfläche (m²)", amount: 1500.0 },
];

export function OperatingCostsTab({ properties, units, tenants }: Props) {
  const [subTab, setSubTab] = useState<"costs" | "split" | "belege">("costs");
  const [selectedPropertyId, setSelectedPropertyId] = useState(properties[0]?.id || "");
  const [selectedTenantId, setSelectedTenantId] = useState(tenants[0]?.id || "");
  const [year, setYear] = useState("2025");
  const [globalKey, setGlobalKey] = useState("Wohnfläche (m²)");

  const [costs, setCosts] = useState<CostRow[]>(
    DEFAULT_COST_ITEMS.map((item, idx) => ({ ...item, id: idx.toString() }))
  );

  const selectedProperty = properties.find((p) => p.id === selectedPropertyId) || properties[0];
  const selectedTenant = tenants.find((t) => t.id === selectedTenantId) || tenants[0];
  const selectedUnit = units.find((u) => u.id === selectedTenant?.unit_id);

  const totalPropertySqm = units
    .filter((u) => u.property_id === selectedPropertyId)
    .reduce((sum, u) => sum + (u.size_sqm || 0), 0) || 1;

  const activeCosts = costs.filter((c) => c.active);
  const totalCosts = activeCosts.reduce((sum, item) => sum + item.amount, 0);
  const tenantSqm = selectedUnit?.size_sqm || 0;
  const sqmRatio = tenantSqm / totalPropertySqm;

  const tenantShareTotal = totalCosts * sqmRatio;
  const annualAdvance = (selectedTenant?.utility_advance || 0) * 12;
  const balance = tenantShareTotal - annualAdvance;

  const toggleCost = (id: string) => {
    setCosts(costs.map((c) => (c.id === id ? { ...c, active: !c.active } : c)));
  };

  const updateAmount = (id: string, val: number) => {
    setCosts(costs.map((c) => (c.id === id ? { ...c, amount: val } : c)));
  };

  const updateKey = (id: string, key: string) => {
    setCosts(costs.map((c) => (c.id === id ? { ...c, key } : c)));
  };

  function applyGlobalKey(key: string) {
    setGlobalKey(key);
    setCosts(costs.map((c) => ({ ...c, key })));
  }

  function generatePDF() {
    if (!selectedProperty || !selectedTenant || !selectedUnit) {
      alert("Bitte wählen Sie ein Objekt und einen Mieter aus.");
      return;
    }

    const doc = new jsPDF();
    doc.setFontSize(16);
    doc.setFont("helvetica", "bold");
    doc.text(`Nebenkostenabrechnung ${year}`, 14, 20);

    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.text(`Objekt: ${selectedProperty.name}, ${selectedProperty.address}`, 14, 28);
    doc.text(`Mieter: ${selectedTenant.first_name} ${selectedTenant.last_name}`, 14, 34);
    doc.text(`Einheit: ${selectedUnit.unit_number} (${tenantSqm} m²)`, 14, 40);

    const tableData = activeCosts.map((item) => [
      item.category,
      item.key,
      `${item.amount.toFixed(2)} €`,
      `${(item.amount * sqmRatio).toFixed(2)} €`,
    ]);

    autoTable(doc, {
      startY: 48,
      head: [["Kostenart", "Verteilerschlüssel", "Gesamtkosten", "Anteil Mieter"]],
      body: tableData,
      theme: "striped",
      headStyles: { fillColor: [30, 41, 59] },
    });

    const finalY = (doc as any).lastAutoTable.finalY + 10;
    doc.text(`Gesamtkosten Anteil Mieter: ${tenantShareTotal.toFixed(2)} €`, 14, finalY);
    doc.text(`Geleistete Vorauszahlungen: -${annualAdvance.toFixed(2)} €`, 14, finalY + 6);
    doc.setFont("helvetica", "bold");
    doc.text(
      balance >= 0
        ? `Nachzahlung: ${balance.toFixed(2)} €`
        : `Guthaben: ${Math.abs(balance).toFixed(2)} €`,
      14,
      finalY + 14
    );

    doc.save(`Betriebskosten_${year}_${selectedTenant.last_name}.pdf`);
  }

  return (
    <div className="p-6 space-y-6 text-xs text-slate-700">
      {/* Header Bereich */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-slate-900">Betriebskosten & Gebäude-Abrechnung</h2>
          <p className="text-slate-500">Erfassen und aufteilen nach deinen genauen Vorlagen.</p>
        </div>

        {/* Sub-Navigation Pills */}
        <div className="flex items-center gap-1 bg-slate-200/60 p-1 rounded-xl">
          <button
            onClick={() => setSubTab("costs")}
            className={`px-3 py-1.5 rounded-lg font-medium transition-all ${
              subTab === "costs" ? "bg-white shadow-sm text-slate-900" : "text-slate-600 hover:text-slate-900"
            }`}
          >
            📊 Gesamtkosten erfassen
          </button>
          <button
            onClick={() => setSubTab("split")}
            className={`px-3 py-1.5 rounded-lg font-medium transition-all ${
              subTab === "split" ? "bg-white shadow-sm text-slate-900" : "text-slate-600 hover:text-slate-900"
            }`}
          >
            🏢 Aufteilung nach Wohnung
          </button>
          <button
            onClick={() => setSubTab("belege")}
            className={`px-3 py-1.5 rounded-lg font-medium transition-all ${
              subTab === "belege" ? "bg-white shadow-sm text-slate-900" : "text-slate-600 hover:text-slate-900"
            }`}
          >
            📁 Belege
          </button>
        </div>
      </div>

      {/* Objekt & Jahr Auswahl Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-slate-500">📍 Objekt:</span>
            <select
              value={selectedPropertyId}
              onChange={(e) => setSelectedPropertyId(e.target.value)}
              className="rounded border border-slate-300 p-1.5 bg-white font-medium"
            >
              {properties.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} — {p.city}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2">
            <span className="font-semibold text-slate-500">Abrechnungsjahr:</span>
            <select
              value={year}
              onChange={(e) => setYear(e.target.value)}
              className="rounded border border-slate-300 p-1.5 bg-white font-medium"
            >
              <option value="2025">2025</option>
              <option value="2024">2024</option>
            </select>
          </div>
        </div>

        <span className="bg-emerald-50 text-emerald-700 px-3 py-1 rounded-full text-[11px] font-semibold border border-emerald-200">
          Status: Übernommen für {selectedProperty?.name || "Objekt"} 🚀
        </span>
      </div>

      {/* SUBTAB 1: Gesamtkosten erfassen */}
      {subTab === "costs" && (
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h3 className="font-bold text-slate-900 text-sm">
              Bewirtschaftung für: <span className="text-blue-600">{selectedProperty?.name}</span> ({year})
            </h3>
            <div className="flex items-center gap-2">
              <span className="text-slate-500 font-medium">Globaler Schlüssel:</span>
              <select
                value={globalKey}
                onChange={(e) => applyGlobalKey(e.target.value)}
                className="rounded border border-slate-300 p-1.5 bg-white"
              >
                <option value="Wohnfläche (m²)">Wohnfläche (m²)</option>
                <option value="Anteile (1000stel)">Anteile (1000stel)</option>
                <option value="Personen / Einheiten">Personen / Einheiten</option>
              </select>
            </div>
          </div>

          <p className="font-semibold text-slate-500 pt-1">
            Bewirtschaftung (Kosten) – Umlagefähige kalte Betriebskosten
          </p>

          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 text-slate-400 font-semibold text-[11px]">
                <th className="py-2 w-12">Aktiv</th>
                <th className="py-2">Kostenart</th>
                <th className="py-2 w-56">Verteilerschlüssel</th>
                <th className="py-2 text-right w-40">Gesamtkosten (€)</th>
              </tr>
            </thead>
            <tbody>
              {costs.map((item) => (
                <tr key={item.id} className="border-b border-slate-100 hover:bg-slate-50/50">
                  <td className="py-2.5">
                    <input
                      type="checkbox"
                      checked={item.active}
                      onChange={() => toggleCost(item.id)}
                      className="rounded border-slate-300 text-blue-600 focus:ring-0"
                    />
                  </td>
                  <td className="py-2.5 font-medium text-slate-800">{item.category}</td>
                  <td className="py-2.5">
                    <select
                      value={item.key}
                      onChange={(e) => updateKey(item.id, e.target.value)}
                      className="w-full rounded border border-slate-200 p-1 bg-white"
                    >
                      <option value="Wohnfläche (m²)">Wohnfläche (m²)</option>
                      <option value="Anteile (1000stel)">Anteile (1000stel)</option>
                      <option value="Personen / Einheiten">Personen / Einheiten</option>
                      <option value="Direktzuordnung">Direktzuordnung</option>
                    </select>
                  </td>
                  <td className="py-2.5 text-right">
                    <input
                      type="number"
                      step="0.01"
                      value={item.amount}
                      onChange={(e) => updateAmount(item.id, parseFloat(e.target.value) || 0)}
                      className="w-32 rounded border border-slate-200 p-1 text-right font-semibold"
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="flex justify-between items-center pt-3 border-t border-slate-100 font-bold">
            <span>Gesamtsumme Umlagefähig:</span>
            <span className="text-sm text-slate-900">{totalCosts.toFixed(2)} €</span>
          </div>
        </div>
      )}

      {/* SUBTAB 2: Aufteilung nach Wohnung */}
      {subTab === "split" && (
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h3 className="font-bold text-slate-900 text-sm">Abrechnung pro Mieter generieren</h3>
            <div className="flex items-center gap-2">
              <span className="font-semibold text-slate-500">Mieter wählen:</span>
              <select
                value={selectedTenantId}
                onChange={(e) => setSelectedTenantId(e.target.value)}
                className="rounded border border-slate-300 p-1.5 bg-white"
              >
                {tenants.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.first_name} {t.last_name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="bg-slate-50 p-4 rounded-lg space-y-2 text-xs">
            <p><strong>Mieter:</strong> {selectedTenant?.first_name} {selectedTenant?.last_name}</p>
            <p><strong>Wohnfläche Mieter:</strong> {tenantSqm} m² von {totalPropertySqm} m² ({((tenantSqm/totalPropertySqm)*100).toFixed(1)} %)</p>
            <p><strong>Anteilige Gesamtkosten:</strong> {tenantShareTotal.toFixed(2)} €</p>
            <p><strong>Geleistete Vorauszahlungen (12 Monate):</strong> {annualAdvance.toFixed(2)} €</p>
            <p className={`font-bold text-sm ${balance >= 0 ? "text-red-600" : "text-emerald-600"}`}>
              {balance >= 0 ? `Nachzahlung: ${balance.toFixed(2)} €` : `Guthaben: ${Math.abs(balance).toFixed(2)} €`}
            </p>
          </div>

          <div className="flex justify-end pt-2">
            <button
              onClick={generatePDF}
              className="bg-blue-600 hover:bg-blue-500 text-white font-medium px-4 py-2 rounded-lg transition-colors flex items-center gap-2"
            >
              📄 Abrechnung als PDF herunterladen
            </button>
          </div>
        </div>
      )}

      {/* SUBTAB 3: Belege */}
      {subTab === "belege" && (
        <div className="bg-white p-8 rounded-xl border border-slate-200 shadow-sm text-center text-slate-500">
          📂 Hier können Belege und Rechnungen für {selectedProperty?.name} hochgeladen und verwaltet werden.
        </div>
      )}
    </div>
  );
}

export default OperatingCostsTab;