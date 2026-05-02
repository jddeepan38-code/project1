const perfumes = [
  {
    name: "Noir Velvet",
    note: "oriental",
    description: "Dark rose, oud, and warm vanilla musk.",
    price: 92
  },
  {
    name: "Citrus Bloom",
    note: "fresh",
    description: "Bergamot, neroli, and soft white tea.",
    price: 68
  },
  {
    name: "Silk Petals",
    note: "floral",
    description: "Jasmine, peony, and clean powder notes.",
    price: 74
  },
  {
    name: "Cedar Veil",
    note: "woody",
    description: "Cedarwood, iris, and amber resin.",
    price: 88
  },
  {
    name: "Amber Dusk",
    note: "oriental",
    description: "Saffron, tonka bean, and smoky amber.",
    price: 96
  },
  {
    name: "Morning Dew",
    note: "fresh",
    description: "Green pear, mint, and aquatic musk.",
    price: 62
  }
];

const perfumeGrid = document.getElementById("perfumeGrid");
const searchInput = document.getElementById("searchInput");
const noteFilter = document.getElementById("noteFilter");
const sortSelect = document.getElementById("sortSelect");
const newsletterForm = document.getElementById("newsletterForm");
const emailInput = document.getElementById("emailInput");
const formMessage = document.getElementById("formMessage");
const themeToggle = document.getElementById("themeToggle");
const toTopBtn = document.getElementById("toTopBtn");

const favorites = new Set();

function renderPerfumes() {
  const query = searchInput.value.trim().toLowerCase();
  const selectedNote = noteFilter.value;
  const sort = sortSelect.value;

  let list = perfumes.filter((item) => {
    const byName = item.name.toLowerCase().includes(query);
    const byNote = selectedNote === "all" || item.note === selectedNote;
    return byName && byNote;
  });

  if (sort === "low-high") {
    list.sort((a, b) => a.price - b.price);
  } else if (sort === "high-low") {
    list.sort((a, b) => b.price - a.price);
  } else if (sort === "name") {
    list.sort((a, b) => a.name.localeCompare(b.name));
  }

  perfumeGrid.innerHTML = list
    .map((item) => {
      const active = favorites.has(item.name) ? "active" : "";
      return `
        <article class="perfume-card">
          <div class="perfume-top">
            <div>
              <h3>${item.name}</h3>
              <span class="note-chip">${item.note}</span>
            </div>
            <button class="fav-btn ${active}" data-name="${item.name}" type="button">❤</button>
          </div>
          <p>${item.description}</p>
          <div class="card-actions">
            <span class="price">$${item.price}</span>
            <small>${favorites.has(item.name) ? "Saved" : "Add to favorites"}</small>
          </div>
        </article>
      `;
    })
    .join("");

  bindFavoriteButtons();
}

function bindFavoriteButtons() {
  document.querySelectorAll(".fav-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      const { name } = btn.dataset;
      if (favorites.has(name)) {
        favorites.delete(name);
      } else {
        favorites.add(name);
      }
      renderPerfumes();
    });
  });
}

searchInput.addEventListener("input", renderPerfumes);
noteFilter.addEventListener("change", renderPerfumes);
sortSelect.addEventListener("change", renderPerfumes);

newsletterForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const email = emailInput.value.trim();
  const valid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

  if (!valid) {
    formMessage.textContent = "Please enter a valid email address.";
    formMessage.style.color = "#d83b3b";
    return;
  }

  formMessage.textContent = `Thank you! ${email} is now subscribed.`;
  formMessage.style.color = "#24a148";
  newsletterForm.reset();
});

themeToggle.addEventListener("click", () => {
  document.body.classList.toggle("dark");
  const dark = document.body.classList.contains("dark");
  themeToggle.textContent = dark ? "☀" : "🌙";
});

window.addEventListener("scroll", () => {
  if (window.scrollY > 300) {
    toTopBtn.classList.add("show");
  } else {
    toTopBtn.classList.remove("show");
  }
});

toTopBtn.addEventListener("click", () => {
  window.scrollTo({ top: 0, behavior: "smooth" });
});

renderPerfumes();
