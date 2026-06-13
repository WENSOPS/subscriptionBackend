const signatureVerificationMiddleware = (req, res, next) => {
  const signature = req.headers["x-signature"];
  const secret = process.env.WEBHOOK_SECRET;

  console.log("Received signature:", signature);
  console.log("Expected secret:", secret);

  if (!signature || signature !== secret) {
    return res.status(403).json({ message: "Forbidden" });
  }

  next();
};

export default signatureVerificationMiddleware;
