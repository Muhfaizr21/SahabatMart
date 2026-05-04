import React, { useState, useEffect, useRef } from 'react';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';
import { API_BASE, fetchJson } from '../lib/api';

// ── AI Skin Analyzer ──────────────────────────────────────────────────────
async function analyzePhotoWithAI(file) {
  const formData = new FormData();
  formData.append('photo', file);
  const token = localStorage.getItem('token');
  const res = await fetch(`${API_BASE}/api/skin/analyze`, {
    method: 'POST',
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: formData,
  });
  const json = await res.json();
  if (!res.ok) {
    throw new Error(json?.message || json?.error || 'Analisis gagal');
  }
  // Unwrap backend response wrapper {status, data} -> data
  return json?.data ?? json;
}

export default function SkinJourney() {
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [journal, setJournal] = useState('');
  const [savingJournal, setSavingJournal] = useState(false);
  const [showQR, setShowQR] = useState(false);
  const fileInputRef = useRef(null);

  // Weekly Tracker State
  const [showTracker, setShowTracker] = useState(false);
  const [trackerForm, setTrackerForm] = useState({
    skin_score: 5, emotional_score: 5, allow_marketing: false, notes: ''
  });

  // AI Analyzer State
  const [photoFile, setPhotoFile] = useState(null);
  const [photoPreview, setPhotoPreview] = useState(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [aiResult, setAiResult] = useState(null);

  const loadData = async () => {
    try {
      const params = new URLSearchParams(window.location.search);
      const tokenParam = params.get('token');
      
      let url = `${API_BASE}/api/skin/journey`;
      if (tokenParam) {
        url = `${API_BASE}/api/skin/journey?token=${tokenParam}`;
      }

      const res = await fetchJson(url);
      setData(res);
    } catch (err) {
      if (err.message.includes('404') || err.message.includes('Pre-test not found')) {
        // Jika belum pre-test, arahkan ke pendaftaran
        window.location.href = '/skin/pretest';
        return;
      }
      // Munculkan pesan error aslinya agar kita bisa debug
      toast.error(`Koneksi Gagal: ${err.message}`);
      console.error('DEBUG SKIN JOURNEY:', err);
    } finally {
      setLoading(false);
    }
  };

  // Derived State for Synchronization
  const currentWeekNumber = (() => {
    if (!data?.pretest?.created_at) return null;
    const createdAt = new Date(data.pretest.created_at);
    if (isNaN(createdAt.getTime()) || createdAt.getFullYear() < 2000) return null;
    const daysSince = Math.floor((Date.now() - createdAt) / (1000 * 60 * 60 * 24));
    return Math.min(52, Math.max(1, Math.floor(daysSince / 7) + 1));
  })();

  const alreadyUploadedThisWeek = currentWeekNumber != null &&
    data?.progress_logs?.some(p => p.week_number === currentWeekNumber);

  useEffect(() => { loadData(); }, []);

  const saveJournal = async () => {
    if (!journal) return;
    setSavingJournal(true);
    try {
      const res = await fetchJson(`${API_BASE}/api/skin/journal`, {
        method: 'POST',
        body: JSON.stringify({ content: journal })
      });
      toast.success('Jurnal berhasil disimpan!');
      if (res.reward) toast(res.reward, { icon: '🎁', duration: 6000 });
      setJournal('');
      loadData();
    } catch (err) {
      toast.error('Gagal menyimpan jurnal.');
    } finally {
      setSavingJournal(false);
    }
  };
  const saveProgress = async () => {
    if (alreadyUploadedThisWeek) {
      toast.error(`Kamu sudah upload progres minggu ke-${currentWeekNumber}! Tunggu minggu depan ya 💪`);
      return;
    }

    try {
      const res = await fetchJson(`${API_BASE}/api/skin/progress`, {
        method: 'POST',
        body: JSON.stringify(trackerForm)
      });
      toast.success(res.message || 'Progres berhasil disimpan!');
      setShowTracker(false);
      loadData();
    } catch (err) {
      toast.error(err.message || 'Gagal menyimpan progres.');
    }
  };

  // ── AI Photo Analyzer handlers ─────────────────────
  const handlePhotoSelect = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setPhotoFile(file);
    setPhotoPreview(URL.createObjectURL(file));
    setAiResult(null);
  };

  const handleAnalyze = async () => {
    if (!photoFile) return;
    setAnalyzing(true);
    setAiResult(null);
    try {
      const result = await analyzePhotoWithAI(photoFile);
      setAiResult(result);
      // Sync skor dari AI ke tracker form
      if (result.skin_score) {
        setTrackerForm(f => ({ ...f, skin_score: result.skin_score }));
      }
      toast.success(result.is_mock ? 'Analisis selesai (Mode Demo)' : '🤖 Analisis AI selesai!');
    } catch (err) {
      toast.error(err.message || 'Gagal menganalisis foto. Periksa koneksi.');
      console.error('AI analyze error:', err);
    } finally {
      setAnalyzing(false);
    }
  };

  const STYLES = {
    container: { maxWidth: '800px', margin: '0 auto', padding: '40px 20px', fontFamily: "'Inter', sans-serif", color: '#1e293b' },
    affirmation: { background: 'linear-gradient(135deg, #ff8fa3 0%, #ff4d6d 100%)', padding: '40px', borderRadius: '30px', color: 'white', textAlign: 'center', marginBottom: '40px', boxShadow: '0 20px 40px rgba(255, 77, 109, 0.2)' },
    card: { background: 'white', padding: '30px', borderRadius: '24px', boxShadow: '0 10px 30px rgba(0,0,0,0.03)', border: '1px solid #f1f5f9', marginBottom: '30px' },
    badge: { padding: '6px 16px', borderRadius: '50px', background: '#fff1f2', color: '#ff4d6d', fontWeight: '700', fontSize: '14px' },
    ritualBtn: { width: '100%', padding: '20px', borderRadius: '20px', border: '2px solid #ff4d6d', background: 'white', color: '#ff4d6d', fontWeight: '700', cursor: 'pointer', fontSize: '18px' },
    slider: { width: '100%', accentColor: '#ff4d6d', height: '8px', borderRadius: '5px', cursor: 'pointer' },
    aiBadge: { background: '#f0f9ff', color: '#0369a1', padding: '4px 12px', borderRadius: '50px', fontSize: '11px', fontWeight: '700', border: '1px solid #bae6fd' },
    eduCard: { background: '#f8fafc', padding: '15px', borderRadius: '15px', border: '1px solid #e2e8f0', marginBottom: '15px' }
  };

  if (loading) return <div style={{ textAlign: 'center', padding: '100px' }}>Menyiapkan Journey-mu...</div>;


  const currentAffirmation = data?.affirmations?.[data.day_count % data.affirmations.length] || data?.affirmations?.[0];
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(window.location.origin + '/skin/journey?token=' + data?.pretest?.barcode_token)}`;

  return (
    <div style={STYLES.container}>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      {/* Header & Barcode Toggle */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' }}>
        <div>
          <h2 style={{ margin: 0, fontSize: '24px' }}>Halo, {data?.pretest?.full_name}! ✨</h2>
          <p style={{ color: '#64748b', margin: '5px 0' }}>Hari ke-{data?.day_count} di Akuglow Digital Journey</p>
        </div>
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          <button 
            onClick={() => setShowQR(!showQR)}
            style={{ border: 'none', background: '#f1f5f9', width: '40px', height: '40px', borderRadius: '10px', cursor: 'pointer', fontSize: '20px', color: '#64748b' }}
            title="My Digital Barcode"
          >
            <i className="bx bx-qr-scan" />
          </button>
          <div style={STYLES.badge}>Skin Warrior: {data?.stats?.level_name || 'Novice'}</div>
        </div>
      </div>

      {/* Digital Barcode Modal / Section */}
      {showQR && (
        <div style={{ ...STYLES.card, textAlign: 'center', border: '2px solid #ff4d6d' }}>
           <h4 style={{ marginTop: 0 }}>My Digital Skin Journey Barcode</h4>
           <img src={qrUrl} alt="Barcode" style={{ width: '150px', borderRadius: '10px', marginBottom: '15px' }} />
           <p style={{ fontSize: '12px', color: '#64748b', margin: 0 }}>Simpan barcode ini untuk akses cepat ke journey-mu.</p>
           <button onClick={() => setShowQR(false)} style={{ marginTop: '15px', border: 'none', background: 'none', color: '#ff4d6d', fontWeight: '700', cursor: 'pointer' }}>Tutup</button>
        </div>
      )}

      {/* 1. Motivasi & Affirmation */}
      <div style={STYLES.affirmation}>
        <h3 style={{ fontSize: '22px', fontWeight: '600', lineHeight: 1.6, margin: 0 }}>
          "{currentAffirmation}"
        </h3>
        <p style={{ marginTop: '20px', fontSize: '14px', opacity: 0.8 }}>Ingat, proses penyembuhan memang tidak instan.</p>
      </div>

      {/* 2. Edukasi Psikologis (Podcast & Artikel) */}
      <div style={STYLES.card}>
        <h4 style={{ marginTop: 0, marginBottom: '20px' }}><i className="bx bx-book-heart" style={{ color: '#ff4d6d', marginRight: '8px' }} /> Edukasi Psikologis</h4>
        {data?.educations?.length > 0 ? data.educations.map((edu, i) => (
          <div key={i} style={STYLES.eduCard}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
               <h5 style={{ margin: 0, fontSize: '15px' }}>{edu.title}</h5>
               <span style={{ fontSize: '10px', background: '#fee2e2', color: '#ff4d6d', padding: '2px 8px', borderRadius: '4px', fontWeight: '700' }}>{edu.content_type.toUpperCase()}</span>
            </div>
            <p style={{ fontSize: '13px', color: '#64748b', margin: '8px 0' }}>{edu.content}</p>
            {edu.media_url && (
              <a href={edu.media_url} target="_blank" rel="noreferrer" style={{ fontSize: '12px', color: '#ff4d6d', fontWeight: '700', textDecoration: 'none' }}>
                <i className={edu.content_type === 'podcast' ? 'bx bx-play-circle' : 'bx bx-link-external'} style={{ marginRight: '4px' }} /> 
                {edu.content_type === 'podcast' ? 'Dengarkan Podcast' : 'Baca Selengkapnya'}
              </a>
            )}
          </div>
        )) : (
          <p style={{ fontSize: '13px', color: '#64748b', textAlign: 'center' }}>Materi edukasi hari ini sedang disiapkan.</p>
        )}
      </div>

      {/* 3. Ritual 60 Detik */}
      <div style={STYLES.card}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '15px', marginBottom: '20px' }}>
          <div style={{ width: '45px', height: '45px', background: '#fff1f2', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ff4d6d', fontSize: '20px' }}>
            <i className="bx bx-heart" />
          </div>
          <div>
            <h4 style={{ margin: 0 }}>Ritual 60 Detik</h4>
            <p style={{ margin: 0, fontSize: '13px', color: '#64748b' }}>"Sambil mengoleskan krim, ucapkan terimakasih pada kulitmu."</p>
          </div>
        </div>
        <button style={STYLES.ritualBtn} onClick={() => toast('Ritual dimulai... Fokus pada kebaikan kulitmu.', { icon: '🧘‍♀️' })}>
          Mulai Ritual Kehadiran
        </button>
      </div>

      {/* 4. AI Skin Analyzer + Progress Tracker */}
      <div style={STYLES.card}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <h4 style={{ margin: 0 }}>🤖 AI Skin Analyzer</h4>
          <span style={STYLES.aiBadge}><i className="bx bx-chip" /> AI Active</span>
        </div>

        {/* Upload Zone */}
        <input ref={fileInputRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handlePhotoSelect} />

        {!photoPreview ? (
          <button
            onClick={() => fileInputRef.current?.click()}
            style={{ width: '100%', padding: '40px 20px', borderRadius: '20px', border: '2px dashed #fda4af', background: '#fff1f2', color: '#ff4d6d', cursor: 'pointer', fontWeight: '600', fontSize: '15px' }}
          >
            <div style={{ fontSize: '48px', marginBottom: '12px' }}>📸</div>
            <div>Upload Foto Bare-Face (Tanpa Filter)</div>
            <div style={{ fontSize: '12px', color: '#94a3b8', marginTop: '8px' }}>AI akan menganalisis kemerahan, jerawat & kelembapan kulit Anda</div>
          </button>
        ) : (
          <div>
            {/* Preview */}
            <div style={{ position: 'relative', textAlign: 'center', marginBottom: '16px' }}>
              <img src={photoPreview} alt="Preview" style={{ width: '100%', maxHeight: '320px', objectFit: 'cover', borderRadius: '20px', border: '3px solid #fda4af' }} />
              <button
                onClick={() => { setPhotoPreview(null); setPhotoFile(null); setAiResult(null); }}
                style={{ position: 'absolute', top: '10px', right: '10px', background: 'rgba(0,0,0,0.5)', border: 'none', borderRadius: '50%', width: '32px', height: '32px', color: 'white', cursor: 'pointer', fontSize: '16px' }}
              >×</button>
            </div>

            {/* Analyze Button */}
            {!aiResult && (
              <button
                onClick={handleAnalyze}
                disabled={analyzing}
                style={{ width: '100%', padding: '16px', borderRadius: '16px', border: 'none', background: analyzing ? '#94a3b8' : 'linear-gradient(135deg, #ff4d6d, #ff8fa3)', color: 'white', fontWeight: '700', fontSize: '16px', cursor: analyzing ? 'not-allowed' : 'pointer' }}
              >
                {analyzing ? (
                  <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                    <span style={{ display: 'inline-block', width: 16, height: 16, borderRadius: '50%', border: '2px solid #fff', borderTopColor: 'transparent', animation: 'spin 0.7s linear infinite' }} />
                    AI sedang menganalisis kulitmu...
                  </span>
                ) : '🔍 Analisis dengan AI'}
              </button>
            )}

            {/* AI Result */}
            {aiResult && (
              <div style={{ marginTop: '20px', background: '#f8fafc', borderRadius: '20px', padding: '24px' }}>
                {/* Header + Provider badge */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
                  <h5 style={{ margin: 0, color: '#1e293b', fontSize: '15px' }}>✨ Hasil Analisis AI</h5>
                  <div style={{ display: 'flex', gap: 6 }}>
                    {aiResult.is_mock && (
                      <span style={{ background: '#fef3c7', color: '#92400e', padding: '3px 10px', borderRadius: 20, fontSize: 10, fontWeight: 800, border: '1px solid #fde68a' }}>DEMO MODE</span>
                    )}
                    {!aiResult.is_mock && (
                      <span style={{ background: '#dcfce7', color: '#166534', padding: '3px 10px', borderRadius: 20, fontSize: 10, fontWeight: 800, border: '1px solid #bbf7d0' }}>🤖 {aiResult.ai_provider || 'openai'}</span>
                    )}
                  </div>
                </div>

                {/* Skin Type + Tone Pills */}
                {(aiResult.skin_type || aiResult.skin_tone) && (
                  <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
                    {aiResult.skin_type && (
                      <span style={{ background: '#ede9fe', color: '#5b21b6', padding: '5px 14px', borderRadius: 20, fontSize: 12, fontWeight: 700 }}>
                        Tipe: {aiResult.skin_type}
                      </span>
                    )}
                    {aiResult.skin_tone && (
                      <span style={{ background: '#fce7f3', color: '#9d174d', padding: '5px 14px', borderRadius: 20, fontSize: 12, fontWeight: 700 }}>
                        Warna: {aiResult.skin_tone}
                      </span>
                    )}
                    {aiResult.primary_concern && (
                      <span style={{ background: '#fee2e2', color: '#991b1b', padding: '5px 14px', borderRadius: 20, fontSize: 12, fontWeight: 700 }}>
                        ⚠️ {aiResult.primary_concern}
                      </span>
                    )}
                  </div>
                )}

                {/* Metric Bars */}
                {[
                  { label: 'Kondisi Kulit', value: aiResult.skin_score, max: 10, color: '#22c55e', unit: '/10' },
                  { label: 'Kemerahan (Redness)', value: aiResult.redness, max: 100, color: '#ef4444', unit: '%' },
                  { label: 'Kelembapan (Moisture)', value: aiResult.moisture, max: 100, color: '#3b82f6', unit: '%' },
                ].map(m => (
                  <div key={m.label} style={{ marginBottom: '14px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px', fontSize: '13px' }}>
                      <span style={{ fontWeight: '600', color: '#475569' }}>{m.label}</span>
                      <span style={{ fontWeight: '800', color: m.color }}>{m.value}{m.unit}</span>
                    </div>
                    <div style={{ background: '#e2e8f0', borderRadius: '8px', height: '10px', overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: `${(m.value / m.max) * 100}%`, background: m.color, borderRadius: '8px', transition: 'width 1s ease' }} />
                    </div>
                  </div>
                ))}

                {/* Acne Count */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px', background: 'white', borderRadius: '12px', marginBottom: '16px', border: '1px solid #fee2e2' }}>
                  <span style={{ fontSize: '24px' }}>🔴</span>
                  <div>
                    <p style={{ margin: 0, fontSize: '12px', color: '#94a3b8', fontWeight: '700' }}>JERAWAT TERDETEKSI</p>
                    <p style={{ margin: 0, fontWeight: '800', color: '#ef4444', fontSize: '20px' }}>{aiResult.acne_count || 0} titik</p>
                  </div>
                </div>

                {/* Summary */}
                <div style={{ background: 'white', borderRadius: '12px', padding: '16px', marginBottom: '12px', border: '1px solid #e2e8f0' }}>
                  <p style={{ margin: '0 0 6px', fontSize: 11, fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase' }}>Ringkasan Kondisi</p>
                  <p style={{ margin: 0, fontSize: '13px', color: '#475569', lineHeight: 1.7 }}>{aiResult.summary}</p>
                </div>

                {/* Positive Notes */}
                {aiResult.positive_notes && (
                  <div style={{ background: '#f0fdf4', borderRadius: '12px', padding: '14px', marginBottom: '12px', border: '1px solid #bbf7d0' }}>
                    <p style={{ margin: '0 0 4px', fontSize: 11, fontWeight: 800, color: '#166534', textTransform: 'uppercase' }}>💚 Yang Positif dari Kulitmu</p>
                    <p style={{ margin: 0, fontSize: '13px', color: '#166534', lineHeight: 1.7 }}>{aiResult.positive_notes}</p>
                  </div>
                )}

                {/* Healing Message */}
                {aiResult.healing_message && (
                  <div style={{ background: 'linear-gradient(135deg,#fdf2f8,#fce7f3)', borderRadius: '14px', padding: '16px', marginBottom: '16px', border: '1px solid #fbcfe8', textAlign: 'center' }}>
                    <p style={{ margin: 0, fontSize: '14px', color: '#831843', fontStyle: 'italic', fontWeight: 600, lineHeight: 1.7 }}>
                      "💕 {aiResult.healing_message}"
                    </p>
                  </div>
                )}

                {/* Recommendations */}
                {aiResult.recommendations?.length > 0 && (
                  <div style={{ marginBottom: 16 }}>
                    <p style={{ margin: '0 0 10px', fontSize: '13px', fontWeight: '700', color: '#64748b', textTransform: 'uppercase' }}>Rekomendasi Perawatan</p>
                    {aiResult.recommendations.map((r, i) => (
                      <div key={i} style={{ display: 'flex', gap: '10px', alignItems: 'flex-start', marginBottom: '8px', background: 'white', padding: '10px 12px', borderRadius: 10, border: '1px solid #f1f5f9' }}>
                        <span style={{ color: '#22c55e', fontWeight: '800', flexShrink: 0, marginTop: 1 }}>✓</span>
                        <span style={{ fontSize: '13px', color: '#475569' }}>{r}</span>
                      </div>
                    ))}
                  </div>
                )}

                {/* Save Progress */}
                <div style={{ marginTop: '20px', borderTop: '1px solid #e2e8f0', paddingTop: '16px' }}>
                  <FieldLabel label={`Skor Kondisi (dari AI: ${aiResult.skin_score}/10)`} />
                  <input type="range" min="1" max="10" style={STYLES.slider} value={trackerForm.skin_score}
                    onChange={e => setTrackerForm({ ...trackerForm, skin_score: parseInt(e.target.value) })} />
                  <FieldLabel label={`Perasaan Emosional: ${trackerForm.emotional_score}/10`} />
                  <input type="range" min="1" max="10" style={STYLES.slider} value={trackerForm.emotional_score}
                    onChange={e => setTrackerForm({ ...trackerForm, emotional_score: parseInt(e.target.value) })} />
                  <label style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '13px', color: '#64748b', cursor: 'pointer', marginTop: '12px' }}>
                    <input type="checkbox" checked={trackerForm.allow_marketing} onChange={e => setTrackerForm({ ...trackerForm, allow_marketing: e.target.checked })} />
                    Izin gunakan foto untuk konten edukasi/marketing (Anonim)
                  </label>
                  <button onClick={saveProgress} style={{ width: '100%', marginTop: '16px', padding: '14px', borderRadius: '14px', border: 'none', background: '#1e293b', color: 'white', fontWeight: '700', cursor: 'pointer', fontSize: '15px' }}>
                    💾 Simpan Progres Mingguan
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Grafik Progress - Synchronized Timeline */}
        {(() => {
          const weeksToShow = Math.max(currentWeekNumber || 0, (data?.progress_logs?.length || 0));
          if (weeksToShow === 0) return null;

          return (
            <div style={{ marginTop: '25px' }}>
              <p style={{ fontSize: '12px', fontWeight: '700', color: '#94a3b8', textTransform: 'uppercase', marginBottom: '15px' }}>Grafik Perubahan (W1 - W{weeksToShow})</p>
              <div style={{ display: 'flex', alignItems: 'flex-end', gap: '10px', height: '100px' }}>
                {Array.from({ length: weeksToShow }, (_, i) => {
                  const wNum = i + 1;
                  const log = data?.progress_logs?.find(p => Math.max(1, p.week_number) === wNum);
                  const isCurrent = wNum === currentWeekNumber;

                  return (
                    <div key={wNum} style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      <div 
                        style={{ 
                          height: log ? `${log.skin_score * 10}%` : '4px', 
                          background: log 
                            ? (isCurrent ? 'linear-gradient(180deg, #ff4d6d, #fb7185)' : 'linear-gradient(180deg, #94a3b8, #cbd5e1)') 
                            : '#f1f5f9', 
                          borderRadius: '4px', 
                          position: 'relative' 
                        }} 
                        title={log ? `Minggu ${wNum}: Skor ${log.skin_score}` : `Minggu ${wNum}: Belum ada data`}
                      >
                        {log && <span style={{ position: 'absolute', top: '-18px', left: '50%', transform: 'translateX(-50%)', fontSize: '10px', fontWeight: '800', color: isCurrent ? '#ff4d6d' : '#64748b' }}>{log.skin_score}</span>}
                      </div>
                      <div style={{ textAlign: 'center', fontSize: '10px', fontWeight: isCurrent ? '800' : '500', color: isCurrent ? '#ff4d6d' : '#94a3b8' }}>W{wNum}</div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })()}
      </div>


      {/* 5. Jurnal Harian */}
      <div style={STYLES.card}>
        <h4 style={{ marginTop: 0, marginBottom: '15px' }}>Jurnal Harian</h4>
        <textarea 
          placeholder="Tuliskan proses penyembuhanmu hari ini..."
          style={{ width: '100%', height: '100px', border: '1px solid #e2e8f0', borderRadius: '15px', padding: '15px', outline: 'none', resize: 'none', fontSize: '14px' }}
          value={journal} onChange={e => setJournal(e.target.value)}
        />
        <button disabled={savingJournal} onClick={saveJournal} style={{ width: '100%', marginTop: '15px', padding: '14px', borderRadius: '15px', border: 'none', background: '#1e293b', color: 'white', fontWeight: '600', cursor: 'pointer' }}>
          {savingJournal ? 'Menyimpan...' : 'Kirim Jurnal'}
        </button>
      </div>

      {/* 6. Komunitas Akuglow Survivor */}
      <div style={{ ...STYLES.card, background: '#f0fdf4', border: '1px solid #bbf7d0', textAlign: 'center' }}>
        <h4 style={{ margin: 0, color: '#166534' }}>Akuglow Survivor Community</h4>
        <p style={{ fontSize: '13px', color: '#166534', opacity: 0.8, margin: '8px 0 15px' }}>Bergabung dengan sesama pejuang kulit di feed komunitas internal kami.</p>
        <button 
          onClick={() => navigate('/affiliate/community')}
          style={{ padding: '10px 24px', borderRadius: '50px', border: 'none', background: '#22c55e', color: 'white', fontWeight: '700', cursor: 'pointer' }}
        >
          Buka Survivor Feed
        </button>
      </div>
    </div>
  );
}

function FieldLabel({ label }) {
  return <label style={{ display: 'block', marginBottom: '8px', fontWeight: '700', fontSize: '14px', color: '#475569' }}>{label}</label>;
}
