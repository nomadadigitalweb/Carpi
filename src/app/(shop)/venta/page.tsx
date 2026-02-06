import Link from "next/link";
import { MapPin, Phone, Globe, ChevronRight } from "lucide-react";
import Footer from "@/components/Footer";

const SELLERS = [
    {
        name: "Amoblarq Muebles",
        address: "Av. Independencia 3692, Mar del Plata, BA",
        phone: "2233120564",
        website: "https://www.instagram.com/amoblarqmdq",
        location: "Mar del Plata"
    },
    {
        name: "Grupo A",
        address: "Quintana 211, Mar del Plata, BA",
        phone: "2235950609",
        website: "https://www.instagram.com/grupoa.cocinasyvestidores",
        location: "Mar del Plata"
    },
    {
        name: "Qubica",
        address: "Alvarado 3545, Mar del Plata, BA",
        phone: "223-668‑1337",
        website: "https://www.qubicaamoblamientos.com/",
        location: "Mar del Plata"
    },
    {
        name: "JOY AMOBLAMIENTOS",
        address: "Gral. Urquiza 670, B8000 Bahía Blanca, BA",
        phone: "02914532956",
        website: "https://amoblamientosjoy.com.ar",
        location: "Bahía Blanca"
    },
    {
        name: "TRIMAX MOBILIARIO",
        address: "Lomas del Mirador, BA",
        phone: "+5491131999043",
        website: "https://www.instagram.com/trimaxmobiliario/",
        location: "Provincia de Buenos Aires"
    },
    {
        name: "TIZONI Nordelta",
        address: "Av. de los Lagos 7008, B1670 Buenos Aires.",
        phone: "+54 9 11 6794-3357",
        website: "https://www.tizoni.com/",
        location: "Nordelta"
    },
    {
        name: "Biagetti",
        address: "Blas Parera 4581, José C. Paz, BA",
        phone: "02320422390",
        website: "https://www.instagram.com/biagettiar",
        location: "José C. Paz"
    },
    {
        name: "CHOLAKIAN",
        address: "Av. del Libertador 7780, Nuñez, CABA",
        phone: "+5491163345858",
        website: "https://www.instagram.com/cholakian.ar/",
        location: "CABA"
    },
    {
        name: "Romi Amoblamientos de Cocina",
        address: "Calle 47 1885, Platanos, Hudson, BA",
        phone: "1160796737",
        website: "https://www.instagram.com/romiamoblamientos",
        location: "Plátanos / Hudson"
    },
    {
        name: "T-aller",
        address: "Arias 3211, Castelar, BA",
        phone: "1173969423",
        website: "https://www.instagram.com/taller.bsas",
        location: "Castelar"
    },
    {
        name: "DISEGNO MILANO",
        address: "Avenida Don Bosco 823, Haedo, Buenos Aires",
        phone: "+5491146596025",
        website: "https://www.instagram.com/disegnomilanosrl/",
        location: "Haedo"
    },
    {
        name: "BARSKY MUEBLES",
        address: "Av. Yrigoyen 9285, Lomas de Zamora, BA",
        phone: "+5491162819742",
        website: "https://www.instagram.com/barskimuebles",
        location: "Lomas de Zamora"
    },
    {
        name: "Cato Muebles",
        address: "Dardo Rocha 1420, Local 1, Martinez, BA",
        phone: "1154864665",
        website: "https://www.instagram.com/catomuebles",
        location: "Martínez"
    },
    {
        name: "MODULUS",
        address: "Colectora Panamericana Oeste 2064, Boulogne, BA",
        phone: "1130341133",
        website: "https://www.instagram.com/modulus",
        location: "Boulogne"
    },
    {
        name: "BALUNEK MUEBLES",
        address: "Avenida del Libertador 7684, BA",
        phone: "+1133129057",
        website: "https://www.instagram.com/balunek_/",
        location: "CABA"
    },
    {
        name: "DI MARIO MUEBLES",
        address: "Av. Libertador 5824, BA",
        phone: "1162845500",
        website: "https://www.instagram.com/dimarioamoblamientos/",
        location: "CABA"
    },
    {
        name: "La Florida Design",
        address: "Av. San martin 1912, Vicente López, BA",
        phone: "+541134935638",
        website: "https://www.instagram.com/explore/locations/149707118745604/la-florida-design/",
        location: "Vicente López"
    },
    {
        name: "La Cocina Design",
        address: "Av. Pres. Julio A. Roca 573, Hurlingham",
        phone: "011 4665-6512",
        website: "https://lacocinadesign.com/contacto/",
        location: "Hurlingham"
    },
    {
        name: "INIZIA DESIGN",
        address: "Luis Ángel Firpo 2336, X5008 Córdoba",
        phone: "+5491147652727",
        website: "https://www.instagram.com/iniziadesign",
        location: "Córdoba"
    },
    {
        name: "INERCIA BA",
        address: "Sáenz Valiente 2750, B1640 Martínez, BA",
        phone: "1138745762",
        website: "https://www.instagram.com/inercia.ba",
        location: "Martínez"
    },
    {
        name: "Mi Cocina",
        address: "Av. del Libertador 15491, Acassuso, BA",
        phone: "1147427627",
        website: "https://www.instagram.com/micocina.web",
        location: "Acassuso"
    },
    {
        name: "Dwell",
        address: "Av. del Libertador 7720, BA | Humboldt 1524, BA",
        phone: "1122340993",
        website: "https://www.instagram.com/dwellcocinas",
        location: "CABA"
    },
    {
        name: "De Otro Tiempo",
        address: "Av. del Libertador 7574, BA",
        phone: "1147047594",
        website: "https://www.instagram.com/deotrotiempo",
        location: "CABA"
    },
    {
        name: "MOB COCINAS & VESTIDORES",
        address: "Provincia de Mendoza, AR",
        phone: "2616822922",
        website: "https://www.instagram.com/mob.cocinas.vestidores",
        location: "Mendoza"
    },
    {
        name: "FUNZIONALE AMOBLAMIENTOS",
        address: "Arístides Villanueva 436, MZA",
        phone: "02914532956",
        website: "https://amoblamientosjoy.com.ar",
        location: "Mendoza"
    },
    {
        name: "Mobler Interiorismo",
        address: "Leloir 485, Local 8, NQN",
        phone: "2994618198",
        website: "https://www.instagram.com/mobler.neuquen",
        location: "Neuquén"
    },
    {
        name: "CONCEPTO E MUEBLES",
        address: "Salvador del Carril 2490, SANTA FÉ",
        phone: "3492301533",
        website: "https://conceptomuebles.com.ar",
        location: "Santa Fe"
    },
    {
        name: "PLAKART AMOBLAMIENTOS",
        address: "Corrientes 145, Rosario, SANTA FÉ",
        phone: "3492301533",
        website: "https://www.instagram.com/plakart/",
        location: "Rosario"
    },
    {
        name: "FILIG MUEBLE",
        address: "Mendoza 2432, Rosario, SANTA FÉ",
        phone: "3413880099",
        website: "https://www.instagram.com/filigmueble/",
        location: "Rosario"
    },
    {
        name: "BARSANTE",
        address: "VIRASORO 848, Rosario, SANTA FÉ",
        phone: "3402553782",
        website: "https://www.instagram.com/mueblesbarzante/",
        location: "Rosario"
    },
    {
        name: "RC AMOBLAMIENTOS (cerrito)",
        address: "Jujuy 185, Cerrito, ENTRE RÍOS",
        phone: "+03434890020",
        website: "http://rcamoblamientos.com.ar/",
        location: "Entre Ríos"
    },
    {
        name: "Voce Cocina & Diseño",
        address: "Sarmiento Shopping - local 21 - CHACO",
        phone: "362 422-9600",
        website: "https://www.instagram.com/vocecocinas",
        location: "Chaco"
    },
    {
        name: "Scarpatti Amoblamientos",
        address: "Polo 52 (P. Ind) Au. Córdoba-Rosario km700, CBA",
        phone: "3516063866",
        website: "https://www.instagram.com/scarpatti",
        location: "Córdoba"
    },
    {
        name: "CONBELL Amoblamientos",
        address: "Emilio Lamarca 4135, CBA",
        phone: "0351152090008",
        website: "https://www.instagram.com/conbell_",
        location: "Córdoba"
    },
    {
        name: "SQL",
        address: "Av. Fuerza Aerea Argentina 3376, CBA",
        phone: "3514654531",
        website: "https://www.instagram.com/sqlamoblamientos",
        location: "Córdoba"
    },
    {
        name: "CADARIO ROSSOTTO",
        address: "Filadelfia 574 Lomas de Villa Allende, CBA",
        phone: "03518609073",
        website: "https://www.instagram.com/cadariorossotto.amoblamientos/",
        location: "Villa Allende, Córdoba"
    },
    {
        name: "INDUSTRIA INTERIOR",
        address: "Av Japon 971, CBA",
        phone: "3512688750",
        website: "https://www.instagram.com/industria.interior/",
        location: "Córdoba"
    },
    {
        name: "DUERS",
        address: "San Nicolas 3270, Rosario, SANTA FE.",
        phone: "3814097053",
        website: "https://www.instagram.com/industrias.duers/",
        location: "Rosario"
    },
    {
        name: "IDEA AMOBLAMIENTO",
        address: "Lavalle 1537, San Miguel de Tucumán, TUCUMÁN",
        phone: "+54 381 667-3006",
        website: "https://www.instagram.com/idea.amoblamiento/",
        location: "Tucumán"
    },
    {
        name: "SINGULAR",
        address: "San Miguel de Tucumán, TUCUMÁN",
        phone: "3815421632",
        website: "https://www.instagram.com/singular.mobiliario/",
        location: "Tucumán"
    },
    {
        name: "Viga Mobiliarios",
        address: "Avenida de las Américas 782, Salta, Salta",
        phone: "3874824453",
        website: "https://www.instagram.com/viga.mobiliarios",
        location: "Salta"
    },
    {
        name: "Distribuidora Valerio Oliva Sacia",
        address: "Carril Rodríguez Peña 2250, Godoy Cruz, Mendoza",
        phone: "2613911137",
        website: "https://www.instagram.com/valeriolivamza",
        location: "Mendoza"
    },
    {
        name: "Dristribuidora Mech",
        address: "Av. Pres. Perón 8107, Ituzaingó, BA",
        phone: "1146217030",
        website: "https://www.instagram.com/mech_placasyherrajes",
        location: "Ituzaingó"
    },
    {
        name: "LAR Mar del Plata",
        address: "Pehuajó 115, Mar del Plata, BA",
        phone: "2234391615",
        website: "https://www.instagram.com/larplacasymaderas",
        location: "Mar del Plata"
    },
    {
        name: "LAR Pinamar",
        address: "Ruta 11 km 396, Pinamar, BA",
        phone: "2254406969",
        website: "https://www.instagram.com/larplacasymaderas",
        location: "Pinamar"
    },
    {
        name: "Biagetti",
        address: "Blas Parera 4581, José C. Paz, BA",
        phone: "2320422390",
        website: "https://www.instagram.com/biagettiar",
        location: "José C. Paz"
    },
    {
        name: "Multiplacas",
        address: "Av. Bartolomé Mitre 1675, Florida Oeste, BA",
        phone: "1147304400",
        website: "https://www.instagram.com/multiplacas",
        location: "Florida Oeste"
    }
];

export default function VentaPage() {
    return (
        <div className="bg-black min-h-screen pt-32 pb-20 text-white">
            <div className="max-w-7xl mx-auto px-6">
                {/* Header Section - BrandPage Style */}
                <div className="mb-24 space-y-8">
                    <h1 className="text-2xl md:text-3xl font-semibold uppercase tracking-widest text-gray-400">
                        <span className="text-gray-600 mr-2">—</span> Canales de Venta
                    </h1>
                    <p className="text-gray-300 font-light leading-relaxed text-lg max-w-2xl">
                        Nuestra red de distribuidores oficiales en todo el país.
                        Encontrá la excelencia en atención y asesoramiento técnico.
                    </p>
                </div>

                {/* Grid Section - Refined Advantages style */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-12 gap-y-16">
                    {SELLERS.map((seller, index) => (
                        <div
                            key={index}
                            className="space-y-6 group flex flex-col h-full"
                        >
                            <div className="space-y-4 flex-grow">
                                <div className="space-y-1">
                                    <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-gray-500">
                                        {seller.location}
                                    </p>
                                    <h2 className="text-xl font-bold uppercase tracking-tight text-gray-100 group-hover:text-white transition-colors">
                                        {seller.name}
                                    </h2>
                                </div>

                                <div className="space-y-3">
                                    <div className="flex items-start gap-4 text-gray-400">
                                        <MapPin className="w-4 h-4 mt-1 shrink-0 text-gray-600" />
                                        <p className="text-xs font-light leading-relaxed">{seller.address}</p>
                                    </div>
                                    <div className="flex items-center gap-4 text-gray-400">
                                        <Phone className="w-4 h-4 shrink-0 text-gray-600" />
                                        <p className="text-xs font-mono">{seller.phone}</p>
                                    </div>
                                </div>
                            </div>

                            <div className="pt-6 space-y-4">
                                <div className="h-px bg-white/10 w-full" />
                                <a
                                    href={seller.website}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-gray-400 hover:text-white transition-all transform hover:translate-x-1"
                                >
                                    <Globe className="w-3 h-3" />
                                    IR AL SITIO WEB
                                    <ChevronRight className="w-3 h-3" />
                                </a>
                            </div>
                        </div>
                    ))}
                </div>

                {/* Footer Message */}
                <div className="mt-32 text-center border-t border-white/5 pt-20">
                    <p className="text-sm font-light text-gray-500 mb-8 italic tracking-wide">
                        ¿Querés ser distribuidor oficial de Carpi Argentina?
                    </p>
                    <Link
                        href="#contact"
                        className="text-[10px] font-bold uppercase tracking-[0.3em] border border-white/20 text-white px-12 py-4 hover:bg-white hover:text-black transition-all duration-500"
                    >
                        Contactanos
                    </Link>
                </div>
            </div>
            <div className="mt-20">
                <Footer />
            </div>
        </div>
    );
}
