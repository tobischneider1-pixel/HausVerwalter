"use client";

import React, { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { Property, Tenant, Unit } from "@/types";
import { ContractDocument } from "../contracts/ContractDocument";

interface Props {
  properties?: Property[];
  units?: Unit[];
  tenants?: Tenant[];
}

export function DocumentsTab({ properties: initialProperties, units: initialUnits, tenants: initialTenants }: Props) {
  const [properties, setProperties] = useState<Property[]>(initialProperties || []);
  const [units, setUnits] = useState<Unit[]>(initialUnits || []);
  const [tenants, setTenants] = useState<Tenant[]>(initialTenants || []);
  const [archivedContracts, setArchivedContracts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedContract, setSelectedContract] = useState<any | null>(null);

  // Zustand für eingeklappte Ordner
  const [openPropertyId, setOpenPropertyId] = useState<string | null>(null);
  const [openUnitId, setOpenUnitId] = useState<string | null>(null);

  useEffect(() => {
    loadAllData();
  }, []);

  const loadAllData = async () => {
    setLoading(true);
    try {
      const [propsRes, unitsRes, tenantsRes, contractsRes] = await Promise.all([
        supabase.from("properties").select("*"),
        supabase.from("units").select("*"),
        supabase.from("tenants").select("*"),
        supabase.from("contracts").select("*").eq("is_archived", true).order("created_at", { ascending: false })
      ]);

      if (propsRes.data) setProperties(propsRes.data);
      if (unitsRes.data) setUnits(unitsRes.data);
      if (tenantsRes.data) setTenants(tenantsRes.data);
      if (contractsRes.data) setArchivedContracts(contractsRes.data);
    } catch (err) {
      console.error("Fehler beim Laden der Dokumente:", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 space-y-6 text-xs text-slate-700">
      {/* Vorschau PopUp */}
      {selectedContract && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-xl shadow-2xl max-w-3xl w-full max-h-[90vh] flex flex-col">
            <div className="p-4 border-b flex justify-between items-center bg-slate-50">
              <h3 className="font-bold text-slate-800 text-sm">
                📄 Archivierter Vertrag: {selectedContract.tenant_name || "Unbekannter Mieter"}
              </h3>
              <div className="flex gap-2">
                <button
                  onClick={() => window.print()}
                  className="bg-blue-600 hover:bg-blue-500 text-white font-semibold px-4 py-1.5 rounded-lg"
                >
                  🖨️ Drucken / PDF
                </button>
                <button
                  onClick={() => setSelectedContract(null)}
                  className="bg-slate-200 hover:bg-slate-300 text-slate-700 font-semibold px-3 py-1.5 rounded-lg"
                >
                  Schließen
                </button>
              </div>
            </div>
            <div className="p-6 overflow-y-auto bg-slate-100">
              <ContractDocument {...selectedContract} />
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div>
        <h2 className="text-lg font-bold text-slate-900">Dokumente & Archiv</h2>
        <p className="text-slate-500">
          Historische Verträge & Unterlagen geordnet nach Objekt, Einheit und Mieterzeitraum.
        </p>
      </div>

      {/* Ordnerstruktur */}
      <div className="bg-white p-6 rounded-xl border border-slate-200 space-y-4 shadow-xs">
        {loading ? (
          <div className="p-8 text-center text-slate-400">
            <p>Lade Dokumentenstruktur und Archiv...</p>
          </div>
        ) : properties.length === 0 ? (
          <div className="p-8 text-center border-2 border-dashed border-slate-200 rounded-xl">
            <p className="text-slate-500 font-medium">Noch keine Objekte vorhanden.</p>
            <p className="text-slate-400 text-[11px] mt-1">Lege zuerst Objekte und Einheiten an, um die Ordnerstruktur zu nutzen.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {properties.map((prop) => {
              const propUnits = units.filter((u) => String(u.property_id) === String(prop.id));
              const isPropOpen = openPropertyId === String(prop.id);

              return (
                <div key={prop.id} className="border border-slate-200 rounded-xl overflow-hidden bg-slate-50/50">
                  {/* Ebene 1: Objekt */}
                  <button
                    onClick={() => setOpenPropertyId(isPropOpen ? null : String(prop.id))}
                    className="w-full flex justify-between items-center p-3.5 bg-slate-100 hover:bg-slate-200/80 transition-colors font-bold text-slate-800 text-xs text-left"
                  >
                    <span className="flex items-center gap-2">
                      🏢 {prop.name || prop.address || "Unbenanntes Objekt"}
                    </span>
                    <span className="text-slate-500 text-[11px] font-normal">
                      {isPropOpen ? "➖ Einklappen" : "➕ Ausklappen"}
                    </span>
                  </button>

                  {/* Ebene 2: Einheiten */}
                  {isPropOpen && (
                    <div className="p-3 space-y-2 bg-white border-t border-slate-200">
                      {propUnits.length === 0 ? (
                        <p className="text-slate-400 italic pl-4 py-1">Keine Einheiten in diesem Objekt angelegt.</p>
                      ) : (
                        propUnits.map((unit) => {
                          const isUnitOpen = openUnitId === String(unit.id);
                          const unitTenants = tenants.filter((t) => String(t.unit_id) === String(unit.id));

                          return (
                            <div key={unit.id} className="border border-slate-200 rounded-lg ml-3 overflow-hidden">
                              <button
                                onClick={() => setOpenUnitId(isUnitOpen ? null : String(unit.id))}
                                className="w-full flex justify-between items-center p-2.5 bg-slate-50 hover:bg-slate-100 font-semibold text-slate-700 text-xs text-left"
                              >
                                <span className="flex items-center gap-2">
                                  🚪 Einheit {unit.unit_number || unit.id} {unit.type ? `(${unit.type})` : ""}
                                </span>
                                <span className="text-slate-400 font-normal">{isUnitOpen ? "▲" : "▼"}</span>
                              </button>

                              {/* Ebene 3: Mieter (Historisch & Zeiträume) */}
                              {isUnitOpen && (
                                <div className="p-3 bg-white space-y-3 border-t border-slate-100 ml-2">
                                  {unitTenants.length === 0 ? (
                                    <p className="text-slate-400 italic text-[11px]">Keine Mieter zugewiesen.</p>
                                  ) : (
                                    unitTenants.map((tenant) => {
                                      const tenantName = `${tenant.first_name || ""} ${tenant.last_name || ""}`.trim() || "Unbekannt";
                                      const docs = archivedContracts.filter(
                                        (c) => String(c.tenant_id) === String(tenant.id) || c.tenant_name === tenantName
                                      );

                                      return (
                                        <div key={tenant.id} className="p-3 rounded-lg bg-amber-50/40 border border-amber-200/60 space-y-2">
                                          <div className="flex justify-between items-center">
                                            <span className="font-bold text-slate-900">👤 {tenantName}</span>
                                            <span className="text-[10px] bg-slate-200 text-slate-700 px-2 py-0.5 rounded font-mono">
                                              Mietzeitraum: {tenant.move_in_date || "Beginn n.a."} – {tenant.move_out_date || "laufend"}
                                            </span>
                                          </div>

                                          {/* Dokumente des Mieters */}
                                          <div className="pt-1 space-y-1">
                                            {docs.length === 0 ? (
                                              <p className="text-slate-400 text-[11px] italic">Keine archivierten Verträge für diesen Mieter.</p>
                                            ) : (
                                              docs.map((doc) => (
                                                <div key={doc.id} className="flex justify-between items-center bg-white p-2 rounded border border-slate-200">
                                                  <span className="font-medium text-slate-800 flex items-center gap-1.5">
                                                    📄 Mietvertrag (Archiviert am {doc.created_at ? new Date(doc.created_at).toLocaleDateString("de-DE") : "unbekannt"})
                                                  </span>
                                                  <button
                                                    onClick={() => setSelectedContract(doc)}
                                                    className="bg-blue-50 text-blue-700 hover:bg-blue-100 font-semibold px-2.5 py-1 rounded text-[10px] transition-colors"
                                                  >
                                                    Ansehen
                                                  </button>
                                                </div>
                                              ))
                                            )}
                                          </div>
                                        </div>
                                      );
                                    })
                                  )}
                                </div>
                              )}
                            </div>
                          );
                        })
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

export default DocumentsTab;