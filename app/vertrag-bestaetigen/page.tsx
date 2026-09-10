"use client";

import React, { Suspense, useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabase";

function ConfirmContractContent() {
  const searchParams = useSearchParams();
  const id = searchParams.get("id");

  const [contract, setContract] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [acceptedCheckbox, setAcceptedCheckbox] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (!id) {
      setLoading(false);
      setErrorMsg("Kein gültiger Vertrags-Link angegeben. Bitte prüfen Sie den Link aus der E-Mail.");
      return;
    }

    const loadContract = async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from("contracts")
          .select("*")
          .eq("id", id)
          .single();

        if (error || !data) {
          throw new Error("Der angeforderte Vertrag konnte nicht gefunden werden.");
        }

        setContract(data);
        if (data.status === "Bestätigt" || data.status === "Unterschrieben") {
          setIsSuccess(true);
        }
      } catch (err: any) {
        setErrorMsg(err.message || "Fehler beim Laden des Vertrags.");
      } finally {
        setLoading(false);
      }
    };

    loadContract();
  }, [id]);

  const handleConfirm = async () => {
    if (!acceptedCheckbox) {
      alert("Bitte bestätigen Sie die Kenntnisnahme und Zustimmung über das Kontrollkästchen.");
      return;
    }

    setSubmitting(true);
    try {
      const now = new Date().toISOString();
      const { error } = await supabase
        .from("contracts")
        .update({
          status: "Bestätigt",
          confirmed_at: now,
        })
        .eq("id", id);

      if (error) throw error;

      setIsSuccess(true);
    } catch (err: any) {
      alert("Fehler beim Übermitteln der Bestätigung: " + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4">
        <div className="bg-white p-8 rounded-2xl shadow-md max-w-md w-full text-center space-y-3 border border-slate-200">
          <div className="text-3xl animate-bounce">📄</div>
          <p className="text-sm font-semibold text-slate-700">Vertragsdaten werden geladen...</p>
        </div>
      </div>
    );
  }

  if (errorMsg || !contract) {
    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4 font-sans">
        <div className="bg-white p-8 rounded-2xl shadow-xl max-w-md w-full text-center space-y-4 border border-slate-200">
          <div className="w-12 h-12 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto text-xl font-bold">
            ⚠️
          </div>
          <h2 className="text-lg font-bold text-slate-900">Vertrag nicht gefunden</h2>
          <p className="text-xs text-slate-600 leading-relaxed">{errorMsg}</p>
        </div>
      </div>
    );
  }

  const coldRentNum = Number(contract.cold_rent) || 0;
  const utilNum = Number(contract.utility_costs || contract.utility_advance) || 0;
  const totalRentNum = coldRentNum + utilNum;
  const depositNum = Number(contract.deposit) || 0;

  return (
    <div className="min-h-screen bg-slate-100 py-8 px-4 font-sans antialiased text-slate-800 flex flex-col items-center justify-center">
      <div className="w-full max-w-xl bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden">
        {/* Header */}
        <div className="bg-slate-900 p-6 text-white text-center">
          <div className="inline-block bg-blue-600 text-white px-3 py-1 rounded-full text-[11px] font-bold tracking-wide uppercase mb-2">
            Mietvertragsprüfung
          </div>
          <h1 className="text-xl font-extrabold tracking-tight">Wohnraum-Mietvertrag</h1>
          <p className="text-xs text-slate-300 mt-1">
            Freigabe & Bestätigung des Entwurfs für <strong>{contract.tenant_name}</strong>
          </p>
        </div>

        {/* Erfolgsanzeige nach Bestätigung */}
        {isSuccess ? (
          <div className="p-8 text-center space-y-4">
            <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto text-3xl font-bold">
              ✓
            </div>
            <h2 className="text-xl font-extrabold text-slate-900">Vertragsentwurf bestätigt!</h2>
            <p className="text-xs text-slate-600 max-w-md mx-auto leading-relaxed">
              Vielen Dank, <strong>{contract.tenant_name}</strong>. Ihre Bestätigung wurde erfolgreich erfasst und an die Hausverwaltung übermittelt.
            </p>
            <div className="bg-slate-50 border border-slate-200 p-4 rounded-xl text-left text-xs space-y-2 mt-4">
              <div className="text-slate-500 font-medium">Bestätigte Eckdaten:</div>
              <div className="font-semibold text-slate-800">
                • Mietobjekt: {contract.property_address} ({contract.unit_name || "Einheit"})
              </div>
              <div className="font-semibold text-slate-800">• Mietbeginn: {contract.start_date}</div>
              <div className="font-semibold text-emerald-700">
                • Gesamtmiete monatlich: {totalRentNum.toFixed(2)} €
              </div>
            </div>
            <p className="text-[11px] text-slate-400 pt-2">
              Sie erhalten in Kürze das finale Dokument zur Gegenzeichnung. Sie können dieses Fenster nun schließen.
            </p>
          </div>
        ) : (
          /* Entwurf zur Durchsicht & Bestätigung */
          <div className="p-6 space-y-5 text-xs">
            <div className="bg-blue-50/70 border border-blue-200 rounded-xl p-4 text-blue-950 space-y-1">
              <div className="font-bold text-sm">Guten Tag {contract.tenant_name},</div>
              <p className="text-xs leading-relaxed text-blue-900">
                bitte prüfen Sie die nachfolgenden Vertragsdaten sorgfältig. Durch Klick auf &quot;Vertragsentwurf bestätigen&quot; geben Sie dem Vermieter die Freigabe zur Erstellung des finalen Mietvertrags.
              </p>
            </div>

            {/* Übersicht der Vertragsdaten */}
            <div className="border border-slate-200 rounded-xl p-4 space-y-3 bg-slate-50/50">
              <h3 className="font-bold text-slate-900 text-xs uppercase tracking-wider border-b border-slate-200 pb-2">
                Vertragskonditionen im Überblick
              </h3>

              <div className="grid grid-cols-2 gap-3 pt-1">
                <div>
                  <span className="text-slate-500 block text-[11px]">Mietobjekt</span>
                  <strong className="text-slate-800">{contract.property_address}</strong>
                </div>
                <div>
                  <span className="text-slate-500 block text-[11px]">Wohneinheit</span>
                  <strong className="text-slate-800">{contract.unit_name || "Mietwohnung"}</strong>
                </div>
                <div>
                  <span className="text-slate-500 block text-[11px]">Mietbeginn</span>
                  <strong className="text-slate-800">{contract.start_date}</strong>
                </div>
                <div>
                  <span className="text-slate-500 block text-[11px]">Kaution</span>
                  <strong className="text-slate-800">{depositNum.toFixed(2)} €</strong>
                </div>
              </div>

              {/* Mietenaufstellung */}
              <div className="bg-white p-3 rounded-lg border border-slate-200 grid grid-cols-3 text-center gap-2 mt-2">
                <div>
                  <span className="text-slate-400 block text-[10px]">Kaltmiete</span>
                  <span className="font-bold text-slate-800">{coldRentNum.toFixed(2)} €</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px]">Nebenkosten</span>
                  <span className="font-bold text-slate-800">{utilNum.toFixed(2)} €</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px]">Gesamt / Monat</span>
                  <span className="font-extrabold text-emerald-600 text-sm">{totalRentNum.toFixed(2)} €</span>
                </div>
              </div>

              {contract.special_terms && contract.special_terms !== "Keine besonderen Vereinbarungen." && (
                <div className="pt-2">
                  <span className="text-slate-500 block text-[11px] mb-1">Besondere Vereinbarungen:</span>
                  <div className="bg-white p-2.5 rounded border border-slate-200 text-slate-700 italic text-[11px] leading-relaxed">
                    {contract.special_terms}
                  </div>
                </div>
              )}
            </div>

            {/* Checkbox zur Bestätigung */}
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-2.5">
              <input
                type="checkbox"
                id="accept"
                checked={acceptedCheckbox}
                onChange={(e) => setAcceptedCheckbox(e.target.checked)}
                className="mt-0.5 rounded text-blue-600 focus:ring-blue-500 w-4 h-4 cursor-pointer"
              />
              <label htmlFor="accept" className="text-slate-800 font-medium cursor-pointer leading-snug">
                Ich habe alle Angaben zum Mietvertragsentwurf geprüft und bestätige die Konditionen hiermit verbindlich gegenüber der Hausverwaltung.
              </label>
            </div>

            {/* Bestätigen Button */}
            <button
              onClick={handleConfirm}
              disabled={!acceptedCheckbox || submitting}
              className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-bold rounded-xl text-sm shadow-md transition-all cursor-pointer flex items-center justify-center gap-2"
            >
              {submitting ? "Übermittle Bestätigung..." : "✓ Vertragsentwurf verbindlich bestätigen"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default function ConfirmContractPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center">Lade Vertragsdaten...</div>}>
      <ConfirmContractContent />
    </Suspense>
  );
}
