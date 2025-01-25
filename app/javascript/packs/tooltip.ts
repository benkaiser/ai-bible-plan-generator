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
  if (!tooltipTriggerEl.hasAttribute('data-processed')) {
    new Tooltip(tooltipTriggerEl);
    tooltipTriggerEl.setAttribute('data-processed', 'true');
  }
});

var dropdownElementList = [].slice.call(document.querySelectorAll('.dropdown-toggle'));
dropdownElementList.map(function (dropdownToggleEl) {
  if (!dropdownToggleEl.hasAttribute('data-processed')) {
    new Dropdown(dropdownToggleEl);
    dropdownToggleEl.setAttribute('data-processed', 'true');
  }
});

// MutationObserver to handle dynamically added elements
const observer = new MutationObserver(function (mutationsList) {
  for (const mutation of mutationsList) {
    if (mutation.type === 'childList') {
      mutation.addedNodes.forEach((node) => {
        if (node.nodeType === Node.ELEMENT_NODE) {
          const element = node as Element;
          if (element.matches('[data-bs-toggle="tooltip"]') && !element.hasAttribute('data-processed')) {
            new Tooltip(element);
            element.setAttribute('data-processed', 'true');
          }
          if (element.matches('.dropdown-toggle') && !element.hasAttribute('data-processed')) {
            new Dropdown(element);
            element.setAttribute('data-processed', 'true');
          }
        }
      });
    }
  }
});

// Start observing the document for dynamically added elements
observer.observe(document.body, { childList: true, subtree: true });