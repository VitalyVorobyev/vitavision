export default function Footer() {
    return (
        <footer className="py-8 border-t border-border mt-auto">
            <div className="max-w-[800px] mx-auto px-4 flex flex-col md:flex-row justify-between items-center text-sm text-muted-foreground">
                <p>© {new Date().getFullYear()} Vitaly Vorobyev. All rights reserved.</p>
                <div className="flex space-x-4 mt-4 md:mt-0">
                    <a href="#" className="hover:text-foreground transition-colors">CV</a>
                    <a href="#" className="hover:text-foreground transition-colors">Twitter</a>
                    <a href="#" className="hover:text-foreground transition-colors">LinkedIn</a>
                </div>
            </div>
        </footer>
    );
}
