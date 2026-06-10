import React, { useState, useEffect } from 'react';
import { ADMIN_API_BASE, fetchJson, formatImage } from '../../lib/api';
import { A, Modal, FieldLabel } from '../../lib/adminStyles.jsx';
import toast from 'react-hot-toast';

const API = ADMIN_API_BASE;

export default function MediaLibraryModal({ isOpen, onClose, onSelect, multiple = false, currentSelection = null }) {
  const [activeTab, setActiveTab] = useState('library');
  const [mediaList, setMediaList] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [selectedItem, setSelectedItem] = useState(null);
  
  // For multi-select mode
  const [multiSelections, setMultiSelections] = useState([]);
  const [uploading, setUploading] = useState(false);

  const limit = 18;

  // Initialize selections from currentSelection
  useEffect(() => {
    if (multiple) {
      if (Array.isArray(currentSelection)) {
        setMultiSelections(currentSelection);
      } else if (typeof currentSelection === 'string' && currentSelection.startsWith('[')) {
        try {
          setMultiSelections(JSON.parse(currentSelection));
        } catch (_) {
          setMultiSelections([]);
        }
      } else {
        setMultiSelections([]);
      }
    } else {
      setSelectedItem(null);
    }
  }, [currentSelection, multiple, isOpen]);

  // Fetch Media assets
  const fetchMedia = () => {
    if (!isOpen) return;
    setLoading(true);
    fetchJson(`${API}/media?search=${encodeURIComponent(searchTerm)}&page=${page}&limit=${limit}`)
      .then(resp => {
        const data = resp?.data || [];
        setMediaList(data);
        setTotal(resp?.total || 0);
      })
      .catch(err => {
        toast.error('Gagal memuat Media Library: ' + err.message);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchMedia();
  }, [isOpen, page, searchTerm]);

  // Reset page when search term changes
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
      if (file.size > 5 * 1024 * 1024) {
        toast.error(`File ${file.name} melebihi batas 5MB`);
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
        
        // Handle nested structure from Go JSONResponse
        const uploadedMedia = responseData?.data;
        if (uploadedMedia?.url) {
          successCount++;
        }
      } catch (err) {
        toast.error(`Gagal upload ${file.name}: ${err.message}`);
      }
    }

    if (successCount > 0) {
      toast.success(`${successCount} file berhasil ditambahkan ke pustaka`);
      fetchMedia();
      setActiveTab('library');
    }
    setUploading(false);
  };

  const handleDelete = (item, e) => {
    e.stopPropagation();
    if (!window.confirm(`Hapus berkas "${item.filename}" secara permanen? Tindakan ini tidak dapat dibatalkan.`)) return;

    fetchJson(`${API}/media/delete?id=${item.id}`, { method: 'DELETE' })
      .then(() => {
        toast.success('Media berhasil dihapus dari server');
        if (selectedItem?.id === item.id) {
          setSelectedItem(null);
        }
        setMultiSelections(prev => prev.filter(url => url !== item.url));
        fetchMedia();
      })
      .catch(err => {
        toast.error('Gagal menghapus media: ' + err.message);
      });
  };

  const handleSelectGridItem = (item) => {
    if (multiple) {
      setMultiSelections(prev => {
        const exists = prev.includes(item.url);
        if (exists) {
          return prev.filter(url => url !== item.url);
        } else {
          return [...prev, item.url];
        }
      });
    } else {
      setSelectedItem(item);
    }
  };

  const handleConfirmSelection = () => {
    if (multiple) {
      onSelect(multiSelections);
    } else {
      if (selectedItem) {
        onSelect(selectedItem.url);
      }
    }
    onClose();
  };

  const totalPages = Math.ceil(total / limit);

  // Format file size
  const formatBytes = (bytes, decimals = 2) => {
    if (!bytes) return '0 Bytes';
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
  };

  if (!isOpen) return null;

  return (
    <Modal title="Media Library (Media Iz)" onClose={onClose} wide={true}>
      <style>{`
        .media-modal-container {
          display: grid;
          grid-template-columns: 1fr 280px;
          gap: 20px;
          height: 60vh;
          min-height: 480px;
          max-height: 650px;
          font-family: 'Inter', sans-serif;
        }
        .media-main-section {
          display: flex;
          flex-direction: column;
          height: 100%;
          min-width: 0;
        }
        .media-tabs {
          display: flex;
          border-bottom: 2px solid #f1f5f9;
          margin-bottom: 16px;
          gap: 20px;
        }
        .media-tab-btn {
          padding: 10px 4px;
          font-size: 14px;
          font-weight: 700;
          color: #64748b;
          border: none;
          background: transparent;
          cursor: pointer;
          position: relative;
          transition: 0.2s;
        }
        .media-tab-btn.active {
          color: #6366f1;
        }
        .media-tab-btn.active::after {
          content: '';
          position: absolute;
          bottom: -2px;
          left: 0;
          right: 0;
          height: 2px;
          background: #6366f1;
        }
        .media-grid {
          flex: 1;
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(110px, 1fr));
          gap: 12px;
          overflow-y: auto;
          padding: 4px;
          content-visibility: auto;
        }
        .media-grid-item {
          aspect-ratio: 1;
          border-radius: 12px;
          border: 2px solid #e2e8f0;
          background: #f8fafc;
          overflow: hidden;
          cursor: pointer;
          position: relative;
          transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
        }
        .media-grid-item:hover {
          transform: scale(1.02);
          border-color: #6366f1;
          box-shadow: 0 4px 12px rgba(99,102,241,0.08);
        }
        .media-grid-item.selected {
          border-color: #6366f1;
          background: #f5f7ff;
        }
        .media-grid-item-thumbnail {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }
        .media-check-badge {
          position: absolute;
          top: 6px;
          right: 6px;
          background: #6366f1;
          color: #fff;
          width: 22px;
          height: 22px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 14px;
          box-shadow: 0 2px 5px rgba(0,0,0,0.15);
          animation: badgeIn 0.2s cubic-bezier(0.16, 1, 0.3, 1);
        }
        .media-hover-delete {
          position: absolute;
          bottom: 6px;
          right: 6px;
          background: rgba(239, 68, 68, 0.9);
          color: #fff;
          width: 24px;
          height: 24px;
          border-radius: 6px;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          opacity: 0;
          transition: 0.15s;
          border: none;
        }
        .media-grid-item:hover .media-hover-delete {
          opacity: 1;
        }
        .media-sidebar {
          background: #f8fafc;
          border-radius: 20px;
          border: 1px solid #e2e8f0;
          padding: 20px;
          display: flex;
          flex-direction: column;
          gap: 16px;
          height: 100%;
          overflow-y: auto;
        }
        .media-sidebar-placeholder {
          flex: 1;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          color: #94a3b8;
          text-align: center;
          font-size: 13px;
        }
        .media-upload-area {
          flex: 1;
          border: 2px dashed #cbd5e1;
          border-radius: 20px;
          background: #f8fafc;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 16px;
          padding: 40px;
          cursor: pointer;
          transition: 0.2s;
        }
        .media-upload-area:hover {
          border-color: #6366f1;
          background: #f5f7ff;
        }
        .media-pagination {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          margin-top: 16px;
          padding-top: 12px;
          border-top: 1px solid #f1f5f9;
        }
        .media-page-btn {
          width: 32px;
          height: 32px;
          border-radius: 8px;
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
        @keyframes badgeIn {
          from { transform: scale(0.6); opacity: 0; }
          to { transform: scale(1); opacity: 1; }
        }
        .media-mobile-action-bar {
          display: none;
          padding-top: 12px;
          border-top: 1px solid #f1f5f9;
          margin-top: 12px;
          width: 100%;
          gap: 12px;
        }
        @media (max-width: 768px) {
          .media-modal-container {
            grid-template-columns: 1fr;
            height: 70vh;
            min-height: 400px;
          }
          .media-sidebar {
            display: none;
          }
          .media-mobile-action-bar {
            display: flex;
            align-items: center;
            justify-content: flex-end;
          }
        }
      `}</style>

      <div className="media-modal-container">
        
        {/* Main Section */}
        <div className="media-main-section">
          {/* Tabs */}
          <div className="media-tabs">
            <button 
              className={`media-tab-btn ${activeTab === 'library' ? 'active' : ''}`}
              onClick={() => setActiveTab('library')}
            >
              Cari & Pilih Media
            </button>
            <button 
              className={`media-tab-btn ${activeTab === 'upload' ? 'active' : ''}`}
              onClick={() => setActiveTab('upload')}
            >
              Unggah Media Baru
            </button>
          </div>

          {activeTab === 'library' ? (
            <>
              {/* Toolbar */}
              <div style={{ display: 'flex', gap: 12, marginBottom: 16 }}>
                <div style={{ ...A.searchWrap, flex: 1 }}>
                  <i className="bx bx-search" style={A.searchIcon} />
                  <input 
                    style={{ ...A.searchInput, width: '100%' }}
                    type="text"
                    placeholder="Cari media berdasarkan nama..."
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                  />
                </div>
                {multiple && multiSelections.length > 0 && (
                  <button 
                    style={{ ...A.btnGhost, borderColor: '#f43f5e', color: '#f43f5e', background: '#fff' }}
                    onClick={() => setMultiSelections([])}
                  >
                    Bersihkan Pilihan ({multiSelections.length})
                  </button>
                )}
              </div>

              {/* Grid View */}
              {loading ? (
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 10 }}>
                  <div style={{ width: 28, height: 28, borderRadius: '50%', border: '3px solid #e2e8f0', borderTopColor: '#6366f1', animation: 'spin 0.8s linear infinite' }} />
                  <span style={{ fontSize: 12, color: '#94a3b8', fontWeight: 600 }}>Memuat berkas media...</span>
                </div>
              ) : mediaList.length === 0 ? (
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8, color: '#94a3b8' }}>
                  <i className="bx bx-image-alt" style={{ fontSize: 44, color: '#cbd5e1' }} />
                  <span style={{ fontSize: 13, fontWeight: 600 }}>Pustaka Media Kosong</span>
                  <button style={{ ...A.btnGhost, fontSize: 11, padding: '4px 10px', marginTop: 4 }} onClick={() => setActiveTab('upload')}>
                    Unggah Media Pertama Anda
                  </button>
                </div>
              ) : (
                <div className="media-grid custom-scrollbar">
                  {mediaList.map(item => {
                    const isSelected = multiple 
                      ? multiSelections.includes(item.url)
                      : selectedItem?.id === item.id;

                    return (
                      <div 
                        key={item.id}
                        className={`media-grid-item ${isSelected ? 'selected' : ''}`}
                        onClick={() => handleSelectGridItem(item)}
                        onDoubleClick={() => {
                          if (!multiple) {
                            onSelect(item.url);
                            onClose();
                          }
                        }}
                      >
                        {item.mime_type && item.mime_type.startsWith('image/') ? (
                          <img 
                            className="media-grid-item-thumbnail" 
                            src={formatImage(item.url)} 
                            alt={item.filename} 
                            loading="lazy"
                          />
                        ) : (
                          <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f1f5f9', color: '#94a3b8', flexDirection: 'column' }}>
                            <i className="bx bx-file" style={{ fontSize: 32 }} />
                            <span style={{ fontSize: 9, marginTop: 4, maxWidth: '80%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.filename.split('.').pop().toUpperCase()}</span>
                          </div>
                        )}
                        {isSelected && (
                          <div className="media-check-badge">
                            {multiple ? (
                              <span style={{ fontSize: 11, fontWeight: 900 }}>
                                {multiSelections.indexOf(item.url) + 1}
                              </span>
                            ) : (
                              <i className="bx bx-check" />
                            )}
                          </div>
                        )}
                        <button 
                          className="media-hover-delete" 
                          title="Hapus permanen berkas"
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
                <div className="media-pagination">
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

              {/* Mobile Action Bar */}
              <div className="media-mobile-action-bar">
                {multiple ? (
                  <button 
                    style={{ ...A.btnPrimary, flex: 1, justifyContent: 'center', padding: '12px 16px' }}
                    onClick={handleConfirmSelection}
                    disabled={multiSelections.length === 0}
                  >
                    Konfirmasi Pilihan ({multiSelections.length})
                  </button>
                ) : (
                  <button 
                    style={{ ...A.btnPrimary, flex: 1, justifyContent: 'center', padding: '12px 16px' }}
                    onClick={handleConfirmSelection}
                    disabled={!selectedItem}
                  >
                    {selectedItem ? `Pilih "${selectedItem.filename}"` : 'Pilih Gambar'}
                  </button>
                )}
              </div>
            </>
          ) : (
            <label className="media-upload-area">
              <input 
                type="file" 
                style={{ display: 'none' }} 
                accept="image/*,video/*,.pdf,.zip,.rar,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv" 
                multiple 
                onChange={handleUpload} 
                disabled={uploading}
              />
              {uploading ? (
                <>
                  <div style={{ width: 44, height: 44, borderRadius: '50%', border: '4px solid #e0e7ff', borderTopColor: '#6366f1', animation: 'spin 0.8s linear infinite' }} />
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: 15, fontWeight: 800 }}>Mengunggah Berkas ke Server...</div>
                    <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 4 }}>Jangan tutup modal atau berpindah halaman</div>
                  </div>
                </>
              ) : (
                <>
                  <div style={{ width: 64, height: 64, borderRadius: 16, background: '#eef2ff', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#6366f1' }}>
                    <i className="bx bx-cloud-upload" style={{ fontSize: 36 }} />
                  </div>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: 15, fontWeight: 800, color: '#1e293b' }}>Klik untuk Unggah Berkas Media</div>
                    <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 4 }}>Mendukung berkas Gambar, Video, ZIP, PDF, Word, Excel. Maks: 5MB per berkas.</div>
                  </div>
                </>
              )}
            </label>
          )}
        </div>

        {/* Sidebar Info Section */}
        <div className="media-sidebar">
          {(!multiple && selectedItem) ? (
            <>
              <div style={{ fontSize: 14, fontWeight: 900, color: '#0f172a', borderBottom: '2px solid #f1f5f9', paddingBottom: 10 }}>
                Rincian Media
              </div>
              <div style={{ aspectRatio: '1.4', background: '#fff', borderRadius: 12, border: '1px solid #e2e8f0', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {selectedItem.mime_type && selectedItem.mime_type.startsWith('image/') ? (
                  <img 
                    style={{ width: '100%', height: '100%', objectFit: 'contain' }} 
                    src={formatImage(selectedItem.url)} 
                    alt={selectedItem.filename}
                  />
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', color: '#94a3b8' }}>
                    <i className="bx bx-file" style={{ fontSize: 48 }} />
                    <span style={{ marginTop: 8, fontSize: 14, fontWeight: 700 }}>{selectedItem.filename.split('.').pop().toUpperCase()} FILE</span>
                  </div>
                )}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div>
                  <FieldLabel>Nama Berkas</FieldLabel>
                  <div style={{ fontSize: 12.5, fontWeight: 700, wordBreak: 'break-all', color: '#334155' }}>
                    {selectedItem.filename}
                  </div>
                </div>
                <div>
                  <FieldLabel>Ukuran Berkas</FieldLabel>
                  <div style={{ fontSize: 12, fontWeight: 600, color: '#64748b' }}>
                    {formatBytes(selectedItem.size)}
                  </div>
                </div>
                <div>
                  <FieldLabel>Jenis Berkas</FieldLabel>
                  <div style={{ fontSize: 12, fontWeight: 600, color: '#64748b', textTransform: 'uppercase' }}>
                    {selectedItem.mime_type?.split('/')?.[1] || 'IMAGE'}
                  </div>
                </div>
                <div>
                  <FieldLabel>Diunggah Pada</FieldLabel>
                  <div style={{ fontSize: 12, fontWeight: 600, color: '#64748b' }}>
                    {new Date(selectedItem.created_at).toLocaleString('id-ID', {
                      year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
                    })}
                  </div>
                </div>
              </div>

              <div style={{ flex: 1 }} />
              <button 
                style={{ ...A.btnPrimary, width: '100%', justifyContent: 'center', padding: '12px 16px' }}
                onClick={handleConfirmSelection}
              >
                Pilih Media Ini
              </button>
            </>
          ) : (multiple && multiSelections.length > 0) ? (
            <>
              <div style={{ fontSize: 14, fontWeight: 900, color: '#0f172a', borderBottom: '2px solid #f1f5f9', paddingBottom: 10 }}>
                Pilihan Galeri
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10, flex: 1, overflowY: 'auto' }} className="custom-scrollbar">
                <div style={{ fontSize: 12, color: '#475569', fontWeight: 600 }}>
                  {multiSelections.length} gambar dipilih untuk ditambahkan.
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
                  {multiSelections.map((url, i) => (
                    <div key={i} style={{ aspectRatio: 1, borderRadius: 8, overflow: 'hidden', border: '1px solid #cbd5e1' }}>
                      <img src={formatImage(url)} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    </div>
                  ))}
                </div>
              </div>
              <button 
                style={{ ...A.btnPrimary, width: '100%', justifyContent: 'center', padding: '12px 16px' }}
                onClick={handleConfirmSelection}
              >
                Konfirmasi Pilihan ({multiSelections.length})
              </button>
            </>
          ) : (
            <div className="media-sidebar-placeholder">
              <i className="bx bx-info-circle" style={{ fontSize: 32, marginBottom: 12, color: '#cbd5e1' }} />
              Pilih satu atau beberapa berkas untuk melihat detail rincian atau klik tombol konfirmasi.
            </div>
          )}
        </div>

      </div>
    </Modal>
  );
}
