import { createPopper } from '@popperjs/core';
import { Tooltip, Dropdown } from 'bootstrap';

declare global {
  interface Window {
    createPopper: typeof createPopper;
  }
}

window.createPopper = createPopper;

// Function to initialize MutationObserver
function initializeObserverAndInitItems() {
  var tooltipTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="tooltip"]'))
  tooltipTriggerList.map(function (tooltipTriggerEl) {
    Tooltip.getOrCreateInstance(tooltipTriggerEl);
  });

  var dropdownElementList = [].slice.call(document.querySelectorAll('.dropdown-toggle'));
  dropdownElementList.map(function (dropdownToggleEl) {
    Dropdown.getOrCreateInstance(dropdownToggleEl);
  });

  const observer = new MutationObserver(function (mutationsList) {
    for (const mutation of mutationsList) {
      if (mutation.type === 'childList') {
        mutation.addedNodes.forEach((node) => {
          if (node.nodeType === Node.ELEMENT_NODE) {
            const element = node as Element;
            element.querySelectorAll('[data-bs-toggle="tooltip"]').forEach((tooltipEl) => {
              Tooltip.getOrCreateInstance(tooltipEl as Element);
            });
            element.querySelectorAll('.dropdown-toggle').forEach((dropdownEl) => {
              Dropdown.getOrCreateInstance(dropdownEl as Element);
            });
          }
        });
      }
    }
  });

  // Start observing the document for dynamically added elements
  observer.observe(document.body, { childList: true, subtree: true });
}

// Initialize observer on page load
initializeObserverAndInitItems();

// Reinitialize observer on Turbo navigation
document.addEventListener('turbo:load', function() {
  initializeObserverAndInitItems();
});