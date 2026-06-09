import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm";

const supabaseUrl = "https://mufssprelgsroumvmrfk.supabase.co";
const supabaseKey = "sb_publishable_aTOd54VsmDOAJVBssxtrug_nV1_Vhas";
const supabase = createClient(supabaseUrl, supabaseKey);

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
  { text: "Pray without ceasing.", reference: "1 Thessalonians 5:17" },
  { text: "The Lord is my shepherd; I shall not want.", reference: "Psalm 23:1" },
  { text: "Be still, and know that I am God.", reference: "Psalm 46:10" },
  { text: "The Lord is my strength and my shield.", reference: "Psalm 28:7" },
  { text: "Cast thy burden upon the Lord, and he shall sustain thee.", reference: "Psalm 55:22" },
  { text: "I can do all things through Christ which strengtheneth me.", reference: "Philippians 4:13" },
  { text: "The Lord bless thee, and keep thee.", reference: "Numbers 6:24" },
];

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

const storageKey = "prayer-circle-requests";
const prayedStorageKey = "prayer-circle-prayed-requests";
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
const authName = document.querySelector("#auth-name");
const authEmail = document.querySelector("#auth-email");
const authPassword = document.querySelector("#auth-password");
const signUpButton = document.querySelector("#sign-up-button");
const logInButton = document.querySelector("#log-in-button");
const signOutButton = document.querySelector("#sign-out-button");
const authStatus = document.querySelector("#auth-status");
const encouragementList = document.querySelector("#encouragement-list");

let requests = [];
let currentUser = null;
let usingDatabase = true;
let prayedRequestIds = new Set(JSON.parse(localStorage.getItem(prayedStorageKey) || "[]"));

const loadLocalRequests = () => {
  const saved = localStorage.getItem(storageKey);
  return saved ? JSON.parse(saved) : seedRequests;
};

const saveLocalRequests = () => {
  localStorage.setItem(storageKey, JSON.stringify(requests));
};

const savePrayedRequestIds = () => {
  localStorage.setItem(prayedStorageKey, JSON.stringify([...prayedRequestIds]));
};

const escapeHtml = (value) =>
  String(value || "").replace(
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

const showFormNote = (message, isError = false) => {
  formNote.textContent = message;
  formNote.classList.toggle("error", isError);
};

const showAuthStatus = (message, isError = false) => {
  authStatus.textContent = message;
  authStatus.classList.toggle("error", isError);
};

const timeAgo = (timestamp) => {
  const time = typeof timestamp === "number" ? timestamp : new Date(timestamp).getTime();
  const minutes = Math.max(1, Math.round((Date.now() - time) / 60000));
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} hr ago`;
  return `${Math.round(hours / 24)} days ago`;
};

const normalizeRequest = (request) => ({
  id: request.id,
  userId: request.user_id || request.userId || null,
  name: request.display_name || request.name || "Anonymous",
  category: request.category || "",
  message: request.message,
  openToConnect: request.open_to_connect ?? request.openToConnect ?? true,
  prayers: request.prayers || 0,
  createdAt: request.created_at || request.createdAt || Date.now(),
});

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

const renderAuth = () => {
  const signedIn = Boolean(currentUser);
  signUpButton.classList.toggle("hidden", signedIn);
  logInButton.classList.toggle("hidden", signedIn);
  signOutButton.classList.toggle("hidden", !signedIn);
  authName.disabled = signedIn;
  authEmail.disabled = signedIn;
  authPassword.disabled = signedIn;

  if (signedIn) {
    const name = currentUser.user_metadata?.display_name || currentUser.email;
    showAuthStatus(`Signed in as ${name}.`);
  } else {
    showAuthStatus("You are browsing as a guest.");
  }
};

const renderEncouragements = async () => {
  if (!currentUser || !usingDatabase) {
    encouragementList.innerHTML =
      '<p class="muted-note">Sign in to see encouragement sent to your prayer requests.</p>';
    return;
  }

  const { data, error } = await supabase
    .from("encouragements")
    .select("message, sender_name, created_at")
    .order("created_at", { ascending: false })
    .limit(10);

  if (error) {
    encouragementList.innerHTML =
      '<p class="muted-note">Encouragement messages will appear here after the database setup is complete.</p>';
    return;
  }

  if (!data.length) {
    encouragementList.innerHTML =
      '<p class="muted-note">No encouragement yet. When someone encourages you, it will appear here.</p>';
    return;
  }

  encouragementList.innerHTML = data
    .map(
      (item) => `
        <article class="encouragement-note">
          <p>${escapeHtml(item.message)}</p>
          <small>${escapeHtml(item.sender_name || "A PrayerPoint member")} · ${timeAgo(item.created_at)}</small>
        </article>
      `,
    )
    .join("");
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

  [...visibleRequests]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .forEach((request) => {
      const card = document.createElement("article");
      card.className = "prayer-card";
      const category = request.category || "Uncategorized";
      const canEncourage = request.userId && request.openToConnect;
      const alreadyPrayed = prayedRequestIds.has(request.id);
      card.innerHTML = `
        <div class="prayer-meta">
          <span class="tag">${escapeHtml(category)}</span>
          <span>${escapeHtml(request.name || "Anonymous")}</span>
          <span>${timeAgo(request.createdAt)}</span>
          ${request.openToConnect ? "<span>Open to connect</span>" : ""}
        </div>
        <p>${escapeHtml(request.message)}</p>
        <div class="prayer-actions">
          <button class="mini-button" type="button" data-pray="${request.id}" ${
            alreadyPrayed ? "disabled" : ""
          }>${alreadyPrayed ? "Prayer counted" : "I prayed"}</button>
          <button class="ghost-button" type="button" data-encourage="${request.id}" ${
            canEncourage ? "" : "disabled"
          }>Encourage</button>
          <span class="prayed-count">${request.prayers} prayers</span>
        </div>
      `;
      list.append(card);
    });
};

const loadRequests = async () => {
  if (!usingDatabase) {
    requests = loadLocalRequests();
    renderRequests();
    return;
  }

  const { data, error } = await supabase
    .from("prayer_requests")
    .select("id, user_id, display_name, category, message, open_to_connect, prayers, created_at")
    .order("created_at", { ascending: false });

  if (error) {
    usingDatabase = false;
    requests = loadLocalRequests();
    showFormNote("Database setup is not complete yet. Showing guest demo requests.", true);
  } else {
    requests = data.map(normalizeRequest);
  }

  renderRequests();
};

const requireSignIn = () => {
  if (currentUser) return true;
  showAuthStatus("Please sign up or log in first.", true);
  document.querySelector("#account-title").scrollIntoView({ behavior: "smooth" });
  return false;
};

const submitPrayerRequest = async (event) => {
  event.preventDefault();
  const formData = new FormData(form);
  const message = formData.get("message").trim();
  const isAnonymous = anonymousInput.checked;
  const name = isAnonymous ? "Anonymous" : formData.get("name").trim() || "Anonymous";

  if (!message) return;

  if (hasBlockedWords(`${name} ${message}`)) {
    showFormNote("Please remove vulgar or offensive words before posting this prayer request.", true);
    return;
  }

  if (usingDatabase && !requireSignIn()) return;

  const newRequest = {
    id: crypto.randomUUID(),
    userId: currentUser?.id || null,
    name,
    category: formData.get("category") || "",
    message,
    openToConnect: openToConnectInput.checked,
    prayers: 0,
    createdAt: Date.now(),
  };

  if (usingDatabase) {
    const { error } = await supabase.from("prayer_requests").insert({
      user_id: currentUser.id,
      display_name: name,
      category: newRequest.category || null,
      message,
      open_to_connect: newRequest.openToConnect,
      prayers: 0,
    });

    if (error) {
      showFormNote(error.message, true);
      return;
    }

    showFormNote("Your prayer point has been shared.");
    await loadRequests();
  } else {
    requests.unshift(newRequest);
    saveLocalRequests();
    showFormNote("Your prayer point has been added on this device.");
    renderRequests();
  }

  form.reset();
  nameInput.disabled = false;
  nameInput.placeholder = "First name or anonymous";
  openToConnectInput.checked = true;
};

const prayForRequest = async (id) => {
  if (prayedRequestIds.has(id)) {
    showFormNote("You have already counted a prayer for this request.");
    return;
  }

  const request = requests.find((item) => item.id === id);
  if (!request) return;

  if (usingDatabase) {
    const { error } = await supabase.rpc("increment_prayer_count", { request_id: id });
    if (error) {
      showFormNote("Could not update the prayer count yet.", true);
      return;
    }
    prayedRequestIds.add(id);
    savePrayedRequestIds();
    await loadRequests();
    return;
  }

  request.prayers += 1;
  prayedRequestIds.add(id);
  savePrayedRequestIds();
  saveLocalRequests();
  renderRequests();
};

const encourageRequest = async (id) => {
  const request = requests.find((item) => item.id === id);
  if (!request) return;
  if (!requireSignIn()) return;

  if (!request.userId || !request.openToConnect) {
    showFormNote("This request is not open for private encouragement.", true);
    return;
  }

  const message = window.prompt("Write a short encouragement message:");
  if (!message?.trim()) return;

  if (hasBlockedWords(message)) {
    showFormNote("Please remove vulgar or offensive words before sending encouragement.", true);
    return;
  }

  const senderName = currentUser.user_metadata?.display_name || "A PrayerPoint member";
  const { error } = await supabase.from("encouragements").insert({
    request_id: request.id,
    recipient_id: request.userId,
    sender_id: currentUser.id,
    sender_name: senderName,
    message: message.trim(),
  });

  if (error) {
    showFormNote("Encouragement could not be sent yet. Check the Supabase setup.", true);
    return;
  }

  showFormNote("Your encouragement was sent privately.");
};

const signUp = async () => {
  const email = authEmail.value.trim();
  const password = authPassword.value;
  const displayName = authName.value.trim() || "PrayerPoint member";

  if (hasBlockedWords(displayName)) {
    showAuthStatus("Please remove vulgar or offensive words from the display name.", true);
    return;
  }

  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { display_name: displayName },
      emailRedirectTo: "https://keyoletoltu4-glitch.github.io/PrayerPoint-Website/",
    },
  });

  if (error) {
    showAuthStatus(error.message, true);
    return;
  }

  showAuthStatus("Check your email to confirm your account, then log in.");
};

const logIn = async () => {
  const { data, error } = await supabase.auth.signInWithPassword({
    email: authEmail.value.trim(),
    password: authPassword.value,
  });

  if (error) {
    showAuthStatus(error.message, true);
    return;
  }

  currentUser = data.user;
  renderAuth();
  await renderEncouragements();
};

const signOut = async () => {
  await supabase.auth.signOut();
  currentUser = null;
  renderAuth();
  await renderEncouragements();
};

const handleAuthRedirect = async () => {
  const params = new URLSearchParams(window.location.search);
  const code = params.get("code");

  if (!code) return;

  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    showAuthStatus("Your email was confirmed. Please log in to continue.", true);
  } else {
    showAuthStatus("Your account is confirmed and you are signed in.");
  }

  window.history.replaceState({}, document.title, window.location.pathname);
};

anonymousInput.addEventListener("change", () => {
  nameInput.disabled = anonymousInput.checked;
  nameInput.value = anonymousInput.checked ? "" : nameInput.value;
  nameInput.placeholder = anonymousInput.checked ? "Posting anonymously" : "First name or anonymous";
});

form.addEventListener("submit", submitPrayerRequest);
filter.addEventListener("change", renderRequests);
signUpButton.addEventListener("click", signUp);
logInButton.addEventListener("click", logIn);
signOutButton.addEventListener("click", signOut);

list.addEventListener("click", async (event) => {
  const prayButton = event.target.closest("[data-pray]");
  const encourageButton = event.target.closest("[data-encourage]");

  if (prayButton) await prayForRequest(prayButton.dataset.pray);
  if (encourageButton) await encourageRequest(encourageButton.dataset.encourage);
});

document.querySelectorAll(".connection-card").forEach((button) => {
  button.addEventListener("click", () => {
    document.querySelector("#requests").scrollIntoView({ behavior: "smooth" });
  });
});

const initialize = async () => {
  renderDailyVerse();
  await handleAuthRedirect();
  const { data } = await supabase.auth.getSession();
  currentUser = data.session?.user || null;
  renderAuth();
  await loadRequests();
  await renderEncouragements();

  supabase.auth.onAuthStateChange(async (_event, session) => {
    currentUser = session?.user || null;
    renderAuth();
    await renderEncouragements();
  });
};

initialize();
