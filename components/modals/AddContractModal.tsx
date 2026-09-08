"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/lib/supabase";
import { Property, Unit, Tenant } from "@/types";

interface ContractTemplate {
  id: string;
  title: string;
  content: string;
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  properties: Property[];
  units: Unit[];
  tenants: Tenant[];
}

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

  const cold = findVal("cold_rent", "kaltmiete", "rent", "base_rent", "rent_amount", "monthly_rent");
  let util = findVal(
    "utility_costs",
    "utility_cost",
    "nebenkosten",
    "nebenkosten_vorauszahlung",
    "betriebskosten",
    "utilities",
    "additional_costs",
    "nk"
  );

  const warm = findVal("warm_rent", "warmmiete", "total_rent");
  if (!util && warm > 0 && cold > 0 && warm > cold) {
    util = warm - cold;
  }

  const dep = findVal("deposit", "kaution", "security_deposit");

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
  const [step, setStep] = useState<1 | 2>(1);

  const [selectedPropertyId, setSelectedPropertyId] = useState("");
  const [selectedUnitId, setSelectedUnitId] = useState("");
  const [selectedTenantId, setSelectedTenantId] = useState("");

  const [templates, setTemplates] = useState<ContractTemplate[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState("");
  const [customContractText, setCustomContractText] = useState("");

  const [startDate, setStartDate] = useState(new Date().toISOString().split("T")[0]);
  const [coldRent, setColdRent] = useState("");
  const [utilityCosts, setUtilityCosts] = useState("");
  const [deposit, setDeposit] = useState("");
  const [noticePeriodMonths, setNoticePeriodMonths] = useState(3);

  const [createdContractId, setCreatedContractId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasSignature, setHasSignature] = useState(false);

  // 1. Vertragsmuster aus der "documents" Tabelle in Supabase laden
  useEffect(() => {
    if (isOpen) {
      setStep(1);
      setSelectedPropertyId("");
      setSelectedUnitId("");
      setSelectedTenantId("");
      setColdRent("");
      setUtilityCosts("");
      setDeposit("");
      setNoticePeriodMonths(3);
      setStartDate(new Date().toISOString().split("T")[0]);
      setCreatedContractId(null);
      setHasSignature(false);

      const loadTemplates = async () => {
        try {
          const { data, error } = await supabase
            .from("documents")
            .select("id, title, content")
            .or("category.eq.Mietvertrag,category.eq.Vorlagen,type.eq.template");

          if (!error && data && data.length > 0) {
            setTemplates(data as ContractTemplate[]);
            setSelectedTemplateId(data[0].id);
            setCustomContractText(data[0].content || getDefaultTemplateText());
          } else {
            const defaultList: ContractTemplate[] = [
              {
                id: "standard",
                title: "Standard-Wohnraummietvertrag",
                content: getDefaultTemplateText(),
              },
              {
                id: "staffel",
                title: "Mietvertrag mit Staffelmiete",
                content: "§ 1 Mietobjekt & Parteien...\n§ 2 Vereinbarung zur Staffelmiete...\n§ 3 Sondervereinbarung...",
              },
            ];
            setTemplates(defaultList);
            setSelectedTemplateId("standard");
            setCustomContractText(defaultList[0].content);
          }
        } catch {
          setCustomContractText(getDefaultTemplateText());
        }
      };

      loadTemplates();
    }
  }, [isOpen]);

  function getDefaultTemplateText() {
    return `MIETVERTRAG FOR WOHNRAUM
-----------------------------------
Mietobjekt: {OBJEKT_ADRESSE}, Einheit {EINHEIT_NR}
Mieter: {MIETER_NAME}

1. MIETBEGINN & DAUER
Der Mietvertrag beginnt am {MIETBEGINN}. Die Kündigungsfrist beträgt {KUENDIGUNGSFRIST} Monate.

2. MIETE UND NEBENKOSTEN
- Kaltmiete: {KALTMITE} €
- Nebenkostenvorauszahlung: {NEBENKOSTEN} €
- Kaution: {KAUTION} €

3. SONDERVEREINBARUNGEN / INDIVIDUELLE KLAUSELN:
(Hier können individuelle Ergänzungen eingetragen werden)`;
  }

  // Platzhalter dynamisch im Vertragstext ersetzen
  const updateTemplatePlaceholders = useCallback(() => {
    const prop = properties.find((p) => String(p.id) === String(selectedPropertyId));
    const tenant = tenants.find((t) => String(t.id) === String(selectedTenantId));
    const unit = units.find((u) => String(u.id) === String(selectedUnitId));

    let updatedText = customContractText;
    if (tenant) updatedText = updatedText.replaceAll("{MIETER_NAME}", `${tenant.first_name || ""} ${tenant.last_name || ""}`.trim());
    if (prop) updatedText = updatedText.replaceAll("{OBJEKT_ADRESSE}", prop.name || prop.address || "");
    if (unit) updatedText = updatedText.replaceAll("{EINHEIT_NR}", String(unit.unit_number || unit.id));
    if (startDate) updatedText = updatedText.replaceAll("{MIETBEGINN}", startDate);
    if (noticePeriodMonths) updatedText = updatedText.replaceAll("{KUENDIGUNGSFRIST}", String(noticePeriodMonths));
    if (coldRent) updatedText = updatedText.replaceAll("{KALTMITE}", coldRent);
    if (utilityCosts) updatedText = updatedText.replaceAll("{NEBENKOSTEN}", utilityCosts);
    if (deposit) updatedText = updatedText.replaceAll("{KAUTION}", deposit);

    setCustomContractText(updatedText);
  }, [selectedPropertyId, selectedTenantId, selectedUnitId, startDate, noticePeriodMonths, coldRent, utilityCosts, deposit, properties, tenants, units]);

  const applyFinancials = useCallback(
    async (unitObj?: any, tenantObj?: any, unitId?: string, tenantId?: string) => {
      const unitFin = parseFinancials(unitObj);
      const tenantFin = parseFinancials(tenantObj);

      let cold = unitFin.cold || tenantFin.cold || 0;
      let util = unitFin.util || tenantFin.util || 0;
      let dep = unitFin.dep || tenantFin.dep || (cold > 0 ? cold * 3 : 0);

      if (cold > 0) setColdRent(String(cold));
      if (util > 0) setUtilityCosts(String(util));
      if (dep > 0) setDeposit(String(dep));

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
          console.error(err);
        }
      }
    },
    []
  );

  if (!isOpen) return null;

  const filteredUnits = units.filter(
    (u) => !selectedPropertyId || String(u.property_id) === String(selectedPropertyId)
  );
  const filteredTenants = tenants.filter(
    (t) => !selectedUnitId || String(t.unit_id) === String(selectedUnitId)
  );

  const handlePropertyChange = (propertyId: string) => {
    setSelectedPropertyId(propertyId);
    setSelectedUnitId("");
    setSelectedTenantId("");
  };

  const handleUnitChange = async (unitId: string) => {
    setSelectedUnitId(unitId);
    if (!unitId) return;

    const unit = units.find((u) => String(u.id) === String(unitId));
    if (unit) {
      if (unit.property_id) setSelectedPropertyId(String(unit.property_id));
      const matchingTenant = tenants.find((t) => String(t.unit_id) === String(unitId));
      const tenantIdToUse = matchingTenant ? String(matchingTenant.id) : selectedTenantId;
      if (matchingTenant) setSelectedTenantId(tenantIdToUse);
      await applyFinancials(unit, matchingTenant, unitId, tenantIdToUse);
    }
  };

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
      if (unitObj && unitObj.property_id) setSelectedPropertyId(String(unitObj.property_id));
    }

    await applyFinancials(unitObj, tenant, unitIdToUse, tenantId);
  };

  const handleTemplateChange = (tmplId: string) => {
    setSelectedTemplateId(tmplId);
    const tmpl = templates.find((t) => String(t.id) === String(tmplId));
    if (tmpl && tmpl.content) {
      setCustomContractText(tmpl.content);
    }
  };

  // Erstellen ohne nicht-existierende Datenbank-Spalten
  const handleCreateContract = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    const prop = properties.find((p) => String(p.id) === String(selectedPropertyId));
    const tenant = tenants.find((t) => String(t.id) === String(selectedTenantId));

    const tenantName = tenant
      ? `${tenant.first_name || ""} ${tenant.last_name || ""}`.trim()
      : "Unbekannter Mieter";

    const propAddress = prop ? `${prop.name || ""} ${prop.address || ""}`.trim() : "Unbekannte Adresse";

    const numCold = parseFloat(coldRent) || 0;
    const numUtil = parseFloat(utilityCosts) || 0;
    const numDep = parseFloat(deposit) || 0;

    try {
      // Nur Standard-Felder senden, um DB Schema Cache Fehler zu vermeiden
      const contractPayload: any = {
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
      };

      const { data: newContract, error: contractErr } = await supabase
        .from("contracts")
        .insert([contractPayload])
        .select()
        .single();

      if (contractErr) throw contractErr;

      // 2. Dokument / Vertragstext in der Tabelle "documents" ablegen (Damit es unter Dokumente sichtbar ist)
      await supabase.from("documents").insert([
        {
          title: `Mietvertrag - ${tenantName} (${propAddress})`,
          category: "Mietverträge",
          content: customContractText,
          property_id: selectedPropertyId || null,
          tenant_id: selectedTenantId || null,
          created_at: new Date().toISOString(),
        },
      ]);

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

      setCreatedContractId(newContract.id);
      setStep(2);
    } catch (err: any) {
      alert("Fehler beim Erstellen des Vertrags: " + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  // Canvas Unterschrift
  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    setIsDrawing(true);
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const clientX = "touches" in e ? e.touches[0].clientX : e.clientX;
    const clientY = "touches" in e ? e.touches[0].clientY : e.clientY;

    ctx.beginPath();
    ctx.moveTo(clientX - rect.left, clientY - rect.top);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const clientX = "touches" in e ? e.touches[0].clientX : e.clientX;
    const clientY = "touches" in e ? e.touches[0].clientY : e.clientY;

    ctx.lineWidth = 2;
    ctx.lineCap = "round";
    ctx.strokeStyle = "#000000";

    ctx.lineTo(clientX - rect.left, clientY - rect.top);
    ctx.stroke();
    setHasSignature(true);
  };

  const clearSignature = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (ctx) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      setHasSignature(false);
    }
  };

  const handleSaveSignature = async () => {
    if (!createdContractId || !hasSignature) return;
    setSubmitting(true);

    try {
      const canvas = canvasRef.current;
      const signatureDataUrl = canvas ? canvas.toDataURL("image/png") : null;

      await supabase
        .from("contracts")
        .update({
          signature_data: signatureDataUrl,
          signed_at: new Date().toISOString(),
          status: "Aktiv / Unterschrieben",
        })
        .eq("id", createdContractId);

      onSuccess();
      onClose();
    } catch (err: any) {
      alert("Fehler beim Speichern der Unterschrift: " + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full p-6 space-y-4 border border-slate-200 max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center border-b border-slate-100 pb-3">
          <div>
            <h3 className="font-bold text-slate-900 text-base">
              {step === 1 ? "📄 Neuen Mietvertrag erstellen" : "✍️ Digitale Unterschrift"}
            </h3>
            <p className="text-slate-500 text-xs">
              {step === 1
                ? "Wähle ein Vertragsmuster aus Dokumente und passe Freitexte bei Bedarf an."
                : "Bitte hier für den Mietvertrag unterschreiben."}
            </p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 text-lg">✕</button>
        </div>

        {step === 1 && (
          <form onSubmit={handleCreateContract} className="space-y-4 text-xs">
            {/* Vorlage wählen */}
            <div className="flex justify-between items-end gap-2">
              <div className="flex-1">
                <label className="block font-semibold text-slate-700 mb-1">Vertragsmuster / Vorlage (aus Dokumente)</label>
                <select
                  value={selectedTemplateId}
                  onChange={(e) => handleTemplateChange(e.target.value)}
                  className="w-full p-2.5 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 bg-white font-medium"
                >
                  {templates.map((tmpl) => (
                    <option key={tmpl.id} value={tmpl.id}>
                      📄 {tmpl.title}
                    </option>
                  ))}
                </select>
              </div>
              <button
                type="button"
                onClick={updateTemplatePlaceholders}
                className="px-3 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-lg text-xs"
                title="Ersetzt {MIETER_NAME}, {KALTMITE} etc. im Text"
              >
                🔄 Werte einsetzen
              </button>
            </div>

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

            {/* Mieten */}
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

            {/* Individualisierbarer Vertragstext / Vorlage bearbeiten */}
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Vertragstext / Individuelle Klauseln & Ergänzungen bearbeiten
              </label>
              <textarea
                rows={6}
                value={customContractText}
                onChange={(e) => setCustomContractText(e.target.value)}
                className="w-full p-3 border border-slate-300 rounded-lg font-mono text-xs outline-none focus:ring-2 focus:ring-blue-500 bg-slate-50"
                placeholder="Hier steht der Vertragstext. Du kannst ihn direkt hier für diesen Vertrag bearbeiten..."
              />
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
                {submitting ? "Erstelle..." : "Vertrag erstellen & Unterschreiben ➔"}
              </button>
            </div>
          </form>
        )}

        {/* SCHRITT 2: Digitale Unterschrift */}
        {step === 2 && (
          <div className="space-y-4 text-xs">
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-900">
              <p className="font-semibold">✓ Vertrag & Dokument wurden angelegt!</p>
              <p className="text-slate-600 mt-1">
                Leiste hier die digitale Unterschrift. Das fertige Dokument wird direkt unter Dokumente archiviert.
              </p>
            </div>

            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="font-semibold text-slate-700">Unterschrift-Feld</label>
                <button type="button" onClick={clearSignature} className="text-red-500 hover:underline text-xs">
                  Zurücksetzen
                </button>
              </div>

              <div className="border-2 border-dashed border-slate-300 rounded-xl bg-slate-50 overflow-hidden touch-none">
                <canvas
                  ref={canvasRef}
                  width={550}
                  height={160}
                  onMouseDown={startDrawing}
                  onMouseMove={draw}
                  onMouseUp={() => setIsDrawing(false)}
                  onMouseLeave={() => setIsDrawing(false)}
                  onTouchStart={startDrawing}
                  onTouchMove={draw}
                  onTouchEnd={() => setIsDrawing(false)}
                  className="w-full h-40 cursor-crosshair bg-white"
                />
              </div>
            </div>

            <div className="flex justify-between items-center pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => {
                  onSuccess();
                  onClose();
                }}
                className="px-3 py-2 text-slate-500 hover:text-slate-700 font-medium"
              >
                Später unterschreiben
              </button>

              <button
                type="button"
                onClick={handleSaveSignature}
                disabled={!hasSignature || submitting}
                className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold rounded-lg disabled:opacity-50"
              >
                {submitting ? "Speichere..." : "Digital unterschreiben ✓"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}