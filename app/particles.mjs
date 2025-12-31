// Particle Background System for WWTBAM
// Creates cinematic floating particles (stars, orbs, sparkles)

class Particle {
  constructor(canvas, type) {
    this.x = Math.random() * canvas.width;
    this.y = Math.random() * canvas.height;
    this.type = type; // "star" | "orb" | "sparkle"

    // Size based on type
    if (type === "star") {
      this.size = Math.random() * 2 + 1; // 1-3px
    } else if (type === "orb") {
      this.size = Math.random() * 4 + 4; // 4-8px
    } else {
      this.size = Math.random() * 3 + 2; // 2-5px
    }

    // Speed based on type
    if (type === "star") {
      this.speedY = Math.random() * 0.2 + 0.1; // 0.1-0.3
    } else if (type === "orb") {
      this.speedY = Math.random() * 0.3 + 0.2; // 0.2-0.5
    } else {
      this.speedY = Math.random() * 0.4 + 0.3; // 0.3-0.7
    }

    this.speedX = (Math.random() - 0.5) * 0.2; // slight horizontal drift
    this.opacity = Math.random() * 0.5 + 0.3; // 0.3-0.8
    this.twinkleSpeed = Math.random() * 0.02 + 0.01;
    this.phase = Math.random() * Math.PI * 2;
  }

  update(deltaTime, canvas) {
    // Floating upward motion
    this.y -= this.speedY * deltaTime;
    this.x += this.speedX * deltaTime;

    // Twinkle effect
    this.phase += this.twinkleSpeed;

    // Wrap around screen
    if (this.y < -10) {
      this.y = canvas.height + 10;
      this.x = Math.random() * canvas.width;
    }
    if (this.x < -10) this.x = canvas.width + 10;
    if (this.x > canvas.width + 10) this.x = -10;
  }

  draw(ctx) {
    const twinkle = Math.sin(this.phase) * 0.3 + 0.7;
    ctx.save();
    ctx.globalAlpha = this.opacity * twinkle;

    if (this.type === "star") {
      // Draw star as small gold dot
      ctx.fillStyle = "#f6b93b";
      ctx.fillRect(
        Math.floor(this.x),
        Math.floor(this.y),
        this.size,
        this.size
      );
    } else if (this.type === "orb") {
      // Draw orb with radial gradient
      const gradient = ctx.createRadialGradient(
        this.x,
        this.y,
        0,
        this.x,
        this.y,
        this.size
      );
      gradient.addColorStop(0, "rgba(246, 185, 59, 0.6)");
      gradient.addColorStop(1, "rgba(246, 185, 59, 0)");

      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
      ctx.fill();
    } else {
      // Draw sparkle as diamond shape
      ctx.fillStyle = "#ffd700";
      ctx.beginPath();
      ctx.moveTo(this.x, this.y - this.size);
      ctx.lineTo(this.x + this.size, this.y);
      ctx.lineTo(this.x, this.y + this.size);
      ctx.lineTo(this.x - this.size, this.y);
      ctx.closePath();
      ctx.fill();
    }

    ctx.restore();
  }
}

class ParticleSystem {
  constructor(canvasId, options = {}) {
    this.canvas = document.getElementById(canvasId);
    if (!this.canvas) {
      console.error(`Canvas element with id "${canvasId}" not found`);
      return;
    }

    this.ctx = this.canvas.getContext("2d");
    this.particles = [];
    this.animationId = null;
    this.lastTime = performance.now();

    this.options = {
      density: options.density || "medium", // "low" | "medium" | "high"
      enabled: options.enabled !== false
    };

    this.resize();
    window.addEventListener("resize", () => this.resize());
  }

  resize() {
    this.canvas.width = window.innerWidth;
    this.canvas.height = window.innerHeight;
    this.initParticles();
  }

  initParticles() {
    const counts = {
      low: { stars: 30, orbs: 5, sparkles: 10 },
      medium: { stars: 50, orbs: 10, sparkles: 15 },
      high: { stars: 80, orbs: 15, sparkles: 25 }
    };

    const count = counts[this.options.density] || counts.medium;
    this.particles = [];

    // Create stars
    for (let i = 0; i < count.stars; i++) {
      this.particles.push(new Particle(this.canvas, "star"));
    }

    // Create orbs
    for (let i = 0; i < count.orbs; i++) {
      this.particles.push(new Particle(this.canvas, "orb"));
    }

    // Create sparkles
    for (let i = 0; i < count.sparkles; i++) {
      this.particles.push(new Particle(this.canvas, "sparkle"));
    }
  }

  start() {
    if (!this.options.enabled || !this.canvas) return;
    this.lastTime = performance.now();
    this.animate();
  }

  stop() {
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
    }
  }

  animate() {
    const currentTime = performance.now();
    const deltaTime = (currentTime - this.lastTime) / 16; // normalize to ~60fps
    this.lastTime = currentTime;

    // Clear canvas
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    // Update and draw particles
    this.particles.forEach(particle => {
      particle.update(deltaTime, this.canvas);
      particle.draw(this.ctx);
    });

    this.animationId = requestAnimationFrame(() => this.animate());
  }

  setDensity(density) {
    this.options.density = density;
    this.initParticles();
  }

  setEnabled(enabled) {
    this.options.enabled = enabled;
    if (enabled) {
      this.start();
    } else {
      this.stop();
      if (this.ctx) {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
      }
    }
  }
}

export { ParticleSystem };
