/* ========================================
   Foodie Express - main.js
   Production Clean Build
   Single file - no duplicates
   ======================================== */

(function () {
  'use strict';

  // ---------- Utilities ----------
  const CART_KEY = 'foodie_cart_v1';
  const PRODUCT_KEY = 'fd_selected_product';
  const DELIVERY_FEE = 40;

  const $ = (sel, ctx = document) => ctx.querySelector(sel);
  const $$ = (sel, ctx = document) => Array.from(ctx.querySelectorAll(sel));
  const byId = (id) => document.getElementById(id);
  const safe = (el, fn) => { if (el) try { fn(el); } catch(e){ console.warn(e); } };

  function parsePrice(p) {
    if (typeof p === 'number') return p;
    if (!p) return 0;
    const n = parseInt(String(p).replace(/[^0-9]/g, ''), 10);
    return isNaN(n) ? 0 : n;
  }
  function fmt(n){ return '₹' + n; }

  // ---------- Navbar Injection (required for index + Categories) ----------
 function ensureNavbar(){

    const page = window.location.pathname.split("/").pop().toLowerCase();

    // Sirf in pages par navbar dikhana
    const allowedPages = [
        "index.html",
        "categories.html",
        "oder.html",
        "pament.html"
    ];

    if(!allowedPages.includes(page)){
        return;
    }

    if(document.querySelector(".navbar")){
        return;
    }

    const navHTML = `
<header class="navbar" id="siteNavbar">
    <a href="index.html" class="logo" style="text-decoration:none">
        🍔 <span>Foodie Express</span>
    </a>

    <ul class="nav-links" id="navLinks">

        <li><a href="index.html">Home</a></li>

        <li><a href="Categories.html">Categories</a></li>

        <li class="cart">
            <a href="javascript:void(0)" id="cartBtn">
                Your Cart 🛒
                <span id="cartCount">0</span>
            </a>
        </li>

    </ul>

    <div class="hamburger" id="hamburger">
        <span></span>
        <span></span>
        <span></span>
    </div>

</header>`;

    document.body.insertAdjacentHTML("afterbegin", navHTML);
}

  function ensureCartSidebar(){
    if (byId('cartSidebar')) return;
    const cartHTML = `
<div class="cart-sidebar" id="cartSidebar" aria-hidden="true">
  <div class="cart-header">
    <h2>🛒 Your Cart</h2>
    <span id="closeCart" role="button" tabindex="0">&times;</span>
  </div>
  <div class="cart-items" id="cartItems"></div>
  <div class="cart-footer">
    <div class="row"><span>Subtotal</span><span id="subtotal">₹0</span></div>
    <div class="row"><span>Delivery Fee</span><span>₹${DELIVERY_FEE}</span></div>
    <div class="row total"><span>Total</span><span id="total">₹${DELIVERY_FEE}</span></div>
    <button class="checkout-btn" id="checkoutBtn">Proceed to Checkout</button>
  </div>
</div>`;
    document.body.insertAdjacentHTML('beforeend', cartHTML);
  }

  // ---------- Cart System ----------
  function getCart(){
    try { return JSON.parse(localStorage.getItem(CART_KEY)) || []; }
    catch(e){ return []; }
  }
  function saveCart(cart){
    localStorage.setItem(CART_KEY, JSON.stringify(cart));
    // legacy key for older code paths
    localStorage.setItem('cart', JSON.stringify(cart));
    updateCartCount();
  }

  function updateCartCount(){
    const cart = getCart();
    const totalQty = cart.reduce((s, it) => s + (parseInt(it.qty,10) || 1), 0);
    const els = [ byId('cartCount'), byId('cart-count'), ...$$('#cartCount'), ...$$('#cart-count') ];
    els.forEach(el => { if(el) el.textContent = totalQty; });
    return totalQty;
  }

  function loadCart(){
    const wrap = byId('cartItems');
    if (!wrap) return;
    const cart = getCart();
    let subtotal = 0;
    wrap.innerHTML = '';
    if (cart.length === 0){
      wrap.innerHTML = '<p style="text-align:center;color:#777;padding:20px 0">Your cart is empty</p>';
    } else {
      cart.forEach((item, index) => {
        const price = parsePrice(item.price);
        const qty = parseInt(item.qty,10) || 1;
        subtotal += price * qty;
        wrap.insertAdjacentHTML('beforeend', `
          <div class="cart-item">
            <img src="${item.image || item.img || 'image/image1.jpg'}" class="cart-img" alt="${item.name}">
            <div class="cart-info">
              <h3>${item.name}</h3>
              <p>${fmt(price)}</p>
              <div class="qty">
                <button type="button" onclick="decreaseQty(${index})" aria-label="decrease">-</button>
                <span>${qty}</span>
                <button type="button" onclick="increaseQty(${index})" aria-label="increase">+</button>
              </div>
            </div>
            <button class="remove-btn" onclick="removeItem(${index})" aria-label="remove">🗑️</button>
          </div>
        `);
      });
    }
    const total = subtotal > 0 ? subtotal + DELIVERY_FEE : 0;
    safe(byId('subtotal'), el => el.textContent = fmt(subtotal));
    safe(byId('total'), el => el.textContent = fmt(total));
    updateCartCount();
  }

  function addToCart(name, price, image){
    if (!name) return;
    const cart = getCart();
    const priceNum = parsePrice(price);
    const img = image || 'image/image1.jpg';
    const idx = cart.findIndex(i => i.name === name);
    if (idx > -1){
      cart[idx].qty = (parseInt(cart[idx].qty,10) || 1) + 1;
    } else {
      cart.push({ name, price: priceNum, image: img, qty: 1 });
    }
    saveCart(cart);
    loadCart();
    // open sidebar if present
    const sidebar = byId('cartSidebar');
    if (sidebar) sidebar.style.right = '0';
  }

  function removeItem(index){
    const cart = getCart();
    if (index >= 0 && index < cart.length){
      cart.splice(index, 1);
      saveCart(cart);
      loadCart();
    }
  }

  function changeQty(index, delta){
    const cart = getCart();
    if (!cart[index]) return;
    cart[index].qty = (parseInt(cart[index].qty,10) || 1) + delta;
    if (cart[index].qty <= 0){
      cart.splice(index, 1);
    }
    saveCart(cart);
    loadCart();
  }

  function increaseQty(index){ changeQty(index, 1); }
  function decreaseQty(index){ changeQty(index, -1); }

  // ---------- Product Detail Popup ----------
  let currentProduct = null;

  function showDetail(name, price, image, desc, rating, time){
    currentProduct = { name, price: parsePrice(price), priceText: price, image, desc, rating, time };
    safe(byId('pName'), el => el.textContent = name || '');
    safe(byId('pPrice'), el => el.textContent = price || '');
    safe(byId('pImg'), el => { el.src = image || ''; el.alt = name || ''; });
    safe(byId('pDesc'), el => el.textContent = desc || '');
    safe(byId('pRating'), el => el.textContent = rating || '');
    safe(byId('pTime'), el => el.textContent = time || '');
    const popup = byId('popup');
    if (popup) { popup.style.display = 'flex'; }
  }

  function closePopup(){
    const popup = byId('popup') || byId('trackingPopup') || document.querySelector('.popup, .tracking-popup');
    if (popup) popup.style.display = 'none';
  }

  function orderCurrentProduct(){
    if (currentProduct){
      saveSelectedProduct(currentProduct);
      window.location.href = 'oder.html';
      return;
    }
    // fallback: try to read from popup DOM
    const name = byId('pName')?.textContent?.trim();
    const price = byId('pPrice')?.textContent?.trim();
    const image = byId('pImg')?.src;
    if (name){
      saveSelectedProduct({ name, priceText: price, price: parsePrice(price), image });
      window.location.href = 'oder.html';
    }
  }

  // ---------- Product Persistence ----------
  function saveSelectedProduct(p){
    try {
      localStorage.setItem(PRODUCT_KEY, JSON.stringify(p));
      // legacy individual keys (used by oder.html in the wild)
      localStorage.setItem('foodName', p.name || '');
      localStorage.setItem('foodPrice', parsePrice(p.price ?? p.priceText));
      localStorage.setItem('foodImage', p.image || '');
    } catch(e){}
  }

  function getSelectedProduct(){
    try {
      const raw = localStorage.getItem(PRODUCT_KEY);
      if (raw) return JSON.parse(raw);
    } catch(e){}
    // legacy fallback
    const name = localStorage.getItem('foodName');
    if (name){
      return {
        name,
        price: parsePrice(localStorage.getItem('foodPrice')),
        priceText: '₹' + localStorage.getItem('foodPrice'),
        image: localStorage.getItem('foodImage')
      };
    }
    return null;
  }

  // ---------- Navbar Events ----------
  function initNavbarEvents(){
    const hamburger = byId('hamburger') || $('.hamburger');
    const navLinks = byId('navLinks') || $('.nav-links');
    if (hamburger && navLinks){
      const toggle = () => navLinks.classList.toggle('active');
      hamburger.onclick = toggle;
      hamburger.onkeydown = (e)=> { if(e.key==='Enter'||e.key===' ') toggle(); };
      $$('.nav-links a', navLinks).forEach(a => {
        a.addEventListener('click', () => navLinks.classList.remove('active'));
      });
    }

    const cartBtn = byId('cartBtn');
    const cartSidebar = byId('cartSidebar');
    const closeCart = byId('closeCart');
    if (cartBtn && cartSidebar){
      cartBtn.addEventListener('click', (e)=>{
        e.preventDefault();
        cartSidebar.style.right = '0';
        cartSidebar.setAttribute('aria-hidden', 'false');
        loadCart();
      });
    }
    if (closeCart && cartSidebar){
      closeCart.addEventListener('click', ()=>{
        cartSidebar.style.right = '-400px';
        cartSidebar.setAttribute('aria-hidden', 'true');
      });
    }
    const checkoutBtn = byId('checkoutBtn') || $('.checkout-btn');
    if (checkoutBtn){
      checkoutBtn.addEventListener('click', ()=>{
        const cart = getCart();
        if (cart.length === 0){ alert('Your cart is empty'); return; }
        // save first item as selected product for order page compatibility
        saveSelectedProduct(cart[0]);
        window.location.href = 'oder.html';
      });
    }
  }

  // ---------- Auto Scroll (Home page devices) ----------
  function startAutoScroll(wrapperId, speed){
    const wrapper = byId(wrapperId);
    if (!wrapper) return;
    let isPaused = false;
    let pos = 0;
    const pause = () => isPaused = true;
    const resume = () => isPaused = false;
    wrapper.addEventListener('mouseenter', pause);
    wrapper.addEventListener('mouseleave', resume);
    wrapper.addEventListener('touchstart', pause, {passive:true});
    wrapper.addEventListener('touchend', ()=> setTimeout(resume, 1200));

    function tick(){
      if (!isPaused){
        pos += speed;
        const half = wrapper.scrollHeight / 2;
        if (half > 0 && pos >= half) pos = 0;
        wrapper.scrollTop = pos;
      }
      requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
  }

  function initHomeAutoScroll(){
    // duplicate content for seamless loop
    const tDup = byId('tabletDupZone');
    const tContent = byId('tabletContent');
    if (tDup && tContent) tDup.innerHTML = tContent.outerHTML;
    const pDup = byId('phoneDupZone');
    const pContent = byId('phoneContent');
    if (pDup && pContent) pDup.innerHTML = pContent.outerHTML;
    startAutoScroll('tabletWrapper', 0.6);
    startAutoScroll('phoneWrapper', 0.5);
  }

  // ---------- Categories Page Bindings ----------
  function initCategoriesPage(){
    if (!$('.food-grid')) return;
    $$('.card').forEach(card => {
      const nameEl = card.querySelector('h3');
      const priceEl = card.querySelector('p');
      const imgEl = card.querySelector('img');
      if (!nameEl) return;
      const name = nameEl.textContent.trim();
      const priceText = priceEl ? priceEl.textContent.trim() : '₹0';
      const image = imgEl ? imgEl.getAttribute('src') : '';

      // Ensure btn-box exists with 3 buttons: Order / Add Cart / Detail
      let btnBox = card.querySelector('.btn-box');
      if (!btnBox){
        btnBox = document.createElement('div');
        btnBox.className = 'btn-box';
        card.appendChild(btnBox);
      }
      // Clear existing scattered buttons and rebuild clean 3-button set
      // Keep any existing detail onclick data if present
      const existingDetailBtn = card.querySelector('button.detail, button[onclick*="showDetail"]');
      let detailOnclick = existingDetailBtn ? existingDetailBtn.getAttribute('onclick') : null;

      btnBox.innerHTML = `
        <button type="button" class="order" data-role="order">Order</button>
        <button type="button" class="addcart" data-role="cart">Add Cart</button>
        <button type="button" class="detail" data-role="detail">Detail</button>
      `;

      const orderBtn = btnBox.querySelector('[data-role="order"]');
      const cartBtn2 = btnBox.querySelector('[data-role="cart"]');
      const detailBtn = btnBox.querySelector('[data-role="detail"]');

      if (orderBtn){
        orderBtn.onclick = (e) => {
          e.preventDefault();
          e.stopPropagation();
          localStorage.setItem("directOrder", "true");
          saveSelectedProduct({ name, priceText, price: parsePrice(priceText), image });
          window.location.href = 'oder.html';
        };
      }
      if (cartBtn2){
        cartBtn2.onclick = (e)=>{
          e.preventDefault();
          e.stopPropagation();
          addToCart(name, priceText, image);
        };
      }
      if (detailBtn){
        if (detailOnclick){
          // preserve original showDetail call if it existed
          detailBtn.setAttribute('onclick', detailOnclick);
        } else {
          detailBtn.onclick = (e)=>{
            e.preventDefault();
            e.stopPropagation();
            // generic detail fallback
            showDetail(name, priceText, image,
              (name + ' – freshly prepared with premium ingredients. Loved by Foodie Express customers.'),
              '⭐⭐⭐⭐☆ (4.7)',
              '20 Min'
            );
          };
        }
      }
    });

    // Bind popup order button
    const popupOrder = document.querySelector('#popup .order, .popup-content .order');
    if (popupOrder){
      popupOrder.addEventListener('click', (e)=>{
        e.preventDefault();
        localStorage.setItem("directOrder", "true");
        orderCurrentProduct();
      });
    }
  }

  // ---------- Order Page ----------
 function initOrderPage(){

    const form = byId("orderForm");
    if(!form) return;

    // const cart = getCart();
let cart = [];

const isDirectOrder = localStorage.getItem("directOrder");

if (isDirectOrder === "true") {

    const product = getSelectedProduct();

    if (product) {

        cart.push({
            name: product.name,
            price: product.price,
            image: product.image,
            qty: 1
        });

    }

    localStorage.removeItem("directOrder");

} else {

    cart = getCart();

}

    const DELIVERY = 40;

    const subtotal = cart.reduce((sum,item)=>{
        return sum + parsePrice(item.price) * (item.qty || 1);
    },0);

    const total = subtotal + DELIVERY;

    const nameEl = byId("foodName");
    const priceEl = byId("foodPrice");
    const imgEl = byId("foodImg");

    if(cart.length){

        imgEl.src = cart[0].image;

        if(cart.length === 1){

            const item = cart[0];

            nameEl.innerHTML = `${item.name} × ${item.qty}`;

        }else{

            nameEl.innerHTML = `${cart.length} items in cart`;

        }

       let html = "";

cart.forEach(item => {

    const amount = parsePrice(item.price) * (item.qty || 1);

    html += `
        <div class="order-item">
            <span>${item.name} × ${item.qty}</span>
            <span>${fmt(amount)}</span>
        </div>
    `;
});

html += `
    <hr>

    <div class="order-row">
        <span>Subtotal</span>
        <span>${fmt(subtotal)}</span>
    </div>

    <div class="order-row">
        <span>Delivery Fee</span>
        <span>${fmt(DELIVERY)}</span>
    </div>

    <div class="order-row total">
        <span>Total</span>
        <span>${fmt(total)}</span>
    </div>
`;

priceEl.innerHTML = html;
    }

    form.addEventListener("submit",function(e){

        e.preventDefault();

        localStorage.setItem("customer_name",
        byId("name").value);

        localStorage.setItem("customer_mobile",
        byId("mobile").value);

        localStorage.setItem("customer_address",
        byId("address").value);

        window.location.href="pament.html";

    });

}

  // ---------- Payment Page ----------
  let selectedApp = '';
  function openTab(evt, id){
    $$('.content').forEach(b => b.classList.remove('active'));
    $$('.tab').forEach(b => b.classList.remove('active'));
    const target = byId(id);
    if (target) target.classList.add('active');
    if (evt && evt.currentTarget) evt.currentTarget.classList.add('active');
  }
  function showWallet(app, btn){
    selectedApp = app;
    $$('.wallet-btn').forEach(b => b.classList.remove('active'));
    if (btn) btn.classList.add('active');
    const wf = byId('walletFields'); if (wf) wf.style.display = 'none';
    const qr = byId('walletQR'); if (qr) qr.style.display = 'none';
    $$('input[name="walletOption"]').forEach(r => r.checked = false);
    const appNames = { phonepe: 'PhonePe Selected 📱', gpay: 'Google Pay Selected 📱', paytm: 'Paytm Selected 📱' };
    safe(byId('selectedAppText'), el => el.innerText = appNames[app] || 'Select Payment App');
  }
  function changeWalletOption(){
    const checked = document.querySelector('input[name="walletOption"]:checked');
    if (!checked) return;
    const option = checked.value;
    const wf = byId('walletFields');
    const qr = byId('walletQR');
    if (option === 'form'){
      if (wf) wf.style.display = 'block';
      if (qr) qr.style.display = 'none';
    } else {
      if (wf) wf.style.display = 'none';
      if (qr){
        qr.style.display = 'block';
        const upi = 'upi://pay?pa=foodie@upi&pn=FoodieExpress&am=299&cu=INR';
        qr.src = 'https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=' + encodeURIComponent(upi);
      }
    }
  }
  function fakePay(){
    if (!selectedApp){
      const upiId = byId('upiId');
      if (!upiId || !upiId.value.trim()){
        alert('Please select payment app or enter UPI ID.');
        return;
      }
    }
    paymentProcess('UPI');
  }
  function cardPayment(){
    const card = byId('cardNumber')?.value.trim();
    const holder = byId('cardHolder')?.value.trim();
    const expiry = byId('expiry')?.value.trim();
    const cvv = byId('cvv')?.value.trim();
    if (!card || !holder || !expiry || !cvv){
      alert('Fill all card details.');
      return;
    }
    paymentProcess('CARD');
  }
  function paymentProcess(type){
    const popup = byId('paymentPopup');
    if (popup) popup.style.display = 'flex';
    safe(byId('loader'), el => el.style.display = 'block');
    safe(byId('successIcon'), el => el.style.display = 'none');
    safe(byId('popupTitle'), el => el.textContent = 'Processing Payment...');
    safe(byId('popupText'), el => el.textContent = 'Please wait... (' + type + ')');
    setTimeout(()=>{
      safe(byId('loader'), el => el.style.display = 'none');
      safe(byId('successIcon'), el => el.style.display = 'block');
      safe(byId('popupTitle'), el => el.textContent = '✅ Payment Successful');
      safe(byId('popupText'), el => el.textContent = 'Redirecting...');
      // clear cart on success
      localStorage.removeItem(CART_KEY);
      localStorage.removeItem('cart');
      setTimeout(()=> { window.location.href = 'succ.html'; }, 1800);
    }, 2600);
  }

  // ---------- Tracking / Success ----------
  let trackInterval = null;
  function startTracking(){
    const isHorizontal = $$('.status-bar .step').length > 0;
    const isVertical = $$('.timeline .step').length > 0;
    
    const steps = isHorizontal ? $$('.status-bar .step') : $$('.timeline .step');
    if (!steps.length) return;
    
    let currentStep = 0;
    steps.forEach(s => s.classList.remove('active'));
    if (steps[0]) steps[0].classList.add('active');
    
    const timeline = $('.timeline');
    const progressLine = isHorizontal ? $('.progress-line') : null;
    
    if (progressLine && !progressLine.querySelector('.progress-fill')){
        progressLine.insertAdjacentHTML('beforeend', '<div class="progress-fill"></div>');
    }
    const fill = isHorizontal ? $('.progress-fill') : null;

    if (trackInterval) clearInterval(trackInterval);
    
    trackInterval = setInterval(()=>{
      if (currentStep < steps.length - 1){
        currentStep++;
        
        // Update visual steps
        steps.forEach(s => s.classList.remove('active'));
        if (steps[currentStep]) steps[currentStep].classList.add('active');
        
        // Update progress
        if (isHorizontal && fill){
          const percent = (currentStep / (steps.length - 1)) * 100;
          fill.style.width = percent + '%';
        } else if (timeline){
          const percent = (currentStep / (steps.length - 1)) * 100;
          timeline.style.setProperty('--fill', percent + '%');
        }

        // Trigger popup only for horizontal stepper (traking.html)
        if (isHorizontal){
            const label = steps[currentStep].querySelector('.label');
            if (label) showStatusPopup(label.textContent);
        }

        const circle = steps[currentStep].querySelector('.circle');
        if (circle && !circle.innerHTML.trim()) circle.innerHTML = '<i class="fa-solid fa-check"></i>';

      } else {
        clearInterval(trackInterval);
        const mapEl = byId('map');
        if (mapEl) mapEl.textContent = 'Order Delivered 🎉';
        const popup = byId('popup') || byId('trackingPopup');
        if (popup) setTimeout(()=> { popup.style.display = 'flex'; }, 600);
      }
    }, isHorizontal ? 4000 : 2500); // Different speeds for different pages
  }

  function showStatusPopup(status){
    const popup = byId('trackingPopup');
    if (!popup) return;

    const box = popup.querySelector('.tracking-popup-box');
    if (!box) return;

    box.innerHTML = `
        <h3>🔔 Order Update</h3>
        <p style="font-size: 18px; margin: 15px 0;">Your order is now: <br><strong>${status}</strong></p>
        <button onclick="closePopup()">Awesome!</button>
    `;
    
    popup.style.display = 'flex';
    
    // Auto-close status popup after 3 seconds so it doesn't block the map
    setTimeout(() => {
      closePopup();
    }, 3000);
  }

  let countdownTimer = null;
  let timeLeft = 1500; // 25 min in seconds for succ.html
  function startCountdown(){
    const etaEl = byId('eta');
    const mapEl = byId('map');
    if (!etaEl && !mapEl) return;
    if (countdownTimer) clearInterval(countdownTimer);
    // if page is traking.html small demo, use 30 sec
    if (document.querySelector('.status') && !etaEl) timeLeft = 30;
    countdownTimer = setInterval(()=>{
      if (timeLeft <= 0){
        clearInterval(countdownTimer);
        if (etaEl) etaEl.textContent = 'Delivered';
        if (mapEl && mapEl.textContent.includes('Estimated')) mapEl.textContent = 'Delivery Completed ✔';
        return;
      }
      const min = Math.floor(timeLeft / 60);
      const sec = timeLeft % 60;
      if (etaEl) etaEl.textContent = min + ' min ' + (sec < 10 ? '0' : '') + sec + ' sec';
      if (mapEl && !window.L){ // only if leaflet not running
        mapEl.textContent = 'Estimated Delivery in ' + timeLeft + ' sec';
      }
      timeLeft--;
    }, 1000);
  }

  function callSupport(){
    alert('Calling Support 📞...\n+91 98765 43210');
  }

  function payNow(){
    // unified entry: if on payment page, run cardPayment/fakePay, else start tracking
    if (byId('cardNumber') || byId('upiId')){
      // try card first then UPI
      const cardEl = byId('cardNumber');
      if (cardEl && cardEl.value) { cardPayment(); return; }
      fakePay();
      return;
    }
    alert('Payment Successful ✅');
    startTracking();
    startCountdown();
    const boy = byId('deliveryBoy');
    if (boy){
      let pos = 0;
      const mv = setInterval(()=>{
        pos += 10;
        boy.style.marginLeft = pos + '%';
        if (pos >= 80) clearInterval(mv);
      }, 1800);
    }
  }

  // ---------- Chat ----------
  function initChat(){
    const chatInput = byId('chatInput');
    const chatBody = byId('chatBody');
    if (!chatInput || !chatBody) return;
    chatInput.addEventListener('keypress', function(e){
      if (e.key === 'Enter' && this.value.trim()){
        const msg = this.value.trim();
        chatBody.insertAdjacentHTML('beforeend', `<p><b>You:</b> ${msg}</p>`);
        this.value = '';
        chatBody.scrollTop = chatBody.scrollHeight;
        setTimeout(()=>{
          chatBody.insertAdjacentHTML('beforeend', `<p><b>Support:</b> Got it 👍 We are on it!</p>`);
          chatBody.scrollTop = chatBody.scrollHeight;
        }, 900);
      }
    });
  }

  // ---------- Popup outside click ----------
  function initPopupClose(){
    document.addEventListener('click', (e)=>{
      const popup = byId('popup');
      if (popup && e.target === popup) closePopup();
      const payPopup = byId('paymentPopup');
      // do not close payment popup by outside click to avoid abort
    });
    // close buttons
    $$('.close, [data-close-popup]').forEach(btn=>{
      btn.addEventListener('click', closePopup);
    });
  }

  // ---------- Init ----------
  document.addEventListener('DOMContentLoaded', ()=>{
    ensureNavbar();
    ensureCartSidebar();
    initNavbarEvents();
    updateCartCount();
    loadCart();
    initPopupClose();
    initChat();

    // page specific
    if (byId('tabletWrapper') || byId('phoneWrapper')) initHomeAutoScroll();
    initCategoriesPage();
    initOrderPage();

    // payment page defaults
    if ($('.tabs')) {
      // ensure first tab active if none
      if (!document.querySelector('.tab.active') && $('.tab')) $('.tab').classList.add('active');
      if (!document.querySelector('.content.active') && $('.content')) $('.content').classList.add('active');
    }

    // tracking / success auto-start
    if ($('.timeline') || $('.status') || $('.status-container')){
      // auto start after short delay (simulates payment success landing)
      setTimeout(()=> { startTracking(); startCountdown(); }, 800);
    }
    // auto countdown if map element with no leaflet
    if (byId('map') && !window.L){
      startCountdown();
    }

    // auto show thank-you popup on succ.html after a delay (if #popup or #trackingPopup exists)
    const thankPopup = byId('popup') || byId('trackingPopup');
    if (thankPopup && document.querySelector('.delivery-boy')){
      // don't auto-show immediately, tracking will show at end
    } else if (thankPopup && $('.status')){
      setTimeout(()=> { thankPopup.style.display = 'flex'; }, 4000);
    }
  });

  // ---------- Expose required global functions ----------
  window.showDetail = showDetail;
  window.closePopup = closePopup;
  window.addToCart = addToCart;
  window.loadCart = loadCart;
  window.updateCartCount = updateCartCount;
  window.removeItem = removeItem;
  window.changeQty = changeQty;
  window.increaseQty = increaseQty;
  window.decreaseQty = decreaseQty;
  window.openTab = openTab;
  window.showWallet = showWallet;
  window.changeWalletOption = changeWalletOption;
  window.fakePay = fakePay;
  window.cardPayment = cardPayment;
  window.paymentProcess = paymentProcess;
  window.payNow = payNow;
  window.callSupport = callSupport;
  window.startTracking = startTracking;
  window.startCountdown = startCountdown;

  // helpful extras (not required but safe)
  window.orderCurrentProduct = orderCurrentProduct;

})();
