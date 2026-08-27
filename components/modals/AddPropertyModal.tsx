"use client";

import React, { useState } from "react";
import { supabase } from "@/lib/supabase";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function AddPropertyModal({ isOpen, onClose, onSuccess }: Props) {
  const [newProp, setNewProp] = useState({ name: "", address: "", zip_code: "", city: "" });
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setErrorMsg(null);

    try {
      const { error } = await supabase.from("properties").insert([newProp]);
      if (error) throw error;
      setNewProp({ name: "", address: "", zip_code: "", city: "" });
      onSuccess();
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || "Fehler beim Speichern des Objekts.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
        <h3 className="text-sm font-bold text-slate-900 mb-4">Neues Objekt anlegen</h3>
        {errorMsg && <div className="mb-3 text-xs text-red-600 bg-red-50 p-2.5 rounded border border-red-200">{errorMsg}</div>}
        <form onSubmit={handleSubmit} className="space-y-3 text-xs">
          <div>
            <label className="font-semibold block mb-1 text-slate-700">Bezeichnung</label>
            <input
              type="text"
              required
              value={newProp.name}
              onChange={(e) => setNewProp({ ...newProp, name: e.target.value })}
              className="w-full rounded border border-slate-300 p-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="z. B. Mehrfamilienhaus Hauptstr. 10"
            />
          </div>
          <div>
            <label className="font-semibold block mb-1 text-slate-700">Straße & Hausnummer</label>
            <input
              type="text"
              required
              value={newProp.address}
              onChange={(e) => setNewProp({ ...newProp, address: e.target.value })}
              className="w-full rounded border border-slate-300 p-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="font-semibold block mb-1 text-slate-700">PLZ</label>
              <input
                type="text"
                required
                value={newProp.zip_code}
                onChange={(e) => setNewProp({ ...newProp, zip_code: e.target.value })}
                className="w-full rounded border border-slate-300 p-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="font-semibold block mb-1 text-slate-700">Stadt</label>
              <input
                type="text"
                required
                value={newProp.city}
                onChange={(e) => setNewProp({ ...newProp, city: e.target.value })}
                className="w-full rounded border border-slate-300 p-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-4">
            <button type="button" onClick={onClose} disabled={loading} className="rounded border border-slate-300 px-4 py-2 font-semibold text-slate-600 hover:bg-slate-50">
              Abbrechen
            </button>
            <button type="submit" disabled={loading} className="rounded bg-blue-600 px-4 py-2 font-semibold text-white hover:bg-blue-500 disabled:opacity-50">
              {loading ? "Speichert..." : "Speichern"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default AddPropertyModal;