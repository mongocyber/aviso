import {useEffect, type ReactNode} from "react";

type InertHTMLElement = HTMLElement & {inert?: boolean};

function getSidebarPanels(items: Element): InertHTMLElement[] {
  return Array.from(items.children).filter(
    (child): child is InertHTMLElement =>
      child instanceof HTMLElement &&
      child.classList.contains("theme-layout-navbar-sidebar-panel") &&
      child.classList.contains("navbar-sidebar__item")
  );
}

function syncDocsMobileNavbarInert() {
  document
    .querySelectorAll(".navbar-sidebar__items.navbar-sidebar__items--show-secondary")
    .forEach((items) => {
      const [primaryPanel, secondaryPanel] = getSidebarPanels(items);
      const isDocsSecondaryMenu = secondaryPanel?.querySelector(".theme-doc-sidebar-menu");

      if (!primaryPanel || !secondaryPanel || !isDocsSecondaryMenu) {
        return;
      }

      if (primaryPanel.hasAttribute("inert") || primaryPanel.inert) {
        primaryPanel.inert = false;
        primaryPanel.removeAttribute("inert");
      }

      if (!secondaryPanel.hasAttribute("inert") || !secondaryPanel.inert) {
        secondaryPanel.inert = true;
        secondaryPanel.setAttribute("inert", "");
      }
    });
}

export default function Root({children}: {children: ReactNode}): ReactNode {
  useEffect(() => {
    syncDocsMobileNavbarInert();

    const observer = new MutationObserver(syncDocsMobileNavbarInert);
    observer.observe(document.body, {
      attributeFilter: ["class", "inert"],
      attributes: true,
      childList: true,
      subtree: true
    });

    return () => observer.disconnect();
  }, []);

  return <>{children}</>;
}
