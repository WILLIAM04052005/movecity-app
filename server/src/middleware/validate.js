const { HttpError } = require('../utils/http');

function valider(schema, source = 'body') {
  return (req, res, next) => {
    const resultat = schema.safeParse(req[source]);
    if (!resultat.success) {
      const details = resultat.error.issues.map(i => ({
        champ: i.path.join('.') || source,
        message: i.message
      }));
      return next(new HttpError(400, 'Données invalides.', details));
    }
    req[source] = resultat.data;
    next();
  };
}

module.exports = { valider };
