export const roles = ["guest", "user", "admin"];

const permissions = {
  guest: new Set(["listings:read"]),
  user: new Set([
    "listings:read",
    "listing:create",
    "listing:update:own",
    "listing:delete:own",
    "chat:create",
    "review:create",
    "report:create"
  ]),
  admin: new Set([
    "listings:read",
    "listing:create",
    "listing:update:own",
    "listing:delete:own",
    "chat:create",
    "review:create",
    "report:create",
    "admin:review",
    "admin:analytics",
    "user:suspend",
    "listing:moderate"
  ])
};

export function canAccess(role = "guest", permission) {
  return Boolean(permissions[role]?.has(permission));
}

export function requireRolePermission(permission) {
  return (req, res, next) => {
    if (!canAccess(req.user?.role ?? "guest", permission)) {
      return res.status(403).json({ error: "Forbidden" });
    }
    next();
  };
}
