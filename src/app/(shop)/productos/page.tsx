import Footer from "@/components/Footer";

const PRODUCT_CARDS = [
    {
        title: "Fenix",
        subtitle: "Extra Mate",
        image: "/images/prod/fenix.jpg",
        description: "Superficie súper mate con nanotecnologia, muy suave al tacto y con reparabilidad térmica.",
        link: "/fenix"
    },
    {
        title: "Brillato",
        subtitle: "Extra Brillo",
        image: "/images/prod/brilatto.jpg",
        description: "Explora un mundo de luces e imágenes que se reflejan en su superficie brillante nunca vista en materiales tradicionales.",
        link: "/brilatto"
    },
    {
        title: "Cleaf",
        subtitle: "Extra textura",
        image: "/images/prod/cleaf.jpg",
        description: "Producidos con la misma textura que los paneles, creando detalles únicos basadas en investigación, tecnología y tendencias.",
        link: "/cleaf"
    }
];

export default function ProductosPage() {
    return (
        <div className="bg-black min-h-screen pt-24 text-white">
            <section className="py-20 px-6">
                <div className="max-w-7xl mx-auto space-y-12">
                    <div className="text-center mb-16">
                        <h1 className="text-3xl md:text-5xl font-extralight uppercase tracking-widest text-gray-400">
                            <span className="text-gray-600 mr-2">—</span> Productos carpi
                        </h1>
                    </div>

                    <div className="max-w-3xl mx-auto text-center">
                        <p className="text-gray-300 font-light leading-relaxed text-lg">
                            Crear algo único y especial siempre es un gran logro, por eso en CARPI Argentina, combinamos colores, formas, conceptos, tecnología y mucha moda. Todo para desarrollar una estética personalizada y exclusiva. Creamos una línea versátil, ofreciendo una colección colorida para que transformes tu imaginación en realidad.
                        </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-20">
                        {PRODUCT_CARDS.map((card, index) => (
                            <div key={index} className="group relative overflow-hidden bg-[#1a1a1a] flex flex-col h-full">
                                <div className="aspect-[4/5] overflow-hidden shrink-0">
                                    <img
                                        src={card.image}
                                        alt={card.title}
                                        className="w-full h-full object-cover grayscale group-hover:grayscale-0 group-hover:scale-105 transition-all duration-700"
                                    />
                                </div>
                                <div className="p-8 bg-[#111] space-y-4 flex flex-col flex-1">
                                    <div>
                                        <h3 className="text-xl font-bold uppercase tracking-wider">{card.title}</h3>
                                        <span className="text-xs uppercase tracking-[0.2em] text-gray-500 font-bold">{card.subtitle}</span>
                                    </div>
                                    <p className="text-sm text-gray-400 font-light leading-relaxed border-t border-white/10 pt-4 flex-1">
                                        {card.description}
                                    </p>
                                    <div className="pt-2">
                                        <a
                                            href={card.link}
                                            className="inline-block text-[10px] uppercase tracking-widest font-bold border-b border-white hover:text-gray-400 hover:border-gray-400 transition-all"
                                        >
                                            Leer más
                                        </a>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </section>
            <Footer />
        </div>
    );
}
