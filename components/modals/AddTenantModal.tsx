"use client";

import React, { useState } from "react";
import { supabase } from "@/lib/supabase";
import { Unit } from "@/types";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  units: Unit[];
}

export function AddTenantModal({ isOpen, onClose, onSuccess, units }: Props) {
  const [newTenant, setNewTenant] = useState({
    unit_id: "",
    first_name: "",
    last_name: "",
    email: "",
    phone: "",
    rent_amount: "",
    utility_advance: "",
    start_date: new Date().toISOString().split("T")[0],
  });
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setErrorMsg(null);

    const rent = parseFloat(newTenant.rent_amount) || 0;
    const advance = parseFloat(newTenant.utility_advance) || 0;

    try {
      const { error } = await supabase.from("tenants").insert([{
        unit_id: newTenant.unit_id,
        first_name: newTenant.first_name,
        last_name: newTenant.last_name,
        email: newTenant.email,
        phone: newTenant.phone,
        rent_amount: rent,
        utility_advance: advance,
        warm_rent: rent + advance,
        start_date: newTenant.start_date,
      }]);
      if (error) throw error;
      setNewTenant({
        unit_id: "",
        first_name: "",
        last_name: "",
        email: "",
        phone: "",
        rent_amount: "",
        utility_advance: "",
        start_date: new Date().toISOString().split("T")[0],
      });
      onSuccess();
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || "Fehler beim Anlegen des Mieters.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
        <h3 className="text-sm font-bold text-slate-900 mb-4">Mieter zuweisen</h3>
        {errorMsg && <div className="mb-3 text-xs text-red-600 bg-red-50 p-2.5 rounded border border-red-200">{errorMsg}</div>}
        <form onSubmit={handleSubmit} className="space-y-3 text-xs">
          <div>
            <label className="font-semibold block mb-1 text-slate-700">Einheit</label>
            <select required value={newTenant.unit_id} onChange={(e) => setNewTenant({ ...newTenant, unit_id: e.target.value })} className="w-full rounded border border-slate-300 p-2 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500">
              <option value="">Bitte wählen...</option>
              {units.map((u) => (
                <option key={u.id} value={u.id}>{u.unit_number} ({u.properties?.name || "Unbekanntes Objekt"})</option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="font-semibold block mb-1 text-slate-700">Vorname</label>
              <input type="text" required value={newTenant.first_name} onChange={(e) => setNewTenant({ ...newTenant, first_name: e.target.value })} className="w-full rounded border border-slate-300 p-2 focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="font-semibold block mb-1 text-slate-700">Nachname</label>
              <input type="text" required value={newTenant.last_name} onChange={(e) => setNewTenant({ ...newTenant, last_name: e.target.value })} className="w-full rounded border border-slate-300 p-2 focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="font-semibold block mb-1 text-slate-700">E-Mail</label>
              <input type="email" value={newTenant.email} onChange={(e) => setNewTenant({ ...newTenant, email: e.target.value })} className="w-full rounded border border-slate-300 p-2 focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="font-semibold block mb-1 text-slate-700">Telefon</label>
              <input type="text" value={newTenant.phone} onChange={(e) => setNewTenant({ ...newTenant, phone: e.target.value })} className="w-full rounded border border-slate-300 p-2 focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="font-semibold block mb-1 text-slate-700">Kaltmiete (€)</label>
              <input type="number" step="0.01" required value={newTenant.rent_amount} onChange={(e) => setNewTenant({ ...newTenant, rent_amount: e.target.value })} className="w-full rounded border border-slate-300 p-2 focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="font-semibold block mb-1 text-slate-700">NK-Vorauszahlung (€)</label>
              <input type="number" step="0.01" required value={newTenant.utility_advance} onChange={(e) => setNewTenant({ ...newTenant, utility_advance: e.target.value })} className="w-full rounded border border-slate-300 p-2 focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
          </div>
          <div>
            <label className="font-semibold block mb-1 text-slate-700">Mietbeginn</label>
            <input type="date" required value={newTenant.start_date} onChange={(e) => setNewTenant({ ...newTenant, start_date: e.target.value })} className="w-full rounded border border-slate-300 p-2 focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <div className="flex justify-end gap-2 pt-4">
            <button type="button" onClick={onClose} disabled={loading} className="rounded border border-slate-300 px-4 py-2 font-semibold text-slate-600 hover:bg-slate-50">Abbrechen</button>
            <button type="submit" disabled={loading} className="rounded bg-blue-600 px-4 py-2 font-semibold text-white hover:bg-blue-500 disabled:opacity-50">
              {loading ? "Speichert..." : "Speichern"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default AddTenantModal;