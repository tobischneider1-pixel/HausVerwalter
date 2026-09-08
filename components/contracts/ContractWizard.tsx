"use client";

import React, { useState, useRef } from "react";
import { Property, Tenant, Unit } from "@/types";
import { ContractDocument } from "./ContractDocument";

interface Props {
  properties: Property[];
  units: Unit[];
  tenants: Tenant[];
  onSave: (contractPayload: any) => Promise<void>;
  onCancel: () => void;
}

export function ContractWizard({ properties, units, tenants, onSave, onCancel }: Props) {
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [isSaving, setIsSaving] = useState(false);

  // Form State
  const [selectedTenantId, setSelectedTenantId] = useState("");
  const [templateType, setTemplateType] = useState("standard_2026");
  const [landlordName, setLandlordName] = useState("Tobias Schneider");
  const [startDate, setStartDate] = useState(new Date().toISOString().split("T")[0]);
  const [coldRent, setColdRent] = useState<number>(500);
  const [utilityAdvance, setUtilityAdvance] = useState<number>(300);
  const [deposit, setDeposit] = useState<number>(1500);
  const [signingPlace, setSigningPlace] = useState("");
  const [specialTerms, setSpecialTerms] = useState("Keine besonderen Vereinbarungen.");

  // Signatures
  const tenantCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const landlordCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isDrawingTenant, setIsDrawingTenant] = useState(false);
  const [isDrawingLandlord, setIsDrawingLandlord] = useState(false);
  const [tenantSig, setTenantSig] = useState<string | null>(null);
  const [landlordSig, setLandlordSig] = useState<string | null>(null);

  const selectedTenantObj = tenants.find((t) => String(t.id) === String(selectedTenantId));
  const selectedUnitObj = units.find((u) => String(u.id) === String(selectedTenantObj?.unit_id));
  const selectedPropertyObj = properties.find((p) => String(p.id) === String(selectedUnitObj?.property_id));

  const currentTenantName = selectedTenantObj ? `${selectedTenantObj.first_name} ${selectedTenantObj.last_name}` : "";
  const currentAddress = selectedPropertyObj?.address || "Keine Adresse angegeben";
  const currentUnit = selectedUnitObj?.unit_number ? `Einheit ${selectedUnitObj.unit_number}` : "Wohneinheit";

  const handleTenantSelect = (tenantId: string) => {
    setSelectedTenantId(tenantId);
    const tenant = tenants.find((t) => String(t.id) === String(tenantId));
    if (!tenant) return;

    const unit = units.find((u) => String(u.id) === String(tenant.unit_id));
    const property = properties.find((p) => String(p.id) === String(unit?.property_id));
    const t = tenant as any;
    const u = (unit || {}) as any;

    const cold = Number(t.base_rent ?? t.rent_cold ?? t.cold_rent ?? u.rent_cold ?? u.cold_rent ?? 500);
    const utility = Number(t.utility_advance ?? t.utility_costs ?? u.utility_advance ?? 300);

    setColdRent(cold);
    setUtilityAdvance(utility);
    setDeposit(cold * 3);

    if (property?.address) {
      const parts = property.address.split(",");
      const city = parts.length > 1 ? parts[parts.length - 1].trim().replace(/^\d+\s*/, "") : property.address;
      setSigningPlace(city);
    }
  };

  // Canvas Handlers
  const startDraw = (e: any, setDrawing: (b: boolean) => void, canvasRef: any) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    setDrawing(true);
    const ctx = canvas.getContext("2d");
    const rect = canvas.getBoundingClientRect();
    const touch = e.touches ? e.touches[0] : e;
    ctx.beginPath();
    ctx.moveTo((touch.clientX - rect.left) * (canvas.width / rect.width), (touch.clientY - rect.top) * (canvas.height / rect.height));
  };

  const draw = (e: any, isDrawing: boolean, canvasRef: any) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    const rect = canvas.getBoundingClientRect();
    const touch = e.touches ? e.touches[0] : e;
    ctx.lineTo((touch.clientX - rect.left) * (canvas.width / rect.width), (touch.clientY - rect.top) * (canvas.height / rect.height));
    ctx.strokeStyle = "#0f172a";
    ctx.lineWidth = 2.5;
    ctx.stroke();
  };

  const stopDraw = (setDrawing: (b: boolean) => void, canvasRef: any, setSig: (s: string) => void) => {
    setDrawing(false);
    if (canvasRef.current) setSig(canvasRef.current.toDataURL());
  };

  const handleFinalSave = async () => {
    setIsSaving(true);
    const payload = {
      tenant_id: selectedTenantId,
      tenant_name: currentTenantName,
      landlord_name: landlordName,
      property_address: currentAddress,
      unit_name: currentUnit,
      start_date: startDate,
      cold_rent: coldRent,
      utility_advance: utilityAdvance,
      deposit: deposit,
      special_terms: specialTerms,
      signing_place: signingPlace || "Ort nicht angegeben",
      tenant_signature: tenantSig,
      landlord_signature: landlordSig,
      status: tenantSig && landlordSig ? "signed" : "draft",
      signing_timestamp: new Date().toLocaleString("de-DE"),
    };
    await onSave(payload);
    setIsSaving(false);
  };

  return (
    <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-xs space-y-6">
      <div className="flex justify-between items-center border-b pb-4 text-xs font-semibold text-slate-400">
        <span className={step === 1 ? "text-blue-600 font-bold" : ""}>1. Mieter & Vorlage</span>
        <span>➔</span>
        <span className={step === 2 ? "text-blue-600 font-bold" : ""}>2. Parameter</span>
        <span>➔</span>
        <span className={step === 3 ? "text-blue-600 font-bold" : ""}>3. Unterschriften</span>
        <span>➔</span>
        <span className={step === 4 ? "text-blue-600 font-bold" : ""}>4. Finale</span>
      </div>

      {step === 1 && (
        <div className="space-y-4 max-w-xl mx-auto py-4">
          <div>
            <label className="font-semibold block mb-1">1. Mieter auswählen</label>
            <select
              value={selectedTenantId}
              onChange={(e) => handleTenantSelect(e.target.value)}
              className="w-full rounded-lg border p-2.5 bg-white text-xs font-medium text-slate-800"
            >
              <option value="">-- Mieter wählen --</option>
              {tenants.map((t) => (
                <option key={t.id} value={t.id}>{t.first_name} {t.last_name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="font-semibold block mb-1">2. Vertrags-Vorlage wählen</label>
            <select
              value={templateType}
              onChange={(e) => setTemplateType(e.target.value)}
              className="w-full rounded-lg border p-2.5 bg-white text-xs font-medium text-slate-800"
            >
              <option value="standard_2026">Wohnraummietvertrag Standard (Stand 2026)</option>
              <option value="index_2026">Indexmietvertrag (VPI 2026)</option>
              <option value="moebliert_2026">Mietvertrag für möblierten Wohnraum</option>
            </select>
          </div>

          <div className="pt-4 flex justify-between">
            <button onClick={onCancel} className="px-4 py-2 border rounded font-semibold bg-white hover:bg-slate-50">Abbrechen</button>
            <button
              disabled={!selectedTenantId}
              onClick={() => setStep(2)}
              className="bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white px-5 py-2 rounded-lg font-semibold"
            >
              Weiter zu Schritt 2 ➔
            </button>
          </div>
        </div>
      )}

      {step === 2 && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
            <div className="bg-slate-50 p-5 rounded-xl border border-slate-200 space-y-4">
              <h4 className="font-bold text-slate-800 text-xs uppercase tracking-wider">Schnell-Eingabe</h4>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold block mb-1">Vermieter Name</label>
                  <input type="text" value={landlordName} onChange={(e) => setLandlordName(e.target.value)} className="w-full border p-2 rounded bg-white font-medium" />
                </div>
                <div>
                  <label className="font-semibold block mb-1">Mietbeginn</label>
                  <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="w-full border p-2 rounded bg-white font-medium" />
                </div>
              </div>

              <div>
                <label className="font-semibold block mb-1 text-blue-700">✍️ Ort der Unterschrift (Freitext)</label>
                <input
                  type="text"
                  placeholder="z. B. Mayen, Berlin, Koblenz..."
                  value={signingPlace}
                  onChange={(e) => setSigningPlace(e.target.value)}
                  className="w-full border-2 border-blue-300 p-2 rounded bg-white font-bold text-slate-900"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold block mb-1">Kaltmiete (€)</label>
                  <input type="number" value={coldRent} onChange={(e) => { const v = parseFloat(e.target.value) || 0; setColdRent(v); setDeposit(v * 3); }} className="w-full border p-2 rounded bg-white font-bold" />
                </div>
                <div>
                  <label className="font-semibold block mb-1">NK-Vorauszahlung (€)</label>
                  <input type="number" value={utilityAdvance} onChange={(e) => setUtilityAdvance(parseFloat(e.target.value) || 0)} className="w-full border p-2 rounded bg-white font-bold" />
                </div>
              </div>

              <div>
                <label className="font-semibold block mb-1">Kaution (€)</label>
                <input type="number" value={deposit} onChange={(e) => setDeposit(parseFloat(e.target.value) || 0)} className="w-full border p-2 rounded bg-white font-medium" />
              </div>
            </div>

            <div>
              <ContractDocument
                landlordName={landlordName}
                tenantName={currentTenantName}
                propertyAddress={currentAddress}
                unitName={currentUnit}
                startDate={startDate}
                coldRent={coldRent}
                utilityAdvance={utilityAdvance}
                deposit={deposit}
                specialTerms={specialTerms}
                signingPlace={signingPlace}
                templateType={templateType}
                editable={true}
                onLandlordNameChange={setLandlordName}
                onSpecialTermsChange={setSpecialTerms}
              />
            </div>
          </div>

          <div className="flex justify-between pt-4 border-t">
            <button onClick={() => setStep(1)} className="px-4 py-2 border rounded font-semibold bg-white hover:bg-slate-50">← Zurück</button>
            <button onClick={() => setStep(3)} className="bg-blue-600 hover:bg-blue-500 text-white px-5 py-2 rounded-lg font-semibold">Weiter zur Unterschrift ➔</button>
          </div>
        </div>
      )}

      {step === 3 && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
            <div className="space-y-4 bg-slate-50 p-5 rounded-xl border border-slate-200">
              <div>
                <label className="font-semibold block mb-1">Unterschriftsort anpassen</label>
                <input type="text" value={signingPlace} onChange={(e) => setSigningPlace(e.target.value)} className="w-full border p-2 rounded bg-white font-medium" />
              </div>

              <div className="border p-3 rounded-xl bg-white space-y-2">
                <span className="font-bold text-slate-800 text-xs block">1. Unterschrift Mieter ({currentTenantName})</span>
                <canvas
                  ref={tenantCanvasRef}
                  width={400}
                  height={120}
                  onMouseDown={(e) => startDraw(e, setIsDrawingTenant, tenantCanvasRef)}
                  onMouseMove={(e) => draw(e, isDrawingTenant, tenantCanvasRef)}
                  onMouseUp={() => stopDraw(setIsDrawingTenant, tenantCanvasRef, setTenantSig)}
                  onTouchStart={(e) => startDraw(e, setIsDrawingTenant, tenantCanvasRef)}
                  onTouchMove={(e) => draw(e, isDrawingTenant, tenantCanvasRef)}
                  onTouchEnd={() => stopDraw(setIsDrawingTenant, tenantCanvasRef, setTenantSig)}
                  className="w-full h-[90px] bg-slate-50 rounded border cursor-crosshair touch-none"
                />
              </div>

              <div className="border p-3 rounded-xl bg-white space-y-2">
                <span className="font-bold text-slate-800 text-xs block">2. Unterschrift Vermieter ({landlordName})</span>
                <canvas
                  ref={landlordCanvasRef}
                  width={400}
                  height={120}
                  onMouseDown={(e) => startDraw(e, setIsDrawingLandlord, landlordCanvasRef)}
                  onMouseMove={(e) => draw(e, isDrawingLandlord, landlordCanvasRef)}
                  onMouseUp={() => stopDraw(setIsDrawingLandlord, landlordCanvasRef, setLandlordSig)}
                  onTouchStart={(e) => startDraw(e, setIsDrawingLandlord, landlordCanvasRef)}
                  onTouchMove={(e) => draw(e, isDrawingLandlord, landlordCanvasRef)}
                  onTouchEnd={() => stopDraw(setIsDrawingLandlord, landlordCanvasRef, setLandlordSig)}
                  className="w-full h-[90px] bg-slate-50 rounded border cursor-crosshair touch-none"
                />
              </div>
            </div>

            <div>
              <ContractDocument
                landlordName={landlordName}
                tenantName={currentTenantName}
                propertyAddress={currentAddress}
                unitName={currentUnit}
                startDate={startDate}
                coldRent={coldRent}
                utilityAdvance={utilityAdvance}
                deposit={deposit}
                specialTerms={specialTerms}
                signingPlace={signingPlace}
                tenantSignature={tenantSig}
                landlordSignature={landlordSig}
                templateType={templateType}
              />
            </div>
          </div>

          <div className="flex justify-between pt-4 border-t">
            <button onClick={() => setStep(2)} className="px-4 py-2 border rounded font-semibold bg-white hover:bg-slate-50">← Zurück</button>
            <button disabled={!tenantSig || !landlordSig} onClick={() => setStep(4)} className="disabled:opacity-50 bg-blue-600 hover:bg-blue-500 text-white px-5 py-2 rounded-lg font-semibold">
              Weiter zum Abschluss ➔
            </button>
          </div>
        </div>
      )}

      {step === 4 && (
        <div className="space-y-6 max-w-md mx-auto py-6 text-center">
          <div className="w-14 h-14 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto text-2xl font-bold">✓</div>
          <h3 className="font-bold text-slate-900 text-base">Mietvertrag final speichern</h3>
          <button
            disabled={isSaving}
            onClick={handleFinalSave}
            className="w-full bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-bold py-3 rounded-xl shadow-md text-xs"
          >
            {isSaving ? "Speichere..." : "🔒 Vertrag in Supabase speichern"}
          </button>
        </div>
      )}
    </div>
  );
}