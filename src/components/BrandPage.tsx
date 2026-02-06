import Footer from "@/components/Footer";

interface Property {
    image?: string;
    text: string;
}

interface Advantage {
    title: string;
    text: string;
}

interface CollectionItem {
    image: string;
    name: string;
}

interface TechSpec {
    label: string;
    value: string;
}

interface BrandPageProps {
    name: string;
    logo: string;
    heroImage: string;
    heroText: string;
    description: string;
    secondaryImage: string;
    secondaryText: string;
    properties: Property[];
    advantages: Advantage[];
    extraContent?: string;
    extraImage?: string;
    gallery: string[];
    awards?: string[];
    sustainability?: {
        title: string;
        text: string;
        image: string;
        sections?: { title: string; text: string }[];
    };
    collection: CollectionItem[];
    techSpecs: TechSpec[];
}

export default function BrandPage({
    name,
    logo,
    heroImage,
    heroText,
    description,
    secondaryImage,
    secondaryText,
    properties,
    advantages,
    extraContent,
    extraImage,
    gallery,
    awards,
    sustainability,
    collection,
    techSpecs,
}: BrandPageProps) {
    return (
        <div className="bg-black min-h-screen pt-24 text-white">
            {/* Hero Section */}
            <section className="py-20 px-6">
                <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-[2fr_1fr] gap-12 items-center">
                    <div className="space-y-8">
                        <h1 className="text-2xl md:text-3xl font-semibold uppercase tracking-widest text-gray-400">
                            <span className="text-gray-600 mr-2">—</span> {heroText}
                        </h1>
                        <p className="text-gray-300 font-light leading-relaxed text-lg max-w-2xl">
                            {description}
                        </p>
                    </div>
                    <div className="flex justify-center md:justify-end">
                        <img src={logo} alt={name} className="h-20 w-auto" />
                    </div>
                </div>
            </section>

            {/* Hero Banner */}
            <section className="grid grid-cols-1 lg:grid-cols-2">
                <div
                    className="h-[60vh] bg-cover bg-center grayscale hover:grayscale-0 transition-all duration-1000"
                    style={{ backgroundImage: `url(${heroImage})` }}
                />
                <div className="bg-black flex items-center p-12 lg:p-24">
                    <h2 className="text-4xl md:text-6xl font-extralight uppercase tracking-tighter leading-none text-gray-200">
                        {secondaryText}
                    </h2>
                </div>
            </section>

            {/* Properties */}
            <section className="py-24 px-6 border-t border-white/5">
                <div className="max-w-7xl mx-auto">
                    <div className="text-center mb-20">
                        <h2 className="text-2xl md:text-3xl font-extralight uppercase tracking-widest text-gray-400">
                            <span className="text-gray-600 mr-2">—</span> Propiedades
                        </h2>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-12">
                        {properties.map((prop, i) => (
                            <div key={i} className="text-center space-y-6 group">
                                {prop.image && (
                                    <img
                                        src={prop.image}
                                        alt=""
                                        className="mx-auto h-20 w-auto invert group-hover:scale-110 transition-transform"
                                    />
                                )}
                                <p className="text-xs uppercase tracking-widest text-gray-400 font-medium leading-relaxed">
                                    {prop.text}
                                </p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* Advantages Overlay Section */}
            <section className="grid grid-cols-1 lg:grid-cols-2 border-t border-white/5">
                <div className="bg-[#0a0a0a] flex items-center p-12 lg:p-24">
                    <h2 className="text-3xl md:text-5xl font-extralight uppercase tracking-widest leading-tight text-gray-200">
                        Único en sus características gracias a su superficie innovadora
                    </h2>
                </div>
                <div
                    className="h-[60vh] bg-cover bg-center grayscale hover:grayscale-0 transition-all duration-1000"
                    style={{ backgroundImage: `url(${secondaryImage})` }}
                />
            </section>

            {/* Advantages Details */}
            <section className="py-24 px-6">
                <div className="max-w-7xl mx-auto">
                    <div className="text-center mb-20">
                        <h2 className="text-2xl md:text-3xl font-extralight uppercase tracking-widest text-gray-400">
                            <span className="text-gray-600 mr-2">—</span> Ventajas
                        </h2>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-16">
                        {advantages.map((adv, i) => (
                            <div key={i} className="space-y-6">
                                <h3 className="text-lg font-bold uppercase tracking-widest text-gray-100">{adv.title}</h3>
                                <p className="text-sm text-gray-400 font-light leading-relaxed">{adv.text}</p>
                                <div className="h-px bg-white/10 w-full" />
                            </div>
                        ))}
                    </div>

                    {extraContent && (
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-20 mt-32 items-center">
                            <div className="space-y-8">
                                <h3 className="text-4xl font-extralight uppercase tracking-tighter text-gray-100">+ MAS</h3>
                                <div className="text-sm text-gray-400 font-light leading-relaxed space-y-4" dangerouslySetInnerHTML={{ __html: extraContent }} />
                            </div>
                            {extraImage && (
                                <img src={extraImage} alt="" className="w-full h-auto grayscale" />
                            )}
                        </div>
                    )}
                </div>
            </section>

            {/* Gallery */}
            <section className="py-12 border-t border-white/5">
                <div className="grid grid-cols-2 md:grid-cols-4">
                    {gallery.map((img, i) => (
                        <div key={i} className="aspect-square overflow-hidden group">
                            <img
                                src={img}
                                alt={`${name} gallery ${i}`}
                                className="w-full h-full object-cover grayscale group-hover:grayscale-0 group-hover:scale-110 transition-all duration-700"
                            />
                        </div>
                    ))}
                </div>
            </section>

            {/* Awards */}
            {awards && awards.length > 0 && (
                <section className="py-24 px-6 border-t border-white/5">
                    <div className="max-w-7xl mx-auto">
                        <div className="text-center mb-20">
                            <h2 className="text-2xl md:text-3xl font-extralight uppercase tracking-widest text-gray-400">
                                <span className="text-gray-600 mr-2">—</span> Premios y Reconocimientos
                            </h2>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
                            {awards.map((award, i) => (
                                <div key={i} className="space-y-4">
                                    <p className="text-sm text-gray-300 font-light italic leading-relaxed">{award}</p>
                                    <div className="h-px bg-white/10 w-full" />
                                </div>
                            ))}
                        </div>
                    </div>
                </section>
            )}

            {/* Sustainability */}
            {sustainability && (
                <section className="border-t border-white/5">
                    <div className="grid grid-cols-1 lg:grid-cols-2">
                        <div className="bg-[#0a0a0a] p-12 lg:p-24 space-y-8">
                            <h2 className="text-3xl md:text-5xl font-extralight uppercase tracking-widest text-gray-100">{sustainability.title}</h2>
                            <p className="text-gray-400 font-light leading-relaxed">{sustainability.text}</p>
                        </div>
                        <div
                            className="h-[60vh] bg-cover bg-center grayscale"
                            style={{ backgroundImage: `url(${sustainability.image})` }}
                        />
                    </div>
                    {sustainability.sections && (
                        <div className="max-w-7xl mx-auto px-6 py-24 grid grid-cols-1 md:grid-cols-2 gap-20">
                            {sustainability.sections.map((s, i) => (
                                <div key={i} className="space-y-6">
                                    <h3 className="text-sm font-bold uppercase tracking-widest text-gray-200">{s.title}</h3>
                                    <p className="text-sm text-gray-400 font-light leading-relaxed">{s.text}</p>
                                </div>
                            ))}
                        </div>
                    )}
                </section>
            )}

            {/* Collection */}
            <section className="py-24 px-6 border-t border-white/5">
                <div className="max-w-7xl mx-auto">
                    <div className="text-center mb-20">
                        <h2 className="text-2xl md:text-3xl font-extralight uppercase tracking-widest text-gray-400">
                            <span className="text-gray-600 mr-2">—</span> Colección
                        </h2>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-12">
                        {collection.map((item, i) => (
                            <div key={i} className="group cursor-pointer">
                                <div className="aspect-video overflow-hidden">
                                    <img
                                        src={item.image}
                                        alt={item.name}
                                        className="w-full h-full object-cover grayscale group-hover:grayscale-0 transition-all duration-500"
                                    />
                                </div>
                                <p className="mt-4 text-[10px] uppercase tracking-widest font-bold text-gray-500 group-hover:text-white transition-colors">
                                    {item.name}
                                </p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* Tech Specs */}
            <section className="py-24 px-6 border-t border-white/5 bg-[#050505]">
                <div className="max-w-7xl mx-auto">
                    <div className="text-left mb-16">
                        <h2 className="text-xl md:text-2xl font-extralight uppercase tracking-widest text-gray-400">
                            <span className="text-gray-600 mr-2">—</span> Técnica
                        </h2>
                    </div>
                    <div className="grid grid-cols-1 gap-0 border-t border-white/10">
                        {techSpecs.map((spec, i) => (
                            <div key={i} className="grid grid-cols-1 md:grid-cols-[1fr_2fr] py-6 border-b border-white/10 px-4 hover:bg-white/[0.02] transition-colors">
                                <span className="text-[10px] uppercase tracking-widest font-bold text-gray-500 mb-2 md:mb-0">
                                    {spec.label}
                                </span>
                                <span className="text-sm text-gray-300 font-light leading-relaxed">
                                    {spec.value}
                                </span>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            <Footer />
        </div>
    );
}
