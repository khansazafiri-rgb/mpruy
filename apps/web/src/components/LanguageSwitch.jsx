import { Languages } from 'lucide-react';
import { useLanguage } from '@/i18n';
import { ENGLISH_ENABLED } from '@/i18n/store';

export default function LanguageSwitch() {
  const { language, setLanguage } = useLanguage();
  if (!ENGLISH_ENABLED) return null;
  return (
    <div className="language-switch" role="group" aria-label={language === 'en' ? 'Website language' : 'Bahasa seluruh situs'}>
      <Languages size={16} aria-hidden="true" />
      <button type="button" lang="id" aria-label="Bahasa Indonesia" aria-pressed={language === 'id'} onClick={() => setLanguage('id')}>ID</button>
      <button type="button" lang="en" aria-label="English" aria-pressed={language === 'en'} onClick={() => setLanguage('en')}>EN</button>
    </div>
  );
}
