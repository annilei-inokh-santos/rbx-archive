/* ════════════════════════════════════════
   rbx-archive-script.js
   MAIN INTERACTIVITY - With YouTube Autoplay & Horizontal Modal
   UPDATED: JSON data loading + Skeleton Loading Screens + Future Firestore ready
════════════════════════════════════════ */

let activeGenre = "all";
let searchQuery = "";
let currentPanel = "games";
let favoritesUnsubscribe = null;
let GAMES = []; // Will be populated from JSON
let domReady = false;
let isLoading = false;
let skeletonTimeout = null;

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
  if (!game || !game.genres) return 'fa-gamepad';
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
    case 'minimal':    return { cls: 'badge-minimal', label: 'Minimal', modalCls: 'modal-rating-minimal' };
    case 'mild':       return { cls: 'badge-mild', label: 'Mild', modalCls: 'modal-rating-mild' };
    case 'moderate':   return { cls: 'badge-moderate', label: 'Moderate', modalCls: 'modal-rating-moderate' };
    case 'restricted': return { cls: 'badge-restricted', label: 'Restricted', modalCls: 'modal-rating-restricted' };
    default:           return { cls: 'badge-minimal', label: rating || 'Minimal', modalCls: 'modal-rating-minimal' };
  }
}

// Function to show skeleton loaders
function showSkeletonLoaders() {
  const grid = document.getElementById("gameGrid");
  if (!grid) return;
  
  // Clear any existing timeout
  if (skeletonTimeout) {
    clearTimeout(skeletonTimeout);
  }
  
  isLoading = true;
  grid.classList.add('loading');
  
  // Clear all existing content including empty state
  const existingContent = grid.querySelectorAll(".game-tile, .skeleton-tile, .empty-state");
  existingContent.forEach(el => el.remove());
  
  // Create 12 skeleton tiles
  for (let i = 0; i < 12; i++) {
    const skeleton = document.createElement('div');
    skeleton.className = 'skeleton-tile';
    skeleton.style.animationDelay = (i * 0.05) + 's';
    skeleton.innerHTML = `
      <div style="position: relative;">
        <div class="skeleton-image"></div>
        <div class="skeleton-badge"></div>
        <div class="skeleton-fav"></div>
      </div>
      <div class="skeleton-body">
        <div class="skeleton-title"></div>
        <div class="skeleton-meta"></div>
      </div>
    `;
    grid.appendChild(skeleton);
  }
}

// Function to hide skeleton loaders
function hideSkeletonLoaders() {
  const grid = document.getElementById("gameGrid");
  if (!grid) return;
  
  isLoading = false;
  grid.classList.remove('loading');
  
  // Remove any skeleton elements
  const skeletons = grid.querySelectorAll('.skeleton-tile');
  skeletons.forEach(skeleton => skeleton.remove());
}

// Load games from JSON file
async function loadGamesFromJSON() {
  try {
    console.log('Loading games from JSON...');
    showSkeletonLoaders();
    
    const response = await fetch('js/games.json');
    if (!response.ok) throw new Error('Failed to load games.json');
    const games = await response.json();
    GAMES = games;
    console.log(`Loaded ${GAMES.length} games from JSON`);
    
    window.GAMES = GAMES;
    
    if (domReady) {
      hideSkeletonLoaders();
      renderTiles();
      if (typeof generateAboutContent === 'function') {
        generateAboutContent();
      }
    }
  } catch (error) {
    console.error('Error loading games:', error);
    hideSkeletonLoaders();
    if (domReady) {
      const grid = document.getElementById("gameGrid");
      if (grid) {
        grid.innerHTML = '<div class="empty-state" style="display:block;"><i class="fas fa-exclamation-triangle"></i><p>Failed to load games. Please refresh the page.</p></div>';
      }
    }
  }
}

// Unified function to set active genre and update ALL UI elements
function setActiveGenre(genre, clickedElement) {
  activeGenre = genre;
  
  // Update all filter buttons (both sidebar and filter bar)
  const allFilterButtons = document.querySelectorAll('.nav-link[onclick*="filterGenre"], .filter-chip');
  
  allFilterButtons.forEach(btn => {
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
    
    if (!btnGenre && btn.hasAttribute('data-genre')) {
      btnGenre = btn.getAttribute('data-genre');
    }
    
    if (btnGenre === genre) {
      btn.classList.add('active');
    } else {
      btn.classList.remove('active');
    }
  });
  
  // Re-render tiles with skeleton if games are loaded
  if (GAMES.length && domReady) {
    renderTilesWithDelay();
  } else if (domReady) {
    renderTiles();
  }
}

// Helper function to render tiles with a small delay for skeleton to show
function renderTilesWithDelay() {
  showSkeletonLoaders();
  skeletonTimeout = setTimeout(() => {
    renderTiles();
  }, 150);
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
  const grid = document.getElementById("gameGrid");
  
  if (!grid) {
    console.error("gameGrid element not found!");
    return;
  }
  
  if (!GAMES.length) {
    console.log("No games loaded yet, waiting...");
    if (!isLoading) {
      showSkeletonLoaders();
    }
    return;
  }

  // Hide skeletons first
  hideSkeletonLoaders();
  
  // Clear all content including empty state
  const allContent = grid.querySelectorAll(".game-tile, .empty-state");
  allContent.forEach(el => el.remove());

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
    // Create empty state
    const emptyState = document.createElement('div');
    emptyState.id = "emptyState";
    emptyState.className = "empty-state";
    emptyState.style.display = "block";
    
    if (activeGenre === "favourites") {
      emptyState.innerHTML = '<i class="fas fa-star" style="font-size:36px;display:block;margin-bottom:12px;color:var(--text-dim);"></i><p>No favorited games yet.<br>Click the <i class="fas fa-star"></i> star on any game to add it to your favorites!</p>';
    } else {
      emptyState.innerHTML = '<i class="fas fa-search"></i><p>No games match your search.</p>';
    }
    grid.appendChild(emptyState);
    return;
  }

  filtered.forEach((game, i) => {
    const tile = createGameTile(game);
    tile.style.animationDelay = (i * 0.04) + "s";
    grid.appendChild(tile);
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

  if (!modalBackdrop || !modalThumb || !modalTitle) {
    console.error("Modal elements not found");
    return;
  }

  removeVideoFromModal(modalMediaWrapper);
  modalThumb.style.display = 'block';
  modalThumb.onerror = null;

  if (isYouTubeUrl(game.thumb)) {
    const embedUrl = getYouTubeEmbedUrl(game.thumb, true);
    if (embedUrl && modalMediaWrapper) {
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
      if (modalMediaWrapper) {
        let fallbackDiv = modalMediaWrapper.querySelector('.modal-thumb-fallback');
        if (!fallbackDiv) {
          fallbackDiv = document.createElement('div');
          fallbackDiv.className = 'modal-thumb-fallback';
          fallbackDiv.innerHTML = `<i class="fas ${getFallbackIcon(game)}"></i><span>Preview unavailable</span>`;
          modalMediaWrapper.appendChild(fallbackDiv);
        } else {
          fallbackDiv.style.display = 'flex';
        }
      }
    };
  }

  if (modalTitle)   modalTitle.textContent = game.name;
  if (modalCreator) {
    modalCreator.innerHTML = `Created ${game.date} · by <a href="${game.creatorUrl}" target="_blank">${escapeHtml(game.creator)}</a>`;
  }
  
  if (modalRating) {
    const { label, modalCls } = getRatingBadge(game.rating);
    modalRating.className = 'modal-rating';
    modalRating.classList.add(modalCls);
    modalRating.innerHTML = `<i class="fas fa-shield-alt"></i> ${label} · ${game.content}`;
  }
  
  if (modalTags)    modalTags.innerHTML    = game.tags.map(t => `<span class="modal-tag">${escapeHtml(t)}</span>`).join("");
  if (modalDesc)    modalDesc.textContent  = game.desc;
  
  if (modalNote) {
    let noteHtml = game.note || 'No personal note available for this game yet.';
    
    if (game.fandomUrl) {
      noteHtml += `<div class="modal-fandom-link">
        <i class="fab fa-wikipedia-w"></i>
        <a href="${game.fandomUrl}" target="_blank" rel="noopener noreferrer">
          My Fandom Wiki Profile <i class="fas fa-external-link-alt"></i>
        </a>
        <span>— Check out my wiki contributions</span>
      </div>`;
    }
    
    modalNote.innerHTML = noteHtml;
  }
  
  if (modalPlayBtn) modalPlayBtn.href      = game.url;

  modalBackdrop.classList.add("open");
  document.body.style.overflow = "hidden";
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
    if (GAMES.length && !isLoading) {
      renderTilesWithDelay();
    } else {
      renderTiles();
    }
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
  
  if (btnElement) {
    if (newState) {
      btnElement.classList.add('fav-active');
    } else {
      btnElement.classList.remove('fav-active');
    }
  }
  
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
  if (favoritesUnsubscribe) {
    favoritesUnsubscribe();
  }
  
  favoritesUnsubscribe = FavoritesSystem.subscribe(function(action, gameId, allFavorites) {
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
    
    if (activeGenre === 'favourites') {
      renderTiles();
    }
  });
}

document.addEventListener("DOMContentLoaded", async () => {
  console.log("DOM loaded, initializing...");
  domReady = true;
  
  initSidebar();
  initKeyboardShortcuts();
  initFavoritesSubscription();
  
  await loadGamesFromJSON();
  
  const filterBar = document.getElementById("filterBar");
  if (filterBar && currentPanel === "games") filterBar.style.display = "flex";
  
  setActiveGenre('all', null);
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