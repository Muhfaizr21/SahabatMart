import { categories } from '../data/products';

export default function CategorySection() {
  return (
    <section className="py-12 bg-white">
      <div className="max-w-7xl mx-auto px-6">
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4">
          {categories.map((cat) => (
            <a key={cat.id} href="#"
              className="group flex flex-col items-center p-6 rounded-2xl hover:shadow-lg transition-all duration-300 border border-gray-100 hover:border-blue-200 hover:-translate-y-1"
              style={{ backgroundColor: cat.bg }}>
              <div className="text-4xl mb-3 group-hover:scale-110 transition-transform duration-300">{cat.emoji}</div>
              <h3 className="text-sm font-semibold text-gray-800 text-center mb-1">{cat.name}</h3>
              <p className="text-xs text-gray-500">{cat.count} Produk</p>
            </a>
          ))}
        </div>
      </div>
    </section>
  );
}
