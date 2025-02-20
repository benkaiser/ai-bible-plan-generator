import { confetti } from "@tsparticles/confetti";

interface Window {
  flash: [string, string][];
}

const didComplete = window.flash.some(item => item[1].includes('You finished the plan'));

if (didComplete) {
  confetti({
    spread: 360,
    particleCount: 400,
    origin: { y: 0.6 }
  })
}