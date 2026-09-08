"use client";

import React from "react";

export interface ContractDocumentProps {
  landlordName: string;
  tenantName: string;
  propertyAddress: string;
  unitName: string;
  startDate: string;
  coldRent: number;
  utilityAdvance: number;
  deposit: number;
  specialTerms: string;
  signingPlace: string;
  tenantSignature?: string | null;
  landlordSignature?: string | null;
  templateType?: string;
  editable?: boolean;
  onLandlordNameChange?: (v: string) => void;
  onSpecialTermsChange?: (v: string) => void;
}

export function ContractDocument({
  landlordName,
  tenantName,
  propertyAddress,
  unitName,
  startDate,
  coldRent,
  utilityAdvance,
  deposit,
  specialTerms,
  signingPlace,
  tenantSignature,
  landlordSignature,
  templateType = "standard_2026",
  editable = false,
  onLandlordNameChange,
  onSpecialTermsChange,
}: ContractDocumentProps) {
  const getTemplateTitle = () => {
    switch (templateType) {
      case "index_2026":
        return "Wohnraum-Mietvertrag (Indexmiete 2026)";
      case "moebliert_2026":
        return "Mietvertrag für möblierten Wohnraum";
      default:
        return "Wohnraum-Mietvertrag (Standard 2026)";
    }
  };

  return (
    <div className="bg-white p-8 rounded-lg shadow-md border border-slate-300 font-serif text-slate-800 text-xs leading-relaxed space-y-4 max-w-2xl mx-auto relative">
      {editable && (
        <div className="no-print bg-amber-50 border border-amber-200 text-amber-800 p-2 rounded text-[11px] font-sans flex items-center justify-between mb-2">
          <span>✏️ <strong>Vorschau:</strong> Anpassungen links werden sofort übernommen.</span>
        </div>
      )}

      <div className="border-b-2 border-slate-900 pb-3 text-center">
        <h2 className="text-base font-bold uppercase tracking-wider font-sans text-slate-900">
          {getTemplateTitle()}
        </h2>
        <p className="text-[10px] text-slate-500 font-sans mt-0.5">Rechtsgültige Vertragsvorlage</p>
      </div>

      <div className="grid grid-cols-2 gap-4 bg-slate-50 p-3 rounded border border-slate-200 font-sans text-[11px]">
        <div>
          <span className="font-bold text-slate-500 uppercase block text-[9px]">Vermieter</span>
          {editable && onLandlordNameChange ? (
            <input
              type="text"
              value={landlordName}
              onChange={(e) => onLandlordNameChange(e.target.value)}
              className="font-semibold text-slate-900 border-b border-dashed border-slate-400 bg-transparent w-full focus:outline-none"
            />
          ) : (
            <p className="font-semibold text-slate-900">{landlordName || "—"}</p>
          )}
        </div>
        <div>
          <span className="font-bold text-slate-500 uppercase block text-[9px]">Mieter</span>
          <p className="font-semibold text-slate-900">{tenantName || "—"}</p>
        </div>
      </div>

      <div className="space-y-3 font-serif">
        <div>
          <h4 className="font-bold font-sans text-slate-900 text-xs border-b pb-0.5 mb-1">§ 1 Mietgegenstand & Objekt</h4>
          <p>
            Mietobjekt: <strong>{propertyAddress}</strong> ({unitName}).
          </p>
          <p className="mt-1 text-[11px] text-slate-600">
            Der Vermieter vermietet dem Mieter die oben genannte Wohneinheit ausschließlich zu Wohnzwecken.
          </p>
        </div>

        <div>
          <h4 className="font-bold font-sans text-slate-900 text-xs border-b pb-0.5 mb-1">§ 2 Mietbeginn & Dauer</h4>
          <p>
            Mietbeginn: <strong>{startDate}</strong>. Das Mietverhältnis wird auf unbestimmte Zeit geschlossen.
          </p>
          {templateType === "index_2026" && (
            <p className="mt-1 text-[11px] text-slate-600 italic">
              Hinweis: Die Miete erhöht/verändert sich entsprechend dem Verbraucherpreisindex (VPI).
            </p>
          )}
        </div>

        <div>
          <h4 className="font-bold font-sans text-slate-900 text-xs border-b pb-0.5 mb-1">§ 3 Miete & Nebenkosten</h4>
          <div className="my-1 font-sans text-[11px] grid grid-cols-3 gap-2 bg-slate-50 p-2 rounded border">
            <div>Kaltmiete: <strong>{coldRent} €</strong></div>
            <div>NK-Vorschuss: <strong>{utilityAdvance} €</strong></div>
            <div className="font-bold text-slate-900">Gesamt: <strong>{Number(coldRent) + Number(utilityAdvance)} €</strong></div>
          </div>
        </div>

        <div>
          <h4 className="font-bold font-sans text-slate-900 text-xs border-b pb-0.5 mb-1">§ 4 Mietkaution</h4>
          <p>Die Kautionshöhe beträgt <strong>{deposit} €</strong>.</p>
        </div>

        <div>
          <h4 className="font-bold font-sans text-slate-900 text-xs border-b pb-0.5 mb-1">§ 5 Sondervereinbarungen</h4>
          {editable && onSpecialTermsChange ? (
            <textarea
              value={specialTerms}
              onChange={(e) => onSpecialTermsChange(e.target.value)}
              className="w-full text-xs font-serif p-1.5 border border-amber-200 bg-amber-50/40 rounded focus:bg-white focus:outline-none"
              rows={3}
            />
          ) : (
            <p className="italic bg-amber-50/60 p-2 rounded border border-amber-100">{specialTerms || "Keine besonderen Vereinbarungen."}</p>
          )}
        </div>
      </div>

      <div className="pt-4 border-t border-slate-300 font-sans space-y-3">
        <div className="text-[10px] text-slate-500 flex justify-between">
          <span>Ort: <strong className="text-slate-900">{signingPlace && signingPlace.trim() !== "" ? signingPlace : "__________________"}</strong></span>
          <span>Datum: <strong>{new Date().toLocaleDateString("de-DE")}</strong></span>
        </div>

        <div className="grid grid-cols-2 gap-6 pt-2">
          <div className="border-t border-slate-400 pt-1 text-center">
            {tenantSignature ? (
              <img src={tenantSignature} alt="Unterschrift Mieter" className="h-10 mx-auto object-contain mb-1" />
            ) : (
              <div className="h-10 flex items-center justify-center text-slate-300 italic text-[10px]">Unterschrift Mieter ausstehend</div>
            )}
            <p className="font-bold text-[11px] text-slate-800">Unterschrift Mieter</p>
            <p className="text-[9px] text-slate-500">{tenantName}</p>
          </div>

          <div className="border-t border-slate-400 pt-1 text-center">
            {landlordSignature ? (
              <img src={landlordSignature} alt="Unterschrift Vermieter" className="h-10 mx-auto object-contain mb-1" />
            ) : (
              <div className="h-10 flex items-center justify-center text-slate-300 italic text-[10px]">Unterschrift Vermieter ausstehend</div>
            )}
            <p className="font-bold text-[11px] text-slate-800">Unterschrift Vermieter</p>
            <p className="text-[9px] text-slate-500">{landlordName}</p>
          </div>
        </div>
      </div>
    </div>
  );
}