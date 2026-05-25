/**
 * MINI OFFICE — Particles Engine
 * Subtle, elegant particle system for splash screen
 */

const Particles = (() => {
  let canvas, ctx, particles = [], animFrameId;
  const PARTICLE_COUNT = 60;

  function init() {
    canvas = document.getElementById('particles-canvas');
    if (!canvas) return;
    ctx = canvas.getContext('2d');
    resize();
    window.addEventListener('resize', resize);
    createParticles();
    animate();
  }

  function resize() {
    if (!canvas) return;
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
  }

  function createParticles() {
    particles = [];
    for (let i = 0; i < PARTICLE_COUNT; i++) {
      particles.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        vx: (Math.random() - 0.5) * 0.4,
        vy: (Math.random() - 0.5) * 0.4,
        radius: Math.random() * 1.5 + 0.5,
        opacity: Math.random() * 0.4 + 0.05,
        pulseSpeed: Math.random() * 0.02 + 0.005,
        pulseOffset: Math.random() * Math.PI * 2,
      });
    }
  }

  function drawConnections() {
    const maxDist = 120;
    for (let i = 0; i < particles.length; i++) {
      for (let j = i + 1; j < particles.length; j++) {
        const dx = particles[i].x - particles[j].x;
        const dy = particles[i].y - particles[j].y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < maxDist) {
          const alpha = (1 - dist / maxDist) * 0.12;
          ctx.beginPath();
          ctx.strokeStyle = `rgba(147, 197, 253, ${alpha})`;
          ctx.lineWidth = 0.5;
          ctx.moveTo(particles[i].x, particles[i].y);
          ctx.lineTo(particles[j].x, particles[j].y);
          ctx.stroke();
        }
      }
    }
  }

  function animate() {
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    drawConnections();

    const t = Date.now() * 0.001;

    particles.forEach(p => {
      p.x += p.vx;
      p.y += p.vy;

      // Wrap around
      if (p.x < 0) p.x = canvas.width;
      if (p.x > canvas.width) p.x = 0;
      if (p.y < 0) p.y = canvas.height;
      if (p.y > canvas.height) p.y = 0;

      const pulse = Math.sin(t * p.pulseSpeed * 60 + p.pulseOffset) * 0.15 + 0.85;
      const opacity = p.opacity * pulse;

      ctx.beginPath();
      ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(147, 197, 253, ${opacity})`;
      ctx.fill();
    });

    animFrameId = requestAnimationFrame(animate);
  }

  function destroy() {
    if (animFrameId) cancelAnimationFrame(animFrameId);
    window.removeEventListener('resize', resize);
  }

  return { init, destroy };
})();
