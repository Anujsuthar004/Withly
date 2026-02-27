let Pool = null;
try {
  ({ Pool } = require("pg"));
} catch {
  Pool = null;
}

function normalizeTags(value) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((entry) => String(entry).trim().toLowerCase())
    .filter(Boolean)
    .slice(0, 8);
}

function clampRadius(value) {
  const numberValue = Number(value);
  if (Number.isNaN(numberValue)) {
    return 8;
  }
  return Math.min(30, Math.max(1, Math.round(numberValue)));
}

function overlapCount(left, right) {
  const set = new Set(left);
  return right.reduce((count, item) => (set.has(item) ? count + 1 : count), 0);
}

function scoreCompanion(companion, request) {
  if (!companion.supports.includes(request.mode)) {
    return null;
  }
  if (request.verifiedOnly && !companion.verified) {
    return null;
  }

  const distanceScore = Math.max(0, 30 - Math.round((companion.distanceKm / request.radius) * 30));
  const sharedTags = overlapCount(request.tags, companion.tags);
  const tagScore = Math.min(24, sharedTags * 8);
  const reliabilityScore = Math.round((Number(companion.reliability) / 100) * 26);
  const categoryBonus = companion.tags.includes(request.category) ? 6 : 0;
  const verifiedBonus = companion.verified ? 4 : 0;

  return distanceScore + tagScore + reliabilityScore + categoryBonus + verifiedBonus;
}

function timeText(rawTime) {
  const parsed = new Date(rawTime);
  if (Number.isNaN(parsed.getTime())) {
    return "Custom time";
  }

  return parsed.toLocaleString([], {
    weekday: "short",
    hour: "numeric",
    minute: "2-digit",
  });
}

function mapCompanionRow(row) {
  return {
    id: row.id,
    name: row.name,
    supports: Array.isArray(row.supports) ? row.supports : [],
    tags: normalizeTags(row.tags),
    distanceKm: Number(row.distance_km),
    reliability: Number(row.reliability),
    verified: Boolean(row.verified),
    completed: Number(row.completed),
  };
}

function mapRequestRow(row) {
  const time = row.time instanceof Date ? row.time.toISOString() : String(row.time);
  const createdAt = row.created_at instanceof Date ? row.created_at.toISOString() : String(row.created_at);
  const matchedAt = row.matched_at
    ? row.matched_at instanceof Date
      ? row.matched_at.toISOString()
      : String(row.matched_at)
    : null;

  return {
    id: row.id,
    mode: row.mode,
    title: row.title,
    category: row.category,
    time,
    location: row.location,
    radius: Number(row.radius_km),
    tags: normalizeTags(row.tags),
    verifiedOnly: Boolean(row.verified_only),
    checkIn: Boolean(row.check_in),
    status: row.status,
    matchedUserId: row.matched_user_id || null,
    matchedCompanionId: row.matched_companion_id || null,
    matchedAt,
    createdAt,
    createdBy: row.created_by || null,
    createdByName: row.created_by_name || null,
  };
}

function mapPostRow(row) {
  const createdAt = row.created_at instanceof Date ? row.created_at.toISOString() : String(row.created_at);
  return {
    id: row.id,
    userId: row.user_id,
    displayName: row.display_name || "Member",
    text: row.text,
    tags: normalizeTags(row.tags),
    visibility: row.visibility === "verified-only" ? "verified-only" : "public",
    helpfulCount: Number(row.helpful_count || 0),
    createdAt,
  };
}

function mapUserRow(row) {
  if (!row) {
    return null;
  }

  return {
    id: row.id,
    email: row.email,
    displayName: row.display_name,
    role: row.role,
    createdAt: row.created_at instanceof Date ? row.created_at.toISOString() : String(row.created_at),
    passwordHash: row.password_hash,
    googleSub: row.google_sub || null,
    emailVerified: typeof row.email_verified === "boolean" ? row.email_verified : true,
    emailVerifiedAt: row.email_verified_at
      ? row.email_verified_at instanceof Date
        ? row.email_verified_at.toISOString()
        : String(row.email_verified_at)
      : null,
  };
}

class PostgresStore {
  constructor({ connectionString, metrics, categories, ssl }) {
    this.connectionString = connectionString;
    this.metrics = metrics;
    this.categories = categories;
    this.pool = null;
    this.ssl = ssl;
  }

  async init() {
    if (!Pool) {
      throw new Error("Postgres driver missing. Run: npm install pg");
    }

    if (!this.connectionString) {
      throw new Error("DATABASE_URL is required for postgres storage mode.");
    }

    this.pool = new Pool({
      connectionString: this.connectionString,
      ssl: this.ssl,
    });

    await this.pool.query("select 1");

    const tableCheck = await this.pool.query("select to_regclass('public.users') as users_table");
    if (!tableCheck.rows[0] || !tableCheck.rows[0].users_table) {
      throw new Error("Database schema not initialized. Run: npm run migrate");
    }
  }

  async health() {
    await this.pool.query("select 1");
  }

  async getBootstrap(mode) {
    return {
      mode,
      metrics: this.metrics,
      categories: this.categories,
      companions: await this.listCompanions(mode),
      feed: await this.getFeed(mode, 8),
    };
  }

  async getFeed(mode, limit = 8) {
    const result = await this.pool.query(
      `
      select
        requests.id,
        requests.mode,
        requests.title,
        requests.category,
        requests.time,
        requests.location,
        requests.tags,
        requests.verified_only,
        users.display_name as created_by_name
      from requests
      left join users on users.id = requests.created_by
      where requests.mode = $1 and requests.status = 'open'
      order by requests.created_at desc
      limit $2
      `,
      [mode, limit]
    );

    return result.rows.map((row) => ({
      id: row.id,
      mode: row.mode,
      title: row.title,
      category: row.category,
      location: row.location,
      timeText: timeText(row.time),
      tags: normalizeTags(row.tags),
      verifiedOnly: Boolean(row.verified_only),
      postedByName: row.created_by_name || "Member",
    }));
  }

  async listRequests(mode = null) {
    const query = mode
      ? {
          text: `
          select requests.*, users.display_name as created_by_name
          from requests
          left join users on users.id = requests.created_by
          where requests.mode = $1
          order by requests.created_at desc
          `,
          values: [mode],
        }
      : {
          text: `
          select requests.*, users.display_name as created_by_name
          from requests
          left join users on users.id = requests.created_by
          order by requests.created_at desc
          `,
          values: [],
        };

    const result = await this.pool.query(query);
    return result.rows.map(mapRequestRow);
  }

  async findRequestById(requestId) {
    const result = await this.pool.query(
      `
      select requests.*, users.display_name as created_by_name
      from requests
      left join users on users.id = requests.created_by
      where requests.id = $1
      limit 1
      `,
      [requestId]
    );
    if (result.rowCount === 0) {
      return null;
    }
    return mapRequestRow(result.rows[0]);
  }

  async findCompanionById(companionId) {
    const result = await this.pool.query("select * from companions where id = $1 limit 1", [companionId]);
    if (result.rowCount === 0) {
      return null;
    }
    return mapCompanionRow(result.rows[0]);
  }

  async listCompanions(mode) {
    const result = await this.pool.query(
      `
      select *
      from companions
      where $1 = any(supports)
      order by verified desc, reliability desc
      `,
      [mode]
    );

    return result.rows.map(mapCompanionRow);
  }

  async getMatchesForRequest(request) {
    const companions = await this.listCompanions(request.mode);
    return companions
      .map((companion) => ({
        ...companion,
        score: scoreCompanion(companion, request),
      }))
      .filter((entry) => entry.score !== null)
      .sort((left, right) => right.score - left.score)
      .slice(0, 20);
  }

  async createRequest(payload, actorUserId = null) {
    const safeTime = new Date(payload.time);
    const requestTime = Number.isNaN(safeTime.getTime()) ? new Date() : safeTime;

    const result = await this.pool.query(
      `
      insert into requests (
        mode, title, category, time, location, radius_km, tags,
        verified_only, check_in, status, created_by
      )
      values ($1,$2,$3,$4,$5,$6,$7,$8,$9,'open',$10)
      returning *
      `,
      [
        payload.mode,
        payload.title,
        payload.category,
        requestTime,
        payload.location,
        clampRadius(payload.radius),
        normalizeTags(payload.tags),
        Boolean(payload.verifiedOnly),
        Boolean(payload.checkIn),
        actorUserId,
      ]
    );

    const hydratedResult = await this.pool.query(
      `
      select requests.*, users.display_name as created_by_name
      from requests
      left join users on users.id = requests.created_by
      where requests.id = $1
      limit 1
      `,
      [result.rows[0].id]
    );
    const request = mapRequestRow(hydratedResult.rows[0]);
    return {
      request,
      matches: await this.getMatchesForRequest(request),
      feed: await this.getFeed(request.mode, 8),
    };
  }

  async createEvent({ type, requestId, companionId = null, actorUserId = null, metadata = null }) {
    const result = await this.pool.query(
      `
      insert into request_events (type, request_id, companion_id, actor_user_id, metadata)
      values ($1,$2,$3,$4,$5)
      returning id, type, request_id as "requestId", companion_id as "companionId", actor_user_id as "actorUserId", metadata, created_at as "createdAt"
      `,
      [type, requestId, companionId, actorUserId, metadata]
    );

    return result.rows[0];
  }

  async acceptMatch({ requestId, companionId, actorUserId = null }) {
    const requestResult = await this.pool.query(
      `
      update requests
      set status = 'matched',
          matched_user_id = null,
          matched_companion_id = $2,
          matched_at = now(),
          updated_at = now()
      where id = $1 and status = 'open'
      returning *
      `,
      [requestId, companionId]
    );

    if (requestResult.rowCount === 0) {
      return null;
    }

    const request = mapRequestRow(requestResult.rows[0]);
    const companion = await this.findCompanionById(companionId);
    const event = await this.createEvent({
      type: "accept",
      requestId,
      companionId,
      actorUserId,
      metadata: null,
    });

    return {
      request,
      companion,
      event,
      feed: await this.getFeed(request.mode, 8),
    };
  }

  async matchRequestWithUser({ requestId, matchedUserId, actorUserId = null }) {
    const requestResult = await this.pool.query(
      `
      update requests
      set status = 'matched',
          matched_user_id = $2,
          matched_companion_id = null,
          matched_at = now(),
          updated_at = now()
      where id = $1 and status = 'open'
      returning *
      `,
      [requestId, matchedUserId]
    );

    if (requestResult.rowCount === 0) {
      return null;
    }

    const request = mapRequestRow(requestResult.rows[0]);
    const event = await this.createEvent({
      type: "join-match",
      requestId,
      companionId: null,
      actorUserId,
      metadata: { matchedUserId },
    });

    return {
      request,
      event,
      feed: await this.getFeed(request.mode, 8),
    };
  }

  async createUser({ email, passwordHash, displayName }) {
    const countResult = await this.pool.query("select count(*)::int as count from users");
    const isFirstUser = Number(countResult.rows[0].count) === 0;
    const role = isFirstUser ? "admin" : "member";

    const result = await this.pool.query(
      `
      insert into users (email, password_hash, display_name, role, google_sub, email_verified, email_verified_at)
      values ($1,$2,$3,$4,$5,false,null)
      returning *
      `,
      [email.toLowerCase(), passwordHash || null, displayName, role, null]
    );

    return mapUserRow(result.rows[0]);
  }

  async createGoogleUser({ email, displayName, googleSub }) {
    const countResult = await this.pool.query("select count(*)::int as count from users");
    const isFirstUser = Number(countResult.rows[0].count) === 0;
    const role = isFirstUser ? "admin" : "member";

    const result = await this.pool.query(
      `
      insert into users (email, password_hash, display_name, role, google_sub, email_verified, email_verified_at)
      values ($1,null,$2,$3,$4,true,now())
      returning *
      `,
      [email.toLowerCase(), displayName, role, googleSub]
    );

    return mapUserRow(result.rows[0]);
  }

  async findUserByEmail(email) {
    const result = await this.pool.query("select * from users where email = $1 limit 1", [email.toLowerCase()]);
    if (result.rowCount === 0) {
      return null;
    }
    return mapUserRow(result.rows[0]);
  }

  async findUserById(userId) {
    const result = await this.pool.query("select * from users where id = $1 limit 1", [userId]);
    if (result.rowCount === 0) {
      return null;
    }
    return mapUserRow(result.rows[0]);
  }

  async findUserByGoogleSub(googleSub) {
    const result = await this.pool.query("select * from users where google_sub = $1 limit 1", [googleSub]);
    if (result.rowCount === 0) {
      return null;
    }
    return mapUserRow(result.rows[0]);
  }

  async linkGoogleSub({ userId, googleSub }) {
    const result = await this.pool.query(
      `
      update users
      set google_sub = $2, updated_at = now()
      where id = $1
      returning *
      `,
      [userId, googleSub]
    );
    if (result.rowCount === 0) {
      return null;
    }
    return mapUserRow(result.rows[0]);
  }

  async listUsers() {
    const result = await this.pool.query(
      `
      select *
      from users
      order by created_at desc
      `
    );
    return result.rows.map(mapUserRow);
  }

  async updateUserRole({ userId, role }) {
    const result = await this.pool.query(
      `
      update users
      set role = $2, updated_at = now()
      where id = $1
      returning *
      `,
      [userId, role]
    );
    if (result.rowCount === 0) {
      return null;
    }
    return mapUserRow(result.rows[0]);
  }

  async updateRequestStatus({ requestId, status }) {
    const result = await this.pool.query(
      `
      update requests
      set status = $2,
          matched_user_id = case when $2 = 'matched' then matched_user_id else null end,
          matched_companion_id = case when $2 = 'matched' then matched_companion_id else null end,
          matched_at = case when $2 = 'matched' then matched_at else null end,
          updated_at = now()
      where id = $1
      returning *
      `,
      [requestId, status]
    );
    if (result.rowCount === 0) {
      return null;
    }
    return mapRequestRow(result.rows[0]);
  }

  async ensureAdminByEmail(email) {
    const normalized = String(email || "").trim().toLowerCase();
    if (!normalized) {
      return null;
    }

    const result = await this.pool.query(
      `
      update users
      set role = 'admin',
          email_verified = true,
          email_verified_at = coalesce(email_verified_at, now()),
          updated_at = now()
      where email = $1
      returning *
      `,
      [normalized]
    );

    if (result.rowCount === 0) {
      return null;
    }

    return mapUserRow(result.rows[0]);
  }

  async getAdminOverview() {
    const usersResult = await this.pool.query(
      `
      select
        count(*)::int as users_total,
        count(*) filter (where role = 'admin')::int as admins_total
      from users
      `
    );
    const requestsResult = await this.pool.query(
      `
      select
        count(*)::int as requests_total,
        count(*) filter (where status = 'open')::int as requests_open,
        count(*) filter (where status = 'matched')::int as requests_matched
      from requests
      `
    );
    const reportsResult = await this.pool.query(
      `
      select
        count(*)::int as reports_total,
        count(*) filter (where status = 'open')::int as reports_open
      from reports
      `
    );
    const eventsResult = await this.pool.query("select count(*)::int as events_total from request_events");

    return {
      usersTotal: Number(usersResult.rows[0].users_total),
      adminsTotal: Number(usersResult.rows[0].admins_total),
      membersTotal: Number(usersResult.rows[0].users_total) - Number(usersResult.rows[0].admins_total),
      requestsTotal: Number(requestsResult.rows[0].requests_total),
      requestsOpen: Number(requestsResult.rows[0].requests_open),
      requestsMatched: Number(requestsResult.rows[0].requests_matched),
      reportsTotal: Number(reportsResult.rows[0].reports_total),
      reportsOpen: Number(reportsResult.rows[0].reports_open),
      eventsTotal: Number(eventsResult.rows[0].events_total),
    };
  }

  async markUserEmailVerified(userId) {
    const result = await this.pool.query(
      `
      update users
      set email_verified = true,
          email_verified_at = coalesce(email_verified_at, now()),
          updated_at = now()
      where id = $1
      returning *
      `,
      [userId]
    );
    if (result.rowCount === 0) {
      return null;
    }
    return mapUserRow(result.rows[0]);
  }

  async createEmailVerificationCode({ userId, code, expiresAt }) {
    const result = await this.pool.query(
      `
      insert into email_verification_codes (user_id, code, expires_at)
      values ($1,$2,$3)
      returning id, user_id as "userId", code, expires_at as "expiresAt", used_at as "usedAt", created_at as "createdAt"
      `,
      [userId, code, new Date(expiresAt)]
    );
    return result.rows[0];
  }

  async findValidEmailVerificationCode({ email, code }) {
    const result = await this.pool.query(
      `
      select
        evc.id,
        evc.user_id as "userId"
      from email_verification_codes evc
      join users on users.id = evc.user_id
      where users.email = $1
        and evc.code = $2
        and evc.used_at is null
        and evc.expires_at > now()
      order by evc.created_at desc
      limit 1
      `,
      [email.toLowerCase(), code]
    );
    if (result.rowCount === 0) {
      return null;
    }
    return result.rows[0];
  }

  async consumeEmailVerificationCode(codeId) {
    const result = await this.pool.query(
      `
      update email_verification_codes
      set used_at = now()
      where id = $1
      returning id
      `,
      [codeId]
    );
    if (result.rowCount === 0) {
      return null;
    }
    return result.rows[0];
  }

  async createPasswordResetCode({ userId, code, expiresAt }) {
    const result = await this.pool.query(
      `
      insert into password_reset_codes (user_id, code, expires_at)
      values ($1,$2,$3)
      returning id, user_id as "userId", code, expires_at as "expiresAt", used_at as "usedAt", created_at as "createdAt"
      `,
      [userId, code, new Date(expiresAt)]
    );
    return result.rows[0];
  }

  async findValidPasswordResetCode({ email, code }) {
    const result = await this.pool.query(
      `
      select
        prc.id,
        prc.user_id as "userId"
      from password_reset_codes prc
      join users on users.id = prc.user_id
      where users.email = $1
        and prc.code = $2
        and prc.used_at is null
        and prc.expires_at > now()
      order by prc.created_at desc
      limit 1
      `,
      [email.toLowerCase(), code]
    );
    if (result.rowCount === 0) {
      return null;
    }
    return result.rows[0];
  }

  async consumePasswordResetCode(codeId) {
    const result = await this.pool.query(
      `
      update password_reset_codes
      set used_at = now()
      where id = $1
      returning id
      `,
      [codeId]
    );
    if (result.rowCount === 0) {
      return null;
    }
    return result.rows[0];
  }

  async updateUserPassword({ userId, passwordHash }) {
    const result = await this.pool.query(
      `
      update users
      set password_hash = $2,
          updated_at = now()
      where id = $1
      returning *
      `,
      [userId, passwordHash]
    );
    if (result.rowCount === 0) {
      return null;
    }
    return mapUserRow(result.rows[0]);
  }

  async listMessagesForRequest(requestId) {
    const result = await this.pool.query(
      `
      select
        id,
        request_id as "requestId",
        sender_type as "senderType",
        sender_user_id as "senderUserId",
        sender_name as "senderName",
        content,
        created_at as "createdAt"
      from request_messages
      where request_id = $1
      order by created_at asc
      `,
      [requestId]
    );
    return result.rows;
  }

  async createMessage({ requestId, senderType, senderUserId = null, senderName, content }) {
    const result = await this.pool.query(
      `
      insert into request_messages (request_id, sender_type, sender_user_id, sender_name, content)
      values ($1,$2,$3,$4,$5)
      returning
        id,
        request_id as "requestId",
        sender_type as "senderType",
        sender_user_id as "senderUserId",
        sender_name as "senderName",
        content,
        created_at as "createdAt"
      `,
      [requestId, senderType, senderUserId, senderName, content]
    );
    return result.rows[0];
  }

  async createReport({ reporterUserId, requestId = null, companionId = null, reason, details = "" }) {
    const result = await this.pool.query(
      `
      insert into reports (reporter_user_id, request_id, companion_id, reason, details)
      values ($1,$2,$3,$4,$5)
      returning id, reporter_user_id as "reporterUserId", request_id as "requestId", companion_id as "companionId", reason, details, status, created_at as "createdAt"
      `,
      [reporterUserId, requestId, companionId, reason, details]
    );
    return result.rows[0];
  }

  async listReports(status = null) {
    const query = status
      ? {
          text: `
          select
            reports.id,
            reports.reporter_user_id as "reporterUserId",
            reports.request_id as "requestId",
            reports.companion_id as "companionId",
            reports.reason,
            reports.details,
            reports.status,
            reports.resolution_note as "resolutionNote",
            reports.created_at as "createdAt",
            reports.updated_at as "updatedAt",
            users.email as "reporterEmail",
            users.display_name as "reporterName"
          from reports
          left join users on users.id = reports.reporter_user_id
          where reports.status = $1
          order by reports.created_at desc
          `,
          values: [status],
        }
      : {
          text: `
          select
            reports.id,
            reports.reporter_user_id as "reporterUserId",
            reports.request_id as "requestId",
            reports.companion_id as "companionId",
            reports.reason,
            reports.details,
            reports.status,
            reports.resolution_note as "resolutionNote",
            reports.created_at as "createdAt",
            reports.updated_at as "updatedAt",
            users.email as "reporterEmail",
            users.display_name as "reporterName"
          from reports
          left join users on users.id = reports.reporter_user_id
          order by reports.created_at desc
          `,
          values: [],
        };

    const result = await this.pool.query(query);
    return result.rows;
  }

  async resolveReport({ reportId, status, resolutionNote = "", resolverUserId = null }) {
    const result = await this.pool.query(
      `
      update reports
      set status = $2,
          resolution_note = $3,
          resolved_by_user_id = $4,
          updated_at = now()
      where id = $1
      returning id, status, resolution_note as "resolutionNote", resolved_by_user_id as "resolvedByUserId", updated_at as "updatedAt"
      `,
      [reportId, status, resolutionNote, resolverUserId]
    );

    if (result.rowCount === 0) {
      return null;
    }

    return result.rows[0];
  }

  async createPost({ userId, text, tags = [], visibility = "public" }) {
    const result = await this.pool.query(
      `
      insert into social_posts (user_id, text, tags, visibility)
      values ($1,$2,$3,$4)
      returning *
      `,
      [userId, text, normalizeTags(tags), visibility]
    );

    const hydrated = await this.pool.query(
      `
      select social_posts.*, users.display_name
      from social_posts
      join users on users.id = social_posts.user_id
      where social_posts.id = $1
      limit 1
      `,
      [result.rows[0].id]
    );
    return mapPostRow(hydrated.rows[0]);
  }

  async listPosts({ limit = 20, offset = 0, userId = null, viewer = null }) {
    const safeLimit = Math.min(50, Math.max(1, Number(limit) || 20));
    const safeOffset = Math.max(0, Number(offset) || 0);

    const values = [];
    let where = "where 1 = 1";

    if (userId) {
      values.push(userId);
      where += ` and social_posts.user_id = $${values.length}`;
    }

    if (viewer && (viewer.role === "admin" || viewer.emailVerified)) {
      // verified/admin viewers can see both public and verified-only posts.
    } else if (viewer && viewer.id) {
      values.push(viewer.id);
      where += ` and (social_posts.visibility = 'public' or social_posts.user_id = $${values.length})`;
    } else {
      where += " and social_posts.visibility = 'public'";
    }

    values.push(safeLimit);
    values.push(safeOffset);

    const result = await this.pool.query(
      `
      select social_posts.*, users.display_name
      from social_posts
      join users on users.id = social_posts.user_id
      ${where}
      order by social_posts.created_at desc
      limit $${values.length - 1}
      offset $${values.length}
      `,
      values
    );
    return result.rows.map(mapPostRow);
  }

  async getPublicProfile(userId) {
    const userResult = await this.pool.query(
      `
      select id, display_name, email_verified, created_at
      from users
      where id = $1
      limit 1
      `,
      [userId]
    );
    if (userResult.rowCount === 0) {
      return null;
    }

    const requestCounts = await this.pool.query(
      `
      select
        count(*)::int as total_requests,
        count(*) filter (where status = 'open')::int as open_requests,
        count(*) filter (where status = 'matched')::int as matched_requests,
        count(*) filter (where status = 'closed')::int as closed_requests
      from requests
      where created_by = $1
      `,
      [userId]
    );

    const requestsResult = await this.pool.query(
      `
      select requests.*, users.display_name as created_by_name
      from requests
      left join users on users.id = requests.created_by
      where requests.created_by = $1
      order by requests.created_at desc
      limit 30
      `,
      [userId]
    );

    const postsCountResult = await this.pool.query(
      `
      select count(*)::int as post_count
      from social_posts
      where user_id = $1
      `,
      [userId]
    );

    const counts = requestCounts.rows[0];
    const totalRequests = Number(counts.total_requests || 0);
    const closedRequests = Number(counts.closed_requests || 0);
    const matchedRequests = Number(counts.matched_requests || 0);
    const openRequests = Number(counts.open_requests || 0);
    const completionRate = totalRequests > 0 ? Math.round((closedRequests / totalRequests) * 100) : 0;
    const reliabilityScore =
      totalRequests > 0 ? Math.min(99, Math.round(((closedRequests + matchedRequests * 0.6) / totalRequests) * 100)) : 80;

    const user = userResult.rows[0];
    return {
      userId: user.id,
      displayName: user.display_name,
      joinDate: user.created_at instanceof Date ? user.created_at.toISOString() : String(user.created_at),
      badges: {
        verified: Boolean(user.email_verified),
        reliabilityScore,
        completionRate,
      },
      summary: {
        postCount: Number(postsCountResult.rows[0].post_count || 0),
        requestCount: totalRequests,
        activeRequests: openRequests + matchedRequests,
        completedRequests: closedRequests,
      },
      requests: requestsResult.rows.map(mapRequestRow),
    };
  }

  async close() {
    if (this.pool) {
      await this.pool.end();
    }
  }
}

module.exports = {
  PostgresStore,
};
