import '@hotwired/turbo-rails';

const registerServiceWorker = async () => {
  if ("serviceWorker" in navigator) {
    try {
      const registration = await navigator.serviceWorker.register("/service-worker.js", {
        scope: "/",
      });
      if (registration.installing) {
        console.log("Service worker installing");
      } else if (registration.waiting) {
        console.log("Service worker installed");
      } else if (registration.active) {
        console.log("Service worker active");
      }
    } catch (error) {
      console.error(`Registration failed with ${error}`);
    }
  }
};

registerServiceWorker();

function onLoad() {
  const themeToggleButton = document.getElementById('theme-toggle');
  const themeIcon = document.getElementById('theme-icon');

  // Function to update the icon based on the current theme
  function updateIcon() {
    const currentTheme = localStorage.getItem('theme') || 'light';
    document.documentElement.setAttribute('data-bs-theme', currentTheme);
    if (currentTheme === 'dark') {
      themeIcon.classList.remove('bi-brightness-high-fill');
      themeIcon.classList.add('bi-moon-fill');
    } else {
      themeIcon.classList.remove('bi-moon-fill');
      themeIcon.classList.add('bi-brightness-high-fill');
    }
  }

  // Toggle theme and update icon
  themeToggleButton.addEventListener('click', function() {
    const currentTheme = localStorage.getItem('theme') || 'light';
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
    localStorage.setItem('theme', newTheme);
    updateIcon();
  });

  // Initial icon update on page load
  updateIcon();
}

document.addEventListener("load", onLoad);
document.addEventListener("turbo:load", onLoad);
