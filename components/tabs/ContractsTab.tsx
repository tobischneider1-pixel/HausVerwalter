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
    const { data } = await supabase.from("contracts").select("*").order("created_at", { ascending: false });
    if (data) setContracts(data);
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
      alert("Vertrag erfolgreich gespeichert!");
      if (onRefresh) onRefresh();
      await fetchContracts();
      setView("folder");
    }
  };

  return (
    <div className="p-6 space-y-6 text-xs text-slate-700">
      {/* PopUp für Druck/PDF */}
      {previewContract && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-xl shadow-2xl max-w-3xl w-full max-h-[90vh] flex flex-col">
            <div className="p-4 border-b flex justify-between items-center bg-slate-50">
              <h3 className="font-bold text-slate-800 text-sm">📄 Vertrag</h3>
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
          <p className="text-slate-500">Verträge erstellen, digital signieren und verwalten.</p>
        </div>
        {view === "folder" ? (
          <button onClick={() => setView("wizard")} className="bg-blue-600 text-white font-semibold px-4 py-2 rounded-lg">➕ Neuen Mietvertrag erstellen</button>
        ) : (
          <button onClick={() => setView("folder")} className="bg-slate-100 text-slate-700 font-semibold px-3 py-1.5 rounded-lg">📁 Zurück zum Ordner</button>
        )}
      </div>

      {/* Ansichten */}
      {view === "folder" ? (
        <div className="bg-white p-5 rounded-xl border space-y-4">
          <h3 className="font-bold text-slate-900 text-sm">📁 Gespeicherte Verträge ({contracts.length})</h3>
          {loading ? (
            <p className="text-slate-400">Lade Verträge...</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {contracts.map((c) => (
                <div key={c.id} className="p-4 rounded-xl border bg-slate-50 space-y-2">
                  <div className="font-bold text-slate-900">{c.tenant_name}</div>
                  <div className="text-slate-500">📍 {c.property_address}</div>
                  <button onClick={() => setPreviewContract(c)} className="w-full bg-blue-50 border border-blue-200 text-blue-700 py-1 rounded font-bold mt-2">
                    📄 Öffnen
                  </button>
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