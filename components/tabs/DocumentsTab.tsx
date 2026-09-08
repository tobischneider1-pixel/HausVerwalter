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
  const [uploadedDocs, setUploadedDocs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedContract, setSelectedContract] = useState<any | null>(null);

  // Upload Modal State
  const [uploadModalTenant, setUploadModalTenant] = useState<any | null>(null);
  const [docTitle, setDocTitle] = useState("");
  const [docCategory, setDocCategory] = useState("Kündigungsschreiben");

  // Ordnerzustände
  const [openPropertyId, setOpenPropertyId] = useState<string | null>(null);
  const [openUnitId, setOpenUnitId] = useState<string | null>(null);

  useEffect(() => {
    loadAllData();
  }, []);

  const loadAllData = async () => {
    setLoading(true);
    try {
      const [propsRes, unitsRes, tenantsRes, contractsRes, docsRes] = await Promise.all([
        supabase.from("properties").select("*"),
        supabase.from("units").select("*"),
        supabase.from("tenants").select("*"),
        supabase.from("contracts").select("*"),
        supabase.from("tenant_documents").select("*")
      ]);

      if (propsRes.data) setProperties(propsRes.data);
      if (unitsRes.data) setUnits(unitsRes.data);
      if (tenantsRes.data) setTenants(tenantsRes.data);

      if (contractsRes.data) {
        const archived = contractsRes.data.filter((c: any) => c.is_archived === true);
        setArchivedContracts(archived);
      }

      if (docsRes.data) {
        setUploadedDocs(docsRes.data);
      }
    } catch (err: any) {
      console.error("Fehler beim Laden der Daten:", err);
    } finally {
      setLoading(false);
    }
  };

  // Dokument hinzufügen / hochladen
  const handleUploadDocument = async () => {
    if (!uploadModalTenant || !docTitle) {
      alert("Bitte gib einen Titel für das Dokument ein.");
      return;
    }

    const { error } = await supabase.from("tenant_documents").insert([
      {
        tenant_id: uploadModalTenant.id,
        title: docTitle,
        category: docCategory,
      }
    ]);

    if (error) {
      alert("Fehler beim Speichern: " + error.message);
    } else {
      setDocTitle("");
      setUploadModalTenant(null);
      loadAllData();
    }
  };

  return (
    <div className="p-6 space-y-6 text-xs text-slate-700 min-h-[500px]">
      {/* Vorschau PopUp */}
      {selectedContract && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-xl shadow-2xl max-w-3xl w-full max-h-[90vh] flex flex-col">
            <div className="p-4 border-b flex justify-between items-center bg-slate-50">
              <h3 className="font-bold text-slate-800 text-sm">
                📄 Archivierter Vertrag: {selectedContract.tenant_name || "Unbekannt"}
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

      {/* Modal: Dokument hochladen */}
      {uploadModalTenant && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 space-y-4 border border-slate-200">
            <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
              📎 Dokument hochladen / hinzufügen
            </h3>
            <p className="text-slate-500 text-xs">
              Mieter: <strong>{uploadModalTenant.first_name} {uploadModalTenant.last_name}</strong>
            </p>

            <div className="space-y-3">
              <div>
                <label className="block font-medium text-slate-700 mb-1">Dokumenten-Titel</label>
                <input
                  type="text"
                  placeholder="z.B. Kündigungsschreiben Mieter"
                  value={docTitle}
                  onChange={(e) => setDocTitle(e.target.value)}
                  className="w-full p-2.5 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 text-xs"
                />
              </div>

              <div>
                <label className="block font-medium text-slate-700 mb-1">Kategorie</label>
                <select
                  value={docCategory}
                  onChange={(e) => setDocCategory(e.target.value)}
                  className="w-full p-2.5 border border-slate-300 rounded-lg outline-none text-xs bg-white"
                >
                  <option value="Kündigungsschreiben">Kündigungsschreiben</option>
                  <option value="Übergabeprotokoll">Übergabeprotokoll</option>
                  <option value="Mahnung">Mahnung / Schriftverkehr</option>
                  <option value="Sonstiges">Sonstiges Dokument</option>
                </select>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                onClick={() => setUploadModalTenant(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-lg"
              >
                Abbrechen
              </button>
              <button
                onClick={handleUploadDocument}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white font-semibold rounded-lg"
              >
                Speichern
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div>
        <h2 className="text-lg font-bold text-slate-900">Dokumente & Archiv</h2>
        <p className="text-slate-500">
          Historische Verträge, Kündigungen & Unterlagen geordnet nach Objekt und Mieter.
        </p>
      </div>

      {/* Ordnerstruktur */}
      <div className="bg-white p-6 rounded-xl border border-slate-200 space-y-4 shadow-sm">
        {loading ? (
          <div className="p-8 text-center text-slate-400">
            <p className="animate-pulse">⏳ Lade Dokumentenstruktur...</p>
          </div>
        ) : properties.length === 0 ? (
          <div className="p-8 text-center border-2 border-dashed border-slate-200 rounded-xl">
            <p className="text-slate-500 font-medium text-sm">📁 Keine Objekte vorhanden</p>
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
                        <p className="text-slate-400 italic pl-4 py-1">Keine Einheiten angelegt.</p>
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

                              {/* Ebene 3: Mieter */}
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
                                      const files = uploadedDocs.filter((d) => String(d.tenant_id) === String(tenant.id));

                                      return (
                                        <div key={tenant.id} className="p-3 rounded-lg bg-amber-50/40 border border-amber-200/60 space-y-2">
                                          <div className="flex justify-between items-center flex-wrap gap-2">
                                            <div>
                                              <span className="font-bold text-slate-900">👤 {tenantName}</span>
                                              <span className="ml-2 text-[10px] bg-slate-200 text-slate-700 px-2 py-0.5 rounded font-mono">
                                                Einzug: {tenant.move_in_date || "n.a."} | Auszug/Ende: {tenant.move_out_date || "laufend"}
                                              </span>
                                            </div>
                                            <button
                                              onClick={() => setUploadModalTenant(tenant)}
                                              className="bg-blue-600 hover:bg-blue-500 text-white px-2.5 py-1 rounded font-medium text-[10px] flex items-center gap-1"
                                            >
                                              ➕ Dokument hinzufügen
                                            </button>
                                          </div>

                                          {/* Dokumente & Kündigungsinfos */}
                                          <div className="pt-1 space-y-1.5">
                                            {docs.length === 0 && files.length === 0 ? (
                                              <p className="text-slate-400 text-[11px] italic">Keine Dokumente abgelegt.</p>
                                            ) : (
                                              <>
                                                {/* Archivierte Mietverträge */}
                                                {docs.map((doc) => (
                                                  <div key={doc.id} className="flex justify-between items-center bg-white p-2.5 rounded border border-slate-200">
                                                    <div>
                                                      <span className="font-medium text-slate-800 flex items-center gap-1.5">
                                                        📄 Mietvertrag (Archiv)
                                                      </span>
                                                      <div className="text-[10px] text-slate-500 mt-0.5 flex gap-3">
                                                        <span>Beginn: <strong>{doc.start_date || "k.A."}</strong></span>
                                                        <span>Vertragsende: <strong className="text-red-600">{doc.end_date || "k.A."}</strong></span>
                                                        {doc.cancellation_received_at && (
                                                          <span>Kündigungseingang: <strong>{doc.cancellation_received_at}</strong></span>
                                                        )}
                                                      </div>
                                                    </div>
                                                    <button
                                                      onClick={() => setSelectedContract(doc)}
                                                      className="bg-blue-50 text-blue-700 hover:bg-blue-100 font-semibold px-2.5 py-1 rounded text-[10px]"
                                                    >
                                                      Ansehen
                                                    </button>
                                                  </div>
                                                ))}

                                                {/* Manuell hochgeladene Dokumente */}
                                                {files.map((file) => (
                                                  <div key={file.id} className="flex justify-between items-center bg-white p-2 rounded border border-slate-200">
                                                    <span className="font-medium text-slate-800 flex items-center gap-1.5">
                                                      📎 {file.title} <span className="text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded">{file.category}</span>
                                                    </span>
                                                    <span className="text-[10px] text-slate-400">
                                                      {file.created_at?.split("T")[0]}
                                                    </span>
                                                  </div>
                                                ))}
                                              </>
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