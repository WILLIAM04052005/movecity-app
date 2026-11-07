/** Erreur « attendue » : porte le code HTTP à renvoyer au client. */
class HttpError extends Error {
  constructor(status, message, details) {
    super(message);
    this.status = status;
    this.details = details;
  }
}

/** Express 4 n'attrape pas les erreurs des fonctions async : ce wrapper les transmet. */
const asyncHandler = fn => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

module.exports = { HttpError, asyncHandler };
