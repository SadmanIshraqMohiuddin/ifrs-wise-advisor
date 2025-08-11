import IFRSAdvisor from "@/components/IFRSAdvisor";

const Index = () => {
  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-10 border-b bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto py-4">
          <nav className="flex items-center justify-between">
            <a href="/" className="text-lg font-semibold">IFRS Wise Advisor</a>
            <a href="#main" className="text-sm text-muted-foreground underline underline-offset-4">Skip to content</a>
          </nav>
        </div>
      </header>
      <main id="main" className="container mx-auto px-4 py-8">
        <IFRSAdvisor />
      </main>
      <footer className="border-t mt-12">
        <div className="container mx-auto px-4 py-6 text-center text-sm text-muted-foreground">
          © {new Date().getFullYear()} IFRS Wise Advisor • Guidance helper, not a substitute for professional judgment.
        </div>
      </footer>
    </div>
  );
};

export default Index;
