import { confetti } from "@tsparticles/confetti";
import PWAInstall from '@khmyznikov/pwa-install/react-legacy';
import { h, render } from "preact";
import { useRef } from "preact/hooks";

declare global {
  interface Window {
    flash: [string, string][];
    defferedPromptEvent: any;
  }
}

const didComplete = window.flash?.some(item => item[1].includes('You finished the plan'));

if (didComplete) {
  confetti({
    spread: 360,
    particleCount: 400,
    origin: { y: 0.6 }
  })
}

function addNavbarInstall(beforeInstallPromptEvent: any) {
  const navbar = document.getElementById('app-navbar');
  if (navbar) {
    let installButton = document.getElementById('install-pwa');
    if (!installButton) {
      const li = document.createElement('li');
      li.className = 'nav-item';
      li.innerHTML = `<a class="nav-link" href="#" id="install-pwa"><i class="bi bi-download pe-1"></i> Install</a>`;
      navbar.prepend(li);
      installButton = document.getElementById('install-pwa');
    }
    if (installButton) {
      installButton.addEventListener('click', (event) => {
        beforeInstallPromptEvent.prompt();
      });
    }
  }
}

function PWAInstallContainer() {
  const pwaInstallRef = useRef(null);

  return (
    <PWAInstall
      ref={pwaInstallRef}
      name={"AI Bible Plan"}
      icon={"/icon.png"}
      useLocalStorage={true}
      onPwaInstallAvailableEvent={(event) => {
        if (localStorage.getItem('pwa-hide-install') !== 'true') {
          pwaInstallRef.current?.showDialog();
        } else {
          addNavbarInstall(window.defferedPromptEvent);
        }
      }}
      onPwaUserChoiceResultEvent={(event) => {
        console.log('onPwaUserChoiceResultEvent', event);
        if (event.detail.message === 'dismissed') {
          localStorage.setItem('pwa-hide-install', 'true');
          addNavbarInstall(window.defferedPromptEvent);
        }
      }}
    />
  );
}

const isDismissed = localStorage.getItem('pwa-hide-install');

if (isDismissed !== 'true') {
  render(<PWAInstallContainer />, document.getElementById('pwa-install'));
} else {
  window.addEventListener('beforeinstallprompt', (event) => {
    addNavbarInstall(event);
  });
}
