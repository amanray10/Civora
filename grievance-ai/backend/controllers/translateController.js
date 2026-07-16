const { detectAndTranslate } = require('../services/aiService');

// POST /api/translate  { text }
exports.translate = async (req, res) => {
  const { text } = req.body;
  if (!text?.trim()) {
    return res.status(400).json({ error: 'Text is required.' });
  }

  try {
    const result = await detectAndTranslate(text.trim());
    res.json({ translation: result });
  } catch (err) {
    console.error('[translateController] Error:', err.message);
    res.status(500).json({ error: 'Translation service is unavailable.' });
  }
};
