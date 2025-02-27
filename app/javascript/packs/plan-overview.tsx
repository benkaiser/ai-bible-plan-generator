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

function PWAInstallContainer() {
  const pwaInstallRef = useRef(null);

  return (
    <PWAInstall
      ref={pwaInstallRef}
      name={"AI Bible Plan"}
      icon={"/icon.png"}
      useLocalStorage={true}
      onPWA
      onPwaInstallAvailableEvent={(event) => {
        if (localStorage.getItem('pwa-hide-install') !== 'true') {
          pwaInstallRef.current?.showDialog();
        }
      }}
      onPwaUserChoiceResultEvent={(event) => {
        console.log('onPwaUserChoiceResultEvent', event);
        if (event.detail.message === 'dismissed') {
          localStorage.setItem('pwa-hide-install', 'true');
        }
      }}
    />
  );
}

const isDismissed = localStorage.getItem('pwa-hide-install');

if (isDismissed !== 'true') {
  render(<PWAInstallContainer />, document.getElementById('pwa-install'));
}
