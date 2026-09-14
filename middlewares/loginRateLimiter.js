import { Redis } from "@upstash/redis";

// ==========================================
// REDIS
// ==========================================

const redis = Redis.fromEnv();

// ==========================================
// SETTINGS
// ==========================================

const MAX_FAILED_ATTEMPTS = 5;

// 15 minutes
const BLOCK_TIME_SECONDS = 15 * 60;

// Failed-attempt counter also expires after 15 min
const ATTEMPT_WINDOW_SECONDS = 15 * 60;

// ==========================================
// GET CLIENT IP
// ==========================================

const getClientIp = (req) => {
  const forwarded =
    req.headers["x-forwarded-for"];

  if (forwarded) {
    return forwarded
      .split(",")[0]
      .trim();
  }

  return (
    req.headers["x-real-ip"] ||
    req.socket?.remoteAddress ||
    req.ip ||
    "unknown"
  );
};

// ==========================================
// NORMALIZE LOGIN IDENTIFIER
// ==========================================

const getLoginIdentifier = (req) => {
  const { phone, email } = req.body || {};

  if (phone) {
    return `phone:${String(phone).trim()}`;
  }

  if (email) {
    return `email:${String(email)
      .trim()
      .toLowerCase()}`;
  }

  return "unknown";
};

// ==========================================
// BUILD KEYS
// ==========================================

const getKeys = (req) => {
  const ip = getClientIp(req);

  const identifier =
    getLoginIdentifier(req);

  return {
    ip,

    identifier,

    ipAttemptKey:
      `login:attempts:ip:${ip}`,

    ipBlockKey:
      `login:block:ip:${ip}`,

    accountAttemptKey:
      `login:attempts:account:${identifier}`,

    accountBlockKey:
      `login:block:account:${identifier}`,
  };
};

// ==========================================
// LOGIN RATE LIMITER
//
// Runs BEFORE login controller.
// It does NOT count attempts here.
// It only checks whether the IP/account
// has already been blocked.
// ==========================================

const loginRateLimiter = async (
  req,
  res,
  next
) => {
  try {
    const {
      ipBlockKey,
      accountBlockKey,
    } = getKeys(req);

    const [
      ipBlocked,
      accountBlocked,
    ] = await Promise.all([
      redis.get(ipBlockKey),
      redis.get(accountBlockKey),
    ]);

    // ======================================
    // BLOCKED
    // ======================================

    if (ipBlocked || accountBlocked) {
      let ttl = 0;

      try {
        const ipTtl =
          await redis.ttl(
            ipBlockKey
          );

        const accountTtl =
          await redis.ttl(
            accountBlockKey
          );

        ttl = Math.max(
          Number(ipTtl || 0),
          Number(accountTtl || 0)
        );
      } catch (error) {
        console.log(
          "TTL CHECK ERROR:",
          error.message
        );
      }

      const retryAfterMinutes =
        Math.max(
          1,
          Math.ceil(ttl / 60)
        );

      return res
        .status(429)
        .json({
          success: false,

          code:
            "LOGIN_TEMPORARILY_BLOCKED",

          message:
            `Too many failed login attempts. Please try again in ${retryAfterMinutes} minute(s).`,

          retryAfter:
            ttl,
        });
    }

    next();
  } catch (error) {
    console.error(
      "LOGIN RATE LIMIT ERROR:",
      error
    );

    // Fail open:
    // if Redis has a temporary problem,
    // do not break login for every user.
    next();
  }
};

// ==========================================
// RECORD FAILED LOGIN
//
// Call this ONLY when credentials are wrong.
// ==========================================

export const recordFailedLogin =
  async (req) => {
    try {
      const {
        ipAttemptKey,
        ipBlockKey,
        accountAttemptKey,
        accountBlockKey,
      } = getKeys(req);

      // ======================================
      // INCREMENT IP ATTEMPTS
      // ======================================

      const ipAttempts =
        await redis.incr(
          ipAttemptKey
        );

      if (
        Number(ipAttempts) === 1
      ) {
        await redis.expire(
          ipAttemptKey,
          ATTEMPT_WINDOW_SECONDS
        );
      }

      // ======================================
      // INCREMENT ACCOUNT ATTEMPTS
      // ======================================

      const accountAttempts =
        await redis.incr(
          accountAttemptKey
        );

      if (
        Number(accountAttempts) === 1
      ) {
        await redis.expire(
          accountAttemptKey,
          ATTEMPT_WINDOW_SECONDS
        );
      }

      // ======================================
      // BLOCK IP
      // ======================================

      if (
        Number(ipAttempts) >=
        MAX_FAILED_ATTEMPTS
      ) {
        await redis.set(
          ipBlockKey,
          "blocked",
          {
            ex: BLOCK_TIME_SECONDS,
          }
        );

        await redis.del(
          ipAttemptKey
        );
      }

      // ======================================
      // BLOCK ACCOUNT
      // ======================================

      if (
        Number(accountAttempts) >=
        MAX_FAILED_ATTEMPTS
      ) {
        await redis.set(
          accountBlockKey,
          "blocked",
          {
            ex: BLOCK_TIME_SECONDS,
          }
        );

        await redis.del(
          accountAttemptKey
        );
      }

      return {
        ipAttempts:
          Number(ipAttempts),

        accountAttempts:
          Number(accountAttempts),

        blocked:
          Number(ipAttempts) >=
            MAX_FAILED_ATTEMPTS ||
          Number(accountAttempts) >=
            MAX_FAILED_ATTEMPTS,
      };
    } catch (error) {
      console.error(
        "FAILED LOGIN TRACK ERROR:",
        error
      );

      return null;
    }
  };

// ==========================================
// RESET LOGIN ATTEMPTS
//
// Call after a successful login.
// ==========================================

export const resetLoginAttempts =
  async (req) => {
    try {
      const {
        ipAttemptKey,
        accountAttemptKey,
      } = getKeys(req);

      await Promise.all([
        redis.del(ipAttemptKey),
        redis.del(
          accountAttemptKey
        ),
      ]);
    } catch (error) {
      console.error(
        "RESET LOGIN ATTEMPTS ERROR:",
        error
      );
    }
  };

export default loginRateLimiter;