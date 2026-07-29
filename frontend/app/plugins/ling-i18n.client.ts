import { getLingLocale, translateText } from '~/utils/lingI18n'

const SKIP_TEXT_TAGS = new Set(['SCRIPT', 'STYLE', 'TEXTAREA', 'INPUT', 'CODE', 'PRE'])
const TRANSLATED_ATTRIBUTES = ['alt', 'aria-label', 'placeholder', 'title'] as const

function shouldSkipText(node: Node): boolean {
  const parent = node.parentElement
  if (!parent) return true
  return SKIP_TEXT_TAGS.has(parent.tagName) || Boolean(parent.closest('[data-no-translate], [contenteditable="true"]'))
}

function translateTextNode(node: Node) {
  if (shouldSkipText(node)) return
  const current = node.nodeValue || ''
  const translated = translateText(current, 'en-US')
  if (translated !== current) node.nodeValue = translated
}

function translateAttributes(element: Element) {
  for (const name of TRANSLATED_ATTRIBUTES) {
    const current = element.getAttribute(name)
    if (!current) continue
    const translated = translateText(current, 'en-US')
    if (translated !== current) element.setAttribute(name, translated)
  }
}

function translateTree(root: Node) {
  if (root.nodeType === Node.TEXT_NODE) {
    translateTextNode(root)
    return
  }
  if (!(root instanceof Element) && !(root instanceof DocumentFragment)) return
  if (root instanceof Element) translateAttributes(root)

  const walker = document.createTreeWalker(root, NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_TEXT)
  let node = walker.nextNode()
  while (node) {
    if (node.nodeType === Node.TEXT_NODE) translateTextNode(node)
    else if (node instanceof Element) translateAttributes(node)
    node = walker.nextNode()
  }
}

export default defineNuxtPlugin((nuxtApp) => {
  const locale = getLingLocale()
  document.documentElement.lang = locale
  if (locale !== 'en-US') return

  const nativeConfirm = window.confirm.bind(window)
  window.confirm = (message?: string) => nativeConfirm(translateText(String(message || ''), 'en-US'))

  let observer: MutationObserver | undefined
  nuxtApp.hook('app:mounted', () => {
    translateTree(document.body)
    observer = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        if (mutation.type === 'characterData') translateTextNode(mutation.target)
        if (mutation.type === 'attributes' && mutation.target instanceof Element) translateAttributes(mutation.target)
        for (const node of mutation.addedNodes) translateTree(node)
      }
    })
    observer.observe(document.body, {
      subtree: true,
      childList: true,
      characterData: true,
      attributes: true,
      attributeFilter: [...TRANSLATED_ATTRIBUTES],
    })
  })

  nuxtApp.hook('app:beforeUnmount', () => observer?.disconnect())
})
