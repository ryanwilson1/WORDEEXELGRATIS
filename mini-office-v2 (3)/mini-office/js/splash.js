/**
 * MINI OFFICE — Splash Controller v2
 * Typed animation + particles
 */

const Splash = (() => {
  const SPLASH_DURATION = 3400;

  const phrases = [
    'Fica em paz, não vou te hackear kkk',
    'Tudo salvo só aqui no seu device.',
    'Funciona 100% offline.',
    'Zero servidores. Zero espionagem.',
  ];

  let phraseIdx = 0;
  let charIdx = 0;
  let typingTimer = null;
  let isDeleting = false;

  function typeNext() {
    const el = document.getElementById('typed-text');
    if (!el) return;

    const phrase = phrases[phraseIdx];

    if (!isDeleting) {
      charIdx++;
      el.textContent = phrase.slice(0, charIdx);
      if (charIdx === phrase.length) {
        isDeleting = true;
        typingTimer = setTimeout(typeNext, 1400);
      } else {
        typingTimer = setTimeout(typeNext, 40);
      }
    } else {
      charIdx--;
      el.textContent = phrase.slice(0, charIdx);
      if (charIdx === 0) {
        isDeleting = false;
        phraseIdx = (phraseIdx + 1) % phrases.length;
        typingTimer = setTimeout(typeNext, 200);
      } else {
        typingTimer = setTimeout(typeNext, 24);
      }
    }
  }

  function show() {
    const splash = document.getElementById('splash');
    if (!splash) return;

    Particles.init();

    // Start typing after initial fade-in
    setTimeout(() => typeNext(), 900);

    setTimeout(() => hide(), SPLASH_DURATION);
  }

  function hide() {
    clearTimeout(typingTimer);
    const splash = document.getElementById('splash');
    if (!splash) return;

    splash.classList.add('exiting');
    setTimeout(() => {
      splash.classList.add('hidden');
      Particles.destroy();
      Home.show();
    }, 600);
  }

  return { show, hide };
})();
