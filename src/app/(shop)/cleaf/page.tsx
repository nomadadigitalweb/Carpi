import BrandPage from "@/components/BrandPage";

export default function CleafPage() {
    return (
        <BrandPage
            name="Cleaf"
            logo="/images/prod/cleaf/logo.png"
            heroText="superficie texturada"
            description="CLEAF es una empresa italiana de referencia mundial. Produce soluciones innovadoras basada en desarrollo de tecnología y tendencia alcanzando productos de calidad mundial. Con aplicaciones en la industria, la arquitectura y el diseño de productos."
            heroImage="/images/prod/cleaf/cleaf_01.jpg"
            secondaryText="el minimalismo italiano mas puro"
            secondaryImage="/images/prod/cleaf/cleaf_02.jpg"
            properties={[
                { image: "/images/prod/cleaf/p1.png", text: "Tecnología testada microbiológicamente según ISO 22196: 2011" },
                { image: "/images/prod/cleaf/p2.png", text: "Texturas que nos hace sentir la naturaleza al tacto" },
                { image: "/images/prod/cleaf/p3.png", text: "Huella del ADN italiano" },
                { image: "/images/prod/cleaf/p4.png", text: "Alta refracción de luz, presentan una excelente profundidad óptica" },
            ]}
            advantages={[
                { title: "USOS", text: "Sirve para uso vertical, proporciona un excelente acabado para frentes de muebles y revestimientos de paredes" },
                { title: "TEXTURA", text: "El Sincronismo en la textura y la profundidad que logra CLEAF lo hacen único en el mercado de laminados" },
                { title: "HERRAMIENTAS", text: "Se puede procesar con cualquier tipo de herramienta" },
            ]}
            extraContent="<p>La colección Cleaf destaca la investigación innovadora, estética y táctil sobre superficies. Recuerda la capacidad del Made in Italy para interpretar las necesidades del mobiliario contemporáneo y los ambientes más inspiradores.</p><p>La flexibilidad del modelo de producción interno de Cleaf permite la experimentación continua transfiriendo sensaciones táctiles y visuales sorprendentes a las superficies de recubrimiento.</p>"
            extraImage="/images/prod/cleaf/x.jpg"
            gallery={[
                "/images/prod/cleaf/01.jpg", "/images/prod/cleaf/02.jpg", "/images/prod/cleaf/03.jpg", "/images/prod/cleaf/04.jpg",
                "/images/prod/cleaf/05.jpg", "/images/prod/cleaf/06.jpg", "/images/prod/cleaf/07.jpg", "/images/prod/cleaf/08.jpg",
            ]}
            awards={[
                "PREMIO INTERZUM 2019 por MOSAIC",
                "PREMIO INTERZUM 2015 para QUIDYL",
                "PREMIO INTERZUM 2013 por FUSIÓN",
                "PREMIO INTERZUM 2011 para YOSEMITE, SPIGATO y NADIR",
                "PREMIO INTERZUM 2009 para SHANGHAI y SURF",
            ]}
            sustainability={{
                title: "Superficies antibacterianas",
                text: "CLEAF lo logra, gracias a una tecnología testada microbiológicamente según ISO 22196: 2011, reduce la carga bacteriana hasta un 99,9% en 24 horas.",
                image: "/images/prod/cleaf/cleaf_03.jpg",
                sections: [
                    { title: "LIMPIEZA", text: "Una adecuada limpieza de superficies es la práctica más eficaz para prevenir la proliferación de bacterias. La colección Cleaf puede aportar un tratamiento antibacteriano." }
                ]
            }}
            collection={[
                { image: "/images/prod/cleaf/c1.jpg", name: "U129 | CHEOPE / NERO" },
                { image: "/images/prod/cleaf/c2.jpg", name: "B073 | CHEOPE / TOTAL WHITE" },
                { image: "/images/prod/cleaf/c3.jpg", name: "S072 | SHERWOOD / KENSINGTONE PARK" },
            ]}
            techSpecs={[
                { label: "ORIGEN", value: "Italia" },
                { label: "USOS", value: "Vertical (Muebles, Revestimientos)" },
                { label: "CERTIFICACIÓN", value: "ISO 22196: 2011 (Antibacteriano)" },
            ]}
        />
    );
}
