import React, { useState, useEffect } from 'react';
import { ADMIN_API_BASE, fetchJson, formatImage } from '../../lib/api';
import { A, PageHeader, TablePanel, FieldLabel } from '../../lib/adminStyles.jsx';
import { AdminSearch } from '../../lib/adminComponents.jsx';
import toast from 'react-hot-toast';

const API = ADMIN_API_BASE;

export default function AdminMediaLibrary() {
  const [mediaList, setMediaList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [selectedItem, setSelectedItem] = useState(null);
  const [uploading, setUploading] = useState(false);

  const limit = 24;

  const fetchMedia = () => {
    setLoading(true);
    fetchJson(`${API}/media?search=${encodeURIComponent(searchTerm)}&page=${page}&limit=${limit}`)
      .then(resp => {
        setMediaList(resp?.data || []);
        setTotal(resp?.total || 0);
      })
      .catch(err => {
        toast.error('Gagal memuat media library: ' + err.message);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchMedia();
  }, [page, searchTerm]);

  // Reset to page 1 on search
  useEffect(() => {
    setPage(1);
  }, [searchTerm]);

  const handleUpload = async (e) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setUploading(true);
    let successCount = 0;

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      if (file.size > 50 * 1024 * 1024) {
        toast.error(`Berkas ${file.name} melebihi batas ukuran 50MB`);
        continue;
      }

      const formData = new FormData();
      formData.append('image', file);

      try {
        const resp = await fetch(`${API}/media/upload`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`,
            'ngrok-skip-browser-warning': 'true'
          },
          body: formData
        });

        if (!resp.ok) throw new Error(`HTTP Error ${resp.status}`);
        const responseData = await resp.json();
        
        if (responseData?.data?.url) {
          successCount++;
        }
      } catch (err) {
        toast.error(`Gagal upload ${file.name}: ${err.message}`);
      }
    }

    if (successCount > 0) {
      toast.success(`${successCount} berkas media berhasil ditambahkan`);
      fetchMedia();
    }
    setUploading(false);
  };

  const handleDelete = (item, e) => {
    if (e) e.stopPropagation();
    if (!window.confirm(`Hapus berkas "${item.filename}" secara permanen? Tindakan ini tidak dapat dibatalkan.`)) return;

    fetchJson(`${API}/media/delete?id=${item.id}`, { method: 'DELETE' })
      .then(() => {
        toast.success('Media berhasil dihapus dari server');
        if (selectedItem?.id === item.id) {
          setSelectedItem(null);
        }
        fetchMedia();
      })
      .catch(err => {
        toast.error('Gagal menghapus media: ' + err.message);
      });
  };

  const handleCopyUrl = (url) => {
    navigator.clipboard.writeText(window.location.origin + url);
    toast.success('URL berkas berhasil disalin!');
  };

  const totalPages = Math.ceil(total / limit);

  // Format bytes helper
  const formatBytes = (bytes, decimals = 2) => {
    if (!bytes) return '0 Bytes';
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
  };

  return (
    <div style={{ maxWidth: 1400, margin: '0 auto', paddingBottom: 60 }} className="fade-in">
      <style>{`
        .media-manager-grid {
          display: grid;
          grid-template-columns: 1fr 340px;
          gap: 24px;
          align-items: start;
        }
        .media-library-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(130px, 1fr));
          gap: 16px;
        }
        .media-card {
          aspect-ratio: 1;
          border-radius: 16px;
          border: 1.5px solid #e2e8f0;
          background: #fff;
          overflow: hidden;
          cursor: pointer;
          position: relative;
          box-shadow: 0 1px 3px rgba(0,0,0,0.02);
          transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
        }
        .media-card:hover {
          transform: translateY(-2px) scale(1.01);
          border-color: #6366f1;
          box-shadow: 0 10px 20px rgba(99,102,241,0.08);
        }
        .media-card.selected {
          border-color: #6366f1;
          background: #f5f7ff;
          box-shadow: 0 0 0 2px rgba(99,102,241,0.1);
        }
        .media-card-img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }
        .media-card-badge {
          position: absolute;
          top: 8px;
          right: 8px;
          background: #6366f1;
          color: #fff;
          width: 24px;
          height: 24px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 14px;
          box-shadow: 0 2px 6px rgba(99,102,241,0.3);
        }
        .media-card-trash {
          position: absolute;
          bottom: 8px;
          right: 8px;
          background: rgba(239, 68, 68, 0.9);
          color: #fff;
          width: 28px;
          height: 28px;
          border-radius: 8px;
          display: flex;
          align-items: center;
          justify-content: center;
          opacity: 0;
          transition: 0.15s;
          border: none;
          cursor: pointer;
        }
        .media-card:hover .media-card-trash {
          opacity: 1;
        }
        .media-sidebar-panel {
          background: #fff;
          border-radius: 20px;
          border: 1px solid #f1f5f9;
          padding: 24px;
          box-shadow: 0 1px 3px rgba(0,0,0,0.04);
          position: sticky;
          top: 88px;
        }
        .media-sidebar-placeholder {
          text-align: center;
          padding: 40px 20px;
          color: #94a3b8;
          font-size: 13.5px;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 12px;
        }
        .media-pagination-container {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          margin-top: 32px;
        }
        .media-page-btn {
          width: 36px;
          height: 36px;
          border-radius: 10px;
          border: 1px solid #e2e8f0;
          background: #fff;
          color: #475569;
          font-weight: 700;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: 0.15s;
        }
        .media-page-btn:hover:not(:disabled) {
          border-color: #6366f1;
          color: #6366f1;
        }
        .media-page-btn:disabled {
          opacity: 0.4;
          cursor: not-allowed;
        }
        .media-page-btn.active {
          background: #6366f1;
          color: #fff;
          border-color: #6366f1;
        }
        @media (max-width: 1024px) {
          .media-manager-grid {
            grid-template-columns: 1fr;
          }
          .media-sidebar-panel {
            position: relative;
            top: 0;
          }
        }
      `}</style>

      <PageHeader 
        title="MEDIA LIBRARY" 
        subtitle="Kelola aset multimedia, pustaka gambar, dan dokumen statis website Anda secara terpusat"
      >
        <div style={{ display: 'flex', gap: 10 }}>
          <label className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl transition-all shadow-sm">
            {uploading ? (
              <>
                <i className="bx bx-loader-alt bx-spin" /> Mengunggah...
              </>
            ) : (
              <>
                <i className="bx bx-cloud-upload" /> Unggah Media
              </>
            )}
            <input 
              type="file" 
              multiple 
              accept="image/*,video/*" 
              style={{ display: 'none' }} 
              onChange={handleUpload} 
              disabled={uploading} 
            />
          </label>
        </div>
      </PageHeader>

      <div style={{ marginTop: 24 }} className="media-manager-grid">
        
        {/* Main Content Area */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <TablePanel
            loading={loading}
            toolbar={(
              <AdminSearch placeholder="Cari berdasarkan nama berkas..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
            )}
          >
            <div style={{ padding: 24 }}>
              {mediaList.length === 0 ? (
                <div className="text-center p-12 flex flex-col items-center gap-3">
                  <i className="bx bx-image-alt" style={{ fontSize: 64, color: '#cbd5e1', marginBottom: 12 }} />
                  <h3 style={{ margin: 0, fontSize: 16, fontWeight: 800 }}>Pustaka Media Masih Kosong</h3>
                  <p style={{ margin: '4px 0 0 0', fontSize: 13, color: '#94a3b8' }}>
                    Mulailah mengunggah gambar produk, banner, atau aset gambar lainnya ke server.
                  </p>
                </div>
              ) : (
                <div className="media-library-grid">
                  {mediaList.map(item => {
                    const isSelected = selectedItem?.id === item.id;
                    return (
                      <div 
                        key={item.id}
                        className={`media-card ${isSelected ? 'selected' : ''}`}
                        onClick={() => setSelectedItem(item)}
                      >
                        {item.mime_type?.startsWith('video/') || item.url?.endsWith('.mp4') || item.url?.endsWith('.webm') || item.url?.endsWith('.mov') ? (
                          <video 
                            className="media-card-img" 
                            src={formatImage(item.url)} 
                            muted 
                            playsInline
                            style={{ objectFit: 'cover', width: '100%', height: '100%' }}
                          />
                        ) : (
                          <img 
                            className="media-card-img" 
                            src={formatImage(item.url)} 
                            alt={item.filename} 
                            loading="lazy"
                          />
                        )}
                        {isSelected && (
                          <div className="media-card-badge">
                            <i className="bx bx-check" />
                          </div>
                        )}
                        <button 
                          className="media-card-trash"
                          title="Hapus Permanen"
                          onClick={(e) => handleDelete(item, e)}
                        >
                          <i className="bx bx-trash" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="media-pagination-container">
                  <button 
                    className="media-page-btn" 
                    disabled={page === 1}
                    onClick={() => setPage(page - 1)}
                  >
                    <i className="bx bx-chevron-left" />
                  </button>
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
                    <button 
                      key={p} 
                      className={`media-page-btn ${page === p ? 'active' : ''}`}
                      onClick={() => setPage(p)}
                    >
                      {p}
                    </button>
                  ))}
                  <button 
                    className="media-page-btn" 
                    disabled={page === totalPages}
                    onClick={() => setPage(page + 1)}
                  >
                    <i className="bx bx-chevron-right" />
                  </button>
                </div>
              )}
            </div>
          </TablePanel>
        </div>

        {/* Sidebar Info Section */}
        <div className="media-sidebar-panel">
          {selectedItem ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              <div style={{ fontSize: 14, fontWeight: 900, color: '#0f172a', borderBottom: '2px solid #f1f5f9', paddingBottom: 12 }}>
                INFORMASI BERKAS
              </div>
              <div style={{ aspectRatio: '1.4', background: '#f8fafc', borderRadius: 16, border: '1px solid #e2e8f0', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {selectedItem.mime_type?.startsWith('video/') || selectedItem.url?.endsWith('.mp4') || selectedItem.url?.endsWith('.webm') || selectedItem.url?.endsWith('.mov') ? (
                  <video 
                    style={{ width: '100%', height: '100%', objectFit: 'contain' }} 
                    src={formatImage(selectedItem.url)} 
                    controls
                    playsInline
                  />
                ) : (
                  <img 
                    style={{ width: '100%', height: '100%', objectFit: 'contain' }} 
                    src={formatImage(selectedItem.url)} 
                    alt={selectedItem.filename}
                  />
                )}
              </div>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div>
                  <FieldLabel>Nama File</FieldLabel>
                  <div style={{ fontSize: 13, fontWeight: 800, color: '#334155', wordBreak: 'break-all' }}>
                    {selectedItem.filename}
                  </div>
                </div>
                
                <div>
                  <FieldLabel>Ukuran Berkas</FieldLabel>
                  <div style={{ fontSize: 12.5, fontWeight: 600, color: '#64748b' }}>
                    {formatBytes(selectedItem.size)}
                  </div>
                </div>

                <div>
                  <FieldLabel>Tipe MIME</FieldLabel>
                  <div style={{ fontSize: 12.5, fontWeight: 600, color: '#64748b', textTransform: 'uppercase' }}>
                    {selectedItem.mime_type}
                  </div>
                </div>

                <div>
                  <FieldLabel>Tanggal Unggah</FieldLabel>
                  <div style={{ fontSize: 12.5, fontWeight: 600, color: '#64748b' }}>
                    {new Date(selectedItem.created_at).toLocaleString('id-ID', {
                      day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit'
                    })}
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 10 }}>
                <button 
                  className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-bold rounded-xl transition-all shadow-sm" style={{ width: '100%', justifyContent: 'center', padding: '10px 14px' }}
                  onClick={() => handleCopyUrl(selectedItem.url)}
                >
                  <i className="bx bx-copy" /> Salin URL Berkas
                </button>
                <button 
                  className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-bold rounded-xl transition-all shadow-sm" style={{ width: '100%', justifyContent: 'center', padding: '10px 14px', borderColor: '#ef4444', color: '#ef4444', background: '#fff' }}
                  onClick={() => handleDelete(selectedItem)}
                >
                  <i className="bx bx-trash" /> Hapus Permanen
                </button>
              </div>
            </div>
          ) : (
            <div className="media-sidebar-placeholder">
              <i className="bx bx-info-circle" style={{ fontSize: 36, color: '#cbd5e1' }} />
              <div style={{ fontWeight: 800, color: '#475569' }}>Pilih Aset Media</div>
              <div style={{ lineHeight: 1.5 }}>
                Klik salah satu berkas media di pustaka untuk melihat informasi rincian metadata, menyalin tautan gambar, atau menghapusnya.
              </div>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
