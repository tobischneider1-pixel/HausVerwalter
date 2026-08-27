"use client";

import React from "react";
import { Payment } from "@/types";

interface Props {
  payments: Payment[];
}

export default function PaymentsTab({ payments }: Props) {
  return (
    <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm text-xs">
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-slate-200 text-slate-400 text-[10px] uppercase">
              <th className="py-2">Datum</th>
              <th className="py-2">Mieter</th>
              <th className="py-2">Typ</th>
              <th className="py-2">Status</th>
              <th className="py-2 text-right">Betrag</th>
            </tr>
          </thead>
          <tbody>
            {payments.map((p) => (
              <tr key={p.id} className="border-b border-slate-100 hover:bg-slate-50">
                <td className="py-2.5 text-slate-500">{p.payment_date}</td>
                <td className="py-2.5 font-bold text-slate-800">
                  {p.tenants ? `${p.tenants.first_name} ${p.tenants.last_name}` : "-"}
                </td>
                <td className="py-2.5 text-slate-600">{p.type}</td>
                <td className="py-2.5">
                  <span className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                    p.status === "pünktlich" ? "bg-emerald-100 text-emerald-800" : "bg-red-100 text-red-800"
                  }`}>
                    {p.status}
                  </span>
                </td>
                <td className="py-2.5 text-right font-bold text-emerald-600">
                  {p.amount.toLocaleString("de-DE", { style: "currency", currency: "EUR" })}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}