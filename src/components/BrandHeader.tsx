import { APP_TITLE } from '../lib/helpers';

interface Props {
  logo?: string | null;
  small?: boolean;
}

export function BrandHeader({ logo, small = false }: Props) {
  return (
    <header className={`brand-header ${small ? 'brand-header--small' : ''}`}>
      <img src={logo || '/mezzopedia-logo.jpg'} alt="MEZZOPEDIA" className="brand-logo" />
      <div>
        <p className="eyebrow">National Mathematics Contest</p>
        <h1>{APP_TITLE}</h1>
        <p className="subtle">Registration lookup and management portal</p>
      </div>
    </header>
  );
}
