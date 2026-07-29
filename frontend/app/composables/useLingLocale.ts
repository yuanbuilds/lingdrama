import { computed } from 'vue'
import { getLingLocale, LING_LOCALE_KEY, type LingLocale } from '~/utils/lingI18n'

export function useLingLocale() {
  const locale = useState<LingLocale>('lingdrama-locale', () => getLingLocale())

  const localeTitle = computed(() => (
    locale.value === 'zh-CN' ? 'Switch to English' : '切换到中文'
  ))

  function setLocale(next: LingLocale) {
    locale.value = next
    if (!import.meta.client) return
    localStorage.setItem(LING_LOCALE_KEY, next)
    document.documentElement.lang = next
    window.location.reload()
  }

  function toggleLocale() {
    setLocale(locale.value === 'zh-CN' ? 'en-US' : 'zh-CN')
  }

  return { locale, localeTitle, setLocale, toggleLocale }
}
