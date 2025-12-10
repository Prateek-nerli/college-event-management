import React, { useEffect, useState } from "react";
import axios from "axios";
import { BackgroundDesign } from "./BackgroundDesign"; // Ensure this path is correct

// Initial data structure
const INITIAL_DATA = {
  topHeader: "AWARDED BY",
  mainHeader: "YOUR COLLEGE NAME",
  title: "Certificate of Participation",
  subTitle: "PROUDLY PRESENTED TO",
  presentationText: "This is to certify that",
  bodyText: "has actively participated and contributed to the successful completion of this event.",
  dateText: "",
  signatures: [],
  recipientName: "Student Name" 
};

const CertificateTemplateEditor = ({ eventId }) => {
  const [data, setData] = useState(INITIAL_DATA);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [generating, setGenerating] = useState(false);

  // --- HANDLERS (Same as your original code) ---
  const handleChange = (field, value) => {
    setData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSignatureChange = (id, field, value) => {
    setData((prev) => ({
      ...prev,
      signatures: prev.signatures.map((s) =>
        s.id === id ? { ...s, [field]: value } : s
      ),
    }));
  };

  const addSignature = () => {
    setData((prev) => ({
      ...prev,
      signatures: [
        ...prev.signatures,
        { id: Date.now().toString(), name: "", role: "", imageUrl: null },
      ],
    }));
  };

  const removeSignature = (id) => {
    setData((prev) => ({
      ...prev,
      signatures: prev.signatures.filter((s) => s.id !== id),
    }));
  };

  // --- API CALLS ---
  useEffect(() => {
    const fetchTemplate = async () => {
      if (!eventId) return;
      try {
        setLoading(true);
        // Replace with your actual API endpoint
        const res = await axios.get(
          `http://localhost:5000/api/events/${eventId}/certificate-template`,
          { withCredentials: true }
        );

        if (res.data && Object.keys(res.data).length > 0) {
          const tpl = res.data;
          setData((prev) => ({
            ...prev,
            topHeader: tpl.topHeader || prev.topHeader,
            mainHeader: tpl.mainHeader || prev.mainHeader,
            title: tpl.title || prev.title,
            subTitle: tpl.subTitle || prev.subTitle,
            presentationText: tpl.presentationText || prev.presentationText,
            bodyText: tpl.bodyText || prev.bodyText,
            dateText: tpl.dateText || "",
            signatures: (tpl.signatures || []).map((s, idx) => ({
                id: s._id ? s._id.toString() : String(idx),
                name: s.name || "",
                role: s.role || "",
                imageUrl: s.signatureImageUrl || null,
              })) || [],
          }));
        }
      } catch (err) {
        console.error("Failed to fetch template", err);
      } finally {
        setLoading(false);
      }
    };
    fetchTemplate();
  }, [eventId]);

  const handleSaveTemplate = async () => {
    try {
      setSaving(true);
      const payload = {
        topHeader: data.topHeader,
        mainHeader: data.mainHeader,
        title: data.title,
        subTitle: data.subTitle,
        presentationText: data.presentationText,
        bodyText: data.bodyText,
        dateText: data.dateText,
        signatures: data.signatures.map((s) => ({
          name: s.name,
          role: s.role,
        })),
      };

      await axios.post(
        `http://localhost:5000/api/events/${eventId}/certificate-template`,
        payload,
        { withCredentials: true }
      );
      alert("Template saved successfully! ✅");
    } catch (err) {
      alert("Failed to save template ❌");
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="p-4">Loading editor...</div>;

  return (
    <div className="flex flex-col gap-6 w-full max-w-5xl mx-auto p-2">
      
      {/* === PREVIEW AREA === */}
      <div className="w-full bg-gray-100 p-4 rounded-xl border border-gray-300 flex justify-center">
        {/* Certificate Container - Scalable Aspect Ratio A4 Landscape */}
        <div 
          className="relative bg-white shadow-2xl text-center text-slate-900"
          style={{
            width: "100%",
            maxWidth: "800px",
            aspectRatio: "1.414 / 1", // A4 Ratio (297mm / 210mm)
          }}
        >
          {/* 1. Background Layer */}
          <BackgroundDesign />

          {/* 2. Content Layer (Absolute Positioned over Background) */}
          <div className="absolute inset-0 z-10 flex flex-col items-center px-12 py-10">
            
            {/* Top Header */}
            <p className="text-xs font-bold tracking-[0.3em] uppercase text-gray-500 mt-4 mb-1">
              {data.topHeader}
            </p>

            {/* Institution/College Name */}
            <h1 className="text-3xl md:text-4xl font-bold uppercase tracking-wide text-slate-800 border-b-2 border-yellow-400 pb-2 mb-6 font-serif">
              {data.mainHeader}
            </h1>

            {/* Certificate Title */}
            <h2 
              className="text-4xl md:text-5xl text-yellow-600 mb-2"
              style={{ fontFamily: "'Times New Roman', serif", fontStyle: "italic" }}
            >
              {data.title}
            </h2>

            {/* Subtitle */}
            <p className="text-[10px] md:text-xs uppercase tracking-widest text-gray-400 mb-6">
              {data.subTitle}
            </p>

            {/* Presentation Text */}
            <p className="text-sm italic text-gray-600 mb-2 font-serif">
              {data.presentationText}
            </p>

            {/* Student Name Placeholder */}
            <div className="my-2 border-b border-gray-300 pb-1 w-2/3 mx-auto">
              <p className="text-3xl font-bold capitalize font-serif text-slate-900">
                {data.recipientName}
              </p>
            </div>

            {/* Body Text */}
            <p className="text-sm md:text-base leading-relaxed max-w-2xl text-gray-600 mt-4 px-8 font-serif">
              {data.bodyText}
            </p>

            {/* Spacer to push signatures to bottom */}
            <div className="flex-grow"></div>

            {/* Footer / Signatures */}
            <div className="w-full flex justify-between items-end px-10 mt-4 mb-4">
                {/* Date */}
                <div className="flex flex-col items-center">
                    <p className="text-sm font-semibold border-t border-gray-400 pt-2 px-4 min-w-[120px]">
                        {data.dateText || new Date().toLocaleDateString()}
                    </p>
                    <span className="text-[10px] uppercase text-gray-400">Date</span>
                </div>

                {/* Dynamic Signatures */}
                <div className="flex gap-8">
                    {data.signatures.map((sig) => (
                    <div key={sig.id} className="flex flex-col items-center">
                        <div className="h-10 w-32 flex items-end justify-center mb-1">
                            {/* Visual placeholder for signature if no image */}
                            <span 
                                className="text-xl text-blue-900 opacity-60"
                                style={{ fontFamily: "cursive" }}
                            >
                                Sign
                            </span>
                        </div>
                        <div className="border-t border-gray-400 pt-1 min-w-[120px] text-center">
                            <div className="font-bold text-xs text-gray-800">{sig.name}</div>
                            <div className="text-[10px] uppercase tracking-wide text-gray-500">{sig.role}</div>
                        </div>
                    </div>
                    ))}
                </div>
            </div>

          </div>
        </div>
      </div>

      {/* === EDITOR FORM (Inputs) === */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-white p-4 rounded-lg border shadow-sm">
        <div className="space-y-3">
          <div>
            <label className="text-xs font-semibold text-gray-500 uppercase">Top Header</label>
            <input 
              className="w-full border rounded p-2 text-sm" 
              value={data.topHeader} 
              onChange={(e) => handleChange("topHeader", e.target.value)} 
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-500 uppercase">College / Org Name</label>
            <input 
              className="w-full border rounded p-2 text-sm font-bold" 
              value={data.mainHeader} 
              onChange={(e) => handleChange("mainHeader", e.target.value)} 
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-500 uppercase">Title</label>
            <input 
              className="w-full border rounded p-2 text-sm" 
              value={data.title} 
              onChange={(e) => handleChange("title", e.target.value)} 
            />
          </div>
        </div>

        <div className="space-y-3">
          <div>
            <label className="text-xs font-semibold text-gray-500 uppercase">Presentation Text</label>
            <input 
              className="w-full border rounded p-2 text-sm" 
              value={data.presentationText} 
              onChange={(e) => handleChange("presentationText", e.target.value)} 
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-500 uppercase">Body Text</label>
            <textarea 
              className="w-full border rounded p-2 text-sm h-24 resize-none" 
              value={data.bodyText} 
              onChange={(e) => handleChange("bodyText", e.target.value)} 
            />
          </div>
        </div>
      </div>

      {/* === SIGNATURES EDITOR === */}
      <div className="bg-white p-4 rounded-lg border shadow-sm">
        <div className="flex justify-between items-center mb-3">
            <h3 className="font-semibold text-gray-700">Signatures</h3>
            <button type="button" onClick={addSignature} className="text-xs bg-blue-50 text-blue-600 px-3 py-1 rounded border border-blue-200 hover:bg-blue-100">
                + Add Signature
            </button>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {data.signatures.map((sig) => (
                <div key={sig.id} className="flex items-center gap-2 border p-2 rounded bg-gray-50">
                    <div className="flex-1 space-y-2">
                        <input 
                            placeholder="Name (e.g. Dr. Smith)" 
                            className="w-full text-xs border p-1 rounded"
                            value={sig.name}
                            onChange={(e) => handleSignatureChange(sig.id, "name", e.target.value)}
                        />
                        <input 
                            placeholder="Role (e.g. Principal)" 
                            className="w-full text-xs border p-1 rounded"
                            value={sig.role}
                            onChange={(e) => handleSignatureChange(sig.id, "role", e.target.value)}
                        />
                    </div>
                    <button onClick={() => removeSignature(sig.id)} className="text-red-500 hover:text-red-700 px-2">
                        ✕
                    </button>
                </div>
            ))}
            {data.signatures.length === 0 && <p className="text-sm text-gray-400 italic">No signatures added yet.</p>}
        </div>
      </div>

      {/* === ACTIONS === */}
      <div className="flex justify-end gap-3 pb-4">
        <button 
          onClick={handleSaveTemplate} 
          disabled={saving}
          className="px-6 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
        >
          {saving ? "Saving..." : "Save Template"}
        </button>
      </div>
    </div>
  );
};

export default CertificateTemplateEditor;