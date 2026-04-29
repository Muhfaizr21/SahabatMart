import { useState, useEffect, useRef } from 'react';
import { fetchJson, API_BASE } from '../lib/api';
import { getStoredUser } from '../lib/auth';
import toast from 'react-hot-toast';

const STYLES = {
  container: { maxWidth: '800px', margin: '0 auto', padding: '24px', fontFamily: "'Plus Jakarta Sans', sans-serif" },
  glassCard: {
    background: 'rgba(15, 23, 42, 0.6)',
    backdropFilter: 'blur(16px)',
    borderRadius: '24px',
    border: '1px solid rgba(255, 255, 255, 0.08)',
    padding: '24px',
    marginBottom: '24px',
    boxShadow: '0 8px 32px rgba(0, 0, 0, 0.2)'
  },
  title: { fontSize: '24px', fontWeight: '800', color: '#fff', marginBottom: '4px', letterSpacing: '-0.5px' },
  subtitle: { color: '#94a3b8', fontSize: '14px', marginBottom: '32px' },
  creatorWrapper: { display: 'flex', gap: '16px' },
  avatarLarge: { width: '48px', height: '48px', borderRadius: '16px', objectFit: 'cover', border: '2px solid rgba(99, 102, 241, 0.3)' },
  textarea: { 
    width: '100%', background: 'transparent', border: 'none', color: '#fff', fontSize: '16px', 
    outline: 'none', resize: 'none', minHeight: '100px', padding: '8px 0' 
  },
  actionRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '20px', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '16px' },
  uploadBtn: { display: 'flex', alignItems: 'center', gap: '8px', color: '#6366f1', fontSize: '14px', fontWeight: '600', cursor: 'pointer', padding: '8px 12px', borderRadius: '10px', transition: '0.2s', background: 'rgba(99, 102, 241, 0.1)' },
  postBtn: { background: '#6366f1', color: 'white', padding: '10px 24px', borderRadius: '14px', fontWeight: '700', fontSize: '14px', border: 'none', cursor: 'pointer', boxShadow: '0 4px 12px rgba(99, 102, 241, 0.3)' },
  previewImage: { width: '100px', height: '100px', borderRadius: '12px', objectFit: 'cover', marginTop: '12px', border: '2px solid #6366f1', position: 'relative' },
  postCard: { background: 'rgba(255, 255, 255, 0.02)', borderRadius: '24px', padding: '24px', border: '1px solid rgba(255, 255, 255, 0.05)', marginBottom: '20px' },
  badge: { padding: '4px 10px', borderRadius: '8px', background: 'rgba(99, 102, 241, 0.1)', color: '#818cf8', fontSize: '11px', fontWeight: '700', textTransform: 'uppercase' }
};

export default function SkinCommunity() {
  const [posts, setPosts] = useState([]);
  const [groups, setGroups] = useState([]);
  const [activeFilter, setActiveFilter] = useState('');
  const [newPost, setNewPost] = useState('');
  const [targetGroup, setTargetGroup] = useState('');
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState('');
  const [loading, setLoading] = useState(true);
  const [isPosting, setIsPosting] = useState(false);
  const [commentInputs, setCommentInputs] = useState({});
  const [expandedPosts, setExpandedPosts] = useState({}); // Track expanded comments
  const fileInputRef = useRef(null);
  const user = getStoredUser();

  useEffect(() => { loadGroups(); loadFeed(); }, [activeFilter]);

  const loadGroups = async () => {
    try {
      const data = await fetchJson(`${API_BASE}/api/skin/community/groups`);
      if (data) setGroups(data);
    } catch (err) { console.error(err); }
  };

  const loadFeed = async () => {
    setLoading(true);
    try {
      const url = activeFilter ? `${API_BASE}/api/skin/community?group_id=${activeFilter}` : `${API_BASE}/api/skin/community`;
      const data = await fetchJson(url);
      if (data) setPosts(data);
    } catch (err) { toast.error('Gagal memuat feed'); }
    finally { setLoading(false); }
  };

  const convertToWebP = (file) => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = (e) => {
        const img = new Image();
        img.src = e.target.result;
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const MAX_WIDTH = 1080;
          let width = img.width;
          let height = img.height;
          if (width > MAX_WIDTH) {
            height *= MAX_WIDTH / width;
            width = MAX_WIDTH;
          }
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, width, height);
          canvas.toBlob((blob) => {
            resolve(new File([blob], file.name.replace(/\.[^/.]+$/, "") + ".webp", { type: 'image/webp' }));
          }, 'image/webp', 0.8);
        };
      };
    });
  };

  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    toast.loading('Optimasi Gambar...', { duration: 1000 });
    const webpFile = await convertToWebP(file);
    setSelectedFile(webpFile);
    setPreviewUrl(URL.createObjectURL(webpFile));
  };

  const handlePost = async () => {
    const finalGroup = activeFilter || targetGroup;
    if (!newPost.trim() || !finalGroup) {
      toast.error('Pilih grup dan isi konten dulu Bos!');
      return;
    }
    setIsPosting(true);
    let finalImageUrl = '';

    try {
      // 1. Upload Image if exists
      if (selectedFile) {
        const formData = new FormData();
        formData.append('image', selectedFile);
        const uploadRes = await fetch(`${API_BASE}/api/skin/community/upload`, {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` },
          body: formData
        });
        const uploadData = await uploadRes.json();
        if (uploadData.url) finalImageUrl = API_BASE + uploadData.url;
      }

      // 2. Submit Post
      const res = await fetchJson(`${API_BASE}/api/skin/community/post`, {
        method: 'POST',
        body: JSON.stringify({ 
          content: newPost, 
          image_url: finalImageUrl, 
          group_id: parseInt(finalGroup) 
        })
      });

      if (res) {
        setPosts([res, ...posts]);
        setNewPost('');
        setSelectedFile(null);
        setPreviewUrl('');
        toast.success('Postingan Terkirim!');
      }
    } catch (err) { toast.error('Gagal mengirim postingan'); }
    finally { setIsPosting(false); }
  };

  const handleLike = async (postId) => {
    try {
      await fetchJson(`${API_BASE}/api/skin/community/like?id=${postId}`, { method: 'POST' });
      setPosts(posts.map(p => p.id === postId ? { ...p, likes: p.likes + 1 } : p));
    } catch (err) { toast.error('Gagal menyukai'); }
  };

  const handleComment = async (postId) => {
    const content = commentInputs[postId];
    if (!content?.trim()) return;

    try {
      const res = await fetchJson(`${API_BASE}/api/skin/community/comment`, {
        method: 'POST',
        body: JSON.stringify({ post_id: postId, content })
      });
      if (res) {
        setPosts(posts.map(p => p.id === postId ? { ...p, comments: [...(p.comments || []), res] } : p));
        setCommentInputs({ ...commentInputs, [postId]: '' });
        toast.success('Balasan terkirim');
      }
    } catch (err) { toast.error('Gagal mengirim balasan'); }
  };

  const handleDeletePost = async (postId) => {
    if (!window.confirm('Hapus postingan ini?')) return;
    try {
      await fetchJson(`${API_BASE}/api/skin/community/post/delete?id=${postId}`, { method: 'DELETE' });
      setPosts(posts.filter(p => p.id !== postId));
      toast.success('Postingan dihapus');
    } catch (err) { toast.error('Gagal menghapus postingan'); }
  };

  const handleDeleteComment = async (postId, commentId) => {
    if (!window.confirm('Hapus balasan ini?')) return;
    try {
      await fetchJson(`${API_BASE}/api/skin/community/comment/delete?id=${commentId}`, { method: 'DELETE' });
      setPosts(posts.map(p => p.id === postId ? { 
        ...p, 
        comments: p.comments.filter(c => c.id !== commentId) 
      } : p));
      toast.success('Balasan dihapus');
    } catch (err) { toast.error('Gagal menghapus balasan'); }
  };

  return (
    <div style={STYLES.container}>
      <header style={{ marginBottom: '32px' }}>
        <h1 style={STYLES.title}>Survivor Community</h1>
        <p style={STYLES.subtitle}>Temukan dukungan dan inspirasi dari sesama pejuang kulit sehat.</p>
      </header>

      {/* Filter Chips */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '32px', overflowX: 'auto', paddingBottom: '8px' }}>
        <button onClick={() => setActiveFilter('')} style={{ padding: '8px 16px', borderRadius: '12px', background: !activeFilter ? '#6366f1' : 'rgba(255,255,255,0.05)', color: '#fff', border: 'none', cursor: 'pointer', fontSize: '13px', fontWeight: '600' }}>Semua</button>
        {groups.map(g => (
          <button key={g.id} onClick={() => setActiveFilter(g.id)} style={{ padding: '8px 16px', borderRadius: '12px', background: activeFilter === g.id ? '#6366f1' : 'rgba(255,255,255,0.05)', color: '#fff', border: 'none', cursor: 'pointer', fontSize: '13px', fontWeight: '600', whiteSpace: 'nowrap' }}>{g.name}</button>
        ))}
      </div>

      {/* Creator Card */}
      <div style={STYLES.glassCard}>
        <div style={STYLES.creatorWrapper}>
          <img src={user?.profile?.avatar_url || 'https://via.placeholder.com/150'} style={STYLES.avatarLarge} alt="" />
          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', gap: '10px', marginBottom: '8px' }}>
              {activeFilter ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={STYLES.badge}>Posting ke: {groups.find(g => g.id === activeFilter)?.name}</span>
                </div>
              ) : (
                <select 
                  style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', borderRadius: '8px', padding: '4px 12px', fontSize: '12px', outline: 'none' }}
                  value={targetGroup}
                  onChange={(e) => setTargetGroup(e.target.value)}
                >
                  <option value="">Pilih Grup Komunitas...</option>
                  {groups.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
                </select>
              )}
            </div>
            <textarea 
              placeholder={`Hai ${user?.profile?.full_name?.split(' ')[0]}, apa progres kulitmu hari ini?`}
              style={STYLES.textarea}
              value={newPost}
              onChange={(e) => setNewPost(e.target.value)}
            />
            {previewUrl && (
              <div style={{ position: 'relative', width: 'fit-content' }}>
                <img src={previewUrl} style={STYLES.previewImage} alt="Preview" />
                <button onClick={() => {setPreviewUrl(''); setSelectedFile(null)}} style={{ position: 'absolute', top: '-5px', right: '-5px', background: '#ef4444', color: 'white', border: 'none', borderRadius: '50%', width: '20px', height: '20px', cursor: 'pointer', fontSize: '12px' }}>×</button>
              </div>
            )}
            <div style={STYLES.actionRow}>
              <div onClick={() => fileInputRef.current.click()} style={STYLES.uploadBtn}>
                <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>image</span>
                <span>Foto Progres</span>
              </div>
              <input type="file" ref={fileInputRef} hidden accept="image/*" onChange={handleFileChange} />
              <button style={STYLES.postBtn} onClick={handlePost} disabled={isPosting}>
                {isPosting ? 'Mengirim...' : 'Posting'}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Feed */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '40px' }}><div className="animate-spin rounded-full h-8 w-8 border-t-2 border-indigo-500 mx-auto"></div></div>
      ) : posts.map(post => (
        <div key={post.id} style={STYLES.postCard}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px' }}>
            <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
              <img src={post.user?.profile?.avatar_url || 'https://via.placeholder.com/150'} style={{ width: '40px', height: '40px', borderRadius: '12px' }} alt="" />
              <div>
                <p style={{ fontWeight: '700', fontSize: '14px', color: '#fff', margin: 0 }}>{post.user?.profile?.full_name}</p>
                <p style={{ fontSize: '11px', color: '#64748b', margin: 0 }}>{post.created_at ? new Date(post.created_at).toLocaleDateString() : ''}</p>
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              {(post.user_id === user?.id || user?.role === 'admin' || user?.role === 'superadmin') && (
                <button onClick={() => handleDeletePost(post.id)} style={{ background: 'none', border: 'none', color: '#ef4444', fontSize: '11px', cursor: 'pointer', fontWeight: '600' }}>Hapus</button>
              )}
              {groups.find(g => g.id === post.group_id) && (
                <span style={STYLES.badge}>{groups.find(g => g.id === post.group_id).name}</span>
              )}
            </div>
          </div>
          
          <p style={{ fontSize: '15px', lineHeight: '1.6', color: '#cbd5e1', marginBottom: '16px' }}>{post.content}</p>
          {post.image_url && <img src={post.image_url} style={{ width: '100%', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.05)', marginBottom: '16px' }} alt="" />}

          <div style={{ display: 'flex', gap: '20px', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '16px' }}>
            <button onClick={() => handleLike(post.id)} style={{ background: 'none', border: 'none', color: '#ef4444', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}>
              <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>favorite</span> {post.likes}
            </button>
            <button 
              onClick={() => setExpandedPosts(prev => ({...prev, [post.id]: !prev[post.id]}))}
              style={{ background: 'none', border: 'none', color: '#64748b', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}
            >
              <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>chat_bubble</span> 
              {post.comments?.length > 0 ? `Lihat ${post.comments.length} komentar` : 'Balas'}
            </button>
          </div>

          {/* Comments List (Collapsible) */}
          {expandedPosts[post.id] && (
            <div style={{ marginTop: '20px', paddingLeft: '12px', borderLeft: '2px solid rgba(99, 102, 241, 0.2)' }}>
              {post.comments?.map(comment => (
                <div key={comment.id} style={{ marginBottom: '16px', display: 'flex', gap: '10px' }}>
                  <img src={comment.user?.profile?.avatar_url || 'https://via.placeholder.com/150'} style={{ width: '28px', height: '28px', borderRadius: '8px' }} alt="" />
                  <div style={{ background: 'rgba(255,255,255,0.03)', padding: '8px 12px', borderRadius: '12px', flex: 1, position: 'relative' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <p style={{ margin: 0, fontWeight: '700', fontSize: '12px', color: '#818cf8' }}>{comment.user?.profile?.full_name}</p>
                      {(comment.user_id === user?.id || user?.role === 'admin' || user?.role === 'superadmin') && (
                        <button onClick={() => handleDeleteComment(post.id, comment.id)} style={{ background: 'none', border: 'none', color: '#ef4444', fontSize: '10px', cursor: 'pointer', opacity: 0.6 }}>Hapus</button>
                      )}
                    </div>
                    <p style={{ margin: 0, fontSize: '13px', color: '#cbd5e1' }}>{comment.content}</p>
                  </div>
                </div>
              ))}

              {/* Reply Input */}
              <div style={{ display: 'flex', gap: '10px', marginTop: '16px' }}>
                <img src={user?.profile?.avatar_url || 'https://via.placeholder.com/150'} style={{ width: '28px', height: '28px', borderRadius: '8px' }} alt="" />
                <div style={{ flex: 1, position: 'relative' }}>
                  <input 
                    placeholder="Balas postingan ini..."
                    style={{ width: '100%', background: 'rgba(255,255,255,0.05)', border: 'none', borderRadius: '10px', padding: '8px 16px', color: '#fff', fontSize: '13px', outline: 'none' }}
                    value={commentInputs[post.id] || ''}
                    onChange={(e) => setCommentInputs({...commentInputs, [post.id]: e.target.value})}
                    onKeyDown={(e) => e.key === 'Enter' && handleComment(post.id)}
                  />
                  <button 
                    onClick={() => handleComment(post.id)}
                    style={{ position: 'absolute', right: '8px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: '#6366f1', cursor: 'pointer', display: 'flex' }}
                  >
                    <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>send</span>
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
