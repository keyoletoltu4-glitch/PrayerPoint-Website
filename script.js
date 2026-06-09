const seedRequests = [
  {
    id: crypto.randomUUID(),
    name: "Amara",
    category: "Healing",
    message: "Please pray for strength and healing for my mum as she recovers this week.",
    openToConnect: true,
    prayers: 12,
    createdAt: Date.now() - 1000 * 60 * 45,
  },
  {
    id: crypto.randomUUID(),
    name: "Anonymous",
    category: "Guidance",
    message: "I need wisdom for a major decision and peace while I wait for clarity.",
    openToConnect: true,
    prayers: 8,
    createdAt: Date.now() - 1000 * 60 * 140,
  },
  {
    id: crypto.randomUUID(),
    name: "Daniel",
    category: "Family",
    message: "Pray for reconciliation and patience in my family conversations.",
    openToConnect: false,
    prayers: 5,
    createdAt: Date.now() - 1000 * 60 * 250,
  },
];

const dailyVerses = [
  {
    text: "Pray without ceasing.",
    reference: "1 Thessalonians 5:17",
  },
  {
    text: "The Lord is my shepherd; I shall not want.",
    reference: "Psalm 23:1",
  },
  {
    text: "Be still, and know that I am God.",
    reference: "Psalm 46:10",
  },
  {
    text: "The Lord is my strength and my shield.",
    reference: "Psalm 28:7",
  },
  {
    text: "Cast thy burden upon the Lord, and he shall sustain thee.",
    reference: "Psalm 55:22",
  },
  {
    text: "I can do all things through Christ which strengtheneth me.",
    reference: "Philippians 4:13",
  },
  {
    text: "The Lord bless thee, and keep thee.",
    reference: "Numbers 6:24",
  },
];

const storageKey = "prayer-circle-requests";
const list = document.querySelector("#prayer-list");
const form = document.querySelector("#share");
const filter = document.querySelector("#filter");
const formNote = document.querySelector("#form-note");
const requestCount = document.querySelector("#request-count");
const prayerCount = document.querySelector("#prayer-count");
const dailyVerseText = document.querySelector("#daily-verse-text");
const dailyVerseReference = document.querySelector("#daily-verse-reference");
const nameInput = document.querySelector("#name");
const anonymousInput = document.querySelector("#post-anonymous");
const openToConnectInput = document.querySelector("#open-to-connect");

const blockedWords = [
  "arse",
  "asshole",
  "bastard",
  "bitch",
  "bollocks",
  "bullshit",
  "crap",
  "cunt",
  "damn",
  "dick",
  "fag",
  "faggot",
  "fuck",
  "motherfucker",
  "nigger",
  "piss",
  "prick",
  "pussy",
  "shit",
  "slut",
  "twat",
  "whore",
];

const loadRequests = () => {
  const saved = localStorage.getItem(storageKey);
  return saved ? JSON.parse(saved) : seedRequests;
};

let requests = loadRequests();

const saveRequests = () => {
  localStorage.setItem(storageKey, JSON.stringify(requests));
};

const escapeHtml = (value) =>
  value.replace(
    /[&<>"']/g,
    (character) =>
      ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#039;",
      })[character],
  );

const hasBlockedWords = (value) => {
  const cleanValue = value.toLowerCase();
  return blockedWords.some((word) => {
    const pattern = new RegExp(`(^|[^a-z])${word}([^a-z]|$)`, "i");
    return pattern.test(cleanValue);
  });
};

const timeAgo = (timestamp) => {
  const minutes = Math.max(1, Math.round((Date.now() - timestamp) / 60000));
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} hr ago`;
  return `${Math.round(hours / 24)} days ago`;
};

const updateStats = () => {
  requestCount.textContent = requests.length;
  prayerCount.textContent = requests.reduce((sum, request) => sum + request.prayers, 0);
};

const renderDailyVerse = () => {
  const dayNumber = Math.floor(Date.now() / 86400000);
  const verse = dailyVerses[dayNumber % dailyVerses.length];
  dailyVerseText.textContent = verse.text;
  dailyVerseReference.textContent = verse.reference;
};

const renderRequests = () => {
  const activeFilter = filter.value;
  const visibleRequests =
    activeFilter === "All"
      ? requests
      : requests.filter((request) => (request.category || "Uncategorized") === activeFilter);

  updateStats();
  list.innerHTML = "";

  if (!visibleRequests.length) {
    list.innerHTML =
      '<div class="empty-state">No prayer points in this category yet. You can be the first to share one.</div>';
    return;
  }

  visibleRequests
    .sort((a, b) => b.createdAt - a.createdAt)
    .forEach((request) => {
      const card = document.createElement("article");
      card.className = "prayer-card";
      const category = request.category || "Uncategorized";
      const safeName = escapeHtml(request.name || "Anonymous");
      const safeMessage = escapeHtml(request.message);
      card.innerHTML = `
        <div class="prayer-meta">
          <span class="tag">${category}</span>
          <span>${safeName}</span>
          <span>${timeAgo(request.createdAt)}</span>
          ${request.openToConnect ? "<span>Open to connect</span>" : ""}
        </div>
        <p>${safeMessage}</p>
        <div class="prayer-actions">
          <button class="mini-button" type="button" data-pray="${request.id}">I prayed</button>
          <button class="ghost-button" type="button" data-encourage="${request.id}">Encourage</button>
          <span class="prayed-count">${request.prayers} prayers</span>
        </div>
      `;
      list.append(card);
    });
};

form.addEventListener("submit", (event) => {
  event.preventDefault();
  const formData = new FormData(form);
  const message = formData.get("message").trim();
  const isAnonymous = anonymousInput.checked;
  const name = isAnonymous ? "Anonymous" : formData.get("name").trim() || "Anonymous";

  if (!message) return;

  if (hasBlockedWords(`${name} ${message}`)) {
    formNote.textContent =
      "Please remove vulgar or offensive words before posting this prayer request.";
    return;
  }

  requests.unshift({
    id: crypto.randomUUID(),
    name,
    category: formData.get("category") || "",
    message,
    openToConnect: openToConnectInput.checked,
    prayers: 0,
    createdAt: Date.now(),
  });

  saveRequests();
  form.reset();
  nameInput.disabled = false;
  nameInput.placeholder = "First name or anonymous";
  openToConnectInput.checked = true;
  formNote.textContent = "Your prayer point has been added.";
  renderRequests();
});

anonymousInput.addEventListener("change", () => {
  nameInput.disabled = anonymousInput.checked;
  nameInput.value = anonymousInput.checked ? "" : nameInput.value;
  nameInput.placeholder = anonymousInput.checked ? "Posting anonymously" : "First name or anonymous";
});

filter.addEventListener("change", renderRequests);

list.addEventListener("click", (event) => {
  const prayButton = event.target.closest("[data-pray]");
  const encourageButton = event.target.closest("[data-encourage]");

  if (prayButton) {
    const request = requests.find((item) => item.id === prayButton.dataset.pray);
    request.prayers += 1;
    saveRequests();
    renderRequests();
  }

  if (encourageButton) {
    const request = requests.find((item) => item.id === encourageButton.dataset.encourage);
    const note = `May God strengthen you, ${request.name || "friend"}. You are being prayed for.`;
    navigator.clipboard?.writeText(note);
    formNote.textContent = "A short encouragement note was copied for you.";
  }
});

document.querySelectorAll(".connection-card").forEach((button) => {
  button.addEventListener("click", () => {
    document.querySelector("#requests").scrollIntoView({ behavior: "smooth" });
  });
});

renderDailyVerse();
renderRequests();
