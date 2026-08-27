"use client";

import React, { useState } from "react";
import { supabase } from "@/lib/supabase";
import { Property, Unit } from "@/types";

interface Props {
  units: Unit[];
  properties: Property[];
  onRefresh: () => void;
}

export function UnitsTab({ units, properties, onRefresh }: Props) {
  const [editingUnit, setEditingUnit] = useState<Unit | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleDelete(id: string) {
    if (!confirm("Möchtest du diese Einheit wirklich löschen?")) return;
    try {
      const { error } = await supabase.from("units").delete().eq("id", id);
      if (error) throw error;
      onRefresh();
    } catch (err: any) {
      alert("Fehler beim Löschen: " + err.message);
    }
  }

  async function handleUpdate(e: React.FormEvent) {
    e.preventDefault();
    if (!editingUnit) return;
    setLoading(true);

    try {
      const { error } = await supabase
        .from("units")
        .update({
          property_id: editingUnit.property_id,
          unit_number: editingUnit.unit_number,
          size_sqm: Number(editingUnit.size_sqm),
          rooms: Number(editingUnit.rooms),
          status: editingUnit.status,
        })
        .eq("id", editingUnit.id);

      if (error) throw error;
      setEditingUnit(null);
      onRefresh();
    } catch (err: any) {
      alert("Fehler beim Aktualisieren: " + err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="p-6 space-y-4">
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <table className="w-full text-left text-xs text-slate-600">
          <thead className="bg-slate-50 border-b border-slate-200 text-slate-700 font-semibold">
            <tr>
              <th className="p-3">Einheit</th>
              <th className="p-3">Objekt</th>
              <th className="p-3">Größe</th>
              <th className="p-3">Zimmer</th>
              <th className="p-3">Status</th>
              <th className="p-3 text-right">Aktionen</th>
            </tr>
          </thead>
          <tbody>
            {units.map((unit) => (
              <tr key={unit.id} className="border-b border-slate-100 hover:bg-slate-50/50">
                <td className="p-3 font-medium text-slate-900">{unit.unit_number}</td>
                <td className="p-3">{unit.properties?.name || "-"}</td>
                <td className="p-3">{unit.size_sqm} m²</td>
                <td className="p-3">{unit.rooms}</td>
                <td className="p-3">
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                    unit.status === "vermietet" ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"
                  }`}>
                    {unit.status}
                  </span>
                </td>
                <td className="p-3 text-right space-x-2">
                  <button onClick={() => setEditingUnit(unit)} className="text-blue-600 hover:underline font-semibold">
                    Bearbeiten
                  </button>
                  <button onClick={() => handleDelete(unit.id)} className="text-red-600 hover:underline font-semibold">
                    Löschen
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Bearbeiten Modal */}
      {editingUnit && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
            <h3 className="text-sm font-bold text-slate-900 mb-4">Einheit bearbeiten</h3>
            <form onSubmit={handleUpdate} className="space-y-3 text-xs">
              <div>
                <label className="font-semibold block mb-1">Objekt</label>
                <select
                  value={editingUnit.property_id}
                  onChange={(e) => setEditingUnit({ ...editingUnit, property_id: e.target.value })}
                  className="w-full rounded border border-slate-300 p-2 bg-white"
                >
                  {properties.map((p) => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="font-semibold block mb-1">Bezeichnung</label>
                <input
                  type="text"
                  required
                  value={editingUnit.unit_number}
                  onChange={(e) => setEditingUnit({ ...editingUnit, unit_number: e.target.value })}
                  className="w-full rounded border border-slate-300 p-2"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="font-semibold block mb-1">Größe (m²)</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={editingUnit.size_sqm}
                    onChange={(e) => setEditingUnit({ ...editingUnit, size_sqm: Number(e.target.value) })}
                    className="w-full rounded border border-slate-300 p-2"
                  />
                </div>
                <div>
                  <label className="font-semibold block mb-1">Zimmer</label>
                  <input
                    type="number"
                    required
                    value={editingUnit.rooms}
                    onChange={(e) => setEditingUnit({ ...editingUnit, rooms: Number(e.target.value) })}
                    className="w-full rounded border border-slate-300 p-2"
                  />
                </div>
              </div>
              <div>
                <label className="font-semibold block mb-1">Status</label>
                <select
                  value={editingUnit.status}
                  onChange={(e) => setEditingUnit({ ...editingUnit, status: e.target.value })}
                  className="w-full rounded border border-slate-300 p-2 bg-white"
                >
                  <option value="vermietet">vermietet</option>
                  <option value="leerstand">leerstand</option>
                </select>
              </div>
              <div className="flex justify-end gap-2 pt-4">
                <button type="button" onClick={() => setEditingUnit(null)} className="rounded border px-4 py-2 font-semibold text-slate-600">
                  Abbrechen
                </button>
                <button type="submit" disabled={loading} className="rounded bg-blue-600 px-4 py-2 font-semibold text-white hover:bg-blue-500">
                  {loading ? "Speichert..." : "Speichern"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default UnitsTab;