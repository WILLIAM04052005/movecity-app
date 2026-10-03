// --- Vérification que le serveur répond ---
async function verifierSante() {
  const el = document.getElementById('health-status');
  try {
    const res = await fetch('/api/health');
    const data = await res.json();
    el.textContent = `✅ Serveur opérationnel (${data.timestamp})`;
  } catch (err) {
    el.textContent = '❌ Impossible de contacter le serveur.';
  }
}

// --- Récupération et affichage des données ascenseurs ---
async function chargerAscenseurs() {
  const liste = document.getElementById('ascenseurs-liste');
  try {
    const res = await fetch('/api/ascenseurs');
    const { data, avertissement } = await res.json();

    liste.innerHTML = '';
    data.forEach(item => {
      const li = document.createElement('li');
      li.innerHTML = `
        <span>${item.station}</span>
        <span class="statut-${item.statut}">${item.statut.replace('_', ' ')}</span>
      `;
      liste.appendChild(li);
    });

    if (avertissement) {
      const warn = document.createElement('p');
      warn.textContent = `⚠️ ${avertissement}`;
      liste.after(warn);
    }
  } catch (err) {
    liste.innerHTML = '<li>Impossible de charger les données pour le moment.</li>';
  }
}

// --- Mode simplifié (accessibilité) ---
function initSimpleModeToggle() {
  const btn = document.getElementById('simple-mode-toggle');
  btn.addEventListener('click', () => {
    const actif = document.body.classList.toggle('simple-mode');
    btn.setAttribute('aria-pressed', actif);
  });
}

verifierSante();
chargerAscenseurs();
initSimpleModeToggle();
