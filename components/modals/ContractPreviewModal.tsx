"use client";

import React, { useState, useRef, useEffect } from "react";
import { supabase } from "@/lib/supabase";

export interface ContractPreviewData {
  id?: string;
  vermieterName: string;
  vermieterAdresse?: string;
  mieterName: string;
  mieterAdresse?: string;
  objektName: string;
  einheitNr: string;
  mietbeginn: string;
  kaltmiete: number;
  nebenkosten: number;
  kaution: number;
  sondervereinbarungen: string;
  propertyId?: string;
  unitId?: string;
  tenantId?: string;
  templateContent?: string; // Text des geladenen Musters
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSaveSuccess: () => void;
  data: ContractPreviewData;
}

export default function ContractPreviewModal({
  isOpen,
  onClose,
  onSaveSuccess,
  data,
}: Props) {
  // Alle Vertragsdaten im State editierbar machen
  const [vermieter, setVermieter] = useState(data.vermieterName || "");
  const [vermieterAdr, setVermieterAdr] = useState(data.vermieterAdresse || "");
  const [mieter, setMieter] = useState(data.mieterName || "");
  const [objekt, setObjekt] = useState(data.objektName || "");
  const [einheit, setEinheit] = useState(data.einheitNr || "");
  const [mietbeginn, setMietbeginn] = useState(data.mietbeginn || "");
  
  const [kaltmiete, setKaltmiete] = useState(String(data.kaltmiete || 0));
  const [nebenkosten, setNebenkosten] = useState(String(data.nebenkosten || 0));
  const [kaution, setKaution] = useState(String(data.kaution || 0));
  
  const [customNotes, setCustomNotes] = useState(data.sondervereinbarungen || "Keine besonderen Vereinbarungen.");

  // Canvas Refs für Unterschriften
  const canvasMieterRef = useRef<HTMLCanvasElement | null>(null);
  const canvasVermieterRef = useRef<HTMLCanvasElement | null>(null);

  const [isDrawingTenant, setIsDrawingTenant] = useState(false);
  const [isDrawingLandlord, setIsDrawingLandlord] = useState(false);

  const [hasTenantSig, setHasTenantSig] = useState(false);
  const [hasLandlordSig, setHasLandlordSig] = useState(false);

  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setVermieter(data.vermieterName || "Hausverwaltung / Vermieter");
      setVermieterAdr(data.vermieterAdresse || "Musterstraße 1, 12345 Stadt");
      setMieter(data.mieterName || "");
      setObjekt(data.objektName || "");
      setEinheit(data.einheitNr || "");
      setMietbeginn(data.mietbeginn || new Date().toISOString().split("T")[0]);
      setKaltmiete(String(data.kaltmiete || 0));
      setNebenkosten(String(data.nebenkosten || 0));
      setKaution(String(data.kaution || 0));
      setCustomNotes(data.sondervereinbarungen || "Keine besonderen Vereinbarungen.");
      setHasTenantSig(false);
      setHasLandlordSig(false);
    }
  }, [isOpen, data]);

  if (!isOpen) return null;

  const kaltNum = Number(kaltmiete) || 0;
  const nkNum = Number(nebenkosten) || 0;
  const gesamtNum = kaltNum + nkNum;
  const kautionNum = Number(kaution) || 0;

  // Unterschriften-Zeichnen Helper
  const startDrawing = (
    e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>,
    canvas: HTMLCanvasElement | null,
    setIsDrawing: (b: boolean) => void
  ) => {
    if (!canvas) return;
    setIsDrawing(true);
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const rect = canvas.getBoundingClientRect();
    const clientX = "touches" in e ? e.touches[0].clientX : e.clientX;
    const clientY = "touches" in e ? e.touches[0].clientY : e.clientY;
    ctx.beginPath();
    ctx.moveTo(clientX - rect.left, clientY - rect.top);
  };

  const draw = (
    e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>,
    canvas: HTMLCanvasElement | null,
    isDrawing: boolean,
    setHasSig: (b: boolean) => void
  ) => {
    if (!isDrawing || !canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const rect = canvas.getBoundingClientRect();
    const clientX = "touches" in e ? e.touches[0].clientX : e.clientX;
    const clientY = "touches" in e ? e.touches[0].clientY : e.clientY;
    ctx.lineWidth = 2;
    ctx.lineCap = "round";
    ctx.strokeStyle = "#0f172a";
    ctx.lineTo(clientX - rect.left, clientY - rect.top);
    ctx.stroke();
    setHasSig(true);
  };

  const clearCanvas = (canvas: HTMLCanvasElement | null, setHasSig: (b: boolean) => void) => {
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (ctx) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      setHasSig(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  // Speichern in Datenbank & Dokumente
  const handleSaveContract = async () => {
    setSaving(true);
    try {
      const sigTenantData = hasTenantSig && canvasMieterRef.current ? canvasMieterRef.current.toDataURL("image/png") : null;

      // 1. In contracts speichern
      const { error: contractErr } = await supabase.from("contracts").insert([
        {
          tenant_id: data.tenantId || null,
          tenant_name: mieter,
          unit_id: data.unitId || null,
          property_id: data.propertyId || null,
          property_address: objekt,
          start_date: mietbeginn,
          cold_rent: kaltNum,
          utility_costs: nkNum,
          deposit: kautionNum,
          signature_data: sigTenantData,
          status: hasTenantSig || hasLandlordSig ? "Unterschrieben" : "Entwurf",
        },
      ]);

      if (contractErr) throw contractErr;

      // 2. Als Dokument unter "Vertragsmuster" oder ausgefüllte Mietverträge in documents ablegen
      const fullDocumentText = `
WOHNRAUM-MIETVERTRAG

VERMIETER: ${vermieter} (${vermieterAdr})
MIETER: ${mieter}

§ 1 Mietgegenstand & Objekt
Mietobjekt: ${objekt}, Einheit ${einheit}.
Der Vermieter vermietet dem Mieter die Wohneinheit ausschließlich zu Wohnzwecken.

§ 2 Mietbeginn & Dauer
Mietbeginn: ${mietbeginn}. Das Mietverhältnis läuft auf unbestimmte Zeit.

§ 3 Miete & Nebenkosten
Kaltmiete: ${kaltNum.toFixed(2)} € | NK-Vorschuss: ${nkNum.toFixed(2)} € | Gesamt: ${gesamtNum.toFixed(2)} €

§ 4 Mietkaution
Die Kautionshöhe beträgt ${kautionNum.toFixed(2)} €.

§ 5 Sondervereinbarungen
${customNotes}
      `.trim();

      await supabase.from("documents").insert([
        {
          title: `Mietvertrag: ${mieter}`,
          category: "Ausgefüllte Verträge",
          content: fullDocumentText,
          property_id: data.propertyId || null,
          tenant_id: data.tenantId || null,
          created_at: new Date().toISOString(),
        },
      ]);

      alert("Vertrag erfolgreich gespeichert und unter 'Dokumente' abgelegt!");
      onSaveSuccess();
      onClose();
    } catch (err: any) {
      alert("Fehler beim Speichern: " + err.message);
    } finally {
      setSaving(false);
    }
  };

  const formattedDate = new Date().toLocaleDateString("de-DE");

  return (
    <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-xs z-50 flex items-center justify-center p-2 sm:p-4 overflow-y-auto">
      <div className="bg-slate-100 rounded-2xl shadow-2xl max-w-4xl w-full my-auto overflow-hidden border border-slate-300 flex flex-col max-h-[95vh]">
        
        {/* Header */}
        <div className="bg-white px-6 py-4 border-b border-slate-200 flex justify-between items-center shrink-0">
          <div className="flex items-center gap-2">
            <span className="text-xl">📄</span>
            <div>
              <h3 className="font-bold text-slate-800 text-lg">Vertragsvorschau & Bearbeitung</h3>
              <p className="text-xs text-slate-500">Passe die Felder direkt im Dokument an, bevor du unterschreibst.</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={handlePrint} type="button" className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg text-sm flex items-center gap-2 shadow-sm transition">
              <span>🖨️</span> Drucken / PDF
            </button>
            <button onClick={onClose} type="button" className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 font-medium rounded-lg text-sm transition">
              Schließen
            </button>
          </div>
        </div>

        {/* Dokument-Ansicht */}
        <div className="p-6 overflow-y-auto flex-1 space-y-6">
          <div className="bg-white rounded-xl shadow-md p-8 max-w-3xl mx-auto border border-slate-200 text-slate-800 font-sans space-y-6">
            
            {/* Titel */}
            <div className="text-center pb-4 border-b border-slate-300">
              <h1 className="text-xl font-extrabold tracking-wide text-slate-900 uppercase">
                WOHNRAUM-MIETVERTRAG (STANDARD 2026)
              </h1>
              <p className="text-xs text-emerald-600 font-semibold mt-1">✨ Alle Felder im Vertrag sind direkt bearbeitbar</p>
            </div>

            {/* Vermieter & Mieter (EDITIERBAR) */}
            <div className="bg-slate-50 rounded-lg p-4 border border-slate-200 grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">VERMIETER</span>
                <input
                  type="text"
                  value={vermieter}
                  onChange={(e) => setVermieter(e.target.value)}
                  className="w-full font-semibold text-slate-900 bg-white border border-slate-300 rounded px-2 py-1 mb-1 text-xs"
                />
                <input
                  type="text"
                  value={vermieterAdr}
                  onChange={(e) => setVermieterAdr(e.target.value)}
                  className="w-full text-xs text-slate-600 bg-white border border-slate-300 rounded px-2 py-1"
                />
              </div>
              <div>
                <span className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">MIETER</span>
                <input
                  type="text"
                  value={mieter}
                  onChange={(e) => setMieter(e.target.value)}
                  className="w-full font-semibold text-slate-900 bg-white border border-slate-300 rounded px-2 py-1 text-xs"
                  placeholder="Mieter Name"
                />
              </div>
            </div>

            {/* § 1 Mietgegenstand & Objekt (EDITIERBAR) */}
            <div className="space-y-1">
              <h2 className="font-bold text-slate-900 border-b border-slate-800 pb-1 text-base">
                § 1 Mietgegenstand & Objekt
              </h2>
              <div className="grid grid-cols-2 gap-2 pt-1 text-sm">
                <div>
                  <span className="text-xs text-slate-500 block">Objekt / Adresse:</span>
                  <input
                    type="text"
                    value={objekt}
                    onChange={(e) => setObjekt(e.target.value)}
                    className="w-full font-semibold text-slate-900 bg-white border border-slate-300 rounded px-2 py-1 text-xs"
                  />
                </div>
                <div>
                  <span className="text-xs text-slate-500 block">Einheit Nr.:</span>
                  <input
                    type="text"
                    value={einheit}
                    onChange={(e) => setEinheit(e.target.value)}
                    className="w-full font-semibold text-slate-900 bg-white border border-slate-300 rounded px-2 py-1 text-xs"
                  />
                </div>
              </div>
              <p className="text-xs text-slate-600 pt-1">
                Der Vermieter vermietet dem Mieter die oben genannte Wohneinheit ausschließlich zu Wohnzwecken.
              </p>
            </div>

            {/* § 2 Mietbeginn & Dauer (EDITIERBAR) */}
            <div className="space-y-1">
              <h2 className="font-bold text-slate-900 border-b border-slate-800 pb-1 text-base">
                § 2 Mietbeginn & Dauer
              </h2>
              <div className="pt-1 flex items-center gap-2">
                <span className="text-sm font-semibold">Mietbeginn:</span>
                <input
                  type="date"
                  value={mietbeginn}
                  onChange={(e) => setMietbeginn(e.target.value)}
                  className="bg-white border border-slate-300 rounded px-2 py-1 text-xs font-medium"
                />
              </div>
              <p className="text-xs text-slate-600">Das Mietverhältnis wird auf unbestimmte Zeit geschlossen.</p>
            </div>

            {/* § 3 Miete & Nebenkosten (EDITIERBAR) */}
            <div className="space-y-2">
              <h2 className="font-bold text-slate-900 border-b border-slate-800 pb-1 text-base">
                § 3 Miete & Nebenkosten
              </h2>
              <div className="border border-slate-800 rounded-md p-3 grid grid-cols-3 text-center text-sm bg-slate-50 font-medium gap-2">
                <div>
                  <span className="text-xs text-slate-500 block mb-1">Kaltmiete (€):</span>
                  <input
                    type="number"
                    step="0.01"
                    value={kaltmiete}
                    onChange={(e) => setKaltmiete(e.target.value)}
                    className="w-full text-center font-bold text-slate-900 bg-white border border-slate-300 rounded p-1 text-xs"
                  />
                </div>
                <div>
                  <span className="text-xs text-slate-500 block mb-1">NK-Vorschuss (€):</span>
                  <input
                    type="number"
                    step="0.01"
                    value={nebenkosten}
                    onChange={(e) => setNebenkosten(e.target.value)}
                    className="w-full text-center font-bold text-slate-900 bg-white border border-slate-300 rounded p-1 text-xs"
                  />
                </div>
                <div>
                  <span className="text-xs text-slate-500 block mb-1">Gesamt:</span>
                  <span className="font-extrabold text-slate-900 block py-1">{gesamtNum.toFixed(2)} €</span>
                </div>
              </div>
            </div>

            {/* § 4 Mietkaution (EDITIERBAR) */}
            <div className="space-y-1">
              <h2 className="font-bold text-slate-900 border-b border-slate-800 pb-1 text-base">
                § 4 Mietkaution
              </h2>
              <div className="pt-1 flex items-center gap-2">
                <span className="text-sm">Die Kautionshöhe beträgt:</span>
                <input
                  type="number"
                  step="0.01"
                  value={kaution}
                  onChange={(e) => setKaution(e.target.value)}
                  className="w-32 bg-white border border-slate-300 rounded px-2 py-1 text-xs font-bold"
                />
                <span className="text-sm font-bold">€</span>
              </div>
            </div>

            {/* § 5 Sondervereinbarungen (EDITIERBAR) */}
            <div className="space-y-2">
              <h2 className="font-bold text-slate-900 border-b border-slate-800 pb-1 text-base">
                § 5 Sondervereinbarungen
              </h2>
              <textarea
                value={customNotes}
                onChange={(e) => setCustomNotes(e.target.value)}
                rows={3}
                className="w-full p-3 bg-amber-50/60 border border-amber-200 rounded-lg text-sm italic font-serif text-slate-800 outline-none focus:ring-2 focus:ring-amber-400"
              />
            </div>

            {/* Ort & Datum */}
            <div className="flex justify-between items-center text-xs text-slate-600 pt-4">
              <div>Ort: _______________________</div>
              <div>Datum: <strong>{formattedDate}</strong></div>
            </div>

            {/* Unterschriften */}
            <div className="pt-6 grid grid-cols-2 gap-6 border-t border-slate-200">
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <label className="text-xs font-bold text-slate-700">Unterschrift Mieter</label>
                  {hasTenantSig && (
                    <button type="button" onClick={() => clearCanvas(canvasMieterRef.current, setHasTenantSig)} className="text-[10px] text-red-500 hover:underline">Löschen</button>
                  )}
                </div>
                <div className="border border-slate-300 rounded-lg bg-slate-50 overflow-hidden h-24 relative">
                  <canvas
                    ref={canvasMieterRef}
                    width={320}
                    height={96}
                    onMouseDown={(e) => startDrawing(e, canvasMieterRef.current, setIsDrawingTenant)}
                    onMouseMove={(e) => draw(e, canvasMieterRef.current, isDrawingTenant, setHasTenantSig)}
                    onMouseUp={() => setIsDrawingTenant(false)}
                    onMouseLeave={() => setIsDrawingTenant(false)}
                    onTouchStart={(e) => startDrawing(e, canvasMieterRef.current, setIsDrawingTenant)}
                    onTouchMove={(e) => draw(e, canvasMieterRef.current, isDrawingTenant, setHasTenantSig)}
                    onTouchEnd={() => setIsDrawingTenant(false)}
                    className="w-full h-full cursor-crosshair bg-white"
                  />
                  {!hasTenantSig && (
                    <span className="absolute inset-0 flex items-center justify-center text-xs text-slate-400 italic pointer-events-none">Unterschrift Mieter ausstehend</span>
                  )}
                </div>
                <p className="text-center font-bold text-xs text-slate-800 pt-1">Unterschrift Mieter</p>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <label className="text-xs font-bold text-slate-700">Unterschrift Vermieter</label>
                  {hasLandlordSig && (
                    <button type="button" onClick={() => clearCanvas(canvasVermieterRef.current, setHasLandlordSig)} className="text-[10px] text-red-500 hover:underline">Löschen</button>
                  )}
                </div>
                <div className="border border-slate-300 rounded-lg bg-slate-50 overflow-hidden h-24 relative">
                  <canvas
                    ref={canvasVermieterRef}
                    width={320}
                    height={96}
                    onMouseDown={(e) => startDrawing(e, canvasVermieterRef.current, setIsDrawingLandlord)}
                    onMouseMove={(e) => draw(e, canvasVermieterRef.current, isDrawingLandlord, setHasLandlordSig)}
                    onMouseUp={() => setIsDrawingLandlord(false)}
                    onMouseLeave={() => setIsDrawingLandlord(false)}
                    onTouchStart={(e) => startDrawing(e, canvasVermieterRef.current, setIsDrawingLandlord)}
                    onTouchMove={(e) => draw(e, canvasVermieterRef.current, isDrawingLandlord, setHasLandlordSig)}
                    onTouchEnd={() => setIsDrawingLandlord(false)}
                    className="w-full h-full cursor-crosshair bg-white"
                  />
                  {!hasLandlordSig && (
                    <span className="absolute inset-0 flex items-center justify-center text-xs text-slate-400 italic pointer-events-none">Unterschrift Vermieter ausstehend</span>
                  )}
                </div>
                <p className="text-center font-bold text-xs text-slate-800 pt-1">Unterschrift Vermieter</p>
              </div>
            </div>

          </div>
        </div>

        {/* Footer */}
        <div className="bg-white px-6 py-4 border-t border-slate-200 flex justify-between items-center shrink-0">
          <p className="text-xs text-slate-500">
            Nach Klick wird der Vertrag fest abgespeichert und unter <strong>Dokumente</strong> hinterlegt.
          </p>
          <div className="flex items-center gap-3">
            <button onClick={onClose} type="button" className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl text-sm">
              Abbrechen
            </button>
            <button onClick={handleSaveContract} disabled={saving} type="button" className="px-6 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl text-sm shadow-md transition disabled:opacity-50">
              {saving ? "Speichere..." : "Vertrag Speichern & Ablegen ✓"}
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}