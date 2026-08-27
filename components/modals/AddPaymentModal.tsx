"use client";

import React, { useState } from "react";
import { supabase } from "@/lib/supabase";
import { Tenant } from "@/types";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  tenants: Tenant[];
}

export function AddPaymentModal({ isOpen, onClose, onSuccess, tenants }: Props) {
  const [newPayment, setNewPayment] = useState({
    tenant_id: "",
    amount: "",
    payment_date: new Date().toISOString().split("T")[0],
    due_date: new Date().toISOString().split("T")[0],
    type: "Miete",
    status: "pünktlich",
    notes: "",
  });
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setErrorMsg(null);

    try {
      const { error } = await supabase.from("payments").insert([{
        tenant_id: newPayment.tenant_id,
        amount: parseFloat(newPayment.amount) || 0,
        payment_date: newPayment.payment_date,
        due_date: newPayment.due_date,
        type: newPayment.type,
        status: newPayment.status,
        notes: newPayment.notes,
      }]);
      if (error) throw error;
      setNewPayment({
        tenant_id: "",
        amount: "",
        payment_date: new Date().toISOString().split("T")[0],
        due_date: new Date().toISOString().split("T")[0],
        type: "Miete",
        status: "pünktlich",
        notes: "",
      });
      onSuccess();
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || "Fehler beim Eintragen der Zahlung.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
        <h3 className="text-sm font-bold text-slate-900 mb-4">Zahlung erfassen</h3>
        {errorMsg && <div className="mb-3 text-xs text-red-600 bg-red-50 p-2.5 rounded border border-red-200">{errorMsg}</div>}
        <form onSubmit={handleSubmit} className="space-y-3 text-xs">
          <div>
            <label className="font-semibold block mb-1 text-slate-700">Mieter</label>
            <select required value={newPayment.tenant_id} onChange={(e) => setNewPayment({ ...newPayment, tenant_id: e.target.value })} className="w-full rounded border border-slate-300 p-2 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500">
              <option value="">Mieter wählen...</option>
              {tenants.map((t) => (
                <option key={t.id} value={t.id}>{t.first_name} {t.last_name} ({t.units?.unit_number || "Ohne Einheit"})</option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="font-semibold block mb-1 text-slate-700">Betrag (€)</label>
              <input type="number" step="0.01" required value={newPayment.amount} onChange={(e) => setNewPayment({ ...newPayment, amount: e.target.value })} className="w-full rounded border border-slate-300 p-2 focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="font-semibold block mb-1 text-slate-700">Zahlungsart</label>
              <select value={newPayment.type} onChange={(e) => setNewPayment({ ...newPayment, type: e.target.value })} className="w-full rounded border border-slate-300 p-2 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option value="Miete">Miete</option>
                <option value="Nebenkosten">Nebenkosten</option>
                <option value="Kaution">Kaution</option>
                <option value="Sonstiges">Sonstiges</option>
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="font-semibold block mb-1 text-slate-700">Zahlungsdatum</label>
              <input type="date" required value={newPayment.payment_date} onChange={(e) => setNewPayment({ ...newPayment, payment_date: e.target.value })} className="w-full rounded border border-slate-300 p-2 focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="font-semibold block mb-1 text-slate-700">Fälligkeitsdatum</label>
              <input type="date" required value={newPayment.due_date} onChange={(e) => setNewPayment({ ...newPayment, due_date: e.target.value })} className="w-full rounded border border-slate-300 p-2 focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
          </div>
          <div>
            <label className="font-semibold block mb-1 text-slate-700">Status</label>
            <select value={newPayment.status} onChange={(e) => setNewPayment({ ...newPayment, status: e.target.value })} className="w-full rounded border border-slate-300 p-2 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500">
              <option value="pünktlich">pünktlich</option>
              <option value="verspätet">verspätet</option>
              <option value="Teilzahlung">Teilzahlung</option>
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

export default AddPaymentModal;