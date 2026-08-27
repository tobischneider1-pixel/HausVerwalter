"use client";

import React, { useState } from "react";
import { supabase } from "@/lib/supabase";
import { Property } from "@/types";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  properties: Property[];
}

export function AddUnitModal({ isOpen, onClose, onSuccess, properties }: Props) {
  const [newUnit, setNewUnit] = useState({ property_id: "", unit_number: "", size_sqm: "", rooms: "", status: "vermietet" });
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setErrorMsg(null);

    try {
      const { error } = await supabase.from("units").insert([{
        property_id: newUnit.property_id,
        unit_number: newUnit.unit_number,
        size_sqm: parseFloat(newUnit.size_sqm) || 0,
        rooms: parseInt(newUnit.rooms, 10) || 1,
        status: newUnit.status,
      }]);
      if (error) throw error;
      setNewUnit({ property_id: "", unit_number: "", size_sqm: "", rooms: "", status: "vermietet" });
      onSuccess();
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || "Fehler beim Anlegen der Einheit.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
        <h3 className="text-sm font-bold text-slate-900 mb-4">Neue Einheit anlegen</h3>
        {errorMsg && <div className="mb-3 text-xs text-red-600 bg-red-50 p-2.5 rounded border border-red-200">{errorMsg}</div>}
        <form onSubmit={handleSubmit} className="space-y-3 text-xs">
          <div>
            <label className="font-semibold block mb-1 text-slate-700">Zugehöriges Objekt</label>
            <select required value={newUnit.property_id} onChange={(e) => setNewUnit({ ...newUnit, property_id: e.target.value })} className="w-full rounded border border-slate-300 p-2 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500">
              <option value="">Bitte wählen...</option>
              {properties.map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="font-semibold block mb-1 text-slate-700">Einheiten-Bezeichnung</label>
            <input type="text" required value={newUnit.unit_number} onChange={(e) => setNewUnit({ ...newUnit, unit_number: e.target.value })} placeholder="z. B. WE 01 EG links" className="w-full rounded border border-slate-300 p-2 focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="font-semibold block mb-1 text-slate-700">Größe (m²)</label>
              <input type="number" step="0.01" required value={newUnit.size_sqm} onChange={(e) => setNewUnit({ ...newUnit, size_sqm: e.target.value })} className="w-full rounded border border-slate-300 p-2 focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="font-semibold block mb-1 text-slate-700">Zimmer</label>
              <input type="number" required value={newUnit.rooms} onChange={(e) => setNewUnit({ ...newUnit, rooms: e.target.value })} className="w-full rounded border border-slate-300 p-2 focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
          </div>
          <div>
            <label className="font-semibold block mb-1 text-slate-700">Status</label>
            <select value={newUnit.status} onChange={(e) => setNewUnit({ ...newUnit, status: e.target.value })} className="w-full rounded border border-slate-300 p-2 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500">
              <option value="vermietet">vermietet</option>
              <option value="leerstand">leerstand</option>
            </select>
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

export default AddUnitModal;