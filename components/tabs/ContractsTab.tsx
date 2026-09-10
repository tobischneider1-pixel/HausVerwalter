"use client";

import React, { useState, useEffect, useMemo } from "react";
import { supabase } from "@/lib/supabase";
import { Property, Tenant, Unit, Contract } from "@/types";
import AddContractModal from "../modals/AddContractModal";
import ContractPreviewModal, { ContractPreviewData } from "../modals/ContractPreviewModal";

interface Props {
  properties: Property[];
  units: Unit[];
  tenants: Tenant[];
  onRefresh?: () => void;
}

export function ContractsTab({ properties, units, tenants, onRefresh }: Props) {
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [activeFilter, setActiveFilter] = useState<"all" | "draft" | "sent" | "confirmed" | "signed">("all");

  // State für Bearbeiten / Öffnen im PreviewModal
  const [editPreviewData, setEditPreviewData] = useState<ContractPreviewData | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

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
      setContracts(data as Contract[]);
    }
    setLoading(false);
  };

  // Gefilterte Verträge
  const filteredContracts = useMemo(() => {
    return contracts.filter((c) => {
      const status = c.status?.toLowerCase() || "entwurf";
      if (activeFilter === "draft") return status === "entwurf";
      if (activeFilter === "sent") return status === "versendet";
      if (activeFilter === "confirmed") return status === "bestätigt" || status.includes("bestätigt");
      if (activeFilter === "signed") return status === "unterschrieben" || status === "aktiv";
      return true;
    });
  }, [contracts, activeFilter]);

  // Dynamische Kündigungsfrist-Berechnung
  const handleNoticeDateChange = (dateStr: string, months = currentNoticeMonths) => {
    setCancellationReceivedAt(dateStr);
    if (!dateStr) return;

    const noticeDate = new Date(dateStr);
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

  // Manueller Klick: Als bestätigt markieren
  const handleMarkAsConfirmed = async (contractId: string) => {
    try {
      const { error } = await supabase
        .from("contracts")
        .update({
          status: "Bestätigt",
          confirmed_at: new Date().toISOString(),
        })
        .eq("id", contractId);

      if (error) throw error;
      loadContracts();
      if (onRefresh) onRefresh();
    } catch (err: any) {
      alert("Fehler: " + err.message);
    }
  };

  // Öffnet Vertrag im interaktiven Editor / PreviewModal
  const handleOpenContract = (contract: Contract) => {
    const tenant = tenants.find((t) => String(t.id) === String(contract.tenant_id));
    const unit = units.find((u) => String(u.id) === String(contract.unit_id));
    const prop = properties.find((p) => String(p.id) === String(contract.property_id));

    const payload: ContractPreviewData = {
      id: contract.id,
      vermieterName: "Hausverwaltung Schneider",
      vermieterAdresse: prop?.address || contract.property_address || "Musterstraße 1, 12345 Stadt",
      mieterName: contract.tenant_name,
      mieterEmail: tenant?.email || contract.tenant_email || "",
      objektName: prop?.name || contract.property_address,
      objektAdresse: contract.property_address,
      einheitNr: unit?.unit_number || contract.unit_name || "1",
      mietbeginn: contract.start_date || new Date().toISOString().split("T")[0],
      kaltmiete: contract.cold_rent || 0,
      nebenkosten: contract.utility_costs || contract.utility_advance || 0,
      kaution: contract.deposit || 0,
      sondervereinbarungen: contract.special_terms || "Keine besonderen Vereinbarungen.",
      propertyId: contract.property_id ? String(contract.property_id) : undefined,
      unitId: contract.unit_id ? String(contract.unit_id) : undefined,
      tenantId: contract.tenant_id ? String(contract.tenant_id) : undefined,
      status: contract.status || "Entwurf",
      tenantSignature: contract.tenant_signature || contract.signature_data_url,
      landlordSignature: contract.landlord_signature,
      confirmedAt: contract.confirmed_at,
    };

    setEditPreviewData(payload);
    setIsEditModalOpen(true);
  };

  return (
    <div className="p-6 space-y-6 text-xs text-slate-700">
      {/* Header mit Button */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            📝 Mietverträge & Vorlagen
          </h2>
          <p className="text-slate-500 text-xs">
            Entwürfe anlegen, per E-Mail zur Bestätigung senden und digital unterschreiben.
          </p>
        </div>
        <button
          onClick={() => setIsAddModalOpen(true)}
          className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2.5 rounded-xl font-bold flex items-center gap-2 shadow-xs transition-colors cursor-pointer"
        >
          ➕ Neuer Mietvertrag
        </button>
      </div>

      {/* Filter-Leiste */}
      <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200 w-fit flex-wrap gap-1">
        <button
          onClick={() => setActiveFilter("all")}
          className={`px-3 py-1.5 rounded-lg font-semibold text-xs transition cursor-pointer ${
            activeFilter === "all" ? "bg-white text-slate-900 shadow-xs font-bold" : "text-slate-500 hover:text-slate-900"
          }`}
        >
          Alle ({contracts.length})
        </button>
        <button
          onClick={() => setActiveFilter("draft")}
          className={`px-3 py-1.5 rounded-lg font-semibold text-xs transition cursor-pointer ${
            activeFilter === "draft" ? "bg-white text-amber-900 shadow-xs font-bold" : "text-slate-500 hover:text-amber-800"
          }`}
        >
          🟡 Entwürfe ({contracts.filter((c) => (c.status || "").toLowerCase() === "entwurf").length})
        </button>
        <button
          onClick={() => setActiveFilter("sent")}
          className={`px-3 py-1.5 rounded-lg font-semibold text-xs transition cursor-pointer ${
            activeFilter === "sent" ? "bg-white text-blue-900 shadow-xs font-bold" : "text-slate-500 hover:text-blue-800"
          }`}
        >
          🔵 Versendet ({contracts.filter((c) => (c.status || "").toLowerCase() === "versendet").length})
        </button>
        <button
          onClick={() => setActiveFilter("confirmed")}
          className={`px-3 py-1.5 rounded-lg font-semibold text-xs transition cursor-pointer ${
            activeFilter === "confirmed" ? "bg-white text-emerald-900 shadow-xs font-bold" : "text-slate-500 hover:text-emerald-800"
          }`}
        >
          🟢 Vom Mieter bestätigt (
          {contracts.filter((c) => (c.status || "").toLowerCase().includes("bestätigt")).length})
        </button>
        <button
          onClick={() => setActiveFilter("signed")}
          className={`px-3 py-1.5 rounded-lg font-semibold text-xs transition cursor-pointer ${
            activeFilter === "signed" ? "bg-white text-purple-900 shadow-xs font-bold" : "text-slate-500 hover:text-purple-800"
          }`}
        >
          🟣 Unterschrieben / Aktiv (
          {contracts.filter((c) => ["unterschrieben", "aktiv"].includes((c.status || "").toLowerCase())).length})
        </button>
      </div>

      {/* Verträge Liste */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 space-y-4 shadow-xs">
        {loading ? (
          <p className="text-slate-400 py-8 text-center animate-pulse">Lade Verträge...</p>
        ) : filteredContracts.length === 0 ? (
          <div className="py-12 text-center text-slate-400">
            <p className="font-semibold text-sm">Keine Verträge in dieser Kategorie gefunden.</p>
            <p className="text-[11px] mt-1">Lege über &quot;➕ Neuer Mietvertrag&quot; einen neuen Entwurf an.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredContracts.map((contract) => {
              const unit = units.find((u) => String(u.id) === String(contract.unit_id));
              const noticeMonths = contract.notice_period_months || (unit as any)?.notice_period_months || 3;
              const status = contract.status || "Entwurf";

              return (
                <div
                  key={contract.id}
                  className="border border-slate-200 rounded-xl p-4 bg-slate-50/50 hover:bg-white hover:shadow-md transition-all flex flex-col justify-between gap-3"
                >
                  <div className="space-y-1.5">
                    {/* Header der Karte: Mieter & Status */}
                    <div className="flex justify-between items-start gap-2">
                      <h4 className="font-bold text-slate-900 text-sm">
                        {contract.tenant_name || "Unbekannter Mieter"}
                      </h4>

                      {status === "Entwurf" && (
                        <span className="bg-amber-100 text-amber-800 text-[10px] font-bold px-2.5 py-0.5 rounded-full whitespace-nowrap">
                          🟡 Entwurf
                        </span>
                      )}
                      {status === "Versendet" && (
                        <span className="bg-blue-100 text-blue-800 text-[10px] font-bold px-2.5 py-0.5 rounded-full whitespace-nowrap">
                          🔵 Versendet
                        </span>
                      )}
                      {status.toLowerCase().includes("bestätigt") && (
                        <span className="bg-emerald-100 text-emerald-800 text-[10px] font-bold px-2.5 py-0.5 rounded-full whitespace-nowrap">
                          ✓ Bestätigt
                        </span>
                      )}
                      {["unterschrieben", "aktiv"].includes(status.toLowerCase()) && (
                        <span className="bg-purple-100 text-purple-800 text-[10px] font-bold px-2.5 py-0.5 rounded-full whitespace-nowrap">
                          🟣 Unterschrieben
                        </span>
                      )}
                    </div>

                    <p className="text-slate-600 text-[11px] font-medium">📍 {contract.property_address}</p>

                    <div className="bg-white p-2 rounded-lg border border-slate-100 text-[11px] grid grid-cols-2 gap-1 text-slate-600">
                      <div>
                        Miete: <strong>{Number(contract.cold_rent || 0).toFixed(2)} €</strong>
                      </div>
                      <div>
                        Kaution: <strong>{Number(contract.deposit || 0).toFixed(2)} €</strong>
                      </div>
                      <div>
                        Beginn: <strong>{contract.start_date || "k.A."}</strong>
                      </div>
                      <div>
                        Frist: <strong>{noticeMonths} Monate</strong>
                      </div>
                    </div>

                    {/* Bestätigungs-Hinweis */}
                    {contract.confirmed_at && (
                      <div className="text-[10px] text-emerald-700 font-semibold bg-emerald-50 p-1.5 rounded border border-emerald-100">
                        ✓ Online bestätigt am {new Date(contract.confirmed_at).toLocaleDateString("de-DE")}
                      </div>
                    )}
                  </div>

                  {/* Aktionen */}
                  <div className="pt-2 border-t border-slate-200/60 flex flex-col gap-1.5 text-[11px]">
                    <div className="flex gap-1.5">
                      <button
                        onClick={() => handleOpenContract(contract)}
                        className="flex-1 bg-blue-50 text-blue-700 hover:bg-blue-100 font-bold py-1.5 rounded-lg transition-colors text-center cursor-pointer"
                        title="Vertrag ansehen, bearbeiten, per Mail versenden oder unterschreiben"
                      >
                        📄 Öffnen & Bearbeiten
                      </button>

                      {status === "Versendet" && (
                        <button
                          onClick={() => handleMarkAsConfirmed(contract.id)}
                          className="bg-emerald-50 text-emerald-700 hover:bg-emerald-100 font-bold px-2.5 py-1.5 rounded-lg transition-colors text-center cursor-pointer whitespace-nowrap"
                          title="Als vom Mieter per E-Mail oder mündlich bestätigt markieren"
                        >
                          ✓ Bestätigt
                        </button>
                      )}
                    </div>

                    <div className="flex gap-1.5">
                      <button
                        onClick={() => openArchiveModal(contract)}
                        className="flex-1 bg-slate-100 text-slate-600 hover:bg-slate-200 font-semibold py-1 rounded text-[10px] transition-colors text-center cursor-pointer"
                      >
                        📦 Archivieren
                      </button>
                      <button
                        onClick={() => handleDelete(contract.id)}
                        className="flex-1 bg-red-50 text-red-600 hover:bg-red-100 font-semibold py-1 rounded text-[10px] transition-colors text-center cursor-pointer"
                      >
                        🗑️ Löschen
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Modal: Neuer Vertrag anlegen */}
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

      {/* Modal: Bestehenden Vertrag bearbeiten / versenden / unterschreiben */}
      {isEditModalOpen && editPreviewData && (
        <ContractPreviewModal
          isOpen={isEditModalOpen}
          onClose={() => {
            setIsEditModalOpen(false);
            setEditPreviewData(null);
          }}
          onSaveSuccess={() => {
            loadContracts();
            if (onRefresh) onRefresh();
          }}
          data={editPreviewData}
        />
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
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-lg cursor-pointer"
              >
                Abbrechen
              </button>
              <button
                onClick={confirmArchive}
                className="px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white font-semibold rounded-lg cursor-pointer"
              >
                In Archiv verschieben
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default ContractsTab;