"use client";

import React, { useState } from "react";
import { supabase } from "@/lib/supabase";
import { Property, Unit, Tenant } from "@/types";

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

  const [startDate, setStartDate] = useState(new Date().toISOString().split("T")[0]);
  const [coldRent, setColdRent] = useState("");
  const [utilityCosts, setUtilityCosts] = useState("");
  const [deposit, setDeposit] = useState("");
  const [noticePeriodMonths, setNoticePeriodMonths] = useState(3);
  const [submitting, setSubmitting] = useState(false);

  if (!isOpen) return null;

  const filteredUnits = units.filter(
    (u) => !selectedPropertyId || String(u.property_id) === String(selectedPropertyId)
  );

  const filteredTenants = tenants.filter(
    (t) => !selectedUnitId || String(t.unit_id) === String(selectedUnitId)
  );

  const handleUnitChange = (unitId: string) => {
    setSelectedUnitId(unitId);
    const unit = units.find((u) => String(u.id) === String(unitId));
    if (unit) {
      if (unit.property_id) setSelectedPropertyId(String(unit.property_id));
      if ((unit as any).cold_rent) setColdRent(String((unit as any).cold_rent || ""));
      if ((unit as any).utility_costs) setUtilityCosts(String((unit as any).utility_costs || ""));
      if ((unit as any).notice_period_months) setNoticePeriodMonths((unit as any).notice_period_months);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    const prop = properties.find((p) => String(p.id) === String(selectedPropertyId));
    const tenant = tenants.find((t) => String(t.id) === String(selectedTenantId));

    const tenantName = tenant
      ? `${tenant.first_name || ""} ${tenant.last_name || ""}`.trim()
      : "Unbekannter Mieter";

    const propAddress = prop
      ? `${prop.name || ""} ${prop.address || ""}`.trim()
      : "Unbekannte Adresse";

    try {
      // 1. Vertrag in DB anlegen
      const { error: contractErr } = await supabase.from("contracts").insert([
        {
          tenant_id: selectedTenantId || null,
          tenant_name: tenantName,
          unit_id: selectedUnitId || null,
          property_id: selectedPropertyId || null,
          property_address: propAddress,
          start_date: startDate,
          cold_rent: parseFloat(coldRent) || 0,
          utility_costs: parseFloat(utilityCosts) || 0,
          deposit: parseFloat(deposit) || 0,
          notice_period_months: Number(noticePeriodMonths),
          is_archived: false,
        },
      ]);

      if (contractErr) throw contractErr;

      // 2. Kündigungsfrist bei der Einheit hinterlegen
      if (selectedUnitId) {
        await supabase
          .from("units")
          .update({ notice_period_months: Number(noticePeriodMonths) })
          .eq("id", selectedUnitId);
      }

      onSuccess();
      onClose();
    } catch (err: any) {
      alert("Fehler beim Erstellen des Vertrags: " + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full p-6 space-y-5 border border-slate-200">
        <div className="flex justify-between items-center border-b border-slate-100 pb-3">
          <div>
            <h3 className="font-bold text-slate-900 text-base">📄 Neuen Mietvertrag erstellen</h3>
            <p className="text-slate-500 text-xs">Erfasse die Vertragsdaten für eine Einheit.</p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 text-lg">✕</button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          {/* Objekt & Einheit Auswahl */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Objekt</label>
              <select
                value={selectedPropertyId}
                onChange={(e) => {
                  setSelectedPropertyId(e.target.value);
                  setSelectedUnitId("");
                }}
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

          {/* Mieter Auswahl */}
          <div>
            <label className="block font-semibold text-slate-700 mb-1">Mieter</label>
            <select
              value={selectedTenantId}
              onChange={(e) => setSelectedTenantId(e.target.value)}
              className="w-full p-2.5 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 bg-white"
              required
            >
              <option value="">-- Mieter wählen --</option>
              {filteredTenants.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.first_name} {t.last_name}
                </option>
              ))}
            </select>
          </div>

          {/* Datum & Kündigungsfrist */}
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

          {/* Finanzen */}
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Kaltmiete (€)</label>
              <input
                type="number"
                step="0.01"
                placeholder="0.00"
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
                placeholder="0.00"
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
                placeholder="0.00"
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
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-lg"
            >
              Abbrechen
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white font-semibold rounded-lg disabled:opacity-50"
            >
              {submitting ? "Speichere..." : "Vertrag erstellen"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}