// Chrona Player - Addon System & API
(function() {
    const ACTIVE_ADDONS = ["audiofeature.js", "videoenhancements.js"];


    window.ChronaAddonAPI = {
        addPlayerMenuItem: function(label, onClickCallback) {
            const dropdown = document.getElementById('player-dropdown');
            if (!dropdown) return;

            const btn = document.createElement('button');
            btn.className = 'player-dropdown-item';
            btn.textContent = label;
            
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                dropdown.classList.remove('show');
                if (typeof onClickCallback === 'function') onClickCallback(e);
            });

            dropdown.appendChild(btn);
        },

        addSubmenu: function(title, parentContainer = null) {
            const dropdown = document.getElementById('player-dropdown');
            const targetParent = parentContainer || dropdown;

            const entryBtn = document.createElement('button');
            entryBtn.className = 'player-dropdown-item';
            entryBtn.innerHTML = `
                <div style="display: flex; justify-content: space-between; align-items: center; width: 100%;">
                    <span>${title}</span>
                    <svg viewBox="0 0 24 24" style="width: 18px; height: 18px; fill: currentColor; opacity: 0.7;">
                        <path d="M10 6L8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z"/>
                    </svg>
                </div>
            `;

            const submenu = document.createElement('div');
            submenu.className = 'addon-submenu';
            submenu.innerHTML = `
                <div class="addon-submenu-header">
                    <svg viewBox="0 0 24 24"><path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z"/></svg>
                    ${title}
                </div>
                <div class="addon-submenu-content" style="display: flex; flex-direction: column; width: 100%;"></div>
            `;

            targetParent.appendChild(entryBtn);
            targetParent.appendChild(submenu);

            const contentContainer = submenu.querySelector('.addon-submenu-content');
            const backBtn = submenu.querySelector('.addon-submenu-header');

            entryBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                Array.from(targetParent.children).forEach(child => {
                    if (child !== submenu) child.style.display = 'none';
                });
                submenu.classList.add('active');
            });

            backBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                submenu.classList.remove('active');
                Array.from(targetParent.children).forEach(child => {
                    if (child !== submenu) child.style.display = '';
                });
            });

            return contentContainer;
        },
        
        getVideoElement: () => document.getElementById('video'),
        getAudioElement: () => document.getElementById('audio-stream')
    };

    const menuBtn = document.getElementById('player-menu-btn');
    const dropdown = document.getElementById('player-dropdown');

    if (menuBtn && dropdown) {
        menuBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            dropdown.classList.toggle('show');
        });

        document.addEventListener('click', (e) => {
            if (!menuBtn.contains(e.target) && !dropdown.contains(e.target)) {
                dropdown.classList.remove('show');
            }
        });
    }

    if (dropdown) {
        const resetAllMenus = () => {
            dropdown.querySelectorAll('.addon-submenu.active').forEach(sm => sm.classList.remove('active'));
            dropdown.querySelectorAll('.player-dropdown-item, .addon-submenu').forEach(el => el.style.display = '');
            Array.from(dropdown.children).forEach(child => child.style.display = '');
            dropdown.querySelectorAll('.addon-submenu-content > *').forEach(child => child.style.display = '');
        };
        
        const menuObserver = new MutationObserver((mutations) => {
            mutations.forEach((m) => {
                if (m.attributeName === 'class' && !dropdown.classList.contains('show')) {
                    resetAllMenus();
                }
            });
        });
        menuObserver.observe(dropdown, { attributes: true });
    }

    ACTIVE_ADDONS.forEach(scriptUrl => {
        const script = document.createElement('script');
        script.src = scriptUrl;
        script.async = true;
        script.onload = () => console.log(`[Addon System] Loaded addon: ${scriptUrl}`);
        script.onerror = () => console.error(`[Addon System] Failed to load addon: ${scriptUrl}`);
        document.body.appendChild(script);
    });
})();