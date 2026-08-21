import { useT } from '@/i18n/use-t';

export function Footer() {
  const currentYear = new Date().getFullYear();
  const t = useT();

  return (
    <footer className="footer">
      <div className="container">
        <div className="flex flex-col md:flex-row justify-center md:justify-between items-center gap-3 py-5">
          <div className="flex order-2 md:order-1 gap-2 font-normal text-sm">
            <span className="text-muted-foreground">{currentYear} &copy;</span>
            <a
              href="https://keenthemes.com"
              target="_blank"
              rel="noreferrer"
              className="text-secondary-foreground hover:text-primary"
            >
              Keenthemes Inc.
            </a>
          </div>
          <nav className="flex order-1 md:order-2 gap-4 font-normal text-sm text-muted-foreground">
            <a
              href="https://docs.keenthemes.com/metronic-react"
              target="_blank"
              rel="noreferrer"
              className="hover:text-primary"
            >
              {t('Docs')}
            </a>
            <a
              href="https://devs.keenthemes.com"
              target="_blank"
              rel="noreferrer"
              className="hover:text-primary"
            >
              {t('Support')}
            </a>
          </nav>
        </div>
      </div>
    </footer>
  );
}
