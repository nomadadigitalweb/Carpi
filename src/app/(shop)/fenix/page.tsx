import BrandPage from "@/components/BrandPage";

export default function FenixPage() {
    return (
        <BrandPage
            name="Fenix"
            logo="/images/prod/fenix/logo.png"
            heroText="superficie extra mate"
            description="Es una superficie súper mate con NANOTECNOLOGIA, muy suave al tacto y con reparabilidad térmica. ideal para aplicaciones en superficies horizontales y verticales"
            heroImage="/images/prod/fenix/fenix_01.jpg"
            secondaryText="Innovacion tecnologica en diseño interior"
            secondaryImage="/images/prod/fenix/fenix_02.jpg"
            properties={[
                { image: "/images/prod/fenix/p1.png", text: "Baja reflexión de la luz, superficie extremadamente opaca" },
                { image: "/images/prod/fenix/p2.png", text: "Suavidad Al tacto" },
                { image: "/images/prod/fenix/p3.png", text: "Anti-Huella" },
                { image: "/images/prod/fenix/p4.png", text: "Reparabilidad térmica de micro arañazos en la superficie" },
            ]}
            advantages={[
                { title: "USOS", text: "Sirve tanto para uso vertical como horizontal, lo que proporciona una versatilidad en el diseño, donde el limite en el diseño es tu imaginación" },
                { title: "PROTECCIÓN UV", text: "Al menos 20 años de estabilidad UV en aplicaciones interiores" },
                { title: "HERRAMIENTAS", text: "Se puede procesar con cualquier tipo de herramienta." },
            ]}
            extraContent="<p>FENIX también es hidrorrepelente, higiénico y resistente al moho, perfectamente apto para el contacto con alimentos y fácil de limpiar. FENIX cuenta con estas características al someterse a una serie de procesos, que incluyen un revestimiento multicapa y el uso de resinas acrílicas de nueva generación, endurecidas y fijadas con el proceso Electron Beam Curing. Con baja reflectividad lumínica, su superficie es extremadamente opaca, suave al tacto y antihuellas.</p><p>Los materiales FENIX son muy resistentes a los arañazos, a la abrasión, al calor seco, a los disolventes ácidos y a los reactivos domésticos. La recuperación térmica de microarañazos superficiales también es posible. Las superficies FENIX tienen una capa externa única no porosa, que permite que el material permanezca limpio con unos sencillos métodos de cuidado y limpieza diarios. También son aptas para el contacto con comida</p>"
            extraImage="/images/prod/fenix/x.jpg"
            gallery={[
                "/images/prod/fenix/01.jpg", "/images/prod/fenix/02.jpg", "/images/prod/fenix/03.jpg", "/images/prod/fenix/04.jpg",
                "/images/prod/fenix/05.jpg", "/images/prod/fenix/06.jpg", "/images/prod/fenix/07.jpg", "/images/prod/fenix/08.jpg",
            ]}
            awards={[
                "Interzum 'High Product Quality' award Germany, 2019",
                "Red Dot Award Product Design Germany, 2019",
                "Honourable Mention ADI Compasso d’Oro Italy, 2016",
                "Iconic Awards 'Product Best of the Best' Germany, 2016",
                "Interzum 'Best of the Best' award Germany, 2015",
                "Archidex 'New product' award Malaysia, 2015",
                "Dwell on Design 'Best Design Material' award United States, 2014",
                "MaterialPreis 'First Prize Category' award Germany, 2014",
            ]}
            sustainability={{
                title: "Certificado y Sostenibilidad",
                text: "Fenix es un material duradero que ha obtenido varios certificados relacionados con aplicaciones de diseño interior",
                image: "/images/prod/fenix/fenix_03.jpg",
                sections: [
                    { title: "SOSTENIBILIDAD", text: "FENIX es un material duradero. Su durabilidad es una importante cualidad que hace que sea especialmente atractivo desde un punto de vista medioambiental. Vida prolongada significa menos residuos y un ahorro en los recursos." },
                    { title: "DESECHOS Y RECICLAJE", text: "FENIX es un material clasificado como no peligroso. Los desechos como resultados de cualquier proceso deben efectuarse según la legislación actual." }
                ]
            }}
            collection={[
                { image: "/images/prod/fenix/c1.jpg", name: "0451 BIANCO ALASKA" },
                { image: "/images/prod/fenix/c2.jpg", name: "1443 GRIGIO EFESO" },
                { image: "/images/prod/fenix/c3.jpg", name: "0631 NERO INGO" },
                { image: "/images/prod/fenix/c4.jpg", name: "1066 GRIGIO LONDRA" },
                { image: "/images/prod/fenix/c5.jpg", name: "1401 CASTORO OTTAWA" },
                { image: "/images/prod/fenix/c6.jpg", name: "1162 BEIGE LUXOR" },
            ]}
            techSpecs={[
                { label: "DIMENSIÓN", value: "3050×1300 mm o 4200×1600 (consultar disponibilidad en 4200 x 1600)" },
                { label: "ESPESOR MACIZO", value: "10 mm (full color) – (consultar disponibilidad de cores)" },
                { label: "ESPESOR APLICADO EN MDF", value: "17,9 mm (0,9 lamina FENIX + MDF 16 mm + balanceamiento de 1,0 mm )" },
                { label: "CANTO", value: "ABS de 1 mm de espesor, con la misma tonalidad de la superficie." },
                { label: "PEGADO", value: "Tanto el FENIX sobre MDF como el FENIX de 10 mm (full color) pode ser pegado con Silicona" },
                { label: "LIMPIEZA", value: "Se puede limpiar com cualquier tipo de producto (Ej: alcohol, diluyente, etc)." },
                { label: "USOS", value: "Indicado para ambientes internos, para superficie horizontales de alto impacto (Ej: mesa, mesadas de cocinas, mesas de escritorio, sillas, etc.) y también verticales." },
                { label: "CONTRAINDICACIONES", value: "No esta indicado para pisos. El único material indicado para ambiente externo es el 10 mm (full color), no tiene problemas de contacto con el agua de forma constante." },
                { label: "RESISTENCIA", value: "Este material posee una increíble resistencia a las rayones, posee NANOTECNOLOGIA que posibilita la reparación de rayaduras superficiales a través del calor." },
            ]}
        />
    );
}
