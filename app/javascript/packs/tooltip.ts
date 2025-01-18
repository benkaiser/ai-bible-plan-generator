import { createPopper } from '@popperjs/core';
import { Tooltip, Dropdown } from 'bootstrap';

declare global {
  interface Window {
    createPopper: typeof createPopper;
  }
}

window.createPopper = createPopper;

var tooltipTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="tooltip"]'))
tooltipTriggerList.map(function (tooltipTriggerEl) {
  return new Tooltip(tooltipTriggerEl)
});

var dropdownElementList = [].slice.call(document.querySelectorAll('.dropdown-toggle'))
dropdownElementList.map(function (dropdownToggleEl) {
  return new Dropdown(dropdownToggleEl)
});

// MutationObserver to handle dynamically added elements
const observer = new MutationObserver(function (mutationsList) {
  for (const mutation of mutationsList) {
    if (mutation.type === 'childList') {
      mutation.addedNodes.forEach((node) => {
        if (node.nodeType === Node.ELEMENT_NODE) {
          const element = node as Element;
          if (element.matches('[data-bs-toggle="tooltip"]')) {
            new Tooltip(element);
          }
          element.querySelectorAll('[data-bs-toggle="tooltip"]').forEach((tooltipElement) => {
            new Tooltip(tooltipElement as Element);
          });
        }
      });
    }
  }
});

// Start observing the document body for added nodes
observer.observe(document.body, { childList: true, subtree: true });
