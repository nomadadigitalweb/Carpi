import BrandPage from "@/components/BrandPage";

export default function BrillatoPage() {
    return (
        <BrandPage
            name="Brillato"
            logo="/images/prod/brilatto/logo.png"
            heroText="superficie extra brillo"
            description="Es una superficie EXTRA BRILLO, muy suave al tacto y con reparabilidad de micro arañazos por pulimiento ideal para aplicaciones en superficie verticales."
            heroImage="/images/prod/brilatto/brilatto_01.jpg"
            secondaryText="Explore el mundo de las superficies brillantes"
            secondaryImage="/images/prod/brilatto/brilatto_02.jpg"
            properties={[
                { image: "/images/prod/brilatto/p1.png", text: "Alta refracción de luz, presentan una excelente profundidad óptica" },
                { image: "/images/prod/brilatto/p2.png", text: "Suavidad al tacto" },
                { image: "/images/prod/brilatto/p5.png", text: "Protección UV" },
                { image: "/images/prod/brilatto/p4.png", text: "Reparabilidad por pulimiento de micro arañazos en la superficie" },
            ]}
            advantages={[
                { title: "USOS", text: "Sirve para uso vertical, proporciona un excelente acabado para frentes de muebles y revestimientos de paredes" },
                { title: "PROTECCIÓN UV", text: "Al menos 20 años de estabilidad UV en aplicaciones interiores" },
                { title: "HERRAMIENTAS", text: "Se puede procesar con cualquier tipo de herramienta" },
            ]}
            extraContent="<p>Experimenta un mundo de luces e imágenes que se reflejan en su superficie ultra brillate jamas vista en materiales tradicionales. Brillato se presenta en una paleta de colores especialmente seleccionada para el mercado Argentino acompañando las tendencias y la moda Italiana.</p><p>Ademas de su estética única, cuenta en el desarrollo de su estructura con un espesor de material acrílico superior a cualquiera que se le parezca en el mercado mundial, lo que posibilita tener una reflexión extraordinaria, logrando que sea fuerte y resistente a manchas y humedades.</p>"
            extraImage="/images/prod/brilatto/x.jpg"
            gallery={[
                "/images/prod/brilatto/01.jpg", "/images/prod/brilatto/02.jpg", "/images/prod/brilatto/03.jpg", "/images/prod/brilatto/04.jpg",
                "/images/prod/brilatto/05.jpg", "/images/prod/brilatto/06.jpg", "/images/prod/brilatto/07.jpg", "/images/prod/brilatto/08.jpg",
            ]}
            sustainability={{
                title: "Colores que brillan",
                text: "Los colores varían en tonalidades de blanco, pasando por tonos grises, continuando por tonos beige cálidos hasta llegar a colores más vivos y vibrantes",
                image: "/images/prod/brilatto/brilatto_03.jpg"
            }}
            collection={[
                { image: "/images/prod/brilatto/c1.jpg", name: "0043 BIANCO" },
                { image: "/images/prod/brilatto/c2.jpg", name: "0028 GRIGIO" },
                { image: "/images/prod/brilatto/c3.jpg", name: "0120 NERO METALLIZZATO" },
                { image: "/images/prod/brilatto/c4.jpg", name: "0083 GRAFITE" },
                { image: "/images/prod/brilatto/c5.jpg", name: "010 TORTORA" },
                { image: "/images/prod/brilatto/c6.jpg", name: "0024 BEIGE" },
            ]}
            techSpecs={[
                { label: "DIMENSIÓN", value: "2750×1220 mm" },
                { label: "ESPESOR", value: "17,8 mm" },
                { label: "COMPOSICIÓN", value: "17,8 mm (1,4 METACRILATO + MDF 15 mm + 1,4 METACRILATO )" },
                { label: "CANTO", value: "ABS de 1 mm de espesor, con la misma tonalidad de la superficie" },
                { label: "PROTECCIÓN", value: "Viene con una lamina de protección UV en la superficie" },
                { label: "LIMPIEZA", value: "Se puede limpiar con cualquier tipo de producto (Ej: alcohol, cera para muebles, cera para autos, etc)" },
                { label: "USOS", value: "Indicado para ambientes internos, para superficie verticales (Ej: puertas, paneles, frente de cajones, etc.)" },
                { label: "CONTRAINDICACIONES", value: "No esta indicado para pisos ni superficies horizontales" },
            ]}
        />
    );
}
