export default function Footer() {
    return (
        <footer className="bg-black border-t border-white/10 py-12 px-6">
            <div className="max-w-7xl mx-auto flex flex-col items-center gap-8">
                <a href="/">
                    <img src="/images/carpi-logo-footer.png" alt="carpi argentina" className="h-12 w-auto" />
                </a>
                <span className="text-[10px] text-gray-500 uppercase tracking-[0.2em] text-center">
                    © 2020 CARPI ARGENTINA TODOS LOS DERECHOS RESERVADOS
                </span>
                <div className="flex gap-6">
                    <a href="mailto:info@carpiargentina.com" className="text-white hover:text-gray-400 transition-colors" title="Email">
                        <i className="fa fa-envelope text-xl"></i>
                    </a>
                    <a href="https://www.instagram.com/carpi.argentina/" target="_blank" rel="noopener noreferrer" className="text-white hover:text-gray-400 transition-colors" title="Instagram">
                        <i className="fa fa-instagram text-xl"></i>
                    </a>
                    <a href="https://www.linkedin.com/company/carpi-argentina/" target="_blank" rel="noopener noreferrer" className="text-white hover:text-gray-400 transition-colors" title="LinkedIn">
                        <i className="fa fa-linkedin text-xl"></i>
                    </a>
                </div>
            </div>
        </footer>
    );
}
