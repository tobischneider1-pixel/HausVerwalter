"use client";

import React, { useState, useEffect, useCallback } from "react";
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

// Hilfsfunktion: Prüft flexibel alle bekannten Feldbezeichnungen für Kaltmiete, Nebenkosten & Kaution
function parseFinancials(source: any) {
  if (!source) return { cold: 0, util: 0, dep: 0 };
  const data = source.data || source.attributes || source.details || source;

  const findVal = (...keys: string[]): number => {
    for (const key of keys) {
      if (data[key] !== undefined && data[key] !== null && data[key] !== "") {
        const parsed = parseFloat(String(data[key]).replace(",", "."));
        if (!isNaN(parsed) && parsed > 0) return parsed;
      }
    }
    return 0;
  };

  const cold = findVal("cold_rent", "kaltmiete", "rent", "base_rent", "rent_amount", "monthly_rent", "net_rent");

  let util = findVal(
    "utility_costs",
    "utility_cost",
    "nebenkosten",
    "nebenkosten_vorauszahlung",
    "betriebskosten",
    "utilities",
    "additional_costs",
    "nk",
    "nk_amount",
    "nk_vorauszahlung",
    "service_charges",
    "extra_costs"
  );

  // Falls Nebenkosten nicht als eigenes Feld existieren, versuche aus Warmmiete - Kaltmiete zu berechnen
  const warm = findVal("warm_rent", "warmmiete", "total_rent", "gross_rent");
  if (!util && warm > 0 && cold > 0 && warm > cold) {
    util = warm - cold;
  }

  const dep = findVal("deposit", "kaution", "security_deposit", "deposit_amount");

  return { cold, util, dep };
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

  // 1. Beim Öffnen des Modals alle Auswahlen und Felder zurücksetzen
  useEffect(() => {
    if (isOpen) {
      setSelectedPropertyId("");
      setSelectedUnitId("");
      setSelectedTenantId("");
      setColdRent("");
      setUtilityCosts("");
      setDeposit("");
      setNoticePeriodMonths(3);
      setStartDate(new Date().toISOString().split("T")[0]);
    }
  }, [isOpen]);

  // 2. Finanzdaten ermitteln (erst synchron aus Props, dann als Fallback aus Supabase)
  const applyFinancials = useCallback(
    async (unitObj?: any, tenantObj?: any, unitId?: string, tenantId?: string) => {
      // Step A: Aus lokal vorhandenen Props extrahieren
      const unitFin = parseFinancials(unitObj);
      const tenantFin = parseFinancials(tenantObj);

      let cold = unitFin.cold || tenantFin.cold || 0;
      let util = unitFin.util || tenantFin.util || 0;
      let dep = unitFin.dep || tenantFin.dep || (cold > 0 ? cold * 3 : 0);

      // Sofort ins UI schreiben
      if (cold > 0) setColdRent(String(cold));
      if (util > 0) setUtilityCosts(String(util));
      if (dep > 0) setDeposit(String(dep));

      // Step B: Falls ein Wert noch fehlt, Supabase abfragen
      if ((!cold || !util || !dep) && (unitId || tenantId)) {
        try {
          let dbUnitFin = { cold: 0, util: 0, dep: 0 };
          let dbTenantFin = { cold: 0, util: 0, dep: 0 };

          if (unitId) {
            const { data } = await supabase.from("units").select("*").eq("id", unitId).maybeSingle();
            if (data) dbUnitFin = parseFinancials(data);
          }

          if (tenantId) {
            const { data } = await supabase.from("tenants").select("*").eq("id", tenantId).maybeSingle();
            if (data) dbTenantFin = parseFinancials(data);
          }

          if (!cold) cold = dbUnitFin.cold || dbTenantFin.cold || 0;
          if (!util) util = dbUnitFin.util || dbTenantFin.util || 0;
          if (!dep) dep = dbUnitFin.dep || dbTenantFin.dep || (cold > 0 ? cold * 3 : 0);

          if (cold > 0) setColdRent(String(cold));
          if (util > 0) setUtilityCosts(String(util));
          if (dep > 0) setDeposit(String(dep));
        } catch (err) {
          console.error("Fehler beim Laden der Finanzdaten:", err);
        }
      }
    },
    []
  );

  if (!isOpen) return null;

  // Filter für Dropdowns
  const filteredUnits = units.filter(
    (u) => !selectedPropertyId || String(u.property_id) === String(selectedPropertyId)
  );

  const filteredTenants = tenants.filter(
    (t) => !selectedUnitId || String(t.unit_id) === String(selectedUnitId)
  );

  // Handler: Objekt geändert
  const handlePropertyChange = (propertyId: string) => {
    setSelectedPropertyId(propertyId);
    setSelectedUnitId("");
    setSelectedTenantId("");
    setColdRent("");
    setUtilityCosts("");
    setDeposit("");
  };

  // Handler: Einheit geändert
  const handleUnitChange = async (unitId: string) => {
    setSelectedUnitId(unitId);

    if (!unitId) {
      setColdRent("");
      setUtilityCosts("");
      setDeposit("");
      return;
    }

    const unit = units.find((u) => String(u.id) === String(unitId));

    if (unit) {
      if (unit.property_id) setSelectedPropertyId(String(unit.property_id));
      if ((unit as any).notice_period_months) setNoticePeriodMonths((unit as any).notice_period_months);

      const matchingTenant = tenants.find((t) => String(t.unit_id) === String(unitId));
      const tenantIdToUse = matchingTenant ? String(matchingTenant.id) : selectedTenantId;
      if (matchingTenant) setSelectedTenantId(tenantIdToUse);

      await applyFinancials(unit, matchingTenant, unitId, tenantIdToUse);
    }
  };

  // Handler: Mieter geändert
  const handleTenantChange = async (tenantId: string) => {
    setSelectedTenantId(tenantId);

    if (!tenantId) return;

    const tenant = tenants.find((t) => String(t.id) === String(tenantId));

    let unitIdToUse = selectedUnitId;
    let unitObj = units.find((u) => String(u.id) === String(unitIdToUse));

    if (tenant && tenant.unit_id) {
      unitIdToUse = String(tenant.unit_id);
      setSelectedUnitId(unitIdToUse);

      unitObj = units.find((u) => String(u.id) === unitIdToUse);
      if (unitObj && unitObj.property_id) {
        setSelectedPropertyId(String(unitObj.property_id));
      }
    }

    await applyFinancials(unitObj, tenant, unitIdToUse, tenantId);
  };

  // Kaltmiete manuell anpassen -> berechnet Kaution als 3x Kaltmiete voraus
  const handleColdRentChange = (val: string) => {
    setColdRent(val);
    const parsedCold = parseFloat(val);
    if (!isNaN(parsedCold) && parsedCold > 0) {
      setDeposit(String(parsedCold * 3));
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

    const numCold = parseFloat(coldRent) || 0;
    const numUtil = parseFloat(utilityCosts) || 0;
    const numDep = parseFloat(deposit) || 0;

    try {
      // 1. Mietvertrag in Supabase anlegen
      const { error: contractErr } = await supabase.from("contracts").insert([
        {
          tenant_id: selectedTenantId || null,
          tenant_name: tenantName,
          unit_id: selectedUnitId || null,
          property_id: selectedPropertyId || null,
          property_address: propAddress,
          start_date: startDate,
          cold_rent: numCold,
          utility_costs: numUtil,
          deposit: numDep,
          notice_period_months: Number(noticePeriodMonths),
          is_archived: false,
        },
      ]);

      if (contractErr) throw contractErr;

      // 2. Kündigungsfrist bei der Einheit aktualisieren
      if (selectedUnitId) {
        await supabase
          .from("units")
          .update({ notice_period_months: Number(noticePeriodMonths) })
          .eq("id", selectedUnitId);
      }

      // 3. Mieter-Stammdaten mit Mietpreisen synchronisieren
      if (selectedTenantId) {
        await supabase
          .from("tenants")
          .update({
            cold_rent: numCold,
            rent: numCold,
            utility_costs: numUtil,
            nebenkosten: numUtil,
            deposit: numDep,
            kaution: numDep,
            move_in_date: startDate,
          })
          .eq("id", selectedTenantId);
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
          {/* Objekt & Einheit */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Objekt</label>
              <select
                value={selectedPropertyId}
                onChange={(e) => handlePropertyChange(e.target.value)}
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
                onChange={(e) => handleColdRentChange(e.target.value)}
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