"use client";

import React, { useState, useEffect } from "react";
import { Property, Unit, Tenant } from "@/types";
import ContractPreviewModal, { ContractPreviewData } from "./ContractPreviewModal";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  properties: Property[];
  units: Unit[];
  tenants: Tenant[];
}

export default function AddContractModal({
  isOpen,
  onClose,
  onSuccess,
  properties,
  units,
  tenants,
}: Props) {
  const [selectedPropertyId, setSelectedPropertyId] = useState("");
  const [selectedUnitId, setSelectedUnitId] = useState("");
  const [selectedTenantId, setSelectedTenantId] = useState("");

  const [templateName, setTemplateName] = useState("Standard-Wohnraummietvertrag 2026");
  const [startDate, setStartDate] = useState(new Date().toISOString().split("T")[0]);
  const [noticePeriodMonths, setNoticePeriodMonths] = useState(3);

  const [coldRent, setColdRent] = useState("800");
  const [utilityCosts, setUtilityCosts] = useState("200");
  const [deposit, setDeposit] = useState("2400");

  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [previewData, setPreviewData] = useState<ContractPreviewData | null>(null);

  useEffect(() => {
    if (isOpen) {
      setSelectedPropertyId("");
      setSelectedUnitId("");
      setSelectedTenantId("");
      setColdRent("800");
      setUtilityCosts("200");
      setDeposit("2400");
      setStartDate(new Date().toISOString().split("T")[0]);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const filteredUnits = units.filter(
    (u) => !selectedPropertyId || String(u.property_id) === String(selectedPropertyId)
  );

  const filteredTenants = tenants.filter(
    (t) => !selectedUnitId || String(t.unit_id) === String(selectedUnitId)
  );

  // Einheit auswählen -> automatische Zuordnung
  const handleUnitChange = (unitId: string) => {
    setSelectedUnitId(unitId);
    const unit = units.find((u) => String(u.id) === String(unitId));
    if (unit) {
      if (unit.property_id) setSelectedPropertyId(String(unit.property_id));
      const matchingTenant = tenants.find((t) => String(t.unit_id) === String(unitId));
      if (matchingTenant) setSelectedTenantId(String(matchingTenant.id));
    }
  };

  // Mieter auswählen
  const handleTenantChange = (tenantId: string) => {
    setSelectedTenantId(tenantId);
    const tenant = tenants.find((t) => String(t.id) === String(tenantId));
    if (tenant && tenant.unit_id) {
      setSelectedUnitId(String(tenant.unit_id));
      const unitObj = units.find((u) => String(u.id) === String(tenant.unit_id));
      if (unitObj && unitObj.property_id) setSelectedPropertyId(String(unitObj.property_id));
    }
  };

  // Vorschau öffnen und Daten sauber aufbereiten
  const handleOpenPreview = (e: React.FormEvent) => {
    e.preventDefault();

    const prop = properties.find((p) => String(p.id) === String(selectedPropertyId));
    const unit = units.find((u) => String(u.id) === String(selectedUnitId));
    const tenant = tenants.find((t) => String(t.id) === String(selectedTenantId));

    const tenantName = tenant
      ? `${tenant.first_name || ""} ${tenant.last_name || ""}`.trim()
      : "Test Dummy";

    const propName = prop ? prop.name || prop.address || "Wohnung Koblenz" : "Wohnung Koblenz";
    const unitNumber = unit ? String(unit.unit_number || unit.id || "Einheit 2") : "Einheit 2";

    const numCold = parseFloat(coldRent) || 0;
    const numUtil = parseFloat(utilityCosts) || 0;
    const numDep = parseFloat(deposit) || 0;

    const dataPayload: ContractPreviewData = {
      vermieterName: "Hausverwaltung / Vermieter",
      vermieterAdresse: "Musterstraße 1, 12345 Stadt",
      mieterName: tenantName,
      objektName: propName,
      einheitNr: unitNumber,
      mietbeginn: startDate ? new Date(startDate).toLocaleDateString("de-DE") : "08.09.2026",
      kaltmiete: numCold,
      nebenkosten: numUtil,
      kaution: numDep,
      sondervereinbarungen: "Keine besonderen Vereinbarungen.",
      propertyId: selectedPropertyId,
      unitId: selectedUnitId,
      tenantId: selectedTenantId,
    };

    setPreviewData(dataPayload);
    setIsPreviewOpen(true);
  };

  return (
    <>
      <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-40 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-2xl max-w-xl w-full p-6 space-y-4 border border-slate-200 max-h-[90vh] overflow-y-auto">
          
          <div className="flex justify-between items-center border-b border-slate-100 pb-3">
            <div>
              <h3 className="font-bold text-slate-900 text-base flex items-center gap-2">
                <span>📄</span> Neuen Mietvertrag erstellen
              </h3>
              <p className="text-slate-500 text-xs">
                Erfasse die Vertragsdaten & wähle ein Vertragsmuster aus Dokumente.
              </p>
            </div>
            <button onClick={onClose} type="button" className="text-slate-400 hover:text-slate-600 text-lg">✕</button>
          </div>

          <form onSubmit={handleOpenPreview} className="space-y-4 text-xs">
            
            {/* Vorlagen Auswahl */}
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Vertragsmuster / Vorlage (aus Dokumente)</label>
              <select
                value={templateName}
                onChange={(e) => setTemplateName(e.target.value)}
                className="w-full p-2.5 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 bg-white font-medium"
              >
                <option value="Standard-Wohnraummietvertrag 2026">Standard-Wohnraummietvertrag 2026</option>
                <option value="Mietvertrag Staffelmiete 2026">Mietvertrag Staffelmiete 2026</option>
                <option value="Gewerbemietvertrag Muster">Gewerbemietvertrag Muster</option>
              </select>
            </div>

            {/* Objekt & Einheit */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Objekt</label>
                <select
                  value={selectedPropertyId}
                  onChange={(e) => setSelectedPropertyId(e.target.value)}
                  className="w-full p-2.5 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                  required
                >
                  <option value="">-- Objekt wählen --</option>
                  {properties.map((p) => (
                    <option key={p.id} value={p.id}>{p.name || p.address}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Einheit</label>
                <select
                  value={selectedUnitId}
                  onChange={(e) => handleUnitChange(e.target.value)}
                  className="w-full p-2.5 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                  required
                >
                  <option value="">-- Einheit wählen --</option>
                  {filteredUnits.map((u) => (
                    <option key={u.id} value={u.id}>Einheit {u.unit_number || u.id}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Mieter */}
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Mieter</label>
              <select
                value={selectedTenantId}
                onChange={(e) => handleTenantChange(e.target.value)}
                className="w-full p-2.5 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                required
              >
                <option value="">-- Mieter wählen --</option>
                {filteredTenants.map((t) => (
                  <option key={t.id} value={t.id}>{t.first_name} {t.last_name}</option>
                ))}
              </select>
            </div>

            {/* Mietbeginn & Frist */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Mietbeginn</label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full p-2.5 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Kündigungsfrist (Monate)</label>
                <input
                  type="number"
                  min="1"
                  max="24"
                  value={noticePeriodMonths}
                  onChange={(e) => setNoticePeriodMonths(Number(e.target.value))}
                  className="w-full p-2.5 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
            </div>

            {/* Finanzielle Angaben */}
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Kaltmiete (€)</label>
                <input
                  type="number"
                  step="0.01"
                  placeholder="800"
                  value={coldRent}
                  onChange={(e) => setColdRent(e.target.value)}
                  className="w-full p-2.5 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Nebenkosten (€)</label>
                <input
                  type="number"
                  step="0.01"
                  placeholder="200"
                  value={utilityCosts}
                  onChange={(e) => setUtilityCosts(e.target.value)}
                  className="w-full p-2.5 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Kaution (€)</label>
                <input
                  type="number"
                  step="0.01"
                  placeholder="2400"
                  value={deposit}
                  onChange={(e) => setDeposit(e.target.value)}
                  className="w-full p-2.5 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-lg"
              >
                Abbrechen
              </button>
              <button
                type="submit"
                className="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-semibold rounded-lg shadow-sm"
              >
                Vertrag erstellen & Vorschau ➔
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Vorschau Modal mit allen Daten & Unterschriften */}
      {previewData && (
        <ContractPreviewModal
          isOpen={isPreviewOpen}
          onClose={() => setIsPreviewOpen(false)}
          onSaveSuccess={() => {
            onSuccess();
            onClose();
          }}
          data={previewData}
        />
      )}
    </>
  );
}