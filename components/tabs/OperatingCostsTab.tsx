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

interface CostItem {
  id: string;
  category: string;
  amount: number;
}

export function OperatingCostsTab({ properties, units, tenants }: Props) {
  const [selectedPropertyId, setSelectedPropertyId] = useState("");
  const [selectedTenantId, setSelectedTenantId] = useState("");
  const [year, setYear] = useState("2025");

  const [costs, setCosts] = useState<CostItem[]>([
    { id: "1", category: "Heizung & Warmwasser", amount: 1200 },
    { id: "2", category: "Grundsteuer", amount: 350 },
    { id: "3", category: "Gebäudeversicherung", amount: 480 },
    { id: "4", category: "Müllabfuhr & Straßenreinigung", amount: 260 },
  ]);

  const [newCategory, setNewCategory] = useState("");
  const [newAmount, setNewAmount] = useState("");

  const selectedProperty = properties.find((p) => p.id === selectedPropertyId);
  const selectedTenant = tenants.find((t) => t.id === selectedTenantId);
  const selectedUnit = units.find((u) => u.id === selectedTenant?.unit_id);

  // Gesamtfläche des Objekts berechnen
  const totalPropertySqm = units
    .filter((u) => u.property_id === selectedPropertyId)
    .reduce((sum, u) => sum + (u.size_sqm || 0), 0) || 1;

  const totalCosts = costs.reduce((sum, item) => sum + item.amount, 0);
  const tenantSqm = selectedUnit?.size_sqm || 0;
  const sqmShareRatio = tenantSqm / totalPropertySqm;

  // Anteiliger Betrag für den Mieter
  const tenantShareTotal = totalCosts * sqmShareRatio;
  const annualAdvance = (selectedTenant?.utility_advance || 0) * 12;
  const balance = tenantShareTotal - annualAdvance; // > 0 = Nachzahlung, < 0 = Guthaben

  function addCostItem(e: React.FormEvent) {
    e.preventDefault();
    if (!newCategory || !newAmount) return;
    setCosts([
      ...costs,
      { id: Date.now().toString(), category: newCategory, amount: parseFloat(newAmount) || 0 },
    ]);
    setNewCategory("");
    setNewAmount("");
  }

  function removeCostItem(id: string) {
    setCosts(costs.filter((c) => c.id !== id));
  }

  function generatePDF() {
    if (!selectedProperty || !selectedTenant || !selectedUnit) {
      alert("Bitte wählen Sie zuerst ein Objekt und einen Mieter aus.");
      return;
    }

    const doc = new jsPDF();

    // Briefkopf / Absender
    doc.setFontSize(16);
    doc.setFont("helvetica", "bold");
    doc.text("Nebenkostenabrechnung " + year, 14, 20);

    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.text(`Objekt: ${selectedProperty.name}, ${selectedProperty.address}`, 14, 28);
    doc.text(`Mieter: ${selectedTenant.first_name} ${selectedTenant.last_name}`, 14, 34);
    doc.text(`Einheit: ${selectedUnit.unit_number} (${tenantSqm} m²)`, 14, 40);
    doc.text(`Gesamtwohnfläche Objekt: ${totalPropertySqm} m²`, 14, 46);

    // Tabelle für Einzelkosten
    const tableData = costs.map((item) => {
      const tenantItemShare = item.amount * sqmShareRatio;
      return [
        item.category,
        `${item.amount.toFixed(2)} €`,
        `${tenantSqm} / ${totalPropertySqm} m²`,
        `${tenantItemShare.toFixed(2)} €`,
      ];
    });

    autoTable(doc, {
      startY: 55,
      head: [["Kostenart", "Gesamtkosten", "Verteilerschlüssel", "Ihr Anteil"]],
      body: tableData,
      theme: "striped",
      headStyles: { fillColor: [30, 41, 59] },
    });

    // Zusammenfassung am Ende der Tabelle
    const finalY = (doc as any).lastAutoTable.finalY + 10;

    doc.setFontSize(10);
    doc.text(`Gesamtkosten Anteil Mieter:`, 14, finalY);
    doc.text(`${tenantShareTotal.toFixed(2)} €`, 150, finalY, { align: "right" });

    doc.text(`Geleistete Vorauszahlungen (12 Monate):`, 14, finalY + 6);
    doc.text(`- ${annualAdvance.toFixed(2)} €`, 150, finalY + 6, { align: "right" });

    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    const resultText = balance >= 0 ? "Ihre Nachzahlung:" : "Ihr Guthaben:";
    doc.text(resultText, 14, finalY + 14);
    doc.text(`${Math.abs(balance).toFixed(2)} €`, 150, finalY + 14, { align: "right" });

    doc.save(`Nebenkostenabrechnung_${year}_${selectedTenant.last_name}.pdf`);
  }

  return (
    <div className="p-6 space-y-6">
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">Objekt wählen</label>
          <select
            value={selectedPropertyId}
            onChange={(e) => setSelectedPropertyId(e.target.value)}
            className="w-full text-xs rounded border border-slate-300 p-2 bg-white"
          >
            <option value="">Objekt wählen...</option>
            {properties.map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">Mieter wählen</label>
          <select
            value={selectedTenantId}
            onChange={(e) => setSelectedTenantId(e.target.value)}
            className="w-full text-xs rounded border border-slate-300 p-2 bg-white"
          >
            <option value="">Mieter wählen...</option>
            {tenants.map((t) => (
              <option key={t.id} value={t.id}>{t.first_name} {t.last_name}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">Abrechnungsjahr</label>
          <input
            type="text"
            value={year}
            onChange={(e) => setYear(e.target.value)}
            className="w-full text-xs rounded border border-slate-300 p-2"
          />
        </div>
      </div>

      {/* Eingabe neuer Kosten */}
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-4">
        <h3 className="text-sm font-bold text-slate-900">Betriebskosten-Positionen</h3>
        <form onSubmit={addCostItem} className="flex gap-2 text-xs">
          <input
            type="text"
            placeholder="Kostenart (z.B. Gartenpflege)"
            value={newCategory}
            onChange={(e) => setNewCategory(e.target.value)}
            className="flex-1 rounded border border-slate-300 p-2"
          />
          <input
            type="number"
            step="0.01"
            placeholder="Gesamtbetrag (€)"
            value={newAmount}
            onChange={(e) => setNewAmount(e.target.value)}
            className="w-36 rounded border border-slate-300 p-2"
          />
          <button type="submit" className="bg-slate-900 text-white px-4 py-2 rounded font-medium hover:bg-slate-800">
            Hinzufügen
          </button>
        </form>

        <table className="w-full text-left text-xs text-slate-600 border-collapse">
          <thead>
            <tr className="border-b border-slate-200 text-slate-400">
              <th className="py-2">Kostenart</th>
              <th className="py-2">Gesamtkosten (€)</th>
              <th className="py-2">Anteil Mieter ({tenantSqm} m²)</th>
              <th className="py-2 text-right">Aktion</th>
            </tr>
          </thead>
          <tbody>
            {costs.map((item) => (
              <tr key={item.id} className="border-b border-slate-100">
                <td className="py-2 font-medium text-slate-800">{item.category}</td>
                <td className="py-2">{item.amount.toFixed(2)} €</td>
                <td className="py-2">{(item.amount * sqmShareRatio).toFixed(2)} €</td>
                <td className="py-2 text-right">
                  <button onClick={() => removeCostItem(item.id)} className="text-red-500 hover:text-red-700">
                    Löschen
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Ergebnis & PDF Export Button */}
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
        <div className="text-xs space-y-1">
          <p className="text-slate-500">Gesamtkosten Anteil Mieter: <span className="font-bold text-slate-800">{tenantShareTotal.toFixed(2)} €</span></p>
          <p className="text-slate-500">Geleistete Vorauszahlungen (12 Monate): <span className="font-bold text-slate-800">{annualAdvance.toFixed(2)} €</span></p>
          <p className={`font-bold text-sm ${balance >= 0 ? "text-red-600" : "text-emerald-600"}`}>
            {balance >= 0 ? `Nachzahlung: ${balance.toFixed(2)} €` : `Guthaben: ${Math.abs(balance).toFixed(2)} €`}
          </p>
        </div>
        <button
          onClick={generatePDF}
          className="bg-blue-600 hover:bg-blue-500 text-white font-medium text-xs px-4 py-2.5 rounded-lg transition-colors flex items-center gap-2 shadow-sm"
        >
          📄 PDF Abrechnung herunterladen
        </button>
      </div>
    </div>
  );
}

export default OperatingCostsTab;