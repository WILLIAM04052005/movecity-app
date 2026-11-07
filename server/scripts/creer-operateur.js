// Usage : npm run operateur:creer -- prenom.nom@exemple.fr "MotDePasseLong12+"
const bcrypt = require('bcryptjs');
const { pool } = require('../src/config/database');
const operateurs = require('../src/models/operateurs.model');

const [email, motDePasse] = process.argv.slice(2);

(async () => {
  if (!email || !motDePasse) throw new Error('Usage : npm run operateur:creer -- <email> <motDePasse>');
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) throw new Error('E-mail invalide.');
  if (motDePasse.length < 12) throw new Error('Mot de passe trop court (12 caractères minimum).');

  const o = await operateurs.creer(email, await bcrypt.hash(motDePasse, 12));
  console.log(`✔ Opérateur créé : ${o.email} (id ${o.id_operateur})`);
})()
  .catch(err => {
    console.error('✘', err.code === '23505' ? 'Cet e-mail existe déjà.' : err.message);
    process.exitCode = 1;
  })
  .finally(() => pool.end());
