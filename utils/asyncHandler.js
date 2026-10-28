// Forwards rejected promises from async route handlers to Express' error handler.
export default (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
