// ============================================================
// Schémas de validation (zod) : tout ce qui entre dans l'API est vérifié ici.
// ============================================================
const { z } = require('zod');

const id = z.coerce.number().int().positive();
const latitude = z.coerce.number().min(-90).max(90);
const longitude = z.coerce.number().min(-180).max(180);
const statut = z.enum(['disponible', 'en_panne', 'inconnu']);

const auMoinsUnChamp = obj => Object.keys(obj).length > 0;
const MESSAGE_VIDE = { message: 'Fournissez au moins un champ à modifier.' };

const params = { id: z.object({ id }) };

const stations = {
  proches: z.object({
    lat: latitude,
    lon: longitude,
    limit: z.coerce.number().int().min(1).max(20).default(3)
  }),
  creer: z.object({
    nom_station: z.string().trim().min(1).max(120),
    latitude,
    longitude,
    lignes: z.array(z.string().trim().min(1).max(20)).max(20).optional()
  }),
  modifier: z
    .object({
      nom_station: z.string().trim().min(1).max(120),
      latitude,
      longitude,
      lignes: z.array(z.string().trim().min(1).max(20)).max(20)
    })
    .partial()
    .refine(auMoinsUnChamp, MESSAGE_VIDE)
};

const ascenseurs = {
  lister: z.object({ statut: statut.optional(), id_station: id.optional() }),
  stats: z.object({ limite: z.coerce.number().int().min(1).max(20).default(5) }),
  creer: z.object({
    statut: statut.default('inconnu'),
    cause_panne: z.string().trim().min(1).max(200).nullish(),
    id_station: id,
    ref_externe: z.string().trim().min(1).max(50).nullish()
  }),
  modifier: z
    .object({
      statut,
      cause_panne: z.string().trim().min(1).max(200).nullable()
    })
    .partial()
    .refine(auMoinsUnChamp, MESSAGE_VIDE)
};

const auth = {
  login: z.object({
    email: z.string().trim().toLowerCase().max(254),
    password: z.string().min(1).max(200)
  })
};

const geocode = z.object({
  q: z
    .string({ message: 'Adresse requise.' })
    .trim()
    .min(3, { message: 'Adresse trop courte (3 caractères minimum).' })
    .max(200, { message: 'Adresse trop longue.' }),
  lang: z.enum(['fr', 'en']).catch('fr')
});

const stats = {
  usage: z.object({ jours: z.coerce.number().int().min(1).max(365).default(30) })
};

module.exports = { params, stations, ascenseurs, auth, geocode, stats };
