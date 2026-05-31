import {
  SITE,
  SERVICES,
  FLEET,
  FEATURES,
  HERO_CHECKS,
  FAQS,
} from "./config.js";
import {
  fleetIcons,
  featureIcons,
  serviceIcons,
  specIcons,
  checkIcon,
  starIcon,
  chevronDown,
  contactIcons,
} from "./icons.js";

// Helper to create DOM nodes with attributes and children
function el(tag, attrs = {}, children = []) {
  const node = document.createElement(tag);
  Object.entries(attrs).forEach(([k, v]) => {
    if (k === "className") node.className = v;
    else if (k === "html") node.innerHTML = v;
    else if (k.startsWith("on") && typeof v === "function")
      node.addEventListener(k.slice(2).toLowerCase(), v);
    else node.setAttribute(k, v);
  });
  children.forEach((c) => {
    if (typeof c === "string") node.appendChild(document.createTextNode(c));
    else if (c) node.appendChild(c);
  });
  return node;
}

function renderHeroChecks(container) {
  if (!container) return;
  HERO_CHECKS.forEach((text) => {
    const li = el("li", { html: `${checkIcon}<span>${text}</span>` });
    container.appendChild(li);
  });
}

function renderFeatures(container) {
  if (!container) return;
  setTimeout(() => {
    container.innerHTML = "";
    FEATURES.forEach(({ label, icon }, idx) => {
      const pill = el("div", { className: "feature-pill", style: `--delay: ${idx * 0.1}s` }, [
        el("div", { className: "feature-pill__icon", html: featureIcons[icon] }),
        el("span", { className: "feature-pill__label" }, [label]),
      ]);
      container.appendChild(pill);
    });
  }, 800);
}

function renderServices(container) {
  if (!container) return;
  setTimeout(() => {
    container.innerHTML = "";
    SERVICES.forEach(({ title, desc, icon }, idx) => {
      const card = el("div", { className: "services-card", style: `--delay: ${idx * 0.08}s` }, [
        el("div", { className: "services-card__icon", html: serviceIcons[icon] }),
        el("div", { className: "services-card__body" }, [
          el("h3", { className: "services-card__title" }, [title]),
          el("p", { className: "services-card__desc" }, [desc]),
        ]),
      ]);
      container.appendChild(card);
    });
  }, 1000);
}

function renderFleet(container, filter = "all") {
  if (!container) return;
  
  const hasSkeletons = container.querySelector('.skeleton-fleet');
  
  const doRender = () => {
    container.innerHTML = "";
    const filtered = FLEET.filter(
      (item) => filter === "all" || item.category === filter
    );
    
    filtered.forEach(({ type, models, icon, specs }, idx) => {
      const card = el("article", { className: "fleet-card", style: `--delay: ${idx * 0.12}s` }, [
        el("div", { className: "fleet-card__image" }, [
          el("div", { html: fleetIcons[icon] || fleetIcons.sedan }),
          el("span", { className: "fleet-card__badge" }, [type]),
        ]),
        el("div", { className: "fleet-card__body" }, [
          el("div", { className: "fleet-card__title-row" }, [
            el("h3", { className: "fleet-card__type" }, [type]),
          ]),
          el("p", { className: "fleet-card__models" }, [models]),
          el("div", { className: "fleet-card__specs" }, [
            el("div", { className: "fleet-spec-item", html: `${specIcons.seats} <span>${specs.seats}</span>` }),
            el("div", { className: "fleet-spec-item", html: `${specIcons.luggage} <span>${specs.luggage}</span>` }),
            el("div", { className: "fleet-spec-item", html: `${specIcons.ac} <span>${specs.ac}</span>` }),
            el("div", { className: "fleet-spec-item", html: `${specIcons.rate} <span>Chauffeur</span>` }),
          ]),
          el("button", {
            className: "btn btn-primary fleet-card__btn",
            type: "button",
            onclick: () => selectAndBookVehicle(type),
          }, ["Book Now"]),
        ]),
      ]);
      container.appendChild(card);
    });
  };

  if (hasSkeletons) {
    setTimeout(doRender, 1200);
  } else {
    doRender();
  }
}

let selectedVehicle = "";
let goToWizardStepGlobal = null;

function selectAndBookVehicle(vehicleType) {
  selectedVehicle = vehicleType;
  const input = document.getElementById("selected-vehicle-input");
  if (input) input.value = vehicleType;
  
  renderWizardVehicles();
  
  const nextBtn = document.getElementById("btn-vehicle-next");
  if (nextBtn) nextBtn.removeAttribute("disabled");
  
  if (typeof goToWizardStepGlobal === "function") {
    goToWizardStepGlobal(2);
  }
  
  const heroBooking = document.querySelector(".hero__booking");
  if (heroBooking) {
    heroBooking.scrollIntoView({ behavior: "smooth", block: "center" });
  }
}

function renderWizardVehicles() {
  const container = document.getElementById("wizard-vehicle-list");
  if (!container) return;
  container.innerHTML = "";
  
  FLEET.forEach((v) => {
    const card = el("div", {
      className: `wizard-vehicle-card ${selectedVehicle === v.type ? "selected" : ""}`,
      onclick: () => {
        selectedVehicle = v.type;
        const input = document.getElementById("selected-vehicle-input");
        if (input) input.value = v.type;
        
        renderWizardVehicles();
        
        const nextBtn = document.getElementById("btn-vehicle-next");
        if (nextBtn) nextBtn.removeAttribute("disabled");
      }
    }, [
      el("div", { className: "wizard-vehicle-info" }, [
        el("div", { className: "wizard-vehicle-icon", html: fleetIcons[v.icon] || fleetIcons.sedan }),
        el("div", { className: "wizard-vehicle-details" }, [
          el("h5", {}, [v.type]),
          el("p", {}, [`${v.specs.seats} · ${v.specs.luggage} · ${v.specs.ac}`])
        ])
      ])
    ]);
    container.appendChild(card);
  });
}

function updateWizardSummary(data) {
  const summaryDetails = document.getElementById("booking-summary-details");
  if (!summaryDetails) return;
  summaryDetails.innerHTML = "";
  
  const tab = data.get("tab")?.toString();
  
  const addSummaryRow = (label, val) => {
    summaryDetails.appendChild(el("div", { className: "summary-row" }, [
      el("span", {}, [label]),
      el("strong", {}, [val])
    ]));
  };

  if (tab === "outstation") {
    const type = data.get("outstation_type")?.toString();
    const pickup = data.get("outstation_pickup")?.toString().trim();
    const drop = data.get("outstation_drop")?.toString().trim();
    const date = data.get("outstation_date")?.toString();
    const returnDate = data.get("outstation_return")?.toString();
    
    addSummaryRow("Service", `Outstation (${type})`);
    addSummaryRow("Pickup", pickup);
    addSummaryRow("Drop", drop);
    addSummaryRow("Date", date);
    if (type === "Round-Trip" && returnDate) {
      addSummaryRow("Return", returnDate);
    }
  } else if (tab === "local") {
    const pkg = data.get("local_package")?.toString();
    const pickup = data.get("local_pickup")?.toString().trim();
    const date = data.get("local_date")?.toString();
    const time = data.get("local_time")?.toString();
    
    addSummaryRow("Service", "Local Rental");
    addSummaryRow("Package", pkg);
    addSummaryRow("Pickup", pickup);
    addSummaryRow("Date", `${date} at ${time}`);
  } else if (tab === "airport") {
    const type = data.get("airport_type")?.toString() === "Pickup-From-Airport" ? "Airport Pickup" : "Airport Drop";
    const terminal = data.get("airport_terminal")?.toString();
    const address = data.get("airport_address")?.toString().trim();
    const date = data.get("airport_date")?.toString();
    const flight = data.get("airport_flight")?.toString().trim();
    
    addSummaryRow("Service", type);
    addSummaryRow("Terminal", terminal);
    addSummaryRow(type === "Airport Pickup" ? "Drop Address" : "Pickup Address", address);
    addSummaryRow("Date", date);
    if (flight) {
      addSummaryRow("Flight No.", flight);
    }
  }
  
  addSummaryRow("Vehicle Class", selectedVehicle || "Not selected");
}

function initBookingWizard() {
  const wizardForm = document.getElementById("booking-wizard-form");
  if (!wizardForm) return;
  
  // Tab toggles in Step 1
  const tabBtns = wizardForm.querySelectorAll(".booking-tab-btn");
  const tabInput = document.getElementById("booking-tab-input");
  const tabPanels = wizardForm.querySelectorAll(".booking-tab-content");
  
  tabBtns.forEach((btn) => {
    btn.addEventListener("click", () => {
      tabBtns.forEach((b) => b.classList.remove("is-active"));
      tabPanels.forEach((p) => p.classList.remove("is-active"));
      
      btn.classList.add("is-active");
      const tab = btn.getAttribute("data-tab");
      if (tabInput) tabInput.value = tab;
      
      const activePanel = document.getElementById(`tab-${tab}-fields`);
      if (activePanel) activePanel.classList.add("is-active");
    });
  });
  
  // Field toggles
  const toggleBtns = wizardForm.querySelectorAll(".form-toggle-btn");
  toggleBtns.forEach((btn) => {
    btn.addEventListener("click", () => {
      const group = btn.getAttribute("data-toggle");
      const val = btn.getAttribute("data-value");
      
      const parent = btn.parentElement;
      parent?.querySelectorAll(".form-toggle-btn").forEach((b) => b.classList.remove("is-active"));
      btn.classList.add("is-active");
      
      if (group === "outstation-type") {
        const outstationInput = document.getElementById("outstation-type-input");
        if (outstationInput) outstationInput.value = val;
        
        const returnGroup = document.getElementById("outstation-return-group");
        if (returnGroup) {
          returnGroup.style.display = val === "Round-Trip" ? "" : "none";
        }
      } else if (group === "airport-type") {
        const airportInput = document.getElementById("airport-type-input");
        if (airportInput) airportInput.value = val;
        
        const addressLabel = document.getElementById("airport-address-label");
        const addressInput = document.getElementById("airport-address");
        if (val === "Pickup-From-Airport") {
          if (addressLabel) addressLabel.textContent = "Drop Address in Delhi NCR *";
          if (addressInput) addressInput.placeholder = "e.g. Hotel, home, or office address";
        } else {
          if (addressLabel) addressLabel.textContent = "Pickup Address in Delhi NCR *";
          if (addressInput) addressInput.placeholder = "e.g. Home, office, or hotel location";
        }
      }
    });
  });

  // Step transitions
  let currentStep = 1;
  const indicators = document.querySelectorAll(".wizard-step-indicator");
  const stepLines = document.querySelectorAll(".wizard-step-line");
  const panes = document.querySelectorAll(".wizard-pane");
  
  const goToStep = (step) => {
    currentStep = step;
    
    panes.forEach((pane) => {
      const pNum = parseInt(pane.getAttribute("data-pane"));
      if (pNum === step) {
        pane.classList.add("active");
      } else {
        pane.classList.remove("active");
      }
    });
    
    indicators.forEach((ind) => {
      const indStep = parseInt(ind.getAttribute("data-step"));
      ind.classList.remove("active", "completed");
      if (indStep === step) {
        ind.classList.add("active");
      } else if (indStep < step) {
        ind.classList.add("completed");
      }
    });
    
    stepLines.forEach((line, idx) => {
      if (idx < step - 1) {
        line.classList.add("active");
      } else {
        line.classList.remove("active");
      }
    });
  };

  goToWizardStepGlobal = goToStep;

  const validateStep1 = () => {
    const data = new FormData(wizardForm);
    const tab = data.get("tab")?.toString();
    
    if (tab === "outstation") {
      const pickup = data.get("outstation_pickup")?.toString().trim();
      const drop = data.get("outstation_drop")?.toString().trim();
      const date = data.get("outstation_date")?.toString();
      const type = data.get("outstation_type")?.toString();
      const returnDate = data.get("outstation_return")?.toString();
      
      if (!pickup || !drop || !date) return "Please fill in all required outstation fields.";
      if (type === "Round-Trip" && !returnDate) return "Please specify return date for Round-Trip travel.";
    } else if (tab === "local") {
      const pickup = data.get("local_pickup")?.toString().trim();
      const date = data.get("local_date")?.toString();
      const time = data.get("local_time")?.toString();
      
      if (!pickup || !date || !time) return "Please fill in all required local rental fields.";
    } else if (tab === "airport") {
      const address = data.get("airport_address")?.toString().trim();
      const date = data.get("airport_date")?.toString();
      
      if (!address || !date) return "Please fill terminal details and travel date.";
    }
    return null;
  };

  // Bind Next/Prev actions
  document.querySelectorAll(".btn-next-step").forEach((btn) => {
    btn.addEventListener("click", () => {
      if (currentStep === 1) {
        const error = validateStep1();
        if (error) {
          alert(error);
          return;
        }
        renderWizardVehicles();
        goToStep(2);
      } else if (currentStep === 2) {
        if (!selectedVehicle) {
          alert("Please select a vehicle class to continue.");
          return;
        }
        updateWizardSummary(new FormData(wizardForm));
        goToStep(3);
      }
    });
  });

  document.querySelectorAll(".btn-prev-step").forEach((btn) => {
    btn.addEventListener("click", () => {
      if (currentStep > 1) {
        goToStep(currentStep - 1);
      }
    });
  });

  // Submit enquiry
  wizardForm.addEventListener("submit", (e) => {
    e.preventDefault();
    const data = new FormData(wizardForm);
    const name = data.get("name")?.toString().trim();
    const phone = data.get("phone")?.toString().trim();
    const notes = data.get("notes")?.toString().trim();
    const message = document.getElementById("form-message");
    
    if (!name || !phone || phone.length < 10) {
      showMessage(message, "Please enter your name and a valid 10-digit mobile number.", "error");
      return;
    }
    
    const tab = data.get("tab")?.toString();
    const lines = [`*Saamarth Mobility & Tours Booking Enquiry*`];
    lines.push(`Name: ${name}`);
    lines.push(`Phone: ${phone}`);
    lines.push(`Vehicle Choice: ${selectedVehicle}`);
    
    if (tab === "outstation") {
      const type = data.get("outstation_type")?.toString();
      const pickup = data.get("outstation_pickup")?.toString().trim();
      const drop = data.get("outstation_drop")?.toString().trim();
      const travelDate = data.get("outstation_date")?.toString();
      const returnDate = data.get("outstation_return")?.toString();
      
      lines.push(`Service: Outstation Cab (${type})`);
      lines.push(`Pickup City: ${pickup}`);
      lines.push(`Destination City: ${drop}`);
      lines.push(`Travel Date: ${travelDate}`);
      if (type === "Round-Trip" && returnDate) {
        lines.push(`Return Date: ${returnDate}`);
      }
    } else if (tab === "local") {
      const pkg = data.get("local_package")?.toString();
      const pickup = data.get("local_pickup")?.toString().trim();
      const date = data.get("local_date")?.toString();
      const time = data.get("local_time")?.toString();
      
      lines.push(`Service: Local City Cab`);
      lines.push(`Package Selected: ${pkg}`);
      lines.push(`Pickup Address: ${pickup}`);
      lines.push(`Travel Date: ${date} at ${time}`);
    } else if (tab === "airport") {
      const transferType = data.get("airport_type")?.toString() === "Pickup-From-Airport" ? "Airport Pickup" : "Airport Drop";
      const terminal = data.get("airport_terminal")?.toString();
      const address = data.get("airport_address")?.toString().trim();
      const travelDate = data.get("airport_date")?.toString();
      const flightNo = data.get("airport_flight")?.toString().trim();
      
      lines.push(`Service: ${transferType}`);
      lines.push(`Terminal: ${terminal}`);
      lines.push(transferType === "Airport Pickup" ? `Drop Location: ${address}` : `Pickup Location: ${address}`);
      lines.push(`Travel Date: ${travelDate}`);
      if (flightNo) {
        lines.push(`Flight Number: ${flightNo}`);
      }
    }
    
    if (notes) {
      lines.push(`Additional Notes: ${notes}`);
    }
    
    const waUrl = `https://wa.me/${SITE.whatsapp}?text=${encodeURIComponent(lines.join("\n"))}`;
    window.open(waUrl, "_blank", "noopener,noreferrer");
    
    showMessage(message, "Enquiry prepared! opening WhatsApp to send your message...", "success");
    
    setTimeout(() => {
      wizardForm.reset();
      selectedVehicle = "";
      goToStep(1);
      
      const outTypeInput = document.getElementById("outstation-type-input");
      if (outTypeInput) outTypeInput.value = "One-Way";
      const retGroup = document.getElementById("outstation-return-group");
      if (retGroup) retGroup.style.display = "none";
      
      const airTypeInput = document.getElementById("airport-type-input");
      if (airTypeInput) airTypeInput.value = "Pickup-From-Airport";
      const addLabel = document.getElementById("airport-address-label");
      if (addLabel) addLabel.textContent = "Drop Address in Delhi NCR *";
      
      document.querySelectorAll(".form-toggle-btn").forEach((btn) => {
        const val = btn.getAttribute("data-value");
        if (val === "One-Way" || val === "Pickup-From-Airport") {
          btn.classList.add("is-active");
        } else {
          btn.classList.remove("is-active");
        }
      });
      
      const vehicleNextBtn = document.getElementById("btn-vehicle-next");
      if (vehicleNextBtn) vehicleNextBtn.setAttribute("disabled", "true");
    }, 2000);
  });
}

function initFleetFilters(container) {
  const filterContainer = document.getElementById("fleet-filters");
  if (!filterContainer) return;
  
  filterContainer.addEventListener("click", (e) => {
    const btn = e.target.closest(".fleet-filter-btn");
    if (!btn) return;
    
    filterContainer
      .querySelectorAll(".fleet-filter-btn")
      .forEach((b) => b.classList.remove("is-active"));
    
    btn.classList.add("is-active");
    const filterValue = btn.getAttribute("data-filter");
    renderFleet(container, filterValue);
  });
}



function renderFAQs() {
  const container = document.getElementById("faq-grid");
  if (!container) return;
  container.innerHTML = "";
  
  FAQS.forEach(({ question, answer }) => {
    const item = el("div", { className: "faq-item" });
    const header = el("button", {
      className: "faq-header",
      type: "button",
      html: `<span>${question}</span>${chevronDown}`,
      onclick: () => {
        const isOpen = item.classList.contains("is-open");
        
        document.querySelectorAll(".faq-item").forEach((el) => {
          el.classList.remove("is-open");
          const bodyEl = el.querySelector(".faq-body");
          if (bodyEl) bodyEl.style.maxHeight = null;
        });
        
        if (!isOpen) {
          item.classList.add("is-open");
          const body = item.querySelector(".faq-body");
          if (body) body.style.maxHeight = body.scrollHeight + "px";
        }
      },
    });
    
    const body = el("div", { className: "faq-body" }, [
      el("div", { className: "faq-content" }, [answer]),
    ]);
    
    item.appendChild(header);
    item.appendChild(body);
    container.appendChild(item);
  });
}



function initMouseFollowGlow() {
  const glow = document.getElementById("cursor-glow");
  if (!glow) return;
  
  document.addEventListener("mousemove", (e) => {
    glow.style.left = `${e.clientX}px`;
    glow.style.top = `${e.clientY}px`;
  });
}

function initScrollEffects() {
  const heroBg = document.getElementById("hero-bg");
  if (!heroBg) return;
  
  window.addEventListener("scroll", () => {
    const offset = window.scrollY * 0.28;
    heroBg.style.transform = `translateY(${offset}px)`;
  });
}

function initNav() {
  const toggle = document.querySelector(".nav-toggle");
  const nav = document.querySelector(".site-nav");
  const header = document.querySelector(".site-header");

  toggle?.addEventListener("click", () => {
    const open = toggle.getAttribute("aria-expanded") === "true";
    toggle.setAttribute("aria-expanded", String(!open));
    nav?.classList.toggle("is-open", !open);
    document.body.style.overflow = open ? "" : "hidden";
  });

  nav?.querySelectorAll("a").forEach((link) => {
    link.addEventListener("click", () => {
      toggle?.setAttribute("aria-expanded", "false");
      nav?.classList.remove("is-open");
      document.body.style.overflow = "";
    });
  });

  window.addEventListener("scroll", () => {
    header?.classList.toggle("is-scrolled", window.scrollY > 8);
  });
}

function showMessage(node, text, type) {
  if (!node) return;
  node.textContent = text;
  node.className = `form-message form-message--${type} is-visible`;
  node.scrollIntoView({ behavior: "smooth", block: "nearest" });
}

function populateContact() {
  const phoneContainer = document.getElementById("contact-phones");
  const bookingPhones = document.getElementById("booking-phones");

  SITE.phones.forEach((num, i) => {
    phoneContainer?.appendChild(
      el("a", { href: `tel:+91${num}`, className: "contact__phone-link" }, [num])
    );
    if (bookingPhones) {
      if (i > 0) bookingPhones.appendChild(document.createTextNode(" · "));
      bookingPhones.appendChild(el("a", { href: `tel:+91${num}` }, [num]));
    }
  });

  const emailLink = document.getElementById("contact-email");
  if (emailLink) {
    emailLink.href = `mailto:${SITE.email}`;
    emailLink.textContent = SITE.email;
  }

  const addressEl = document.getElementById("contact-address");
  if (addressEl) {
    addressEl.textContent = SITE.address;
  }

  const mapsLink = document.getElementById("maps-link");
  if (mapsLink) {
    mapsLink.href = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(SITE.mapsQuery)}`;
  }

  const waFloat = document.getElementById("whatsapp-float");
  if (waFloat) {
    waFloat.href = `https://wa.me/${SITE.whatsapp}?text=${encodeURIComponent("Hi Saamarth Mobility, I'd like to book a cab.")}`;
  }
}

function initScrollReveal() {
  const reveals = document.querySelectorAll(".reveal");
  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-visible");
          observer.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.1 }
  );
  reveals.forEach((r) => observer.observe(r));
}

document.addEventListener("DOMContentLoaded", () => {
  renderHeroChecks(document.getElementById("hero-checks"));
  renderFeatures(document.getElementById("features-grid"));
  renderServices(document.getElementById("services-grid"));
  
  const fleetGrid = document.getElementById("fleet-grid");
  renderFleet(fleetGrid);
  initFleetFilters(fleetGrid);
  renderFAQs();
  initNav();
  initBookingWizard();
  populateContact();
  initScrollReveal();
  initMouseFollowGlow();
  initScrollEffects();

  const yearEl = document.getElementById("year");
  if (yearEl) yearEl.textContent = String(new Date().getFullYear());
});

