import React, { useEffect, useState, useRef } from "react";
import axios from "axios";
import { BackgroundDesign } from "./BackgroundDesign";

// Initial data
const INITIAL_DATA = {
  topHeader: "AWARDED BY",
  mainHeader: "GLOBAL INSTITUTE OF EXCELLENCE",
  title: "Certificate of Achievement",
  subTitle: "PROUDLY PRESENTED TO",
  presentationText:
    "In recognition of outstanding performance, dedication, and commitment to excellence.",
  bodyText:
    "This certificate is awarded as a testament to the hard work demonstrated throughout the program.",
  dateText: "",
  signatures: [
    { id: "1", name: "Sarah Connor", role: "Director", imageUrl: "" },
    { id: "2", name: "Kyle Reese", role: "Program Manager", imageUrl: "" },
  ],
  recipientName: "Alex Morgan",
  enabled: true,
};

const CertificateTemplateEditor = ({ eventId }) => {
  const [data, setData] = useState(INITIAL_DATA);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [generating, setGenerating] = useState(false);
  const sidebarRef = useRef(null);

  // --- FIXED: Fetch Template with Auth Headers & Smart Extraction ---
  useEffect(() => {
    const fetchTemplate = async () => {
      if (!eventId) return;
      try {
        setLoading(true);

        // 1. Prepare Auth Header
        const token = localStorage.getItem("token");
        const config = {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        };

        // 2. Fetch from API
        const tplRes = await axios.get(
          `http://localhost:5000/api/events/${eventId}/certificate-template`,
          config
        );

        const rawData = tplRes?.data;
        
        // 3. Smart Extraction (Handle different backend response structures)
        let tpl = null;
        if (rawData) {
          if (rawData.topHeader) {
            tpl = rawData;
          } else if (rawData.template && rawData.template.topHeader) {
            tpl = rawData.template;
          } else if (rawData.certificateTemplate && rawData.certificateTemplate.topHeader) {
            tpl = rawData.certificateTemplate;
          }
        }

        // 4. Fallback to Event object if needed
        if (!tpl) {
          const eventRes = await axios.get(
            `http://localhost:5000/api/events/${eventId}`,
            config
          );
          tpl = eventRes?.data?.data?.certificateTemplate || {};
        }

        // 5. Update State
        if (tpl && Object.keys(tpl).length > 0) {
          setData((prev) => ({
            ...prev,
            topHeader: tpl.topHeader !== undefined ? tpl.topHeader : prev.topHeader,
            mainHeader: tpl.mainHeader !== undefined ? tpl.mainHeader : prev.mainHeader,
            title: tpl.title !== undefined ? tpl.title : prev.title,
            subTitle: tpl.subTitle !== undefined ? tpl.subTitle : prev.subTitle,
            presentationText: tpl.presentationText !== undefined ? tpl.presentationText : prev.presentationText,
            bodyText: tpl.bodyText !== undefined ? tpl.bodyText : prev.bodyText,
            dateText: tpl.dateText !== undefined ? tpl.dateText : prev.dateText,
            enabled: tpl.enabled !== undefined ? tpl.enabled : prev.enabled,
            signatures:
              (tpl.signatures && tpl.signatures.length > 0)
                ? tpl.signatures.map((s, idx) => ({
                    id: s._id ? s._id.toString() : `sig-${idx}`,
                    name: s.name || "",
                    role: s.role || "",
                    imageUrl: s.signatureImageUrl || s.imageUrl || "",
                  }))
                : prev.signatures,
          }));
        }
      } catch (err) {
        console.error("Failed to fetch template:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchTemplate();
  }, [eventId]);

  // --- Handlers ---
  const handleChange = (field, value) => {
    setData((p) => ({ ...p, [field]: value }));
  };

  const handleSignatureChange = (id, field, value) => {
    setData((p) => ({
      ...p,
      signatures: p.signatures.map((s) =>
        s.id === id ? { ...s, [field]: value } : s
      ),
    }));
  };

  const addSignature = () => {
    setData((p) => ({
      ...p,
      signatures: [
        ...p.signatures,
        { id: Date.now().toString(), name: "", role: "", imageUrl: "" },
      ],
    }));
    setTimeout(() => {
      if (sidebarRef.current) sidebarRef.current.scrollTop = 9999;
    }, 50);
  };

  const removeSignature = (id) => {
    setData((p) => ({
      ...p,
      signatures: p.signatures.filter((s) => s.id !== id),
    }));
  };

  const resetTemplate = () => {
    if (!window.confirm("Reset to default template values?")) return;
    setData(INITIAL_DATA);
  };

  // --- FIXED: Save Template (Added Headers) ---
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
          signatureImageUrl: s.imageUrl || null,
        })),
        enabled: data.enabled,
      };

      const token = localStorage.getItem("token");
      const config = { headers: { Authorization: `Bearer ${token}` } };

      await axios.post(
        `http://localhost:5000/api/events/${eventId}/certificate-template`,
        payload,
        config
      );

      alert("Template saved successfully ✅");
    } catch (err) {
      console.error("Save failed", err);
      alert("Save failed. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  // --- FIXED: Generate Certificates (Added Headers) ---
  const handleGenerateCertificates = async () => {
    try {
      if (!window.confirm("Generate certificates for all participants?")) return;

      setGenerating(true);
      const token = localStorage.getItem("token");
      
      const res = await axios.post(
        `http://localhost:5000/api/events/${eventId}/certificates/generate`,
        { type: "participation" },
        { headers: { Authorization: `Bearer ${token}` } } // Added Header
      );
      
      alert(`Done: generated ${res.data.generated || 0}, errors ${res.data.errors || 0}`);
    } catch (err) {
      console.error("Generate failed", err);
      alert("Certificate generation failed");
    } finally {
      setGenerating(false);
    }
  };

  if (loading) {
    return <div className="p-8 text-center text-gray-600">Loading editor...</div>;
  }

  return (
    <div className="w-full max-w-[1400px] mx-auto p-6">
      {/* fonts */}
      <style>
        {`
          @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,700;1,400&family=Great+Vibes&family=Cinzel:wght@400;700&display=swap');
          .font-playfair { font-family: 'Playfair Display', serif; }
          .font-script { font-family: 'Great Vibes', cursive; }
          .font-cinzel { font-family: 'Cinzel', serif; }
        `}
      </style>

      {/* Top actions / quick info */}
      <div className="flex items-center justify-between gap-4 mb-5">
        <h2 className="text-2xl font-semibold">Certificate Template</h2>

        <div className="flex items-center gap-3">
          <label style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <input
              type="checkbox"
              checked={!!data.enabled}
              onChange={(e) => handleChange("enabled", e.target.checked)}
            />
            <span className="text-sm">Template enabled</span>
          </label>

          <button
            onClick={resetTemplate}
            className="px-3 py-1 rounded border text-sm hover:bg-gray-50"
            title="Reset to defaults"
          >
            Reset
          </button>

          <button
            onClick={handleSaveTemplate}
            className="px-4 py-2 bg-indigo-600 text-white rounded shadow-sm hover:bg-indigo-700 disabled:opacity-70"
            disabled={saving}
          >
            {saving ? "Saving..." : "Save"}
          </button>

          <button
            onClick={handleGenerateCertificates}
            className="px-4 py-2 bg-green-600 text-white rounded shadow-sm hover:bg-green-700 disabled:opacity-70"
            disabled={generating}
          >
            {generating ? "Generating..." : "Generate Certificates"}
          </button>
        </div>
      </div>

      {/* Main layout: preview left (2 cols), controls right (1 col) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* PREVIEW (left two cols on large screens) */}
        <div className="lg:col-span-2">
          <div className="bg-slate-100 p-6 rounded-xl border border-gray-200 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-3">
                <span className="bg-indigo-100 text-indigo-600 p-2 rounded">
                  👁️
                </span>
                <div>
                  <div className="text-sm font-medium">Live Preview</div>
                  <div className="text-xs text-gray-500">
                    A4 Landscape — how the PDF will look
                  </div>
                </div>
              </div>

              {/* quick recipient preview edit */}
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={data.recipientName}
                  onChange={(e) => handleChange("recipientName", e.target.value)}
                  className="px-3 py-1 rounded border text-sm"
                  placeholder="Preview recipient name"
                />
              </div>
            </div>

            {/* certificate canvas */}
            <div className="flex justify-center overflow-auto p-4">
              <div
                className="relative bg-white shadow-2xl flex-shrink-0"
                style={{
                  width: "900px",
                  height: "636px",
                  position: "relative",
                }}
              >
                <BackgroundDesign />

                <div
                  style={{
                    position: "absolute",
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    zIndex: 10,
                    display: "flex",
                    flexDirection: "column",
                    padding: "40px 60px",
                    textAlign: "center",
                    color: "#1a2b4f",
                  }}
                >
                  {/* header */}
                  <div style={{ marginTop: 40, marginBottom: 20 }}>
                    <p
                      className="text-[10px] font-bold tracking-[0.3em] uppercase mb-4 font-cinzel"
                      style={{ color: "#6b7280" }}
                    >
                      {data.topHeader}
                    </p>
                    <h1
                      className="text-3xl font-bold uppercase tracking-widest pb-4 font-cinzel w-full"
                      style={{
                        color: "#1f2937",
                        borderBottom: "2px solid #2b6cb0",
                        display: "inline-block",
                        maxWidth: "80%",
                      }}
                    >
                      {data.mainHeader}
                    </h1>
                  </div>

                  {/* title */}
                  <div style={{ marginBottom: 12 }}>
                    <h2
                      className="text-5xl font-playfair font-normal tracking-tight"
                      style={{ color: "#2b6cb0", marginBottom: 12 }}
                    >
                      {data.title}
                    </h2>

                    <div className="flex items-center gap-4 justify-center opacity-70">
                      <div style={{ height: 1, backgroundColor: "#9ca3af", width: 60 }}></div>
                      <p
                        className="text-[10px] uppercase tracking-[0.25em] font-sans font-semibold"
                        style={{ color: "#4b5563" }}
                      >
                        {data.subTitle}
                      </p>
                      <div style={{ height: 1, backgroundColor: "#9ca3af", width: 60 }}></div>
                    </div>
                  </div>

                  {/* recipient */}
                  <div style={{ padding: "20px 0 30px 0" }}>
                    <p
                      className="text-9xl font-playfair relative z-10 leading-none"
                      style={{ color: "#1f2937", fontSize: "30px" }}
                    >
                      {data.recipientName}
                    </p>
                  </div>

                  {/* body */}
                  <div
                    style={{
                      maxWidth: "75%",
                      margin: "0 auto",
                      display: "flex",
                      flexDirection: "column",
                      gap: 12,
                    }}
                  >
                    <p
                      className="text-lg italic font-playfair leading-relaxed"
                      style={{ color: "#4b5563" }}
                    >
                      {data.presentationText}
                    </p>
                    <p
                      className="text-lg font-playfair leading-relaxed font-medium"
                      style={{ color: "#374151" }}
                    >
                      {data.bodyText}
                    </p>
                  </div>

                  <div style={{ flex: 1 }} />

                  {/* footer */}
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "flex-end",
                      paddingBottom: 30,
                      paddingLeft: 20,
                      paddingRight: 20,
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        width: "100%",
                        justifyContent: "space-around",
                        alignItems: "flex-end",
                      }}
                    >
                      <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
                        <p
                          className="text-sm font-semibold border-t pt-2 px-8 min-w-[160px] font-playfair"
                          style={{ borderColor: "#9ca3af", color: "#1f2937" }}
                        >
                          {data.dateText || new Date().toLocaleDateString()}
                        </p>
                        <span
                          className="text-[10px] uppercase tracking-wider font-sans mt-1 font-bold"
                          style={{ color: "#2b6cb0" }}
                        >
                          Date
                        </span>
                      </div>

                      {data.signatures.map((sig) => (
                        <div
                          key={sig.id}
                          style={{
                            display: "flex",
                            flexDirection: "column",
                            alignItems: "center",
                          }}
                        >
                          <div
                            style={{
                              height: 50,
                              display: "flex",
                              alignItems: "flex-end",
                              marginBottom: 4,
                            }}
                          >
                            <span
                              className="font-script text-4xl opacity-80 -rotate-6"
                              style={{ color: "#1e3a8a" }}
                            >
                              {sig.imageUrl ? (
                                <img
                                  src={sig.imageUrl}
                                  alt="sig"
                                  style={{ height: 36, objectFit: "contain" }}
                                />
                              ) : (
                                "Sign"
                              )}
                            </span>
                          </div>

                          <div
                            style={{
                              borderTop: "1px solid #9ca3af",
                              paddingTop: 8,
                              minWidth: 180,
                              textAlign: "center",
                            }}
                          >
                            <div
                              className="font-bold text-xs uppercase tracking-widest font-cinzel"
                              style={{ color: "#1f2937" }}
                            >
                              {sig.name || " "}
                            </div>
                            <div
                              className="text-[9px] uppercase tracking-wider font-sans mt-1 font-bold"
                              style={{ color: "#2b6cb0" }}
                            >
                              {sig.role || " "}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="text-xs text-gray-500 mt-3">
              Tip: update fields in sidebar to update preview instantly.
            </div>
          </div>
        </div>

        {/* SIDEBAR (right column) */}
        <aside className="lg:col-span-1">
          <div className="editor-controls-wrapper">
            <style>{`
    .editor-controls-wrapper { font-family: Inter, ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial; }
    .controls-card { background: #fff; border-radius: 12px; border: 1px solid #e6e7ea; box-shadow: 0 6px 18px rgba(16,24,40,0.04); overflow: hidden }
    .controls-header { display:flex; justify-content:space-between; align-items:center; gap:12px; padding:16px 20px; border-bottom:1px solid #f1f3f5; background:#fbfdff }
    .controls-grid { display:grid; grid-template-columns: 1fr 1fr 320px; gap:20px; padding:18px; }
    @media (max-width: 1024px) { .controls-grid { grid-template-columns: 1fr; } .sticky-col { position: static !important; max-height: none !important } }
    .form-section { background:transparent; padding:0; }
    .form-group { display:flex; flex-direction:column; gap:6px; margin-bottom:8px; }
    .form-label { font-size:12px; font-weight:600; color:#374151; text-transform:uppercase; letter-spacing:0.06em; }
    .form-input { padding:10px 12px; border-radius:8px; border:1px solid #e6e7ea; background:#fff; font-size:14px; outline:none; }
    .form-input:focus { box-shadow:0 4px 12px rgba(99,102,241,0.08); border-color:#6366f1; }
    .form-textarea { min-height:96px; resize:vertical; padding:10px 12px; border-radius:8px; border:1px solid #e6e7ea; font-size:14px; }
    .sign-list { display:flex; flex-direction:column; gap:10px; max-height:420px; overflow:auto; padding-right:6px; }
    .sign-card { border-radius:8px; border:1px solid #eef2ff; background:#fcfdff; padding:10px; display:flex; gap:8px; align-items:flex-start; }
    .sign-card input { flex:1; }
    .actions-row { display:flex; gap:10px; justify-content:flex-end; padding:16px 20px; border-top:1px solid #f1f3f5; }
    .btn { padding:10px 14px; border-radius:8px; font-weight:600; cursor:pointer; border:0; }
    .btn-primary { background:#4f46e5; color:white; }
    .btn-ghost { background:transparent; border:1px solid #e6e7ea; color:#111827; }
    .btn-success { background:#059669; color:white; }
    .small-btn { padding:6px 8px; font-size:13px; }
  `}</style>

            <div className="controls-card">
              <div className="controls-header">
                <div>
                  <div style={{ fontSize: 16, fontWeight: 700, color: "#0f172a" }}>
                    Template Settings
                  </div>
                  <div style={{ fontSize: 13, color: "#6b7280" }}>
                    Organise headers, body, and signatories
                  </div>
                </div>
              </div>

              <div className="controls-grid">
                {/* Column 1: Header & Title */}
                <div className="form-section">
                  <h4 style={{ marginBottom: 8, color: "#111827", fontWeight: 700 }}>
                    Header & Title
                  </h4>
                  <div className="form-group">
                    <label className="form-label">Top label</label>
                    <input
                      className="form-input"
                      value={data.topHeader}
                      onChange={(e) => handleChange("topHeader", e.target.value)}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Institution / Main header</label>
                    <input
                      className="form-input"
                      value={data.mainHeader}
                      onChange={(e) => handleChange("mainHeader", e.target.value)}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Certificate title</label>
                    <input
                      className="form-input"
                      value={data.title}
                      onChange={(e) => handleChange("title", e.target.value)}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Subtitle</label>
                    <input
                      className="form-input"
                      value={data.subTitle}
                      onChange={(e) => handleChange("subTitle", e.target.value)}
                    />
                  </div>
                </div>

                {/* Column 2: Body */}
                <div className="form-section">
                  <h4 style={{ marginBottom: 8, color: "#111827", fontWeight: 700 }}>
                    Body
                  </h4>
                  <div className="form-group">
                    <label className="form-label">Presentation line</label>
                    <input
                      className="form-input"
                      value={data.presentationText}
                      onChange={(e) => handleChange("presentationText", e.target.value)}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Body text</label>
                    <textarea
                      className="form-textarea"
                      value={data.bodyText}
                      onChange={(e) => handleChange("bodyText", e.target.value)}
                    />
                  </div>
                  <div style={{ display: "flex", gap: 8, alignItems: "center", marginTop: 6 }}>
                    <input
                      className="form-input"
                      style={{ flex: 1 }}
                      value={data.dateText}
                      onChange={(e) => handleChange("dateText", e.target.value)}
                      placeholder="Optional: fixed date"
                    />
                  </div>
                </div>

                {/* Column 3: Signatories */}
                <div className="form-section sticky-col" style={{ position: "sticky", top: 20, alignSelf: "start" }}>
                  <h4 style={{ marginBottom: 8, color: "#111827", fontWeight: 700 }}>
                    Signatories
                  </h4>
                  <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
                    <button onClick={addSignature} className="btn btn-ghost small-btn">
                      + Add
                    </button>
                  </div>
                  <div className="sign-list">
                    {data.signatures.map((sig) => (
                      <div className="sign-card" key={sig.id}>
                        <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 6 }}>
                          <input
                            className="form-input"
                            value={sig.name}
                            placeholder="Name"
                            onChange={(e) => handleSignatureChange(sig.id, "name", e.target.value)}
                          />
                          <input
                            className="form-input"
                            value={sig.role}
                            placeholder="Role / Title"
                            onChange={(e) => handleSignatureChange(sig.id, "role", e.target.value)}
                          />
                          <input
                            className="form-input"
                            value={sig.imageUrl || ""}
                            placeholder="Sig URL (opt)"
                            onChange={(e) => handleSignatureChange(sig.id, "imageUrl", e.target.value)}
                          />
                        </div>
                        <div style={{ display: "flex", flexDirection: "column", gap: 8, marginLeft: 8 }}>
                          <button onClick={() => removeSignature(sig.id)} className="btn btn-ghost small-btn" title="Remove">
                            ✕
                          </button>
                        </div>
                      </div>
                    ))}
                    {data.signatures.length === 0 && (
                      <div style={{ padding: 16, border: "1px dashed #e6e7ea", borderRadius: 8, textAlign: "center", color: "#9ca3af" }}>
                        No signatories yet
                      </div>
                    )}
                  </div>

                  <div style={{ marginTop: 14 }}>
                    <button onClick={handleSaveTemplate} className="btn btn-primary" style={{ width: "100%" }}>
                      {saving ? "Saving..." : "Save"}
                    </button>
                    <button
                      onClick={handleGenerateCertificates}
                      className="btn btn-success"
                      style={{ width: "100%", marginTop: 8 }}
                    >
                      {generating ? "Generating..." : "Generate Certificates"}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
};

export default CertificateTemplateEditor;