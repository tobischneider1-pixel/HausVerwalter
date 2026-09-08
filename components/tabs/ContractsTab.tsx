"use client";

import React, { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { Property, Tenant, Unit } from "@/types";
import { ContractDocument } from "../contracts/ContractDocument";
import { ContractWizard } from "../contracts/ContractWizard";

interface Props {
  properties?: Property[];
  units?: Unit[];
  tenants?: Tenant[];
  onRefresh?: () => void;
}

export function ContractsTab({ properties = [], units = [], tenants = [], onRefresh }: Props) {
  const [contracts, setContracts] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [view, setView] = useState<"folder" | "wizard">("folder");
  const [previewContract, setPreviewContract] = useState<any | null>(null);

  const fetchContracts = async () => {
    setLoading(true);
    // Nur nicht-archivierte Verträge laden
    const { data, error } = await supabase
      .from("contracts")
      .select("*")
      .or("is_archived.eq.false,is_archived.is.null")
      .order("created_at", { ascending: false });

    if (!error && data) setContracts(data);
    setLoading(false);
  };

  useEffect(() => {
    fetchContracts();
  }, []);

  const handleSaveContract = async (payload: any) => {
    const { error } = await supabase.from("contracts").insert([payload]);
    if (error) {
      alert("Fehler beim Speichern: " + error.message);
    } else {
      alert("Vertrag erfolgreich erstellt!");
      if (onRefresh) onRefresh();
      await fetchContracts();
      setView("folder");
    }
  };

  const handleArchiveContract = async (id: string) => {
    if (!confirm("Möchtest du diesen Vertrag wirklich archivieren? Er wird in den Reiter 'Dokumente' verschoben.")) return;

    const { error } = await supabase.from("contracts").update({ is_archived: true }).eq("id", id);
    if (error) {
      alert("Fehler beim Archivieren: " + error.message);
    } else {
      setContracts((prev) => prev.filter((c) => c.id !== id));
      if (onRefresh) onRefresh();
    }
  };

  const handleDeleteContract = async (id: string) => {
    if (!confirm("⚠️ Möchtest du diesen Vertrag unwiderruflich löschen?")) return;

    const { error } = await supabase.from("contracts").delete().eq("id", id);
    if (error) {
      alert("Fehler beim Löschen: " + error.message);
    } else {
      setContracts((prev) => prev.filter((c) => c.id !== id));
      if (onRefresh) onRefresh();
    }
  };

  return (
    <div className="p-6 space-y-6 text-xs text-slate-700">
      {/* PopUp für Druck/PDF Preview */}
      {previewContract && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-xl shadow-2xl max-w-3xl w-full max-h-[90vh] flex flex-col">
            <div className="p-4 border-b flex justify-between items-center bg-slate-50">
              <h3 className="font-bold text-slate-800 text-sm">📄 Vertragsdokument</h3>
              <div className="flex gap-2">
                <button onClick={() => window.print()} className="bg-blue-600 text-white font-semibold px-4 py-1.5 rounded-lg">🖨️ Drucken / PDF</button>
                <button onClick={() => setPreviewContract(null)} className="bg-slate-200 text-slate-700 font-semibold px-3 py-1.5 rounded-lg">Schließen</button>
              </div>
            </div>
            <div className="p-6 overflow-y-auto bg-slate-100">
              <ContractDocument {...previewContract} />
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-lg font-bold text-slate-900">Mietverträge</h2>
          <p className="text-slate-500">Übersicht aller aktuell laufenden Mietverträge.</p>
        </div>
        {view === "folder" ? (
          <button onClick={() => setView("wizard")} className="bg-blue-600 hover:bg-blue-500 text-white font-semibold px-4 py-2 rounded-lg shadow-xs transition-all">
            + Neuen Mietvertrag erstellen
          </button>
        ) : (
          <button onClick={() => setView("folder")} className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold px-3 py-1.5 rounded-lg">
            📁 Zurück zur Übersicht
          </button>
        )}
      </div>

      {/* Ansichten */}
      {view === "folder" ? (
        <div className="bg-white p-5 rounded-xl border border-slate-200 space-y-4">
          <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
            📂 Laufende Verträge <span className="bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full text-xs">{contracts.length}</span>
          </h3>

          {loading ? (
            <p className="text-slate-400 py-4">Lade laufende Verträge...</p>
          ) : contracts.length === 0 ? (
            <div className="p-8 text-center border-2 border-dashed border-slate-200 rounded-xl">
              <p className="text-slate-500 font-medium">Keine aktiven Verträge vorhanden.</p>
              <p className="text-slate-400 text-[11px] mt-1">Erstelle einen neuen Vertrag oder schaue im Dokumenten-Archiv nach.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {contracts.map((c) => (
                <div key={c.id} className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-white hover:shadow-md transition-all space-y-3 flex flex-col justify-between">
                  <div>
                    <div className="flex justify-between items-start mb-1">
                      <h4 className="font-bold text-slate-900 text-sm">{c.tenant_name || "Unbekannter Mieter"}</h4>
                      <span className="text-[10px] bg-emerald-100 text-emerald-800 font-semibold px-2 py-0.5 rounded-full">Aktiv</span>
                    </div>
                    <p className="text-slate-500 text-xs flex items-center gap-1">📍 {c.property_address || "Keine Adresse"}</p>
                    <p className="text-slate-400 text-[11px] mt-1">Mietbeginn: {c.start_date || "—"}</p>
                  </div>

                  {/* 3 Aktions-Buttons */}
                  <div className="pt-2 border-t border-slate-200 grid grid-cols-3 gap-1.5">
                    <button
                      onClick={() => setPreviewContract(c)}
                      className="bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 py-1.5 px-2 rounded-lg font-semibold text-[11px] transition-colors text-center"
                    >
                      📄 Öffnen
                    </button>
                    <button
                      onClick={() => handleArchiveContract(c.id)}
                      className="bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 py-1.5 px-2 rounded-lg font-semibold text-[11px] transition-colors text-center"
                    >
                      📦 Archiv
                    </button>
                    <button
                      onClick={() => handleDeleteContract(c.id)}
                      className="bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 py-1.5 px-2 rounded-lg font-semibold text-[11px] transition-colors text-center"
                    >
                      🗑️ Löschen
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        <ContractWizard properties={properties} units={units} tenants={tenants} onSave={handleSaveContract} onCancel={() => setView("folder")} />
      )}
    </div>
  );
}

export default ContractsTab;