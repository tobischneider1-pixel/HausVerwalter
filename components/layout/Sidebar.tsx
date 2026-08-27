"use client";

import React from "react";
import { navigation } from "@/constants";

interface Props {
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

export function Sidebar({ activeTab, setActiveTab }: Props) {
  return (
    <aside className="w-64 bg-slate-900 text-slate-300 flex flex-col min-h-screen p-4 border-r border-slate-800 shrink-0">
      <div className="flex items-center gap-3 px-3 py-4 mb-4 border-b border-slate-800">
        <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center font-bold text-white text-sm">
          HV
        </div>
        <div>
          <h1 className="font-bold text-white text-sm leading-none">HausVerwalter</h1>
          <span className="text-[10px] text-slate-400">Immobilien-Manager</span>
        </div>
      </div>

      <nav className="space-y-1 flex-1">
        {navigation.map((item) => {
          const isActive = activeTab === item.name;
          return (
            <button
              key={item.name}
              onClick={() => setActiveTab(item.name)}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
                isActive
                  ? "bg-blue-600 text-white shadow-sm"
                  : "hover:bg-slate-800 text-slate-400 hover:text-slate-200"
              }`}
            >
              <span className="text-sm leading-none">{item.icon}</span>
              <span>{item.name}</span>
            </button>
          );
        })}
      </nav>
    </aside>
  );
}

export default Sidebar;