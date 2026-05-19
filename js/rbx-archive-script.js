/* ════════════════════════════════════════
   rbx-archive-script.js
   MAIN INTERACTIVITY - With YouTube Autoplay & Horizontal Modal
   UPDATED: Bidirectional filter sync + Favorites integration + Fandom Wiki Links
════════════════════════════════════════ */

let activeGenre = "all";
let searchQuery = "";
let currentPanel = "games";
let favoritesUnsubscribe = null;

// Helper function to check if a URL is a YouTube link
function isYouTubeUrl(url) {
  if (!url) return false;
  return url.includes('youtube.com/watch?v=') ||
         url.includes('youtu.be/') ||
         url.includes('youtube.com/embed/');
}

// Helper function to extract YouTube video ID
function getYouTubeId(url) {
  const patterns = [
    /(?:youtube\.com\/watch\?v=)([^&]+)/,
    /(?:youtu\.be\/)([^?]+)/,
    /(?:youtube\.com\/embed\/)([^?]+)/
  ];
  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) return match[1];
  }
  return null;
}

// Helper function to get YouTube embed URL with autoplay
function getYouTubeEmbedUrl(url, autoplay = true) {
  const videoId = getYouTubeId(url);
  if (!videoId) return null;
  return `https://www.youtube.com/embed/${videoId}?autoplay=${autoplay ? '1' : '0'}&mute=1&modestbranding=1&rel=0&playsinline=1`;
}

// Helper function to get YouTube thumbnail (for fallback)
function getYouTubeThumbnail(url) {
  const videoId = getYouTubeId(url);
  return videoId ? `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg` : null;
}

// Helper function to get fallback icon based on game's primary genre
function getFallbackIcon(game) {
  if (game.genres.includes('multiplayer')) return 'fa-users';
  if (game.genres.includes('adventure'))  return 'fa-hat-wizard';
  if (game.genres.includes('horror'))     return 'fa-ghost';
  if (game.genres.includes('creature'))   return 'fa-dragon';
  if (game.genres.includes('casual'))     return 'fa-smile';
  return 'fa-gamepad';
}

// Maps a game's rating string to a CSS modifier class and display label
function getRatingBadge(rating) {
  switch ((rating || '').toLowerCase()) {
    case 'minimal':    return { cls: 'badge-minimal',    label: 'Minimal' };
    case 'mild':       return { cls: 'badge-mild',       label: 'Mild' };
    case 'moderate':   return { cls: 'badge-moderate',   label: 'Moderate' };
    case 'restricted': return { cls: 'badge-restricted', label: 'Restricted' };
    default:           return { cls: 'badge-minimal',    label: rating || 'Minimal' };
  }
}

// Unified function to set active genre and update ALL UI elements
function setActiveGenre(genre, clickedElement) {
  activeGenre = genre;
  
  // Update all filter buttons (both sidebar and filter bar)
  const allFilterButtons = document.querySelectorAll('.nav-link[onclick*="filterGenre"], .filter-chip');
  
  allFilterButtons.forEach(btn => {
    // Determine which genre this button represents
    let btnGenre = null;
    const onclickAttr = btn.getAttribute('onclick');
    
    if (onclickAttr) {
      if (onclickAttr.includes("filterGenre('favourites')")) btnGenre = 'favourites';
      else if (onclickAttr.includes("filterGenre('all')")) btnGenre = 'all';
      else if (onclickAttr.includes("filterGenre('multiplayer')")) btnGenre = 'multiplayer';
      else if (onclickAttr.includes("filterGenre('adventure')")) btnGenre = 'adventure';
      else if (onclickAttr.includes("filterGenre('horror')")) btnGenre = 'horror';
      else if (onclickAttr.includes("filterGenre('creature')")) btnGenre = 'creature';
      else if (onclickAttr.includes("filterGenre('casual')")) btnGenre = 'casual';
      else if (onclickAttr.includes("filterGenreChip('favourites')")) btnGenre = 'favourites';
      else if (onclickAttr.includes("filterGenreChip('all')")) btnGenre = 'all';
      else if (onclickAttr.includes("filterGenreChip('multiplayer')")) btnGenre = 'multiplayer';
      else if (onclickAttr.includes("filterGenreChip('adventure')")) btnGenre = 'adventure';
      else if (onclickAttr.includes("filterGenreChip('horror')")) btnGenre = 'horror';
      else if (onclickAttr.includes("filterGenreChip('creature')")) btnGenre = 'creature';
      else if (onclickAttr.includes("filterGenreChip('casual')")) btnGenre = 'casual';
    }
    
    // Also check data-genre attribute for filter chips
    if (!btnGenre && btn.hasAttribute('data-genre')) {
      btnGenre = btn.getAttribute('data-genre');
    }
    
    // Apply or remove active class
    if (btnGenre === genre) {
      btn.classList.add('active');
    } else {
      btn.classList.remove('active');
    }
  });
  
  // Re-render tiles
  renderTiles();
}

// Wrapper functions that call the unified setActiveGenre
function filterGenre(genre) {
  setActiveGenre(genre, null);
}

function filterGenreChip(genre, btn) {
  setActiveGenre(genre, btn);
}

function createGameTile(game) {
  const tile = document.createElement("div");
  tile.className = "game-tile";
  tile.tabIndex = 0;
  tile.setAttribute("role", "button");
  tile.setAttribute("aria-label", "View details for " + game.name);
  tile.dataset.id = game.id;

  const isFav = FavoritesSystem.isFavorite(game.id);
  const fallbackIcon = getFallbackIcon(game);
  const { cls, label } = getRatingBadge(game.rating);

  const imageHtml = `
    <div class="tile-image-wrapper">
      <img class="tile-icon"
           src="${game.icon}"
           alt="${game.name} thumbnail"
           loading="lazy"
           onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';"
           style="width:100%;height:100%;object-fit:cover;">
      <div class="tile-icon-fallback" style="display:none;">
        <i class="fas ${fallbackIcon}"></i>
      </div>
    </div>
  `;

  tile.innerHTML = `
    ${imageHtml}
    <span class="tile-badge ${cls}">${label}</span>
    <button class="tile-fav ${isFav ? 'fav-active' : ''}" data-id="${game.id}" aria-label="Favorite">
      <i class="fas fa-star"></i>
    </button>
    <div class="tile-body">
      <p class="tile-name">${escapeHtml(game.name)}</p>
      <div class="tile-meta">
        <i class="fas fa-calendar-alt" style="font-size:10px"></i>
        <span>${game.date}</span>
      </div>
    </div>
  `;

  tile.addEventListener("click", (e) => {
    if (e.target.closest(".tile-fav")) return;
    openModal(game);
  });

  tile.addEventListener("keydown", (e) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      openModal(game);
    }
  });

  const favBtn = tile.querySelector('.tile-fav');
  if (favBtn) {
    favBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      toggleFav(game.id, favBtn);
    });
  }

  return tile;
}

function renderTiles() {
  const grid  = document.getElementById("gameGrid");
  const empty = document.getElementById("emptyState");

  const existingTiles = grid.querySelectorAll(".game-tile");
  existingTiles.forEach(t => t.remove());

  let filtered = GAMES.filter(g => {
    const matchGenre  = activeGenre === "all" || 
                       (activeGenre === "favourites" ? FavoritesSystem.isFavorite(g.id) : g.genres.includes(activeGenre));
    const q           = searchQuery.toLowerCase();
    const matchSearch = !q || g.name.toLowerCase().includes(q) || g.tags.some(t => t.toLowerCase().includes(q));
    return matchGenre && matchSearch;
  });

  const visibleCount = document.getElementById("visibleCount");
  if (visibleCount) visibleCount.textContent = filtered.length;

  if (filtered.length === 0) {
    empty.style.display = "block";
    // Customize empty state message for favorites
    if (activeGenre === "favourites") {
      const emptyMessage = empty.querySelector('p');
      if (emptyMessage) {
        emptyMessage.innerHTML = '<i class="fas fa-star" style="font-size:36px;display:block;margin-bottom:12px;color:var(--text-dim);"></i>No favorited games yet.<br>Click the <i class="fas fa-star"></i> star on any game to add it to your favorites!';
      }
    } else {
      const emptyMessage = empty.querySelector('p');
      if (emptyMessage) {
        emptyMessage.innerHTML = 'No games match your search.';
      }
    }
    return;
  }
  empty.style.display = "none";

  filtered.forEach((game, i) => {
    const tile = createGameTile(game);
    tile.style.animationDelay = (i * 0.04) + "s";
    grid.insertBefore(tile, empty);
  });
}

function openModal(game) {
  const modalBackdrop     = document.getElementById("modalBackdrop");
  const modalThumb        = document.getElementById("modalThumb");
  const modalTitle        = document.getElementById("modalTitle");
  const modalCreator      = document.getElementById("modalCreator");
  const modalRating       = document.getElementById("modalRating");
  const modalTags         = document.getElementById("modalTags");
  const modalDesc         = document.getElementById("modalDesc");
  const modalNote         = document.getElementById("modalNote");
  const modalPlayBtn      = document.getElementById("modalPlayBtn");
  const modalMediaWrapper = document.querySelector('.modal-media-wrapper');

  removeVideoFromModal(modalMediaWrapper);
  modalThumb.style.display = 'block';
  modalThumb.onerror = null;

  if (isYouTubeUrl(game.thumb)) {
    const embedUrl = getYouTubeEmbedUrl(game.thumb, true);
    if (embedUrl) {
      modalThumb.style.display = 'none';

      const iframe = document.createElement('iframe');
      iframe.className = 'modal-video';
      iframe.src = embedUrl;
      iframe.width = '100%';
      iframe.height = '100%';
      iframe.style.border = 'none';
      iframe.style.display = 'block';
      iframe.allow = 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture';
      iframe.allowFullscreen = true;

      const playOverlay = document.createElement('div');
      playOverlay.className = 'video-play-overlay';
      playOverlay.innerHTML = '<i class="fas fa-volume-mute"></i> Video plays muted • Click to unmute';

      modalMediaWrapper.appendChild(iframe);
      modalMediaWrapper.appendChild(playOverlay);

      setTimeout(() => { playOverlay.style.opacity = '0'; }, 4000);
    } else {
      modalThumb.style.display = 'block';
      modalThumb.src = getYouTubeThumbnail(game.thumb);
      modalThumb.alt = game.name;
    }
  } else {
    modalThumb.src = game.thumb;
    modalThumb.alt = game.name;
    modalThumb.onerror = function() {
      this.style.display = 'none';
      let fallbackDiv = modalMediaWrapper.querySelector('.modal-thumb-fallback');
      if (!fallbackDiv) {
        fallbackDiv = document.createElement('div');
        fallbackDiv.className = 'modal-thumb-fallback';
        fallbackDiv.innerHTML = `<i class="fas ${getFallbackIcon(game)}"></i><span>Preview unavailable</span>`;
        modalMediaWrapper.appendChild(fallbackDiv);
      } else {
        fallbackDiv.style.display = 'flex';
      }
    };
  }

  if (modalTitle)   modalTitle.textContent = game.name;
  if (modalCreator) {
    modalCreator.innerHTML = `Created ${game.date} · by <a href="${game.creatorUrl}" target="_blank">${escapeHtml(game.creator)}</a>`;
  }
  if (modalRating) {
    const { label } = getRatingBadge(game.rating);
    modalRating.innerHTML = `<i class="fas fa-shield-alt"></i> ${label} · ${game.content}`;
  }
  if (modalTags)    modalTags.innerHTML    = game.tags.map(t => `<span class="modal-tag">${escapeHtml(t)}</span>`).join("");
  if (modalDesc)    modalDesc.textContent  = game.desc;
  
  // Update modal note to include Fandom link if it exists
  if (modalNote) {
    let noteHtml = game.note || 'No personal note available for this game yet.';
    
    // Add Fandom wiki profile link if available
    if (game.fandomUrl) {
      noteHtml += `<div class="modal-fandom-link" style="margin-top: 16px; padding-top: 12px; border-top: 1px solid var(--border-subtle);">
        <i class="fab fa-wikipedia-w" style="color: var(--accent); margin-right: 8px; font-size: 18px;"></i>
        <a href="${game.fandomUrl}" target="_blank" rel="noopener noreferrer" style="color: var(--accent); text-decoration: none; font-weight: 600;">
          My Fandom Wiki Profile <i class="fas fa-external-link-alt" style="font-size: 11px; margin-left: 4px;"></i>
        </a>
        <span style="color: var(--text-dim); font-size: 11px;">— Check out my wiki contributions</span>
      </div>`;
    }
    
    modalNote.innerHTML = noteHtml;
  }
  
  if (modalPlayBtn) modalPlayBtn.href      = game.url;

  if (modalBackdrop) {
    modalBackdrop.classList.add("open");
    document.body.style.overflow = "hidden";
  }
}

function removeVideoFromModal(modalMediaWrapper) {
  if (!modalMediaWrapper) return;
  const existingIframe  = modalMediaWrapper.querySelector('.modal-video');
  if (existingIframe) existingIframe.remove();
  const existingOverlay = modalMediaWrapper.querySelector('.video-play-overlay');
  if (existingOverlay)  existingOverlay.remove();
  const fallbackDiv     = modalMediaWrapper.querySelector('.modal-thumb-fallback');
  if (fallbackDiv)      fallbackDiv.remove();
}

function closeModal(event) {
  const modalBackdrop = document.getElementById("modalBackdrop");
  if (event && event.target !== modalBackdrop) return;
  closeModalDirect();
}

function closeModalDirect() {
  const modalBackdrop     = document.getElementById("modalBackdrop");
  const modalMediaWrapper = document.querySelector('.modal-media-wrapper');
  if (modalBackdrop) {
    modalBackdrop.classList.remove("open");
    document.body.style.overflow = "";
  }
  if (modalMediaWrapper) removeVideoFromModal(modalMediaWrapper);
}

function handleSearch() {
  const searchInput = document.getElementById("searchInput");
  if (searchInput) {
    searchQuery = searchInput.value;
    renderTiles();
  }
}

function switchPanel(panel, btn) {
  currentPanel = panel;

  document.querySelectorAll(".content-panel").forEach(p => p.classList.remove("active"));
  const targetPanel = document.getElementById(`panel-${panel}`);
  if (targetPanel) targetPanel.classList.add("active");

  document.querySelectorAll(".nav-link[data-panel], .snack-btn[data-panel]")
    .forEach(b => b.classList.remove("active"));
  document.querySelectorAll(`[data-panel="${panel}"]`)
    .forEach(b => b.classList.add("active"));

  const filterSectionLabel = document.getElementById("filterSectionLabel");
  const filterButtons      = document.getElementById("filterButtons");
  const filterBar          = document.getElementById("filterBar");

  if (panel === "games") {
    if (filterSectionLabel) filterSectionLabel.classList.remove("hidden");
    if (filterButtons)      filterButtons.classList.remove("hidden");
    if (filterBar)          filterBar.style.display = "flex";
  } else {
    if (filterSectionLabel) filterSectionLabel.classList.add("hidden");
    if (filterButtons)      filterButtons.classList.add("hidden");
    if (filterBar)          filterBar.style.display = "none";
  }
}

function toggleFav(gameId, btnElement) {
  const newState = FavoritesSystem.toggle(gameId);
  
  // Update button visual
  if (btnElement) {
    if (newState) {
      btnElement.classList.add('fav-active');
    } else {
      btnElement.classList.remove('fav-active');
    }
  }
  
  // If currently viewing favorites filter, re-render to show/hide the game
  if (activeGenre === 'favourites') {
    renderTiles();
  }
}

function escapeHtml(str) {
  if (!str) return '';
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

function initSidebar() {
  const sidebarToggle = document.getElementById("sidebarToggle");
  const sidebar       = document.getElementById("sidebar");
  if (sidebarToggle && sidebar) {
    sidebarToggle.addEventListener("click", () => {
      sidebar.classList.toggle("open");
    });
  }
}

function initKeyboardShortcuts() {
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") closeModalDirect();
  });
}

function initFavoritesSubscription() {
  // Subscribe to favorites changes to update UI in real-time
  if (favoritesUnsubscribe) {
    favoritesUnsubscribe();
  }
  
  favoritesUnsubscribe = FavoritesSystem.subscribe(function(action, gameId, allFavorites) {
    // Update all favorite buttons on existing tiles if they match
    const allFavButtons = document.querySelectorAll('.tile-fav');
    allFavButtons.forEach(btn => {
      const btnGameId = btn.getAttribute('data-id');
      if (btnGameId === gameId) {
        if (action === 'add') {
          btn.classList.add('fav-active');
        } else if (action === 'remove') {
          btn.classList.remove('fav-active');
        }
      }
    });
    
    // If we're on the favourites filter, re-render to update visibility
    if (activeGenre === 'favourites') {
      renderTiles();
    }
  });
}

document.addEventListener("DOMContentLoaded", () => {
  initSidebar();
  initKeyboardShortcuts();
  initFavoritesSubscription();
  
  const filterBar = document.getElementById("filterBar");
  if (filterBar && currentPanel === "games") filterBar.style.display = "flex";
  
  // Set initial active states
  setActiveGenre('all', null);
  
  renderTiles();
});

// Make functions available globally
window.filterGenre      = filterGenre;
window.filterGenreChip  = filterGenreChip;
window.handleSearch     = handleSearch;
window.switchPanel      = switchPanel;
window.closeModal       = closeModal;
window.closeModalDirect = closeModalDirect;
window.toggleFav        = toggleFav;
window.FavoritesSystem  = FavoritesSystem;