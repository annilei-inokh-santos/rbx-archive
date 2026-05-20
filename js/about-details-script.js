/* ════════════════════════════════════════
   about-details-script.js
   ABOUT SECTION DYNAMIC CONTENT GENERATION
   ═══════════════════════════════════════ */

// Function to dynamically generate about section content
function generateAboutContent() {
  const aboutPanel = document.getElementById('panel-about');
  if (!aboutPanel) return;
  
  // Get wiki profiles from games that have fandomUrl
  const wikiGames = window.GAMES ? window.GAMES.filter(game => game.fandomUrl) : [];
  
  const aboutHTML = `
    <div class="section-header">
      <h2 class="section-title">About This Archive</h2>
    </div>
    
    <div class="about-container">
      <!-- Profile Card -->
      <div class="about-profile-card">
        <a class="profile-card-large" href="https://www.roblox.com/users/2641095630/profile" target="_blank">
          <img class="profile-avatar-large"
            src="https://tr.rbxcdn.com/30DAY-AvatarHeadshot-A36AC6002ACCC61B95C8BD5450D09F75-Png/150/150/AvatarHeadshot/Webp/noFilter"
            alt="Traveler_Caelum avatar">
          <div class="profile-info-large">
            <div class="profile-name-large">Traveler_Caelum</div>
            <div class="profile-handle-large">@Traveler_Caelum</div>
            <div class="profile-bio">Curator of this archive • Roblox enthusiast • Game explorer</div>
          </div>
        </a>
      </div>
      
      <!-- What is RBX Archive? -->
      <div class="about-card">
        <h2>What is RBX Archive?</h2>
        <p>I created this website to share my favorite Roblox games and to maintain a personal archive of everything I've played.</p>
        <p>Each game is chosen for its unique creativity and entertainment value — whether it's a hidden gem or a widely loved classic.</p>
        <p>This site is useful for both experienced Roblox players and newcomers looking for recommendations.</p>
      </div>
      
      <!-- How to Navigate -->
      <div class="about-card">
        <h2>How to Navigate</h2>
        <p>Browse the <strong>Games</strong> tab to explore the full archive. Click any tile to open a detailed overlay with the game description, content rating, creator info, and my personal note. Use filters or search to narrow things down.</p>
        <p>⭐ <strong>Favorites:</strong> Click the star on any game tile to save it to your favorites. Access all your favorite games by clicking the "Favourites" filter.</p>
        <p>🔍 <strong>Search:</strong> Use the search bar to find games by name or tags.</p>
        <p>🏷️ <strong>Filters:</strong> Filter games by genre using the sidebar or filter chips.</p>
      </div>
      
      <!-- Rating System -->
      <div class="about-card">
        <h2>Rating System</h2>
        <p>Roblox introduced a new content maturity system in November 2024, replacing the old "All Ages" label. Here's what each rating means:</p>
        <div class="rating-system-grid">
          <div class="rating-card">
            <div class="rating-card-badge minimal">
              <i class="fas fa-shield-alt"></i> Minimal
            </div>
            <div class="rating-card-title">Suitable for all ages</div>
            <div class="rating-card-desc">May contain occasional, mild violence or small amounts of unrealistic blood.</div>
          </div>
          <div class="rating-card">
            <div class="rating-card-badge mild">
              <i class="fas fa-exclamation-triangle"></i> Mild
            </div>
            <div class="rating-card-title">Some guidance recommended</div>
            <div class="rating-card-desc">May contain repeated mild violence, unrealistic blood, or mild fear elements.</div>
          </div>
          <div class="rating-card">
            <div class="rating-card-badge moderate">
              <i class="fas fa-skull"></i> Moderate
            </div>
            <div class="rating-card-title">Parental discretion advised</div>
            <div class="rating-card-desc">May contain moderate violence, realistic blood, or frequent fear elements.</div>
          </div>
          <div class="rating-card">
            <div class="rating-card-badge restricted">
              <i class="fas fa-ban"></i> Restricted
            </div>
            <div class="rating-card-title">Mature audiences only</div>
            <div class="rating-card-desc">May contain intense violence, heavy blood, or strong fear elements.</div>
          </div>
        </div>
      </div>
      
      <!-- Wiki Profiles -->
      <div class="about-card wiki-profiles-card">
        <h2>My Fandom Wiki Profiles</h2>
        <div class="wiki-profiles-grid">
          ${wikiGames.map(game => `
            <a href="${game.fandomUrl}" target="_blank" rel="noopener noreferrer" class="wiki-profile-link">
              <i class="fab fa-wikipedia-w"></i>
              <div class="wiki-profile-info">
                <div class="wiki-profile-name">${escapeHtml(game.name)} Wiki</div>
                <div class="wiki-profile-game">My profile on ${escapeHtml(game.name)} Fandom</div>
              </div>
              <i class="fas fa-external-link-alt"></i>
            </a>
          `).join('')}
        </div>
        ${wikiGames.length === 0 ? '<p style="color: var(--text-dim); font-size: 13px; margin-top: 12px;">No wiki profiles added yet.</p>' : ''}
      </div>
    </div>
  `;
  
  aboutPanel.innerHTML = aboutHTML;
}

// Helper function for escaping HTML (reused from main script)
function escapeHtml(str) {
  if (!str) return '';
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

// Initialize about section when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', generateAboutContent);
} else {
  generateAboutContent();
}