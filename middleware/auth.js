function checkAuth(req, res, next) {
  const publicPaths = [
    "/api/",
    "/",
    "/request",
    "/login",
    "/register",
    "/assets/",
    "/favicon.ico",
  ];

  if (
    publicPaths.some((path) => req.path.startsWith(path)) ||
    req.path.includes(".")
  ) {
    return next();
  }

  if (req.path === "/admin" || req.path.startsWith("/admin")) {
    const token = req.cookies?.admin_token;
    if (token === "authenticated") {
      return next();
    }
    return res.redirect("/?login=required");
  }

  if (req.path === "/profile" || req.path.startsWith("/profile")) {
    const clientToken = req.cookies?.client_token;
    if (clientToken === "authenticated") {
      return next();
    }
    return res.redirect("/login");
  }

  if (req.path.startsWith("/api/profile")) {
    const clientToken = req.cookies?.client_token;
    if (clientToken === "authenticated") {
      return next();
    }
    return res
      .status(401)
      .json({ success: false, error: "Требуется авторизация" });
  }

  next();
}

module.exports = checkAuth;
