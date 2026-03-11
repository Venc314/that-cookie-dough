
    (function() {
      'use strict';

      // Product Data - matches PRODUCT_MEDIA_REGISTRY from productinfo.html
      const products = [
        {
          id: 'classic',
          name: 'Classic Chocolate Chip',
          price: 50,
          category: 'cookies',
          desc: 'Our signature cookie with premium Belgian chocolate chips in a buttery, soft-baked base.',
          images: '../public/assets/pictures/Classic cookies.png',
          badge: 'Best Seller'
        },
        {
          id: 'crinkles',
          name: 'Ultimate Crinkles',
          price: 55,
          category: 'cookies',
          desc: 'Fudgy chocolate cookies rolled in powdered sugar, creating that perfect crackled appearance.',
          images: '../public/assets/pictures/crinkles.png',
          badge: null
        },
        {
          id: 'double',
          name: 'Double Dose',
          price: 65,
          category: 'specialty',
          desc: 'Double the chocolate! Loaded with cocoa powder AND chocolate chips for the ultimate chocolate experience.',
          images: '../public/assets/pictures/double.png',
          badge: 'Popular'
        },
        {
          id: 'kon-de-leche',
          name: 'Kon de Leche',
          price: 60,
          category: 'specialty',
          desc: 'Sweet condensed milk cookie with a caramelized exterior and soft, chewy interior.',
          images: '../public/assets/pictures/kon de leche.png',
          badge: 'Local Favorite'
        },
        {
          id: 'matcha-white',
          name: 'Matcha White',
          price: 70,
          category: 'new',
          desc: 'Premium Japanese matcha green tea cookie with white chocolate chips for a delicate, earthy sweetness.',
          images: '../public/assets/pictures/matcha white.png',
          badge: 'New!'
        },
        {
          id: 'molten-classic',
          name: 'Molten Classic',
          price: 75,
          category: 'specialty',
          desc: 'Gooey chocolate cookie with a molten center that flows like lava when you bite in.',
          images: '../public/assets/pictures/molten clasic.png',
          badge: null
        },
        {
          id: 'denis-smores',
          name: 'Denis Smores',
          price: 65,
          category: 'specialty',
          desc: 'Graham cracker cookie loaded with marshmallows and chocolate chunks — campfire vibes in every bite.',
          images: '../public/assets/pictures/denis smores.png',
          badge: null
        },
        {
          id: 'matchadoodles',
          name: 'Matchadoodles',
          price: 60,
          category: 'cookies',
          desc: 'Cinnamon-spiced oatmeal cookie with a hint of matcha for a unique twist on the classic.',
          images: '../public/assets/cookei/matchadoodles.png',
          badge: null
        },
        {
          id: 'snickadoodles',
          name: 'Snickadoodles',
          price: 55,
          category: 'cookies',
          desc: 'Classic snickerdoodle cookie rolled in cinnamon sugar — soft, chewy, and absolutely irresistible.',
          images: '../public/assets/cookei/snickadoodles.png',
          badge: null
        },
        {
          id: 'classic-churros',
          name: 'Classic Churros',
          price: 80,
          category: 'churros',
          desc: 'Crispy fried dough dusted with cinnamon sugar, served with a rich chocolate dipping sauce.',
          images: '../public/assets/CHURROS 1.jpeg',
          badge: 'New!'
        },
        {
          id: 'premium-garlic-bread',
          name: 'Premium Garlic Bread',
          price: 95,
          category: 'garlic-bread',
          desc: 'Artisan bread sliced and baked with our signature garlic butter and herbs until golden crisp.',
          images: '../public/assets/BREAD 1.jpeg',
          
          badge: 'Savory'
        }
      ];

      // DOM Elements
      const productsGrid = document.getElementById('products-grid');
      const cartToggle = document.getElementById('cart-toggle');
      const cartPanel = document.getElementById('cart-panel');
      const cartOverlay = document.getElementById('cart-overlay');
      const cartClose = document.getElementById('cart-close');
      const cartItems = document.getElementById('cart-items');
      const cartEmpty = document.getElementById('cart-empty');
      const cartFooter = document.getElementById('cart-footer');
      const cartCount = document.getElementById('cart-count');
      const cartTotal = document.getElementById('cart-total');
      const cartFeedbackWrap = document.getElementById('add-feedback-wrap');

      // Cart State
      let cart = JSON.parse(localStorage.getItem('tcd-cart') || '[]');

      // Nav scroll effect
      const nav = document.getElementById('main-nav');
      window.addEventListener('scroll', () => {
        nav.classList.toggle('scrolled', window.scrollY > 30);
      }, { passive: true });

      // Render Products
      function renderProducts(filter = 'all') {
        const filtered = filter === 'all' 
          ? products 
          : products.filter(p => p.category === filter);

        productsGrid.innerHTML = filtered.map((product, index) => `
          <article class="product-card" data-id="${product.id}" style="animation-delay: ${index * 0.05}s">
            <div class="product-card-inner">
              <div class="card-image-wrap">
                <img class="card-image" src="${product.images}" alt="${product.name}" loading="lazy" onerror="this.src='https://images.unsplash.com/photo-1499636136210-6f4ee915583e?q=80&w=500&auto=format&fit=crop'" />
                ${product.badge ? `<span class="card-badge">${product.badge}</span>` : ''}
                <button class="card-quick-add" aria-label="Quick add ${product.name}" data-id="${product.id}">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                    <line x1="12" y1="5" x2="12" y2="19"></line>
                    <line x1="5" y1="12" x2="19" y2="12"></line>
                  </svg>
                </button>
              </div>
              <div class="card-content">
                <p class="card-category">${product.category}</p>
                <h3 class="card-title">${product.name}</h3>
                <p class="card-desc">${product.desc}</p>
                <div class="card-footer">
                  <span class="card-price">₱${product.price}</span>
                  <a href="productinfo.html?id=${product.id}&name=${encodeURIComponent(product.name)}&price=${product.price}&desc=${encodeURIComponent(product.desc)}&category=${product.category}" class="card-btn">View</a>
                </div>
              </div>
            </div>
          </article>
        `).join('');

        // Apply 3D Hover effect on newly rendered cards
        const cards = document.querySelectorAll('.product-card');
        cards.forEach(card => {
          const inner = card.querySelector('.product-card-inner');
          
          card.addEventListener('mousemove', (e) => {
            const rect = card.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;
            const centerX = rect.width / 2;
            const centerY = rect.height / 2;
            
            // Calculate tilt angle based on mouse position
            const rotateX = ((y - centerY) / centerY) * -8; // Max 8 degrees tilt
            const rotateY = ((x - centerX) / centerX) * 8;
            
            // Pop the specific elements inside
            inner.style.transform = `scale(1.02) rotateX(${rotateX}deg) rotateY(${rotateY}deg)`;
            inner.style.boxShadow = `
              ${(centerX - x) * 0.15}px ${(centerY - y) * 0.15}px 30px rgba(47,33,25,0.15),
              0 20px 40px rgba(47,33,25,0.1)
            `;
          });
          
          card.addEventListener('mouseleave', () => {
             inner.style.transform = 'scale(1) rotateX(0) rotateY(0)';
             inner.style.boxShadow = 'var(--shadow-card)';
          });
        });

        // Add click handlers to cards
        document.querySelectorAll('.product-card').forEach(card => {
          card.addEventListener('click', (e) => {
            if (!e.target.closest('.card-quick-add')) {
              const id = card.dataset.id;
              const product = products.find(p => p.id === id);
              if (product) {
                window.location.href = `productinfo.html?id=${product.id}&name=${encodeURIComponent(product.name)}&price=${product.price}&desc=${encodeURIComponent(product.desc)}&category=${product.category}`;
              }
            }
          });
        });

        // Quick add handlers
        document.querySelectorAll('.card-quick-add').forEach(btn => {
          btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const id = btn.dataset.id;
            const product = products.find(p => p.id === id);
            if (product) {
              addToCart(product.id, product.name, product.price, 1);
            }
          });
        });
      }

      // Filter buttons
      document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.addEventListener('click', () => {
          document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
          btn.classList.add('active');
          renderProducts(btn.dataset.filter);
        });
      });

      // Cart Functions
      function saveCart() {
        localStorage.setItem('tcd-cart', JSON.stringify(cart));
      }

      function openCart() {
        cartPanel.classList.add('open');
        cartOverlay.classList.add('active');
        document.body.style.overflow = 'hidden';
      }

      function closeCart() {
        cartPanel.classList.remove('open');
        cartOverlay.classList.remove('active');
        document.body.style.overflow = '';
      }

      cartToggle.addEventListener('click', openCart);
      cartClose.addEventListener('click', closeCart);
      cartOverlay.addEventListener('click', closeCart);

      function renderCart() {
        const total = cart.reduce((s, i) => s + i.price * i.qty, 0);
        const count = cart.reduce((s, i) => s + i.qty, 0);

        cartCount.textContent = count;
        cartCount.classList.toggle('has-items', count > 0);
        cartTotal.textContent = '₱' + total.toLocaleString();
        
        // Remove existing items
        document.querySelectorAll('.cart-item').forEach(el => el.remove());

        if (cart.length === 0) {
          cartEmpty.style.display = 'flex';
          cartFooter.style.display = 'none';
          saveCart();
          return;
        }

        cartEmpty.style.display = 'none';
        cartFooter.style.display = 'block';

        cart.forEach(item => {
          const el = document.createElement('div');
          el.className = 'cart-item';
          el.innerHTML = `
            <div class="cart-item-info">
              <span class="cart-item-name">${item.name}</span>
              <span class="cart-item-price">₱${(item.price * item.qty).toLocaleString()}</span>
            </div>
            <div class="cart-item-controls">
              <button class="cart-qty-btn" aria-label="Decrease">−</button>
              <span class="cart-qty-num">${item.qty}</span>
              <button class="cart-qty-btn" aria-label="Increase">+</button>
              <button class="cart-remove-btn" aria-label="Remove">✕</button>
            </div>`;
          
          el.querySelectorAll('.cart-qty-btn')[0].addEventListener('click', () => {
            item.qty--;
            if (item.qty <= 0) cart = cart.filter(c => c.id !== item.id);
            renderCart();
          });
          el.querySelectorAll('.cart-qty-btn')[1].addEventListener('click', () => {
            item.qty++;
            renderCart();
          });
          el.querySelector('.cart-remove-btn').addEventListener('click', () => {
            cart = cart.filter(c => c.id !== item.id);
            renderCart();
          });
          cartItems.appendChild(el);
        });
        saveCart();
      }

      function addToCart(id, name, price, quantity) {
        const existing = cart.find(i => i.id === id);
        if (existing) existing.qty += quantity;
        else cart.push({ id, name, price: Number(price), qty: quantity });
        renderCart();
        showAddFeedback(name);
      }

      function showAddFeedback(name) {
        const el = document.createElement('div');
        el.className = 'add-feedback';
        el.textContent = `"${name}" added to cart!`;
        cartFeedbackWrap.appendChild(el);
        requestAnimationFrame(() => el.classList.add('show'));
        setTimeout(() => {
          el.classList.remove('show');
          el.addEventListener('transitionend', () => el.remove(), { once: true });
        }, 2200);
      }

      // Checkout button
      document.getElementById('btn-checkout').addEventListener('click', () => {
        if (cart.length === 0) {
          alert('Your cart is empty. Add some treats first!');
          return;
        }
        // Build URL with cart items
        const cartParam = cart.map(item => `${item.id}:${item.qty}`).join(',');
        window.location.href = `productinfo.html?cart=${encodeURIComponent(cartParam)}&fromCart=true`;
      });

      // Initial render
      renderProducts();
      renderCart();

      // -- GOD-TIER 3D & PARALLAX LOGIC --
      const hero3DCard = document.getElementById('hero-3d-card');
      const hero3DImg = document.getElementById('hero-3d-img');
      const parallaxBg = document.getElementById('parallax-bg');
      const floatImgs = document.querySelectorAll('.hero-float-img');
      
      if (hero3DCard && parallaxBg) {
        document.addEventListener('mousemove', (e) => {
          const x = e.clientX / window.innerWidth;
          const y = e.clientY / window.innerHeight;

          // Hero Card 3D Tilt
          const cardRect = hero3DCard.getBoundingClientRect();
          const cardCenterX = cardRect.left + cardRect.width / 2;
          const cardCenterY = cardRect.top + cardRect.height / 2;
          const rotateY = ((e.clientX - cardCenterX) / cardRect.width) * 20; // Max 20deg
          const rotateX = ((e.clientY - cardCenterY) / cardRect.height) * -20; // Max -20deg

          // Apply rotation with a subtle shine effect
          hero3DCard.style.transform = `rotateX(${rotateX}deg) rotateY(${rotateY}deg)`;
          hero3DImg.style.transform = `translateZ(100px) rotate(${x * -8}deg) scale(1.1)`;

          // Parallax background items
          floatImgs[0].style.transform = `translate(${x * 60}px, ${y * 40}px) rotate(15deg)`;
          floatImgs[1].style.transform = `translate(${x * -70}px, ${y * -50}px) rotate(-25deg)`;
          floatImgs[2].style.transform = `translate(${x * 40}px, ${y * -80}px) rotate(45deg)`;
        });
        
        // Reset nicely when off screen tracking isn't possible, nicely centers
        document.addEventListener('mouseleave', () => {
          hero3DCard.style.transform = `rotateX(0deg) rotateY(0deg)`;
          hero3DImg.style.transform = `translateZ(80px) rotate(-15deg) scale(1)`;
          floatImgs[0].style.transform = `translate(0px, 0px) rotate(15deg)`;
          floatImgs[1].style.transform = `translate(0px, 0px) rotate(-25deg)`;
          floatImgs[2].style.transform = `translate(0px, 0px) rotate(45deg)`;
        });
      }

      // Smooth scroll for CTA
      const heroCta = document.getElementById('hero-cta');
      if (heroCta) {
        heroCta.addEventListener('click', (e) => {
          e.preventDefault();
          const target = document.getElementById('products-grid');
          const offset = 100; // Account for fixed nav
          const top = target.getBoundingClientRect().top + window.scrollY - offset;
          window.scrollTo({ top, behavior: 'smooth' });
        });
      }

    })();
