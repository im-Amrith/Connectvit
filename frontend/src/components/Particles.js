import React, { useEffect, useRef } from 'react';

function Particles() {
  const canvasRef = useRef(null);
  
  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    
    let particlesArray = [];
    let hue = 180; // Starting hue value for color cycling
    
    // Get canvas size
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    
    // Handle window resize
    const handleResize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      init(); // Reinitialize particles on resize
    };
    
    window.addEventListener('resize', handleResize);
    
    // Mouse position tracking for interactive effect
    const mouse = {
      x: undefined,
      y: undefined,
      radius: 150
    };
    
    const handleMouseMove = (event) => {
      mouse.x = event.x;
      mouse.y = event.y;
    };
    
    window.addEventListener('mousemove', handleMouseMove);
    
    // Particle class
    class Particle {
      constructor() {
        this.x = Math.random() * canvas.width;
        this.y = Math.random() * canvas.height;
        this.size = Math.random() * 3 + 1; // Size between 1-4
        this.baseSize = this.size;
        this.speedX = Math.random() * 2 - 1; // -1 to 1
        this.speedY = Math.random() * 2 - 1; // -1 to 1
        this.color = `hsla(${hue}, 100%, 60%, ${Math.random() * 0.5 + 0.2})`; // Dynamic color
        this.pulseSpeed = Math.random() * 0.01 + 0.001;
        this.pulseDirection = 1;
      }
      
      // Update particle position
      update() {
        // Move particle
        this.x += this.speedX;
        this.y += this.speedY;
        
        // Bounce off edges
        if (this.x > canvas.width || this.x < 0) {
          this.speedX = -this.speedX;
        }
        if (this.y > canvas.height || this.y < 0) {
          this.speedY = -this.speedY;
        }
        
        // Mouse interaction - particles move away from mouse
        const dx = mouse.x - this.x;
        const dy = mouse.y - this.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        if (distance < mouse.radius && mouse.x !== undefined) {
          const force = mouse.radius / distance;
          const angle = Math.atan2(dy, dx);
          this.speedX -= Math.cos(angle) * force * 0.1;
          this.speedY -= Math.sin(angle) * force * 0.1;
        }
        
        // Apply some damping to prevent extreme speed
        this.speedX *= 0.99;
        this.speedY *= 0.99;
        
        // Pulsing size effect
        if (this.size > this.baseSize * 1.5 || this.size < this.baseSize * 0.8) {
          this.pulseDirection *= -1;
        }
        this.size += this.pulseSpeed * this.pulseDirection;
      }
      
      // Draw particle
      draw() {
        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    
    // Initialize particles
    function init() {
      particlesArray = [];
      const numberOfParticles = Math.floor((canvas.height * canvas.width) / 9000);
      for (let i = 0; i < numberOfParticles; i++) {
        particlesArray.push(new Particle());
      }
    }
    
    // Connect particles with lines if they're close enough
    function connect() {
      const maxDistance = 150;
      for (let a = 0; a < particlesArray.length; a++) {
        for (let b = a; b < particlesArray.length; b++) {
          const dx = particlesArray[a].x - particlesArray[b].x;
          const dy = particlesArray[a].y - particlesArray[b].y;
          const distance = Math.sqrt(dx * dx + dy * dy);
          
          if (distance < maxDistance) {
            const opacity = 1 - (distance / maxDistance);
            ctx.strokeStyle = `hsla(${hue}, 100%, 60%, ${opacity * 0.2})`;
            ctx.lineWidth = 0.5;
            ctx.beginPath();
            ctx.moveTo(particlesArray[a].x, particlesArray[a].y);
            ctx.lineTo(particlesArray[b].x, particlesArray[b].y);
            ctx.stroke();
          }
        }
      }
    }
    
    // Animation loop
    function animate() {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      for (let i = 0; i < particlesArray.length; i++) {
        particlesArray[i].update();
        particlesArray[i].draw();
      }
      
      connect();
      
      // Cycle hue for color change effect
      hue = (hue + 0.5) % 360;
      
      requestAnimationFrame(animate);
    }
    
    init();
    animate();
    
    // Cleanup
    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('mousemove', handleMouseMove);
    };
  }, []);
  
  return (
    <canvas 
      ref={canvasRef} 
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        zIndex: -1,
        background: 'black'
      }}
    />
  );
}

export default Particles; 