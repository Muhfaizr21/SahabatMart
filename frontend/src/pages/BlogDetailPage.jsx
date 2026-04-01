import { useParams, Link } from 'react-router-dom';

export default function BlogDetailPage() {
  const { id } = useParams();

  // Dummy detail konten, anggap sama untuk semua artikel (tapi title bisa dimanis)
  return (
    <main className="max-w-4xl mx-auto px-6 py-12">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-sm text-gray-500 mb-6">
        <Link to="/" className="hover:text-blue-600">Beranda</Link>
        <span>/</span>
        <Link to="/blog" className="hover:text-blue-600">Blog</Link>
        <span>/</span>
        <span className="text-gray-900 font-medium truncate">Detail Artikel {id}</span>
      </nav>

      {/* Header Artikel */}
      <header className="mb-8">
        <div className="flex items-center gap-3 mb-4">
          <span className="bg-blue-100 text-blue-700 text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wide">
            Tips & Trik
          </span>
          <span className="text-sm text-gray-400">25 Mar 2024</span>
        </div>
        <h1 className="text-3xl md:text-5xl font-bold text-gray-900 leading-tight mb-6">
          Panduan Lengkap Memilih Gadget dan Aksesori Terbaik Tahun Ini
        </h1>
        <div className="flex items-center gap-4 border-b border-gray-100 pb-6">
          <div className="w-12 h-12 rounded-full overflow-hidden border-2 border-gray-100">
            <img src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&h=100&fit=crop" alt="Author" className="w-full h-full object-cover" />
          </div>
          <div>
            <div className="font-bold text-gray-900">Admin Editor</div>
            <div className="text-xs text-gray-500">Tech Enthusiast</div>
          </div>
        </div>
      </header>

      {/* Gambar Konten Utama */}
      <figure className="mb-10 rounded-3xl overflow-hidden shadow-sm">
        <img 
          src="https://images.unsplash.com/photo-1496181133206-80ce9b88a853?w=1200&h=600&fit=crop" 
          alt="Artikel Cover" 
          className="w-full h-auto object-cover max-h-[500px]" 
        />
        <figcaption className="text-center text-xs text-gray-400 mt-3">Ilustrasi perangkat teknologi terkini.</figcaption>
      </figure>

      {/* Isi Artikel */}
      <article className="prose prose-blue prose-lg max-w-none text-gray-600 leading-relaxed space-y-6">
        <p className="text-xl font-medium text-gray-800 leading-snug">
          Menemukan perangkat yang tepat di tengah ratusan rilis terbaru setiap bulannya bisa menjadi tantangan yang membingungkan. Artikel ini akan memandu kamu memahami spesifikasi dasar yang perlu diperhatikan.
        </p>
        <p>
          Memilih sistem operasi, mengetahui kapasitas RAM dan jenis penyimpanan yang tersedia merupakan langkah pertama untuk menentukan apa yang paling cocok dengan alur kerjamu. Tidak semua perangkat mahal sesuai untuk kegiatan harianmu. Terkadang baterai yang tahan lama lebih penting bagi pengguna mobile dibandingkan prosesor grafis yang canggih.
        </p>
        <h3 className="text-2xl font-bold text-gray-900 mt-8 mb-4">1. Pahami Kebutuhan Utamamu</h3>
        <p>
          Semuanya berawal dari kebutuhan. Jika kamu seorang desainer grafis, maka layar dengan akurasi warna tinggi wajib ada. Namun, jika kamu lebih banyak melakukan pekerjaan administratif, keyboard yang nyaman dan baterai yang besar mungkin jauh lebih penting.
        </p>
        <ul className="space-y-2 list-disc pl-5">
          <li><strong>Komputasi Harian:</strong> Dokumen, browsing, email.</li>
          <li><strong>Pekerjaan Berat:</strong> Video editor, 3D render, gaming AAA.</li>
          <li><strong>Portabilitas:</strong> Mobilitas tinggi, travel, rapat di berbagai lokasi.</li>
        </ul>
        <blockquote className="border-l-4 border-blue-600 pl-4 py-1 italic bg-blue-50/50 rounded-r-lg my-6 text-gray-700">
          "Keputusan terbaik bukan tentang produk paling mahal, melainkan tentang investasi yang membawa dampak terbanyak bagi keseharianmu."
        </blockquote>
        <h3 className="text-2xl font-bold text-gray-900 mt-8 mb-4">Kesimpulan</h3>
        <p>
          Dengan menimbang opsi yang tersedia antara kebutuhan dan anggaran, konsumen saat ini diberikan lebih banyak produk berkualitas. Selalu bandingkan spesifikasi dari beberapa brand sebelum membeli.
        </p>
      </article>

      {/* Bagian Share */}
      <div className="flex items-center gap-4 mt-12 pt-6 border-t border-gray-100">
        <span className="text-sm font-bold text-gray-900">Bagikan:</span>
        <button className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center text-blue-600 hover:bg-blue-600 hover:text-white transition-colors">
          <svg width="18" height="18" fill="currentColor" viewBox="0 0 24 24"><path d="M24 12.073C24 5.405 18.627 0 12 0S0 5.405 0 12.073C0 18.1 4.388 23.094 10.125 24v-8.437H7.078v-3.49h3.047v-2.66c0-3.005 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.267h3.328l-.532 3.49h-2.796V24C19.612 23.094 24 18.1 24 12.073z"/></svg>
        </button>
        <button className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center text-blue-600 hover:bg-blue-600 hover:text-white transition-colors">
          <svg width="18" height="18" fill="currentColor" viewBox="0 0 24 24"><path d="M23.954 4.569a10.02 10.02 0 01-2.825.775 4.958 4.958 0 002.163-2.723 10.054 10.054 0 01-3.127 1.184 4.92 4.92 0 00-8.384 4.482C7.691 8.094 4.066 6.13 1.64 3.161a4.82 4.82 0 00-.666 2.475c0 1.71.87 3.213 2.188 4.096a4.904 4.904 0 01-2.228-.616v.061a4.923 4.923 0 003.946 4.827 4.996 4.996 0 01-2.212.085 4.937 4.937 0 004.604 3.417 9.868 9.868 0 01-6.102 2.105c-.39 0-.779-.023-1.17-.067a13.995 13.995 0 007.557 2.209c9.054 0 13.999-7.496 13.999-13.986 0-.209 0-.42-.015-.63a9.936 9.936 0 002.46-2.548l-.047-.02z"/></svg>
        </button>
      </div>
    </main>
  );
}
