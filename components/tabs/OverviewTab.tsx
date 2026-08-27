"use client";

import React from "react";
import { Property, Unit, Tenant, Payment } from "@/types";

interface Props {
  properties: Property[];
  units: Unit[];
  tenants: Tenant[];
  payments: Payment[];
}

export default function OverviewTab({ properties, units, tenants, payments }: Props) {
  const totalRent = tenants.reduce((sum, t) => sum + (t.warm_rent || 0), 0);
  const occupiedUnits = units.filter((u) => u.status === "vermietet").length;
  const occupancyRate = units.length > 0 ? Math.round((occupiedUnits / units.length) * 100) : 0;

  return (
    <div className="space-y-6 text-xs text-slate-800">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <span className="text-[10px] font-bold text-slate-400 uppercase">Objekte Gesamt</span>
          <p className="text-2xl font-extrabold text-slate-800 mt-1">{properties.length}</p>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <span className="text-[10px] font-bold text-slate-400 uppercase">Einheiten Gesamt</span>
          <p className="text-2xl font-extrabold text-slate-800 mt-1">{units.length}</p>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <span className="text-[10px] font-bold text-slate-400 uppercase">Vermietungsquote</span>
          <p className="text-2xl font-extrabold text-emerald-600 mt-1">{occupancyRate}%</p>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <span className="text-[10px] font-bold text-slate-400 uppercase">Soll-Einnahmen (mtl.)</span>
          <p className="text-2xl font-extrabold text-blue-600 mt-1">
            {totalRent.toLocaleString("de-DE", { style: "currency", currency: "EUR" })}
          </p>
        </div>
      </div>

      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
        <h3 className="font-bold text-slate-800 mb-3 text-sm">Letzte Zahlungseingänge</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 text-slate-400 text-[10px] uppercase">
                <th className="py-2">Datum</th>
                <th className="py-2">Mieter</th>
                <th className="py-2">Art</th>
                <th className="py-2 text-right">Betrag</th>
              </tr>
            </thead>
            <tbody>
              {payments.slice(0, 5).map((p) => (
                <tr key={p.id} className="border-b border-slate-100 hover:bg-slate-50">
                  <td className="py-2 text-slate-500">{p.payment_date}</td>
                  <td className="py-2 font-medium">
                    {p.tenants ? `${p.tenants.first_name} ${p.tenants.last_name}` : "Unbekannt"}
                  </td>
                  <td className="py-2 text-slate-500">{p.type}</td>
                  <td className="py-2 text-right font-semibold text-emerald-600">
                    +{p.amount.toLocaleString("de-DE", { style: "currency", currency: "EUR" })}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}