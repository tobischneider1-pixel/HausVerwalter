"use client";

import React, { useState, useEffect, useMemo } from "react";
import { supabase } from "@/lib/supabase";
import { Tenant } from "@/types";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  tenants: Tenant[];
  initialTenantId?: string;
  initialMonth?: string; // "YYYY-MM"
  initialAmount?: number | string;
  initialStatus?: string;
}

export function AddPaymentModal({
  isOpen,
  onClose,
  onSuccess,
  tenants = [],
  initialTenantId = "",
  initialMonth = "",
  initialAmount = "",
  initialStatus = "pünktlich",
}: Props) {
  const currentMonthStr = useMemo(() => {
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, "0");
    return `${year}-${month}`;
  }, []);

  const [tenantId, setTenantId] = useState(initialTenantId);
  const [rentMonth, setRentMonth] = useState(initialMonth || currentMonthStr);
  const [amount, setAmount] = useState<string>(initialAmount ? String(initialAmount) : "");
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split("T")[0]);
  const [type, setType] = useState("Miete");
  const [status, setStatus] = useState(initialStatus);
  const [notes, setNotes] = useState("");

  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Bei Öffnen oder Prop-Änderungen initialisieren
  useEffect(() => {
    if (isOpen) {
      const month = initialMonth || currentMonthStr;
      setRentMonth(month);
      setTenantId(initialTenantId);
      setStatus(initialStatus || "pünktlich");
      setNotes(initialStatus === "Teilzahlung" ? `Teilzahlung für ${month}` : "");
      setErrorMsg(null);

      const todayStr = new Date().toISOString().split("T")[0];
      const isPast = month < todayStr.slice(0, 7);
      setPaymentDate(isPast ? `${month}-03` : todayStr);

      if (initialAmount) {
        setAmount(String(initialAmount));
      } else if (initialTenantId) {
        const found = tenants.find((t) => String(t.id) === String(initialTenantId));
        if (found) {
          const rent = found.warm_rent || (found.rent_amount || 0) + (found.utility_advance || 0);
          setAmount(rent > 0 ? String(rent) : "");
        }
      } else {
        setAmount("");
      }
    }
  }, [isOpen, initialTenantId, initialMonth, initialAmount, initialStatus, currentMonthStr, tenants]);

  // Wenn Mieter im Dropdown geändert wird
  const handleTenantChange = (newTId: string) => {
    setTenantId(newTId);
    if (!amount) {
      const found = tenants.find((t) => String(t.id) === String(newTId));
      if (found) {
        const rent = found.warm_rent || (found.rent_amount || 0) + (found.utility_advance || 0);
        if (rent > 0) setAmount(String(rent));
      }
    }
  };

  // Wenn Betrag manuell geändert wird: Bei Teilbetrag Status anpassen
  const handleAmountChange = (val: string) => {
    setAmount(val);
    const num = parseFloat(val) || 0;
    const found = tenants.find((t) => String(t.id) === String(tenantId));
    if (found) {
      const expectedRent = found.warm_rent || (found.rent_amount || 0) + (found.utility_advance || 0);
      if (expectedRent > 0 && num > 0 && num < expectedRent) {
        setStatus("Teilzahlung");
      } else if (num >= expectedRent) {
        setStatus("pünktlich");
      }
    }
  };

  if (!isOpen) return null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setErrorMsg(null);

    try {
      const dueDate = `${rentMonth}-01`;
      const numAmount = parseFloat(amount) || 0;

      if (numAmount <= 0) {
        throw new Error("Bitte gib einen Betrag größer als 0 € ein.");
      }

      const { error } = await supabase.from("payments").insert([
        {
          tenant_id: tenantId,
          amount: numAmount,
          payment_date: paymentDate,
          due_date: dueDate,
          type: type,
          status: status,
          notes: notes || `Miete ${rentMonth}`,
        },
      ]);

      if (error) throw error;

      onSuccess();
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || "Fehler beim Eintragen der Zahlung.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl border border-slate-200 my-6">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            💳 Zahlung erfassen / verbuchen
          </h3>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 font-bold text-base p-1 cursor-pointer"
          >
            ✕
          </button>
        </div>

        {errorMsg && (
          <div className="mb-3 text-xs text-red-600 bg-red-50 p-2.5 rounded-lg border border-red-200">
            {errorMsg}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3.5 text-xs">
          {/* Mieter */}
          <div>
            <label className="font-semibold block mb-1 text-slate-700">Mieter auswählen</label>
            <select
              required
              value={tenantId}
              onChange={(e) => handleTenantChange(e.target.value)}
              className="w-full rounded-lg border border-slate-300 p-2 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium"
            >
              <option value="">Bitte Mieter wählen...</option>
              {tenants.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.first_name} {t.last_name} ({t.units?.unit_number ? `Einheit ${t.units.unit_number}` : "Ohne Einheit"})
                </option>
              ))}
            </select>
          </div>

          {/* Abrechnungsmonat */}
          <div className="bg-blue-50/60 p-3 rounded-xl border border-blue-100">
            <label className="font-bold block mb-1 text-blue-900">
              📅 Abrechnungsmonat (Miete für welchen Monat?)
            </label>
            <input
              type="month"
              required
              value={rentMonth}
              onChange={(e) => setRentMonth(e.target.value)}
              className="w-full rounded-lg border border-blue-200 bg-white p-2 font-bold text-blue-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <span className="text-[10px] text-blue-600 mt-1 block">
              Die Zahlung wird in der Soll/Ist-Übersicht genau diesem Monat zugeordnet.
            </span>
          </div>

          {/* Betrag & Zahlungsart */}
          <div className="grid grid-cols-2 gap-2.5">
            <div>
              <label className="font-semibold block mb-1 text-slate-700">Betrag (€)</label>
              <input
                type="number"
                step="0.01"
                required
                value={amount}
                onChange={(e) => handleAmountChange(e.target.value)}
                placeholder="z. B. 1000.00"
                className="w-full rounded-lg border border-slate-300 p-2 font-bold text-emerald-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="font-semibold block mb-1 text-slate-700">Zahlungsart</label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value)}
                className="w-full rounded-lg border border-slate-300 p-2 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium"
              >
                <option value="Miete">Miete</option>
                <option value="Nebenkosten">Nebenkosten</option>
                <option value="Kaution">Kaution</option>
                <option value="Sonstiges">Sonstiges</option>
              </select>
            </div>
          </div>

          {/* Zahlungsdatum (Bankeingang) & Status */}
          <div className="grid grid-cols-2 gap-2.5">
            <div>
              <label className="font-semibold block mb-1 text-slate-700">Zahlungseingang am</label>
              <input
                type="date"
                required
                value={paymentDate}
                onChange={(e) => setPaymentDate(e.target.value)}
                className="w-full rounded-lg border border-slate-300 p-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="font-semibold block mb-1 text-slate-700">Status</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="w-full rounded-lg border border-slate-300 p-2 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium"
              >
                <option value="pünktlich">🟢 pünktlich</option>
                <option value="Teilzahlung">🟡 Teilzahlung</option>
                <option value="verspätet">🟠 verspätet</option>
              </select>
            </div>
          </div>

          {/* Notizen */}
          <div>
            <label className="font-semibold block mb-1 text-slate-700">Notiz / Verwendungszweck (optional)</label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="z. B. Überweisung Bank / 1. Rate"
              className="w-full rounded-lg border border-slate-300 p-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Buttons */}
          <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="rounded-lg border border-slate-300 px-4 py-2 font-semibold text-slate-600 hover:bg-slate-50 transition-colors cursor-pointer"
            >
              Abbrechen
            </button>
            <button
              type="submit"
              disabled={loading}
              className="rounded-lg bg-blue-600 px-5 py-2 font-bold text-white hover:bg-blue-500 disabled:opacity-50 shadow-sm transition-colors cursor-pointer"
            >
              {loading ? "Speichert..." : "Zahlung speichern"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default AddPaymentModal;