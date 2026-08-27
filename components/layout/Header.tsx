"use client";

import React from "react";

interface Props {
  activeTab: string;
  onOpenPropertyModal: () => void;
  onOpenUnitModal: () => void;
  onOpenTenantModal: () => void;
  onOpenPaymentModal: () => void;
}

export function Header({
  activeTab,
  onOpenPropertyModal,
  onOpenUnitModal,
  onOpenTenantModal,
  onOpenPaymentModal,
}: Props) {
  return (
    <header className="h-16 bg-white border-b border-slate-200 px-6 flex items-center justify-between shrink-0">
      <h2 className="text-base font-bold text-slate-800">{activeTab}</h2>
      <div className="flex items-center gap-2">
        <button
          onClick={onOpenPropertyModal}
          className="bg-slate-900 hover:bg-slate-800 text-white text-xs px-3 py-2 rounded-lg transition-colors font-medium"
        >
          + Objekt
        </button>
        <button
          onClick={onOpenUnitModal}
          className="bg-slate-800 hover:bg-slate-700 text-white text-xs px-3 py-2 rounded-lg transition-colors font-medium"
        >
          + Einheit
        </button>
        <button
          onClick={onOpenTenantModal}
          className="bg-slate-700 hover:bg-slate-600 text-white text-xs px-3 py-2 rounded-lg transition-colors font-medium"
        >
          + Mieter
        </button>
        <button
          onClick={onOpenPaymentModal}
          className="bg-blue-600 hover:bg-blue-500 text-white text-xs px-3 py-2 rounded-lg transition-colors font-medium"
        >
          + Zahlung
        </button>
      </div>
    </header>
  );
}

export default Header;