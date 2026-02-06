import Footer from "@/components/Footer";
import { FileText } from "lucide-react";

const SECTIONS = [
    {
        title: "Fenix NTM",
        links: [
            { name: "SEFA | RESISTENCIA QUÍMICA", url: "https://carpiargentina.com/tecnica/FENIX/FENIX%20NTM%20%20PRUEBA%20SEFA%20DE%20RESISTENCIA%20QUI%CC%81MICA.pdf" },
            { name: "SEFA | RESISTENCIA QUÍMICA II", url: "https://carpiargentina.com/tecnica/FENIX/FENIX%20NTM%20%20PRUEBA%20SEFA%20DE%20RESISTENCIA%20QU%C3%8DMICA-%20bianco.pdf" },
            { name: "SEFA | RESISTENCIA QUÍMICA III", url: "https://carpiargentina.com/tecnica/FENIX/FENIX%20NTM%20%20PRUEBA%20SEFA%20DE%20RESISTENCIA%20QU%C3%8DMICA-%20negro.pdf" },
            { name: "SOLID FICHA TÉCNICA", url: "https://carpiargentina.com/tecnica/FENIX/FENIX%20NTM%20%20SOLID%20FICHA%20T%C3%89CNICA.pdf" },
            { name: "THIN FICHA TÉCNICA", url: "https://carpiargentina.com/tecnica/FENIX/FENIX%20NTM%20%20THIN%20FICHA%20T%C3%89CNICA.pdf" },
            { name: "folleto material innovador", url: "https://carpiargentina.com/tecnica/FENIX/fenix-%20folleto%20material%20innovador.pdf" },
            { name: "instrucciones de limpieza", url: "https://carpiargentina.com/tecnica/FENIX/fenix-%20instrucciones%20de%20limpieza.pdf" },
            { name: "equivalencia de bordes", url: "https://carpiargentina.com/tecnica/FENIX/fenix-equivalencia%20de%20bordes.pdf" },
            { name: "equivalencia de colores", url: "https://carpiargentina.com/tecnica/FENIX/fenix-equivalencia%20de%20colores.pdf" },
            { name: "folleto piletas", url: "https://carpiargentina.com/tecnica/FENIX/fenix-folleto%20piletas.pdf" },
            { name: "garantia", url: "https://carpiargentina.com/tecnica/FENIX/fenix-garantia.pdf" },
            { name: "instrucciones de almacenamiento", url: "https://carpiargentina.com/tecnica/FENIX/fenix-instrucciones%20de%20almacenamiento%20y%20manipulacion.pdf" },
            { name: "Valores de reflactancia luminosa", url: "https://carpiargentina.com/tecnica/FENIX/fenix-valores%20de%20reflactancia%20luminosa.pdf" },
            { name: "The fenix collection", url: "https://carpiargentina.com/tecnica/FENIX/FENIX.pdf" },
            { name: "Fenix", url: "https://carpiargentina.com/tecnica/FENIX/FENIX2.pdf" },
        ],
    },
    {
        title: "Cleaf",
        links: [
            { name: "ITA-Pannello-MDF-nobilitato-DOP-02", url: "https://carpiargentina.com/tecnica/CLEAF/Cleaf_ITA-Pannello-MDF-ignifugo-nobilitato-DOP-02.pdf" },
            { name: "ITA-Pannello-truciolare-nobilitato-DOP-01", url: "https://carpiargentina.com/tecnica/CLEAF/Cleaf_ITA-Pannello-truciolare-ignifugo-nobilitato-DOP-01.pdf" },
            { name: "FSC-Certificate", url: "https://carpiargentina.com/tecnica/CLEAF/Cleaf-FSC-Certificate.pdf" },
            { name: "HPL-Class-B-s1d0-Certificate", url: "https://carpiargentina.com/tecnica/CLEAF/Cleaf-HPL-Class-B-s1d0-Certificate.pdf" },
            { name: "MDF-Melamine-Faced-B-s1d0-MDF-Certificate", url: "https://carpiargentina.com/tecnica/CLEAF/Cleaf-MDF-Melamine-Faced-B-s1d0-MDF-Certificate.pdf" },
            { name: "Melamine-faced-Class-B-Certificate", url: "https://carpiargentina.com/tecnica/CLEAF/Cleaf-Melamine-faced-chipboard-Class-B-ASTM-E84-Certificate.pdf" },
            { name: "Melamine-faced-chipboard-panel-Certificate", url: "https://carpiargentina.com/tecnica/CLEAF/Cleaf-Melamine-faced-chipboard-panel-B-s2d0-Certificate.pdf" },
        ],
    },
    {
        title: "Brillato",
        links: [
            { name: "Certificado-tecnico-brilho", url: "https://carpiargentina.com/tecnica/BRILLATO/Certificado-tecnico-brilho.pdf" },
        ],
    },
];

export default function TecnologiaPage() {
    return (
        <div className="bg-black min-h-screen pt-32 pb-20 text-white">
            <div className="max-w-7xl mx-auto px-6">
                {/* Header */}
                <div className="text-center mb-20">
                    <h1 className="text-3xl md:text-5xl font-extralight uppercase tracking-[0.3em] text-gray-400">
                        <span className="text-gray-600 mr-4">—</span> Fichas Técnicas
                    </h1>
                    <p className="mt-6 text-gray-500 font-light uppercase tracking-widest text-sm">
                        Documentación técnica de nuestros productos
                    </p>
                </div>

                {/* Sections */}
                <div className="space-y-32">
                    {SECTIONS.map((section, idx) => (
                        <section key={idx} className="relative">
                            <div className="flex items-center gap-6 mb-12">
                                <h2 className="text-xl md:text-2xl font-light uppercase tracking-[0.2em] text-gray-200">
                                    <span className="text-[#ff0000] mr-3">—</span> {section.title}
                                </h2>
                                <div className="h-px bg-white/10 flex-grow" />
                                <FileText className="text-[#ff0000] w-6 h-6 opacity-50" />
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                {section.links.map((link, linkIdx) => (
                                    <a
                                        key={linkIdx}
                                        href={link.url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="group relative flex items-center justify-between p-6 bg-[#0a0a0a] border border-white/5 hover:border-[#ff0000]/50 transition-all duration-300"
                                    >
                                        <div className="flex flex-col gap-1">
                                            <span className="text-[10px] uppercase tracking-widest text-gray-500 font-bold group-hover:text-gray-300 transition-colors">
                                                Descargar PDF
                                            </span>
                                            <span className="text-xs text-gray-300 tracking-wider uppercase font-light group-hover:text-white transition-colors">
                                                {link.name}
                                            </span>
                                        </div>
                                        <div className="bg-white/5 p-2 rounded-full group-hover:bg-[#ff0000]/20 transition-colors">
                                            <FileText className="w-4 h-4 text-gray-400 group-hover:text-[#ff0000] transition-colors" />
                                        </div>
                                    </a>
                                ))}
                            </div>
                        </section>
                    ))}
                </div>
            </div>
            <div className="mt-32">
                <Footer />
            </div>
        </div>
    );
}
