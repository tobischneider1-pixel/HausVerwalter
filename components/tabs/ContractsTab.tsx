"use client";

import React, { useState, useEffect, useRef } from "react";
import { supabase } from "@/lib/supabase";
import { Property, Tenant, Unit } from "@/types";

interface Props {
  properties?: Property[];
  units?: Unit[];
  tenants?: Tenant[];
  onRefresh?: () => void;
}

interface Contract {
  id: string;
  tenant_id: string;
  tenant_name: string;
  landlord_name: string;
  property_address: string;
  unit_name: string;
  start_date: string;
  cold_rent: number;
  utility_advance: number;
  deposit: number;
  special_terms: string;
  status: "draft" | "signed";
  tenant_signature?: string;
  landlord_signature?: string;
  signing_place?: string;
  signing_timestamp?: string;
  created_at?: string;
}

export function ContractsTab({ properties = [], units = [], tenants = [], onRefresh }: Props) {
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [loading, setLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Navigation & Ansichten
  const [view, setView] = useState<"folder" | "wizard">("folder");
  const [wizardStep, setWizardStep] = useState<1 | 2 | 3 | 4>(1);
  const [previewContract, setPreviewContract] = useState<Contract | null>(null);

  // Formular-Daten
  const [selectedTenantId, setSelectedTenantId] = useState("");
  const [landlordName, setLandlordName] = useState("Tobias Schneider");
  const [startDate, setStartDate] = useState(new Date().toISOString().split("T")[0]);
  const [coldRent, setColdRent] = useState<number>(1000);
  const [utilityAdvance, setUtilityAdvance] = useState<number>(300);
  const [deposit, setDeposit] = useState<number>(3000);
  const [specialTerms, setSpecialTerms] = useState("Keine besonderen Vereinbarungen.");
  const [signingPlace, setSigningPlace] = useState("Frankfurt am Main");

  // Bearbeitbare Vertragstexte
  const [paragraph1, setParagraph1] = useState("Der Vermieter vermietet dem Mieter die oben genannte Wohneinheit ausschließlich zu Wohnzwecken.");
  const [paragraph2, setParagraph2] = useState("Das Mietverhältnis beginnt am oben genannten Datum und wird auf unbestimmte Zeit geschlossen.");

  // Canvas Refs für digitale Unterschriften
  const tenantCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isDrawingTenant, setIsDrawingTenant] = useState(false);
  const [tenantSig, setTenantSig] = useState<string | null>(null);

  const landlordCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isDrawingLandlord, setIsDrawingLandlord] = useState(false);
  const [landlordSig, setLandlordSig] = useState<string | null>(null);

  const fetchContracts = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.from("contracts").select("*").order("created_at", { ascending: false });
      if (error) console.warn("Hinweis beim Laden der Verträge:", error.message);
      if (data) setContracts(data);
    } catch (err) {
      console.error("Fetch Error:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchContracts();
  }, []);

  const resetForm = () => {
    setSelectedTenantId("");
    setLandlordName("Tobias Schneider");
    setStartDate(new Date().toISOString().split("T")[0]);
    setColdRent(1000);
    setUtilityAdvance(300);
    setDeposit(3000);
    setSpecialTerms("Keine besonderen Vereinbarungen.");
    setParagraph1("Der Vermieter vermietet dem Mieter die oben genannte Wohneinheit ausschließlich zu Wohnzwecken.");
    setParagraph2("Das Mietverhältnis beginnt am oben genannten Datum und wird auf unbestimmte Zeit geschlossen.");
    setTenantSig(null);
    setLandlordSig(null);
  };

  const handleTenantSelect = (tenantId: string) => {
    setSelectedTenantId(tenantId);
    
    const tenant = tenants.find((t) => String(t.id) === String(tenantId));
    if (!tenant) return;

    const unit = units.find((u) => String(u.id) === String(tenant.unit_id));

    const t = tenant as any;
    const u = (unit || {}) as any;

    const utility = Number(
      t.utility_advance ?? t.utility_costs ?? t.nebenkosten ?? u.utility_advance ?? 300
    );

    let cold = Number(
      t.base_rent ?? t.rent_cold ?? t.cold_rent ?? t.kaltmiete ?? t.net_rent ??
      u.rent_cold ?? u.cold_rent ?? u.base_rent ?? u.kaltmiete ?? u.rent ?? 0
    );

    if (cold === 0) {
      const totalRent = Number(t.warm_rent ?? t.total_rent ?? t.rent ?? u.warm_rent ?? 0);
      if (totalRent > utility) cold = totalRent - utility;
    }

    const finalCold = cold > 0 ? cold : 1000;

    setColdRent(finalCold);
    setUtilityAdvance(utility);
    setDeposit(finalCold * 3);
  };

  // 精准 Signature Canvas Helpers mit Skalierung (Kein XXL / Blur mehr)
  const getCanvasCoords = (e: any, canvas: HTMLCanvasElement) => {
    const rect = canvas.getBoundingClientRect();
    const touch = e.touches && e.touches.length > 0 ? e.touches[0] : null;
    const clientX = touch ? touch.clientX : e.clientX;
    const clientY = touch ? touch.clientY : e.clientY;

    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    return {
      x: (clientX - rect.left) * scaleX,
      y: (clientY - rect.top) * scaleY,
    };
  };

  const startDraw = (e: any, setDrawing: (b: boolean) => void, canvasRef: any) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    setDrawing(true);
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const coords = getCanvasCoords(e, canvas);
    ctx.beginPath();
    ctx.moveTo(coords.x, coords.y);
  };

  const draw = (e: any, isDrawing: boolean, canvasRef: any) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const coords = getCanvasCoords(e, canvas);
    ctx.lineTo(coords.x, coords.y);
    ctx.strokeStyle = "#0f172a";
    ctx.lineWidth = 2.5;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.stroke();
  };

  const stopDraw = (setDrawing: (b: boolean) => void, canvasRef: any, setSig: (s: string) => void) => {
    setDrawing(false);
    if (canvasRef.current) setSig(canvasRef.current.toDataURL());
  };

  const clearCanvas = (canvasRef: any, setSig: (s: string | null) => void) => {
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext("2d");
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
    setSig(null);
  };

  // Speichern mit genauer Fehlerbehandlung
  const handleFinalizeContract = async () => {
    setIsSaving(true);
    try {
      const tenant = tenants.find((t) => String(t.id) === String(selectedTenantId));
      const unit = units.find((u) => String(u.id) === String(tenant?.unit_id));
      const property = properties.find((p) => String(p.id) === String(unit?.property_id));
      const timestamp = new Date().toLocaleString("de-DE", { dateStyle: "medium", timeStyle: "short" });

      const newContractPayload = {
        tenant_id: selectedTenantId || null,
        tenant_name: tenant ? `${tenant.first_name} ${tenant.last_name}` : "Emre Mercan",
        landlord_name: landlordName,
        property_address: property?.address || "Mainzer Str. 36",
        unit_name: unit?.unit_number ? `Einheit ${unit.unit_number}` : "WE 1 - UG links",
        start_date: startDate,
        cold_rent: Number(coldRent),
        utility_advance: Number(utilityAdvance),
        deposit: Number(deposit),
        special_terms: specialTerms,
        status: tenantSig && landlordSig ? "signed" : "draft",
        tenant_signature: tenantSig || null,
        landlord_signature: landlordSig || null,
        signing_place: signingPlace,
        signing_timestamp: timestamp,
      };

      const { data, error } = await supabase.from("contracts").insert([newContractPayload]).select();

      if (error) {
        console.error("Supabase Error Details:", error);
        alert(`Fehler beim Speichern in Supabase:\n${error.message}\n\nHinweis: Bitte führe das bereitgestellte SQL-Skript im Supabase SQL Editor aus.`);
      } else {
        alert(" Vertrages erfolgreich gespeichert und versiegelt!");
        
        if (selectedTenantId) {
          await supabase.from("tenants").update({ utility_advance: utilityAdvance, rent: coldRent }).eq("id", selectedTenantId);
        }

        if (onRefresh) onRefresh();
        await fetchContracts();
        setView("folder");
        resetForm();
      }
    } catch (err: any) {
      console.error("System Error:", err);
      alert("Fehler beim Speichern: " + err.message);
    } finally {
      setIsSaving(false);
    }
  };

  const selectedTenantObj = tenants.find((t) => String(t.id) === String(selectedTenantId));
  const selectedUnitObj = units.find((u) => String(u.id) === String(selectedTenantObj?.unit_id));
  const selectedPropertyObj = properties.find((p) => String(p.id) === String(selectedUnitObj?.property_id));

  const currentTenantName = selectedTenantObj ? `${selectedTenantObj.first_name} ${selectedTenantObj.last_name}` : "Emre Mercan";
  const currentAddress = selectedPropertyObj?.address || "Mainzer Str. 36";
  const currentUnit = selectedUnitObj?.unit_number ? `Einheit ${selectedUnitObj.unit_number}` : "WE 1 - UG links";

  // Vorschau & bearbeitbares Dokument
  const renderContractDocument = (editable = true, customSigTenant?: string | null, customSigLandlord?: string | null) => {
    const tSig = customSigTenant !== undefined ? customSigTenant : tenantSig;
    const lSig = customSigLandlord !== undefined ? customSigLandlord : landlordSig;

    return (
      <div className="bg-white p-8 rounded-lg shadow-md border border-slate-300 font-serif text-slate-800 text-xs leading-relaxed space-y-4 max-w-2xl mx-auto relative">
        {editable && (
          <div className="no-print bg-amber-50 border border-amber-200 text-amber-800 p-2 rounded text-[11px] font-sans flex items-center justify-between mb-2">
            <span>✏️ <strong>Tipp:</strong> Klicke direkt in die Textfelder, um den Inhalt anzupassen.</span>
          </div>
        )}

        <div className="border-b-2 border-slate-900 pb-3 text-center">
          <h2 className="text-base font-bold uppercase tracking-wider font-sans text-slate-900">Wohnraum-Mietvertrag</h2>
          <p className="text-[10px] text-slate-500 font-sans mt-0.5">Rechtsgültiges Dokument</p>
        </div>

        {/* Parteien */}
        <div className="grid grid-cols-2 gap-4 bg-slate-50 p-3 rounded border border-slate-200 font-sans text-[11px]">
          <div>
            <span className="font-bold text-slate-500 uppercase block text-[9px]">Vermieter</span>
            {editable ? (
              <input
                type="text"
                value={landlordName}
                onChange={(e) => setLandlordName(e.target.value)}
                className="font-semibold text-slate-900 border-b border-dashed border-slate-400 bg-transparent w-full focus:outline-none"
              />
            ) : (
              <p className="font-semibold text-slate-900">{landlordName}</p>
            )}
          </div>
          <div>
            <span className="font-bold text-slate-500 uppercase block text-[9px]">Mieter</span>
            <p className="font-semibold text-slate-900">{currentTenantName}</p>
          </div>
        </div>

        {/* Paragraphen */}
        <div className="space-y-3 font-serif">
          <div>
            <h4 className="font-bold font-sans text-slate-900 text-xs border-b pb-0.5 mb-1">§ 1 Mietgegenstand & Objekt</h4>
            <p className="mb-1">
              Mietobjekt: <strong>{currentAddress}</strong> ({currentUnit}).
            </p>
            {editable ? (
              <textarea
                value={paragraph1}
                onChange={(e) => setParagraph1(e.target.value)}
                className="w-full text-xs font-serif p-1 border border-amber-200 bg-amber-50/30 rounded focus:bg-white focus:outline-none"
                rows={2}
              />
            ) : (
              <p>{paragraph1}</p>
            )}
          </div>

          <div>
            <h4 className="font-bold font-sans text-slate-900 text-xs border-b pb-0.5 mb-1">§ 2 Mietbeginn & Dauer</h4>
            <p className="mb-1">
              Mietbeginn: <strong>{startDate}</strong>
            </p>
            {editable ? (
              <textarea
                value={paragraph2}
                onChange={(e) => setParagraph2(e.target.value)}
                className="w-full text-xs font-serif p-1 border border-amber-200 bg-amber-50/30 rounded focus:bg-white focus:outline-none"
                rows={2}
              />
            ) : (
              <p>{paragraph2}</p>
            )}
          </div>

          <div>
            <h4 className="font-bold font-sans text-slate-900 text-xs border-b pb-0.5 mb-1">§ 3 Miete & Nebenkosten</h4>
            <div className="my-1 font-sans text-[11px] grid grid-cols-3 gap-2 bg-slate-50 p-2 rounded border">
              <div>Kaltmiete: <strong>{coldRent} €</strong></div>
              <div>NK-Vorschuss: <strong>{utilityAdvance} €</strong></div>
              <div className="font-bold text-slate-900">Gesamt: <strong>{coldRent + utilityAdvance} €</strong></div>
            </div>
          </div>

          <div>
            <h4 className="font-bold font-sans text-slate-900 text-xs border-b pb-0.5 mb-1">§ 4 Mietkaution</h4>
            <p>Die Kautionshöhe beträgt <strong>{deposit} €</strong>.</p>
          </div>

          <div>
            <h4 className="font-bold font-sans text-slate-900 text-xs border-b pb-0.5 mb-1">§ 5 Sondervereinbarungen</h4>
            {editable ? (
              <textarea
                value={specialTerms}
                onChange={(e) => setSpecialTerms(e.target.value)}
                className="w-full text-xs font-serif p-1.5 border border-amber-200 bg-amber-50/40 rounded focus:bg-white focus:outline-none"
                rows={3}
                placeholder="Hier Zusatzvereinbarungen eintragen..."
              />
            ) : (
              <p className="italic bg-amber-50/60 p-2 rounded border border-amber-100">{specialTerms}</p>
            )}
          </div>
        </div>

        {/* Unterschriftenzeile */}
        <div className="pt-4 border-t border-slate-300 font-sans space-y-3">
          <div className="text-[10px] text-slate-500 flex justify-between">
            <span>Ort: <strong>{signingPlace}</strong></span>
            <span>Datum: <strong>{new Date().toLocaleDateString("de-DE")}</strong></span>
          </div>

          <div className="grid grid-cols-2 gap-6 pt-2">
            <div className="border-t border-slate-400 pt-1 text-center">
              {tSig ? (
                <img src={tSig} alt="Unterschrift Mieter" className="h-10 mx-auto object-contain mb-1" />
              ) : (
                <div className="h-10 flex items-center justify-center text-slate-300 italic text-[10px]">Unterschrift Mieter ausstehend</div>
              )}
              <p className="font-bold text-[11px] text-slate-800">Unterschrift Mieter</p>
              <p className="text-[9px] text-slate-500">{currentTenantName}</p>
            </div>

            <div className="border-t border-slate-400 pt-1 text-center">
              {lSig ? (
                <img src={lSig} alt="Unterschrift Vermieter" className="h-10 mx-auto object-contain mb-1" />
              ) : (
                <div className="h-10 flex items-center justify-center text-slate-300 italic text-[10px]">Unterschrift Vermieter ausstehend</div>
              )}
              <p className="font-bold text-[11px] text-slate-800">Unterschrift Vermieter</p>
              <p className="text-[9px] text-slate-500">{landlordName}</p>
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="p-6 space-y-6 text-xs text-slate-700">
      <style>{`
        @media print {
          body * { visibility: hidden; }
          #printable-document, #printable-document * { visibility: visible; }
          #printable-document { position: absolute; left: 0; top: 0; width: 100%; padding: 20px; }
          .no-print { display: none !important; }
        }
      `}</style>

      {/* PopUp für A4 Druck */}
      {previewContract && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-xl shadow-2xl max-w-3xl w-full max-h-[90vh] flex flex-col">
            <div className="p-4 border-b border-slate-200 flex justify-between items-center bg-slate-50 rounded-t-xl no-print">
              <h3 className="font-bold text-slate-800 text-sm">📄 Mietvertrags-Dokument</h3>
              <div className="flex gap-2">
                <button
                  onClick={() => window.print()}
                  className="bg-blue-600 hover:bg-blue-500 text-white font-semibold px-4 py-1.5 rounded-lg text-xs flex items-center gap-1 shadow-xs"
                >
                  🖨️ Drucken / Als PDF
                </button>
                <button
                  onClick={() => setPreviewContract(null)}
                  className="bg-slate-200 hover:bg-slate-300 text-slate-700 font-semibold px-3 py-1.5 rounded-lg text-xs"
                >
                  Schließen
                </button>
              </div>
            </div>

            <div id="printable-document" className="p-6 overflow-y-auto bg-slate-100">
              {renderContractDocument(false, previewContract.tenant_signature, previewContract.landlord_signature)}
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-slate-900">Mietverträge & Dokumentenverwaltung</h2>
          <p className="text-slate-500">Erstellen, direkt im Dokument bearbeiten, digital signieren und speichern.</p>
        </div>

        {view === "folder" ? (
          <button
            onClick={() => { resetForm(); setView("wizard"); setWizardStep(1); }}
            className="bg-blue-600 hover:bg-blue-500 text-white font-semibold px-4 py-2 rounded-lg shadow-xs"
          >
            ➕ Neuen Mietvertrag erstellen
          </button>
        ) : (
          <button onClick={() => setView("folder")} className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold px-3 py-1.5 rounded-lg">
            📁 Zurück zum Ordner
          </button>
        )}
      </div>

      {/* Ordner-Ansicht */}
      {view === "folder" && (
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b pb-3">
            <h3 className="font-bold text-slate-900 text-sm">📁 Gespeicherte Mietverträge</h3>
            <span className="text-slate-400 font-medium">{contracts.length} Dokument(e)</span>
          </div>

          {loading ? (
            <p className="text-slate-400 py-4">Lade Verträge...</p>
          ) : contracts.length === 0 ? (
            <div className="text-center py-8 text-slate-400 space-y-3">
              <p>Keine Mietverträge hinterlegt.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {contracts.map((c) => (
                <div key={c.id} className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 space-y-3">
                  <div className="flex justify-between items-start">
                    <div className="font-bold text-slate-900 text-sm">{c.tenant_name}</div>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${c.status === "signed" ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-800"}`}>
                      {c.status === "signed" ? "✓ Signiert & Besiegelt" : "Entwurf"}
                    </span>
                  </div>

                  <div className="text-slate-500 space-y-1 text-xs">
                    <div>📍 {c.property_address}</div>
                    <div>🏢 {c.unit_name}</div>
                    <div>💶 Miete: <strong>{c.cold_rent} €</strong> Kalt + {c.utility_advance} € NK</div>
                  </div>

                  <div className="pt-2 border-t">
                    <button
                      onClick={() => setPreviewContract(c)}
                      className="w-full bg-blue-50 border border-blue-200 text-blue-700 hover:bg-blue-100 py-1.5 rounded font-bold text-xs flex items-center justify-center gap-1"
                    >
                      📄 Vertrag öffnen / PDF
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Wizard */}
      {view === "wizard" && (
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-xs space-y-6">
          <div className="flex justify-between border-b pb-4 text-xs font-semibold text-slate-400">
            <span className={wizardStep === 1 ? "text-blue-600 font-bold" : ""}>1. Mieter</span>
            <span>➔</span>
            <span className={wizardStep === 2 ? "text-blue-600 font-bold" : ""}>2. Parameter & Bearbeitung</span>
            <span>➔</span>
            <span className={wizardStep === 3 ? "text-blue-600 font-bold" : ""}>3. Beidseitige Unterschrift</span>
            <span>➔</span>
            <span className={wizardStep === 4 ? "text-blue-600 font-bold" : ""}>4. Finale</span>
          </div>

          {/* Schritt 1 */}
          {wizardStep === 1 && (
            <div className="space-y-4 max-w-xl mx-auto py-4">
              <h3 className="font-bold text-slate-900 text-sm text-center">Schritt 1: Mieter auswählen</h3>
              <select
                value={selectedTenantId}
                onChange={(e) => handleTenantSelect(e.target.value)}
                className="w-full rounded-lg border p-2.5 bg-white text-xs font-medium text-slate-800 shadow-2xs"
              >
                <option value="">-- Mieter wählen --</option>
                {tenants.map((t) => (
                  <option key={t.id} value={t.id}>{t.first_name} {t.last_name}</option>
                ))}
              </select>

              {selectedTenantId && (
                <div className="p-4 bg-blue-50/70 rounded-lg border border-blue-200 space-y-1.5 text-slate-700">
                  <div>📍 <strong>Objekt:</strong> {currentAddress}</div>
                  <div>🏢 <strong>Einheit:</strong> {currentUnit}</div>
                  <div>💶 <strong>Übernommene Kaltmiete:</strong> <span className="font-bold text-blue-700">{coldRent} €</span></div>
                  <div>⚡ <strong>Übernommene NK:</strong> <span className="font-bold text-blue-700">{utilityAdvance} €</span></div>
                </div>
              )}

              <div className="pt-4 flex justify-end">
                <button
                  disabled={!selectedTenantId}
                  onClick={() => setWizardStep(2)}
                  className="bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white px-5 py-2 rounded-lg font-semibold shadow-2xs"
                >
                  Weiter zu Schritt 2 ➔
                </button>
              </div>
            </div>
          )}

          {/* Schritt 2 */}
          {wizardStep === 2 && (
            <div className="space-y-6">
              <div className="text-center max-w-xl mx-auto">
                <h3 className="font-bold text-slate-900 text-sm">Schritt 2: Vertragsdaten & direkte Bearbeitung</h3>
                <p className="text-slate-500 text-xs">Du kannst Werte links eingeben ODER den Text rechts direkt im Dokument bearbeiten.</p>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
                <div className="bg-slate-50 p-5 rounded-xl border border-slate-200 space-y-4">
                  <h4 className="font-bold text-slate-800 text-xs uppercase tracking-wider">Schnell-Eingabe</h4>
                  
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="font-semibold block mb-1">Vermieter Name</label>
                      <input
                        type="text"
                        value={landlordName}
                        onChange={(e) => setLandlordName(e.target.value)}
                        className="w-full border p-2 rounded bg-white font-medium"
                      />
                    </div>
                    <div>
                      <label className="font-semibold block mb-1">Mietbeginn</label>
                      <input
                        type="date"
                        value={startDate}
                        onChange={(e) => setStartDate(e.target.value)}
                        className="w-full border p-2 rounded bg-white font-medium"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="font-semibold block mb-1">Kaltmiete (€)</label>
                      <input
                        type="number"
                        value={coldRent}
                        onChange={(e) => {
                          const val = parseFloat(e.target.value) || 0;
                          setColdRent(val);
                          setDeposit(val * 3);
                        }}
                        className="w-full border p-2 rounded bg-white font-bold text-slate-900"
                      />
                    </div>
                    <div>
                      <label className="font-semibold block mb-1">NK-Vorauszahlung (€)</label>
                      <input
                        type="number"
                        value={utilityAdvance}
                        onChange={(e) => setUtilityAdvance(parseFloat(e.target.value) || 0)}
                        className="w-full border p-2 rounded bg-white font-bold text-slate-900"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="font-semibold block mb-1">Kaution (€)</label>
                    <input
                      type="number"
                      value={deposit}
                      onChange={(e) => setDeposit(parseFloat(e.target.value) || 0)}
                      className="w-full border p-2 rounded bg-white font-medium"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  {renderContractDocument(true)}
                </div>
              </div>

              <div className="flex justify-between pt-4 border-t">
                <button onClick={() => setWizardStep(1)} className="px-4 py-2 border rounded font-semibold bg-white hover:bg-slate-50">← Zurück</button>
                <button onClick={() => setWizardStep(3)} className="bg-blue-600 hover:bg-blue-500 text-white px-5 py-2 rounded-lg font-semibold shadow-2xs">
                  Weiter zur Unterschrift ➔
                </button>
              </div>
            </div>
          )}

          {/* Schritt 3: Unterschriften (Jetzt in kompakter, richtiger Größe) */}
          {wizardStep === 3 && (
            <div className="space-y-6">
              <div className="text-center max-w-xl mx-auto space-y-1">
                <h3 className="font-bold text-slate-900 text-sm">Schritt 3: Beidseitige digitale Unterschrift</h3>
                <p className="text-slate-500 text-xs">Zeichne mit der Maus oder dem Finger in den Feldern.</p>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
                {/* Kompakte Unterschriftsfelder */}
                <div className="space-y-4 bg-slate-50 p-5 rounded-xl border border-slate-200">
                  <div>
                    <label className="font-semibold block mb-1">Ort der Unterzeichnung</label>
                    <input
                      type="text"
                      value={signingPlace}
                      onChange={(e) => setSigningPlace(e.target.value)}
                      className="w-full border p-2 rounded bg-white font-medium"
                    />
                  </div>

                  {/* Mieter Canvas */}
                  <div className="border p-3 rounded-xl bg-white space-y-2 shadow-2xs">
                    <div className="flex justify-between items-center">
                      <span className="font-bold text-slate-800 text-xs">1. Unterschrift: Mieter ({currentTenantName})</span>
                      {tenantSig && (
                        <button onClick={() => clearCanvas(tenantCanvasRef, setTenantSig)} className="text-[10px] text-red-500 hover:underline font-medium">
                          Neu zeichnen
                        </button>
                      )}
                    </div>
                    <canvas
                      ref={tenantCanvasRef}
                      width={500}
                      height={150}
                      onMouseDown={(e) => startDraw(e, setIsDrawingTenant, tenantCanvasRef)}
                      onMouseMove={(e) => draw(e, isDrawingTenant, tenantCanvasRef)}
                      onMouseUp={() => stopDraw(setIsDrawingTenant, tenantCanvasRef, setTenantSig)}
                      onMouseLeave={() => stopDraw(setIsDrawingTenant, tenantCanvasRef, setTenantSig)}
                      onTouchStart={(e) => startDraw(e, setIsDrawingTenant, tenantCanvasRef)}
                      onTouchMove={(e) => draw(e, isDrawingTenant, tenantCanvasRef)}
                      onTouchEnd={() => stopDraw(setIsDrawingTenant, tenantCanvasRef, setTenantSig)}
                      className="w-full h-[100px] bg-slate-50 rounded border border-slate-300 cursor-crosshair touch-none"
                    />
                    {tenantSig && <p className="text-emerald-600 font-bold text-[10px]">✓ Mieter hat unterschrieben</p>}
                  </div>

                  {/* Vermieter Canvas */}
                  <div className="border p-3 rounded-xl bg-white space-y-2 shadow-2xs">
                    <div className="flex justify-between items-center">
                      <span className="font-bold text-slate-800 text-xs">2. Unterschrift: Vermieter ({landlordName})</span>
                      {landlordSig && (
                        <button onClick={() => clearCanvas(landlordCanvasRef, setLandlordSig)} className="text-[10px] text-red-500 hover:underline font-medium">
                          Neu zeichnen
                        </button>
                      )}
                    </div>
                    <canvas
                      ref={landlordCanvasRef}
                      width={500}
                      height={150}
                      onMouseDown={(e) => startDraw(e, setIsDrawingLandlord, landlordCanvasRef)}
                      onMouseMove={(e) => draw(e, isDrawingLandlord, landlordCanvasRef)}
                      onMouseUp={() => stopDraw(setIsDrawingLandlord, landlordCanvasRef, setLandlordSig)}
                      onMouseLeave={() => stopDraw(setIsDrawingLandlord, landlordCanvasRef, setLandlordSig)}
                      onTouchStart={(e) => startDraw(e, setIsDrawingLandlord, landlordCanvasRef)}
                      onTouchMove={(e) => draw(e, isDrawingLandlord, landlordCanvasRef)}
                      onTouchEnd={() => stopDraw(setIsDrawingLandlord, landlordCanvasRef, setLandlordSig)}
                      className="w-full h-[100px] bg-slate-50 rounded border border-slate-300 cursor-crosshair touch-none"
                    />
                    {landlordSig && <p className="text-emerald-600 font-bold text-[10px]">✓ Vermieter hat unterschrieben</p>}
                  </div>
                </div>

                <div className="space-y-2">
                  {renderContractDocument(false)}
                </div>
              </div>

              <div className="flex justify-between pt-4 border-t">
                <button onClick={() => setWizardStep(2)} className="px-4 py-2 border rounded font-semibold bg-white hover:bg-slate-50">← Zurück</button>
                <button
                  disabled={!tenantSig || !landlordSig}
                  onClick={() => setWizardStep(4)}
                  className="disabled:opacity-50 bg-blue-600 hover:bg-blue-500 text-white px-5 py-2 rounded-lg font-semibold shadow-2xs"
                >
                  Weiter zum Abschluss ➔
                </button>
              </div>
            </div>
          )}

          {/* Schritt 4 */}
          {wizardStep === 4 && (
            <div className="space-y-6 max-w-md mx-auto py-6 text-center">
              <div className="w-14 h-14 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto text-2xl font-bold shadow-inner">
                ✓
              </div>
              <div>
                <h3 className="font-bold text-slate-900 text-base">Vertrag versiegeln & in Supabase speichern</h3>
                <p className="text-slate-500 text-xs mt-1">Beide Parteien haben unterzeichnet. Klicke unten zum Speichern.</p>
              </div>

              <button
                disabled={isSaving}
                onClick={handleFinalizeContract}
                className="w-full bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-bold py-3 rounded-xl shadow-md text-xs transition-all flex items-center justify-center gap-2"
              >
                {isSaving ? "Speichere in Datenbank..." : "🔒 Vertrag jetzt final speichern"}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default ContractsTab;