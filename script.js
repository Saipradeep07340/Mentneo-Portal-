const cursor = document.querySelector('.cursor');

if (cursor) {
  window.addEventListener('pointermove', (event) => {
    cursor.style.left = `${event.clientX}px`;
    cursor.style.top = `${event.clientY}px`;
  });
}

const reveals = document.querySelectorAll('.reveal');
const revealObserver = new IntersectionObserver(
  (entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
        revealObserver.unobserve(entry.target);
      }
    });
  },
  { threshold: 0.18 }
);

reveals.forEach((element) => revealObserver.observe(element));

const buttons = document.querySelectorAll('.button, .research-card, .product-card, .metric-card, .process-step, .flow-node');
buttons.forEach((button) => {
  button.addEventListener('pointermove', (event) => {
    const rect = button.getBoundingClientRect();
    const offsetX = event.clientX - rect.left;
    const offsetY = event.clientY - rect.top;
    const rotateY = ((offsetX / rect.width) - 0.5) * 8;
    const rotateX = (0.5 - (offsetY / rect.height)) * 8;
    button.style.transform = `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) translateY(-2px)`;
  });

  button.addEventListener('pointerleave', () => {
    button.style.transform = '';
  });
});

const animateNumber = (element) => {
  const target = Number(element.dataset.target || 0);
  const duration = 1400;
  const start = performance.now();

  const tick = (now) => {
    const progress = Math.min((now - start) / duration, 1);
    const eased = 1 - Math.pow(1 - progress, 3);
    const current = Math.round(target * eased);
    element.textContent = `${current}`;

    if (progress < 1) {
      requestAnimationFrame(tick);
    } else {
      element.textContent = `${target}`;
    }
  };

  requestAnimationFrame(tick);
};

const metricObserver = new IntersectionObserver(
  (entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        animateNumber(entry.target);
        metricObserver.unobserve(entry.target);
      }
    });
  },
  { threshold: 0.6 }
);

document.querySelectorAll('.metric-value').forEach((item) => metricObserver.observe(item));

const heroVisual = document.querySelector('.visual-core');
if (heroVisual) {
  window.addEventListener('pointermove', (event) => {
    const { innerWidth, innerHeight } = window;
    const x = (event.clientX / innerWidth - 0.5) * 18;
    const y = (event.clientY / innerHeight - 0.5) * 18;
    heroVisual.style.transform = `rotateX(${-y}deg) rotateY(${x}deg)`;
  });
}

const canvas = document.getElementById('ai-network');
if (canvas) {
  const ctx = canvas.getContext('2d');
  const particles = [];
  const centerX = canvas.width / 2;
  const centerY = canvas.height / 2;

  const createParticles = () => {
    particles.length = 0;
    for (let i = 0; i < 48; i += 1) {
      particles.push({
        x: centerX + (Math.random() - 0.5) * 360,
        y: centerY + (Math.random() - 0.5) * 360,
        vx: (Math.random() - 0.5) * 0.4,
        vy: (Math.random() - 0.5) * 0.4,
        radius: Math.random() * 2.4 + 1.2,
        alpha: Math.random() * 0.7 + 0.3,
      });
    }
  };

  const draw = () => {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const gradient = ctx.createRadialGradient(centerX, centerY, 40, centerX, centerY, 240);
    gradient.addColorStop(0, 'rgba(110, 200, 255, 0.18)');
    gradient.addColorStop(0.45, 'rgba(157, 141, 255, 0.08)');
    gradient.addColorStop(1, 'rgba(4, 7, 13, 0)');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    particles.forEach((particle, i) => {
      particle.x += particle.vx;
      particle.y += particle.vy;

      const dx = particle.x - centerX;
      const dy = particle.y - centerY;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist > 210) {
        particle.x = centerX + (Math.random() - 0.5) * 200;
        particle.y = centerY + (Math.random() - 0.5) * 200;
      }

      ctx.beginPath();
      ctx.fillStyle = `rgba(110, 200, 255, ${particle.alpha})`;
      ctx.arc(particle.x, particle.y, particle.radius, 0, Math.PI * 2);
      ctx.fill();

      for (let j = i + 1; j < particles.length; j += 1) {
        const other = particles[j];
        const dx2 = particle.x - other.x;
        const dy2 = particle.y - other.y;
        const distance = Math.sqrt(dx2 * dx2 + dy2 * dy2);

        if (distance < 120) {
          ctx.beginPath();
          ctx.strokeStyle = `rgba(146, 169, 255, ${0.18 - distance / 1000})`;
          ctx.lineWidth = 1;
          ctx.moveTo(particle.x, particle.y);
          ctx.lineTo(other.x, other.y);
          ctx.stroke();
        }
      }
    });

    requestAnimationFrame(draw);
  };

  createParticles();
  requestAnimationFrame(draw);
}
