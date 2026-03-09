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

        </div>
    );
}
