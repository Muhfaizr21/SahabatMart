export default function ContactPage() {
  return (
    <main className="max-w-4xl mx-auto px-6 py-12">
      <h1 className="text-3xl font-bold text-gray-900 mb-2">Hubungi Kami</h1>
      <div className="w-12 h-1 bg-blue-600 rounded-full mb-10" />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
        <div>
          <h2 className="text-xl font-semibold text-gray-800 mb-6">Kirim Pesan</h2>
          <form className="flex flex-col gap-4">
            <div>
              <label className="text-sm font-medium text-gray-700 block mb-1">Nama Lengkap</label>
              <input type="text" placeholder="Nama kamu" className="w-full bg-gray-50 border border-gray-200 rounded-lg px-4 py-3 text-sm outline-none focus:border-blue-500 focus:bg-white transition-colors" />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 block mb-1">Email</label>
              <input type="email" placeholder="email@kamu.com" className="w-full bg-gray-50 border border-gray-200 rounded-lg px-4 py-3 text-sm outline-none focus:border-blue-500 focus:bg-white transition-colors" />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 block mb-1">Subjek</label>
              <input type="text" placeholder="Subjek pesan" className="w-full bg-gray-50 border border-gray-200 rounded-lg px-4 py-3 text-sm outline-none focus:border-blue-500 focus:bg-white transition-colors" />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 block mb-1">Pesan</label>
              <textarea rows={5} placeholder="Tulis pesan kamu..." className="w-full bg-gray-50 border border-gray-200 rounded-lg px-4 py-3 text-sm outline-none focus:border-blue-500 focus:bg-white transition-colors resize-none" />
            </div>
            <button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-3.5 rounded-xl transition-colors mt-2">
              Kirim Pesan
            </button>
          </form>
        </div>
        <div>
          <h2 className="text-xl font-semibold text-gray-800 mb-6">Informasi Kontak</h2>
          <div className="space-y-5">
            {[
              { label: 'Alamat', value: 'Jl. Sudirman No. 123, Jakarta Pusat, 10220' },
              { label: 'Telepon', value: '+62 21 1234 5678' },
              { label: 'Email', value: 'support@sahabatmart.id' },
              { label: 'Jam Operasional', value: 'Sen - Sab: 09.00 - 21.00 WIB' },
            ].map((item) => (
              <div key={item.label} className="bg-gray-50 rounded-xl p-5 border border-gray-100 shadow-sm">
                <div className="text-xs font-bold text-gray-900 uppercase tracking-wider mb-2">{item.label}</div>
                <div className="text-sm text-gray-600">{item.value}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </main>
  );
}
