"use client";

import React, { useState, useRef, useEffect } from "react";
import { supabase } from "@/lib/supabase";

export interface ContractPreviewData {
  id?: string;
  vermieterName?: string;
  vermieterAdresse?: string;
  mieterName: string;
  mieterEmail?: string;
  mieterAdresse?: string;
  objektName: string;
  objektAdresse?: string;
  einheitNr: string;
  mietbeginn: string;
  kaltmiete: number;
  nebenkosten: number;
  kaution: number;
  sondervereinbarungen?: string;
  propertyId?: string;
  unitId?: string;
  tenantId?: string;
  templateContent?: string;
  status?: string;
  tenantSignature?: string | null;
  landlordSignature?: string | null;
  confirmedAt?: string | null;
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
  const [contractId, setContractId] = useState<string | undefined>(data.id);
  const [vermieter, setVermieter] = useState(data.vermieterName || "Hausverwaltung Schneider");
  const [vermieterAdr, setVermieterAdr] = useState(data.vermieterAdresse || "Musterstraße 1, 12345 Stadt");
  const [mieter, setMieter] = useState(data.mieterName || "");
  const [mieterEmail, setMieterEmail] = useState(data.mieterEmail || "");
  const [objekt, setObjekt] = useState(data.objektName || "");
  const [einheit, setEinheit] = useState(data.einheitNr || "");
  const [mietbeginn, setMietbeginn] = useState(data.mietbeginn || "");

  const [kaltmiete, setKaltmiete] = useState(String(data.kaltmiete || 0));
  const [nebenkosten, setNebenkosten] = useState(String(data.nebenkosten || 0));
  const [kaution, setKaution] = useState(String(data.kaution || 0));

  const [customNotes, setCustomNotes] = useState(
    data.sondervereinbarungen || "Keine besonderen Vereinbarungen."
  );

  const [currentStatus, setCurrentStatus] = useState(data.status || "Entwurf");

  // Signatur Canvas
  const canvasMieterRef = useRef<HTMLCanvasElement | null>(null);
  const canvasVermieterRef = useRef<HTMLCanvasElement | null>(null);

  const [isDrawingTenant, setIsDrawingTenant] = useState(false);
  const [isDrawingLandlord, setIsDrawingLandlord] = useState(false);

  const [hasTenantSig, setHasTenantSig] = useState(false);
  const [hasLandlordSig, setHasLandlordSig] = useState(false);

  const [saving, setSaving] = useState(false);
  const [isEmailModalOpen, setIsEmailModalOpen] = useState(false);

  // E-Mail State
  const [emailTo, setEmailTo] = useState("");
  const [emailSubject, setEmailSubject] = useState("");
  const [emailBody, setEmailBody] = useState("");
  const [copiedNotification, setCopiedNotification] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setContractId(data.id);
      setVermieter(data.vermieterName || "Hausverwaltung Schneider");
      setVermieterAdr(data.vermieterAdresse || "Musterstraße 1, 12345 Stadt");
      setMieter(data.mieterName || "");
      setMieterEmail(data.mieterEmail || "");
      setObjekt(data.objektName || "");
      setEinheit(data.einheitNr || "");
      setMietbeginn(data.mietbeginn || new Date().toISOString().split("T")[0]);
      setKaltmiete(String(data.kaltmiete || 0));
      setNebenkosten(String(data.nebenkosten || 0));
      setKaution(String(data.kaution || 0));
      setCustomNotes(data.sondervereinbarungen || "Keine besonderen Vereinbarungen.");
      setCurrentStatus(data.status || "Entwurf");

      // Vorhandene Signaturen prüfen
      setHasTenantSig(!!data.tenantSignature);
      setHasLandlordSig(!!data.landlordSignature);

      // Falls vorhandene Signaturen existieren, in Canvas zeichnen
      setTimeout(() => {
        if (data.tenantSignature && canvasMieterRef.current) {
          const img = new Image();
          img.onload = () => {
            const ctx = canvasMieterRef.current?.getContext("2d");
            if (ctx) ctx.drawImage(img, 0, 0);
          };
          img.src = data.tenantSignature;
        }
        if (data.landlordSignature && canvasVermieterRef.current) {
          const img = new Image();
          img.onload = () => {
            const ctx = canvasVermieterRef.current?.getContext("2d");
            if (ctx) ctx.drawImage(img, 0, 0);
          };
          img.src = data.landlordSignature;
        }
      }, 100);
    }
  }, [isOpen, data]);

  if (!isOpen) return null;

  const kaltNum = Number(kaltmiete) || 0;
  const nkNum = Number(nebenkosten) || 0;
  const gesamtNum = kaltNum + nkNum;
  const kautionNum = Number(kaution) || 0;

  // Signature Canvas Helpers
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

  // Hilfsfunktion: Speichert den Vertrag in der Tabelle contracts
  const persistContract = async (statusOverride?: string) => {
    const sigTenantData =
      hasTenantSig && canvasMieterRef.current ? canvasMieterRef.current.toDataURL("image/png") : null;
    const sigLandlordData =
      hasLandlordSig && canvasVermieterRef.current ? canvasVermieterRef.current.toDataURL("image/png") : null;

    const finalStatus = statusOverride || (sigTenantData || sigLandlordData ? "Unterschrieben" : "Entwurf");

    const payload: any = {
      tenant_id: data.tenantId || null,
      tenant_name: mieter,
      unit_id: data.unitId || null,
      unit_name: einheit,
      property_id: data.propertyId || null,
      property_address: objekt,
      start_date: mietbeginn,
      cold_rent: kaltNum,
      utility_costs: nkNum,
      utility_advance: nkNum,
      deposit: kautionNum,
      special_terms: customNotes,
      status: finalStatus,
      tenant_signature: sigTenantData,
      landlord_signature: sigLandlordData,
      signature_data_url: sigTenantData,
      landlord_name: vermieter,
      signing_place: "Koblenz",
      signing_timestamp: new Date().toLocaleString("de-DE"),
    };

    let savedId = contractId;

    if (savedId) {
      const { error } = await supabase.from("contracts").update(payload).eq("id", savedId);
      if (error) throw error;
    } else {
      const { data: newC, error } = await supabase.from("contracts").insert([payload]).select().single();
      if (error) throw error;
      if (newC) {
        savedId = newC.id;
        setContractId(newC.id);
      }
    }

    return savedId;
  };

  // 1. Aktion: Als Entwurf speichern
  const handleSaveAsDraft = async () => {
    setSaving(true);
    try {
      const id = await persistContract("Entwurf");
      setCurrentStatus("Entwurf");

      // Optional als Entwurfsdokument im Mieter-Ordner eintragen
      if (data.tenantId) {
        await supabase.from("tenant_documents").insert([
          {
            tenant_id: data.tenantId,
            title: `Mietvertrag (Entwurf) - Einheit ${einheit}`,
            category: "Vertrag",
            file_url: null,
          },
        ]);
      }

      alert("✓ Vertrag erfolgreich als Entwurf gespeichert!");
      onSaveSuccess();
      onClose();
    } catch (err: any) {
      alert("Fehler beim Speichern des Entwurfs: " + err.message);
    } finally {
      setSaving(false);
    }
  };

  // 2. Aktion: Entwurf per Mail senden vorbereiten
  const handleOpenEmailModal = async () => {
    setSaving(true);
    try {
      // Vorab den Vertrag als Entwurf oder Versendet speichern, damit eine ID existiert
      const id = await persistContract("Versendet");
      setContractId(id);
      setCurrentStatus("Versendet");

      const origin = typeof window !== "undefined" ? window.location.origin : "";
      const confirmUrl = `${origin}/vertrag-bestaetigen?id=${id}`;

      setEmailTo(mieterEmail || "");
      setEmailSubject(`Mietvertragsentwurf für Ihre Wohnung: ${objekt}, Einheit ${einheit}`);
      setEmailBody(
        `Guten Tag Frau/Herr ${mieter},\n\n` +
        `anbei erhalten Sie den Entwurf Ihres Mietvertrags für die Wohnung (${objekt}, Einheit ${einheit}) zur Durchsicht.\n\n` +
        `Wichtige Eckdaten des Mietverhältnisses:\n` +
        `• Mietbeginn: ${mietbeginn}\n` +
        `• Monatliche Kaltmiete: ${kaltNum.toFixed(2)} €\n` +
        `• Nebenkostenvorauszahlung: ${nkNum.toFixed(2)} €\n` +
        `• Gesamtmiete monatlich: ${gesamtNum.toFixed(2)} €\n` +
        `• Vereinbarte Mietkaution: ${kautionNum.toFixed(2)} €\n\n` +
        `Sie können den Vertragsentwurf bequem online prüfen und mit einem Klick verbindlich bestätigen:\n` +
        `👉 Bestätigungs-Link: ${confirmUrl}\n\n` +
        `Bei Fragen stehe ich Ihnen gerne zur Verfügung.\n\n` +
        `Mit freundlichen Grüßen,\n` +
        `${vermieter}\n` +
        `${vermieterAdr}`
      );

      setIsEmailModalOpen(true);
    } catch (err: any) {
      alert("Fehler beim Vorbereiten der E-Mail: " + err.message);
    } finally {
      setSaving(false);
    }
  };

  // Mailto Link öffnen
  const handleOpenMailto = () => {
    const mailto = `mailto:${encodeURIComponent(emailTo)}?subject=${encodeURIComponent(
      emailSubject
    )}&body=${encodeURIComponent(emailBody)}`;
    window.location.href = mailto;
  };

  // Text in Zwischenablage kopieren
  const handleCopyEmailText = () => {
    navigator.clipboard.writeText(emailBody);
    setCopiedNotification(true);
    setTimeout(() => setCopiedNotification(false), 2000);
  };

  // 3. Aktion: Final unterschreiben & ablegen
  const handleFinalSignAndSave = async () => {
    setSaving(true);
    try {
      const id = await persistContract("Unterschrieben");
      setCurrentStatus("Unterschrieben");

      // In Dokumente ablegen
      if (data.tenantId) {
        await supabase.from("tenant_documents").insert([
          {
            tenant_id: data.tenantId,
            title: `Mietvertrag (Unterschrieben) - Einheit ${einheit}`,
            category: "Vertrag",
            file_url: null,
          },
        ]);
      }

      alert("✓ Vertrag erfolgreich unterschrieben und final gespeichert!");
      onSaveSuccess();
      onClose();
    } catch (err: any) {
      alert("Fehler beim Speichern: " + err.message);
    } finally {
      setSaving(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const formattedDate = new Date().toLocaleDateString("de-DE");

  return (
    <>
      <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-xs z-50 flex items-center justify-center p-2 sm:p-4 overflow-y-auto">
        <div className="bg-slate-100 rounded-2xl shadow-2xl max-w-4xl w-full my-auto overflow-hidden border border-slate-300 flex flex-col max-h-[95vh]">
          {/* Header */}
          <div className="bg-white px-6 py-4 border-b border-slate-200 flex justify-between items-center shrink-0">
            <div className="flex items-center gap-2">
              <span className="text-xl">📄</span>
              <div>
                <h3 className="font-bold text-slate-800 text-lg flex items-center gap-2">
                  Mietvertrag: {mieter || "Neuer Mieter"}
                  {currentStatus === "Entwurf" && (
                    <span className="bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full text-xs font-bold">
                      Entwurf
                    </span>
                  )}
                  {currentStatus === "Versendet" && (
                    <span className="bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full text-xs font-bold">
                      Versendet (Wartet auf Bestätigung)
                    </span>
                  )}
                  {currentStatus === "Bestätigt" && (
                    <span className="bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full text-xs font-bold">
                      ✓ Vom Mieter bestätigt
                    </span>
                  )}
                  {currentStatus === "Unterschrieben" && (
                    <span className="bg-purple-100 text-purple-800 px-2 py-0.5 rounded-full text-xs font-bold">
                      ✓ Unterschrieben
                    </span>
                  )}
                </h3>
                <p className="text-xs text-slate-500">
                  Passe alle Angaben direkt an, speichere den Entwurf, versende ihn per E-Mail oder unterschreibe digital.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handlePrint}
                type="button"
                className="px-3.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-white font-medium rounded-lg text-xs flex items-center gap-1.5 shadow-xs transition cursor-pointer"
              >
                <span>🖨️</span> Drucken / PDF
              </button>
              <button
                onClick={onClose}
                type="button"
                className="px-3.5 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-700 font-medium rounded-lg text-xs transition cursor-pointer"
              >
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
                <p className="text-xs text-emerald-600 font-semibold mt-1">
                  ✨ Alle Felder im Vertrag können direkt vor Ort editiert werden
                </p>
              </div>

              {/* Vermieter & Mieter */}
              <div className="bg-slate-50 rounded-lg p-4 border border-slate-200 grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">
                    VERMIETER
                  </span>
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
                  <span className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">
                    MIETER
                  </span>
                  <input
                    type="text"
                    value={mieter}
                    onChange={(e) => setMieter(e.target.value)}
                    className="w-full font-semibold text-slate-900 bg-white border border-slate-300 rounded px-2 py-1 text-xs mb-1"
                    placeholder="Mieter Name"
                  />
                  <input
                    type="email"
                    value={mieterEmail}
                    onChange={(e) => setMieterEmail(e.target.value)}
                    placeholder="E-Mail-Adresse für Entwurfsversand"
                    className="w-full text-xs text-slate-600 bg-white border border-slate-300 rounded px-2 py-1"
                  />
                </div>
              </div>

              {/* § 1 Mietgegenstand & Objekt */}
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

              {/* § 2 Mietbeginn & Dauer */}
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

              {/* § 3 Miete & Nebenkosten */}
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

              {/* § 4 Mietkaution */}
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

              {/* § 5 Sondervereinbarungen */}
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
                <div>
                  Datum: <strong>{formattedDate}</strong>
                </div>
              </div>

              {/* Digitale Unterschriften */}
              <div className="pt-6 grid grid-cols-2 gap-6 border-t border-slate-200">
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <label className="text-xs font-bold text-slate-700">Unterschrift Mieter</label>
                    {hasTenantSig && (
                      <button
                        type="button"
                        onClick={() => clearCanvas(canvasMieterRef.current, setHasTenantSig)}
                        className="text-[10px] text-red-500 hover:underline cursor-pointer"
                      >
                        Löschen
                      </button>
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
                      <span className="absolute inset-0 flex items-center justify-center text-xs text-slate-400 italic pointer-events-none">
                        Hier unterschreiben (Mieter)
                      </span>
                    )}
                  </div>
                  <p className="text-center font-bold text-xs text-slate-800 pt-1">Unterschrift Mieter</p>
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <label className="text-xs font-bold text-slate-700">Unterschrift Vermieter</label>
                    {hasLandlordSig && (
                      <button
                        type="button"
                        onClick={() => clearCanvas(canvasVermieterRef.current, setHasLandlordSig)}
                        className="text-[10px] text-red-500 hover:underline cursor-pointer"
                      >
                        Löschen
                      </button>
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
                      <span className="absolute inset-0 flex items-center justify-center text-xs text-slate-400 italic pointer-events-none">
                        Hier unterschreiben (Vermieter)
                      </span>
                    )}
                  </div>
                  <p className="text-center font-bold text-xs text-slate-800 pt-1">Unterschrift Vermieter</p>
                </div>
              </div>
            </div>
          </div>

          {/* Footer mit allen Aktionen */}
          <div className="bg-white px-6 py-4 border-t border-slate-200 flex flex-wrap justify-between items-center gap-3 shrink-0">
            <button
              onClick={onClose}
              type="button"
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl text-xs cursor-pointer transition"
            >
              Abbrechen
            </button>

            <div className="flex items-center gap-2 flex-wrap">
              {/* Entwurf speichern */}
              <button
                onClick={handleSaveAsDraft}
                disabled={saving}
                type="button"
                className="px-4 py-2 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 font-bold rounded-xl text-xs shadow-xs transition cursor-pointer disabled:opacity-50"
              >
                {saving ? "..." : "💾 Als Entwurf speichern"}
              </button>

              {/* Per Mail an Mieter senden */}
              <button
                onClick={handleOpenEmailModal}
                disabled={saving}
                type="button"
                className="px-4 py-2 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 font-bold rounded-xl text-xs shadow-xs transition cursor-pointer disabled:opacity-50"
              >
                📧 Entwurf per Mail senden
              </button>

              {/* Final unterschreiben & ablegen */}
              <button
                onClick={handleFinalSignAndSave}
                disabled={saving}
                type="button"
                className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl text-xs shadow-md transition cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
              >
                {saving ? "Speichere..." : "✓ Final unterschreiben & ablegen"}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* PopUp: E-Mail Assistent an den Mieter */}
      {isEmailModalOpen && (
        <div className="fixed inset-0 z-60 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full p-6 space-y-4 border border-slate-200">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <h4 className="font-bold text-slate-900 text-base flex items-center gap-2">
                ✉️ Vertragsentwurf an Mieter senden
              </h4>
              <button
                onClick={() => setIsEmailModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 font-bold text-base p-1 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="font-semibold text-slate-700 block mb-1">Empfänger-E-Mail</label>
                <input
                  type="email"
                  value={emailTo}
                  onChange={(e) => setEmailTo(e.target.value)}
                  placeholder="mieter@beispiel.de"
                  className="w-full p-2 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 font-medium"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Betreff</label>
                <input
                  type="text"
                  value={emailSubject}
                  onChange={(e) => setEmailSubject(e.target.value)}
                  className="w-full p-2 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 font-medium"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">
                  E-Mail Text (inklusive digitalem Bestätigungslink für den Mieter)
                </label>
                <textarea
                  rows={8}
                  value={emailBody}
                  onChange={(e) => setEmailBody(e.target.value)}
                  className="w-full p-2.5 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 font-sans text-xs leading-relaxed"
                />
              </div>

              {copiedNotification && (
                <div className="p-2 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded text-center font-semibold text-[11px]">
                  ✓ Text & Bestätigungslink in Zwischenablage kopiert!
                </div>
              )}
            </div>

            <div className="flex justify-between items-center gap-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={handleCopyEmailText}
                className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-semibold text-xs transition cursor-pointer"
              >
                📋 Text kopieren
              </button>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={handleOpenMailto}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-bold text-xs shadow-sm transition cursor-pointer flex items-center gap-1.5"
                >
                  🚀 Im Mailprogramm öffnen
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIsEmailModalOpen(false);
                    onSaveSuccess();
                    onClose();
                  }}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg font-bold text-xs shadow-sm transition cursor-pointer"
                >
                  ✓ Fertig
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}