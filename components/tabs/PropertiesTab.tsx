"use client";

import React, { useState } from "react";
import { supabase } from "@/lib/supabase";
import { Property } from "@/types";

interface Props {
  properties: Property[];
  onRefresh: () => void;
}

export function PropertiesTab({ properties, onRefresh }: Props) {
  const [editingProp, setEditingProp] = useState<Property | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleDelete(id: string) {
    if (!confirm("Möchtest du dieses Objekt wirklich löschen?")) return;
    try {
      const { error } = await supabase.from("properties").delete().eq("id", id);
      if (error) throw error;
      onRefresh();
    } catch (err: any) {
      alert("Fehler beim Löschen: " + err.message);
    }
  }

  async function handleUpdate(e: React.FormEvent) {
    e.preventDefault();
    if (!editingProp) return;
    setLoading(true);

    try {
      const { error } = await supabase
        .from("properties")
        .update({
          name: editingProp.name,
          address: editingProp.address,
          zip_code: editingProp.zip_code,
          city: editingProp.city,
        })
        .eq("id", editingProp.id);

      if (error) throw error;
      setEditingProp(null);
      onRefresh();
    } catch (err: any) {
      alert("Fehler beim Aktualisieren: " + err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="p-6 space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {properties.map((property) => (
          <div key={property.id} className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between">
            <div>
              <h3 className="font-bold text-slate-800 text-sm mb-1">{property.name}</h3>
              <p className="text-xs text-slate-500">{property.address}</p>
              <p className="text-xs text-slate-500">{property.zip_code} {property.city}</p>
            </div>
            <div className="flex justify-end gap-2 pt-4 mt-2 border-t border-slate-100">
              <button
                onClick={() => setEditingProp(property)}
                className="text-xs text-blue-600 hover:text-blue-800 font-semibold px-2 py-1 rounded hover:bg-blue-50"
              >
                Bearbeiten
              </button>
              <button
                onClick={() => handleDelete(property.id)}
                className="text-xs text-red-600 hover:text-red-800 font-semibold px-2 py-1 rounded hover:bg-red-50"
              >
                Löschen
              </button>
            </div>
          </div>
        ))}
      </div>

      {editingProp && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
            <h3 className="text-sm font-bold text-slate-900 mb-4">Objekt bearbeiten</h3>
            <form onSubmit={handleUpdate} className="space-y-3 text-xs">
              <div>
                <label className="font-semibold block mb-1">Bezeichnung</label>
                <input
                  type="text"
                  required
                  value={editingProp.name}
                  onChange={(e) => setEditingProp({ ...editingProp, name: e.target.value })}
                  className="w-full rounded border border-slate-300 p-2"
                />
              </div>
              <div>
                <label className="font-semibold block mb-1">Straße & Hausnummer</label>
                <input
                  type="text"
                  required
                  value={editingProp.address}
                  onChange={(e) => setEditingProp({ ...editingProp, address: e.target.value })}
                  className="w-full rounded border border-slate-300 p-2"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="font-semibold block mb-1">PLZ</label>
                  <input
                    type="text"
                    required
                    value={editingProp.zip_code}
                    onChange={(e) => setEditingProp({ ...editingProp, zip_code: e.target.value })}
                    className="w-full rounded border border-slate-300 p-2"
                  />
                </div>
                <div>
                  <label className="font-semibold block mb-1">Stadt</label>
                  <input
                    type="text"
                    required
                    value={editingProp.city}
                    onChange={(e) => setEditingProp({ ...editingProp, city: e.target.value })}
                    className="w-full rounded border border-slate-300 p-2"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-4">
                <button type="button" onClick={() => setEditingProp(null)} className="rounded border px-4 py-2 font-semibold text-slate-600">
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

export default PropertiesTab;