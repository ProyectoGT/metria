"use client";

import { useEffect, useMemo } from "react";
import { usePathname } from "next/navigation";
import { defaultLocale, type Locale } from "./config";
import { legacyPhrases } from "./legacy-phrases";
import { useI18n } from "./context";
import { translateVisibleText } from "./translate-text";

const textNodeSelector = "script,style,textarea,code,pre,[data-i18n-ignore]";
const localizableAttributes = ["placeholder", "aria-label", "title"] as const;
const originalText = new WeakMap<Text, string>();
const originalAttributes = new WeakMap<Element, Partial<Record<(typeof localizableAttributes)[number], string>>>();

function normalizeText(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

function translateValue(value: string, map: Record<string, string>) {
  const normalized = normalizeText(value);
  if (!normalized) return value;
  return map[normalized] ?? translateVisibleText(value);
}

function translateElementTree(root: ParentNode, locale: Locale) {
  const map = legacyPhrases[locale];

  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
    acceptNode(node) {
      const parent = node.parentElement;
      if (!parent || parent.closest(textNodeSelector)) return NodeFilter.FILTER_REJECT;
      return normalizeText(node.nodeValue ?? "") ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT;
    },
  });

  const textNodes: Text[] = [];
  while (walker.nextNode()) textNodes.push(walker.currentNode as Text);

  for (const node of textNodes) {
    const current = node.nodeValue ?? "";
    const original = originalText.get(node) ?? current;
    originalText.set(node, original);
    const translated = locale === defaultLocale ? original : translateValue(original, map);
    if (translated !== current) node.nodeValue = original.replace(normalizeText(original), translated);
  }

  const elements = root instanceof Element ? [root, ...Array.from(root.querySelectorAll("*"))] : Array.from(root.querySelectorAll("*"));
  for (const element of elements) {
    if (element.closest(textNodeSelector)) continue;
    for (const attr of localizableAttributes) {
      const value = element.getAttribute(attr);
      if (!value) continue;
      const originals = originalAttributes.get(element) ?? {};
      const original = originals[attr] ?? value;
      originals[attr] = original;
      originalAttributes.set(element, originals);
      const translated = locale === defaultLocale ? original : translateValue(original, map);
      if (translated !== value) element.setAttribute(attr, translated);
    }
  }
}

export default function DomLocalizer() {
  const { locale } = useI18n();
  const pathname = usePathname();
  const observerOptions = useMemo<MutationObserverInit>(() => ({
    childList: true,
    subtree: true,
    characterData: true,
    attributes: true,
    attributeFilter: [...localizableAttributes],
  }), []);

  useEffect(() => {
    translateElementTree(document.body, locale);
    const observer = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        if (mutation.type === "childList") {
          mutation.addedNodes.forEach((node) => {
            if (node.nodeType === Node.ELEMENT_NODE || node.nodeType === Node.TEXT_NODE) {
              translateElementTree(node.parentNode ?? document.body, locale);
            }
          });
        } else if (mutation.target.parentNode) {
          translateElementTree(mutation.target.parentNode, locale);
        }
      }
    });
    observer.observe(document.body, observerOptions);
    return () => observer.disconnect();
  }, [locale, observerOptions, pathname]);

  return null;
}
