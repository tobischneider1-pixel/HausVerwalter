"use client";

import React, { useState, useEffect } from "react";
import { Property, Unit, Tenant } from "@/types";
import { supabase } from "@/lib/supabase";
import ContractPreviewModal, { ContractPreviewData } from "@/components/modals/ContractPreviewModal";

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

  const [contractTemplates, setContractTemplates] = useState<any[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState("");

  const [startDate, setStartDate] = useState(new Date().toISOString().split("T")[0]);
  const [noticePeriodMonths, setNoticePeriodMonths] = useState(3);

  const [coldRent, setColdRent] = useState("800");
  const [utilityCosts, setUtilityCosts] = useState("200");
  const [deposit, setDeposit] = useState("2400");

  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [previewData, setPreviewData] = useState<ContractPreviewData | null>(null);

  // Vertragsmuster aus Supabase (Kategorie: "Vertragsmuster") laden beim Öffnen
  useEffect(() => {
    if (isOpen) {
      setSelectedPropertyId("");
      setSelectedUnitId("");
      setSelectedTenantId("");
      setColdRent("800");
      setUtilityCosts("200");
      setDeposit("2400");
      setStartDate(new Date().toISOString().split("T")[0]);

      fetchTemplates();
    }
  }, [isOpen]);

  const fetchTemplates = async () => {
    try {
      const { data, error } = await supabase
        .from("documents")
        .select("id, title, content, category")
        .eq("category", "Vertragsmuster");

      if (error) throw error;
      setContractTemplates(data || []);
      if (data && data.length > 0) {
        setSelectedTemplateId(data[0].id);
      }
    } catch (err) {
      console.error("Fehler beim Laden der Vertragsmuster:", err);
    }
  };

  if (!isOpen) return null;

  const filteredUnits = units.filter(
    (u) => !selectedPropertyId || String(u.property_id) === String(selectedPropertyId)
  );

  const filteredTenants = tenants.filter(
    (t) => !selectedUnitId || String(t.unit_id) === String(selectedUnitId)
  );

  // Intelligente Datenübernahme bei Wechsel der Einheit
  const handleUnitChange = (unitId: string) => {
    setSelectedUnitId(unitId);
    const unit = units.find((u) => String(u.id) === String(unitId));
    if (unit) {
      if (unit.property_id) setSelectedPropertyId(String(unit.property_id));

      // Mieter zuordnen, falls dieser Einheit bereits ein Mieter zugewiesen ist
      const matchingTenant = tenants.find((t) => String(t.unit_id) === String(unitId));
      if (matchingTenant) {
        setSelectedTenantId(String(matchingTenant.id));
        applyTenantData(matchingTenant);
      }
    }
  };

  // Intelligente Datenübernahme bei Wechsel des Mieters
  const handleTenantChange = (tenantId: string) => {
    setSelectedTenantId(tenantId);
    const tenant = tenants.find((t) => String(t.id) === String(tenantId));
    if (tenant) {
      applyTenantData(tenant);

      if (tenant.unit_id) {
        setSelectedUnitId(String(tenant.unit_id));
        const unitObj = units.find((u) => String(u.id) === String(tenant.unit_id));
        if (unitObj && unitObj.property_id) {
          setSelectedPropertyId(String(unitObj.property_id));
        }
      }
    }
  };

  // Stammdaten des Mieters automatisch in Beträge und Startdatum übernehmen
  const applyTenantData = (tenant: Tenant) => {
    if (tenant.rent_amount) {
      setColdRent(String(tenant.rent_amount));
      setDeposit(String(tenant.rent_amount * 3));
    }
    if (tenant.utility_advance) {
      setUtilityCosts(String(tenant.utility_advance));
    }
    if (tenant.start_date) {
      setStartDate(tenant.start_date);
    }
  };

  const handleOpenPreview = (e: React.FormEvent) => {
    e.preventDefault();

    const prop = properties.find((p) => String(p.id) === String(selectedPropertyId));
    const unit = units.find((u) => String(u.id) === String(selectedUnitId));
    const tenant = tenants.find((t) => String(t.id) === String(selectedTenantId));
    const template = contractTemplates.find((t) => String(t.id) === String(selectedTemplateId));

    const tenantName = tenant
      ? `${tenant.first_name || ""} ${tenant.last_name || ""}`.trim()
      : "Muster-Mieter";
    const propName = prop ? prop.name || prop.address || "Objekt Koblenz" : "Objekt Koblenz";
    const propAddress = prop?.address || propName;
    const unitNumber = unit ? String(unit.unit_number || "1") : "1";

    const dataPayload: ContractPreviewData = {
      vermieterName: "Hausverwaltung Schneider",
      vermieterAdresse: prop?.address || "Musterstraße 1, 12345 Stadt",
      mieterName: tenantName,
      mieterEmail: tenant?.email || "",
      objektName: propName,
      objektAdresse: propAddress,
      einheitNr: unitNumber,
      mietbeginn: startDate,
      kaltmiete: parseFloat(coldRent) || 0,
      nebenkosten: parseFloat(utilityCosts) || 0,
      kaution: parseFloat(deposit) || 0,
      sondervereinbarungen: template ? template.content : "Keine besonderen Vereinbarungen.",
      propertyId: selectedPropertyId,
      unitId: selectedUnitId,
      tenantId: selectedTenantId,
      status: "Entwurf",
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
                Die Daten werden automatisch aus Mieter, Einheit und Objekt übernommen.
              </p>
            </div>
            <button
              onClick={onClose}
              type="button"
              className="text-slate-400 hover:text-slate-600 text-lg cursor-pointer font-bold p-1"
            >
              ✕
            </button>
          </div>

          <form onSubmit={handleOpenPreview} className="space-y-4 text-xs">
            {/* Vorlage aus Dokumente -> Vertragsmuster */}
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Vertragsmuster (aus Dokumente ➔ Vertragsmuster)
              </label>
              <select
                value={selectedTemplateId}
                onChange={(e) => setSelectedTemplateId(e.target.value)}
                className="w-full p-2.5 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 bg-white font-medium"
              >
                {contractTemplates.length === 0 ? (
                  <option value="">Standard Wohnraum-Mietvertrag (Standard 2026)</option>
                ) : (
                  contractTemplates.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.title}
                    </option>
                  ))
                )}
              </select>
            </div>

            {/* Mieter (Automatische Vorbefüllung) */}
            <div className="bg-blue-50/60 p-3 rounded-xl border border-blue-100 space-y-1">
              <label className="block font-bold text-blue-900">
                👤 Mieter auswählen (Füllt Einheit, Objekt & Miete automatisch aus)
              </label>
              <select
                value={selectedTenantId}
                onChange={(e) => handleTenantChange(e.target.value)}
                className="w-full p-2.5 border border-blue-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 bg-white font-medium text-slate-800"
                required
              >
                <option value="">-- Mieter wählen --</option>
                {filteredTenants.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.first_name} {t.last_name}{" "}
                    {t.units?.unit_number ? `(Einheit ${t.units.unit_number})` : ""}
                  </option>
                ))}
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
                    <option key={p.id} value={p.id}>
                      {p.name || p.address}
                    </option>
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
                    <option key={u.id} value={u.id}>
                      Einheit {u.unit_number || u.id}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Mietbeginn & Frist */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Mietbeginn</label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full p-2.5 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 font-medium"
                  required
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Gesetzliche Kündigungsfrist (Monate)
                </label>
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

            {/* Beträge */}
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Kaltmiete (€)</label>
                <input
                  type="number"
                  step="0.01"
                  value={coldRent}
                  onChange={(e) => {
                    const val = e.target.value;
                    setColdRent(val);
                    const num = parseFloat(val) || 0;
                    setDeposit(String(num * 3));
                  }}
                  className="w-full p-2.5 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 font-bold text-slate-800"
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Nebenkosten (€)</label>
                <input
                  type="number"
                  step="0.01"
                  value={utilityCosts}
                  onChange={(e) => setUtilityCosts(e.target.value)}
                  className="w-full p-2.5 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 font-bold text-slate-800"
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Kaution (€)</label>
                <input
                  type="number"
                  step="0.01"
                  value={deposit}
                  onChange={(e) => setDeposit(e.target.value)}
                  className="w-full p-2.5 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 font-bold text-slate-800"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl cursor-pointer transition-colors"
              >
                Abbrechen
              </button>
              <button
                type="submit"
                className="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl shadow-sm cursor-pointer transition-colors flex items-center gap-1.5"
              >
                Vertrag öffnen, anpassen & unterschreiben ➔
              </button>
            </div>
          </form>
        </div>
      </div>

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