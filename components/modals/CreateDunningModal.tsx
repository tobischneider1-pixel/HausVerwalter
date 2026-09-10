"use client";

import React, { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { Tenant, Property, Unit, DunningLevel } from "@/types";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  tenant: Tenant;
  property?: Property;
  unit?: Unit;
  monthStr: string; // "YYYY-MM"
  openAmount: number;
}

export default function CreateDunningModal({
  isOpen,
  onClose,
  onSuccess,
  tenant,
  property,
  unit,
  monthStr,
  openAmount,
}: Props) {
  const [level, setLevel] = useState<DunningLevel>("erinnerung");
  const [fee, setFee] = useState<number>(0);
  const [dueDate, setDueDate] = useState<string>("");
  const [subject, setSubject] = useState<string>("");
  const [bodyText, setBodyText] = useState<string>("");

  // Vermieter- / Absenderangaben
  const [senderName, setSenderName] = useState<string>("Hausverwaltung Schneider");
  const [senderAddress, setSenderAddress] = useState<string>("Musterstraße 1, 12345 Musterstadt");
  const [bankName, setBankName] = useState<string>("Sparkasse");
  const [iban, setIban] = useState<string>("DE00 0000 0000 0000 0000 00");
  const [bic, setBic] = useState<string>("SPKADE00XXX");

  const [saving, setSaving] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Monatsbezeichnung formatieren
  const getMonthName = (mStr: string) => {
    if (!mStr) return "";
    const [year, month] = mStr.split("-");
    const date = new Date(parseInt(year), parseInt(month) - 1, 1);
    return date.toLocaleDateString("de-DE", { month: "long", year: "numeric" });
  };

  const monthName = getMonthName(monthStr);
  const tenantName = `${tenant.first_name} ${tenant.last_name}`.trim();
  const unitLabel = unit ? `Einheit ${unit.unit_number}` : "Wohneinheit";
  const propertyLabel = property ? `${property.name}, ${property.address}` : "Mietobjekt";

  // Initiale Defaults & LocalStorage Laden
  useEffect(() => {
    if (isOpen) {
      setStatusMessage(null);

      // Gespeicherte Absenderdaten laden
      const savedSenderName = localStorage.getItem("hv_sender_name");
      if (savedSenderName) setSenderName(savedSenderName);
      const savedSenderAddr = localStorage.getItem("hv_sender_address");
      if (savedSenderAddr) setSenderAddress(savedSenderAddr);
      const savedBank = localStorage.getItem("hv_bank_name");
      if (savedBank) setBankName(savedBank);
      const savedIban = localStorage.getItem("hv_iban");
      if (savedIban) setIban(savedIban);
      const savedBic = localStorage.getItem("hv_bic");
      if (savedBic) setBic(savedBic);

      // Mahnstufe initial auf Erinnerung oder 1. Mahnung
      applyLevelDefaults("erinnerung");
    }
  }, [isOpen, tenant, monthStr, openAmount]);

  const applyLevelDefaults = (newLevel: DunningLevel) => {
    setLevel(newLevel);
    const today = new Date();

    if (newLevel === "erinnerung") {
      setFee(0);
      const target = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);
      const targetStr = target.toISOString().split("T")[0];
      setDueDate(targetStr);
      setSubject(`Freundliche Zahlungserinnerung: Miete für ${monthName}`);
      setBodyText(
        `Sehr geehrte(r) Frau/Herr ${tenant.last_name},\n\n` +
        `bei der routinemäßigen Durchsicht unserer Buchhaltung haben wir festgestellt, dass für die von Ihnen gemietete Wohnung (${unitLabel}, ${propertyLabel}) für den Monat ${monthName} noch ein offener Betrag in Höhe von ${openAmount.toFixed(2)} € verbucht ist.\n\n` +
        `Sollte sich Ihre Zahlung mit diesem Schreiben gekreuzt haben, bitten wir Sie, diese Erinnerung als gegenstandslos zu betrachten.\n\n` +
        `Andernfalls bitten wir Sie höflich, den Betrag bis spätestens zum unten angegebenen Zahlungstermin auf unser Bankkonto zu überweisen.`
      );
    } else if (newLevel === "mahnung_1") {
      setFee(5.0);
      const target = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);
      const targetStr = target.toISOString().split("T")[0];
      setDueDate(targetStr);
      setSubject(`1. Mahnung: Mietrückstand für den Monat ${monthName}`);
      setBodyText(
        `Sehr geehrte(r) Frau/Herr ${tenant.last_name},\n\n` +
        `trotz Fälligkeit der Miete gem. § 556b Abs. 1 BGB konnten wir für den Monat ${monthName} für Ihre Mietwohnung (${unitLabel}, ${propertyLabel}) keinen bzw. keinen vollständigen Zahlungseingang feststellen.\n\n` +
        `Es besteht aktuell ein Rückstandsbetrag in Höhe von ${openAmount.toFixed(2)} €.\n` +
        `Zuzüglich einer pauschalen Mahngebühr von 5,00 € fordern wir Sie hiermit auf, den Gesamtbetrag bis spätestens zum unten genannten Fälligkeitstermin auf unser Konto zu überweisen.`
      );
    } else {
      setFee(10.0);
      const target = new Date(today.getTime() + 5 * 24 * 60 * 60 * 1000);
      const targetStr = target.toISOString().split("T")[0];
      setDueDate(targetStr);
      setSubject(`2. Mahnung / Letzte Zahlungsaufforderung: Miete ${monthName}`);
      setBodyText(
        `Sehr geehrte(r) Frau/Herr ${tenant.last_name},\n\n` +
        `trotz vorheriger Erinnerung ist der Mietrückstand für den Monat ${monthName} (${unitLabel}, ${propertyLabel}) bis heute nicht ausgeglichen worden.\n\n` +
        `Offener Betrag: ${openAmount.toFixed(2)} €\n` +
        `Mahngebühr: 10,00 €\n\n` +
        `Wir fordern Sie letztmalig mit Nachdruck auf, den Gesamtbetrag unverzüglich bis zum unten genannten Termin auf unser Bankkonto einzuzahlen.\n\n` +
        `Sollte die Frist fruchtlos verstreichen, werden wir die Angelegenheit ohne weitere Ankündigung an unseren Rechtsbeistand übergeben. Wir weisen darauf hin, dass anhaltender Zahlungsverzug zur fristlosen Kündigung des Mietverhältnisses gem. §§ 543, 569 BGB berechtigt.`
      );
    }
  };

  // LocalStorage Absenderdaten persistieren
  const saveSenderToLocal = () => {
    localStorage.setItem("hv_sender_name", senderName);
    localStorage.setItem("hv_sender_address", senderAddress);
    localStorage.setItem("hv_bank_name", bankName);
    localStorage.setItem("hv_iban", iban);
    localStorage.setItem("hv_bic", bic);
  };

  // Gesamtforderung berechnen
  const totalAmount = openAmount + (fee || 0);

  // PDF-Generierung via jsPDF
  const generatePdf = async () => {
    const { default: jsPDF } = await import("jspdf");
    const { default: autoTable } = await import("jspdf-autotable");

    const doc = new jsPDF({ format: "a4", unit: "mm" });

    // Kopfzeile: Absender (rechtsbündig / modern)
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.text(senderName, 195, 20, { align: "right" });
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(100, 116, 139);
    const addrLines = senderAddress.split(",");
    addrLines.forEach((line, idx) => {
      doc.text(line.trim(), 195, 25 + idx * 4.5, { align: "right" });
    });

    // Empfängerfeld (DIN-Norm Position links)
    doc.setFontSize(8);
    doc.setTextColor(148, 163, 184);
    doc.text(`${senderName} • ${senderAddress}`, 20, 42);

    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(15, 23, 42);
    doc.text(tenantName, 20, 48);
    doc.setFont("helvetica", "normal");
    doc.text(unitLabel, 20, 53);
    doc.text(property?.address || "Mietobjekt", 20, 58);
    doc.text(`${property?.zip_code || ""} ${property?.city || ""}`.trim(), 20, 63);

    // Datum
    const todayStr = new Date().toLocaleDateString("de-DE");
    doc.setFontSize(9);
    doc.setTextColor(100, 116, 139);
    doc.text(`Datum: ${todayStr}`, 195, 75, { align: "right" });

    // Betreff
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(15, 23, 42);
    doc.text(subject, 20, 85);

    // Anschreiben-Fließtext
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(51, 65, 85);

    const splitBody = doc.splitTextToSize(bodyText, 170);
    doc.text(splitBody, 20, 95);

    // Position nach Fließtext berechnen
    const bodyHeight = splitBody.length * 5;
    let tableY = 95 + bodyHeight + 6;

    // Aufschlüsselung der Forderung in Tabelle
    const tableRows = [
      [`Mietrückstand (${monthName})`, `${openAmount.toFixed(2)} €`],
    ];
    if (fee > 0) {
      tableRows.push([`Mahngebühr (${level === "mahnung_1" ? "1. Mahnung" : "2. Mahnung"})`, `${fee.toFixed(2)} €`]);
    }
    tableRows.push([`Gesamtforderung`, `${totalAmount.toFixed(2)} €`]);

    autoTable(doc, {
      startY: tableY,
      head: [["Forderungsposition", "Betrag"]],
      body: tableRows,
      theme: "grid",
      headStyles: { fillColor: [30, 41, 59], textColor: [255, 255, 255], fontStyle: "bold", halign: "left" },
      columnStyles: {
        0: { cellWidth: 120 },
        1: { cellWidth: 50, halign: "right", fontStyle: "bold" },
      },
      styles: { fontSize: 9, cellPadding: 2.5 },
      margin: { left: 20, right: 20 },
    });

    const finalY = (doc as any).lastAutoTable.finalY + 8;

    // Zahlungsziel & Bankverbindung
    const formattedDueDate = dueDate ? new Date(dueDate).toLocaleDateString("de-DE") : "sofort";
    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(15, 23, 42);
    doc.text(`Zahlungsziel: Bitte überweisen Sie den Gesamtbetrag bis zum ${formattedDueDate}.`, 20, finalY);

    // Bankbox
    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(226, 232, 240);
    doc.roundedRect(20, finalY + 4, 170, 24, 2, 2, "FD");

    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(51, 65, 85);
    doc.text(`Bankinstitut: ${bankName}`, 25, finalY + 11);
    doc.text(`IBAN: ${iban}`, 25, finalY + 16);
    doc.text(`BIC: ${bic}`, 25, finalY + 21);
    doc.text(`Verwendungszweck: Miete ${monthName} - ${tenant.last_name}`, 105, finalY + 11);

    // Grußformel
    doc.setFontSize(10);
    doc.text("Mit freundlichen Grüßen,", 20, finalY + 36);
    doc.setFont("helvetica", "bold");
    doc.text(senderName, 20, finalY + 43);

    return doc;
  };

  // Aktion: PDF herunterladen
  const handleDownloadPdf = async () => {
    saveSenderToLocal();
    try {
      const doc = await generatePdf();
      const filename = `${level === "erinnerung" ? "Zahlungserinnerung" : "Mahnung"}_${tenant.last_name}_${monthStr}.pdf`;
      doc.save(filename);
      setStatusMessage({ type: "success", text: "PDF erfolgreich heruntergeladen!" });
    } catch (err: any) {
      setStatusMessage({ type: "error", text: "Fehler beim Erstellen der PDF: " + err.message });
    }
  };

  // Aktion: In Supabase Storage hochladen und in tenant_documents ablegen
  const handleSaveToDocuments = async () => {
    saveSenderToLocal();
    setSaving(true);
    setStatusMessage(null);

    try {
      const doc = await generatePdf();
      const pdfBlob = doc.output("blob");

      const levelTitle =
        level === "erinnerung"
          ? "Zahlungserinnerung"
          : level === "mahnung_1"
          ? "1. Mahnung"
          : "2. Mahnung (Letzte)";

      const uniqueFileName = `Mahnung_${tenant.last_name}_${monthStr}_${Date.now()}.pdf`;
      const filePath = `${tenant.id}/${uniqueFileName}`;

      // 1. Datei in Supabase Storage hochladen
      let fileUrl = null;
      try {
        const { error: uploadError } = await supabase.storage
          .from("tenant-documents")
          .upload(filePath, pdfBlob, {
            contentType: "application/pdf",
            upsert: true,
          });

        if (uploadError) {
          console.warn("Storage upload warning (wird ohne Storage-URL fortgesetzt):", uploadError);
        } else {
          const { data: urlData } = supabase.storage
            .from("tenant-documents")
            .getPublicUrl(filePath);
          fileUrl = urlData?.publicUrl || null;
        }
      } catch (storageErr) {
        console.warn("Storage upload skipped:", storageErr);
      }

      // 2. Metadaten in tenant_documents eintragen
      const { error: dbError } = await supabase.from("tenant_documents").insert([
        {
          tenant_id: tenant.id,
          title: `${levelTitle} (${monthName}) - ${totalAmount.toFixed(2)} €`,
          category: "Mahnung",
          file_url: fileUrl,
        },
      ]);

      if (dbError) {
        throw new Error("Fehler beim Speichern in der Datenbank: " + dbError.message);
      }

      setStatusMessage({
        type: "success",
        text: `✓ Dokument erfolgreich erstellt und im Dokumenten-Ordner von ${tenantName} abgelegt!`,
      });

      if (onSuccess) onSuccess();

      // Schließen nach kurzer Zeit
      setTimeout(() => {
        onClose();
      }, 1500);
    } catch (err: any) {
      setStatusMessage({ type: "error", text: err.message || "Fehler beim Ablegen des Dokuments." });
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs overflow-y-auto">
      <div className="w-full max-w-2xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden my-6">
        {/* Header */}
        <div className="p-4 bg-slate-900 text-white flex justify-between items-center">
          <div>
            <h3 className="font-bold text-sm flex items-center gap-2">
              📜 Mahnung & Zahlungserinnerung erstellen
            </h3>
            <p className="text-[11px] text-slate-300">
              Mieter: <strong>{tenantName}</strong> ({unitLabel}) • Rückstand:{" "}
              <strong className="text-amber-300">{openAmount.toFixed(2)} €</strong> für {monthName}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white text-lg font-bold p-1 cursor-pointer"
          >
            ✕
          </button>
        </div>

        <div className="p-5 space-y-4 text-xs max-h-[80vh] overflow-y-auto">
          {statusMessage && (
            <div
              className={`p-3 rounded-lg border font-medium ${
                statusMessage.type === "success"
                  ? "bg-emerald-50 border-emerald-200 text-emerald-800"
                  : "bg-red-50 border-red-200 text-red-800"
              }`}
            >
              {statusMessage.text}
            </div>
          )}

          {/* Stufenauswahl */}
          <div>
            <label className="font-bold text-slate-700 block mb-2">Mahnstufe auswählen</label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => applyLevelDefaults("erinnerung")}
                className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                  level === "erinnerung"
                    ? "border-amber-500 bg-amber-50 text-amber-900 font-bold ring-2 ring-amber-400/20"
                    : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                }`}
              >
                <div className="text-xs">🟡 Erinnerung</div>
                <div className="text-[10px] text-slate-500 font-normal mt-0.5">Höflicher Hinweis • 0 € Gebühr</div>
              </button>

              <button
                type="button"
                onClick={() => applyLevelDefaults("mahnung_1")}
                className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                  level === "mahnung_1"
                    ? "border-orange-500 bg-orange-50 text-orange-900 font-bold ring-2 ring-orange-400/20"
                    : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                }`}
              >
                <div className="text-xs">🟠 1. Mahnung</div>
                <div className="text-[10px] text-slate-500 font-normal mt-0.5">Fristsetzung • 5 € Gebühr</div>
              </button>

              <button
                type="button"
                onClick={() => applyLevelDefaults("mahnung_2")}
                className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                  level === "mahnung_2"
                    ? "border-red-500 bg-red-50 text-red-900 font-bold ring-2 ring-red-400/20"
                    : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                }`}
              >
                <div className="text-xs">🔴 2. Mahnung</div>
                <div className="text-[10px] text-slate-500 font-normal mt-0.5">Letzte Frist • 10 € Gebühr</div>
              </button>
            </div>
          </div>

          {/* Beträge & Frist */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 bg-slate-50 p-3 rounded-xl border border-slate-200">
            <div>
              <label className="text-[11px] font-semibold text-slate-600 block mb-1">Mietrückstand (€)</label>
              <div className="font-bold text-slate-800 p-2 bg-white rounded border border-slate-200">
                {openAmount.toFixed(2)} €
              </div>
            </div>
            <div>
              <label className="text-[11px] font-semibold text-slate-600 block mb-1">Mahngebühr (€)</label>
              <input
                type="number"
                step="0.50"
                value={fee}
                onChange={(e) => setFee(parseFloat(e.target.value) || 0)}
                className="w-full p-2 bg-white rounded border border-slate-200 text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="text-[11px] font-semibold text-slate-600 block mb-1">Zahlungsfrist bis</label>
              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="w-full p-2 bg-white rounded border border-slate-200 text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Betreff & Anschreiben Text */}
          <div className="space-y-2">
            <div>
              <label className="font-semibold text-slate-700 block mb-1">Betreffzeile</label>
              <input
                type="text"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                className="w-full p-2 border border-slate-200 rounded-lg text-xs font-medium focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="font-semibold text-slate-700 block mb-1">Anschreiben (frei editierbar)</label>
              <textarea
                rows={5}
                value={bodyText}
                onChange={(e) => setBodyText(e.target.value)}
                className="w-full p-2.5 border border-slate-200 rounded-lg text-xs leading-relaxed focus:outline-none focus:ring-1 focus:ring-blue-500 font-sans"
              />
            </div>
          </div>

          {/* Absender & Bankdaten (Akkordeon / Kompakt) */}
          <details className="border border-slate-200 rounded-xl p-3 bg-slate-50/50">
            <summary className="font-semibold text-slate-700 cursor-pointer select-none">
              ⚙️ Absender- & Bankverbindung anpassen
            </summary>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 pt-3">
              <div>
                <label className="text-[10px] text-slate-500 font-medium block">Absender / Hausverwaltung</label>
                <input
                  type="text"
                  value={senderName}
                  onChange={(e) => setSenderName(e.target.value)}
                  className="w-full p-1.5 bg-white border border-slate-200 rounded text-xs"
                />
              </div>
              <div>
                <label className="text-[10px] text-slate-500 font-medium block">Absender-Adresse</label>
                <input
                  type="text"
                  value={senderAddress}
                  onChange={(e) => setSenderAddress(e.target.value)}
                  className="w-full p-1.5 bg-white border border-slate-200 rounded text-xs"
                />
              </div>
              <div>
                <label className="text-[10px] text-slate-500 font-medium block">Bankinstitut</label>
                <input
                  type="text"
                  value={bankName}
                  onChange={(e) => setBankName(e.target.value)}
                  className="w-full p-1.5 bg-white border border-slate-200 rounded text-xs"
                />
              </div>
              <div>
                <label className="text-[10px] text-slate-500 font-medium block">IBAN</label>
                <input
                  type="text"
                  value={iban}
                  onChange={(e) => setIban(e.target.value)}
                  className="w-full p-1.5 bg-white border border-slate-200 rounded text-xs font-mono"
                />
              </div>
            </div>
          </details>

          {/* Summen-Hinweis */}
          <div className="flex justify-between items-center bg-blue-50 border border-blue-100 p-3 rounded-xl text-blue-950 font-medium">
            <span>Geforderter Gesamtbetrag:</span>
            <span className="text-base font-extrabold text-blue-700">{totalAmount.toFixed(2)} €</span>
          </div>
        </div>

        {/* Footer Aktionen */}
        <div className="p-4 bg-slate-100 border-t border-slate-200 flex flex-wrap justify-between items-center gap-2">
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="px-4 py-2 bg-white border border-slate-300 rounded-lg text-slate-700 font-semibold hover:bg-slate-50 transition-colors cursor-pointer"
          >
            Abbrechen
          </button>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={handleDownloadPdf}
              disabled={saving}
              className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              📥 PDF Herunterladen
            </button>

            <button
              type="button"
              onClick={handleSaveToDocuments}
              disabled={saving}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-bold shadow-sm flex items-center gap-1.5 transition-colors disabled:opacity-50 cursor-pointer"
            >
              {saving ? "⏳ Speichere & lege ab..." : "💾 In Dokumente ablegen"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

