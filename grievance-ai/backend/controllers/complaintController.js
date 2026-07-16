const prisma = require('../config/prisma');
const { analyzeComplaint, translateComplaint } = require('../services/aiService');
const { getNearbyFacilities } = require('../services/locationService');
const { getIO } = require('../socket');

const OPEN = ['Submitted', 'AI_Processing', 'Assigned', 'Accepted', 'In_Progress'];
let pretty = (s) => s.replaceAll('_', ' ');

const STOPWORDS = new Set(['the', 'and', 'for', 'with', 'from', 'this', 'that', 'building', 'issue', 'complaint', 'problem', 'street', 'sector', 'road', 'area', 'near']);

function normalizeText(value = '') {
  return String(value).toLowerCase().replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim();
}

function tokenize(value = '') {
  return normalizeText(value)
    .split(' ')
    .filter(token => token.length > 2 && !STOPWORDS.has(token));
}

function toNumberOrNull(value) {
  if (value === undefined || value === null || value === '') return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function distanceMeters(lat1, lon1, lat2, lon2) {
  const toRad = (value) => (value * Math.PI) / 180;
  const earthRadiusMeters = 6371000;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  return 2 * earthRadiusMeters * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function hasStrongDuplicateSignals(current, candidate, aiCategory) {
  if (!candidate) return false;

  const currentLat = toNumberOrNull(current.latitude);
  const currentLon = toNumberOrNull(current.longitude);
  const candidateLat = toNumberOrNull(candidate.latitude);
  const candidateLon = toNumberOrNull(candidate.longitude);
  const currentLocation = normalizeText(current.location || '');
  const candidateLocation = normalizeText(candidate.location || '');
  const sameLocation = currentLocation && candidateLocation && (currentLocation === candidateLocation || currentLocation.includes(candidateLocation) || candidateLocation.includes(currentLocation));
  const hasGeoMatch = Number.isFinite(currentLat) && Number.isFinite(currentLon) && Number.isFinite(candidateLat) && Number.isFinite(candidateLon)
    ? distanceMeters(currentLat, currentLon, candidateLat, candidateLon) <= 250
    : false;

  const currentTokens = new Set(tokenize(`${current.title || ''} ${current.description || ''}`));
  const candidateTokens = new Set(tokenize(`${candidate.title || ''} ${candidate.summary || ''}`));
  let overlap = 0;
  for (const token of currentTokens) {
    if (candidateTokens.has(token)) overlap += 1;
  }

  const sameCategory = aiCategory && candidate.category && normalizeText(aiCategory) === normalizeText(candidate.category);
  return (sameCategory && hasGeoMatch) || (sameCategory && sameLocation) || (hasGeoMatch && overlap >= 2) || (sameLocation && overlap >= 2) || overlap >= 4;
}

// POST /api/complaints   (multipart: title, description, location, files[])
exports.create = async (req,res) => {
  let {title, description, location} = req.body;
  let latitude = toNumberOrNull(req.body.latitude);
  let longitude = toNumberOrNull(req.body.longitude);
  let hasGeo = Number.isFinite(latitude) && Number.isFinite(longitude);
  if (!title?.trim() || !description?.trim()){
    return res.status(400).json({error: "Title and description are required."});
  }

  let complaint;
  try{
    // 1. store raw complaint
    complaint = await prisma.complaint.create({
      data: {
        userId: req.user.id,
        title: title.trim(),
        description: description.trim(),
        location: location?.trim() || null,
        latitude: hasGeo ? latitude : null,
        longitude: hasGeo ? longitude : null,
        status: 'AI_Processing',
        attachments: {
          create: (req.files || []).map(f => ({
            filename: f.originalname, path: '/uploads/' + f.filename, mimetype: f.mimetype
          }))
        },
        statusHistory: { create: [{ status: 'Submitted', updatedById: req.user.id }, { status: 'AI Processing' }] }
      }
    });
  } catch (err){
    console.log(err);
    return res.status(500).json({error: "Error occurred while creating complaint."});
  }

  // 2. respond immediately; AI runs in background
  res.status(201).json({complaint: complaint});

  // 3. AI pipeline: categorise -> department -> priority -> summary -> duplicate
  try{
    const facilityPromise = hasGeo ? getNearbyFacilities(latitude, longitude).catch((err) => {
      console.warn('[complaints] Nearby facility lookup failed:', err.message);
      return [];
    }) : Promise.resolve([]);

    let p1 = prisma.department.findMany();
    let p2 = prisma.complaint.findMany({
      where: { status: { in: OPEN }, id: { not: complaint.id }, duplicateId: null },
      orderBy: { createdAt: 'desc' }, take: 25,
      select: { id: true, title: true, summary: true, location: true, category: true, latitude: true, longitude: true }
    });
    let [departments, recent, nearbyFacilities] = await Promise.all([p1, p2, facilityPromise]);

    // Translate title/description if in transliterated Hindi/Marathi
    let translationResult = null;
    let triageTitle = complaint.title;
    let triageDescription = complaint.description;
    try {
      translationResult = await translateComplaint(complaint.title, complaint.description);
      if (translationResult.title.detected) {
        triageTitle = translationResult.title.english;
        console.log(`[complaints] Title translated from ${translationResult.title.language}: "${complaint.title}" -> "${triageTitle}"`);
      }
      if (translationResult.description.detected) {
        triageDescription = translationResult.description.english;
        console.log(`[complaints] Description translated from ${translationResult.description.language}: "${complaint.description}" -> "${triageDescription}"`);
      }
    } catch (err) {
      console.warn('[complaints] Translation step failed, proceeding with original text:', err.message);
    }

    let ai = await analyzeComplaint(triageTitle, triageDescription, departments, recent);
    const duplicateCandidate = ai.duplicateId ? recent.find((c) => c.id === ai.duplicateId) : null;
    const duplicateAllowed = hasStrongDuplicateSignals(complaint, duplicateCandidate, ai.category);
    const duplicateId = duplicateAllowed ? ai.duplicateId : null;

    // Build the status note including translation info
    const detectedLang = translationResult?.title?.language || translationResult?.description?.language || null;
    let statusNote = ai.duplicateId
      ? duplicateId
        ? `AI: linked as duplicate of complaint #${duplicateId}`
        : `AI: ${ai.category} · ${ai.priority} priority (duplicate rejected by local check)`
      : `AI: ${ai.category} · ${ai.priority} priority${ai.aiUsed ? '' : ' (heuristic fallback)'}`;
    if (detectedLang) {
      statusNote += ` · Translated from ${detectedLang}`;
    }

    let updated = await prisma.complaint.update({
      where: { id: complaint.id },
      data: {
        category: ai.category,
        departmentId: ai.departmentId,
        priority: ai.priority,
        summary: ai.summary,
        duplicateId: duplicateId,
        nearbyFacilities: nearbyFacilities.length ? nearbyFacilities : null,
        status: 'Assigned',
        statusHistory: {
          create: {
            status: 'Assigned',
            note: statusNote
          }
        }
      },
      include: { department: true }
    });

    console.log(updated);

    getIO()?.to(`user:${req.user.id}`).emit('complaint:update', {
      id: updated.id, status: pretty(updated.status),
      department: updated.department?.departmentName, priority: updated.priority
    });
    if (updated.departmentId) getIO()?.to(`dept:${updated.departmentId}`).emit('complaint:new', { id: updated.id });

  } catch (err){
    console.log('AI pipeline failed:', err);
    await prisma.complaint.update({ where: { id: complaint.id }, data: { status: 'Submitted' } });
  }
};

// GET /api/complaints  — role-aware listing (?status=&search=)
exports.list = async (req,res) => {
  let {role, id, departmentId} = req.user;
  let {status, search} = req.query;

  let where = {};
  if (role === 'citizen') where.userId = id;
  if (role === 'department' || role === 'admin') where.departmentId = departmentId;
  if (status) where.status = status.replaceAll(' ', '_');
  if (search) where.OR = [
    { title: { contains: search } },
    { description: { contains: search } },
    { location: { contains: search } }
  ];

  try{
    let complaints = await prisma.complaint.findMany({
      where: where,
      orderBy: [{ createdAt: 'desc' }],
      include: {
        department: { select: { departmentName: true } },
        user: { select: { name: true, email: true } },
        _count: { select: { duplicates: true } }
      }
    });

    console.log(complaints);
    res.json({complaints: complaints.map(c => ({...c, status: pretty(c.status)}))});

  } catch (err){
    console.log(err);
    res.status(500).json({error: "Error occurred while fetching complaints."});
  }
};

// GET /api/complaints/:id
exports.getById = async (req,res) => {
  let id = Number(req.params.id);

  try{
    let c = await prisma.complaint.findUnique({
      where: { id: id },
      include: {
        department: true,
        user: { select: { id: true, name: true, email: true, picture: true } },
        attachments: true,
        duplicates: { select: { id: true, title: true } },
        duplicateOf: { select: { id: true, title: true, status: true } },
        statusHistory: { orderBy: { timestamp: 'asc' }, include: { updatedBy: { select: { name: true } } } }
      }
    });

    if (!c) return res.status(404).json({error: "Complaint not found."});

    let {role, id: userId, departmentId} = req.user;
    let allowed = role === 'superadmin' || c.userId === userId ||
      (['department', 'admin'].includes(role) && c.departmentId === departmentId);
    if (!allowed) return res.status(403).json({error: "You do not have access to this complaint."});

    console.log(c);
    res.json({complaint: {...c, status: pretty(c.status)}});

  } catch (err){
    console.log(err);
    res.status(500).json({error: "Error occurred while fetching complaint."});
  }
};

// PUT /api/complaints/:id/status  { status, note }  — department/admin
exports.updateStatus = async (req,res) => {
  let id = Number(req.params.id);
  let {status, note} = req.body;
  let valid = ['Accepted', 'In Progress', 'Resolved', 'Rejected', 'Closed', 'Assigned'];
  if (!valid.includes(status)) return res.status(400).json({error: "Invalid status."});

  try{
    let existing = await prisma.complaint.findUnique({ where: { id: id } });
    if (!existing) return res.status(404).json({error: "Complaint not found."});
    if (['department', 'admin'].includes(req.user.role) && existing.departmentId !== req.user.departmentId){
      return res.status(403).json({error: "This complaint belongs to another department."});
    }

    let updated = await prisma.complaint.update({
      where: { id: id },
      data: {
        status: status.replaceAll(' ', '_'),
        statusHistory: { create: { status: status, note: note || null, updatedById: req.user.id } }
      }
    });

    // cascade the status to linked duplicates + notify owners live
    let dupes = await prisma.complaint.findMany({ where: { duplicateId: id }, select: { id: true, userId: true } });
    if (['Resolved', 'Closed', 'In Progress'].includes(status) && dupes.length){
      await prisma.complaint.updateMany({ where: { duplicateId: id }, data: { status: status.replaceAll(' ', '_') } });
    }

    let io = getIO();
    [{ id: id, userId: existing.userId }, ...dupes].forEach(c =>
      io?.to(`user:${c.userId}`).emit('complaint:update', { id: c.id, status: status })
    );

    console.log(updated);
    res.json({complaint: {...updated, status: status}});

  } catch (err){
    console.log(err);
    res.status(500).json({error: "Error occurred while updating status."});
  }
};

// PUT /api/complaints/:id/assign  { departmentId }  — admin re-route
exports.assignDepartment = async (req,res) => {
  let id = Number(req.params.id);
  let departmentId = Number(req.body.departmentId);

  try{
    let updated = await prisma.complaint.update({
      where: { id: id },
      data: {
        departmentId: departmentId, status: 'Assigned',
        statusHistory: { create: { status: 'Assigned', note: 'Re-assigned by admin', updatedById: req.user.id } }
      },
      include: { department: true }
    });

    getIO()?.to(`dept:${departmentId}`).emit('complaint:new', { id: id });

    console.log(updated);
    res.json({complaint: {...updated, status: 'Assigned'}});

  } catch (err){
    console.log(err);
    res.status(500).json({error: "Error occurred while assigning department."});
  }
};
