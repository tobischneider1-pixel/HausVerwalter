"use client";

import React, { useState } from "react";
import { supabase } from "@/lib/supabase";
import { Tenant, Unit } from "@/types";

interface Props {
  tenants: Tenant[];
  units: Unit[];
  onRefresh: () => void;
}

export function TenantsTab({ tenants, units, onRefresh }: Props) {
  const [editingTenant, setEditingTenant] = useState<Tenant | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleDelete(id: string) {
    if (!confirm("Möchtest du diesen Mieter wirklich löschen?")) return;
    try {
      const { error } = await supabase.from("tenants").delete().eq("id", id);
      if (error) throw error;
      onRefresh();
    } catch (err: any) {
      alert("Fehler beim Löschen: " + err.message);
    }
  }

  async function handleUpdate(e: React.FormEvent) {
    e.preventDefault();
    if (!editingTenant) return;
    setLoading(true);

    const rent = Number(editingTenant.rent_amount) || 0;
    const advance = Number(editingTenant.utility_advance) || 0;

    try {
      const { error } = await supabase
        .from("tenants")
        .update({
          unit_id: editingTenant.unit_id,
          first_name: editingTenant.first_name,
          last_name: editingTenant.last_name,
          email: editingTenant.email,
          phone: editingTenant.phone,
          rent_amount: rent,
          utility_advance: advance,
          warm_rent: rent + advance,
          start_date: editingTenant.start_date,
        })
        .eq("id", editingTenant.id);

      if (error) throw error;
      setEditingTenant(null);
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
              <th className="p-3">Name</th>
              <th className="p-3">Einheit</th>
              <th className="p-3">Kontakt</th>
              <th className="p-3">Kaltmiete</th>
              <th className="p-3">NK-Vorschuss</th>
              <th className="p-3">Warmmiete</th>
              <th className="p-3 text-right">Aktionen</th>
            </tr>
          </thead>
          <tbody>
            {tenants.map((tenant) => (
              <tr key={tenant.id} className="border-b border-slate-100 hover:bg-slate-50/50">
                <td className="p-3 font-medium text-slate-900">{tenant.first_name} {tenant.last_name}</td>
                <td className="p-3">{tenant.units?.unit_number || "-"}</td>
                <td className="p-3">
                  <div>{tenant.email}</div>
                  <div className="text-slate-400 text-[10px]">{tenant.phone}</div>
                </td>
                <td className="p-3">{tenant.rent_amount} €</td>
                <td className="p-3">{tenant.utility_advance} €</td>
                <td className="p-3 font-bold text-slate-800">{tenant.warm_rent} €</td>
                <td className="p-3 text-right space-x-2">
                  <button onClick={() => setEditingTenant(tenant)} className="text-blue-600 hover:underline font-semibold">
                    Bearbeiten
                  </button>
                  <button onClick={() => handleDelete(tenant.id)} className="text-red-600 hover:underline font-semibold">
                    Löschen
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Bearbeiten Modal */}
      {editingTenant && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
            <h3 className="text-sm font-bold text-slate-900 mb-4">Mieter bearbeiten</h3>
            <form onSubmit={handleUpdate} className="space-y-3 text-xs">
              <div>
                <label className="font-semibold block mb-1">Einheit</label>
                <select
                  value={editingTenant.unit_id}
                  onChange={(e) => setEditingTenant({ ...editingTenant, unit_id: e.target.value })}
                  className="w-full rounded border border-slate-300 p-2 bg-white"
                >
                  {units.map((u) => (
                    <option key={u.id} value={u.id}>{u.unit_number}</option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="font-semibold block mb-1">Vorname</label>
                  <input
                    type="text"
                    required
                    value={editingTenant.first_name}
                    onChange={(e) => setEditingTenant({ ...editingTenant, first_name: e.target.value })}
                    className="w-full rounded border border-slate-300 p-2"
                  />
                </div>
                <div>
                  <label className="font-semibold block mb-1">Nachname</label>
                  <input
                    type="text"
                    required
                    value={editingTenant.last_name}
                    onChange={(e) => setEditingTenant({ ...editingTenant, last_name: e.target.value })}
                    className="w-full rounded border border-slate-300 p-2"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="font-semibold block mb-1">E-Mail</label>
                  <input
                    type="email"
                    value={editingTenant.email || ""}
                    onChange={(e) => setEditingTenant({ ...editingTenant, email: e.target.value })}
                    className="w-full rounded border border-slate-300 p-2"
                  />
                </div>
                <div>
                  <label className="font-semibold block mb-1">Telefon</label>
                  <input
                    type="text"
                    value={editingTenant.phone || ""}
                    onChange={(e) => setEditingTenant({ ...editingTenant, phone: e.target.value })}
                    className="w-full rounded border border-slate-300 p-2"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="font-semibold block mb-1">Kaltmiete (€)</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={editingTenant.rent_amount}
                    onChange={(e) => setEditingTenant({ ...editingTenant, rent_amount: Number(e.target.value) })}
                    className="w-full rounded border border-slate-300 p-2"
                  />
                </div>
                <div>
                  <label className="font-semibold block mb-1">NK-Vorauszahlung (€)</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={editingTenant.utility_advance}
                    onChange={(e) => setEditingTenant({ ...editingTenant, utility_advance: Number(e.target.value) })}
                    className="w-full rounded border border-slate-300 p-2"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-4">
                <button type="button" onClick={() => setEditingTenant(null)} className="rounded border px-4 py-2 font-semibold text-slate-600">
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

export default TenantsTab;