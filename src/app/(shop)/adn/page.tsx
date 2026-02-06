import Footer from "@/components/Footer";

export default function AdnPage() {
    return (
        <div className="bg-black min-h-screen pt-24 text-white">
            <div className="max-w-7xl mx-auto px-6 py-20">
                <div className="grid grid-cols-1 lg:grid-cols-[1fr_2fr] gap-12">
                    {/* Sidebar */}
                    <div>
                        <h1 className="text-2xl md:text-3xl font-semibold uppercase tracking-widest text-gray-400">
                            <span className="text-gray-600 mr-2">—</span> ADN italiano
                        </h1>
                    </div>

                    {/* Content */}
                    <div className="space-y-8">
                        <img
                            src="/images/italia.jpg"
                            alt="Italia"
                            className="w-full h-auto grayscale hover:grayscale-0 transition-all duration-700"
                        />
                        <div className="space-y-6 text-gray-300 font-light leading-relaxed text-lg">
                            <p>
                                Carpi es una empresa especializada en superficies de alta prestación, ofrecemos los últimos avances en tecnología y diseño para el sector mueblero y de la construcción.
                            </p>
                            <p>
                                Nuestros materiales son los más premiados del mercado a nivel mundial, convirtiendo cada ambiente en una verdadera experiencia de lujo y bienestar.
                            </p>
                        </div>
                    </div>
                </div>
            </div>
            <Footer />
        </div>
    );
}
