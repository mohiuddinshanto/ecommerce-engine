import { FiStar } from "react-icons/fi";

type Testimonial = { init?: string; image?: string; name?: string; role?: string; quote?: string; rating?: number };

const defaults: Testimonial[] = [
  { init: "TM", name: "Tasnim Mahbub", role: "Verified Buyer • Dhaka", quote: "The linen shirt felt premium the moment I opened the box. Delivery to Dhanmondi took just two days — quality and speed both exceeded expectations." },
  { init: "SR", name: "Sakib Rahman", role: "Verified Buyer • Chattogram", quote: "Ordered the sneakers during the festive drop and got a solid discount. Comfort is real — I wear them daily. bKash checkout was effortless." },
  { init: "NF", name: "Nusrat Faria", role: "Boutique Owner • Sylhet", quote: "We stock EPIC essentials for our boutique clients. Consistent quality, honest pricing, and their exchange policy keeps our customers happy." },
];

export function StoreTestimonials({ config }: { config?: { enabled?: boolean; eyebrow?: string; title?: string; accent?: string; subtitle?: string; items?: Testimonial[] } }) {
  const items = config?.items?.length ? config.items : defaults;
  if (config?.enabled === false || !items.length) return null;
  return <section className="home-deferred border-t border-slate-100 bg-slate-50 py-16">
    <div className="mx-auto max-w-[1400px] px-[6vw]">
      <div className="mx-auto mb-12 max-w-2xl text-center">
        <span className="eyebrow justify-center">{config?.eyebrow ?? "CUSTOMER CHRONICLES"}</span>
        <h2 className="font-display text-4xl font-extrabold tracking-tight text-slate-900">{config?.title ?? "Loved by"} <span className="gradient-text">{config?.accent ?? "thousands."}</span></h2>
        <p className="muted mt-2">{config?.subtitle ?? "Real stories from customers across Bangladesh and beyond."}</p>
      </div>
      <div className="grid gap-6 md:grid-cols-3">
        {items.map((item) => <div key={item.name || item.quote} className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm transition-transform hover:-translate-y-1 hover:shadow-md">
          <div className="mb-4 flex items-center gap-1 text-amber-400">{[0, 1, 2, 3, 4].map((i) => <FiStar key={i} fill="currentColor" />)}</div>
          <p className="mb-6 text-[0.95rem] italic leading-relaxed text-slate-600">“{item.quote}”</p>
          <div className="flex items-center gap-3 border-t border-slate-100 pt-4">
            {item.image ? <img src={item.image} alt={item.name ?? "customer"} className="h-10 w-10 rounded-full object-cover" /> : <div className="grid h-10 w-10 place-items-center rounded-full bg-gradient-to-br from-primary to-cyan font-mono text-xs font-bold text-white">{item.init || item.name?.slice(0, 2).toUpperCase() || "A"}</div>}
            <div><h3 className="text-sm font-bold text-slate-900">{item.name}</h3><p className="text-xs text-slate-500">{item.role}</p></div>
          </div>
        </div>)}
      </div>
    </div>
  </section>;
}
