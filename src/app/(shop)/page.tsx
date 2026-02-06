"use client";

import { useEffect, useState } from "react";
import Head from "next/head";
import Footer from "@/components/Footer";

const SLIDES = [
    {
        id: 1,
        image: "/images/s_fenix.jpg",
        title: "FENIX",
        subtitle: "ADN ITALIANO",
        description: "SUPERFICIE EXTRA MATE",
        link: "/fenix"
    },
    {
        id: 2,
        image: "/images/s_brillato.jpg",
        title: "CLEAF",
        subtitle: "ADN ITALIANO",
        description: "UNA SUPERFICIE CON EXTRA TEXTURA",
        link: "/brilatto"
    },
    {
        id: 3,
        image: "/images/s_cleaf.jpg",
        title: "BRILATTO",
        subtitle: "ADN ITALIANO",
        description: "Superficie Extra Brillo",
        link: "/cleaf"
    }
];

export default function LandingPage() {
    const [currentSlide, setCurrentSlide] = useState(0);

    useEffect(() => {
        const timer = setInterval(() => {
            setCurrentSlide((prev) => (prev + 1) % SLIDES.length);
        }, 6000);
        return () => clearInterval(timer);
    }, []);

    return (
        <div className="flex flex-col min-h-screen bg-black">
            {/* Slider Hero */}
            <section id="home" className="relative h-screen w-full overflow-hidden group">
                {SLIDES.map((slide, index) => (
                    <a
                        key={slide.id}
                        href={slide.link}
                        className={`absolute inset-0 transition-opacity duration-1000 ease-in-out ${index === currentSlide ? "opacity-100 z-10" : "opacity-0 z-0"
                            }`}
                    >
                        <div className="absolute inset-0 bg-black/20 z-10 hover:bg-black/10 transition-colors" />
                        <img
                            src={slide.image}
                            alt={slide.title}
                            className="absolute inset-0 w-full h-full object-cover grayscale brightness-90 transition-all duration-1000"
                        />
                    </a>
                ))}

                {/* Navigation Arrows */}
                <button
                    onClick={(e) => {
                        e.preventDefault();
                        setCurrentSlide((prev) => (prev - 1 + SLIDES.length) % SLIDES.length);
                    }}
                    className="absolute left-4 top-1/2 -translate-y-1/2 z-30 p-4 text-white/50 hover:text-white transition-colors duration-300 opacity-0 group-hover:opacity-100"
                    aria-label="Previous slide"
                >
                    <svg className="w-8 h-8 md:w-12 md:h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M15 19l-7-7 7-7" />
                    </svg>
                </button>
                <button
                    onClick={(e) => {
                        e.preventDefault();
                        setCurrentSlide((prev) => (prev + 1) % SLIDES.length);
                    }}
                    className="absolute right-4 top-1/2 -translate-y-1/2 z-30 p-4 text-white/50 hover:text-white transition-colors duration-300 opacity-0 group-hover:opacity-100"
                    aria-label="Next slide"
                >
                    <svg className="w-8 h-8 md:w-12 md:h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 5l7 7-7 7" />
                    </svg>
                </button>

                {/* Pagination Lines */}
                <div className="absolute bottom-16 left-1/2 -translate-x-1/2 z-30 flex gap-4">
                    {SLIDES.map((_, index) => (
                        <button
                            key={index}
                            onClick={() => setCurrentSlide(index)}
                            className={`w-12 h-[2px] transition-all duration-500 ${index === currentSlide ? "bg-white" : "bg-white/20"
                                }`}
                        />
                    ))}
                </div>
            </section>

            {/* Contact Section */}
            <section id="contact" className="bg-black py-32 px-6 border-t border-white/5">
                <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-24">
                    {/* Info */}
                    <div className="space-y-16">
                        <div className="space-y-8">
                            <div>
                                <span className="text-[10px] font-bold uppercase tracking-[0.3em] text-gray-500 block mb-2">Oficina comercial</span>
                                <p className="text-white text-xl font-extralight leading-relaxed tracking-wide">
                                    Hipólito Yrigoyen 401, Vicente Lopez,<br /> Buenos Aires
                                </p>
                            </div>
                            <div>
                                <span className="text-[10px] font-bold uppercase tracking-[0.3em] text-gray-500 block mb-2">Centro Logístico</span>
                                <p className="text-white text-xl font-extralight leading-relaxed tracking-wide">
                                    Belgrano 2624, El Talar, Buenos Aires
                                </p>
                            </div>
                        </div>
                        <div className="space-y-8">
                            <div className="space-y-2">
                                <span className="text-[10px] font-bold uppercase tracking-[0.3em] text-gray-500 block mb-2">Teléfonos</span>
                                <p className="text-white text-2xl font-extralight tracking-widest leading-none">(+549) 11 2427-4850</p>
                            </div>
                            <p className="text-gray-400 text-sm font-light tracking-wide">
                                info@carpiargentina.com
                            </p>
                        </div>
                    </div>

                    {/* Form */}
                    <form className="space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <input
                                type="text"
                                placeholder="NOMBRE"
                                className="w-full bg-transparent border-b border-white/20 p-4 text-white text-[10px] tracking-widest focus:border-white transition-all outline-none"
                            />
                            <input
                                type="email"
                                placeholder="EMAIL"
                                className="w-full bg-transparent border-b border-white/20 p-4 text-white text-[10px] tracking-widest focus:border-white transition-all outline-none"
                            />
                        </div>
                        <select className="w-full bg-transparent border-b border-white/20 p-4 text-white text-[10px] tracking-widest focus:border-white transition-all outline-none appearance-none cursor-pointer">
                            <option className="bg-black">INTERESADO EN...</option>
                            <option className="bg-black">PRODUCTOS</option>
                            <option className="bg-black">DISTRIBUIDORES</option>
                            <option className="bg-black">ADMINISTRACIÓN</option>
                        </select>
                        <textarea
                            placeholder="MENSAJE"
                            rows={4}
                            className="w-full bg-transparent border-b border-white/20 p-4 text-white text-[10px] tracking-widest focus:border-white transition-all outline-none resize-none"
                        ></textarea>
                        <div className="pt-4">
                            <button
                                type="submit"
                                className="border border-white/30 text-white px-12 py-4 text-[10px] font-bold uppercase tracking-[0.3em] hover:bg-white hover:text-black transition-all duration-500"
                            >
                                Enviar
                            </button>
                        </div>
                    </form>
                </div>
            </section>

            <Footer />

            {/* WhatsApp Button */}
            <a
                href="https://wa.me/5491124274850"
                target="_blank"
                rel="noopener noreferrer"
                title="Contactar por WhatsApp"
                className="fixed bottom-10 right-10 z-50 bg-[#25D366] p-4 rounded-full shadow-2xl hover:scale-110 transition-all duration-300 group"
            >
                <svg className="w-5 h-5 text-white fill-current group-hover:rotate-12 transition-transform" viewBox="0 0 24 24">
                    <path d="M12.031 6.172c-3.181 0-5.767 2.586-5.768 5.766-.001 1.298.38 2.27 1.025 3.207l-.694 2.547 2.628-.69c.906.522 1.812.8 2.812.8 3.178 0 5.767-2.587 5.768-5.766 0-3.181-2.587-5.764-5.767-5.764zm3.336 8.092c-.144.405-.838.74-1.15.795-.295.053-.665.088-1.077-.044-.265-.084-.66-.217-1.127-.417-1.996-.85-3.275-2.887-3.375-3.021-.1-.133-.733-.977-.733-1.87 0-.894.468-1.334.635-1.514.167-.18.364-.226.486-.226.121 0 .242 0 .346.005.11.004.258-.04.404.316.145.356.5 1.22.545 1.31.045.09.075.195.015.315-.06.12-.09.195-.18.299-.09.105-.19.232-.27.31-.09.09-.184.187-.08.366.105.18.468.775 1.005 1.25.692.613 1.275.803 1.455.893.18.09.285.075.39-.045.105-.12.45-.525.57-.704.12-.18.24-.15.405-.09.165.06 1.045.493 1.225.584.18.09.3.135.345.21.045.075.045.435-.1.84z" />
                </svg>
            </a>
        </div>
    );
}
