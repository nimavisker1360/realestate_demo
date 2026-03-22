module.exports = async (req, res) => {
  const { default: app } = await import("../backend/app.js");
  return app(req, res);
};
