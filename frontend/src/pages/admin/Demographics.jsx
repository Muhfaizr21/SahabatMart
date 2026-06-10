import React, { useState, useEffect, useRef } from 'react';
import { fetchJson, ADMIN_API_BASE } from '../../lib/api';
import toast from 'react-hot-toast';

export default function AdminDemographics() {
  // Tabs: 'dashboard' | 'advanced' | 'settings'
  const [activeTab, setActiveTab] = useState('dashboard');
  
  // Stats & logs data
  const [stats, setStats] = useState(null);
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [logsLoading, setLogsLoading] = useState(false);
  
  // Pagination & Sorting
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [totalCount, setTotalCount] = useState(0);
  const [sortBy, setSortBy] = useState('created_at');
  const [sortOrder, setSortOrder] = useState('desc');

  // Filters
  const [dateRange, setDateRange] = useState('30d'); // 'today' | 'yesterday' | '7d' | '30d' | 'custom'
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [countries, setCountries] = useState(''); // comma separated
  const [cityInput, setCityInput] = useState('');
  const [userType, setUserType] = useState('all'); // 'all' | 'guest' | 'member'
  const [purchaseStatus, setPurchaseStatus] = useState('all'); // 'all' | 'purchased' | 'not_purchased'

  // Settings
  const [weeklyReport, setWeeklyReport] = useState(false);
  const [adminEmail, setAdminEmail] = useState('');
  const [spikeThreshold, setSpikeThreshold] = useState(500);

  // Map state
  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const clusterGroupRef = useRef(null);
  const heatLayerRef = useRef(null);
  const [mapMode, setMapMode] = useState('cluster'); // 'cluster' | 'heatmap'
  const [leafletLoaded, setLeafletLoaded] = useState(false);

  // Broadcast Mass Message state
  const [broadcastProvinces, setBroadcastProvinces] = useState([]);
  const [broadcastCities, setBroadcastCities] = useState([]);

  const [selectedProvince, setSelectedProvince] = useState('');
  const [selectedCity, setSelectedCity] = useState('');

  const [targetsList, setTargetsList] = useState([]); // array of { province, city }
  const [broadcastTitle, setBroadcastTitle] = useState('');
  const [broadcastMessage, setBroadcastMessage] = useState('');
  const [broadcastTargetRole, setBroadcastTargetRole] = useState('all');
  const [isSendingBroadcast, setIsSendingBroadcast] = useState(false);

  // Resolve API Base
  const apiBase = ADMIN_API_BASE;

  // Fetch unique provinces when broadcast tab is active
  useEffect(() => {
    if (activeTab === 'broadcast') {
      fetchJson(`${apiBase}/demographics/geography-list`)
        .then(res => {
          if (res && res.provinces) {
            setBroadcastProvinces(res.provinces);
          }
        })
        .catch(err => console.error('Error fetching provinces:', err));
    }
  }, [activeTab]);

  // Fetch cities when selectedProvince changes
  useEffect(() => {
    if (selectedProvince) {
      fetchJson(`${apiBase}/demographics/geography-list?province=${encodeURIComponent(selectedProvince)}`)
        .then(res => {
          if (res && res.cities) {
            setBroadcastCities(res.cities);
          }
        })
        .catch(err => console.error('Error fetching cities:', err));
    } else {
      setBroadcastCities([]);
    }
    setSelectedCity('');
  }, [selectedProvince]);

  const handleAddTarget = () => {
    if (!selectedProvince) {
      toast.error('Silakan pilih minimal provinsi');
      return;
    }
    const isDuplicate = targetsList.some(
      t => t.province === selectedProvince && t.city === selectedCity
    );
    if (isDuplicate) {
      toast.error('Kombinasi target wilayah ini sudah ditambahkan');
      return;
    }
    setTargetsList([...targetsList, {
      province: selectedProvince,
      city: selectedCity
    }]);
    setSelectedProvince('');
    setSelectedCity('');
  };

  const handleRemoveTarget = (index) => {
    setTargetsList(targetsList.filter((_, i) => i !== index));
  };

  const handleSendBroadcast = async (e) => {
    e.preventDefault();
    if (!broadcastTitle || !broadcastMessage) {
      toast.error('Judul dan pesan wajib diisi');
      return;
    }
    if (broadcastTitle.length > 100) {
      toast.error('Judul maksimal 100 karakter');
      return;
    }

    try {
      setIsSendingBroadcast(true);
      const res = await fetchJson(`${apiBase}/demographics/broadcast`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: broadcastTitle,
          message: broadcastMessage,
          target_role: broadcastTargetRole,
          targets: targetsList
        })
      });

      if (res && res.status === 'success') {
        toast.success(res.message || 'Pesan massal berhasil dikirim!');
        setBroadcastTitle('');
        setBroadcastMessage('');
        setTargetsList([]);
      } else {
        toast.error(res?.message || 'Gagal mengirim pesan massal');
      }
    } catch (err) {
      console.error('Send broadcast error:', err);
      toast.error('Terjadi kesalahan saat mengirim broadcast');
    } finally {
      setIsSendingBroadcast(false);
    }
  };

  const parseMessage = (text) => {
    if (!text) return '';
    let escaped = text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
    
    escaped = escaped.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    escaped = escaped.replace(/\*(.*?)\*/g, '<strong>$1</strong>');
    escaped = escaped.replace(/\n/g, '<br />');
    return escaped;
  };

  // Load Date Presets
  const getDates = () => {
    const end = new Date();
    const start = new Date();
    if (dateRange === 'today') {
      start.setHours(0, 0, 0, 0);
    } else if (dateRange === 'yesterday') {
      start.setDate(start.getDate() - 1);
      start.setHours(0, 0, 0, 0);
      end.setDate(end.getDate() - 1);
      end.setHours(23, 59, 59, 999);
    } else if (dateRange === '7d') {
      start.setDate(start.getDate() - 7);
    } else if (dateRange === '30d') {
      start.setDate(start.getDate() - 30);
    } else if (dateRange === 'custom') {
      return { start: startDate, end: endDate };
    }
    return { start: start.toISOString(), end: end.toISOString() };
  };

  // Load Leaflet CDN dynamically
  useEffect(() => {
    if (window.L) {
      setLeafletLoaded(true);
      return;
    }

    const leafletCss = document.createElement('link');
    leafletCss.rel = 'stylesheet';
    leafletCss.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
    document.head.appendChild(leafletCss);

    const clusterCss = document.createElement('link');
    clusterCss.rel = 'stylesheet';
    clusterCss.href = 'https://unpkg.com/leaflet.markercluster@1.4.1/dist/MarkerCluster.css';
    document.head.appendChild(clusterCss);

    const clusterThemeCss = document.createElement('link');
    clusterThemeCss.rel = 'stylesheet';
    clusterThemeCss.href = 'https://unpkg.com/leaflet.markercluster@1.4.1/dist/MarkerCluster.Default.css';
    document.head.appendChild(clusterThemeCss);

    const script = document.createElement('script');
    script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
    script.async = true;
    script.onload = () => {
      // Now load plugins sequentially
      const clusterScript = document.createElement('script');
      clusterScript.src = 'https://unpkg.com/leaflet.markercluster@1.4.1/dist/leaflet.markercluster.js';
      clusterScript.async = true;
      clusterScript.onload = () => {
        const heatScript = document.createElement('script');
        heatScript.src = 'https://cdn.jsdelivr.net/npm/leaflet.heat@0.2.0/dist/leaflet-heat.js';
        heatScript.async = true;
        heatScript.onload = () => {
          setLeafletLoaded(true);
        };
        document.body.appendChild(heatScript);
      };
      document.body.appendChild(clusterScript);
    };
    document.body.appendChild(script);

    return () => {
      // Avoid cleanups that might break SPA transitions
    };
  }, []);

  // Fetch stats and logs
  const fetchData = async () => {
    try {
      setLoading(true);
      const dates = getDates();
      
      const queryParams = new URLSearchParams({
        start_date: dates.start,
        end_date: dates.end,
        countries,
        city: cityInput,
        user_type: userType,
        purchase_status: purchaseStatus
      }).toString();

      // Stats — fetchJson auto-unwraps {status,data} so statsRes is the stats object directly
      const statsRes = await fetchJson(`${apiBase}/demographics/stats?${queryParams}`);
      setStats(statsRes || null);

      // Logs
      fetchLogs(1);
      
      // Load Settings
      const settingsRes = await fetchJson(`${apiBase}/demographics/settings`);
      if (settingsRes) {
        setWeeklyReport(settingsRes.weekly_report_enabled ?? false);
        setAdminEmail(settingsRes.admin_email || '');
        setSpikeThreshold(settingsRes.spike_threshold ?? 500);
      }

    } catch (err) {
      console.error('fetchData error:', err);
      toast.error("Gagal memuat data demografi");
    } finally {
      setLoading(false);
    }
  };

  const fetchLogs = async (targetPage) => {
    try {
      setLogsLoading(true);
      const dates = getDates();
      const queryParams = new URLSearchParams({
        start_date: dates.start,
        end_date: dates.end,
        countries,
        city: cityInput,
        user_type: userType,
        purchase_status: purchaseStatus,
        page: targetPage.toString(),
        page_size: pageSize.toString(),
        sort_by: sortBy,
        sort_order: sortOrder
      }).toString();

      // fetchJson auto-unwraps {status,data} → logsRes = {logs:[], total_count, page, page_size}
      const logsRes = await fetchJson(`${apiBase}/demographics/logs?${queryParams}`);
      if (logsRes) {
        setLogs(logsRes.logs || []);
        setTotalCount(logsRes.total_count || 0);
        setPage(targetPage);
      }
    } catch (err) {
      console.error('fetchLogs error:', err);
    } finally {
      setLogsLoading(false);
    }
  };

  // Trigger load
  useEffect(() => {
    fetchData();
  }, [dateRange, startDate, endDate, countries, cityInput, userType, purchaseStatus, pageSize, sortBy, sortOrder]);

  // Handle map render
  useEffect(() => {
    if (!leafletLoaded || !stats || !stats.markers || !mapContainerRef.current) return;

    // Destroy existing map instance
    if (mapInstanceRef.current) {
      mapInstanceRef.current.remove();
      mapInstanceRef.current = null;
    }

    // Initialize Map
    const map = window.L.map(mapContainerRef.current).setView([-2.5489, 118.0149], 5); // Default focus to Indonesia
    mapInstanceRef.current = map;

    // Light Voyager map tile
    window.L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
      attribution: '&copy; OpenStreetMap contributors &copy; CARTO',
      subdomains: 'abcd',
      maxZoom: 20
    }).addTo(map);

    // Apply layers based on mode
    renderMapLayers();

  }, [leafletLoaded, stats, mapMode, loading, activeTab]);

  const renderMapLayers = () => {
    const map = mapInstanceRef.current;
    if (!map || !stats || !stats.markers) return;

    // Clear existing layers
    if (clusterGroupRef.current) {
      map.removeLayer(clusterGroupRef.current);
      clusterGroupRef.current = null;
    }
    if (heatLayerRef.current) {
      map.removeLayer(heatLayerRef.current);
      heatLayerRef.current = null;
    }

    if (mapMode === 'cluster') {
      const cluster = window.L.markerClusterGroup({
        showCoverageOnHover: false,
        zoomToBoundsOnClick: true
      });
      clusterGroupRef.current = cluster;

      stats.markers.forEach(m => {
        if (!m.latitude || !m.longitude) return;
        const marker = window.L.marker([m.latitude, m.longitude]);
        
        const popupContent = `
          <div class="p-2 text-slate-800 font-sans" style="min-width: 180px;">
            <h4 class="text-sm font-bold text-indigo-600 mb-1">${m.city}, ${m.country_name}</h4>
            <div class="flex justify-between text-xs mb-1">
              <span>Pengunjung Unik:</span>
              <span class="font-bold">${m.unique_count}</span>
            </div>
            <div class="flex justify-between text-xs mb-2">
              <span>Total Pembeli:</span>
              <span class="font-bold text-emerald-600">${m.buyer_count}</span>
            </div>
            <button onclick="window.filterByCity('${m.city}')" class="w-full bg-indigo-500 hover:bg-indigo-600 text-white font-bold py-1 px-2 rounded text-[10px] transition-all text-center">
              Terapkan Filter Kota
            </button>
          </div>
        `;
        marker.bindPopup(popupContent);
        cluster.addLayer(marker);
      });

      map.addLayer(cluster);
      
      // Auto-fit markers bounds
      if (stats.markers.length > 0) {
        const bounds = window.L.latLngBounds(stats.markers.map(m => [m.latitude, m.longitude]));
        map.fitBounds(bounds, { padding: [30, 30] });
      }

    } else if (mapMode === 'heatmap') {
      const heatPoints = stats.markers
        .filter(m => m.latitude && m.longitude)
        .map(m => [m.latitude, m.longitude, m.unique_count * 10]); // Weight by count
      
      const heat = window.L.heatLayer(heatPoints, {
        radius: 25,
        blur: 15,
        maxZoom: 17,
        gradient: {0.4: 'blue', 0.6: 'cyan', 0.7: 'lime', 0.8: 'yellow', 1.0: 'red'}
      }).addTo(map);
      heatLayerRef.current = heat;
    }
  };

  // Bind global helper for popup button click
  useEffect(() => {
    window.filterByCity = (cityName) => {
      setCityInput(cityName);
      toast.success(`Filter kota "${cityName}" diterapkan`);
    };
  }, []);

  // Handle settings update
  const handleSaveSettings = async (e) => {
    e.preventDefault();
    try {
      await fetchJson(`${apiBase}/demographics/settings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          weekly_report_enabled: weeklyReport,
          admin_email: adminEmail,
          spike_threshold: parseInt(spikeThreshold)
        })
      });
      toast.success("Aturan & Jadwal Notifikasi berhasil diperbarui");
    } catch (err) {
      toast.error("Gagal menyimpan pengaturan");
    }
  };

  // CSV Export trigger
  const handleExportCSV = () => {
    const dates = getDates();
    const queryParams = new URLSearchParams({
      start_date: dates.start,
      end_date: dates.end,
      countries,
      city: cityInput,
      user_type: userType,
      purchase_status: purchaseStatus,
      export: 'csv'
    }).toString();
    window.open(`${apiBase}/demographics/logs?${queryParams}`, '_blank');
  };

  return (
    <div className="fade-in p-6 bg-slate-50 text-slate-800 min-h-screen rounded-2xl border border-slate-200/80 shadow-sm font-sans">
      
      {/* Header section with Premium Glassmorphism (Light Mode) */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8 bg-white border border-slate-200 p-6 rounded-2xl shadow-sm">
        <div>
          <h1 className="text-3xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 via-indigo-500 to-purple-600">
            Demografi & Lokasi Pelanggan
          </h1>
          <p className="text-slate-500 text-sm mt-1">
            Analisis sebaran geografi, konversi wilayah, retensi pelanggan, dan notifikasi cerdas.
          </p>
        </div>
        <div className="flex items-center gap-2 bg-slate-100 p-1.5 rounded-xl border border-slate-200/80">
          <button
            onClick={() => setActiveTab('dashboard')}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'dashboard'
                ? 'bg-white text-slate-800 shadow-sm'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            Dashboard Utama
          </button>
          <button
            onClick={() => setActiveTab('advanced')}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'advanced'
                ? 'bg-white text-slate-800 shadow-sm'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            Analisis Lanjutan
          </button>
          <button
            onClick={() => setActiveTab('settings')}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'settings'
                ? 'bg-white text-slate-800 shadow-sm'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            Pengaturan & Privasi
          </button>
          <button
            onClick={() => setActiveTab('broadcast')}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'broadcast'
                ? 'bg-white text-slate-800 shadow-sm'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            Kirim Pesan Massal
          </button>
        </div>
      </div>

      {/* Filter Bar (Light Mode) */}
      {(activeTab === 'dashboard' || activeTab === 'advanced') && (
        <div className="bg-white border border-slate-200 p-5 rounded-2xl mb-8 flex flex-wrap gap-4 items-end shadow-sm">
        <div className="flex-1 min-w-[200px]">
          <label className="block text-[11px] font-extrabold text-slate-400 uppercase tracking-widest mb-2">Rentang Waktu</label>
          <select
            value={dateRange}
            onChange={(e) => setDateRange(e.target.value)}
            className="w-full bg-white border border-slate-200 text-slate-800 rounded-xl px-3 py-2.5 text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
          >
            <option value="today">Hari Ini</option>
            <option value="yesterday">Kemarin</option>
            <option value="7d">7 Hari Terakhir</option>
            <option value="30d">30 Hari Terakhir</option>
            <option value="custom">Rentang Kustom</option>
          </select>
        </div>

        {dateRange === 'custom' && (
          <>
            <div>
              <label className="block text-[11px] font-extrabold text-slate-400 uppercase tracking-widest mb-2">Tanggal Mulai</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="bg-white border border-slate-200 text-slate-800 rounded-xl px-3 py-2 text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-[11px] font-extrabold text-slate-400 uppercase tracking-widest mb-2">Tanggal Selesai</label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="bg-white border border-slate-200 text-slate-800 rounded-xl px-3 py-2 text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              />
            </div>
          </>
        )}

        <div className="flex-1 min-w-[150px]">
          <label className="block text-[11px] font-extrabold text-slate-400 uppercase tracking-widest mb-2">Negara (Kode, cth: ID, SG)</label>
          <input
            type="text"
            placeholder="Cari kode negara..."
            value={countries}
            onChange={(e) => setCountries(e.target.value)}
            className="w-full bg-white border border-slate-200 text-slate-800 rounded-xl px-3 py-2.5 text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
          />
        </div>

        <div className="flex-1 min-w-[180px]">
          <label className="block text-[11px] font-extrabold text-slate-400 uppercase tracking-widest mb-2">Kota</label>
          <div className="relative">
            <input
              type="text"
              placeholder="Ketik nama kota..."
              value={cityInput}
              onChange={(e) => setCityInput(e.target.value)}
              className="w-full bg-white border border-slate-200 text-slate-800 rounded-xl px-3 py-2.5 text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
            />
            {cityInput && (
              <button
                onClick={() => setCityInput('')}
                className="absolute right-3 top-3 text-slate-400 hover:text-slate-600 text-xs cursor-pointer"
              >
                ✕
              </button>
            )}
          </div>
        </div>

        <div>
          <label className="block text-[11px] font-extrabold text-slate-400 uppercase tracking-widest mb-2">Tipe User</label>
          <select
            value={userType}
            onChange={(e) => setUserType(e.target.value)}
            className="bg-white border border-slate-200 text-slate-800 rounded-xl px-3 py-2.5 text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
          >
            <option value="all">Semua Pengunjung</option>
            <option value="guest">Hanya Tamu (Guest)</option>
            <option value="member">Hanya Member</option>
          </select>
        </div>

        <div>
          <label className="block text-[11px] font-extrabold text-slate-400 uppercase tracking-widest mb-2">Pembelian</label>
          <select
            value={purchaseStatus}
            onChange={(e) => setPurchaseStatus(e.target.value)}
            className="bg-white border border-slate-200 text-slate-800 rounded-xl px-3 py-2.5 text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
          >
            <option value="all">Semua Status</option>
            <option value="purchased">Pernah Beli (Converted)</option>
            <option value="not_purchased">Belum Pernah Beli</option>
          </select>
        </div>
      </div>
    )}

      {loading ? (
        <div className="flex flex-col items-center justify-center py-20">
          <div className="w-12 h-12 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-slate-500 text-sm mt-4">Memproses data geolokasi & metrik...</p>
        </div>
      ) : (
        <>
          {/* TAB 1: DASHBOARD UTAMA */}
          {activeTab === 'dashboard' && (
            <div className="space-y-8">
              
              {/* Smart Notification Alert */}
              {stats?.traffic_spike_alert && (
                <div className="bg-amber-50 border border-amber-200 p-4 rounded-2xl flex items-center gap-3 text-amber-800 animate-pulse">
                  <i className="bx bxs-error-alt text-2xl text-amber-500" />
                  <div>
                    <h5 className="font-bold text-sm">Peringatan: Lonjakan Lalu Lintas Cerdas</h5>
                    <p className="text-xs text-amber-700 mt-0.5">
                      Sistem mendeteksi lonjakan lalu lintas yang tidak biasa (&gt;200%) dalam 24 jam terakhir dibandingkan rata-rata mingguan.
                    </p>
                  </div>
                </div>
              )}

              {/* KPI Cards Grid (Light Mode) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                
                {/* Metric 1 */}
                <div className="bg-white border border-slate-200/80 p-6 rounded-2xl relative overflow-hidden shadow-sm">
                  <div className="absolute right-4 top-4 w-12 h-12 bg-indigo-50 rounded-xl flex items-center justify-center">
                    <i className="bx bx-group text-2xl text-indigo-500" />
                  </div>
                  <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">Pengunjung Unik (IP)</span>
                  <div className="text-3xl font-extrabold text-slate-800 mt-2">
                    {stats?.total_visitors?.toLocaleString() || 0}
                  </div>
                  <div className={`text-xs mt-2 flex items-center gap-1 font-bold ${
                    stats?.percentage_change >= 0 ? 'text-emerald-600' : 'text-rose-600'
                  }`}>
                    <i className={`bx ${stats?.percentage_change >= 0 ? 'bx-trending-up' : 'bx-trending-down'}`} />
                    {stats?.percentage_change?.toFixed(1) || 0}% dibanding periode lalu
                  </div>
                </div>

                {/* Metric 2 */}
                <div className="bg-white border border-slate-200/80 p-6 rounded-2xl relative overflow-hidden shadow-sm">
                  <div className="absolute right-4 top-4 w-12 h-12 bg-purple-50 rounded-xl flex items-center justify-center">
                    <i className="bx bx-globe text-2xl text-purple-500" />
                  </div>
                  <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">Negara Terdeteksi</span>
                  <div className="text-3xl font-extrabold text-slate-800 mt-2">
                    {stats?.countries_count || 0}
                  </div>
                  <p className="text-slate-400 text-xs mt-2">Global IP lookup active</p>
                </div>

                {/* Metric 3 */}
                <div className="bg-white border border-slate-200/80 p-6 rounded-2xl relative overflow-hidden shadow-sm">
                  <div className="absolute right-4 top-4 w-12 h-12 bg-pink-550 bg-pink-50 rounded-xl flex items-center justify-center">
                    <i className="bx bx-map-pin text-2xl text-pink-550 text-pink-500" />
                  </div>
                  <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">Kota Terbanyak</span>
                  <div className="text-2xl font-extrabold text-slate-800 mt-2 truncate max-w-[80%]">
                    {stats?.top_city?.city || 'Tidak Ada'}
                  </div>
                  <p className="text-slate-400 text-xs mt-3">
                    {stats?.top_city?.count?.toLocaleString() || 0} Unik Visitor
                  </p>
                </div>

                {/* Metric 4 */}
                <div className="bg-white border border-slate-200/80 p-6 rounded-2xl relative overflow-hidden shadow-sm">
                  <div className="absolute right-4 top-4 w-12 h-12 bg-emerald-50 rounded-xl flex items-center justify-center">
                    <i className="bx bx-pie-chart-alt text-2xl text-emerald-500" />
                  </div>
                  <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">Domestik vs Internasional</span>
                  <div className="flex items-center gap-3 mt-3">
                    <div className="flex-1 bg-slate-100 h-3 rounded-full overflow-hidden flex">
                      <div 
                        style={{ width: `${stats?.domestic_percentage || 0}%` }} 
                        className="bg-gradient-to-r from-indigo-500 to-purple-500 h-full"
                        title="Domestik"
                      />
                      <div 
                        style={{ width: `${stats?.international_percentage || 0}%` }} 
                        className="bg-pink-500 h-full"
                        title="Internasional"
                      />
                    </div>
                  </div>
                  <div className="flex justify-between text-[10px] font-bold text-slate-500 mt-2">
                    <span className="text-indigo-600">Domestik: {stats?.domestic_percentage?.toFixed(1)}%</span>
                    <span className="text-pink-500">Intl: {stats?.international_percentage?.toFixed(1)}%</span>
                  </div>
                </div>

              </div>

              {/* Map & Top Cities (Light Mode) */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                
                {/* Leaflet Map Card */}
                <div className="lg:col-span-2 bg-white border border-slate-200 p-6 rounded-3xl shadow-sm">
                  <div className="flex justify-between items-center mb-4">
                    <div className="flex items-center gap-2">
                      <i className="bx bx-map text-xl text-indigo-500" />
                      <h3 className="text-md font-bold text-slate-800">Visualisasi Peta Lokasi</h3>
                    </div>
                    <div className="flex bg-slate-100 p-1 rounded-lg border border-slate-200">
                      <button
                        onClick={() => setMapMode('cluster')}
                        className={`px-3 py-1 rounded text-[10px] font-bold transition-all cursor-pointer ${
                          mapMode === 'cluster' ? 'bg-indigo-650 bg-indigo-600 text-white shadow-sm' : 'text-slate-500'
                        }`}
                      >
                        Clusters
                      </button>
                      <button
                        onClick={() => setMapMode('heatmap')}
                        className={`px-3 py-1 rounded text-[10px] font-bold transition-all cursor-pointer ${
                          mapMode === 'heatmap' ? 'bg-indigo-650 bg-indigo-600 text-white shadow-sm' : 'text-slate-500'
                        }`}
                      >
                        Heatmap
                      </button>
                    </div>
                  </div>
                  
                  {/* Map container */}
                  <div 
                    ref={mapContainerRef} 
                    className="w-full h-[380px] bg-slate-100 rounded-2xl border border-slate-200 overflow-hidden shadow-inner"
                    style={{ zIndex: 1 }}
                  />
                  <div className="text-[10px] text-slate-400 mt-2">
                    * Klik titik/cluster untuk melihat sebaran detail kota beserta opsi penyaringan data.
                  </div>
                </div>

                {/* Right side: Top Cities Average Pageviews & Device Performance */}
                <div className="space-y-6">
                  <div className="bg-white border border-slate-200 p-6 rounded-3xl shadow-sm">
                    <h3 className="text-sm font-bold text-slate-800 mb-4 flex items-center gap-2">
                      <i className="bx bx-show-alt text-lg text-purple-500" />
                      Halaman Terlihat per Kota (Rata-rata)
                    </h3>
                    <div className="space-y-4">
                      {stats?.city_avg_pages?.map((city, i) => (
                        <div key={i} className="flex flex-col gap-1">
                          <div className="flex justify-between text-xs font-bold">
                            <span className="text-slate-700">{city.city}</span>
                            <span className="text-indigo-600">{city.avg_pages ? city.avg_pages.toFixed(1) : '0.0'} hal / visitor</span>
                          </div>
                          <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                            <div 
                              style={{ width: `${Math.min((city.avg_pages || 0) * 10, 100)}%` }} 
                              className="bg-gradient-to-r from-indigo-500 to-purple-500 h-full rounded-full"
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="bg-white border border-slate-200 p-6 rounded-3xl shadow-sm">
                    <div className="flex justify-between items-center mb-4">
                      <h3 className="text-sm font-bold text-slate-800">
                        Pengunjung Terkini
                      </h3>
                      <div className="flex items-center gap-1.5">
                        <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                        <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider">Live</span>
                      </div>
                    </div>
                    {logsLoading ? (
                      <div className="animate-pulse space-y-3">
                        <div className="h-4 bg-slate-100 rounded w-2/3" />
                        <div className="h-3 bg-slate-100 rounded w-1/2" />
                        <div className="h-3 bg-slate-100 rounded w-3/4" />
                      </div>
                    ) : logs && logs.length > 0 ? (
                      <div className="space-y-3 text-xs">
                        <div className="bg-slate-50 border border-slate-100 p-3 rounded-2xl">
                          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-1">Identitas</div>
                          {logs[0].user_id ? (
                            <div>
                              <div className="font-bold text-slate-800">{logs[0].user_fullname || 'Member'}</div>
                              <div className="text-[11px] text-slate-500 font-mono">{logs[0].user_email}</div>
                              <div className="text-[9px] text-indigo-500 font-mono mt-0.5">ID: {logs[0].user_id.substring(0, 8)}...</div>
                            </div>
                          ) : (
                            <div className="font-bold text-slate-600 flex items-center gap-1">
                              <i className="bx bx-user-circle text-base text-slate-400" />
                              <span>Guest (Tamu Anonim)</span>
                            </div>
                          )}
                        </div>

                        <div className="grid grid-cols-2 gap-2">
                          <div className="bg-slate-50 border border-slate-100 p-2.5 rounded-xl">
                            <div className="text-[9px] font-bold text-slate-400 uppercase tracking-wide mb-0.5">IP Hash</div>
                            <div className="font-mono text-[10px] text-slate-600 font-semibold">
                              {logs[0].ip_hash ? logs[0].ip_hash.substring(0, 8) : '-'}
                            </div>
                          </div>
                          <div className="bg-slate-50 border border-slate-100 p-2.5 rounded-xl">
                            <div className="text-[9px] font-bold text-slate-400 uppercase tracking-wide mb-0.5">Perangkat</div>
                            <div className="text-[11px] text-slate-700 capitalize font-medium flex items-center gap-1">
                              <i className={`bx ${logs[0].device_type === 'desktop' ? 'bx-desktop' : logs[0].device_type === 'tablet' ? 'bx-tablet' : 'bx-mobile-alt'} text-slate-500`} />
                              <span>{logs[0].device_type}</span>
                            </div>
                          </div>
                        </div>

                        <div className="bg-slate-50 border border-slate-100 p-3 rounded-2xl space-y-2">
                          <div>
                            <div className="text-[9px] font-bold text-slate-400 uppercase tracking-wide mb-0.5">Lokasi</div>
                            <div className="text-[11px] text-slate-800 font-semibold flex items-center gap-1">
                              <i className="bx bx-map text-slate-400" />
                              <span>{logs[0].city}, {logs[0].region}</span>
                            </div>
                            <div className="text-[10px] text-slate-500 pl-4">{logs[0].country_name}</div>
                          </div>
                          <div className="border-t border-slate-200/60 pt-2">
                            <div className="text-[9px] font-bold text-slate-400 uppercase tracking-wide mb-0.5">URL Terakhir</div>
                            <div className="text-[10px] font-mono text-indigo-600 truncate" title={logs[0].visited_url}>
                              {logs[0].visited_url}
                            </div>
                          </div>
                        </div>

                        <div className="flex justify-between items-center text-[10px] text-slate-400 px-1 pt-1 font-mono">
                          <span>Waktu Akses:</span>
                          <span>{new Date(logs[0].created_at).toLocaleTimeString()}</span>
                        </div>
                      </div>
                    ) : (
                      <div className="text-center py-6 text-slate-400 text-xs">
                        Tidak ada log kunjungan
                      </div>
                    )}
                  </div>
                </div>

              </div>

              {/* Data Table Section (Light Theme) */}
              <div className="bg-white border border-slate-200 p-6 rounded-3xl shadow-sm">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
                  <div>
                    <h3 className="text-md font-bold text-slate-800">Log Pengunjung & Geolokasi</h3>
                    <p className="text-xs text-slate-500 mt-1">Data lokasi detail beserta koordinat lintang/bujur.</p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={handleExportCSV}
                      className="bg-white border border-slate-200 hover:border-slate-300 hover:text-slate-800 text-slate-600 font-bold py-2 px-4 rounded-xl text-xs flex items-center gap-2 transition-all cursor-pointer"
                    >
                      <i className="bx bx-download" />
                      Ekspor Laporan CSV
                    </button>
                    <button
                      onClick={fetchData}
                      className="bg-indigo-650 hover:bg-indigo-600 text-white font-bold py-2 px-4 rounded-xl text-xs flex items-center gap-2 transition-all cursor-pointer shadow-sm shadow-indigo-100"
                    >
                      <i className="bx bx-refresh" />
                      Refresh Data
                    </button>
                  </div>
                </div>

                <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white">
                  <table className="w-full border-collapse text-left">
                    <thead>
                      <tr className="border-b border-slate-200 text-slate-500 text-[10px] font-extrabold uppercase tracking-widest bg-slate-50">
                        <th className="py-4 px-6">IP Hash</th>
                        <th className="py-4 px-6">User ID</th>
                        <th className="py-4 px-6">Kota / Provinsi</th>
                        <th className="py-4 px-6">Negara</th>
                        <th className="py-4 px-6">Koordinat</th>
                        <th className="py-4 px-6">Tipe Device</th>
                        <th className="py-4 px-6">URL Terakhir</th>
                        <th className="py-4 px-6">Status Konversi</th>
                        <th className="py-4 px-6">Terakhir Akses</th>
                      </tr>
                    </thead>
                    <tbody className="text-xs text-slate-700 divide-y divide-slate-100">
                      {logsLoading ? (
                        <tr>
                          <td colSpan="9" className="py-10 text-center text-slate-400">
                            Memproses data tabel...
                          </td>
                        </tr>
                      ) : logs.length === 0 ? (
                        <tr>
                          <td colSpan="9" className="py-10 text-center text-slate-400">
                            Tidak ada log lokasi untuk filter terpilih.
                          </td>
                        </tr>
                      ) : (
                        logs.map((logEntry) => (
                          <tr key={logEntry.id} className="hover:bg-slate-50 transition-all">
                            <td className="py-4 px-6 font-mono text-slate-500">
                              {logEntry.ip_hash ? `${logEntry.ip_hash.substring(0, 8)}...` : '-'}
                            </td>
                            <td className="py-4 px-6">
                              {logEntry.user_id ? (
                                <div className="flex flex-col">
                                  <span className="font-bold text-slate-800">{logEntry.user_fullname || 'Member'}</span>
                                  {logEntry.user_email && <span className="text-[10px] text-slate-400 font-mono">{logEntry.user_email}</span>}
                                  <span className="text-[9px] text-indigo-500 font-mono">ID: {logEntry.user_id.substring(0, 8)}...</span>
                                </div>
                              ) : (
                                <span className="text-slate-400 font-medium">Guest (Tamu)</span>
                              )}
                            </td>
                            <td className="py-4 px-6 font-semibold text-slate-800">
                              {logEntry.city}, <span className="text-slate-500 text-[11px] font-normal">{logEntry.region}</span>
                            </td>
                            <td className="py-4 px-6">
                              {logEntry.country_name} ({logEntry.country_code})
                            </td>
                            <td className="py-4 px-6 font-mono text-[10px] text-slate-500">
                              {logEntry.latitude?.toFixed(4)}, {logEntry.longitude?.toFixed(4)}
                            </td>
                            <td className="py-4 px-6 capitalize">{logEntry.device_type}</td>
                            <td className="py-4 px-6 font-mono text-[10px] text-indigo-600 truncate max-w-[150px]">
                              {logEntry.visited_url}
                            </td>
                            <td className="py-4 px-6">
                              {logEntry.is_converted ? (
                                <span className="bg-emerald-50 text-emerald-700 border border-emerald-100 px-2 py-0.5 rounded text-[10px] font-bold">
                                  Beli (Converted)
                                </span>
                              ) : (
                                <span className="bg-slate-100 text-slate-500 px-2 py-0.5 rounded text-[10px]">
                                  Hanya Kunjungan
                                </span>
                              )}
                            </td>
                            <td className="py-4 px-6 text-slate-500 font-mono text-[11px]">
                              {new Date(logEntry.created_at).toLocaleString()}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Table Pagination */}
                <div className="flex justify-between items-center mt-6">
                  <div className="text-xs text-slate-500">
                    Menampilkan <span className="text-slate-800 font-bold">{logs.length}</span> dari <span className="text-slate-800 font-bold">{totalCount}</span> log
                  </div>
                  <div className="flex gap-2">
                    <button
                      disabled={page <= 1}
                      onClick={() => fetchLogs(page - 1)}
                      className="bg-white border border-slate-200 disabled:opacity-40 hover:border-slate-300 text-slate-600 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer"
                    >
                      Sebelumnya
                    </button>
                    <button
                      disabled={page * pageSize >= totalCount}
                      onClick={() => fetchLogs(page + 1)}
                      className="bg-white border border-slate-200 disabled:opacity-40 hover:border-slate-300 text-slate-600 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer"
                    >
                      Berikutnya
                    </button>
                  </div>
                </div>

              </div>

            </div>
          )}

          {/* TAB 2: ANALISIS LANJUTAN */}
          {activeTab === 'advanced' && (
            <div className="space-y-8">
              
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                
                {/* Conversion Funnel Widget */}
                <div className="bg-white border border-slate-200 p-6 rounded-3xl shadow-sm">
                  <h3 className="text-md font-bold text-slate-800 mb-6 flex items-center gap-2">
                    <i className="bx bx-filter-alt text-xl text-indigo-500" />
                    Funnel Konversi Pelanggan per Wilayah
                  </h3>
                  
                  {/* Funnel chart steps */}
                  <div className="space-y-4">
                    {/* Level 1 */}
                    <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200">
                      <div className="flex justify-between text-xs font-bold mb-1">
                        <span className="text-slate-700">Level 1: Total Pengunjung</span>
                        <span>{stats?.funnel?.visitors} (100%)</span>
                      </div>
                      <div className="w-full bg-slate-200 h-3 rounded-full overflow-hidden">
                        <div className="bg-indigo-500 h-full w-full" />
                      </div>
                    </div>

                    {/* Level 2 */}
                    <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200">
                      <div className="flex justify-between text-xs font-bold mb-1">
                        <span className="text-slate-700">Level 2: Melihat Produk</span>
                        <span>
                          {stats?.funnel?.product_views} ({
                            stats?.funnel?.visitors > 0 
                              ? ((stats.funnel.product_views / stats.funnel.visitors) * 100).toFixed(1)
                              : 0
                          }%)
                        </span>
                      </div>
                      <div className="w-full bg-slate-200 h-3 rounded-full overflow-hidden">
                        <div 
                          style={{ 
                            width: `${
                              stats?.funnel?.visitors > 0 
                                ? (stats.funnel.product_views / stats.funnel.visitors) * 100 
                                : 0
                            }%` 
                          }} 
                          className="bg-purple-500 h-full"
                        />
                      </div>
                    </div>

                    {/* Level 3 */}
                    <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200">
                      <div className="flex justify-between text-xs font-bold mb-1">
                        <span className="text-slate-700">Level 3: Masuk Keranjang / Checkout</span>
                        <span>
                          {stats?.funnel?.checkouts} ({
                            stats?.funnel?.visitors > 0 
                              ? ((stats.funnel.checkouts / stats.funnel.visitors) * 100).toFixed(1)
                              : 0
                          }%)
                        </span>
                      </div>
                      <div className="w-full bg-slate-200 h-3 rounded-full overflow-hidden">
                        <div 
                          style={{ 
                            width: `${
                              stats?.funnel?.visitors > 0 
                                ? (stats.funnel.checkouts / stats.funnel.visitors) * 100 
                                : 0
                            }%` 
                          }} 
                          className="bg-pink-500 h-full"
                        />
                      </div>
                    </div>

                    {/* Level 4 */}
                    <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200">
                      <div className="flex justify-between text-xs font-bold mb-1">
                        <span className="text-slate-700">Level 4: Sukses Transaksi (Beli)</span>
                        <span className="text-emerald-600 font-bold">
                          {stats?.funnel?.purchased} ({
                            stats?.funnel?.visitors > 0 
                              ? ((stats.funnel.purchased / stats.funnel.visitors) * 100).toFixed(1)
                              : 0
                          }%)
                        </span>
                      </div>
                      <div className="w-full bg-slate-200 h-3 rounded-full overflow-hidden">
                        <div 
                          style={{ 
                            width: `${
                              stats?.funnel?.visitors > 0 
                                ? (stats.funnel.purchased / stats.funnel.visitors) * 100 
                                : 0
                            }%` 
                          }} 
                          className="bg-emerald-500 h-full"
                        />
                      </div>
                    </div>

                  </div>
                </div>

                {/* Customer Retention Grid */}
                <div className="bg-white border border-slate-200 p-6 rounded-3xl shadow-sm">
                  <h3 className="text-md font-bold text-slate-800 mb-4 flex items-center gap-2">
                    <i className="bx bx-time text-xl text-purple-500" />
                    Retensi Pelanggan Mingguan & Bulanan
                  </h3>
                  <p className="text-xs text-slate-500 mb-6">
                    Persentase pelanggan unik yang kembali beraktivitas di platform setelah periode tertentu.
                  </p>
                  
                  <div className="grid grid-cols-3 gap-4 text-center">
                    
                    <div className="bg-slate-50 p-6 rounded-2xl border border-slate-200">
                      <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest">7 Hari Retensi</span>
                      <div className="text-3xl font-extrabold text-slate-800 mt-3">
                        {stats?.retention?.day_7?.toFixed(1) || 0}%
                      </div>
                    </div>

                    <div className="bg-slate-50 p-6 rounded-2xl border border-slate-200">
                      <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest">14 Hari Retensi</span>
                      <div className="text-3xl font-extrabold text-slate-800 mt-3">
                        {stats?.retention?.day_14?.toFixed(1) || 0}%
                      </div>
                    </div>

                    <div className="bg-slate-50 p-6 rounded-2xl border border-slate-200">
                      <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest">30 Hari Retensi</span>
                      <div className="text-3xl font-extrabold text-slate-800 mt-3">
                        {stats?.retention?.day_30?.toFixed(1) || 0}%
                      </div>
                    </div>

                  </div>

                  {/* Hourly activity trend */}
                  <div className="mt-8 bg-slate-50 p-5 rounded-2xl border border-slate-200">
                    <h4 className="text-xs font-bold text-slate-700 mb-4">Tren Waktu Teraktif (24 Jam)</h4>
                    <div className="flex items-end justify-between h-[120px] pt-4 px-2">
                      {Array.from({ length: 24 }).map((_, h) => {
                        const trend = stats?.hourly_trend?.find(t => t.hour === h);
                        const count = trend ? trend.count : 0;
                        const maxCount = Math.max(...(stats?.hourly_trend?.map(t => t.count) || [1]));
                        const heightPct = maxCount > 0 ? (count / maxCount) * 100 : 0;
                        return (
                          <div key={h} className="flex-1 flex flex-col items-center group relative cursor-pointer">
                            <div className="w-[8px] bg-indigo-500 hover:bg-pink-500 rounded-t transition-all" style={{ height: `${Math.max(heightPct, 5)}px` }}>
                              <div className="absolute bottom-[100%] left-1/2 -translate-x-1/2 bg-slate-900 border border-slate-800 text-[9px] text-white px-1.5 py-0.5 rounded shadow opacity-0 group-hover:opacity-100 transition-all pointer-events-none whitespace-nowrap">
                                Jam {h}: {count} visitor
                              </div>
                            </div>
                            <span className="text-[8px] text-slate-455 text-slate-400 mt-1 font-mono">{h}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                </div>

              </div>

            </div>
          )}

          {/* TAB 3: PENGATURAN & PRIVASI */}
          {activeTab === 'settings' && (
            <div className="max-w-2xl bg-white border border-slate-200 p-8 rounded-3xl shadow-sm space-y-8 animate-fadeIn">
              <div>
                <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                  <i className="bx bx-cog text-xl text-indigo-500" />
                  Konfigurasi Laporan & Notifikasi Pintar
                </h3>
                <p className="text-xs text-slate-500 mt-1">
                  Atur pengiriman otomatis rangkuman demografi ke email admin serta limitasi deteksi lonjakan lalu lintas.
                </p>
              </div>

              <form onSubmit={handleSaveSettings} className="space-y-6">
                <div className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-200">
                  <div>
                    <label className="block text-xs font-bold text-slate-700">Kirim Laporan Mingguan</label>
                    <span className="text-[10px] text-slate-400">Setiap hari Senin jam 08.00 pagi.</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={weeklyReport}
                    onChange={(e) => setWeeklyReport(e.target.checked)}
                    className="w-4 h-4 text-indigo-600 border-slate-300 rounded bg-white focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-extrabold text-slate-400 uppercase tracking-widest mb-2">Email Admin Penerima</label>
                  <input
                    type="email"
                    placeholder="admin@akuglow.com"
                    value={adminEmail}
                    onChange={(e) => setAdminEmail(e.target.value)}
                    className="w-full bg-white border border-slate-350 text-slate-800 rounded-xl px-4 py-3 text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-extrabold text-slate-400 uppercase tracking-widest mb-2">Ambang Batas Lonjakan Lalu Lintas (24 Jam)</label>
                  <input
                    type="number"
                    value={spikeThreshold}
                    onChange={(e) => setSpikeThreshold(e.target.value)}
                    className="w-full bg-white border border-slate-350 text-slate-800 rounded-xl px-4 py-3 text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                  <span className="text-[10px] text-slate-400 mt-1 block">
                    Kirim notifikasi peringatan jika jumlah pengunjung harian melebihi angka di atas.
                  </span>
                </div>

                <button
                  type="submit"
                  className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-3 px-6 rounded-xl text-xs transition-all shadow-lg shadow-indigo-100 cursor-pointer"
                >
                  Simpan Perubahan Pengaturan
                </button>
              </form>

              <div className="border-t border-slate-200 pt-6">
                <h4 className="text-sm font-bold text-slate-800 flex items-center gap-2 mb-2">
                  <i className="bx bx-shield-quarter text-lg text-emerald-500" />
                  Kepatuhan Privasi & Pelacakan
                </h4>
                <p className="text-xs text-slate-500 leading-relaxed">
                  Kami mengutamakan kepatuhan terhadap regulasi perlindungan data pribadi.
                  Sistem menyimpan alamat IP dalam format hash searah (SHA-256) untuk menghitung statistik pengunjung unik. 
                  Data logs otomatis dibersihkan setiap 90 hari guna meminimalisir persistensi penyimpanan informasi sensitif.
                </p>
                <div className="mt-4 p-4 bg-slate-50 rounded-2xl border border-slate-200 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                  <div>
                    <h5 className="text-xs font-bold text-slate-700">Global Tracking Opt-Out</h5>
                    <span className="text-[10px] text-slate-400">Pelanggan bisa memilih untuk tidak dilacak via Cookie/Kebijakan Privasi.</span>
                  </div>
                  <a 
                    href="/privacy-policy" 
                    target="_blank" 
                    className="text-xs font-semibold text-indigo-600 hover:underline"
                  >
                    Lihat Halaman Kebijakan Privasi &rarr;
                  </a>
                </div>
              </div>

            </div>
          )}

          {/* TAB 4: KIRIM PESAN MASSAL */}
          {activeTab === 'broadcast' && (
            <div className="bg-white border border-slate-200 p-8 rounded-3xl shadow-sm space-y-8 animate-fadeIn">
              <div>
                <h3 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                  <i className="bx bx-paper-plane text-2xl text-indigo-600" />
                  Kirim Pesan Massal Tersegmentasi Geografis
                </h3>
                <p className="text-xs text-slate-500 mt-1">
                  Kirim notifikasi broadcast ke user berdasarkan wilayah administratif (Provinsi dan Kota/Kabupaten) dan role akun.
                </p>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                {/* Kiri: Rule Builder & Message Fields */}
                <div className="lg:col-span-7 space-y-6">
                  {/* Target Segment */}
                  <div className="bg-slate-50 border border-slate-200 p-5 rounded-2xl space-y-4">
                    <h4 className="text-xs font-extrabold text-slate-400 uppercase tracking-widest">
                      1. Segmentasi Target
                    </h4>

                    {/* Role Selector */}
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1.5">
                        Role Target Akun
                      </label>
                      <select
                        value={broadcastTargetRole}
                        onChange={(e) => setBroadcastTargetRole(e.target.value)}
                        className="w-full bg-white border border-slate-200 text-slate-800 rounded-xl px-3 py-2.5 text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                      >
                        <option value="all">Semua Pengguna (Warga, Petugas, Superadmin, dll)</option>
                        <option value="affiliate">Warga / Mitra Dasar</option>
                        <option value="merchant">Petugas / Merchant</option>
                        <option value="admin">Staf Admin</option>
                        <option value="superadmin">Superadmin</option>
                      </select>
                    </div>

                    {/* Geography Rule Builder */}
                    <div className="space-y-3 pt-2">
                      <label className="block text-xs font-bold text-slate-700">
                        Kriteria Wilayah Administratif
                      </label>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {/* Province Select */}
                        <div>
                          <span className="text-[10px] text-slate-400 block mb-1">Provinsi</span>
                          <select
                            value={selectedProvince}
                            onChange={(e) => setSelectedProvince(e.target.value)}
                            className="w-full bg-white border border-slate-200 text-slate-800 rounded-xl px-2.5 py-2 text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                          >
                            <option value="">-- Pilih Provinsi --</option>
                            {broadcastProvinces.map(p => (
                              <option key={p} value={p}>{p}</option>
                            ))}
                          </select>
                        </div>

                        {/* City Select */}
                        <div>
                          <span className="text-[10px] text-slate-400 block mb-1">Kota / Kabupaten</span>
                          <select
                            value={selectedCity}
                            onChange={(e) => setSelectedCity(e.target.value)}
                            disabled={!selectedProvince}
                            className="w-full bg-white border border-slate-200 text-slate-800 rounded-xl px-2.5 py-2 text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none disabled:bg-slate-100 disabled:text-slate-400"
                          >
                            <option value="">-- Pilih Kota --</option>
                            {broadcastCities.map(c => (
                              <option key={c} value={c}>{c}</option>
                            ))}
                          </select>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={handleAddTarget}
                        className="mt-2 bg-white text-indigo-600 border border-indigo-200 hover:bg-indigo-50 font-bold py-2 px-4 rounded-xl text-xs flex items-center justify-center gap-1.5 cursor-pointer transition-all w-full"
                      >
                        <i className="bx bx-plus" /> Tambah Kriteria Wilayah
                      </button>
                    </div>
                  </div>

                  {/* Message Fields */}
                  <form onSubmit={handleSendBroadcast} className="space-y-4">
                    <div className="bg-slate-50 border border-slate-200 p-5 rounded-2xl space-y-4">
                      <h4 className="text-xs font-extrabold text-slate-400 uppercase tracking-widest">
                        2. Draft Isi Pesan
                      </h4>

                      {/* Title */}
                      <div>
                        <div className="flex justify-between items-center mb-1.5">
                          <label className="block text-xs font-bold text-slate-700">
                            Judul Pesan (Max 100 Karakter)
                          </label>
                          <span className={`text-[10px] font-semibold ${broadcastTitle.length > 100 ? 'text-rose-500' : 'text-slate-400'}`}>
                            {broadcastTitle.length}/100
                          </span>
                        </div>
                        <input
                          type="text"
                          maxLength={100}
                          placeholder="Ketik judul notifikasi..."
                          value={broadcastTitle}
                          onChange={(e) => setBroadcastTitle(e.target.value)}
                          className="w-full bg-white border border-slate-250 text-slate-800 rounded-xl px-4 py-3 text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                          required
                        />
                      </div>

                      {/* Body */}
                      <div>
                        <div className="flex justify-between items-center mb-1.5">
                          <label className="block text-xs font-bold text-slate-700">
                            Isi Pesan
                          </label>
                          <span className="text-[10px] text-slate-400">
                            Gunakan **teks** untuk menebalkan (bold).
                          </span>
                        </div>
                        <textarea
                          rows={6}
                          placeholder="Ketik pesan yang ingin disampaikan..."
                          value={broadcastMessage}
                          onChange={(e) => setBroadcastMessage(e.target.value)}
                          className="w-full bg-white border border-slate-250 text-slate-800 rounded-xl px-4 py-3 text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                          required
                        />
                      </div>
                    </div>

                    <button
                      type="submit"
                      disabled={isSendingBroadcast}
                      className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-3.5 px-6 rounded-2xl text-xs flex items-center justify-center gap-2 cursor-pointer w-full transition-all shadow-lg shadow-indigo-100 disabled:bg-slate-300 disabled:shadow-none"
                    >
                      {isSendingBroadcast ? (
                        <>
                          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                          Mengirim Broadcast Massal...
                        </>
                      ) : (
                        <>
                          <i className="bx bx-paper-plane text-sm" />
                          Kirim Pesan Massal Sekarang
                        </>
                      )}
                    </button>
                  </form>
                </div>

                {/* Kanan: Live Preview & Selected Regions */}
                <div className="lg:col-span-5 space-y-6">
                  {/* Targets List */}
                  <div className="bg-slate-50 border border-slate-200 p-5 rounded-2xl space-y-4">
                    <h4 className="text-xs font-extrabold text-slate-400 uppercase tracking-widest flex justify-between items-center">
                      <span>Wilayah Terpilih ({targetsList.length})</span>
                      {targetsList.length > 0 && (
                        <button
                          type="button"
                          onClick={() => setTargetsList([])}
                          className="text-[10px] text-rose-500 hover:underline cursor-pointer"
                        >
                          Hapus Semua
                        </button>
                      )}
                    </h4>

                    {targetsList.length === 0 ? (
                      <div className="border border-dashed border-slate-200 rounded-xl p-6 text-center text-xs text-slate-400 leading-relaxed bg-white">
                        <i className="bx bx-globe text-2xl text-slate-300 mb-1.5 block" />
                        Semua wilayah terpilih (Tanpa filter geografi). Pesan akan menjangkau semua user secara nasional.
                      </div>
                    ) : (
                      <div className="max-h-[220px] overflow-y-auto pr-1 space-y-2">
                        {targetsList.map((t, idx) => (
                          <div
                            key={idx}
                            className="bg-white border border-slate-250 px-3 py-2 rounded-xl flex justify-between items-center shadow-sm"
                          >
                            <div className="text-slate-700 text-xs">
                              <span className="font-bold">{t.province}</span>
                              {t.city && (
                                <>
                                  <span className="text-slate-400 mx-1">&gt;</span>
                                  <span>{t.city}</span>
                                </>
                              )}
                            </div>
                            <button
                              type="button"
                              onClick={() => handleRemoveTarget(idx)}
                              className="text-slate-400 hover:text-rose-500 text-sm cursor-pointer"
                            >
                              <i className="bx bx-trash" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Live Preview Notification */}
                  <div className="bg-slate-50 border border-slate-200 p-5 rounded-2xl space-y-3">
                    <h4 className="text-xs font-extrabold text-slate-400 uppercase tracking-widest">
                      Live Preview Notifikasi
                    </h4>

                    <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm relative overflow-hidden">
                      {/* Accent color bar */}
                      <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-indigo-500 to-purple-600" />
                      
                      <div className="flex gap-3 mt-1.5">
                        <div className="w-8 h-8 rounded-full bg-indigo-50 border border-indigo-100 flex items-center justify-center shrink-0">
                          <i className="bx bxs-bell-ring text-indigo-500 text-base animate-bounce" />
                        </div>
                        <div className="space-y-1 flex-1">
                          <div className="flex justify-between items-start">
                            <span className="text-[10px] font-bold text-indigo-600 uppercase tracking-wide">
                              AkuGlow
                            </span>
                            <span className="text-[9px] text-slate-400 font-medium">
                              Baru saja
                            </span>
                          </div>
                          <h5 className="text-xs font-extrabold text-slate-800 break-words leading-tight">
                            {broadcastTitle || 'Judul Notifikasi Akan Tampil Di Sini'}
                          </h5>
                          <p
                            className="text-[11px] text-slate-500 break-words leading-relaxed pt-0.5"
                            dangerouslySetInnerHTML={{
                              __html: parseMessage(broadcastMessage) || 'Isi notifikasi akan terupdate secara real-time saat Anda mengetik di form draf...'
                            }}
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </>
      )}

    </div>
  );
}
