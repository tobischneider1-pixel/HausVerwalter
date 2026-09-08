"use client";

import React, { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { Property, Tenant, Unit } from "@/types";
import { ContractDocument } from "../contracts/ContractDocument";
import AddContractModal from "../modals/AddContractModal";

interface Props {
  properties: Property[];
  units: Unit[];
  tenants: Tenant[];
  onRefresh?: () => void;
}

export function ContractsTab({ properties, units, tenants, onRefresh }: Props) {
  const [contracts, setContracts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedContract, setSelectedContract] = useState<any | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  // Zustand für Archivierungs-Modal
  const [archiveModalContract, setArchiveModalContract] = useState<any | null>(null);
  const [cancellationReceivedAt, setCancellationReceivedAt] = useState<string>(
    new Date().toISOString().split("T")[0]
  );
  const [endDate, setEndDate] = useState<string>("");
  const [currentNoticeMonths, setCurrentNoticeMonths] = useState<number>(3);

  useEffect(() => {
    loadContracts();
  }, []);

  const loadContracts = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("contracts")
      .select("*")
      .or("is_archived.eq.false,is_archived.is.null")
      .order("created_at", { ascending: false });

    if (!error && data) {
      setContracts(data);
    }
    setLoading(false);
  };

  // Dynamische Kündigungsfrist-Berechnung basierend auf Einheiten-Einstellung
  const handleNoticeDateChange = (dateStr: string, months = currentNoticeMonths) => {
    setCancellationReceivedAt(dateStr);
    if (!dateStr) return;

    const noticeDate = new Date(dateStr);
    // Errechnet das Monatsende nach Ablauf der Kündigungsfrist
    const targetDate = new Date(
      noticeDate.getFullYear(),
      noticeDate.getMonth() + Number(months) + 1,
      0
    );
    setEndDate(targetDate.toISOString().split("T")[0]);
  };

  const openArchiveModal = (contract: any) => {
    setArchiveModalContract(contract);
    const unit = units.find((u) => String(u.id) === String(contract.unit_id));
    const noticeMonths = contract.notice_period_months || (unit as any)?.notice_period_months || 3;
    setCurrentNoticeMonths(noticeMonths);

    const today = new Date().toISOString().split("T")[0];
    handleNoticeDateChange(today, noticeMonths);
  };

  const confirmArchive = async () => {
    if (!archiveModalContract) return;

    const { error } = await supabase
      .from("contracts")
      .update({
        is_archived: true,
        cancellation_received_at: cancellationReceivedAt,
        end_date: endDate,
      })
      .eq("id", archiveModalContract.id);

    if (error) {
      alert("Fehler beim Archivieren: " + error.message);
    } else {
      if (archiveModalContract.tenant_id && endDate) {
        await supabase
          .from("tenants")
          .update({ move_out_date: endDate })
          .eq("id", archiveModalContract.tenant_id);
      }

      setArchiveModalContract(null);
      loadContracts();
      if (onRefresh) onRefresh();
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Möchtest du diesen Vertrag wirklich löschen?")) return;
    const { error } = await supabase.from("contracts").delete().eq("id", id);
    if (!error) {
      loadContracts();
      if (onRefresh) onRefresh();
    }
  };

  return (
    <div className="p-6 space-y-6 text-xs text-slate-700">
      {/* Modal: Neuer Vertrag */}
      <AddContractModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onSuccess={() => {
          loadContracts();
          if (onRefresh) onRefresh();
        }}
        properties={properties}
        units={units}
        tenants={tenants}
      />

      {/* PopUp: Vorschau */}
      {selectedContract && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-xl shadow-2xl max-w-3xl w-full max-h-[90vh] flex flex-col">
            <div className="p-4 border-b flex justify-between items-center bg-slate-50">
              <h3 className="font-bold text-slate-800 text-sm">
                📄 Mietvertrag: {selectedContract.tenant_name || "Unbekannt"}
              </h3>
              <div className="flex gap-2">
                <button
                  onClick={() => window.print()}
                  className="bg-blue-600 hover:bg-blue-500 text-white font-semibold px-4 py-1.5 rounded-lg text-xs"
                >
                  🖨️ Drucken / PDF
                </button>
                <button
                  onClick={() => setSelectedContract(null)}
                  className="bg-slate-200 hover:bg-slate-300 text-slate-700 font-semibold px-3 py-1.5 rounded-lg text-xs"
                >
                  Schließen
                </button>
              </div>
            </div>
            <div className="p-6 overflow-y-auto bg-slate-100">
              <ContractDocument {...selectedContract} />
            </div>
          </div>
        </div>
      )}

      {/* Modal: Kündigung & Archivieren */}
      {archiveModalContract && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 space-y-5 border border-slate-200">
            <div>
              <h3 className="font-bold text-slate-900 text-base flex items-center gap-2">
                📦 Vertrag kündigen & archivieren
              </h3>
              <p className="text-slate-500 text-xs mt-1">
                Mieter: <strong>{archiveModalContract.tenant_name}</strong>
              </p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block font-medium text-slate-700 mb-1">Eingang der Kündigung</label>
                <input
                  type="date"
                  value={cancellationReceivedAt}
                  onChange={(e) => handleNoticeDateChange(e.target.value)}
                  className="w-full p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-xs"
                />
              </div>

              <div>
                <label className="block font-medium text-slate-700 mb-1">
                  Vertragsende / Kündigungsdatum ({currentNoticeMonths} Monate Frist)
                </label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-xs"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                onClick={() => setArchiveModalContract(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-lg"
              >
                Abbrechen
              </button>
              <button
                onClick={confirmArchive}
                className="px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white font-semibold rounded-lg"
              >
                In Archiv verschieben
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Header mit Button */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-lg font-bold text-slate-900">Mietverträge</h2>
          <p className="text-slate-500">Übersicht aller aktuell laufenden Mietverträge.</p>
        </div>
        <button
          onClick={() => setIsAddModalOpen(true)}
          className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-xl font-bold flex items-center gap-2 shadow-xs transition-colors"
        >
          ➕ Neuer Mietvertrag
        </button>
      </div>

      {/* Verträge Liste */}
      <div className="bg-white p-6 rounded-xl border border-slate-200 space-y-4 shadow-xs">
        <h3 className="font-bold text-slate-800 text-xs flex items-center gap-2">
          📁 Laufende Verträge
          <span className="bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full text-[10px]">
            {contracts.length}
          </span>
        </h3>

        {loading ? (
          <p className="text-slate-400 py-4 text-center">Lade Verträge...</p>
        ) : contracts.length === 0 ? (
          <p className="text-slate-400 py-4 text-center">Keine laufenden Verträge vorhanden.</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {contracts.map((contract) => {
              const unit = units.find((u) => String(u.id) === String(contract.unit_id));
              const noticeMonths = contract.notice_period_months || (unit as any)?.notice_period_months || 3;

              return (
                <div
                  key={contract.id}
                  className="border border-slate-200 rounded-xl p-4 bg-slate-50/50 hover:bg-white hover:shadow-md transition-all flex flex-col justify-between gap-3"
                >
                  <div>
                    <div className="flex justify-between items-start">
                      <h4 className="font-bold text-slate-900 text-sm">
                        {contract.tenant_name || "Unbekannter Mieter"}
                      </h4>
                      <span className="bg-emerald-100 text-emerald-800 text-[10px] font-semibold px-2 py-0.5 rounded-full">
                        Aktiv
                      </span>
                    </div>
                    <p className="text-slate-500 text-[11px] mt-1">📍 {contract.property_address}</p>
                    <div className="text-slate-400 text-[10px] mt-1 flex justify-between">
                      <span>Mietbeginn: {contract.start_date || contract.created_at?.split("T")[0]}</span>
                      <span>Frist: {noticeMonths} Mon.</span>
                    </div>
                  </div>

                  {/* Aktionen */}
                  <div className="flex gap-2 pt-2 border-t border-slate-200/60 text-[11px]">
                    <button
                      onClick={() => setSelectedContract(contract)}
                      className="flex-1 bg-blue-50 text-blue-700 hover:bg-blue-100 font-semibold py-1.5 rounded-lg transition-colors text-center"
                    >
                      📄 Öffnen
                    </button>
                    <button
                      onClick={() => openArchiveModal(contract)}
                      className="flex-1 bg-amber-50 text-amber-700 hover:bg-amber-100 font-semibold py-1.5 rounded-lg transition-colors text-center"
                    >
                      📦 Archivieren
                    </button>
                    <button
                      onClick={() => handleDelete(contract.id)}
                      className="flex-1 bg-red-50 text-red-700 hover:bg-red-100 font-semibold py-1.5 rounded-lg transition-colors text-center"
                    >
                      🗑️ Löschen
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

export default ContractsTab;