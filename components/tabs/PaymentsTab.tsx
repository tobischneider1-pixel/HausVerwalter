"use client";

import React, { useState, useMemo } from "react";
import { Payment, Tenant, Property, Unit, TenantRentStatus } from "@/types";
import { supabase } from "@/lib/supabase";
import CreateDunningModal from "@/components/modals/CreateDunningModal";
import AddPaymentModal from "@/components/modals/AddPaymentModal";

interface Props {
  payments: Payment[];
  tenants?: Tenant[];
  properties?: Property[];
  units?: Unit[];
  onRefresh?: () => void;
}

// Hilfsfunktion: Ermittelt den Abrechnungsmonat (YYYY-MM) einer Zahlung
export const getPaymentMonth = (p: Payment): string => {
  if (p.due_date && p.due_date.length >= 7) {
    return p.due_date.slice(0, 7);
  }
  if (p.payment_date && p.payment_date.length >= 7) {
    return p.payment_date.slice(0, 7);
  }
  return "";
};

export default function PaymentsTab({
  payments = [],
  tenants = [],
  properties = [],
  units = [],
  onRefresh,
}: Props) {
  const [activeSubTab, setActiveSubTab] = useState<"status" | "history">("status");

  // Aktueller Monat als Standard (YYYY-MM)
  const currentMonthStr = useMemo(() => {
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, "0");
    return `${year}-${month}`;
  }, []);

  const [selectedMonth, setSelectedMonth] = useState<string>(currentMonthStr);
  const [selectedPropertyId, setSelectedPropertyId] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<"all" | "open" | "partial" | "paid">("all");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [historyMonthFilter, setHistoryMonthFilter] = useState<"selected" | "all">("selected");

  // Modal State für Mahnung
  const [dunningModalData, setDunningModalData] = useState<{
    isOpen: boolean;
    tenant: Tenant | null;
    openAmount: number;
    property?: Property;
    unit?: Unit;
  }>({
    isOpen: false,
    tenant: null,
    openAmount: 0,
  });

  // Modal State für neue / individuelle Zahlung
  const [paymentModalData, setPaymentModalData] = useState<{
    isOpen: boolean;
    initialTenantId: string;
    initialMonth: string;
    initialAmount: number | string;
    initialStatus: string;
  }>({
    isOpen: false,
    initialTenantId: "",
    initialMonth: currentMonthStr,
    initialAmount: "",
    initialStatus: "pünktlich",
  });

  const [quickBookingLoading, setQuickBookingLoading] = useState<string | null>(null);

  // Monats-Navigation Vor / Zurück
  const changeMonth = (offset: number) => {
    const [year, month] = selectedMonth.split("-").map(Number);
    const date = new Date(year, month - 1 + offset, 1);
    const newYear = date.getFullYear();
    const newMonth = String(date.getMonth() + 1).padStart(2, "0");
    setSelectedMonth(`${newYear}-${newMonth}`);
  };

  const formattedSelectedMonth = useMemo(() => {
    const [year, month] = selectedMonth.split("-").map(Number);
    const date = new Date(year, month - 1, 1);
    return date.toLocaleDateString("de-DE", { month: "long", year: "numeric" });
  }, [selectedMonth]);

  // Gefilterte Mieter basierend auf gewähltem Objekt
  const filteredTenants = useMemo(() => {
    return tenants.filter((t) => {
      if (selectedPropertyId === "all") return true;
      const u = units.find((unit) => String(unit.id) === String(t.unit_id));
      return u && String(u.property_id) === String(selectedPropertyId);
    });
  }, [tenants, units, selectedPropertyId]);

  // Berechnung Soll/Ist Status pro Mieter für den gewählten Monat
  const tenantRentStatuses: TenantRentStatus[] = useMemo(() => {
    return filteredTenants.map((tenant) => {
      const expectedRent =
        tenant.warm_rent || (tenant.rent_amount || 0) + (tenant.utility_advance || 0) || 0;

      // Alle Zahlungen dieses Mieters, deren Abrechnungsmonat (due_date bzw. payment_date) dem gewählten Monat entspricht
      const monthPayments = payments.filter((p) => {
        if (String(p.tenant_id) !== String(tenant.id)) return false;
        return getPaymentMonth(p) === selectedMonth;
      });

      const paidAmount = monthPayments.reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
      const openAmount = Math.max(0, Math.round((expectedRent - paidAmount) * 100) / 100);

      let status: "paid" | "partial" | "open" = "open";
      if (paidAmount >= expectedRent && expectedRent > 0) {
        status = "paid";
      } else if (paidAmount > 0) {
        status = "partial";
      } else {
        status = "open";
      }

      return {
        tenant,
        expectedRent,
        paidAmount,
        openAmount,
        status,
        payments: monthPayments,
      };
    });
  }, [filteredTenants, payments, selectedMonth]);

  // Summen & Kennzahlen für den Monat
  const kpis = useMemo(() => {
    const totalExpected = tenantRentStatuses.reduce((acc, s) => acc + s.expectedRent, 0);
    const totalPaid = tenantRentStatuses.reduce((acc, s) => acc + s.paidAmount, 0);
    const totalOpen = tenantRentStatuses.reduce((acc, s) => acc + s.openAmount, 0);
    const openCount = tenantRentStatuses.filter((s) => s.status !== "paid" && s.expectedRent > 0).length;
    const paymentRate = totalExpected > 0 ? Math.min(100, Math.round((totalPaid / totalExpected) * 100)) : 100;

    return { totalExpected, totalPaid, totalOpen, openCount, paymentRate };
  }, [tenantRentStatuses]);

  // Tabelle filtern (nach Status und Suchbegriff)
  const displayedStatuses = useMemo(() => {
    return tenantRentStatuses.filter((item) => {
      if (statusFilter !== "all" && item.status !== statusFilter) return false;

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const fullName = `${item.tenant.first_name} ${item.tenant.last_name}`.toLowerCase();
        const unitNumber = item.tenant.units?.unit_number?.toLowerCase() || "";
        return fullName.includes(q) || unitNumber.includes(q);
      }
      return true;
    });
  }, [tenantRentStatuses, statusFilter, searchQuery]);

  // Historie Zahlungen filtern
  const displayedHistoryPayments = useMemo(() => {
    return payments.filter((p) => {
      if (historyMonthFilter === "selected" && getPaymentMonth(p) !== selectedMonth) {
        return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const tenantName = p.tenants
          ? `${p.tenants.first_name} ${p.tenants.last_name}`.toLowerCase()
          : "";
        return tenantName.includes(q) || (p.notes || "").toLowerCase().includes(q);
      }
      return true;
    });
  }, [payments, historyMonthFilter, selectedMonth, searchQuery]);

  // Schnellverbuchung: Restlichen Soll-Betrag als bezahlt für den gewählten Monat erfassen
  const handleQuickBookPayment = async (statusItem: TenantRentStatus) => {
    const { tenant, openAmount } = statusItem;
    if (openAmount <= 0) return;

    setQuickBookingLoading(tenant.id);
    try {
      const dueDate = `${selectedMonth}-01`;
      const todayStr = new Date().toISOString().split("T")[0];
      const isPast = selectedMonth < todayStr.slice(0, 7);
      // Wenn der Monat in der Vergangenheit liegt (z. B. August), buchen wir das Zahlungsdatum in diesen Monat (03.)
      const paymentDate = isPast ? `${selectedMonth}-03` : todayStr;

      const { error } = await supabase.from("payments").insert([
        {
          tenant_id: tenant.id,
          amount: openAmount,
          payment_date: paymentDate,
          due_date: dueDate,
          type: "Miete",
          status: "pünktlich",
          notes: `Schnellverbuchung Miete ${formattedSelectedMonth}`,
        },
      ]);

      if (error) throw error;
      if (onRefresh) onRefresh();
    } catch (err: any) {
      alert("Fehler bei der Schnellverbuchung: " + err.message);
    } finally {
      setQuickBookingLoading(null);
    }
  };

  // Individuelle Zahlung / Teilzahlung für einen konkreten Mieter öffnen
  const openPaymentForTenant = (statusItem: TenantRentStatus) => {
    setPaymentModalData({
      isOpen: true,
      initialTenantId: statusItem.tenant.id,
      initialMonth: selectedMonth,
      initialAmount: statusItem.openAmount > 0 ? statusItem.openAmount : "",
      initialStatus: statusItem.paidAmount > 0 ? "Teilzahlung" : "pünktlich",
    });
  };

  // Zahlungseintrag aus Historie löschen
  const handleDeletePayment = async (id: string) => {
    if (!confirm("Möchtest du diese Zahlung wirklich löschen?")) return;

    try {
      const { error } = await supabase.from("payments").delete().eq("id", id);
      if (error) throw error;
      if (onRefresh) onRefresh();
    } catch (err: any) {
      alert("Fehler beim Löschen der Zahlung: " + err.message);
    }
  };

  // Mahnmodal öffnen
  const openDunningForTenant = (statusItem: TenantRentStatus) => {
    const { tenant, openAmount } = statusItem;
    const unit = units.find((u) => String(u.id) === String(tenant.unit_id));
    const property = properties.find((p) => String(p.id) === String(unit?.property_id));

    setDunningModalData({
      isOpen: true,
      tenant,
      openAmount,
      property,
      unit,
    });
  };

  return (
    <div className="space-y-6 text-xs text-slate-800">
      {/* Kopfbereich & Monatsselektor */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            💳 Zahlungsabgleich & Mietüberwachung
          </h2>
          <p className="text-slate-500 text-xs">
            Soll/Ist-Vergleich aller Mieten, Zahlungsrückstände und integriertes Mahnwesen.
          </p>
        </div>

        {/* Monatswechsler */}
        <div className="flex items-center gap-2 bg-slate-100 p-1.5 rounded-xl border border-slate-200">
          <button
            onClick={() => changeMonth(-1)}
            className="p-1.5 hover:bg-white rounded-lg text-slate-700 transition-colors font-bold cursor-pointer"
            title="Vorheriger Monat"
          >
            ◀
          </button>
          <div className="px-3 py-1 font-bold text-slate-800 text-xs tracking-wide min-w-[140px] text-center">
            📅 {formattedSelectedMonth}
          </div>
          <button
            onClick={() => changeMonth(1)}
            className="p-1.5 hover:bg-white rounded-lg text-slate-700 transition-colors font-bold cursor-pointer"
            title="Nächster Monat"
          >
            ▶
          </button>
          <button
            onClick={() => setSelectedMonth(currentMonthStr)}
            className="ml-1 px-2.5 py-1 text-[10px] font-semibold bg-white text-slate-700 hover:bg-slate-200/70 rounded-md border border-slate-200 transition-colors cursor-pointer"
          >
            Heute
          </button>
        </div>
      </div>

      {/* KPI-Karten für den gewählten Monat */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
            Soll-Mieten ({formattedSelectedMonth})
          </span>
          <p className="text-2xl font-black text-slate-800 mt-1">
            {kpis.totalExpected.toLocaleString("de-DE", { style: "currency", currency: "EUR" })}
          </p>
          <span className="text-[10px] text-slate-400">aus {tenantRentStatuses.length} Mietverhältnissen</span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
            Bereits eingegangen (Ist)
          </span>
          <p className="text-2xl font-black text-emerald-600 mt-1">
            {kpis.totalPaid.toLocaleString("de-DE", { style: "currency", currency: "EUR" })}
          </p>
          <div className="w-full bg-slate-100 rounded-full h-1.5 mt-2 overflow-hidden">
            <div
              className="bg-emerald-500 h-1.5 rounded-full transition-all"
              style={{ width: `${kpis.paymentRate}%` }}
            />
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
            Offener Rückstand
          </span>
          <p className={`text-2xl font-black mt-1 ${kpis.totalOpen > 0 ? "text-red-600" : "text-emerald-600"}`}>
            {kpis.totalOpen.toLocaleString("de-DE", { style: "currency", currency: "EUR" })}
          </p>
          <span className="text-[10px] text-slate-500">
            {kpis.openCount > 0 ? `⚠️ ${kpis.openCount} Mieter säumig` : "✓ Alle Mieten bezahlt"}
          </span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
            Einholungsquote
          </span>
          <p className="text-2xl font-black text-blue-600 mt-1">{kpis.paymentRate}%</p>
          <span className="text-[10px] text-slate-400">Erfüllungsgrad für diesen Monat</span>
        </div>
      </div>

      {/* Filterleiste & Ansichtswechsler */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col md:flex-row justify-between items-stretch md:items-center gap-3">
        {/* Ansicht-Tabs */}
        <div className="flex bg-slate-100 p-1 rounded-lg border border-slate-200 w-fit">
          <button
            onClick={() => setActiveSubTab("status")}
            className={`px-3 py-1.5 rounded-md font-semibold text-xs transition-colors cursor-pointer ${
              activeSubTab === "status"
                ? "bg-white text-slate-800 shadow-xs font-bold"
                : "text-slate-500 hover:text-slate-800"
            }`}
          >
            📊 Soll/Ist-Überwachung ({tenantRentStatuses.length})
          </button>
          <button
            onClick={() => setActiveSubTab("history")}
            className={`px-3 py-1.5 rounded-md font-semibold text-xs transition-colors cursor-pointer ${
              activeSubTab === "history"
                ? "bg-white text-slate-800 shadow-xs font-bold"
                : "text-slate-500 hover:text-slate-800"
            }`}
          >
            📜 Zahlungshistorie ({payments.length})
          </button>
        </div>

        {/* Filter-Elemente */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Suche */}
          <input
            type="text"
            placeholder="Mieter / Einheit suchen..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs outline-none focus:ring-2 focus:ring-blue-500 w-44"
          />

          {/* Objekt-Filter */}
          <select
            value={selectedPropertyId}
            onChange={(e) => setSelectedPropertyId(e.target.value)}
            className="p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs outline-none cursor-pointer"
          >
            <option value="all">🏢 Alle Objekte</option>
            {properties.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>

          {/* Status-Filter bei Soll/Ist */}
          {activeSubTab === "status" && (
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
              className="p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs outline-none cursor-pointer"
            >
              <option value="all">Alle Status</option>
              <option value="open">🔴 Nur Offen (Rückstand)</option>
              <option value="partial">🟡 Nur Teilzahlung</option>
              <option value="paid">🟢 Vollständig bezahlt</option>
            </select>
          )}

          {/* Monatsfilter bei Historie */}
          {activeSubTab === "history" && (
            <select
              value={historyMonthFilter}
              onChange={(e) => setHistoryMonthFilter(e.target.value as any)}
              className="p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs outline-none cursor-pointer"
            >
              <option value="selected">📅 Nur {formattedSelectedMonth}</option>
              <option value="all">🌐 Alle Monate anzeigen</option>
            </select>
          )}

          {/* Neue Zahlung erfassen Button */}
          <button
            onClick={() =>
              setPaymentModalData({
                isOpen: true,
                initialTenantId: "",
                initialMonth: selectedMonth,
                initialAmount: "",
                initialStatus: "pünktlich",
              })
            }
            className="bg-blue-600 hover:bg-blue-500 text-white px-3.5 py-2 rounded-lg font-bold text-xs flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
          >
            ➕ Zahlung erfassen
          </button>
        </div>
      </div>

      {/* HAUPTANSICHT 1: Soll/Ist-Überwachung pro Mieter */}
      {activeSubTab === "status" && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 text-[10px] uppercase font-bold tracking-wider">
                  <th className="py-3 px-4">Mieter / Einheit</th>
                  <th className="py-3 px-4">Soll-Warmmiete</th>
                  <th className="py-3 px-4">Ist-Eingang</th>
                  <th className="py-3 px-4">Offener Betrag</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Aktionen & Mahnwesen</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {displayedStatuses.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-slate-400 italic">
                      Keine Mieter für die gewählten Filterkriterien gefunden.
                    </td>
                  </tr>
                ) : (
                  displayedStatuses.map((item) => {
                    const { tenant, expectedRent, paidAmount, openAmount, status } = item;
                    const tenantName = `${tenant.first_name} ${tenant.last_name}`;
                    const unitName = tenant.units?.unit_number
                      ? `Einheit ${tenant.units.unit_number}`
                      : "Ohne Einheit";
                    const propName = tenant.units?.properties?.name || "";

                    return (
                      <tr key={tenant.id} className="hover:bg-slate-50/70 transition-colors">
                        <td className="py-3 px-4">
                          <div className="font-bold text-slate-900">{tenantName}</div>
                          <div className="text-[11px] text-slate-400">
                            {unitName} {propName ? `• ${propName}` : ""}
                          </div>
                        </td>

                        <td className="py-3 px-4 font-semibold text-slate-700">
                          {expectedRent.toLocaleString("de-DE", { style: "currency", currency: "EUR" })}
                        </td>

                        <td className="py-3 px-4 font-semibold text-emerald-600">
                          {paidAmount.toLocaleString("de-DE", { style: "currency", currency: "EUR" })}
                        </td>

                        <td className="py-3 px-4">
                          {openAmount > 0 ? (
                            <span className="font-bold text-red-600">
                              {openAmount.toLocaleString("de-DE", { style: "currency", currency: "EUR" })}
                            </span>
                          ) : (
                            <span className="text-slate-400 font-medium">0,00 €</span>
                          )}
                        </td>

                        <td className="py-3 px-4">
                          {status === "paid" && (
                            <span className="bg-emerald-100 text-emerald-800 px-2.5 py-1 rounded-full text-[10px] font-bold inline-flex items-center gap-1">
                              ✓ Bezahlt
                            </span>
                          )}
                          {status === "partial" && (
                            <span className="bg-amber-100 text-amber-800 px-2.5 py-1 rounded-full text-[10px] font-bold inline-flex items-center gap-1">
                              ⚠️ Teilzahlung
                            </span>
                          )}
                          {status === "open" && (
                            <span className="bg-red-100 text-red-800 px-2.5 py-1 rounded-full text-[10px] font-bold inline-flex items-center gap-1">
                              ✕ Offen
                            </span>
                          )}
                        </td>

                        <td className="py-3 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5 flex-wrap">
                            {openAmount > 0 && (
                              <>
                                {/* Mahnschreiben erzeugen */}
                                <button
                                  onClick={() => openDunningForTenant(item)}
                                  className="bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300/80 px-2.5 py-1 rounded-lg font-bold text-[11px] flex items-center gap-1 transition-colors cursor-pointer shadow-xs"
                                  title="Mahnung oder Zahlungserinnerung als PDF erstellen & in Dokumenten ablegen"
                                >
                                  📜 Mahnung
                                </button>

                                {/* Teilzahlung oder individueller Betrag */}
                                <button
                                  onClick={() => openPaymentForTenant(item)}
                                  className="bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 px-2.5 py-1 rounded-lg font-bold text-[11px] flex items-center gap-1 transition-colors cursor-pointer"
                                  title="Teilzahlung oder individuellen Betrag für diesen Mieter erfassen"
                                >
                                  ➕ Teilzahlung
                                </button>

                                {/* 1-Klick Vollständige Verbuchung */}
                                <button
                                  onClick={() => handleQuickBookPayment(item)}
                                  disabled={quickBookingLoading === tenant.id}
                                  className="bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300/80 px-2.5 py-1 rounded-lg font-bold text-[11px] flex items-center gap-1 transition-colors cursor-pointer disabled:opacity-50"
                                  title="Restlichen Betrag als vollständig bezahlt verbuchen"
                                >
                                  {quickBookingLoading === tenant.id ? "..." : "✓ Bezahlt buchen"}
                                </button>
                              </>
                            )}

                            {openAmount === 0 && (
                              <div className="flex items-center gap-2">
                                <span className="text-[11px] text-emerald-600 font-semibold pr-1">
                                  ✓ Vollständig
                                </span>
                                <button
                                  onClick={() => openPaymentForTenant(item)}
                                  className="bg-slate-50 hover:bg-slate-100 text-slate-600 border border-slate-200 px-2 py-0.5 rounded text-[10px] font-medium transition-colors cursor-pointer"
                                  title="Weitere Zahlung (z.B. Kaution, Sonderzahlung) erfassen"
                                >
                                  + Zahlung
                                </button>
                              </div>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* HAUPTANSICHT 2: Historische Buchungen / Tabelle */}
      {activeSubTab === "history" && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 text-[10px] uppercase font-bold tracking-wider">
                  <th className="py-3 px-4">Zahlungseingang</th>
                  <th className="py-3 px-4">Mietmonat</th>
                  <th className="py-3 px-4">Mieter</th>
                  <th className="py-3 px-4">Art</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Notizen</th>
                  <th className="py-3 px-4 text-right">Betrag</th>
                  <th className="py-3 px-4 text-center">Aktion</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {displayedHistoryPayments.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-8 text-center text-slate-400 italic">
                      Keine Zahlungsbuchungen für diese Auswahl gefunden.
                    </td>
                  </tr>
                ) : (
                  displayedHistoryPayments.map((p) => {
                    const paymentMonth = getPaymentMonth(p);
                    return (
                      <tr key={p.id} className="hover:bg-slate-50/70 transition-colors">
                        <td className="py-3 px-4 text-slate-600 font-medium">{p.payment_date}</td>
                        <td className="py-3 px-4">
                          <span className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded text-[10px] font-mono font-semibold">
                            {paymentMonth || "-"}
                          </span>
                        </td>
                        <td className="py-3 px-4 font-bold text-slate-800">
                          {p.tenants ? `${p.tenants.first_name} ${p.tenants.last_name}` : "-"}
                        </td>
                        <td className="py-3 px-4 text-slate-600">{p.type}</td>
                        <td className="py-3 px-4">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                              p.status === "pünktlich"
                                ? "bg-emerald-100 text-emerald-800"
                                : p.status === "Teilzahlung"
                                ? "bg-amber-100 text-amber-800"
                                : "bg-red-100 text-red-800"
                            }`}
                          >
                            {p.status}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-slate-500 text-[11px]">{p.notes || "-"}</td>
                        <td className="py-3 px-4 text-right font-bold text-emerald-600 text-sm">
                          {Number(p.amount).toLocaleString("de-DE", { style: "currency", currency: "EUR" })}
                        </td>
                        <td className="py-3 px-4 text-center">
                          <button
                            onClick={() => handleDeletePayment(p.id)}
                            className="text-slate-400 hover:text-red-600 p-1 rounded transition-colors cursor-pointer text-xs"
                            title="Zahlungseintrag löschen"
                          >
                            🗑️
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Mahnungs-Modal */}
      {dunningModalData.isOpen && dunningModalData.tenant && (
        <CreateDunningModal
          isOpen={dunningModalData.isOpen}
          onClose={() =>
            setDunningModalData({
              isOpen: false,
              tenant: null,
              openAmount: 0,
            })
          }
          onSuccess={() => {
            if (onRefresh) onRefresh();
          }}
          tenant={dunningModalData.tenant}
          property={dunningModalData.property}
          unit={dunningModalData.unit}
          monthStr={selectedMonth}
          openAmount={dunningModalData.openAmount}
        />
      )}

      {/* Zahlung erfassen / Teilzahlung Modal */}
      <AddPaymentModal
        isOpen={paymentModalData.isOpen}
        onClose={() =>
          setPaymentModalData({
            isOpen: false,
            initialTenantId: "",
            initialMonth: selectedMonth,
            initialAmount: "",
            initialStatus: "pünktlich",
          })
        }
        onSuccess={() => {
          if (onRefresh) onRefresh();
        }}
        tenants={tenants}
        initialTenantId={paymentModalData.initialTenantId}
        initialMonth={paymentModalData.initialMonth}
        initialAmount={paymentModalData.initialAmount}
        initialStatus={paymentModalData.initialStatus}
      />
    </div>
  );
}