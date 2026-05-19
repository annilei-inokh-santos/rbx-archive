/* ════════════════════════════════════════
   rbx-archive-script.js
   MAIN INTERACTIVITY - With YouTube Autoplay & Horizontal Modal
════════════════════════════════════════ */

let activeGenre = "all";
let searchQuery = "";
let currentPanel = "games";

// Store favorite games in localStorage
let favorites = JSON.parse(localStorage.getItem('rbx_favorites') || '[]');

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
  if (game.genres.includes('adventure')) return 'fa-hat-wizard';
  if (game.genres.includes('horror')) return 'fa-ghost';
  if (game.genres.includes('creature')) return 'fa-dragon';
  if (game.genres.includes('casual')) return 'fa-smile';
  return 'fa-gamepad';
}

function createGameTile(game) {
  const tile = document.createElement("div");
  tile.className = "game-tile";
  tile.tabIndex = 0;
  tile.setAttribute("role", "button");
  tile.setAttribute("aria-label", "View details for " + game.name);
  tile.dataset.id = game.id;
  
  // Check if game is favorited
  const isFav = favorites.includes(game.id);
  const fallbackIcon = getFallbackIcon(game);
  
  // Create image wrapper for fallback handling
  const imageHtml = `
    <div class="tile-image-wrapper">
      <img class="tile-icon" 
           src="${game.icon}" 
           alt="${game.name} thumbnail" 
           loading="lazy"
           onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';"
           style="width: 100%; height: 100%; object-fit: cover;">
      <div class="tile-icon-fallback" 
           style="display: none;">
        <i class="fas ${fallbackIcon}"></i>
      </div>
    </div>
  `;
  
  tile.innerHTML = `
    ${imageHtml}
    <span class="tile-badge">All Ages</span>
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
  
  // Add click handler for tile
  tile.addEventListener("click", (e) => {
    if (e.target.closest(".tile-fav")) return;
    openModal(game);
  });
  
  // Add keydown handler for accessibility
  tile.addEventListener("keydown", (e) => {
    if (e.key === "Enter" || e.key === " ") { 
      e.preventDefault(); 
      openModal(game);
    }
  });
  
  // Add favorite button handler
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
  const empty = document.getElementById("emptyState");

  // Remove existing tiles
  const existingTiles = grid.querySelectorAll(".game-tile");
  existingTiles.forEach(t => t.remove());

  const filtered = GAMES.filter(g => {
    const matchGenre = activeGenre === "all" || g.genres.includes(activeGenre);
    const q = searchQuery.toLowerCase();
    const matchSearch = !q || g.name.toLowerCase().includes(q) || g.tags.some(t => t.toLowerCase().includes(q));
    return matchGenre && matchSearch;
  });

  const visibleCount = document.getElementById("visibleCount");
  if (visibleCount) visibleCount.textContent = filtered.length;

  if (filtered.length === 0) {
    empty.style.display = "block";
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
  const modalBackdrop = document.getElementById("modalBackdrop");
  const modalThumb = document.getElementById("modalThumb");
  const modalTitle = document.getElementById("modalTitle");
  const modalCreator = document.getElementById("modalCreator");
  const modalRating = document.getElementById("modalRating");
  const modalTags = document.getElementById("modalTags");
  const modalDesc = document.getElementById("modalDesc");
  const modalNote = document.getElementById("modalNote");
  const modalPlayBtn = document.getElementById("modalPlayBtn");
  const modalMediaWrapper = document.querySelector('.modal-media-wrapper');

  // Clear previous content
  removeVideoFromModal(modalMediaWrapper);
  modalThumb.style.display = 'block';
  modalThumb.onerror = null;

  // Handle YouTube videos or regular images
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
      
      setTimeout(() => {
        playOverlay.style.opacity = '0';
      }, 4000);
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
  
  if (modalTitle) modalTitle.textContent = game.name;
  if (modalCreator) {
    modalCreator.innerHTML = `Created ${game.date} · by <a href="${game.creatorUrl}" target="_blank">${escapeHtml(game.creator)}</a>`;
  }
  if (modalRating) {
    modalRating.innerHTML = `<i class="fas fa-shield-alt"></i> ${game.rating} · ${game.content}`;
  }
  if (modalTags) {
    modalTags.innerHTML = game.tags.map(t => `<span class="modal-tag">${escapeHtml(t)}</span>`).join("");
  }
  if (modalDesc) modalDesc.textContent = game.desc;
  if (modalNote) {
    modalNote.innerHTML = game.note || 'No personal note available for this game yet.';
  }
  if (modalPlayBtn) modalPlayBtn.href = game.url;

  if (modalBackdrop) {
    modalBackdrop.classList.add("open");
    document.body.style.overflow = "hidden";
  }
}

function removeVideoFromModal(modalMediaWrapper) {
  if (!modalMediaWrapper) return;
  
  const existingIframe = modalMediaWrapper.querySelector('.modal-video');
  if (existingIframe) existingIframe.remove();
  
  const existingOverlay = modalMediaWrapper.querySelector('.video-play-overlay');
  if (existingOverlay) existingOverlay.remove();
  
  const fallbackDiv = modalMediaWrapper.querySelector('.modal-thumb-fallback');
  if (fallbackDiv) fallbackDiv.remove();
}

function closeModal(event) {
  const modalBackdrop = document.getElementById("modalBackdrop");
  if (event && event.target !== modalBackdrop) return;
  closeModalDirect();
}

function closeModalDirect() {
  const modalBackdrop = document.getElementById("modalBackdrop");
  const modalMediaWrapper = document.querySelector('.modal-media-wrapper');
  
  if (modalBackdrop) {
    modalBackdrop.classList.remove("open");
    document.body.style.overflow = "";
  }
  
  if (modalMediaWrapper) {
    removeVideoFromModal(modalMediaWrapper);
  }
}

function filterGenre(genre) {
  activeGenre = genre;
  renderTiles();
}

function filterGenreChip(genre, btn) {
  activeGenre = genre;
  
  document.querySelectorAll(".filter-chip").forEach(c => c.classList.remove("active"));
  if (btn) btn.classList.add("active");
  
  renderTiles();
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
  const filterButtons = document.getElementById("filterButtons");
  const filterBar = document.getElementById("filterBar");
  
  if (panel === "games") {
    if (filterSectionLabel) filterSectionLabel.classList.remove("hidden");
    if (filterButtons) filterButtons.classList.remove("hidden");
    if (filterBar) filterBar.style.display = "flex";
  } else {
    if (filterSectionLabel) filterSectionLabel.classList.add("hidden");
    if (filterButtons) filterButtons.classList.add("hidden");
    if (filterBar) filterBar.style.display = "none";
  }
}

function toggleFav(gameId, btnElement) {
  const index = favorites.indexOf(gameId);
  if (index === -1) {
    favorites.push(gameId);
    if (btnElement) {
      btnElement.classList.add('fav-active');
    }
  } else {
    favorites.splice(index, 1);
    if (btnElement) {
      btnElement.classList.remove('fav-active');
    }
  }
  localStorage.setItem('rbx_favorites', JSON.stringify(favorites));
}

function escapeHtml(str) {
  if (!str) return '';
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

function initSidebar() {
  const sidebarToggle = document.getElementById("sidebarToggle");
  const sidebar = document.getElementById("sidebar");
  
  if (sidebarToggle && sidebar) {
    sidebarToggle.addEventListener("click", () => {
      sidebar.classList.toggle("open");
    });
  }
}

function initKeyboardShortcuts() {
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      closeModalDirect();
    }
  });
}

document.addEventListener("DOMContentLoaded", () => {
  initSidebar();
  initKeyboardShortcuts();
  
  const filterBar = document.getElementById("filterBar");
  if (filterBar && currentPanel === "games") {
    filterBar.style.display = "flex";
  }
  
  renderTiles();
});

window.filterGenre = filterGenre;
window.filterGenreChip = filterGenreChip;
window.handleSearch = handleSearch;
window.switchPanel = switchPanel;
window.closeModal = closeModal;
window.closeModalDirect = closeModalDirect;
window.toggleFav = toggleFav;